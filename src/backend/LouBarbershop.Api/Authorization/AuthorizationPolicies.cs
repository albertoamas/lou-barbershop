using LouBarbershop.Infrastructure.Identity;

namespace LouBarbershop.Api.Authorization;

public static class AuthorizationPolicies
{
    public const string ManageUsers = "manage-users";
    public const string ManageCatalog = "manage-catalog";
    public const string ManageOperations = "manage-operations";
    public const string ManageScheduling = "manage-scheduling";
    public const string ManageInventory = "manage-inventory";
    public const string ManageSettlements = "manage-settlements";
    public const string ViewReports = "view-reports";

    public static IServiceCollection AddLouAuthorization(this IServiceCollection services)
    {
        services.AddAuthorizationBuilder()
            .AddPolicy(ManageUsers, policy => policy.RequireRole(RoleNames.Owner))
            .AddPolicy(ManageCatalog, policy => policy.RequireRole(RoleNames.Owner))
            .AddPolicy(ManageScheduling, policy => policy.RequireRole(RoleNames.Owner, RoleNames.Admin))
            .AddPolicy(ManageInventory, policy => policy.RequireRole(RoleNames.Owner, RoleNames.Admin))
            .AddPolicy(ManageSettlements, policy => policy.RequireRole(RoleNames.Owner))
            .AddPolicy(ViewReports, policy => policy.RequireRole(RoleNames.Owner))
            .AddPolicy(
                ManageOperations,
                policy => policy.RequireRole(RoleNames.Owner, RoleNames.Admin, RoleNames.Barber));

        return services;
    }
}
