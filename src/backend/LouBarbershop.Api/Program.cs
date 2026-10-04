using System.Security.Cryptography.X509Certificates;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using LouBarbershop.Api.Authorization;
using LouBarbershop.Api.Errors;
using LouBarbershop.Api.Health;
using LouBarbershop.Api.Middleware;
using LouBarbershop.Api.Serialization;
using LouBarbershop.Infrastructure;
using LouBarbershop.Infrastructure.DemoData;
using LouBarbershop.Infrastructure.Identity;
using LouBarbershop.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Http.Timeouts;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.WebHost.ConfigureKestrel(options =>
{
    options.AddServerHeader = false;
    options.Limits.MaxRequestBodySize = 1_048_576;
    options.Limits.MaxRequestHeadersTotalSize = 32_768;
});

builder.Logging.ClearProviders();
builder.Logging.AddJsonConsole(options =>
{
    options.IncludeScopes = true;
    options.TimestampFormat = "yyyy-MM-ddTHH:mm:ss.fffZ";
    options.UseUtcTimestamp = true;
});

var sentryDsn = builder.Configuration["SENTRY_DSN"] ?? builder.Configuration["Sentry:Dsn"];
if (!string.IsNullOrWhiteSpace(sentryDsn))
{
    builder.WebHost.UseSentry(options =>
    {
        options.Dsn = sentryDsn;
        options.SendDefaultPii = false;
        options.AttachStacktrace = true;
        options.TracesSampleRate = builder.Configuration.GetValue("Sentry:TracesSampleRate", 0.1);
        options.SetBeforeSend(sentryEvent =>
        {
            sentryEvent.Request?.Headers.Remove("Cookie");
            sentryEvent.Request?.Headers.Remove("X-CSRF-TOKEN");
            sentryEvent.Request?.Headers.Remove("X-Management-Token");
            return sentryEvent;
        });
    });
}

builder.Services.AddInfrastructure(builder.Configuration);
var seedDemo = args.Contains("--seed-demo", StringComparer.Ordinal);
if (seedDemo)
{
    if (!builder.Environment.IsDevelopment())
    {
        throw new InvalidOperationException("--seed-demo solo se permite con ASPNETCORE_ENVIRONMENT=Development.");
    }

    builder.Services.AddDemoSeeding();
}
var cookieSecurePolicy = builder.Configuration.GetValue("Security:RequireSecureCookies", true)
    ? CookieSecurePolicy.Always
    : CookieSecurePolicy.SameAsRequest;
