using System.Globalization;
using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;

namespace LouBarbershop.Infrastructure.Identity;

public static class SecurityClaims
{
    public const string SessionStartedAt = "lou:session_started_at";
    public const string MfaEnabled = "lou:mfa_enabled";
}

public sealed class AppUserClaimsPrincipalFactory(
    UserManager<AppUser> userManager,
    RoleManager<AppRole> roleManager,
    IOptions<IdentityOptions> options)
    : UserClaimsPrincipalFactory<AppUser, AppRole>(userManager, roleManager, options)
{
    protected override async Task<ClaimsIdentity> GenerateClaimsAsync(AppUser user)
    {
        var identity = await base.GenerateClaimsAsync(user);
        identity.AddClaim(new Claim(
            SecurityClaims.SessionStartedAt,
            DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(CultureInfo.InvariantCulture)));
        identity.AddClaim(new Claim(SecurityClaims.MfaEnabled, user.TwoFactorEnabled ? "true" : "false"));
        return identity;
    }
}
