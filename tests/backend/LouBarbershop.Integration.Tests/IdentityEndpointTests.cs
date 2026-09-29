using System.Net;
using System.Net.Http.Json;
using System.Security.Cryptography;
using LouBarbershop.Infrastructure.Identity;
using LouBarbershop.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Testcontainers.PostgreSql;

namespace LouBarbershop.Integration.Tests;

[Collection("identity-api")]
public sealed class IdentityEndpointTests
{
    private readonly IdentityApiFixture _fixture;

    public IdentityEndpointTests(IdentityApiFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task AnonymousAndForgedRequestsAreRejected()
    {
        using var client = _fixture.CreateClient();

        using var anonymous = await client.GetAsync("/api/v1/users");
        using var forgedLogin = await client.PostAsJsonAsync(
            "/api/v1/auth/login",
            new { userName = IdentityApiFixture.OwnerUserName, password = IdentityApiFixture.OwnerPassword });

        Assert.Equal(HttpStatusCode.Unauthorized, anonymous.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, forgedLogin.StatusCode);
    }

    [Fact]
    public async Task OwnerAndBarberPermissionMatrixAndSessionRevocationAreEnforced()
    {
        using var ownerClient = _fixture.CreateClient();
        await LoginAsync(ownerClient, IdentityApiFixture.OwnerUserName, IdentityApiFixture.OwnerPassword);

        var owner = await ownerClient.GetFromJsonAsync<CurrentUserResponse>("/api/v1/auth/me");
        Assert.NotNull(owner);
        Assert.Contains(RoleNames.Owner, owner.Roles);
        Assert.Contains(RoleNames.Barber, owner.Roles);

        using var selfDeactivation = await PostSecureAsync(
            ownerClient,
            $"/api/v1/users/{owner.Id}/deactivate");
        Assert.Equal(HttpStatusCode.Conflict, selfDeactivation.StatusCode);

        var barberPassword = "Barber-test!937";
        var barberUserName = $"barber-{Guid.NewGuid():N}";
        using var created = await PostSecureAsync(
            ownerClient,
            "/api/v1/users",
            new { userName = barberUserName, password = barberPassword, roles = new[] { RoleNames.Barber } });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var barber = await created.Content.ReadFromJsonAsync<UserResponse>();
        Assert.NotNull(barber);

        using var barberClient = _fixture.CreateClient();
        await LoginAsync(barberClient, barberUserName, barberPassword);
        using var forbidden = await barberClient.GetAsync("/api/v1/users");
        Assert.Equal(HttpStatusCode.Forbidden, forbidden.StatusCode);

        var replacementPassword = "Barber-reset!491";
        using var reset = await PostSecureAsync(
            ownerClient,
            $"/api/v1/users/{barber.Id}/reset-password",
            new { newPassword = replacementPassword });
        Assert.Equal(HttpStatusCode.NoContent, reset.StatusCode);

        using var sessionAfterReset = await barberClient.GetAsync("/api/v1/auth/me");
        Assert.Equal(HttpStatusCode.Unauthorized, sessionAfterReset.StatusCode);

        using var resetClient = _fixture.CreateClient();
        await LoginAsync(resetClient, barberUserName, replacementPassword);

        using var deactivated = await PostSecureAsync(
            ownerClient,
            $"/api/v1/users/{barber.Id}/deactivate");
        Assert.Equal(HttpStatusCode.NoContent, deactivated.StatusCode);

        using var revoked = await resetClient.GetAsync("/api/v1/auth/me");
        Assert.Equal(HttpStatusCode.Unauthorized, revoked.StatusCode);

        using var invalidClient = _fixture.CreateClient();
        using var invalid = await LoginResponseAsync(invalidClient, $"missing-{Guid.NewGuid():N}", barberPassword);
        using var inactiveClient = _fixture.CreateClient();
        using var inactive = await LoginResponseAsync(inactiveClient, barberUserName, replacementPassword);
        Assert.Equal(HttpStatusCode.Unauthorized, invalid.StatusCode);
        Assert.Equal(invalid.StatusCode, inactive.StatusCode);

        using var activated = await PostSecureAsync(
            ownerClient,
            $"/api/v1/users/{barber.Id}/activate");
        Assert.Equal(HttpStatusCode.NoContent, activated.StatusCode);

        using var replaceRoles = await SendSecureAsync(
            ownerClient,
            HttpMethod.Put,
            $"/api/v1/users/{barber.Id}/roles",
            new { roles = new[] { RoleNames.Admin, RoleNames.Barber } });
        Assert.Equal(HttpStatusCode.NoContent, replaceRoles.StatusCode);

        using var reactivatedClient = _fixture.CreateClient();
        await LoginAsync(reactivatedClient, barberUserName, replacementPassword);
    }

    [Fact]
    public async Task OwnerRecoveryIsIdempotentAndKeepsBothRoles()
    {
        await _fixture.RecoverOwnerAsync();
        using var client = _fixture.CreateClient();
        await LoginAsync(client, IdentityApiFixture.OwnerUserName, IdentityApiFixture.OwnerPassword);

        var owner = await client.GetFromJsonAsync<CurrentUserResponse>("/api/v1/auth/me");
        Assert.NotNull(owner);
        Assert.Contains(RoleNames.Owner, owner.Roles);
        Assert.Contains(RoleNames.Barber, owner.Roles);
    }

    [Fact]
    public async Task UserCanChangePasswordAndProtectLoginWithAuthenticatorMfa()
    {
        using var ownerClient = _fixture.CreateClient();
        await LoginAsync(ownerClient, IdentityApiFixture.OwnerUserName, IdentityApiFixture.OwnerPassword);
        var suffix = Guid.NewGuid().ToString("N");
        var userName = $"secure-{suffix}";
        const string originalPassword = "Secure-start!8426";
        const string changedPassword = "Secure-changed!8426";
        using var created = await PostSecureAsync(ownerClient, "/api/v1/users", new
        {
            userName,
            password = originalPassword,
            roles = new[] { RoleNames.Barber },
        });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);

        using var userClient = _fixture.CreateClient();
        await LoginAsync(userClient, userName, originalPassword);
        using var changed = await PostSecureAsync(userClient, "/api/v1/auth/change-password", new
        {
            currentPassword = originalPassword,
            newPassword = changedPassword,
        });
        Assert.Equal(HttpStatusCode.NoContent, changed.StatusCode);

        using var oldPasswordClient = _fixture.CreateClient();
        using var oldPassword = await LoginResponseAsync(oldPasswordClient, userName, originalPassword);
        Assert.Equal(HttpStatusCode.Unauthorized, oldPassword.StatusCode);

        using var setupResponse = await PostSecureAsync(userClient, "/api/v1/auth/mfa/setup", new
        {
            currentPassword = changedPassword,
        });
        Assert.Equal(HttpStatusCode.OK, setupResponse.StatusCode);
        var setup = (await setupResponse.Content.ReadFromJsonAsync<MfaSetupResponse>())!;
        Assert.StartsWith("otpauth://totp/", setup.AuthenticatorUri, StringComparison.Ordinal);
        var code = Totp(setup.SharedKey, DateTimeOffset.UtcNow);

        using var enabledResponse = await PostSecureAsync(userClient, "/api/v1/auth/mfa/enable", new
        {
            currentPassword = changedPassword,
            code,
        });
        Assert.Equal(HttpStatusCode.OK, enabledResponse.StatusCode);
        var enabled = (await enabledResponse.Content.ReadFromJsonAsync<MfaEnabledResponse>())!;
        Assert.Equal(8, enabled.RecoveryCodes.Count);

        using var logout = await PostSecureAsync(userClient, "/api/v1/auth/logout");
        Assert.Equal(HttpStatusCode.NoContent, logout.StatusCode);
        using var passwordOnlyClient = _fixture.CreateClient();
        using var passwordOnly = await LoginResponseAsync(passwordOnlyClient, userName, changedPassword);
        Assert.Equal(HttpStatusCode.Unauthorized, passwordOnly.StatusCode);
        Assert.Contains("auth.two_factor_required", await passwordOnly.Content.ReadAsStringAsync(), StringComparison.Ordinal);

        using var mfaClient = _fixture.CreateClient();
        using var authenticated = await LoginResponseAsync(mfaClient, userName, changedPassword, Totp(setup.SharedKey, DateTimeOffset.UtcNow));
        Assert.Equal(HttpStatusCode.NoContent, authenticated.StatusCode);
        var current = await mfaClient.GetFromJsonAsync<CurrentUserResponse>("/api/v1/auth/me");
        Assert.True(current!.MfaEnabled);
    }

