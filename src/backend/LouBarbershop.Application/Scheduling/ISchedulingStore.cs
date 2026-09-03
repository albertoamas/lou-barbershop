using LouBarbershop.Domain.Scheduling;

namespace LouBarbershop.Application.Scheduling;

public interface ISchedulingStore
{
    Task<IReadOnlyCollection<WorkingSchedule>> ListSchedulesAsync(Guid barberId, CancellationToken ct);
    Task<WorkingSchedule?> FindScheduleAsync(Guid id, CancellationToken ct);
    Task<bool> ScheduleOverlapsAsync(Guid barberId, int weekday, TimeOnly startsAt, TimeOnly endsAt, DateOnly validFrom, DateOnly? validTo, Guid? exceptId, CancellationToken ct);
    void Add(WorkingSchedule schedule);

    Task<IReadOnlyCollection<AvailabilityExceptionRule>> ListExceptionsAsync(Guid barberId, CancellationToken ct);
    Task<AvailabilityExceptionRule?> FindExceptionAsync(Guid id, CancellationToken ct);
    void Add(AvailabilityExceptionRule exception);

    Task<IReadOnlyCollection<BusyAppointment>> ListBusyAppointmentsAsync(IReadOnlyCollection<Guid> barberIds, DateTimeOffset startsAt, DateTimeOffset endsAt, CancellationToken ct);
    Task SaveChangesAsync(CancellationToken ct);
}
