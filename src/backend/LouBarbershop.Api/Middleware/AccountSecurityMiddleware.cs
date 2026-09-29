using LouBarbershop.Infrastructure.Identity;
using Microsoft.AspNetCore.Mvc;

namespace LouBarbershop.Api.Middleware;

public sealed class AccountSecurityMiddleware(RequestDelegate next)
{
    private static readonly PathString[] EnrollmentPaths =
    [
        new("/api/v1/auth/antiforgery"),
        new("/api/v1/auth/me"),
        new("/api/v1/auth/logout"),
        new("/api/v1/auth/change-password"),
        new("/api/v1/auth/mfa/setup"),
        new("/api/v1/auth/mfa/enable"),
        new("/api/v1/auth/mfa/disable"),
    ];

    public async Task InvokeAsync(HttpContext context, IConfiguration configuration)
    {
        var requiresOwnerMfa = configuration.GetValue("Security:RequireOwnerMfa", false);
        var ownerWithoutMfa = context.User.Identity?.IsAuthenticated == true &&
            context.User.IsInRole(RoleNames.Owner) &&
            !string.Equals(context.User.FindFirst(SecurityClaims.MfaEnabled)?.Value, "true", StringComparison.Ordinal);

        if (requiresOwnerMfa && ownerWithoutMfa && !EnrollmentPaths.Any(path => context.Request.Path.Equals(path)))
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            context.Response.ContentType = "application/problem+json";
            await context.Response.WriteAsJsonAsync(new ProblemDetails
            {
                Status = StatusCodes.Status403Forbidden,
                Title = "Configura la verificación en dos pasos.",
                Detail = "La cuenta propietaria debe protegerse con un segundo factor antes de continuar.",
                Extensions =
                {
                    ["code"] = "auth.mfa_enrollment_required",
                    ["requestId"] = context.TraceIdentifier,
                },
            });
            return;
        }

        await next(context);
    }
}
