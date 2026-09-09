using System.Diagnostics;
using System.Net;
using System.Net.Http.Json;
using LouBarbershop.Infrastructure.Identity;

namespace LouBarbershop.Integration.Tests;

[Collection("agenda-api")]
public sealed class PhaseTenEndpointTests(IdentityApiFixture fixture)
{
    [Fact]
    public async Task OwnerReconcilesPeriodCashProductionAuditAndCsvWhileBarberIsRejected()
    {
        using var owner = fixture.CreateClient();
        await LoginAsync(owner, IdentityApiFixture.OwnerUserName, IdentityApiFixture.OwnerPassword);
        var today = DateTime.UtcNow.AddHours(-4).ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);
        var before = await owner.GetFromJsonAsync<Period>($"/api/v1/reports/period?dateFrom={today}&dateTo={today}");
        var dailyBefore = await owner.GetFromJsonAsync<Daily>($"/api/v1/reports/daily?date={today}");
        var suffix = Guid.NewGuid().ToString("N");

        const string barberPassword = "Reports-test!8426";
        var user = await PostAsync<User>(owner, "/api/v1/users", new { userName = $"report-{suffix}", password = barberPassword, roles = new[] { RoleNames.Barber } });
        var staff = await PostAsync<IdResponse>(owner, "/api/v1/staff", new { userId = user.Id, displayName = "Contratado reportes" });
        var barber = await PostAsync<IdResponse>(owner, "/api/v1/barbers", new { staffProfileId = staff.Id, employmentType = "CONTRACTOR", settlementFrequency = "BIWEEKLY" });
        await PostAsync<object>(owner, $"/api/v1/barbers/{barber.Id}/commission-rules", new { kind = "SERVICE", rateBasisPoints = 5000, validFrom = "2026-01-01" });
        await PostAsync<object>(owner, $"/api/v1/barbers/{barber.Id}/commission-rules", new { kind = "PRODUCT", rateBasisPoints = 1000, validFrom = "2026-01-01" });
        var ownerUser = await PostAsync<User>(owner, "/api/v1/users", new { userName = $"owner-report-{suffix}", password = "Owner-report!8426", roles = new[] { RoleNames.Barber } });
        var ownerStaff = await PostAsync<IdResponse>(owner, "/api/v1/staff", new { userId = ownerUser.Id, displayName = "Dueño en producción" });
        var ownerBarber = await PostAsync<IdResponse>(owner, "/api/v1/barbers", new { staffProfileId = ownerStaff.Id, employmentType = "OWNER", settlementFrequency = "MONTHLY" });
        var service = await PostAsync<IdResponse>(owner, "/api/v1/services", new { name = $"Corte reporte {suffix}", defaultDurationMinutes = 45, defaultPriceCents = 10_000 });
        var ownerService = await PostAsync<IdResponse>(owner, "/api/v1/services", new { name = $"Dueño reporte {suffix}", defaultDurationMinutes = 30, defaultPriceCents = 4_000 });
        var product = await PostAsync<IdResponse>(owner, "/api/v1/products", new { name = $"Producto reporte {suffix}", sku = $"REP-{suffix[..8]}", salePriceCents = 5_000, minimumStock = 0 });
        await PostAsync<object>(owner, "/api/v1/inventory-receipts", new { receiptDate = today, paymentMethod = "CASH", items = new[] { new { productId = product.Id, quantity = 1, unitCostCents = 2_000 } } });
        var category = await PostAsync<IdResponse>(owner, "/api/v1/expense-categories", new { name = $"Reporte {suffix}" });
        await PostAsync<object>(owner, "/api/v1/expenses", new { categoryId = category.Id, expenseDate = today, description = "Gasto controlado", amountCents = 1_000, paymentMethod = "QR" });
        var customer = await PostAsync<CustomerChange>(owner, "/api/v1/customers", new { displayName = $"Cliente reporte {suffix}", phone = "70881234" });

        await PayAsync(owner, customer.Customer.Id, barber.Id, service.Id, product.Id, 15_000, $"report-contractor-{suffix}");
        await PayAsync(owner, customer.Customer.Id, ownerBarber.Id, ownerService.Id, null, 4_000, $"report-owner-{suffix}");

        var reportTimer = Stopwatch.StartNew();
        var after = await owner.GetFromJsonAsync<Period>($"/api/v1/reports/period?dateFrom={today}&dateTo={today}");
        reportTimer.Stop();
        Assert.True(reportTimer.Elapsed < TimeSpan.FromSeconds(5), $"Report took {reportTimer.Elapsed}.");
        Assert.NotNull(after); Assert.NotNull(before);
        Assert.Equal(2, after.PaidOperationCount - before.PaidOperationCount);
        Assert.Equal(14_000, after.ServiceRevenueCents - before.ServiceRevenueCents);
        Assert.Equal(5_000, after.ProductRevenueCents - before.ProductRevenueCents);
        Assert.Equal(2_000, after.ProductCostCents - before.ProductCostCents);
        Assert.Equal(10_000, after.CashCollectedCents - before.CashCollectedCents);
        Assert.Equal(9_000, after.QrCollectedCents - before.QrCollectedCents);
        Assert.Equal(5_500, after.CommissionGeneratedCents - before.CommissionGeneratedCents);
        Assert.Equal(1_000, after.ExpenseCents - before.ExpenseCents);
        Assert.Equal(2_000, after.InventoryPurchaseCents - before.InventoryPurchaseCents);
        Assert.Equal(10_500, after.ApproximateOperatingResultCents - before.ApproximateOperatingResultCents);
        Assert.Equal(16_000, after.CashFlowCents - before.CashFlowCents);
        Assert.Equal(8_000, after.CashFlowCashCents - before.CashFlowCashCents);
        Assert.Equal(8_000, after.CashFlowQrCents - before.CashFlowQrCents);
        Assert.Contains(after.Operations, x => x.BarberName == "Dueño en producción" && x.TotalCents == 4_000);

