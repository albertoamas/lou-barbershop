using LouBarbershop.Domain.Scheduling;

namespace LouBarbershop.Application.Scheduling;

public enum SchedulingStatus { Success, Validation, NotFound, Conflict }

public sealed record SchedulingResult<T>(SchedulingStatus Status, T? Value = default, string? Code = null, string? Message = null, IReadOnlyCollection<AppointmentConflict>? Conflicts = null);
public sealed record AppointmentConflict(Guid AppointmentId, DateTimeOffset StartsAt, DateTimeOffset EndsAt);
public sealed record ScheduleInput(int Weekday, TimeOnly StartLocalTime, TimeOnly EndLocalTime, DateOnly ValidFrom, DateOnly? ValidTo);
public sealed record ScheduleUpdate(int Weekday, TimeOnly StartLocalTime, TimeOnly EndLocalTime, DateOnly ValidFrom, DateOnly? ValidTo, bool Active, uint Version);
public sealed record AvailabilityExceptionInput(DateTimeOffset StartsAt, DateTimeOffset EndsAt, AvailabilityExceptionKind Kind, string Reason);
public sealed record BarberAvailability(Guid Id, string DisplayName, string? Color);
public sealed record AvailabilityOption(Guid BarberId, string BarberName, Guid ServiceId, DateTimeOffset StartsAt, DateTimeOffset EndsAt, int DurationMinutes, long PriceCents);

public static class SchedulingResults
{
    public static SchedulingResult<T> Success<T>(T value, IReadOnlyCollection<AppointmentConflict>? conflicts = null) => new(SchedulingStatus.Success, value, Conflicts: conflicts ?? []);
    public static SchedulingResult<T> Invalid<T>(string code, string message) => new(SchedulingStatus.Validation, default, code, message);
    public static SchedulingResult<T> Missing<T>() => new(SchedulingStatus.NotFound);
    public static SchedulingResult<T> Conflict<T>(string code, string message) => new(SchedulingStatus.Conflict, default, code, message);
}
