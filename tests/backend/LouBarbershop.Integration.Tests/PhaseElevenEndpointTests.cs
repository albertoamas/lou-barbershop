using System.Net;
using System.Net.Http.Json;
using LouBarbershop.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace LouBarbershop.Integration.Tests;

[Collection("agenda-api")]
public sealed class PhaseElevenEndpointTests(IdentityApiFixture fixture)
{
    private static readonly string[] BarberRoles = ["BARBER"];

    [Fact]
    public async Task PublicClientBooksManagesAndCancelsWithRotatedHashedTokenAndRateLimit()
    {
        using var owner = fixture.CreateClient();
        await LoginAsync(owner, IdentityApiFixture.OwnerUserName, IdentityApiFixture.OwnerPassword);
        var suffix = Guid.NewGuid().ToString("N");
        var user = await PostAsync<User>(owner, "/api/v1/users", new { userName = $"public-{suffix}", password = "Public-test!8426", roles = BarberRoles });
        var staff = await PostAsync<IdResponse>(owner, "/api/v1/staff", new { userId = user.Id, displayName = "Barbero público" });
        var barber = await PostAsync<IdResponse>(owner, "/api/v1/barbers", new { staffProfileId = staff.Id, employmentType = "CONTRACTOR", settlementFrequency = "BIWEEKLY" });
        var service = await PostAsync<IdResponse>(owner, "/api/v1/services", new { name = $"Corte público {suffix}", defaultDurationMinutes = 60, defaultPriceCents = 5_000 });
        var tomorrow = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(-4).AddDays(2));
        var date = tomorrow.ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);
        await PostAsync<object>(owner, $"/api/v1/barbers/{barber.Id}/schedules", new
        {
            weekday = ((int)tomorrow.DayOfWeek + 6) % 7 + 1,
            startLocalTime = "09:00",
            endLocalTime = "12:00",
            validFrom = date,
            validTo = date,
        });

        using var firstClient = fixture.CreateClient();
        using var secondClient = fixture.CreateClient();
        var catalog = await firstClient.GetFromJsonAsync<Catalog>("/api/v1/public/catalog");
        Assert.Contains(catalog!.Services, x => x.Id == service.Id);
        Assert.Contains(catalog.Barbers, x => x.Id == barber.Id);
        var availability = await firstClient.GetFromJsonAsync<Slot[]>($"/api/v1/public/availability?serviceId={service.Id}&barberId=any&dateFrom={date}&dateTo={date}");
        var firstSlot = Assert.Single(availability!, x => x.BarberId == barber.Id && x.StartsAt.Hour == 13 && x.StartsAt.Minute == 0); // 09:00 Bolivia in UTC.
        var bookingInput = new
        {
            serviceId = service.Id,
            barberId = firstSlot.BarberId,
            startsAt = firstSlot.StartsAt,
            displayName = "Cliente público",
            phone = "71234567",
            privacyAccepted = true,
        };
        var attempts = await Task.WhenAll(
            SendAsync(firstClient, HttpMethod.Post, "/api/v1/public/appointments", bookingInput),
            SendAsync(secondClient, HttpMethod.Post, "/api/v1/public/appointments", bookingInput));
        PublicConfirmation confirmation;
        try
        {
            var success = Assert.Single(attempts, x => x.StatusCode == HttpStatusCode.Created);
            var conflict = Assert.Single(attempts, x => x.StatusCode == HttpStatusCode.Conflict);
            Assert.Contains("SLOT_TAKEN", await conflict.Content.ReadAsStringAsync(), StringComparison.Ordinal);
            confirmation = (await success.Content.ReadFromJsonAsync<PublicConfirmation>())!;
        }
        finally
        {
            foreach (var response in attempts) response.Dispose();
        }

        Assert.Equal(43, confirmation.ManagementToken.Length);
        Assert.Equal($"/book/manage#{confirmation.ManagementToken}", confirmation.ManagementPath);
        Assert.DoesNotContain("71234567", System.Text.Json.JsonSerializer.Serialize(confirmation), StringComparison.Ordinal);
        await using (var scope = fixture.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var stored = await db.Appointments.AsNoTracking().SingleAsync(x => x.Id == confirmation.Appointment.Id);
            Assert.NotEqual(confirmation.ManagementToken, stored.ManagementTokenHash);
            Assert.Equal(64, stored.ManagementTokenHash!.Length);
            Assert.Null(stored.CreatedBy);
            var createdEvent = await db.AppointmentEvents.AsNoTracking().SingleAsync(x => x.AppointmentId == stored.Id && x.Action == "PUBLIC_CREATED");
            Assert.Null(createdEvent.ActorId);
        }

        using var wrongToken = await ReadAsync(firstClient, new string('x', 43));
        Assert.Equal(HttpStatusCode.NotFound, wrongToken.StatusCode);
        using var current = await ReadAsync(firstClient, confirmation.ManagementToken);
        Assert.Equal(HttpStatusCode.OK, current.StatusCode);

        var nextSlot = Assert.Single(availability!, x => x.BarberId == barber.Id && x.StartsAt.Hour == 14 && x.StartsAt.Minute == 0); // 10:00 Bolivia in UTC.
        using var changedResponse = await SendAsync(firstClient, HttpMethod.Patch, "/api/v1/public/appointments/manage",
            new { serviceId = service.Id, barberId = barber.Id, startsAt = nextSlot.StartsAt, version = confirmation.Appointment.Version }, confirmation.ManagementToken);
        Assert.Equal(HttpStatusCode.OK, changedResponse.StatusCode);
        var changed = (await changedResponse.Content.ReadFromJsonAsync<PublicConfirmation>())!;
        Assert.NotEqual(confirmation.ManagementToken, changed.ManagementToken);
        using var oldLink = await ReadAsync(firstClient, confirmation.ManagementToken);
        Assert.Equal(HttpStatusCode.NotFound, oldLink.StatusCode);
        using var newLink = await ReadAsync(firstClient, changed.ManagementToken);
        Assert.Equal(HttpStatusCode.OK, newLink.StatusCode);

        using var cancelled = await SendAsync(firstClient, HttpMethod.Post, "/api/v1/public/appointments/manage/cancel",
            new { version = changed.Appointment.Version }, changed.ManagementToken);
        Assert.Equal(HttpStatusCode.OK, cancelled.StatusCode);
        Assert.Equal("CANCELLED", (await cancelled.Content.ReadFromJsonAsync<PublicAppointment>())!.Status);
        using var revoked = await ReadAsync(firstClient, changed.ManagementToken);
        Assert.Equal(HttpStatusCode.NotFound, revoked.StatusCode);
        using var noEnumeration = await firstClient.GetAsync("/api/v1/public/appointments");
        Assert.Equal(HttpStatusCode.MethodNotAllowed, noEnumeration.StatusCode);
        using var privateCustomers = await firstClient.GetAsync("/api/v1/customers?query=Cliente");
        Assert.Equal(HttpStatusCode.Unauthorized, privateCustomers.StatusCode);

        HttpStatusCode last = HttpStatusCode.OK;
        for (var index = 0; index < 40 && last != HttpStatusCode.TooManyRequests; index++)
        {
            using var limited = await firstClient.GetAsync("/api/v1/public/catalog");
            last = limited.StatusCode;
        }
        Assert.Equal(HttpStatusCode.TooManyRequests, last);
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
    private static async Task<HttpResponseMessage> ReadAsync(HttpClient client, string managementToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/v1/public/appointments/manage");
        request.Headers.Add("X-Management-Token", managementToken);
        return await client.SendAsync(request);
    }
    private static async Task<HttpResponseMessage> SendAsync(HttpClient client, HttpMethod method, string path, object body, string? managementToken = null)
    {
        var antiforgery = await client.GetFromJsonAsync<Token>("/api/v1/auth/antiforgery");
        using var request = new HttpRequestMessage(method, path) { Content = JsonContent.Create(body) };
        request.Headers.Add("X-CSRF-TOKEN", antiforgery!.Value);
        if (managementToken is not null) request.Headers.Add("X-Management-Token", managementToken);
        return await client.SendAsync(request);
    }

    private sealed record Token([property: System.Text.Json.Serialization.JsonPropertyName("token")] string Value);
    private sealed record IdResponse(Guid Id);
    private sealed record User(Guid Id);
    private sealed record Catalog(IdResponse[] Services, IdResponse[] Barbers);
    private sealed record Slot(Guid BarberId, DateTimeOffset StartsAt);
    private sealed record PublicAppointment(Guid Id, uint Version, string Status);
    private sealed record PublicConfirmation(PublicAppointment Appointment, string ManagementToken, string ManagementPath);
}
