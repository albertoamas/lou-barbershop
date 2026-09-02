using System.Net;
using System.Net.Http.Json;
using LouBarbershop.Infrastructure.Identity;
using LouBarbershop.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Testcontainers.PostgreSql;

namespace LouBarbershop.Integration.Tests;

public sealed class IdentityEndpointTests : IClassFixture<IdentityApiFixture>
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

    private static async Task LoginAsync(HttpClient client, string userName, string password)
    {
        using var response = await LoginResponseAsync(client, userName, password);
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        var sessionCookie = Assert.Single(response.Headers.GetValues("Set-Cookie"));
        Assert.Contains("httponly", sessionCookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("secure", sessionCookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("samesite=lax", sessionCookie, StringComparison.OrdinalIgnoreCase);
    }

    private static Task<HttpResponseMessage> LoginResponseAsync(HttpClient client, string userName, string password) =>
        PostSecureAsync(client, "/api/v1/auth/login", new { userName, password });

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

    private sealed record CurrentUserResponse(Guid Id, string UserName, IReadOnlyCollection<string> Roles);

    private sealed record UserResponse(Guid Id, string UserName, bool Active, IReadOnlyCollection<string> Roles);
}

public sealed class IdentityApiFixture : IAsyncLifetime
{
    public const string OwnerUserName = "owner-integration";
    public const string OwnerPassword = "Owner-test!8426";

    private readonly PostgreSqlContainer _database =
        new PostgreSqlBuilder("postgres:18.6-alpine3.24").Build();
    private WebApplicationFactory<Program>? _factory;

    public async Task InitializeAsync()
    {
        await _database.StartAsync();
        _factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseSetting("ConnectionStrings:Database", _database.GetConnectionString());
            builder.UseSetting("BootstrapOwner:UserName", OwnerUserName);
            builder.UseSetting("BootstrapOwner:Password", OwnerPassword);
            builder.UseSetting("Http:UseHttpsRedirection", "false");
            builder.UseSetting("RateLimiting:LoginPermitLimit", "20");
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

        await _database.DisposeAsync();
    }
}
