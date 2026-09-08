using System.Net;
using System.Net.Http.Json;
using LouBarbershop.Infrastructure.Identity;
using LouBarbershop.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace LouBarbershop.Integration.Tests;

[Collection("agenda-api")]
public sealed class PhaseSevenEndpointTests(IdentityApiFixture fixture)
{
    [Fact]
    public async Task WalkInRealServicesMixedPaymentCommissionAndIdempotencyAreAtomic()
    {
        using var owner = fixture.CreateClient(); await LoginAsync(owner, IdentityApiFixture.OwnerUserName, IdentityApiFixture.OwnerPassword); var suffix = Guid.NewGuid().ToString("N");
        var user = await PostAsync<User>(owner, "/api/v1/users", new { userName = $"sales-{suffix}", password = "Sales-test!8426", roles = new[] { RoleNames.Barber } }); var staff = await PostAsync<IdResponse>(owner, "/api/v1/staff", new { userId = user.Id, displayName = "Barbero ventas" }); var barber = await PostAsync<IdResponse>(owner, "/api/v1/barbers", new { staffProfileId = staff.Id, employmentType = "CONTRACTOR", settlementFrequency = "BIWEEKLY" });
        await PostAsync<object>(owner, $"/api/v1/barbers/{barber.Id}/commission-rules", new { kind = "SERVICE", rateBasisPoints = 5000, validFrom = "2026-01-01" }); var reserved = await PostAsync<Service>(owner, "/api/v1/services", new { name = $"Reservado {suffix}", defaultDurationMinutes = 30, defaultPriceCents = 3000 }); var real = await PostAsync<Service>(owner, "/api/v1/services", new { name = $"Real {suffix}", defaultDurationMinutes = 45, defaultPriceCents = 7000 }); var customer = await PostAsync<CustomerChange>(owner, "/api/v1/customers", new { displayName = $"Walk in {suffix}", phone = "71234567" });
        var operation = await PostAsync<Operation>(owner, "/api/v1/operations", new { customerId = customer.Customer.Id, barberId = barber.Id }); Assert.Null(operation.AppointmentId); Assert.Equal("WALK_IN", operation.Origin);
        operation = await PutAsync<Operation>(owner, $"/api/v1/operations/{operation.Id}/services", new { version = operation.Version, services = new[] { new { serviceId = real.Id } } }); Assert.Equal(7000, operation.TotalCents); Assert.DoesNotContain(operation.Items, x => x.ServiceId == reserved.Id);
        operation = await PostAsync<Operation>(owner, $"/api/v1/operations/{operation.Id}/ready", new { version = operation.Version });
        using (var mismatch = await SendAsync(owner, HttpMethod.Post, $"/api/v1/operations/{operation.Id}/pay", new { version = operation.Version, payments = new[] { new { method = "CASH", amountCents = 6999 } } }, "mismatch-" + suffix)) { Assert.Equal(HttpStatusCode.Conflict, mismatch.StatusCode); }
        operation = (await owner.GetFromJsonAsync<Operation>($"/api/v1/operations/{operation.Id}"))!; Assert.Equal("READY_TO_PAY", operation.Status); Assert.Empty(operation.Payments);
        var key = "payment-" + suffix; var paid = await PayAsync(owner, operation, new[] { new { method = "CASH", amountCents = 3000 }, new { method = "QR", amountCents = 4000 } }, key); var replay = await PayAsync(owner, operation, new[] { new { method = "CASH", amountCents = 3000 }, new { method = "QR", amountCents = 4000 } }, key); Assert.Equal(paid.Id, replay.Id); Assert.Equal("PAID", paid.Status); Assert.Equal(2, paid.Payments.Length);
        await using var scope = fixture.Services.CreateAsyncScope(); var db = scope.ServiceProvider.GetRequiredService<AppDbContext>(); Assert.Single(await db.PaymentIdempotency.Where(x => x.OperationId == paid.Id).ToArrayAsync()); var commission = Assert.Single(await db.CommissionEntries.Where(x => x.SaleItemId == paid.Items.Single().Id).ToArrayAsync()); Assert.Equal(7000, commission.BaseCents); Assert.Equal(3500, commission.AmountCents);
        using var barberClient = fixture.CreateClient(); await LoginAsync(barberClient, user.UserName, "Sales-test!8426"); var own = await barberClient.GetFromJsonAsync<Daily>($"/api/v1/operations/daily?date={DateTime.UtcNow.AddHours(-4):yyyy-MM-dd}"); Assert.Contains(own!.Operations, x => x.Id == paid.Id);

        var appointmentDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(2));
        var date = appointmentDate.ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);
        await PostAsync<object>(owner, $"/api/v1/barbers/{barber.Id}/schedules", new { weekday = ((int)appointmentDate.DayOfWeek + 6) % 7 + 1, startLocalTime = "09:00", endLocalTime = "18:00", validFrom = date, validTo = date });
        var appointment = await PostAsync<Appointment>(owner, "/api/v1/appointments", new { customerId = customer.Customer.Id, barberId = barber.Id, serviceId = real.Id, startsAt = $"{date}T10:00:00-04:00" });
        appointment = await PostAsync<Appointment>(barberClient, $"/api/v1/appointments/{appointment.Id}/check-in", new { version = appointment.Version });
        appointment = await PostAsync<Appointment>(barberClient, $"/api/v1/appointments/{appointment.Id}/start", new { version = appointment.Version });
        var linked = await PostAsync<Operation>(barberClient, $"/api/v1/appointments/{appointment.Id}/operation", new { });
        linked = await PostAsync<Operation>(barberClient, $"/api/v1/operations/{linked.Id}/ready", new { version = linked.Version });
        var linkedPaid = await PayAsync(barberClient, linked, new[] { new { method = "CASH", amountCents = 7000 } }, "appointment-payment-" + suffix);
        Assert.Equal("PAID", linkedPaid.Status);
        Assert.Single(await db.AppointmentEvents.Where(x => x.AppointmentId == appointment.Id && x.Action == "COMPLETED_FROM_PAYMENT").ToArrayAsync());
        Assert.Equal("Completed", await db.Appointments.Where(x => x.Id == appointment.Id).Select(x => x.Status.ToString()).SingleAsync());
    }

    [Fact]
    public async Task MissingCommissionRuleRollsBackPaymentAndIdempotency()
    {
        using var owner = fixture.CreateClient(); await LoginAsync(owner, IdentityApiFixture.OwnerUserName, IdentityApiFixture.OwnerPassword); var suffix = Guid.NewGuid().ToString("N");
        var user = await PostAsync<User>(owner, "/api/v1/users", new { userName = $"no-rate-{suffix}", password = "Sales-test!8426", roles = new[] { RoleNames.Barber } });
        var staff = await PostAsync<IdResponse>(owner, "/api/v1/staff", new { userId = user.Id, displayName = "Sin tasa" });
        var barber = await PostAsync<IdResponse>(owner, "/api/v1/barbers", new { staffProfileId = staff.Id, employmentType = "CONTRACTOR", settlementFrequency = "BIWEEKLY" });
        var service = await PostAsync<Service>(owner, "/api/v1/services", new { name = $"Sin tasa {suffix}", defaultDurationMinutes = 30, defaultPriceCents = 5000 });
        var customer = await PostAsync<CustomerChange>(owner, "/api/v1/customers", new { displayName = $"Atomicidad {suffix}", phone = "76543210" });
        var operation = await PostAsync<Operation>(owner, "/api/v1/operations", new { customerId = customer.Customer.Id, barberId = barber.Id });
        operation = await PutAsync<Operation>(owner, $"/api/v1/operations/{operation.Id}/services", new { version = operation.Version, services = new[] { new { serviceId = service.Id } } });
        operation = await PostAsync<Operation>(owner, $"/api/v1/operations/{operation.Id}/ready", new { version = operation.Version });
        var key = "missing-rate-" + suffix;
        using var failed = await SendAsync(owner, HttpMethod.Post, $"/api/v1/operations/{operation.Id}/pay", new { version = operation.Version, payments = new[] { new { method = "CASH", amountCents = 5000 } } }, key);
        Assert.Equal(HttpStatusCode.Conflict, failed.StatusCode);
        var unchanged = (await owner.GetFromJsonAsync<Operation>($"/api/v1/operations/{operation.Id}"))!;
        Assert.Equal("READY_TO_PAY", unchanged.Status);
        Assert.Empty(unchanged.Payments);
        await using var scope = fixture.Services.CreateAsyncScope(); var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Empty(await db.PaymentIdempotency.Where(x => x.OperationId == operation.Id).ToArrayAsync());
        Assert.Empty(await db.CommissionEntries.Where(x => x.BarberId == barber.Id).ToArrayAsync());
    }

    private static async Task LoginAsync(HttpClient c, string u, string p) { using var r = await SendAsync(c, HttpMethod.Post, "/api/v1/auth/login", new { userName = u, password = p }); Assert.Equal(HttpStatusCode.NoContent, r.StatusCode); }
    private static async Task<T> PostAsync<T>(HttpClient c, string path, object body) { using var r = await SendAsync(c, HttpMethod.Post, path, body); Assert.True(r.IsSuccessStatusCode, await r.Content.ReadAsStringAsync()); return (await r.Content.ReadFromJsonAsync<T>())!; }
    private static async Task<T> PutAsync<T>(HttpClient c, string path, object body) { using var r = await SendAsync(c, HttpMethod.Put, path, body); Assert.True(r.IsSuccessStatusCode, await r.Content.ReadAsStringAsync()); return (await r.Content.ReadFromJsonAsync<T>())!; }
    private static async Task<Operation> PayAsync(HttpClient c, Operation value, object payments, string key) { using var r = await SendAsync(c, HttpMethod.Post, $"/api/v1/operations/{value.Id}/pay", new { version = value.Version, payments }, key); Assert.True(r.IsSuccessStatusCode, await r.Content.ReadAsStringAsync()); return (await r.Content.ReadFromJsonAsync<Operation>())!; }
    private static async Task<HttpResponseMessage> SendAsync(HttpClient c, HttpMethod method, string path, object body, string? key = null) { var token = await c.GetFromJsonAsync<Token>("/api/v1/auth/antiforgery"); var request = new HttpRequestMessage(method, path) { Content = JsonContent.Create(body) }; request.Headers.Add("X-CSRF-TOKEN", token!.Value); if (key is not null) request.Headers.Add("Idempotency-Key", key); return await c.SendAsync(request); }
    private sealed record Token([property: System.Text.Json.Serialization.JsonPropertyName("token")] string Value); private sealed record IdResponse(Guid Id); private sealed record User(Guid Id, string UserName); private sealed record Service(Guid Id); private sealed record Customer(Guid Id); private sealed record CustomerChange(Customer Customer); private sealed record Item(Guid Id, Guid ServiceId); private sealed record Payment(Guid Id); private sealed record Appointment(Guid Id, uint Version); private sealed record Operation(Guid Id, Guid? AppointmentId, string Origin, string Status, long TotalCents, uint Version, Item[] Items, Payment[] Payments); private sealed record Daily(Operation[] Operations);
}
