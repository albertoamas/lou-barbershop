using System.Net;
using System.Net.Http.Json;
using LouBarbershop.Infrastructure.Identity;
using LouBarbershop.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace LouBarbershop.Integration.Tests;

[Collection("agenda-api")]
public sealed class PhaseNineEndpointTests(IdentityApiFixture fixture)
{
    [Fact]
    public async Task CourtesySettlementConcurrencyPaymentAndPaidReversalReconcileExactly()
    {
        using var owner = fixture.CreateClient(); using var secondOwner = fixture.CreateClient();
        await LoginAsync(owner, IdentityApiFixture.OwnerUserName, IdentityApiFixture.OwnerPassword); await LoginAsync(secondOwner, IdentityApiFixture.OwnerUserName, IdentityApiFixture.OwnerPassword);
        var suffix = Guid.NewGuid().ToString("N"); const string password = "Commission-test!8426";
        var user = await PostAsync<User>(owner, "/api/v1/users", new { userName = $"commission-{suffix}", password, roles = new[] { RoleNames.Barber } });
        var staff = await PostAsync<IdResponse>(owner, "/api/v1/staff", new { userId = user.Id, displayName = "Barbero comisión" });
        var barber = await PostAsync<IdResponse>(owner, "/api/v1/barbers", new { staffProfileId = staff.Id, employmentType = "CONTRACTOR", settlementFrequency = "BIWEEKLY" });
        var rule = await PostAsync<Rule>(owner, $"/api/v1/barbers/{barber.Id}/commission-rules", new { kind = "SERVICE", rateBasisPoints = 5000, validFrom = "2026-01-01" });
        var service = await PostAsync<Service>(owner, "/api/v1/services", new { name = $"Cortesía {suffix}", defaultDurationMinutes = 45, defaultPriceCents = 7001 });
        var customer = await PostAsync<CustomerChange>(owner, "/api/v1/customers", new { displayName = $"Comisión {suffix}", phone = "70112233" });
        var operation = await PaidServiceAsync(owner, customer.Customer.Id, barber.Id, service.Id, 7001, true, suffix);

        using var barberClient = fixture.CreateClient(); await LoginAsync(barberClient, user.UserName, password);
        var own = (await barberClient.GetFromJsonAsync<Commission[]>("/api/v1/commissions"))!;
        var earning = Assert.Single(own, x => x.OperationId == operation.Id);
        Assert.Equal(7001, earning.BaseCents); Assert.Equal(5000, earning.RateBasisPoints); Assert.Equal(3501, earning.AmountCents); Assert.Equal("AVAILABLE", earning.Status);
        using (var deactivated = await SendAsync(owner, HttpMethod.Post, $"/api/v1/barbers/{barber.Id}/commission-rules/{rule.Id}/deactivate", new { version = rule.Version })) { Assert.Equal(HttpStatusCode.NoContent, deactivated.StatusCode); }
        own = (await barberClient.GetFromJsonAsync<Commission[]>("/api/v1/commissions"))!;
        Assert.Equal(5000, Assert.Single(own, x => x.OperationId == operation.Id).RateBasisPoints);
        using (var forbidden = await SendAsync(barberClient, HttpMethod.Post, "/api/v1/settlements", new { barberId = barber.Id, periodEnd = Today() })) { Assert.Equal(HttpStatusCode.Forbidden, forbidden.StatusCode); }

        var createA = SendAsync(owner, HttpMethod.Post, "/api/v1/settlements", new { barberId = barber.Id, periodEnd = Today() });
        var createB = SendAsync(secondOwner, HttpMethod.Post, "/api/v1/settlements", new { barberId = barber.Id, periodEnd = Today() });
        using var responseA = await createA; using var responseB = await createB;
        Assert.Equal(1, new[] { responseA.StatusCode, responseB.StatusCode }.Count(x => x == HttpStatusCode.OK));
        Assert.Equal(1, new[] { responseA.StatusCode, responseB.StatusCode }.Count(x => x == HttpStatusCode.Conflict));
        var successful = responseA.IsSuccessStatusCode ? responseA : responseB;
        var settlement = (await successful.Content.ReadFromJsonAsync<Settlement>())!;
        Assert.Equal(3501, settlement.CommissionTotalCents); Assert.Single(settlement.Items);
        settlement = await PostAsync<Settlement>(owner, $"/api/v1/settlements/{settlement.Id}/adjustments", new { version = settlement.Version, amountCents = -1, reason = "Redondeo acordado" });
        Assert.Equal(3500, settlement.PayableTotalCents);
        settlement = await PostAsync<Settlement>(owner, $"/api/v1/settlements/{settlement.Id}/close", new { version = settlement.Version });
        settlement = await PostAsync<Settlement>(owner, $"/api/v1/settlements/{settlement.Id}/pay", new { version = settlement.Version, paymentDate = Today(), method = "QR" });
        Assert.Equal("PAID", settlement.Status); Assert.Equal(3500, settlement.PayableTotalCents);
        using (var immutable = await SendAsync(owner, HttpMethod.Post, $"/api/v1/settlements/{settlement.Id}/adjustments", new { version = settlement.Version, amountCents = 1, reason = "No permitido" })) { Assert.Equal(HttpStatusCode.Conflict, immutable.StatusCode); }

        await PostAsync<bool>(owner, $"/api/v1/operations/{operation.Id}/reverse", new { version = operation.Version, reason = "Atención anulada después del pago" });
        own = (await barberClient.GetFromJsonAsync<Commission[]>("/api/v1/commissions"))!;
        var correction = Assert.Single(own, x => x.SourceEntryId == earning.Id);
        Assert.Equal(-3501, correction.AmountCents); Assert.Equal("AVAILABLE", correction.Status);
        Assert.Equal("PAID", Assert.Single(own, x => x.Id == earning.Id).Status);

        await using var scope = fixture.Services.CreateAsyncScope(); var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Single(await db.SettlementItems.Where(x => x.CommissionEntryId == earning.Id).ToArrayAsync());
        Assert.Contains(await db.AuditLogs.Where(x => x.EntityId == settlement.Id).ToArrayAsync(), x => x.EntityType == "settlement");
    }