    private static async Task LoginAsync(HttpClient client, string userName, string password)
    {
        using var response = await LoginResponseAsync(client, userName, password);
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        var sessionCookie = Assert.Single(response.Headers.GetValues("Set-Cookie"));
        Assert.Contains("httponly", sessionCookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("secure", sessionCookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("samesite=lax", sessionCookie, StringComparison.OrdinalIgnoreCase);
    }

    private static Task<HttpResponseMessage> LoginResponseAsync(HttpClient client, string userName, string password, string? twoFactorCode = null) =>
        PostSecureAsync(client, "/api/v1/auth/login", new { userName, password, twoFactorCode });

    private static string Totp(string sharedKey, DateTimeOffset at)
    {
        var key = DecodeBase32(sharedKey);
        var counter = at.ToUnixTimeSeconds() / 30;
        Span<byte> counterBytes = stackalloc byte[8];
        System.Buffers.Binary.BinaryPrimitives.WriteInt64BigEndian(counterBytes, counter);
#pragma warning disable CA5350 // ASP.NET Core Identity authenticator tokens require RFC 6238 HMAC-SHA1 interoperability.
        var hash = HMACSHA1.HashData(key, counterBytes);
#pragma warning restore CA5350
        var offset = hash[^1] & 0x0f;
        var binary = ((hash[offset] & 0x7f) << 24) |
            (hash[offset + 1] << 16) |
            (hash[offset + 2] << 8) |
            hash[offset + 3];
        return (binary % 1_000_000).ToString("D6", System.Globalization.CultureInfo.InvariantCulture);
    }

    private static byte[] DecodeBase32(string value)
    {
        const string alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        var output = new List<byte>();
        var buffer = 0;
        var bits = 0;
        foreach (var character in value.ToUpperInvariant().Where(x => x != '=' && !char.IsWhiteSpace(x)))
        {
            var index = alphabet.IndexOf(character);
            Assert.True(index >= 0);
            buffer = (buffer << 5) | index;
            bits += 5;
            if (bits < 8) continue;
            bits -= 8;
            output.Add((byte)(buffer >> bits));
            buffer &= (1 << bits) - 1;
        }
        return output.ToArray();
    }

    private static Task<HttpResponseMessage> PostSecureAsync(HttpClient client, string path, object? body = null) =>
        SendSecureAsync(client, HttpMethod.Post, path, body);

    private static async Task<HttpResponseMessage> SendSecureAsync(
        HttpClient client,
        HttpMethod method,
        string path,
        object? body = null)
    {
        var antiforgery = await client.GetFromJsonAsync<AntiforgeryResponse>("/api/v1/auth/antiforgery");
        Assert.NotNull(antiforgery);

        using var request = new HttpRequestMessage(method, path);
        request.Headers.Add("X-CSRF-TOKEN", antiforgery.Token);
        if (body is not null)
        {
            request.Content = JsonContent.Create(body);
        }

        return await client.SendAsync(request);
    }

    private sealed record AntiforgeryResponse(string Token);

    private sealed record CurrentUserResponse(Guid Id, string UserName, IReadOnlyCollection<string> Roles, bool MfaEnabled = false, bool MfaRequired = false);
    private sealed record MfaSetupResponse(string SharedKey, string AuthenticatorUri);
    private sealed record MfaEnabledResponse(IReadOnlyCollection<string> RecoveryCodes);

    private sealed record UserResponse(Guid Id, string UserName, bool Active, IReadOnlyCollection<string> Roles);
}

[CollectionDefinition("identity-api")]
public sealed class IdentityApiTestGroup : ICollectionFixture<IdentityApiFixture>;

public sealed class IdentityApiFixture : IAsyncLifetime
{
    public const string OwnerUserName = "owner-integration";
    public const string OwnerPassword = "Owner-test!8426";

    private readonly PostgreSqlContainer? _database;
    private readonly string? _externalConnectionString;
    private WebApplicationFactory<Program>? _factory;

    public IdentityApiFixture()
    {
        _externalConnectionString = Environment.GetEnvironmentVariable("LOU_IDENTITY_TEST_CONNECTION");
        if (string.IsNullOrWhiteSpace(_externalConnectionString))
        {
            _database = new PostgreSqlBuilder("postgres:18.6-alpine3.24").Build();
        }
    }

    public async Task InitializeAsync()
    {
        if (_database is not null)
        {
            await _database.StartAsync();
        }

        var connectionString = _externalConnectionString ?? _database!.GetConnectionString();
        _factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseSetting("ConnectionStrings:Database", connectionString);
            builder.UseSetting("BootstrapOwner:UserName", OwnerUserName);
            builder.UseSetting("BootstrapOwner:Password", OwnerPassword);
            builder.UseSetting("Http:UseHttpsRedirection", "false");
            builder.UseSetting("RateLimiting:LoginPermitLimit", "20");
            builder.UseSetting("RateLimiting:GlobalPermitLimit", "2000");
        });

        await using var scope = _factory.Services.CreateAsyncScope();
        var database = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await database.Database.MigrateAsync();
        var bootstrapper = scope.ServiceProvider.GetRequiredService<OwnerBootstrapper>();
        await bootstrapper.BootstrapAsync(CancellationToken.None);
    }

    public HttpClient CreateClient()
    {
        var client = _factory!.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false,
            BaseAddress = new Uri("https://localhost"),
        });
        return client;
    }

    public IServiceProvider Services => _factory!.Services;

    public async Task RecoverOwnerAsync()
    {
        await using var scope = _factory!.Services.CreateAsyncScope();
        var bootstrapper = scope.ServiceProvider.GetRequiredService<OwnerBootstrapper>();
        await bootstrapper.BootstrapAsync(CancellationToken.None, resetExistingPassword: true);
    }

    public async Task DisposeAsync()
    {
        if (_factory is not null)
        {
            await _factory.DisposeAsync();
        }

        if (_database is not null)
        {
            await _database.DisposeAsync();
        }
    }
}
