using LouBarbershop.Application.Scheduling;
using LouBarbershop.Domain.Appointments;
using LouBarbershop.Domain.Scheduling;
using Microsoft.EntityFrameworkCore;

namespace LouBarbershop.Infrastructure.Persistence;

public sealed class EfSchedulingStore(AppDbContext dbContext) : ISchedulingStore
{
    public async Task<Guid?> FindOwnBarberAsync(Guid userId, CancellationToken ct) => await
        (from barber in dbContext.BarberProfiles.AsNoTracking()
         join staff in dbContext.StaffProfiles.AsNoTracking() on barber.StaffProfileId equals staff.Id
         where staff.UserId == userId && staff.Active && barber.Active
         select (Guid?)barber.Id).SingleOrDefaultAsync(ct);

    public async Task<IReadOnlyCollection<WorkingSchedule>> ListSchedulesAsync(Guid barberId, CancellationToken ct) => await dbContext.WorkingSchedules.AsNoTracking().Where(x => x.BarberId == barberId).OrderBy(x => x.Weekday).ThenBy(x => x.StartLocalTime).ToArrayAsync(ct);
    public Task<WorkingSchedule?> FindScheduleAsync(Guid id, CancellationToken ct) => dbContext.WorkingSchedules.SingleOrDefaultAsync(x => x.Id == id, ct);
    public Task<bool> ScheduleOverlapsAsync(Guid barberId, int weekday, TimeOnly startsAt, TimeOnly endsAt, DateOnly validFrom, DateOnly? validTo, Guid? exceptId, CancellationToken ct) => dbContext.WorkingSchedules.AnyAsync(x => x.Active && x.BarberId == barberId && x.Weekday == weekday && (!exceptId.HasValue || x.Id != exceptId.Value) && x.StartLocalTime < endsAt && startsAt < x.EndLocalTime && (!x.Period.ValidTo.HasValue || validFrom <= x.Period.ValidTo.Value) && (!validTo.HasValue || x.Period.ValidFrom <= validTo.Value), ct);
    public void Add(WorkingSchedule schedule) => dbContext.WorkingSchedules.Add(schedule);

    public async Task<IReadOnlyCollection<AvailabilityExceptionRule>> ListExceptionsAsync(Guid barberId, CancellationToken ct) => await dbContext.AvailabilityExceptions.AsNoTracking().Where(x => x.BarberId == barberId).OrderBy(x => x.Range.StartsAt).ToArrayAsync(ct);
    public Task<AvailabilityExceptionRule?> FindExceptionAsync(Guid id, CancellationToken ct) => dbContext.AvailabilityExceptions.SingleOrDefaultAsync(x => x.Id == id, ct);
    public void Add(AvailabilityExceptionRule exception) => dbContext.AvailabilityExceptions.Add(exception);

    public async Task<IReadOnlyCollection<BusyAppointment>> ListBusyAppointmentsAsync(IReadOnlyCollection<Guid> barberIds, DateTimeOffset startsAt, DateTimeOffset endsAt, CancellationToken ct) =>
        await dbContext.Appointments.AsNoTracking()
            .Where(x => barberIds.Contains(x.BarberId) && (x.Status == AppointmentStatus.Confirmed || x.Status == AppointmentStatus.CheckedIn || x.Status == AppointmentStatus.InService) && x.Range.StartsAt < endsAt && startsAt < x.Range.EndsAt)
            .Select(x => new BusyAppointment(x.Id, x.BarberId, x.Range))
            .ToArrayAsync(ct);

    public Task SaveChangesAsync(CancellationToken ct) => dbContext.SaveChangesAsync(ct);
}
