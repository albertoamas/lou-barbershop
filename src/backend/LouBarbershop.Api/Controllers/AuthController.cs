using System.ComponentModel.DataAnnotations;
using LouBarbershop.Infrastructure.Identity;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace LouBarbershop.Api.Controllers;

[ApiController]
[Route("api/v1/auth")]
public sealed class AuthController(
    SignInManager<AppUser> signInManager,
    UserManager<AppUser> userManager,
    IAntiforgery antiforgery,
    ILogger<AuthController> logger) : ControllerBase
{
    [AllowAnonymous]
    [HttpGet("antiforgery")]
    public ActionResult<AntiforgeryResponse> Antiforgery()
    {
        var tokens = antiforgery.GetAndStoreTokens(HttpContext);
        return Ok(new AntiforgeryResponse(tokens.RequestToken!));
    }

    [AllowAnonymous]
    [EnableRateLimiting("login")]
    [HttpPost("login")]
    public async Task<IActionResult> LoginAsync(LoginRequest request)
    {
        var user = await userManager.FindByNameAsync(request.UserName.Trim());

        if (user is null || !user.Active)
        {
            AuthLog.LoginRejected(logger);
            return Unauthorized();
        }

        var result = await signInManager.PasswordSignInAsync(user, request.Password, false, lockoutOnFailure: true);

        if (!result.Succeeded)
        {
            AuthLog.LoginRejected(logger);
            return Unauthorized();
        }

        AuthLog.LoginSucceeded(logger, user.Id);
        return NoContent();
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> LogoutAsync()
    {
        await signInManager.SignOutAsync();
        AuthLog.SessionClosed(logger);
        return NoContent();
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<CurrentUserResponse>> MeAsync()
    {
        var user = await userManager.GetUserAsync(User);

        if (user is null || !user.Active)
        {
            return Unauthorized();
        }

        var roles = await userManager.GetRolesAsync(user);
        return Ok(new CurrentUserResponse(user.Id, user.UserName!, roles.ToArray()));
    }

    public sealed record LoginRequest(
        [Required, StringLength(100, MinimumLength = 1)] string UserName,
        [Required, StringLength(200, MinimumLength = 1)] string Password);

    public sealed record AntiforgeryResponse(string Token);

    public sealed record CurrentUserResponse(Guid Id, string UserName, IReadOnlyCollection<string> Roles);
}

internal static partial class AuthLog
{
    [LoggerMessage(EventId = 3001, Level = LogLevel.Warning, Message = "Internal login rejected.")]
    public static partial void LoginRejected(ILogger logger);

    [LoggerMessage(EventId = 3002, Level = LogLevel.Information, Message = "Internal login succeeded for user {UserId}.")]
    public static partial void LoginSucceeded(ILogger logger, Guid userId);

    [LoggerMessage(EventId = 3003, Level = LogLevel.Information, Message = "Internal session closed.")]
    public static partial void SessionClosed(ILogger logger);
}