var secureCookieNames = cookieSecurePolicy == CookieSecurePolicy.Always;
var sessionIdleMinutes = builder.Configuration.GetValue("Security:SessionIdleMinutes", 60);
var sessionAbsoluteHours = builder.Configuration.GetValue("Security:SessionAbsoluteHours", 8);
if (sessionIdleMinutes is < 15 or > 480 || sessionAbsoluteHours is < 1 or > 24)
{
    throw new InvalidOperationException("Security session limits are outside the supported range.");
}
builder.Services
    .AddAuthentication(IdentityConstants.ApplicationScheme)
    .AddCookie(IdentityConstants.ApplicationScheme, options =>
    {
        options.Cookie.Name = secureCookieNames ? "__Host-lou-session" : "lou-session";
        options.Cookie.HttpOnly = true;
        options.Cookie.IsEssential = true;
        options.Cookie.Path = "/";
        options.Cookie.SameSite = SameSiteMode.Lax;
        options.Cookie.SecurePolicy = cookieSecurePolicy;
        options.ExpireTimeSpan = TimeSpan.FromMinutes(sessionIdleMinutes);
        options.SlidingExpiration = true;
        options.Events.OnValidatePrincipal = async context =>
        {
            var signInManager = context.HttpContext.RequestServices.GetRequiredService<SignInManager<AppUser>>();
            var user = await signInManager.ValidateSecurityStampAsync(context.Principal!);

            var sessionStarted = context.Principal?.FindFirst(SecurityClaims.SessionStartedAt)?.Value;
            var absoluteExpired = !long.TryParse(
                    sessionStarted,
                    System.Globalization.NumberStyles.Integer,
                    System.Globalization.CultureInfo.InvariantCulture,
                    out var startedAtSeconds) ||
                DateTimeOffset.UtcNow - DateTimeOffset.FromUnixTimeSeconds(startedAtSeconds) > TimeSpan.FromHours(sessionAbsoluteHours);

            if (user is null || !user.Active || absoluteExpired)
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
builder.Services.Configure<SecurityStampValidatorOptions>(options =>
    options.ValidationInterval = TimeSpan.FromMinutes(5));
builder.Services.AddLouAuthorization();
builder.Services.AddAntiforgery(options =>
{
    options.HeaderName = "X-CSRF-TOKEN";
    options.Cookie.Name = secureCookieNames ? "__Host-lou-antiforgery" : "lou-antiforgery";
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
    var dataProtection = builder.Services.AddDataProtection()
        .SetApplicationName("LouBarbershop")
        .PersistKeysToFileSystem(new DirectoryInfo(dataProtectionKeysPath));
    var certificateBase64 = builder.Configuration["DataProtection:CertificateBase64"];
    if (!string.IsNullOrWhiteSpace(certificateBase64))
    {
        var certificatePassword = builder.Configuration["DataProtection:CertificatePassword"];
        var certificate = X509CertificateLoader.LoadPkcs12(
            Convert.FromBase64String(certificateBase64),
            certificatePassword,
            X509KeyStorageFlags.EphemeralKeySet);
        dataProtection.ProtectKeysWithCertificate(certificate);
    }
    else if (!builder.Configuration.GetValue("DataProtection:AllowUnencryptedKeys", false))
    {
        throw new InvalidOperationException(
            "Persisted Data Protection keys require DataProtection:CertificateBase64 in production. " +
            "Use AllowUnencryptedKeys only for disposable local environments.");
    }
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
    var publicBookingCreatePermitLimit = builder.Configuration.GetValue("RateLimiting:PublicBookingCreatePermitLimit", 6);
    var globalPermitLimit = builder.Configuration.GetValue("RateLimiting:GlobalPermitLimit", 120);
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.OnRejected = async (context, cancellationToken) =>
    {
        context.HttpContext.Response.ContentType = "application/problem+json";
        await context.HttpContext.Response.WriteAsJsonAsync(
            new ProblemDetails
            {
                Status = StatusCodes.Status429TooManyRequests,
                Title = "Demasiadas solicitudes.",
                Extensions = { ["requestId"] = context.HttpContext.TraceIdentifier },
            },
            cancellationToken);
    };
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
    options.AddPolicy("public-booking-create", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = publicBookingCreatePermitLimit,
                Window = TimeSpan.FromHours(1),
                QueueLimit = 0,
                AutoReplenishment = true,
            }));
});
builder.Services
    .AddHealthChecks()
    .AddCheck<DatabaseReadinessHealthCheck>("database", tags: ["ready"]);

var trustForwardedHeaders = builder.Configuration.GetValue("Http:TrustForwardedHeaders", false);
if (trustForwardedHeaders)
{
    var knownProxies = builder.Configuration.GetSection("Http:KnownProxies").Get<string[]>() ?? [];
    var knownNetworks = builder.Configuration.GetSection("Http:KnownNetworks").Get<string[]>() ?? [];
    if (knownProxies.Length == 0 && knownNetworks.Length == 0)
    {
        throw new InvalidOperationException(
            "Http:TrustForwardedHeaders requires at least one exact KnownProxy or KnownNetwork.");
    }
    builder.Services.Configure<ForwardedHeadersOptions>(options =>
    {
        options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
        options.ForwardLimit = 1;
        options.RequireHeaderSymmetry = true;
        options.KnownIPNetworks.Clear();
        options.KnownProxies.Clear();
        foreach (var proxy in knownProxies)
        {
            options.KnownProxies.Add(System.Net.IPAddress.Parse(proxy));
        }
        foreach (var network in knownNetworks)
        {
            options.KnownIPNetworks.Add(System.Net.IPNetwork.Parse(network));
        }
    });
}

var app = builder.Build();

if (trustForwardedHeaders)
{
    app.UseForwardedHeaders();
}

app.UseExceptionHandler();
app.UseMiddleware<RequestIdMiddleware>();
app.UseMiddleware<SecurityHeadersMiddleware>();
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
app.UseMiddleware<AccountSecurityMiddleware>();
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

if (seedDemo)
{
    await using (var scope = app.Services.CreateAsyncScope())
    {
        await scope.ServiceProvider.GetRequiredService<OwnerBootstrapper>().BootstrapAsync(CancellationToken.None);
    }

    await app.Services.GetRequiredService<DemoSeeder>().SeedAsync(CancellationToken.None);
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
