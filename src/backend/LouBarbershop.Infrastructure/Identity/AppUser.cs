using Microsoft.AspNetCore.Identity;

namespace LouBarbershop.Infrastructure.Identity;

public sealed class AppUser : IdentityUser<Guid>
{
    public bool Active { get; set; } = true;

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }
}
