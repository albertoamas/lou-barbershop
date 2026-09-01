using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;

namespace LouBarbershop.Integration.Tests;

public sealed class HealthEndpointTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;

    public HealthEndpointTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
        _client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false,
        });
    }

    [Fact]
    public async Task LivenessReturnsOkWithoutDatabaseConnection()
    {
        using var response = await _client.GetAsync("/health/live");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(response.Headers.Contains("X-Request-ID"));
    }

    [Fact]
    public async Task ReadinessReturnsServiceUnavailableWhenDatabaseIsDown()
    {
        using var unavailableFactory = _factory.WithWebHostBuilder(builder =>
            builder.UseSetting(
                "ConnectionStrings:Database",
                "Host=127.0.0.1;Port=1;Database=unavailable;Username=none;Password=none;Timeout=1"));
        using var client = unavailableFactory.CreateClient();

        using var response = await client.GetAsync("/health/ready");

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
    }

    [Fact]
    public async Task UnknownRouteReturnsProblemDetailsWithRequestId()
    {
        using var response = await _client.GetAsync("/api/v1/unknown");
        var problem = await response.Content.ReadFromJsonAsync<TestProblemDetails>();

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.NotNull(problem);
        Assert.Equal(404, problem.Status);
        Assert.False(string.IsNullOrWhiteSpace(problem.RequestId));
    }

    private sealed record TestProblemDetails(int Status, string? RequestId);
}
