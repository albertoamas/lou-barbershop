using LouBarbershop.Application.Abstractions;
using LouBarbershop.Application.Configuration;
using LouBarbershop.Domain.Common;
using LouBarbershop.Domain.Scheduling;

namespace LouBarbershop.Application.Scheduling;

public sealed class SchedulingService(ISchedulingStore store, IConfigurationStore configuration, IClock clock, IIdGenerator ids, ICurrentActor actor)
{
    private const int MaximumSearchDays = 31;
    private static readonly TimeZoneInfo BusinessTimeZone = TimeZoneInfo.FindSystemTimeZoneById("America/La_Paz");

    public Task<IReadOnlyCollection<WorkingSchedule>> ListSchedulesAsync(Guid barberId, CancellationToken ct) => store.ListSchedulesAsync(barberId, ct);
    public Task<IReadOnlyCollection<AvailabilityExceptionRule>> ListExceptionsAsync(Guid barberId, CancellationToken ct) => store.ListExceptionsAsync(barberId, ct);

    public async Task<IReadOnlyCollection<BarberAvailability>> ListAvailableBarbersAsync(CancellationToken ct)
    {
        var staff = (await configuration.ListStaffAsync(ct)).Where(x => x.Active).ToDictionary(x => x.Id);
        return (await configuration.ListBarbersAsync(ct))
            .Where(x => x.Active && staff.ContainsKey(x.StaffProfileId))
            .Select(x => new BarberAvailability(x.Id, staff[x.StaffProfileId].DisplayName, x.Color))
            .OrderBy(x => x.DisplayName)
            .ToArray();
    }

    public async Task<SchedulingResult<WorkingSchedule>> CreateScheduleAsync(Guid barberId, ScheduleInput input, CancellationToken ct)
    {
        var barber = await configuration.FindBarberAsync(barberId, ct);
        if (barber is null || !barber.Active) return SchedulingResults.Missing<WorkingSchedule>();
        var period = EffectivePeriod.Create(input.ValidFrom, input.ValidTo);
        if (!period.IsSuccess) return Invalid<WorkingSchedule>(period.Error!);
        if (await store.ScheduleOverlapsAsync(barberId, input.Weekday, input.StartLocalTime, input.EndLocalTime, input.ValidFrom, input.ValidTo, null, ct))
            return SchedulingResults.Conflict<WorkingSchedule>("schedule.overlap", "Ya existe un turno activo que se solapa para ese día y vigencia.");
        var created = WorkingSchedule.Create(ids.Create(), barberId, input.Weekday, input.StartLocalTime, input.EndLocalTime, period.Value, clock.UtcNow);
        if (!created.IsSuccess) return Invalid<WorkingSchedule>(created.Error!);
        store.Add(created.Value);
        await store.SaveChangesAsync(ct);
        return SchedulingResults.Success(created.Value);
    }

    public async Task<SchedulingResult<WorkingSchedule>> UpdateScheduleAsync(Guid barberId, Guid id, ScheduleUpdate input, CancellationToken ct)
    {
        var schedule = await store.FindScheduleAsync(id, ct);
        if (schedule is null || schedule.BarberId != barberId) return SchedulingResults.Missing<WorkingSchedule>();
        if (schedule.Version != input.Version) return VersionConflict<WorkingSchedule>();
        var period = EffectivePeriod.Create(input.ValidFrom, input.ValidTo);
        if (!period.IsSuccess) return Invalid<WorkingSchedule>(period.Error!);
        if (input.Active && await store.ScheduleOverlapsAsync(barberId, input.Weekday, input.StartLocalTime, input.EndLocalTime, input.ValidFrom, input.ValidTo, id, ct))
            return SchedulingResults.Conflict<WorkingSchedule>("schedule.overlap", "Ya existe un turno activo que se solapa para ese día y vigencia.");
        var updated = schedule.Update(input.Weekday, input.StartLocalTime, input.EndLocalTime, period.Value, input.Active, clock.UtcNow);
        if (!updated.IsSuccess) return Invalid<WorkingSchedule>(updated.Error!);
        await store.SaveChangesAsync(ct);
        return SchedulingResults.Success(schedule, await FindConflictsAsync(barberId, input.ValidFrom, input.ValidTo, ct));
    }

    public async Task<SchedulingResult<AvailabilityExceptionRule>> CreateExceptionAsync(Guid barberId, AvailabilityExceptionInput input, CancellationToken ct)
    {
        var barber = await configuration.FindBarberAsync(barberId, ct);
        if (barber is null || !barber.Active) return SchedulingResults.Missing<AvailabilityExceptionRule>();
        if (actor.UserId is not Guid actorId) return SchedulingResults.Invalid<AvailabilityExceptionRule>("actor.required", "Se requiere un actor autenticado.");
        var range = TimeRange.Create(input.StartsAt, input.EndsAt);
        if (!range.IsSuccess) return Invalid<AvailabilityExceptionRule>(range.Error!);
        var created = AvailabilityExceptionRule.Create(ids.Create(), barberId, range.Value, input.Kind, input.Reason, actorId, clock.UtcNow);
        if (!created.IsSuccess) return Invalid<AvailabilityExceptionRule>(created.Error!);
        store.Add(created.Value);
        await store.SaveChangesAsync(ct);
        var conflicts = input.Kind is AvailabilityExceptionKind.Unavailable
            ? (await store.ListBusyAppointmentsAsync([barberId], range.Value.StartsAt, range.Value.EndsAt, ct)).Select(ToConflict).ToArray()
            : [];
        return SchedulingResults.Success(created.Value, conflicts);
    }