    [Fact]
    public async Task OwnerServiceHasNoCommissionAndReversalBeforeSettlementVoidsEntry()
    {
        using var owner = fixture.CreateClient(); await LoginAsync(owner, IdentityApiFixture.OwnerUserName, IdentityApiFixture.OwnerPassword); var suffix = Guid.NewGuid().ToString("N");
        var ownerUser = await PostAsync<User>(owner, "/api/v1/users", new { userName = $"owner-barber-{suffix}", password = "Owner-barber!8426", roles = new[] { RoleNames.Barber } });
        var ownerStaff = await PostAsync<IdResponse>(owner, "/api/v1/staff", new { userId = ownerUser.Id, displayName = "Dueño barbero" });
        var ownerBarber = await PostAsync<IdResponse>(owner, "/api/v1/barbers", new { staffProfileId = ownerStaff.Id, employmentType = "OWNER", settlementFrequency = "MONTHLY" });
        var service = await PostAsync<Service>(owner, "/api/v1/services", new { name = $"Dueño {suffix}", defaultDurationMinutes = 30, defaultPriceCents = 4000 });
        var customer = await PostAsync<CustomerChange>(owner, "/api/v1/customers", new { displayName = $"Dueño cliente {suffix}", phone = "70998877" });
        var ownerOperation = await PaidServiceAsync(owner, customer.Customer.Id, ownerBarber.Id, service.Id, 4000, false, "owner-" + suffix);
        await using (var scope = fixture.Services.CreateAsyncScope()) { var db = scope.ServiceProvider.GetRequiredService<AppDbContext>(); Assert.Empty(await db.CommissionEntries.Where(x => x.SaleItemId == ownerOperation.Items[0].Id).ToArrayAsync()); }

        var contractorUser = await PostAsync<User>(owner, "/api/v1/users", new { userName = $"void-{suffix}", password = "Void-test!8426", roles = new[] { RoleNames.Barber } });
        var contractorStaff = await PostAsync<IdResponse>(owner, "/api/v1/staff", new { userId = contractorUser.Id, displayName = "Contratado reverso" });
        var contractor = await PostAsync<IdResponse>(owner, "/api/v1/barbers", new { staffProfileId = contractorStaff.Id, employmentType = "CONTRACTOR", settlementFrequency = "BIWEEKLY" });
        await PostAsync<object>(owner, $"/api/v1/barbers/{contractor.Id}/commission-rules", new { kind = "PRODUCT", rateBasisPoints = 1000, validFrom = "2026-01-01" });
        var product = await PostAsync<Product>(owner, "/api/v1/products", new { name = $"Pomada reverso {suffix}", sku = $"REV-{suffix[..8]}", salePriceCents = 3000, minimumStock = 0 });
        await PostAsync<object>(owner, "/api/v1/inventory-receipts", new { receiptDate = Today(), paymentMethod = "CASH", items = new[] { new { productId = product.Id, quantity = 1, unitCostCents = 1200 } } });
        var operation = await PaidProductAsync(owner, customer.Customer.Id, contractor.Id, product.Id, "void-" + suffix);
        var before = await owner.GetFromJsonAsync<CashFlow>($"/api/v1/cash-flow?dateFrom={Today()}&dateTo={Today()}");
        await PostAsync<bool>(owner, $"/api/v1/operations/{operation.Id}/reverse", new { version = operation.Version, reason = "Error antes de liquidar" });
        var after = await owner.GetFromJsonAsync<CashFlow>($"/api/v1/cash-flow?dateFrom={Today()}&dateTo={Today()}");
        Assert.Equal(3000, before!.SalesCashCents - after!.SalesCashCents);
        var stock = (await owner.GetFromJsonAsync<Inventory[]>("/api/v1/inventory"))!.Single(x => x.ProductId == product.Id);
        Assert.Equal(1, stock.Quantity);
        var entries = (await owner.GetFromJsonAsync<Commission[]>($"/api/v1/commissions?barberId={contractor.Id}"))!;
        Assert.Equal("VOIDED", Assert.Single(entries).Status); Assert.DoesNotContain(entries, x => x.Type == "REVERSAL");
    }

