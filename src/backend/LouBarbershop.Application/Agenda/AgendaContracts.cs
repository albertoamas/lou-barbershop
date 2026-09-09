using LouBarbershop.Domain.Appointments;

namespace LouBarbershop.Application.Agenda;

public enum AgendaStatus { Success, Invalid, NotFound, Forbidden, Conflict }
public sealed record AgendaResult<T>(AgendaStatus Status, T? Value = default, string? Code = null, string? Message = null);
public sealed record CustomerView(Guid Id, string DisplayName, string Phone, string? Notes, uint Version);
public sealed record CustomerChange(CustomerView Customer, IReadOnlyCollection<CustomerView> PossibleDuplicates);
public sealed record CustomerInput(string DisplayName, string Phone, string? Notes);
public sealed record AppointmentInput(Guid CustomerId, Guid BarberId, Guid ServiceId, DateTimeOffset StartsAt);
public sealed record RescheduleInput(Guid BarberId, Guid ServiceId, DateTimeOffset StartsAt, uint Version, string Reason);
public sealed record AppointmentSnapshot(Guid BarberId, Guid ServiceId, DateTimeOffset StartsAt, DateTimeOffset EndsAt, AppointmentStatus Status, long PriceCents, int DurationMinutes);
public sealed record AppointmentView(Guid Id, Guid CustomerId, string CustomerName, Guid BarberId, string BarberName, Guid ServiceId, string ServiceName, DateTimeOffset StartsAt, DateTimeOffset EndsAt, AppointmentStatus Status, long? QuotedPriceCents, int QuotedDurationMinutes, uint Version);
public sealed record AgendaEvent(Guid Id, Guid AppointmentId, Guid? ActorId, DateTimeOffset OccurredAt, string Action, string? Reason, AppointmentSnapshot? Before, AppointmentSnapshot After);
