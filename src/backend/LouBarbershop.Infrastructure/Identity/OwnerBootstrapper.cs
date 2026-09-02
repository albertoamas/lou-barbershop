using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;

namespace LouBarbershop.Infrastructure.Identity;

public sealed class OwnerBootstrapper(
    UserManager<AppUser> userManager,
    RoleManager<AppRole> roleManager,
    IConfiguration configuration)
{
    public async Task BootstrapAsync(CancellationToken cancellationToken, bool resetExistingPassword = false)
    {
        foreach (var roleName in new[] { RoleNames.Owner, RoleNames.Admin, RoleNames.Barber })
        {
            cancellationToken.ThrowIfCancellationRequested();
            if (!await roleManager.RoleExistsAsync(roleName))
            {
                var result = await roleManager.CreateAsync(new AppRole { Name = roleName });
                EnsureSuccess(result, "No se pudo crear un rol interno.");
            }
        }

        var userName = configuration["BootstrapOwner:UserName"]?.Trim();
        var password = configuration["BootstrapOwner:Password"];

        if (string.IsNullOrWhiteSpace(userName) || string.IsNullOrWhiteSpace(password))
        {
            throw new InvalidOperationException("BootstrapOwner debe configurarse mediante Secret Manager o variables de entorno.");
        }

        var user = await userManager.FindByNameAsync(userName);

        if (user is null)
        {
            user = new AppUser
            {
                Id = Guid.NewGuid(),
                UserName = userName,
                Active = true,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow,
            };
            var createResult = await userManager.CreateAsync(user, password);
            EnsureSuccess(createResult, "No se pudo crear el dueño inicial.");
        }
        else if (resetExistingPassword)
        {
            var resetToken = await userManager.GeneratePasswordResetTokenAsync(user);
            var resetResult = await userManager.ResetPasswordAsync(user, resetToken, password);
            EnsureSuccess(resetResult, "No se pudo recuperar la contraseña del dueño.");
            user.Active = true;
            user.UpdatedAt = DateTimeOffset.UtcNow;
            EnsureSuccess(await userManager.UpdateAsync(user), "No se pudo reactivar el dueño.");
        }

        var currentRoles = await userManager.GetRolesAsync(user);
        var missingRoles = new[] { RoleNames.Owner, RoleNames.Barber }
            .Except(currentRoles, StringComparer.Ordinal)
            .ToArray();
        if (missingRoles.Length > 0)
        {
            var roleResult = await userManager.AddToRolesAsync(user, missingRoles);
            EnsureSuccess(roleResult, "No se pudieron asignar los roles del dueño.");
        }
    }

    private static void EnsureSuccess(IdentityResult result, string message)
    {
        if (!result.Succeeded)
        {
            throw new InvalidOperationException(message);
        }
    }
}