        var dailyAfter = await owner.GetFromJsonAsync<Daily>($"/api/v1/reports/daily?date={today}");
        Assert.Equal(2, dailyAfter!.PaidOperationCount - dailyBefore!.PaidOperationCount);
        Assert.Equal(19_000, dailyAfter.ChargesCents - dailyBefore.ChargesCents);
        var performance = await owner.GetFromJsonAsync<Performance[]>($"/api/v1/reports/barber-performance?dateFrom={today}&dateTo={today}");
        Assert.Contains(performance!, x => x.BarberId == ownerBarber.Id && x.IsOwner && x.Services == 1 && x.RevenueCents == 4_000);
        Assert.Contains(performance!, x => x.BarberId == barber.Id && !x.IsOwner && x.Services == 1 && x.Products == 1 && x.RevenueCents == 15_000);
        var audit = await owner.GetFromJsonAsync<AuditPage>($"/api/v1/audit?dateFrom={today}&dateTo={today}&entityType=sale_operation&page=1&pageSize=100");
        Assert.Contains(audit!.Items, x => x.EntityType == "sale_operation");
        using var csv = await owner.GetAsync($"/api/v1/reports/export?report=period&dateFrom={today}&dateTo={today}");
        Assert.Equal(HttpStatusCode.OK, csv.StatusCode); Assert.Equal("text/csv", csv.Content.Headers.ContentType!.MediaType);

        using var barberClient = fixture.CreateClient(); await LoginAsync(barberClient, user.UserName, barberPassword);
        using var forbidden = await barberClient.GetAsync($"/api/v1/reports/period?dateFrom={today}&dateTo={today}");
        Assert.Equal(HttpStatusCode.Forbidden, forbidden.StatusCode);
    }

    private static async Task PayAsync(HttpClient client, Guid customerId, Guid barberId, Guid serviceId, Guid? productId, long total, string key)
    {
        var operation = await PostAsync<Operation>(client, "/api/v1/operations", new { customerId, barberId });
        operation = await PutAsync<Operation>(client, $"/api/v1/operations/{operation.Id}/services", new { version = operation.Version, services = new[] { new { serviceId } } });
        if (productId.HasValue) operation = await PutAsync<Operation>(client, $"/api/v1/operations/{operation.Id}/products", new { version = operation.Version, products = new[] { new { productId, quantity = 1 } } });
        operation = await PostAsync<Operation>(client, $"/api/v1/operations/{operation.Id}/ready", new { version = operation.Version });
        object[] payments = total == 15_000 ? [new { method = "CASH", amountCents = 10_000 }, new { method = "QR", amountCents = 5_000 }] : [new { method = "QR", amountCents = total }];
        using var response = await SendAsync(client, HttpMethod.Post, $"/api/v1/operations/{operation.Id}/pay", new { version = operation.Version, payments }, key);
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());
    }
    private static async Task LoginAsync(HttpClient client, string user, string password) { using var response = await SendAsync(client, HttpMethod.Post, "/api/v1/auth/login", new { userName = user, password }); Assert.Equal(HttpStatusCode.NoContent, response.StatusCode); }
    private static async Task<T> PostAsync<T>(HttpClient client, string path, object body) { using var response = await SendAsync(client, HttpMethod.Post, path, body); Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync()); return (await response.Content.ReadFromJsonAsync<T>())!; }
    private static async Task<T> PutAsync<T>(HttpClient client, string path, object body) { using var response = await SendAsync(client, HttpMethod.Put, path, body); Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync()); return (await response.Content.ReadFromJsonAsync<T>())!; }
    private static async Task<HttpResponseMessage> SendAsync(HttpClient client, HttpMethod method, string path, object body, string? key = null) { var token = await client.GetFromJsonAsync<Token>("/api/v1/auth/antiforgery"); var request = new HttpRequestMessage(method, path) { Content = JsonContent.Create(body) }; request.Headers.Add("X-CSRF-TOKEN", token!.Value); if (key is not null) request.Headers.Add("Idempotency-Key", key); return await client.SendAsync(request); }
    private sealed record Token([property: System.Text.Json.Serialization.JsonPropertyName("token")] string Value);
    private sealed record User(Guid Id, string UserName); private sealed record IdResponse(Guid Id); private sealed record Customer(Guid Id); private sealed record CustomerChange(Customer Customer); private sealed record Operation(Guid Id, uint Version);
    private sealed record OperationSource(string BarberName, long TotalCents);
    private sealed record Period(int PaidOperationCount, long ServiceRevenueCents, long ProductRevenueCents, long ProductCostCents, long CashCollectedCents, long QrCollectedCents, long CommissionGeneratedCents, long ExpenseCents, long InventoryPurchaseCents, long ApproximateOperatingResultCents, long CashFlowCents, long CashFlowCashCents, long CashFlowQrCents, OperationSource[] Operations);
    private sealed record Daily(int PaidOperationCount, long ChargesCents);
    private sealed record Performance(Guid BarberId, bool IsOwner, int Services, int Products, long RevenueCents);
    private sealed record Audit(string EntityType); private sealed record AuditPage(Audit[] Items);
}
