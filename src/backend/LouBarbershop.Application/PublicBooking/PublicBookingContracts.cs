using LouBarbershop.Domain.Appointments;

namespace LouBarbershop.Application.PublicBooking;

public enum PublicBookingStatus { Success, Invalid, NotFound, Conflict }

public sealed record PublicBookingResult<T>(PublicBookingStatus Status, T? Value = default, string? Code = null, string? Message = null);
public sealed record PublicServiceOption(Guid Id, string Name, string? Description, int DurationMinutes, long PriceCents);
public sealed record PublicBarberOption(Guid Id, string DisplayName);
public sealed record PublicCatalog(IReadOnlyCollection<PublicServiceOption> Services, IReadOnlyCollection<PublicBarberOption> Barbers);
public sealed record PublicAppointmentInput(Guid ServiceId, Guid BarberId, DateTimeOffset StartsAt, string DisplayName, string Phone, bool PrivacyAccepted);
public sealed record PublicRescheduleInput(Guid ServiceId, Guid BarberId, DateTimeOffset StartsAt, uint Version);
public sealed record PublicAppointmentView(Guid Id, string CustomerName, Guid ServiceId, string ServiceName, Guid BarberId, string BarberName, DateTimeOffset StartsAt, DateTimeOffset EndsAt, AppointmentStatus Status, long PriceCents, int DurationMinutes, uint Version);
public sealed record PublicBookingConfirmation(PublicAppointmentView Appointment, string ManagementToken, string ManagementPath);
public sealed record ManagementToken(string PlainText, string Hash);

public interface IPublicManagementTokenService
{
    ManagementToken Issue();
    string? Hash(string? plainText);
}
