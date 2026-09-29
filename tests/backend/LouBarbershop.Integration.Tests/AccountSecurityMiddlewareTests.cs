using System.Security.Claims;
using System.Text;
using LouBarbershop.Api.Middleware;
using LouBarbershop.Infrastructure.Identity;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;

namespace LouBarbershop.Integration.Tests;

public sealed class AccountSecurityMiddlewareTests
{
    [Fact]
    public async Task OwnerWithoutMfaIsRestrictedToEnrollmentEndpointsWhenRequired()
    {
        var nextCalled = false;
        var middleware = new AccountSecurityMiddleware(_ =>
        {
            nextCalled = true;
            return Task.CompletedTask;
        });
        var context = OwnerContext("/api/v1/appointments", mfaEnabled: false);

        await middleware.InvokeAsync(context, RequiredMfaConfiguration());

        Assert.False(nextCalled);
        Assert.Equal(StatusCodes.Status403Forbidden, context.Response.StatusCode);
        context.Response.Body.Position = 0;
        using var reader = new StreamReader(context.Response.Body, Encoding.UTF8);
        Assert.Contains("auth.mfa_enrollment_required", await reader.ReadToEndAsync(), StringComparison.Ordinal);
    }

    [Fact]
    public async Task OwnerWithoutMfaCanReachEnrollmentEndpoints()
    {
        var nextCalled = false;
        var middleware = new AccountSecurityMiddleware(_ =>
        {
            nextCalled = true;
            return Task.CompletedTask;
        });
        var context = OwnerContext("/api/v1/auth/mfa/setup", mfaEnabled: false);

        await middleware.InvokeAsync(context, RequiredMfaConfiguration());

        Assert.True(nextCalled);
    }

    private static DefaultHttpContext OwnerContext(string path, bool mfaEnabled)
    {
        var context = new DefaultHttpContext
        {
            Request = { Path = path },
            Response = { Body = new MemoryStream() },
        };
        context.User = new ClaimsPrincipal(new ClaimsIdentity(
        [
            new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()),
            new Claim(ClaimTypes.Role, RoleNames.Owner),
            new Claim(SecurityClaims.MfaEnabled, mfaEnabled ? "true" : "false"),
        ], "test"));
        return context;
    }

    private static IConfiguration RequiredMfaConfiguration() => new ConfigurationBuilder()
        .AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Security:RequireOwnerMfa"] = "true",
        })
        .Build();
}