    public async Task<SchedulingResult<AvailabilityExceptionRule>> DeactivateExceptionAsync(Guid barberId, Guid id, uint version, CancellationToken ct)
    {
        var exception = await store.FindExceptionAsync(id, ct);
        if (exception is null || exception.BarberId != barberId) return SchedulingResults.Missing<AvailabilityExceptionRule>();
        if (exception.Version != version) return VersionConflict<AvailabilityExceptionRule>();
        exception.Deactivate(clock.UtcNow);
        await store.SaveChangesAsync(ct);
        var localStartDate = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(exception.Range.StartsAt, BusinessTimeZone).DateTime);
        var localEndDate = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(exception.Range.EndsAt.AddTicks(-1), BusinessTimeZone).DateTime);
        return SchedulingResults.Success(exception, await FindConflictsAsync(barberId, localStartDate, localEndDate, ct));
    }

    public async Task<SchedulingResult<IReadOnlyCollection<AvailabilityOption>>> SearchAvailabilityAsync(Guid serviceId, Guid? barberId, DateOnly dateFrom, DateOnly dateTo, CancellationToken ct)
    {
        if (dateTo < dateFrom || dateTo.DayNumber - dateFrom.DayNumber + 1 > MaximumSearchDays)
            return SchedulingResults.Invalid<IReadOnlyCollection<AvailabilityOption>>("availability.invalid_range", "El rango debe tener entre 1 y 31 días.");
        var service = await configuration.FindServiceAsync(serviceId, ct);
        if (service is null || !service.Active) return SchedulingResults.Missing<IReadOnlyCollection<AvailabilityOption>>();
        var barbers = (await configuration.ListBarbersAsync(ct)).Where(x => x.Active && (!barberId.HasValue || x.Id == barberId)).ToArray();
        if (barberId.HasValue && barbers.Length == 0) return SchedulingResults.Missing<IReadOnlyCollection<AvailabilityOption>>();
        var staff = (await configuration.ListStaffAsync(ct)).Where(x => x.Active).ToDictionary(x => x.Id);
        var names = barbers.ToDictionary(x => x.Id, x => staff.GetValueOrDefault(x.StaffProfileId)?.DisplayName ?? "Barbero");
        var schedules = new List<WorkingSchedule>();
        var exceptions = new List<AvailabilityExceptionRule>();
        var terms = new List<AvailabilityTerms>();
        foreach (var barber in barbers)
        {
            schedules.AddRange(await store.ListSchedulesAsync(barber.Id, ct));
            exceptions.AddRange(await store.ListExceptionsAsync(barber.Id, ct));
            var offerings = await configuration.ListOfferingsAsync(barber.Id, ct);
            for (var date = dateFrom; date <= dateTo; date = date.AddDays(1))
            {
                var offer = offerings.SingleOrDefault(x => x.Active && x.ServiceId == serviceId && x.Period.Contains(date));
                terms.Add(new AvailabilityTerms(barber.Id, serviceId, date, offer?.DurationMinutes ?? service.DefaultDurationMinutes, offer?.Price ?? service.DefaultPrice));
            }
        }
        var dayStart = ToUtc(dateFrom, TimeOnly.MinValue);
        var dayEnd = ToUtc(dateTo.AddDays(1), TimeOnly.MinValue);
        var busy = await store.ListBusyAppointmentsAsync(barbers.Select(x => x.Id).ToArray(), dayStart, dayEnd, ct);
        var slots = AvailabilityEngine.Calculate(dateFrom, dateTo, clock.UtcNow, BusinessTimeZone, terms, schedules, exceptions, busy);
        return SchedulingResults.Success<IReadOnlyCollection<AvailabilityOption>>(slots.Select(x => new AvailabilityOption(x.BarberId, names[x.BarberId], x.ServiceId, x.StartsAt, x.EndsAt, x.DurationMinutes, x.Price.Cents)).ToArray());
    }

    private async Task<IReadOnlyCollection<AppointmentConflict>> FindConflictsAsync(Guid barberId, DateOnly validFrom, DateOnly? validTo, CancellationToken ct)
    {
        var from = ToUtc(validFrom, TimeOnly.MinValue);
        var cappedTo = validTo ?? new DateOnly(9999, 12, 30);
        var to = ToUtc(cappedTo.AddDays(1), TimeOnly.MinValue);
        var appointments = await store.ListBusyAppointmentsAsync([barberId], from, to, ct);
        var schedules = await store.ListSchedulesAsync(barberId, ct);
        var exceptions = await store.ListExceptionsAsync(barberId, ct);
        return appointments.Where(x => !AvailabilityEngine.IsCovered(x.Range, barberId, BusinessTimeZone, schedules, exceptions)).Select(ToConflict).ToArray();
    }

    private static DateTimeOffset ToUtc(DateOnly date, TimeOnly time)
    {
        var localDateTime = date.ToDateTime(time, DateTimeKind.Unspecified);
        return new DateTimeOffset(localDateTime, BusinessTimeZone.GetUtcOffset(localDateTime)).ToUniversalTime();
    }
    private static AppointmentConflict ToConflict(BusyAppointment appointment) => new(appointment.AppointmentId, appointment.Range.StartsAt, appointment.Range.EndsAt);
    private static SchedulingResult<T> Invalid<T>(DomainError error) => SchedulingResults.Invalid<T>(error.Code, error.Message);
    private static SchedulingResult<T> VersionConflict<T>() => SchedulingResults.Conflict<T>("version.conflict", "El registro cambió; recargue antes de guardar.");
}
