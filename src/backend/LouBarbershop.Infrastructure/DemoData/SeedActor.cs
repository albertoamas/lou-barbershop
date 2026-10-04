using LouBarbershop.Application.Abstractions;

namespace LouBarbershop.Infrastructure.DemoData;

/// <summary>
/// Actor the demo seeder acts as. Application services keep enforcing their own
/// permission checks against these roles, exactly as for an HTTP request.
/// </summary>
public sealed class SeedActor : ICurrentActor
{
    private readonly HashSet<string> roles = new(StringComparer.Ordinal);

    public Guid? UserId { get; private set; }

    public bool IsInRole(string role) => roles.Contains(role);

    public void ActAs(Guid userId, params string[] userRoles)
    {
        UserId = userId;
        roles.Clear();
        roles.UnionWith(userRoles);
    }
}
