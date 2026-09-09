using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using LouBarbershop.Api.Authorization;
using LouBarbershop.Api.Errors;
using LouBarbershop.Api.Health;
using LouBarbershop.Api.Middleware;
using LouBarbershop.Api.Serialization;
using LouBarbershop.Infrastructure;
using LouBarbershop.Infrastructure.Identity;
using LouBarbershop.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Http.Timeouts;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Logging.AddJsonConsole(options =>
{
    options.IncludeScopes = true;
    options.TimestampFormat = "yyyy-MM-ddTHH:mm:ss.fffZ";
    options.UseUtcTimestamp = true;
});

builder.Services.AddInfrastructure(builder.Configuration);
var cookieSecurePolicy = builder.Configuration.GetValue("Security:RequireSecureCookies", true)
    ? CookieSecurePolicy.Always
    : CookieSecurePolicy.SameAsRequest;
builder.Services
    .AddAuthentication(IdentityConstants.ApplicationScheme)
    .AddCookie(IdentityConstants.ApplicationScheme, options =>
    {
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = SameSiteMode.Lax;
        options.Cookie.SecurePolicy = cookieSecurePolicy;
        options.ExpireTimeSpan = TimeSpan.FromHours(8);
        options.SlidingExpiration = true;
        options.Events.OnValidatePrincipal = async context =>
        {
            var signInManager = context.HttpContext.RequestServices.GetRequiredService<SignInManager<AppUser>>();
            var user = await signInManager.ValidateSecurityStampAsync(context.Principal!);

            if (user is null || !user.Active)
            {
                context.RejectPrincipal();
                await context.HttpContext.SignOutAsync(IdentityConstants.ApplicationScheme);
            }
        };
        options.Events.OnRedirectToLogin = context =>
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return Task.CompletedTask;
        };
        options.Events.OnRedirectToAccessDenied = context =>
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            return Task.CompletedTask;
        };
    });
builder.Services.AddLouAuthorization();
builder.Services.AddAntiforgery(options =>
{
    options.HeaderName = "X-CSRF-TOKEN";
    options.Cookie.Name = "lou-antiforgery";
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = SameSiteMode.Strict;
    options.Cookie.SecurePolicy = cookieSecurePolicy;
});
builder.Services.AddControllersWithViews(options =>
    options.Filters.Add(new AutoValidateAntiforgeryTokenAttribute()))
    .AddJsonOptions(options => options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter(new UpperSnakeCaseJsonNamingPolicy())));
var dataProtectionKeysPath = builder.Configuration["DataProtection:KeysPath"];
if (!string.IsNullOrWhiteSpace(dataProtectionKeysPath))
{
    builder.Services.AddDataProtection()
        .SetApplicationName("LouBarbershop")
        .PersistKeysToFileSystem(new DirectoryInfo(dataProtectionKeysPath));
}
builder.Services.AddExceptionHandler<PersistenceConflictExceptionHandler>();
builder.Services.AddProblemDetails(options =>
{
    options.CustomizeProblemDetails = context =>
    {
        context.ProblemDetails.Extensions["requestId"] = context.HttpContext.TraceIdentifier;
    };
});
builder.Services.AddOpenApi();
builder.Services.AddResponseCompression();
builder.Services.AddRequestTimeouts(options =>
{
    options.DefaultPolicy = new RequestTimeoutPolicy
    {
        Timeout = TimeSpan.FromSeconds(15),
        TimeoutStatusCode = StatusCodes.Status504GatewayTimeout,
    };
});
builder.Services.AddRateLimiter(options =>
{
    var loginPermitLimit = builder.Configuration.GetValue("RateLimiting:LoginPermitLimit", 5);
    var publicBookingPermitLimit = builder.Configuration.GetValue("RateLimiting:PublicBookingPermitLimit", 30);
    var globalPermitLimit = builder.Configuration.GetValue("RateLimiting:GlobalPermitLimit", 120);
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = globalPermitLimit,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                AutoReplenishment = true,
            }));
    options.AddPolicy("login", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = loginPermitLimit,
                Window = TimeSpan.FromMinutes(15),
                QueueLimit = 0,
                AutoReplenishment = true,
            }));
    options.AddPolicy("public-booking", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = publicBookingPermitLimit,
                Window = TimeSpan.FromMinutes(5),
                QueueLimit = 0,
                AutoReplenishment = true,
            }));
});
builder.Services
    .AddHealthChecks()
    .AddCheck<DatabaseReadinessHealthCheck>("database", tags: ["ready"]);

var app = builder.Build();

app.UseExceptionHandler();
app.UseMiddleware<RequestIdMiddleware>();
app.UseStatusCodePages();
app.UseResponseCompression();
app.UseRequestTimeouts();
app.UseRateLimiter();

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}

if (app.Configuration.GetValue("Http:UseHttpsRedirection", true))
{
    app.UseHttpsRedirection();
}
app.UseAuthentication();
app.UseAuthorization();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.MapControllers();
app.MapHealthChecks("/health/live", new HealthCheckOptions
{
    Predicate = _ => false,
});
app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = registration => registration.Tags.Contains("ready"),
});

if (args.Contains("--migrate", StringComparer.Ordinal))
{
    await using var scope = app.Services.CreateAsyncScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await dbContext.Database.MigrateAsync();
    return;
}

if (args.Contains("--bootstrap-owner", StringComparer.Ordinal))
{
    await using var scope = app.Services.CreateAsyncScope();
    var bootstrapper = scope.ServiceProvider.GetRequiredService<OwnerBootstrapper>();
    await bootstrapper.BootstrapAsync(CancellationToken.None);
    return;
}

if (args.Contains("--recover-owner", StringComparer.Ordinal))
{
    await using var scope = app.Services.CreateAsyncScope();
    var bootstrapper = scope.ServiceProvider.GetRequiredService<OwnerBootstrapper>();
    await bootstrapper.BootstrapAsync(CancellationToken.None, resetExistingPassword: true);
    return;
}

app.Run();

public partial class Program;
