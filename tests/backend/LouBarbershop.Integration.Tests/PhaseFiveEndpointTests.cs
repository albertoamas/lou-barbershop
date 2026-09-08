using System.Diagnostics;
using System.Net;
using System.Net.Http.Json;
using LouBarbershop.Domain.Appointments;
using LouBarbershop.Domain.Customers;
using LouBarbershop.Domain.Finance;
using LouBarbershop.Domain.Scheduling;
using LouBarbershop.Infrastructure.Identity;
using LouBarbershop.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;

namespace LouBarbershop.Integration.Tests;

[Collection("identity-api")]
public sealed class PhaseFiveEndpointTests
{
    private readonly IdentityApiFixture _fixture;
    public PhaseFiveEndpointTests(IdentityApiFixture fixture) => _fixture = fixture;

    [Fact]
    public async Task SchedulesExceptionsAvailabilityPermissionsAndExistingConflictsAreEnforced()
    {
        using var ownerClient = _fixture.CreateClient();
        await LoginAsync(ownerClient, IdentityApiFixture.OwnerUserName, IdentityApiFixture.OwnerPassword);
        var owner = Assert.Single((await ownerClient.GetFromJsonAsync<UserResponse[]>("/api/v1/users"))!, x => x.UserName == IdentityApiFixture.OwnerUserName);
        var suffix = Guid.NewGuid().ToString("N");
        var barberUser = await CreateAsync<UserResponse>(ownerClient, "/api/v1/users", new { userName = $"schedule-barber-{suffix}", password = "Schedule-test!8426", roles = new[] { RoleNames.Barber } });
        var adminUser = await CreateAsync<UserResponse>(ownerClient, "/api/v1/users", new { userName = $"schedule-admin-{suffix}", password = "Schedule-admin!8426", roles = new[] { RoleNames.Admin } });
        var staff = await CreateAsync<StaffResponse>(ownerClient, "/api/v1/staff", new { userId = barberUser.Id, displayName = "Barbero Agenda" });
        var barber = await CreateAsync<BarberResponse>(ownerClient, "/api/v1/barbers", new { staffProfileId = staff.Id, employmentType = "CONTRACTOR", settlementFrequency = "BIWEEKLY", color = "#31523A" });
        var service = await CreateAsync<ServiceResponse>(ownerClient, "/api/v1/services", new { name = $"Agenda {suffix}", defaultDurationMinutes = 45, defaultPriceCents = 5000 });

        var scheduleChange = await CreateAsync<ScheduleChangeResponse>(ownerClient, $"/api/v1/barbers/{barber.Id}/schedules", new { weekday = 1, startLocalTime = "09:00", endLocalTime = "12:00", validFrom = "2026-09-14", validTo = "2026-09-14" });
        Assert.Empty(scheduleChange.Conflicts);
        using var overlap = await SendSecureAsync(ownerClient, HttpMethod.Post, $"/api/v1/barbers/{barber.Id}/schedules", new { weekday = 1, startLocalTime = "11:00", endLocalTime = "13:00", validFrom = "2026-09-14", validTo = "2026-09-14" });
        Assert.Equal(HttpStatusCode.Conflict, overlap.StatusCode);

        var watch = Stopwatch.StartNew();
        var available = await ownerClient.GetFromJsonAsync<AvailabilityResponse[]>($"/api/v1/availability?serviceId={service.Id}&barberId=any&dateFrom=2026-09-14&dateTo=2026-09-14");
        watch.Stop();
        Assert.NotNull(available); Assert.NotEmpty(available); Assert.All(available, x => Assert.Equal(barber.Id, x.BarberId)); Assert.All(available, x => Assert.Equal(45, x.DurationMinutes)); Assert.True(watch.Elapsed < TimeSpan.FromSeconds(3));

        var unavailable = await CreateAsync<ExceptionChangeResponse>(ownerClient, $"/api/v1/barbers/{barber.Id}/availability-exceptions", new { startsAt = "2026-09-14T09:30:00-04:00", endsAt = "2026-09-14T10:30:00-04:00", kind = "UNAVAILABLE", reason = "Ausencia de prueba" });
        Assert.Empty(unavailable.Conflicts);
        await CreateAsync<ExceptionChangeResponse>(ownerClient, $"/api/v1/barbers/{barber.Id}/availability-exceptions", new { startsAt = "2026-09-14T18:00:00-04:00", endsAt = "2026-09-14T19:00:00-04:00", kind = "AVAILABLE_OVERRIDE", reason = "Horario especial" });
        var adjusted = await ownerClient.GetFromJsonAsync<AvailabilityResponse[]>($"/api/v1/availability?serviceId={service.Id}&barberId={barber.Id}&dateFrom=2026-09-14&dateTo=2026-09-14");
        Assert.DoesNotContain(adjusted!, x => LocalTime(x.StartsAt) >= new TimeOnly(9, 0) && LocalTime(x.StartsAt) < new TimeOnly(10, 30));
        Assert.Contains(adjusted!, x => LocalTime(x.StartsAt) == new TimeOnly(18, 0));

        await using (var scope = _fixture.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var customer = Customer.Create(Guid.NewGuid(), "Cliente conflicto", PhoneNumber.Create("+59171234567").Value, null, DateTimeOffset.UtcNow).Value;
            var appointmentRange = TimeRange.Create(new DateTimeOffset(2026, 9, 14, 11, 0, 0, TimeSpan.FromHours(-4)), new DateTimeOffset(2026, 9, 14, 11, 45, 0, TimeSpan.FromHours(-4))).Value;
            var appointment = Appointment.Create(Guid.NewGuid(), customer.Id, barber.Id, service.Id, appointmentRange, Money.Create(5000).Value, 45, AppointmentSource.Internal, owner.Id, DateTimeOffset.UtcNow).Value;
            db.Customers.Add(customer); db.Appointments.Add(appointment); await db.SaveChangesAsync();
        }
        using var deactivate = await SendSecureAsync(ownerClient, HttpMethod.Patch, $"/api/v1/barbers/{barber.Id}/schedules/{scheduleChange.Schedule.Id}", new { weekday = 1, startLocalTime = "09:00", endLocalTime = "12:00", validFrom = "2026-09-14", validTo = "2026-09-14", active = false, version = scheduleChange.Schedule.Version });
        Assert.Equal(HttpStatusCode.OK, deactivate.StatusCode);
        var changed = await deactivate.Content.ReadFromJsonAsync<ScheduleChangeResponse>();
        Assert.Single(changed!.Conflicts);

        using var barberClient = _fixture.CreateClient();
        await LoginAsync(barberClient, barberUser.UserName, "Schedule-test!8426");
        var visibleBarbers = await barberClient.GetFromJsonAsync<BarberAvailabilityResponse[]>("/api/v1/availability/barbers");
        Assert.Contains(visibleBarbers!, x => x.Id == barber.Id && x.DisplayName == "Barbero Agenda");
        using var forbidden = await SendSecureAsync(barberClient, HttpMethod.Post, $"/api/v1/barbers/{barber.Id}/schedules", new { weekday = 2, startLocalTime = "09:00", endLocalTime = "12:00", validFrom = "2026-09-08" });
        Assert.Equal(HttpStatusCode.Forbidden, forbidden.StatusCode);

        using var adminClient = _fixture.CreateClient();
        await LoginAsync(adminClient, adminUser.UserName, "Schedule-admin!8426");
        using var allowed = await SendSecureAsync(adminClient, HttpMethod.Post, $"/api/v1/barbers/{barber.Id}/schedules", new { weekday = 2, startLocalTime = "09:00", endLocalTime = "12:00", validFrom = "2026-09-08" });
        Assert.Equal(HttpStatusCode.OK, allowed.StatusCode);
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
        var token = await client.GetFromJsonAsync<AntiforgeryResponse>("/api/v1/auth/antiforgery");
        using var request = new HttpRequestMessage(method, path); request.Headers.Add("X-CSRF-TOKEN", token!.Token);
        if (body is not null) request.Content = JsonContent.Create(body);
        return await client.SendAsync(request);
    }
    private static TimeOnly LocalTime(DateTimeOffset value) => TimeOnly.FromDateTime(value.ToOffset(TimeSpan.FromHours(-4)).DateTime);
    private sealed record AntiforgeryResponse(string Token);
    private sealed record UserResponse(Guid Id, string UserName);
    private sealed record StaffResponse(Guid Id);
    private sealed record BarberResponse(Guid Id);
    private sealed record ServiceResponse(Guid Id);
    private sealed record ScheduleResponse(Guid Id, uint Version);
    private sealed record ScheduleChangeResponse(ScheduleResponse Schedule, IReadOnlyCollection<AppointmentConflictResponse> Conflicts);
    private sealed record ExceptionChangeResponse(IReadOnlyCollection<AppointmentConflictResponse> Conflicts);
    private sealed record AppointmentConflictResponse(Guid AppointmentId, DateTimeOffset StartsAt, DateTimeOffset EndsAt);
    private sealed record AvailabilityResponse(Guid BarberId, DateTimeOffset StartsAt, DateTimeOffset EndsAt, int DurationMinutes, long PriceCents);
    private sealed record BarberAvailabilityResponse(Guid Id, string DisplayName);
}
