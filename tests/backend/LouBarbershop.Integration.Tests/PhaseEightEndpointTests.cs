using System.Net;
using System.Net.Http.Json;
using LouBarbershop.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace LouBarbershop.Integration.Tests;

[Collection("agenda-api")]
public sealed class PhaseEightEndpointTests(IdentityApiFixture fixture)
{
    private static readonly string[] BarberRole = ["BARBER"];

    [Fact]
    public async Task ReceiptProductSaleStockConcurrencyAndExpenseVoidAreConsistent()
    {
        using var first = fixture.CreateClient();
        using var second = fixture.CreateClient();
        await LoginAsync(first); await LoginAsync(second);
        var suffix = Guid.NewGuid().ToString("N");
        var user = await PostAsync<User>(first, "/api/v1/users", new { userName = $"inventory-{suffix}", password = "Inventory-test!8426", roles = BarberRole });
        var staff = await PostAsync<IdResponse>(first, "/api/v1/staff", new { userId = user.Id, displayName = "Dueño inventario" });
        var barber = await PostAsync<IdResponse>(first, "/api/v1/barbers", new { staffProfileId = staff.Id, employmentType = "OWNER", settlementFrequency = "MONTHLY" });
        var product = await PostAsync<Product>(first, "/api/v1/products", new { name = $"Cera {suffix}", sku = $"CER-{suffix[..8]}", salePriceCents = 3_000, minimumStock = 1 });
        var customer = await PostAsync<CustomerChange>(first, "/api/v1/customers", new { displayName = $"Cliente {suffix}", phone = "70000001" });
        var today = DateTime.UtcNow.AddHours(-4).ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);
        var baselineCash = await first.GetFromJsonAsync<CashFlow>($"/api/v1/cash-flow?dateFrom={today}&dateTo={today}");

        var receipt = await PostAsync<Receipt>(first, "/api/v1/inventory-receipts", new { receiptDate = today, paymentMethod = "CASH", items = new[] { new { productId = product.Id, quantity = 1, unitCostCents = 1_000 } } });
        Assert.Equal(1_000, receipt.TotalCents);
        var stock = (await first.GetFromJsonAsync<Inventory[]>("/api/v1/inventory"))!.Single(x => x.ProductId == product.Id);
        Assert.Equal(1, stock.Quantity); Assert.Equal(1_000, stock.AverageCostCents);

        var operationA = await ProductOperationAsync(first, customer.Customer.Id, barber.Id, product.Id);
        var operationB = await ProductOperationAsync(first, customer.Customer.Id, barber.Id, product.Id);
        var payA = SendAsync(first, HttpMethod.Post, $"/api/v1/operations/{operationA.Id}/pay", new { version = operationA.Version, payments = new[] { new { method = "QR", amountCents = 3_000 } } }, $"product-a-{suffix}");
        var payB = SendAsync(second, HttpMethod.Post, $"/api/v1/operations/{operationB.Id}/pay", new { version = operationB.Version, payments = new[] { new { method = "QR", amountCents = 3_000 } } }, $"product-b-{suffix}");
        using var responses = new ResponsePair(await payA, await payB);
        Assert.Equal(1, new[] { responses.First.StatusCode, responses.Second.StatusCode }.Count(x => x == HttpStatusCode.OK));
        Assert.Equal(1, new[] { responses.First.StatusCode, responses.Second.StatusCode }.Count(x => x == HttpStatusCode.Conflict));
        var conflictBody = await (responses.First.StatusCode == HttpStatusCode.Conflict ? responses.First : responses.Second).Content.ReadAsStringAsync();
        Assert.Contains("OUT_OF_STOCK", conflictBody);

        stock = (await first.GetFromJsonAsync<Inventory[]>("/api/v1/inventory"))!.Single(x => x.ProductId == product.Id);
        Assert.Equal(0, stock.Quantity);
        await using (var scope = fixture.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var saleMovement = Assert.Single(await db.InventoryMovements.Where(x => x.ProductId == product.Id && x.SaleItemId != null).ToArrayAsync());
            Assert.Equal(-1, saleMovement.QuantityDelta); Assert.Equal(1_000, saleMovement.UnitCostCents);
        }

        var currentProduct = (await first.GetFromJsonAsync<Product[]>("/api/v1/products"))!.Single(x => x.Id == product.Id);
        using (var deactivated = await SendAsync(first, HttpMethod.Patch, $"/api/v1/products/{product.Id}", new { currentProduct.Name, currentProduct.Sku, currentProduct.SalePriceCents, currentProduct.MinimumStock, active = false, currentProduct.Version })) { Assert.True(deactivated.IsSuccessStatusCode, await deactivated.Content.ReadAsStringAsync()); }
        var blockedOperation = await PostAsync<Operation>(first, "/api/v1/operations", new { customerId = customer.Customer.Id, barberId = barber.Id });
        using (var blocked = await SendAsync(first, HttpMethod.Put, $"/api/v1/operations/{blockedOperation.Id}/products", new { version = blockedOperation.Version, products = new[] { new { productId = product.Id, quantity = 1 } } })) { Assert.Equal(HttpStatusCode.Conflict, blocked.StatusCode); }
        Assert.NotEmpty(await first.GetFromJsonAsync<object[]>($"/api/v1/products/{product.Id}/movements") ?? []);

