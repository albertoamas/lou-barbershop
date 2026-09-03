using LouBarbershop.Infrastructure.Identity;

namespace LouBarbershop.Api.Authorization;

public static class AuthorizationPolicies
{
    public const string ManageUsers = "manage-users";
    public const string ManageCatalog = "manage-catalog";
    public const string ManageOperations = "manage-operations";
    public const string ManageScheduling = "manage-scheduling";

    public static IServiceCollection AddLouAuthorization(this IServiceCollection services)
    {
        services.AddAuthorizationBuilder()
            .AddPolicy(ManageUsers, policy => policy.RequireRole(RoleNames.Owner))
            .AddPolicy(ManageCatalog, policy => policy.RequireRole(RoleNames.Owner))
            .AddPolicy(ManageScheduling, policy => policy.RequireRole(RoleNames.Owner, RoleNames.Admin))
            .AddPolicy(
                ManageOperations,
                policy => policy.RequireRole(RoleNames.Owner, RoleNames.Admin, RoleNames.Barber));

        return services;
    }
}
