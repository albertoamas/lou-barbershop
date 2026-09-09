using System.Net;
using System.Net.Http.Json;
using LouBarbershop.Infrastructure.Identity;
using LouBarbershop.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace LouBarbershop.Integration.Tests;

[Collection("identity-api")]
public sealed class PhaseFourEndpointTests
{
    private readonly IdentityApiFixture _fixture;

    public PhaseFourEndpointTests(IdentityApiFixture fixture) => _fixture = fixture;

    [Fact]
    public async Task OwnerConfiguresVersionedMastersAndOwnerNeverGetsCommissionRule()
    {
        using var ownerClient = _fixture.CreateClient();
        await LoginAsync(ownerClient, IdentityApiFixture.OwnerUserName, IdentityApiFixture.OwnerPassword);
        var users = await ownerClient.GetFromJsonAsync<UserResponse[]>("/api/v1/users");
        var owner = Assert.Single(users!, x => x.UserName == IdentityApiFixture.OwnerUserName);

        var ownerStaff = await CreateAsync<StaffResponse>(ownerClient, "/api/v1/staff", new { userId = owner.Id, displayName = "Alex Integración", phone = "+59170000000" });
        var ownerBarber = await CreateAsync<BarberResponse>(ownerClient, "/api/v1/barbers", new { staffProfileId = ownerStaff.Id, employmentType = "OWNER", settlementFrequency = "BIWEEKLY", color = "#A55F32" });
        var service = await CreateAsync<ServiceResponse>(ownerClient, "/api/v1/services", new { name = "Corte integración", description = "Ficticio", defaultDurationMinutes = 45, defaultPriceCents = 6000 });
        var product = await CreateAsync<ProductResponse>(ownerClient, "/api/v1/products", new { name = "Producto integración", brand = "Demo", sku = $"TEST-{Guid.NewGuid():N}", salePriceCents = 3500, minimumStock = 2 });
        Assert.Equal(3500, product.SalePriceCents);

        var offering = await CreateAsync<OfferingResponse>(ownerClient, $"/api/v1/barbers/{ownerBarber.Id}/offerings", new { serviceId = service.Id, durationMinutes = 60, priceCents = 7000, validFrom = "2026-09-01", validTo = "2026-09-15" });
        var effective = await ownerClient.GetFromJsonAsync<EffectiveOfferingResponse>($"/api/v1/barbers/{ownerBarber.Id}/offerings/effective?serviceId={service.Id}&date=2026-09-10");
        Assert.NotNull(effective); Assert.True(effective.UsesBarberOverride); Assert.Equal(7000, effective.PriceCents); Assert.Equal(6000, service.DefaultPriceCents);

        using var overlap = await SendSecureAsync(ownerClient, HttpMethod.Post, $"/api/v1/barbers/{ownerBarber.Id}/offerings", new { serviceId = service.Id, durationMinutes = 45, priceCents = 6500, validFrom = "2026-09-15", validTo = "2026-10-01" });
        Assert.Equal(HttpStatusCode.Conflict, overlap.StatusCode);
        using var ownerCommission = await SendSecureAsync(ownerClient, HttpMethod.Post, $"/api/v1/barbers/{ownerBarber.Id}/commission-rules", new { kind = "SERVICE", rateBasisPoints = 5000, validFrom = "2026-01-01" });
        Assert.Equal(HttpStatusCode.Conflict, ownerCommission.StatusCode);

        var contractorName = $"contractor-{Guid.NewGuid():N}";
        var contractorPassword = "Contractor-test!8426";
        var contractorUser = await CreateAsync<UserResponse>(ownerClient, "/api/v1/users", new { userName = contractorName, password = contractorPassword, roles = new[] { RoleNames.Barber } });
        var contractorStaff = await CreateAsync<StaffResponse>(ownerClient, "/api/v1/staff", new { userId = contractorUser.Id, displayName = "Diego Integración" });
        var contractor = await CreateAsync<BarberResponse>(ownerClient, "/api/v1/barbers", new { staffProfileId = contractorStaff.Id, employmentType = "CONTRACTOR", settlementFrequency = "BIWEEKLY", color = "#31523A" });
        var rule = await CreateAsync<CommissionRuleResponse>(ownerClient, $"/api/v1/barbers/{contractor.Id}/commission-rules", new { kind = "SERVICE", rateBasisPoints = 5000, validFrom = "2026-01-01", validTo = "2026-09-15" });
        Assert.Equal(5000, rule.RateBasisPoints);
        var effectiveRule = await ownerClient.GetFromJsonAsync<CommissionRuleResponse>($"/api/v1/barbers/{contractor.Id}/commission-rules/effective?kind=SERVICE&date=2026-09-10");
        Assert.NotNull(effectiveRule); Assert.Equal(rule.Id, effectiveRule.Id);
        using var ruleOverlap = await SendSecureAsync(ownerClient, HttpMethod.Post, $"/api/v1/barbers/{contractor.Id}/commission-rules", new { kind = "SERVICE", rateBasisPoints = 5500, validFrom = "2026-09-15" });
        Assert.Equal(HttpStatusCode.Conflict, ruleOverlap.StatusCode);
        using var deactivateRule = await SendSecureAsync(ownerClient, HttpMethod.Post, $"/api/v1/barbers/{contractor.Id}/commission-rules/{rule.Id}/deactivate", new { rule.Version });
        Assert.Equal(HttpStatusCode.NoContent, deactivateRule.StatusCode);
        using var historicalOverlap = await SendSecureAsync(ownerClient, HttpMethod.Post, $"/api/v1/barbers/{contractor.Id}/commission-rules", new { kind = "SERVICE", rateBasisPoints = 5500, validFrom = "2026-09-15" });
        Assert.Equal(HttpStatusCode.Conflict, historicalOverlap.StatusCode);

        using var contractorClient = _fixture.CreateClient();
        await LoginAsync(contractorClient, contractorName, contractorPassword);
        using var forbidden = await SendSecureAsync(contractorClient, HttpMethod.Post, "/api/v1/services", new { name = "Prohibido", defaultDurationMinutes = 30, defaultPriceCents = 1000 });
        Assert.Equal(HttpStatusCode.Forbidden, forbidden.StatusCode);

        await using var scope = _fixture.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var serviceAudits = await db.AuditLogs.Where(x => x.EntityType == "service").ToArrayAsync();
        Assert.NotEmpty(serviceAudits);
        Assert.All(serviceAudits, audit => Assert.False(string.IsNullOrWhiteSpace(audit.RequestId)));
        Assert.True(await db.ExpenseCategories.CountAsync() >= 5);
        Assert.NotNull(offering);
    }

