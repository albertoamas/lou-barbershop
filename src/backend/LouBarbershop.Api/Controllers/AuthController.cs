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
    IConfiguration configuration,
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

        var result = await signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: true);

        if (!result.Succeeded)
        {
            AuthLog.LoginRejected(logger);
            return Unauthorized();
        }

        if (user.TwoFactorEnabled)
        {
            if (string.IsNullOrWhiteSpace(request.TwoFactorCode))
            {
                return AuthenticationProblem(
                    "auth.two_factor_required",
                    "Escribe el código de tu aplicación autenticadora o un código de recuperación.");
            }

            var secondFactor = await VerifySecondFactorAsync(user, request.TwoFactorCode);
            if (!secondFactor)
            {
                await userManager.AccessFailedAsync(user);
                AuthLog.LoginRejected(logger);
                return AuthenticationProblem("auth.invalid_two_factor", "El código de verificación no es válido.");
            }
        }

        await userManager.ResetAccessFailedCountAsync(user);
        await signInManager.SignInAsync(user, isPersistent: false);

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
        var mfaRequired = configuration.GetValue("Security:RequireOwnerMfa", false) && roles.Contains(RoleNames.Owner, StringComparer.Ordinal);
        return Ok(new CurrentUserResponse(user.Id, user.UserName!, roles.ToArray(), user.TwoFactorEnabled, mfaRequired));
    }

    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePasswordAsync(ChangePasswordRequest request)
    {
        var user = await userManager.GetUserAsync(User);
        if (user is null || !user.Active) return Unauthorized();

        var changed = await userManager.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);
        if (!changed.Succeeded)
        {
            return IdentityProblem(changed.Errors, "auth.password_change_failed", "No se pudo cambiar la contraseña.");
        }

        await signInManager.RefreshSignInAsync(user);
        AuthLog.PasswordChanged(logger, user.Id);
        return NoContent();
    }

    [Authorize]
    [HttpPost("mfa/setup")]
    public async Task<ActionResult<MfaSetupResponse>> SetupMfaAsync(MfaProtectedRequest request)
    {
        var user = await userManager.GetUserAsync(User);
        if (user is null || !user.Active) return Unauthorized();
        if (!await VerifyPasswordAndCurrentFactorAsync(user, request.CurrentPassword, request.TwoFactorCode))
            return AuthenticationProblem("auth.reauthentication_failed", "No pudimos verificar tus credenciales actuales.");

        var reset = await userManager.ResetAuthenticatorKeyAsync(user);
        if (!reset.Succeeded)
            return IdentityProblem(reset.Errors, "auth.mfa_setup_failed", "No se pudo preparar el segundo factor.");

        var key = await userManager.GetAuthenticatorKeyAsync(user);
        if (string.IsNullOrWhiteSpace(key))
            return Problem(statusCode: 500, title: "No se pudo preparar el segundo factor.");

        // ResetAuthenticatorKeyAsync rotates the security stamp. Refresh the current cookie so
        // the same authenticated setup flow can confirm the freshly generated key.
        await signInManager.RefreshSignInAsync(user);
        var account = Uri.EscapeDataString(user.UserName ?? user.Id.ToString());
        var issuer = Uri.EscapeDataString("Lou Barbershop");
        return Ok(new MfaSetupResponse(
            key,
            $"otpauth://totp/{issuer}:{account}?secret={key}&issuer={issuer}&digits=6"));
    }

    [Authorize]
    [HttpPost("mfa/enable")]
    public async Task<ActionResult<MfaEnabledResponse>> EnableMfaAsync(EnableMfaRequest request)
    {
        var user = await userManager.GetUserAsync(User);
        if (user is null || !user.Active) return Unauthorized();
        if (!await userManager.CheckPasswordAsync(user, request.CurrentPassword))
            return AuthenticationProblem("auth.reauthentication_failed", "La contraseña actual no es correcta.");

        var code = NormalizeAuthenticatorCode(request.Code);
        if (!await userManager.VerifyTwoFactorTokenAsync(user, TokenOptions.DefaultAuthenticatorProvider, code))
            return AuthenticationProblem("auth.invalid_two_factor", "El código de verificación no es válido.");

        var enabled = await userManager.SetTwoFactorEnabledAsync(user, true);
        if (!enabled.Succeeded)
            return IdentityProblem(enabled.Errors, "auth.mfa_enable_failed", "No se pudo activar el segundo factor.");

        var recoveryCodes = (await userManager.GenerateNewTwoFactorRecoveryCodesAsync(user, 8))?.ToArray() ?? [];
        await signInManager.RefreshSignInAsync(user);
        AuthLog.MfaChanged(logger, user.Id, true);
        return Ok(new MfaEnabledResponse(recoveryCodes));
    }

    [Authorize]
    [HttpPost("mfa/disable")]
    public async Task<IActionResult> DisableMfaAsync(MfaProtectedRequest request)
    {
        var user = await userManager.GetUserAsync(User);
        if (user is null || !user.Active) return Unauthorized();
        if (!user.TwoFactorEnabled) return NoContent();
        if (!await VerifyPasswordAndCurrentFactorAsync(user, request.CurrentPassword, request.TwoFactorCode))
            return AuthenticationProblem("auth.reauthentication_failed", "No pudimos verificar tus credenciales actuales.");

        var disabled = await userManager.SetTwoFactorEnabledAsync(user, false);
        if (!disabled.Succeeded)
            return IdentityProblem(disabled.Errors, "auth.mfa_disable_failed", "No se pudo desactivar el segundo factor.");
        var reset = await userManager.ResetAuthenticatorKeyAsync(user);
        if (!reset.Succeeded)
            return IdentityProblem(reset.Errors, "auth.mfa_disable_failed", "No se pudo desactivar el segundo factor.");

        await signInManager.RefreshSignInAsync(user);
        AuthLog.MfaChanged(logger, user.Id, false);
        return NoContent();
    }

    private async Task<bool> VerifyPasswordAndCurrentFactorAsync(AppUser user, string password, string? code)
    {
        if (!await userManager.CheckPasswordAsync(user, password)) return false;
        return !user.TwoFactorEnabled || (!string.IsNullOrWhiteSpace(code) && await VerifySecondFactorAsync(user, code));
    }

    private async Task<bool> VerifySecondFactorAsync(AppUser user, string code)
    {
        var normalized = NormalizeAuthenticatorCode(code);
        if (await userManager.VerifyTwoFactorTokenAsync(user, TokenOptions.DefaultAuthenticatorProvider, normalized))
            return true;
        var recovery = await userManager.RedeemTwoFactorRecoveryCodeAsync(user, code.Trim());
        return recovery.Succeeded;
    }

    private static string NormalizeAuthenticatorCode(string code) =>
        code.Replace(" ", string.Empty, StringComparison.Ordinal).Replace("-", string.Empty, StringComparison.Ordinal);

    private ObjectResult AuthenticationProblem(string code, string detail) => StatusCode(401, new ProblemDetails
    {
        Status = 401,
        Title = "No se pudo verificar el acceso.",
        Detail = detail,
        Extensions = { ["code"] = code, ["requestId"] = HttpContext.TraceIdentifier },
    });

    private BadRequestObjectResult IdentityProblem(IEnumerable<IdentityError> errors, string code, string title) => BadRequest(new ProblemDetails
    {
        Status = 400,
        Title = title,
        Detail = string.Join(" ", errors.Select(error => error.Description)),
        Extensions = { ["code"] = code, ["requestId"] = HttpContext.TraceIdentifier },
    });

    public sealed record LoginRequest(
        [Required, StringLength(100, MinimumLength = 1)] string UserName,
        [Required, StringLength(200, MinimumLength = 1)] string Password,
        [StringLength(32)] string? TwoFactorCode = null);

    public sealed record ChangePasswordRequest(
        [Required, StringLength(200, MinimumLength = 1)] string CurrentPassword,
        [Required, StringLength(200, MinimumLength = 12)] string NewPassword);
    public sealed record MfaProtectedRequest(
        [Required, StringLength(200, MinimumLength = 1)] string CurrentPassword,
        [StringLength(32)] string? TwoFactorCode = null);
    public sealed record EnableMfaRequest(
        [Required, StringLength(200, MinimumLength = 1)] string CurrentPassword,
        [Required, StringLength(16, MinimumLength = 6)] string Code);

    public sealed record AntiforgeryResponse(string Token);

    public sealed record CurrentUserResponse(Guid Id, string UserName, IReadOnlyCollection<string> Roles, bool MfaEnabled, bool MfaRequired);
    public sealed record MfaSetupResponse(string SharedKey, string AuthenticatorUri);
    public sealed record MfaEnabledResponse(IReadOnlyCollection<string> RecoveryCodes);
}

internal static partial class AuthLog
{
    [LoggerMessage(EventId = 3001, Level = LogLevel.Warning, Message = "Internal login rejected.")]
    public static partial void LoginRejected(ILogger logger);

    [LoggerMessage(EventId = 3002, Level = LogLevel.Information, Message = "Internal login succeeded for user {UserId}.")]
    public static partial void LoginSucceeded(ILogger logger, Guid userId);

    [LoggerMessage(EventId = 3003, Level = LogLevel.Information, Message = "Internal session closed.")]
    public static partial void SessionClosed(ILogger logger);

    [LoggerMessage(EventId = 3004, Level = LogLevel.Information, Message = "Password changed for user {UserId}.")]
    public static partial void PasswordChanged(ILogger logger, Guid userId);

    [LoggerMessage(EventId = 3005, Level = LogLevel.Information, Message = "MFA state changed for user {UserId}; enabled: {Enabled}.")]
    public static partial void MfaChanged(ILogger logger, Guid userId, bool enabled);
}