        var category = await PostAsync<IdResponse>(first, "/api/v1/expense-categories", new { name = $"Luz {suffix}" });
        using (var invalidExpense = await SendAsync(first, HttpMethod.Post, "/api/v1/expenses", new { categoryId = category.Id, description = "Sin datos", amountCents = 0, paymentMethod = "CASH" })) { Assert.Equal(HttpStatusCode.BadRequest, invalidExpense.StatusCode); }
        var expense = await PostAsync<Expense>(first, "/api/v1/expenses", new { categoryId = category.Id, expenseDate = today, description = "Factura pagada", amountCents = 700, paymentMethod = "QR" });
        var voided = await PostAsync<Expense>(first, $"/api/v1/expenses/{expense.Id}/void", new { version = expense.Version, reason = "Comprobante duplicado" });
        Assert.Equal("VOIDED", voided.Status); Assert.Equal(700, voided.AmountCents);
        var cash = await first.GetFromJsonAsync<CashFlow>($"/api/v1/cash-flow?dateFrom={today}&dateTo={today}");
        Assert.Equal(1_000, cash!.InventoryCashCents - baselineCash!.InventoryCashCents); Assert.Equal(0, cash.ExpenseQrCents - baselineCash.ExpenseQrCents); Assert.Equal(3_000, cash.SalesQrCents - baselineCash.SalesQrCents);
        await using (var scope = fixture.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            Assert.Contains(await db.AuditLogs.Where(x => x.EntityId == expense.Id).ToArrayAsync(), x => x.EntityType == "expense" && x.Action == "Modified");
        }
    }

    private static async Task<Operation> ProductOperationAsync(HttpClient client, Guid customerId, Guid barberId, Guid productId)
    {
        var operation = await PostAsync<Operation>(client, "/api/v1/operations", new { customerId, barberId });
        operation = await PutAsync<Operation>(client, $"/api/v1/operations/{operation.Id}/products", new { version = operation.Version, products = new[] { new { productId, quantity = 1 } } });
        Assert.Equal(1_000, operation.Items.Single().UnitCostCents);
        return await PostAsync<Operation>(client, $"/api/v1/operations/{operation.Id}/ready", new { version = operation.Version });
    }

    private static async Task LoginAsync(HttpClient client) { using var response = await SendAsync(client, HttpMethod.Post, "/api/v1/auth/login", new { userName = IdentityApiFixture.OwnerUserName, password = IdentityApiFixture.OwnerPassword }); Assert.Equal(HttpStatusCode.NoContent, response.StatusCode); }
    private static async Task<T> PostAsync<T>(HttpClient client, string path, object body) { using var response = await SendAsync(client, HttpMethod.Post, path, body); Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync()); return (await response.Content.ReadFromJsonAsync<T>())!; }
    private static async Task<T> PutAsync<T>(HttpClient client, string path, object body) { using var response = await SendAsync(client, HttpMethod.Put, path, body); Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync()); return (await response.Content.ReadFromJsonAsync<T>())!; }
    private static async Task<HttpResponseMessage> SendAsync(HttpClient client, HttpMethod method, string path, object body, string? key = null) { var token = await client.GetFromJsonAsync<Token>("/api/v1/auth/antiforgery"); var request = new HttpRequestMessage(method, path) { Content = JsonContent.Create(body) }; request.Headers.Add("X-CSRF-TOKEN", token!.Value); if (key is not null) request.Headers.Add("Idempotency-Key", key); return await client.SendAsync(request); }
    private sealed record Token([property: System.Text.Json.Serialization.JsonPropertyName("token")] string Value); private sealed record User(Guid Id); private sealed record IdResponse(Guid Id); private sealed record Product(Guid Id, string Name, string? Sku, long SalePriceCents, int MinimumStock, uint Version); private sealed record Customer(Guid Id); private sealed record CustomerChange(Customer Customer); private sealed record Receipt(long TotalCents); private sealed record Inventory(Guid ProductId, int Quantity, long? AverageCostCents); private sealed record Item(long UnitCostCents); private sealed record Operation(Guid Id, uint Version, Item[] Items); private sealed record Expense(Guid Id, long AmountCents, string Status, uint Version); private sealed record CashFlow(long SalesQrCents, long InventoryCashCents, long ExpenseQrCents);
    private sealed class ResponsePair(HttpResponseMessage first, HttpResponseMessage second) : IDisposable { public HttpResponseMessage First { get; } = first; public HttpResponseMessage Second { get; } = second; public void Dispose() { First.Dispose(); Second.Dispose(); } }
}