    private static async Task<Operation> PaidServiceAsync(HttpClient client, Guid customerId, Guid barberId, Guid serviceId, long amount, bool courtesy, string key)
    {
        var operation = await PostAsync<Operation>(client, "/api/v1/operations", new { customerId, barberId });
        operation = await PutAsync<Operation>(client, $"/api/v1/operations/{operation.Id}/services", new { version = operation.Version, services = new[] { new { serviceId } } });
        if (courtesy) operation = await PostAsync<Operation>(client, $"/api/v1/operations/{operation.Id}/adjustments", new { version = operation.Version, discountCents = 0, courtesy = true, reason = "Cortesía autorizada" });
        operation = await PostAsync<Operation>(client, $"/api/v1/operations/{operation.Id}/ready", new { version = operation.Version });
        object[] payments = courtesy ? [] : [new { method = "CASH", amountCents = amount }];
        using var response = await SendAsync(client, HttpMethod.Post, $"/api/v1/operations/{operation.Id}/pay", new { version = operation.Version, payments }, key);
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync()); return (await response.Content.ReadFromJsonAsync<Operation>())!;
    }
    private static async Task<Operation> PaidProductAsync(HttpClient client, Guid customerId, Guid barberId, Guid productId, string key)
    {
        var operation = await PostAsync<Operation>(client, "/api/v1/operations", new { customerId, barberId });
        operation = await PutAsync<Operation>(client, $"/api/v1/operations/{operation.Id}/products", new { version = operation.Version, products = new[] { new { productId, quantity = 1 } } });
        operation = await PostAsync<Operation>(client, $"/api/v1/operations/{operation.Id}/ready", new { version = operation.Version });
        using var response = await SendAsync(client, HttpMethod.Post, $"/api/v1/operations/{operation.Id}/pay", new { version = operation.Version, payments = new[] { new { method = "CASH", amountCents = 3000 } } }, key);
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync()); return (await response.Content.ReadFromJsonAsync<Operation>())!;
    }
    private static string Today() => DateTime.UtcNow.AddHours(-4).ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);
    private static async Task LoginAsync(HttpClient client, string user, string password) { using var response = await SendAsync(client, HttpMethod.Post, "/api/v1/auth/login", new { userName = user, password }); Assert.Equal(HttpStatusCode.NoContent, response.StatusCode); }
    private static async Task<T> PostAsync<T>(HttpClient client, string path, object body) { using var response = await SendAsync(client, HttpMethod.Post, path, body); Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync()); return (await response.Content.ReadFromJsonAsync<T>())!; }
    private static async Task<T> PutAsync<T>(HttpClient client, string path, object body) { using var response = await SendAsync(client, HttpMethod.Put, path, body); Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync()); return (await response.Content.ReadFromJsonAsync<T>())!; }
    private static async Task<HttpResponseMessage> SendAsync(HttpClient client, HttpMethod method, string path, object body, string? key = null) { var token = await client.GetFromJsonAsync<Token>("/api/v1/auth/antiforgery"); var request = new HttpRequestMessage(method, path) { Content = JsonContent.Create(body) }; request.Headers.Add("X-CSRF-TOKEN", token!.Value); if (key is not null) request.Headers.Add("Idempotency-Key", key); return await client.SendAsync(request); }
    private sealed record Token([property: System.Text.Json.Serialization.JsonPropertyName("token")] string Value); private sealed record User(Guid Id, string UserName); private sealed record IdResponse(Guid Id); private sealed record Rule(Guid Id, uint Version); private sealed record Service(Guid Id); private sealed record Product(Guid Id); private sealed record Inventory(Guid ProductId, int Quantity); private sealed record Customer(Guid Id); private sealed record CustomerChange(Customer Customer); private sealed record Item(Guid Id); private sealed record Operation(Guid Id, uint Version, Item[] Items); private sealed record Commission(Guid Id, Guid? OperationId, string Type, long BaseCents, int RateBasisPoints, long AmountCents, string Status, Guid? SourceEntryId); private sealed record SettlementItem(Guid Id); private sealed record Settlement(Guid Id, string Status, long CommissionTotalCents, long PayableTotalCents, uint Version, SettlementItem[] Items); private sealed record CashFlow(long SalesCashCents);
}
