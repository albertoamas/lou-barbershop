using System.ComponentModel.DataAnnotations;
using LouBarbershop.Api.Authorization;
using LouBarbershop.Infrastructure.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LouBarbershop.Api.Controllers;

[ApiController]
[Authorize(Policy = AuthorizationPolicies.ManageUsers)]
[Route("api/v1/users")]
public sealed class UsersController(InternalUserAdministration users) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyCollection<UserResponse>>> ListAsync() =>
        Ok((await users.ListAsync()).Select(ToResponse).ToArray());

    [HttpGet("{userId:guid}", Name = "GetUserById")]
    public async Task<ActionResult<UserResponse>> GetAsync(Guid userId)
    {
        var user = await users.GetAsync(userId);
        return user is null ? NotFound() : Ok(ToResponse(user));
    }

    [HttpPost]
    public async Task<ActionResult<UserResponse>> CreateAsync(
        CreateUserRequest request,
        CancellationToken cancellationToken)
    {
        var result = await users.CreateAsync(
            request.UserName,
            request.Password,
            request.Roles,
            cancellationToken);
        if (result.Status is not UserAdministrationStatus.Success)
        {
            return ToError(result);
        }

        var response = ToResponse(result.User!);
        return CreatedAtRoute("GetUserById", new { userId = response.Id }, response);
    }

    [HttpPost("{userId:guid}/deactivate")]
    public async Task<IActionResult> DeactivateAsync(Guid userId, CancellationToken cancellationToken) =>
        ToMutationResponse(await users.SetActiveAsync(userId, active: false, cancellationToken));

    [HttpPost("{userId:guid}/activate")]
    public async Task<IActionResult> ActivateAsync(Guid userId, CancellationToken cancellationToken) =>
        ToMutationResponse(await users.SetActiveAsync(userId, active: true, cancellationToken));

    [HttpPut("{userId:guid}/roles")]
    public async Task<IActionResult> ReplaceRolesAsync(
        Guid userId,
        ReplaceRolesRequest request,
        CancellationToken cancellationToken) =>
        ToMutationResponse(await users.ReplaceRolesAsync(userId, request.Roles, cancellationToken));

    [HttpPost("{userId:guid}/reset-password")]
    public async Task<IActionResult> ResetPasswordAsync(
        Guid userId,
        ResetPasswordRequest request,
        CancellationToken cancellationToken) =>
        ToMutationResponse(await users.ResetPasswordAsync(userId, request.NewPassword, cancellationToken));

    [HttpPost("{userId:guid}/reset-mfa")]
    public async Task<IActionResult> ResetMfaAsync(Guid userId, CancellationToken cancellationToken) =>
        ToMutationResponse(await users.ResetMfaAsync(userId, cancellationToken));

    private IActionResult ToMutationResponse(UserAdministrationResult result) =>
        result.Status is UserAdministrationStatus.Success ? NoContent() : ToError(result).Result!;

    private ActionResult<UserResponse> ToError(UserAdministrationResult result) => result.Status switch
    {
        UserAdministrationStatus.NotFound => NotFound(),
        UserAdministrationStatus.InvalidRoles => ValidationProblem(title: "Los roles enviados no son válidos."),
        UserAdministrationStatus.SelfProtection => Conflict(new ProblemDetails
        {
            Title = "El dueño no puede revocar su propio acceso OWNER.",
        }),
        _ => BadRequest(new ValidationProblemDetails(result.Errors.ToDictionary(
            error => error.Code,
            error => new[] { error.Description }))),
    };

    private static UserResponse ToResponse(InternalUserView user) =>
        new(user.Id, user.UserName, user.Active, user.Roles);

    public sealed record CreateUserRequest(
        [Required, StringLength(100, MinimumLength = 1)] string UserName,
        [Required, StringLength(200, MinimumLength = 12)] string Password,
        [Required, MinLength(1)] IReadOnlyCollection<string> Roles);

    public sealed record ReplaceRolesRequest([Required, MinLength(1)] IReadOnlyCollection<string> Roles);

    public sealed record ResetPasswordRequest(
        [Required, StringLength(200, MinimumLength = 12)] string NewPassword);

    public sealed record UserResponse(
        Guid Id,
        string UserName,
        bool Active,
        IReadOnlyCollection<string> Roles);
}
