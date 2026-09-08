using System.Net;
using System.Net.Http.Json;
using LouBarbershop.Application.Scheduling;
using LouBarbershop.Infrastructure.Identity;
using LouBarbershop.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace LouBarbershop.Integration.Tests;

[Collection("agenda-api")]
public sealed class PhaseSixEndpointTests(IdentityApiFixture fixture)
{
    [Fact]
    public async Task CustomersConcurrentBookingHistoryOwnershipAndTransitionsWorkTogether()
    {
        using var owner = fixture.CreateClient();
        await LoginAsync(owner, IdentityApiFixture.OwnerUserName, IdentityApiFixture.OwnerPassword);
        var suffix = Guid.NewGuid().ToString("N");
        var user = await PostAsync<User>(owner, "/api/v1/users", new { userName = $"agenda-{suffix}", password = "Agenda-test!8426", roles = new[] { RoleNames.Barber } });
        var outsider = await PostAsync<User>(owner, "/api/v1/users", new { userName = $"outside-{suffix}", password = "Agenda-test!8426", roles = new[] { RoleNames.Barber } });
        var staff = await PostAsync<IdResponse>(owner, "/api/v1/staff", new { userId = user.Id, displayName = "Barbero prueba agenda" });
        var barber = await PostAsync<IdResponse>(owner, "/api/v1/barbers", new { staffProfileId = staff.Id, employmentType = "CONTRACTOR", settlementFrequency = "BIWEEKLY" });
        var service = await PostAsync<Service>(owner, "/api/v1/services", new { name = $"Corte {suffix}", defaultDurationMinutes = 45, defaultPriceCents = 6000 });
        var tomorrow = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(2));
        var date = tomorrow.ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);
        await PostAsync<object>(owner, $"/api/v1/barbers/{barber.Id}/schedules", new { weekday = ((int)tomorrow.DayOfWeek + 6) % 7 + 1, startLocalTime = "09:00", endLocalTime = "18:00", validFrom = date, validTo = date });
        var customer = await PostAsync<CustomerChange>(owner, "/api/v1/customers", new { displayName = $"Cliente {suffix}", phone = "7123 4567" });
        Assert.Equal("+59171234567", customer.Customer.Phone);
        var duplicate = await PostAsync<CustomerChange>(owner, "/api/v1/customers", new { displayName = $"Familiar {suffix}", phone = "71234567" });
        Assert.Contains(duplicate.PossibleDuplicates, x => x.Id == customer.Customer.Id);
        var found = await owner.GetFromJsonAsync<Customer[]>($"/api/v1/customers?query={suffix}");
        Assert.Equal(2, found!.Length);
        using var correction = await SendAsync(owner, HttpMethod.Patch, $"/api/v1/customers/{customer.Customer.Id}", new { displayName = $"Cliente corregido {suffix}", phone = "+59171234567", notes = "Preferencia de corte", version = customer.Customer.Version });
        Assert.True(correction.IsSuccessStatusCode);
        using var staleCustomer = await SendAsync(owner, HttpMethod.Patch, $"/api/v1/customers/{customer.Customer.Id}", new { displayName = "Cambio obsoleto", phone = "+59171234567", version = customer.Customer.Version });
        Assert.Equal(HttpStatusCode.Conflict, staleCustomer.StatusCode);

        var input = new { customerId = customer.Customer.Id, barberId = barber.Id, serviceId = service.Id, startsAt = $"{date}T09:00:00-04:00" };
        var attempts = await Task.WhenAll(SendAsync(owner, HttpMethod.Post, "/api/v1/appointments", input), SendAsync(owner, HttpMethod.Post, "/api/v1/appointments", input));
        try
        {
            Assert.Single(attempts, x => x.IsSuccessStatusCode);
            var conflict = Assert.Single(attempts, x => x.StatusCode == HttpStatusCode.Conflict);
            Assert.Contains("SLOT_TAKEN", await conflict.Content.ReadAsStringAsync(), StringComparison.Ordinal);
        }
        finally { foreach (var response in attempts) response.Dispose(); }

        var rows = await owner.GetFromJsonAsync<Appointment[]>($"/api/v1/appointments?dateFrom={date}&dateTo={date}&barberId={barber.Id}");
        var appointment = Assert.Single(rows!);
        using var priceChange = await SendAsync(owner, HttpMethod.Patch, $"/api/v1/services/{service.Id}", new { name = service.Name, defaultDurationMinutes = 60, defaultPriceCents = 7000, active = true, version = service.Version });
        Assert.True(priceChange.IsSuccessStatusCode);
        var historical = await owner.GetFromJsonAsync<Appointment>($"/api/v1/appointments/{appointment.Id}");
        Assert.Equal(6000, historical!.QuotedPriceCents);
        Assert.Equal(45, historical.QuotedDurationMinutes);
        var alternatives = await owner.GetFromJsonAsync<Alternative[]>($"/api/v1/appointments/{appointment.Id}/availability?serviceId={service.Id}&barberId={barber.Id}&date={date}");
        Assert.Contains(alternatives!, x => x.StartsAt == DateTimeOffset.Parse($"{date}T09:00:00-04:00", System.Globalization.CultureInfo.InvariantCulture));
        using var tooEarly = await SendAsync(owner, HttpMethod.Post, $"/api/v1/appointments/{appointment.Id}/no-show", new { version = appointment.Version, reason = "Todavía es futuro" });
        Assert.Equal(HttpStatusCode.BadRequest, tooEarly.StatusCode);
        using var reschedule = await SendAsync(owner, HttpMethod.Patch, $"/api/v1/appointments/{appointment.Id}/reschedule", new { barberId = barber.Id, serviceId = service.Id, startsAt = $"{date}T10:00:00-04:00", version = appointment.Version, reason = "Solicitud del cliente" });
        Assert.True(reschedule.IsSuccessStatusCode, await reschedule.Content.ReadAsStringAsync());
        appointment = (await reschedule.Content.ReadFromJsonAsync<Appointment>())!;
        Assert.Equal(7000, appointment.QuotedPriceCents);
        var events = await owner.GetFromJsonAsync<Event[]>($"/api/v1/appointments/{appointment.Id}/events");
        Assert.Equal(2, events!.Length);
        var change = Assert.Single(events, x => x.Action == "RESCHEDULED");
        Assert.Equal(6000, change.Before!.PriceCents);
        Assert.Equal(7000, change.After.PriceCents);
        Assert.NotEqual(Guid.Empty, change.ActorId);

        using var barberClient = fixture.CreateClient();
        await LoginAsync(barberClient, user.UserName, "Agenda-test!8426");
        var ownDay = await barberClient.GetFromJsonAsync<Appointment[]>($"/api/v1/appointments?dateFrom={date}&dateTo={date}");
        Assert.Null(Assert.Single(ownDay!).QuotedPriceCents);
        var customerForOperation = await barberClient.GetFromJsonAsync<Customer[]>($"/api/v1/customers?query={suffix}");
        Assert.Equal(2, customerForOperation!.Length);
        Assert.All(customerForOperation, x => Assert.Null(x.Notes));
        using var historyForbidden = await barberClient.GetAsync($"/api/v1/appointments/{appointment.Id}/events");
        Assert.Equal(HttpStatusCode.Forbidden, historyForbidden.StatusCode);
        using var forbidden = await SendAsync(barberClient, HttpMethod.Post, $"/api/v1/appointments/{appointment.Id}/cancel", new { version = appointment.Version, reason = "No permitido" });
        Assert.Equal(HttpStatusCode.Forbidden, forbidden.StatusCode);
        using var outsiderClient = fixture.CreateClient();
        await LoginAsync(outsiderClient, outsider.UserName, "Agenda-test!8426");
        using var foreignRead = await outsiderClient.GetAsync($"/api/v1/appointments/{appointment.Id}");
        Assert.Equal(HttpStatusCode.Forbidden, foreignRead.StatusCode);
        using var cancelled = await SendAsync(owner, HttpMethod.Post, $"/api/v1/appointments/{appointment.Id}/cancel", new { version = appointment.Version, reason = "Cliente cancela" });
        Assert.True(cancelled.IsSuccessStatusCode);
        var replacement = await PostAsync<Appointment>(owner, "/api/v1/appointments", new { customerId = customer.Customer.Id, barberId = barber.Id, serviceId = service.Id, startsAt = $"{date}T10:00:00-04:00" });
        var arrived = await PostAsync<Appointment>(barberClient, $"/api/v1/appointments/{replacement.Id}/check-in", new { version = replacement.Version });
        var started = await PostAsync<Appointment>(barberClient, $"/api/v1/appointments/{replacement.Id}/start", new { version = arrived.Version });
        Assert.Equal("IN_SERVICE", started.Status);
        using var invalidCancel = await SendAsync(owner, HttpMethod.Post, $"/api/v1/appointments/{replacement.Id}/cancel", new { version = started.Version, reason = "No se permite" });
        Assert.Equal(HttpStatusCode.Conflict, invalidCancel.StatusCode);

        // Arrange a past confirmed appointment to exercise no-show without changing the production clock.
        var absent = await PostAsync<Appointment>(owner, "/api/v1/appointments", new { customerId = customer.Customer.Id, barberId = barber.Id, serviceId = service.Id, startsAt = $"{date}T13:00:00-04:00" });
        await using (var scope = fixture.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var past = DateTimeOffset.UtcNow.AddDays(-1);
            await db.Database.ExecuteSqlInterpolatedAsync($"UPDATE lou.appointments SET starts_at = {past}, ends_at = {past.AddHours(1)} WHERE id = {absent.Id}");
        }
        absent = (await owner.GetFromJsonAsync<Appointment>($"/api/v1/appointments/{absent.Id}"))!;
        var noShow = await PostAsync<Appointment>(owner, $"/api/v1/appointments/{absent.Id}/no-show", new { version = absent.Version, reason = "Cliente no asistió" });
        Assert.Equal("NO_SHOW", noShow.Status);
        await using (var scope = fixture.Services.CreateAsyncScope())
        {
            var busy = await scope.ServiceProvider.GetRequiredService<ISchedulingStore>().ListBusyAppointmentsAsync([barber.Id], DateTimeOffset.UtcNow.AddDays(-3), DateTimeOffset.UtcNow.AddDays(4), CancellationToken.None);
            Assert.DoesNotContain(busy, x => x.AppointmentId == absent.Id || x.AppointmentId == appointment.Id);
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            Assert.Single(await db.AppointmentEvents.Where(x => x.AppointmentId == absent.Id && x.Action == "NO_SHOW").ToArrayAsync());
        }
        await using (var scope = fixture.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var start = DateTimeOffset.Parse($"{date}T10:00:00-04:00", System.Globalization.CultureInfo.InvariantCulture);
            var duplicateAppointment = LouBarbershop.Domain.Appointments.Appointment.Create(Guid.NewGuid(), customer.Customer.Id, barber.Id, service.Id,
                LouBarbershop.Domain.Scheduling.TimeRange.Create(start, start.AddHours(1)).Value,
                LouBarbershop.Domain.Finance.Money.Create(7000).Value, 60, LouBarbershop.Domain.Appointments.AppointmentSource.Internal, user.Id, DateTimeOffset.UtcNow).Value;
            db.Appointments.Add(duplicateAppointment);
            var exclusion = await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync());
            Assert.Equal("ex_appointments_no_overlap", Assert.IsType<Npgsql.PostgresException>(exclusion.InnerException).ConstraintName);
        }
    }

    private static async Task LoginAsync(HttpClient client, string userName, string password)
    {
        using var response = await SendAsync(client, HttpMethod.Post, "/api/v1/auth/login", new { userName, password });
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }
    private static async Task<T> PostAsync<T>(HttpClient client, string path, object body)
    {
        using var response = await SendAsync(client, HttpMethod.Post, path, body);
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());
        return (await response.Content.ReadFromJsonAsync<T>())!;
    }
    private static async Task<HttpResponseMessage> SendAsync(HttpClient client, HttpMethod method, string path, object body)
    {
        var token = await client.GetFromJsonAsync<Token>("/api/v1/auth/antiforgery");
        using var request = new HttpRequestMessage(method, path) { Content = JsonContent.Create(body) };
        request.Headers.Add("X-CSRF-TOKEN", token!.Value);
        return await client.SendAsync(request);
    }
    private sealed record Token([property: System.Text.Json.Serialization.JsonPropertyName("token")] string Value);
    private sealed record IdResponse(Guid Id);
    private sealed record User(Guid Id, string UserName);
    private sealed record Service(Guid Id, string Name, uint Version);
    private sealed record Customer(Guid Id, string Phone, string? Notes, uint Version);
    private sealed record CustomerChange(Customer Customer, Customer[] PossibleDuplicates);
    private sealed record Appointment(Guid Id, uint Version, string Status, long? QuotedPriceCents, int QuotedDurationMinutes);
    private sealed record Snapshot(long PriceCents);
    private sealed record Alternative(DateTimeOffset StartsAt);
    private sealed record Event(string Action, Guid ActorId, Snapshot? Before, Snapshot After);
}

// An independent host keeps this workflow from consuming the authentication suite's rate-limit window.
[CollectionDefinition("agenda-api", DisableParallelization = true)]
public sealed class AgendaApiTestGroup : ICollectionFixture<IdentityApiFixture>;
