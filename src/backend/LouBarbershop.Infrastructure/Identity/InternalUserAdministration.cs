using LouBarbershop.Application.Abstractions;
using LouBarbershop.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace LouBarbershop.Infrastructure.Identity;

public sealed class InternalUserAdministration(
    UserManager<AppUser> userManager,
    AppDbContext database,
    ICurrentActor currentActor)
{
    private static readonly HashSet<string> AllowedRoles = new(StringComparer.Ordinal)
    {
        RoleNames.Owner,
        RoleNames.Admin,
        RoleNames.Barber,
    };

    public async Task<IReadOnlyCollection<InternalUserView>> ListAsync()
    {
        var users = await userManager.Users.OrderBy(user => user.UserName).ToArrayAsync();
        var response = new List<InternalUserView>(users.Length);
        foreach (var user in users)
        {
            response.Add(await ToViewAsync(user));
        }

        return response;
    }

    public async Task<InternalUserView?> GetAsync(Guid userId)
    {
        var user = await userManager.FindByIdAsync(userId.ToString());
        return user is null ? null : await ToViewAsync(user);
    }

    public async Task<UserAdministrationResult> CreateAsync(
        string userName,
        string password,
        IReadOnlyCollection<string> requestedRoles,
        CancellationToken cancellationToken)
    {
        var roles = NormalizeRoles(requestedRoles);
        if (roles is null)
        {
            return UserAdministrationResult.InvalidRoles();
        }

        await using var transaction = await database.Database.BeginTransactionAsync(cancellationToken);
        var now = DateTimeOffset.UtcNow;
        var user = new AppUser
        {
            Id = Guid.NewGuid(),
            UserName = userName.Trim(),
            Active = true,
            CreatedAt = now,
            UpdatedAt = now,
        };
        var create = await userManager.CreateAsync(user, password);
        if (!create.Succeeded)
        {
            return UserAdministrationResult.IdentityFailure(create.Errors);
        }

        var addRoles = await userManager.AddToRolesAsync(user, roles);
        if (!addRoles.Succeeded)
        {
            await transaction.RollbackAsync(cancellationToken);
            return UserAdministrationResult.IdentityFailure(addRoles.Errors);
        }

        await transaction.CommitAsync(cancellationToken);
        return UserAdministrationResult.Success(await ToViewAsync(user));
    }

    public async Task<UserAdministrationResult> SetActiveAsync(
        Guid userId,
        bool active,
        CancellationToken cancellationToken)
    {
        if (!active && currentActor.UserId == userId)
        {
            return UserAdministrationResult.SelfProtection();
        }

        var user = await userManager.FindByIdAsync(userId.ToString());
        if (user is null)
        {
            return UserAdministrationResult.NotFound();
        }

        await using var transaction = await database.Database.BeginTransactionAsync(cancellationToken);
        user.Active = active;
        user.UpdatedAt = DateTimeOffset.UtcNow;
        var update = await userManager.UpdateAsync(user);
        if (!update.Succeeded)
        {
            return UserAdministrationResult.IdentityFailure(update.Errors);
        }

        if (!active)
        {
            var revoke = await userManager.UpdateSecurityStampAsync(user);
            if (!revoke.Succeeded)
            {
                await transaction.RollbackAsync(cancellationToken);
                return UserAdministrationResult.IdentityFailure(revoke.Errors);
            }
        }

        await transaction.CommitAsync(cancellationToken);
        return UserAdministrationResult.Success(await ToViewAsync(user));
    }

    public async Task<UserAdministrationResult> ReplaceRolesAsync(
        Guid userId,
        IReadOnlyCollection<string> requestedRoles,
        CancellationToken cancellationToken)
    {
        var roles = NormalizeRoles(requestedRoles);
        if (roles is null)
        {
            return UserAdministrationResult.InvalidRoles();
        }

        var user = await userManager.FindByIdAsync(userId.ToString());
        if (user is null)
        {
            return UserAdministrationResult.NotFound();
        }

        if (currentActor.UserId == userId && !roles.Contains(RoleNames.Owner, StringComparer.Ordinal))
        {
            return UserAdministrationResult.SelfProtection();
        }

        await using var transaction = await database.Database.BeginTransactionAsync(cancellationToken);
        var currentRoles = await userManager.GetRolesAsync(user);
        var remove = await userManager.RemoveFromRolesAsync(user, currentRoles.Except(roles));
        if (!remove.Succeeded)
        {
            return UserAdministrationResult.IdentityFailure(remove.Errors);
        }

        var add = await userManager.AddToRolesAsync(user, roles.Except(currentRoles));
        if (!add.Succeeded)
        {
            await transaction.RollbackAsync(cancellationToken);
            return UserAdministrationResult.IdentityFailure(add.Errors);
        }

        var revoke = await userManager.UpdateSecurityStampAsync(user);
        if (!revoke.Succeeded)
        {
            await transaction.RollbackAsync(cancellationToken);
            return UserAdministrationResult.IdentityFailure(revoke.Errors);
        }

        await transaction.CommitAsync(cancellationToken);
        return UserAdministrationResult.Success(await ToViewAsync(user));
    }

    public async Task<UserAdministrationResult> ResetPasswordAsync(
        Guid userId,
        string newPassword,
        CancellationToken cancellationToken)
    {
        var user = await userManager.FindByIdAsync(userId.ToString());
        if (user is null)
        {
            return UserAdministrationResult.NotFound();
        }

        await using var transaction = await database.Database.BeginTransactionAsync(cancellationToken);
        var token = await userManager.GeneratePasswordResetTokenAsync(user);
        var reset = await userManager.ResetPasswordAsync(user, token, newPassword);
        if (!reset.Succeeded)
        {
            return UserAdministrationResult.IdentityFailure(reset.Errors);
        }

        await transaction.CommitAsync(cancellationToken);
        return UserAdministrationResult.Success(await ToViewAsync(user));
    }

    private async Task<InternalUserView> ToViewAsync(AppUser user) =>
        new(user.Id, user.UserName!, user.Active, (await userManager.GetRolesAsync(user)).ToArray());

    private static string[]? NormalizeRoles(IReadOnlyCollection<string> requestedRoles)
    {
        var roles = requestedRoles.Distinct(StringComparer.Ordinal).ToArray();
        return roles.Length == 0 || roles.Any(role => !AllowedRoles.Contains(role)) ? null : roles;
    }
}

public enum UserAdministrationStatus
{
    Success,
    NotFound,
    InvalidRoles,
    SelfProtection,
    IdentityFailure,
}

public sealed record InternalUserView(Guid Id, string UserName, bool Active, IReadOnlyCollection<string> Roles);

public sealed record UserAdministrationResult(
    UserAdministrationStatus Status,
    InternalUserView? User,
    IReadOnlyCollection<IdentityError> Errors)
{
    public static UserAdministrationResult Success(InternalUserView user) =>
        new(UserAdministrationStatus.Success, user, []);

    public static UserAdministrationResult NotFound() =>
        new(UserAdministrationStatus.NotFound, null, []);

    public static UserAdministrationResult InvalidRoles() =>
        new(UserAdministrationStatus.InvalidRoles, null, []);

    public static UserAdministrationResult SelfProtection() =>
        new(UserAdministrationStatus.SelfProtection, null, []);

    public static UserAdministrationResult IdentityFailure(IEnumerable<IdentityError> errors) =>
        new(UserAdministrationStatus.IdentityFailure, null, errors.ToArray());
}