    private static async Task<T> CreateAsync<T>(HttpClient client, string path, object body)
    {
        using var response = await SendSecureAsync(client, HttpMethod.Post, path, body);
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());
        return (await response.Content.ReadFromJsonAsync<T>())!;
    }

    private static async Task LoginAsync(HttpClient client, string userName, string password)
    {
        using var response = await SendSecureAsync(client, HttpMethod.Post, "/api/v1/auth/login", new { userName, password });
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    private static async Task<HttpResponseMessage> SendSecureAsync(HttpClient client, HttpMethod method, string path, object? body = null)
    {
        var antiforgery = await client.GetFromJsonAsync<AntiforgeryResponse>("/api/v1/auth/antiforgery");
        using var request = new HttpRequestMessage(method, path);
        request.Headers.Add("X-CSRF-TOKEN", antiforgery!.Token);
        if (body is not null) request.Content = JsonContent.Create(body);
        return await client.SendAsync(request);
    }

    private sealed record AntiforgeryResponse(string Token);
    private sealed record UserResponse(Guid Id, string UserName, bool Active, IReadOnlyCollection<string> Roles);
    private sealed record StaffResponse(Guid Id, Guid UserId, string DisplayName, string? Phone, bool Active, uint Version);
    private sealed record BarberResponse(Guid Id, Guid StaffProfileId, string EmploymentType, string SettlementFrequency, string? Color, bool Active, uint Version);
    private sealed record ServiceResponse(Guid Id, string Name, string? Description, int DefaultDurationMinutes, long DefaultPriceCents, bool Active, uint Version);
    private sealed record ProductResponse(Guid Id, string Name, long SalePriceCents);
    private sealed record OfferingResponse(Guid Id, Guid BarberId, Guid ServiceId, int DurationMinutes, long PriceCents);
    private sealed record EffectiveOfferingResponse(Guid ServiceId, string ServiceName, int DurationMinutes, long PriceCents, bool UsesBarberOverride);
    private sealed record CommissionRuleResponse(Guid Id, Guid BarberId, string Kind, int RateBasisPoints, DateOnly ValidFrom, DateOnly? ValidTo, bool Active, uint Version);
}
