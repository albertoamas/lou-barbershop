using LouBarbershop.Application.Abstractions;
using LouBarbershop.Application.Scheduling;
using LouBarbershop.Domain.Appointments;
using LouBarbershop.Domain.Finance;
using LouBarbershop.Domain.Scheduling;

namespace LouBarbershop.Application.Agenda;

public sealed class AgendaService(IAgendaStore store, SchedulingService availability, ICurrentActor actor, IClock clock, IIdGenerator ids)
{
    private static readonly TimeZoneInfo BusinessZone = TimeZoneInfo.FindSystemTimeZoneById("America/La_Paz");
    private bool CanManage => actor.IsInRole("OWNER") || actor.IsInRole("ADMIN");

    public async Task<AgendaResult<IReadOnlyCollection<AppointmentView>>> ListAsync(DateOnly from, DateOnly to, Guid? barberId, CancellationToken ct)
    {
        if (to < from || to.DayNumber - from.DayNumber > 30 || to == DateOnly.MaxValue)
            return new(AgendaStatus.Invalid, Code: "agenda.invalid_range", Message: "Consulta entre 1 y 31 días.");
        if (!CanManage)
        {
            var ownBarber = actor.UserId.HasValue ? await store.FindOwnBarberAsync(actor.UserId.Value, ct) : null;
            if (!actor.IsInRole("BARBER") || !ownBarber.HasValue || (barberId.HasValue && barberId != ownBarber)) return new(AgendaStatus.Forbidden);
            barberId = ownBarber;
        }
        var rows = await store.ListAsync(AtMidnight(from), AtMidnight(to.AddDays(1)), barberId, ct);
        return new(AgendaStatus.Success, rows.Select(Redact).ToArray());
    }

    public async Task<AgendaResult<AppointmentView>> ReadAsync(Guid id, CancellationToken ct)
    {
        var row = await store.ReadAsync(id, ct);
        if (row is null) return new(AgendaStatus.NotFound);
        if (!await CanAccessAsync(row.BarberId, ct)) return new(AgendaStatus.Forbidden);
        return new(AgendaStatus.Success, Redact(row));
    }

    public async Task<AgendaResult<IReadOnlyCollection<AgendaEvent>>> HistoryAsync(Guid id, CancellationToken ct)
    {
        if (!CanManage) return new(AgendaStatus.Forbidden);
        if (await store.FindAsync(id, ct) is null) return new(AgendaStatus.NotFound);
        return new(AgendaStatus.Success, await store.HistoryAsync(id, ct));
    }

    public async Task<AgendaResult<AppointmentView>> CreateAsync(AppointmentInput input, CancellationToken ct)
    {
        if (!CanManage || !actor.UserId.HasValue) return new(AgendaStatus.Forbidden);
        await using var transaction = await store.BeginAsync(ct);
        if (await store.FindCustomerAsync(input.CustomerId, ct) is null) return new(AgendaStatus.NotFound);
        var slot = await FindSlotAsync(input.BarberId, input.ServiceId, input.StartsAt, null, ct);
        if (slot is null) return SlotTaken();
        var created = Appointment.Create(ids.Create(), input.CustomerId, input.BarberId, input.ServiceId,
            TimeRange.Create(slot.StartsAt, slot.EndsAt).Value, Money.Create(slot.PriceCents).Value, slot.DurationMinutes,
            AppointmentSource.Internal, actor.UserId.Value, clock.UtcNow);
        if (!created.IsSuccess) return new(AgendaStatus.Invalid, Code: created.Error!.Code, Message: created.Error.Message);
        store.Add(created.Value);
        Record(created.Value, "CREATED", null, null);
        await store.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return await ReadAsync(created.Value.Id, ct);
    }

    public async Task<AgendaResult<AppointmentView>> RescheduleAsync(Guid id, RescheduleInput input, CancellationToken ct)
    {
        if (!CanManage) return new(AgendaStatus.Forbidden);
        if (!ValidReason(input.Reason)) return ReasonRequired();
        await using var transaction = await store.BeginAsync(ct);
        var appointment = await store.FindAsync(id, ct);
        if (appointment is null) return new(AgendaStatus.NotFound);
        if (appointment.Version != input.Version) return VersionConflict();
        if (appointment.Status != AppointmentStatus.Confirmed) return InvalidState();
        var slot = await FindSlotAsync(input.BarberId, input.ServiceId, input.StartsAt, id, ct);
        if (slot is null) return SlotTaken();
        var before = Snapshot(appointment);
        var changed = appointment.Reschedule(input.BarberId, input.ServiceId, TimeRange.Create(slot.StartsAt, slot.EndsAt).Value, Money.Create(slot.PriceCents).Value, slot.DurationMinutes, clock.UtcNow);
        if (!changed.IsSuccess) return InvalidState();
        Record(appointment, "RESCHEDULED", input.Reason.Trim(), before);
        await store.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return await ReadAsync(id, ct);
    }

    public async Task<AgendaResult<AppointmentView>> TransitionAsync(Guid id, AppointmentStatus next, uint version, string? reason, CancellationToken ct)
    {
        if (next is not (AppointmentStatus.Cancelled or AppointmentStatus.NoShow or AppointmentStatus.CheckedIn or AppointmentStatus.InService)) return InvalidState();
        if (next is AppointmentStatus.Cancelled or AppointmentStatus.NoShow)
        {
            if (!CanManage) return new(AgendaStatus.Forbidden);
            if (!ValidReason(reason)) return ReasonRequired();
        }
        await using var transaction = await store.BeginAsync(ct);
        var appointment = await store.FindAsync(id, ct);
        if (appointment is null) return new(AgendaStatus.NotFound);
        if (!await CanAccessAsync(appointment.BarberId, ct)) return new(AgendaStatus.Forbidden);
        if (appointment.Version != version) return VersionConflict();
        if (next == AppointmentStatus.NoShow && clock.UtcNow < appointment.Range.StartsAt)
            return new(AgendaStatus.Invalid, Code: "agenda.too_early", Message: "No puede marcar inasistencia antes del inicio previsto.");
        var before = Snapshot(appointment);
        var changed = appointment.TransitionTo(next, clock.UtcNow);
        if (!changed.IsSuccess) return InvalidState();
        Record(appointment, next switch { AppointmentStatus.CheckedIn => "CHECKED_IN", AppointmentStatus.InService => "IN_SERVICE", AppointmentStatus.NoShow => "NO_SHOW", _ => next.ToString().ToUpperInvariant() }, reason?.Trim(), before);
        await store.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return await ReadAsync(id, ct);
    }

    public async Task<AgendaResult<IReadOnlyCollection<AvailabilityOption>>> AlternativesAsync(Guid id, Guid serviceId, Guid? barberId, DateOnly date, CancellationToken ct)
    {
        if (!CanManage) return new(AgendaStatus.Forbidden);
        var appointment = await store.FindAsync(id, ct);
        if (appointment is null) return new(AgendaStatus.NotFound);
        if (appointment.Status != AppointmentStatus.Confirmed) return new(AgendaStatus.Conflict, Code: "INVALID_STATE", Message: "Solo se reprograman citas confirmadas.");
        var result = await availability.SearchAvailabilityAsync(serviceId, barberId, date, date, ct, id);
        return result.Value is null
            ? new(AgendaStatus.Invalid, Code: "agenda.invalid_search", Message: "Revisa fecha, servicio y barbero.")
            : new(AgendaStatus.Success, result.Value);
    }

    private async Task<AvailabilityOption?> FindSlotAsync(Guid barberId, Guid serviceId, DateTimeOffset startsAt, Guid? exceptId, CancellationToken ct)
    {
        var date = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(startsAt, BusinessZone).DateTime);
        var result = await availability.SearchAvailabilityAsync(serviceId, barberId, date, date, ct, exceptId);
        return result.Value?.SingleOrDefault(x => x.BarberId == barberId && x.StartsAt == startsAt);
    }

    private async Task<bool> CanAccessAsync(Guid barberId, CancellationToken ct) => CanManage ||
        (actor.IsInRole("BARBER") && actor.UserId.HasValue && await store.FindOwnBarberAsync(actor.UserId.Value, ct) == barberId);
    private AppointmentView Redact(AppointmentView row) => CanManage ? row : row with { QuotedPriceCents = null };
    private void Record(Appointment appointment, string action, string? reason, AppointmentSnapshot? before) => store.Add(new AgendaEvent(ids.Create(), appointment.Id, actor.UserId!.Value, clock.UtcNow, action, reason, before, Snapshot(appointment)));
    private static AppointmentSnapshot Snapshot(Appointment value) => new(value.BarberId, value.ServiceId, value.Range.StartsAt, value.Range.EndsAt, value.Status, value.QuotedPrice.Cents, value.QuotedDurationMinutes);
    private static DateTimeOffset AtMidnight(DateOnly date) => new DateTimeOffset(TimeZoneInfo.ConvertTimeToUtc(date.ToDateTime(TimeOnly.MinValue, DateTimeKind.Unspecified), BusinessZone));
    private static bool ValidReason(string? reason) => !string.IsNullOrWhiteSpace(reason) && reason.Trim().Length <= 300;
    private static AgendaResult<AppointmentView> ReasonRequired() => new(AgendaStatus.Invalid, Code: "agenda.reason_required", Message: "Escribe un motivo de hasta 300 caracteres.");
    private static AgendaResult<AppointmentView> SlotTaken() => new(AgendaStatus.Conflict, Code: "SLOT_TAKEN", Message: "El horario ya no está disponible. Consulta otra alternativa.");
    private static AgendaResult<AppointmentView> VersionConflict() => new(AgendaStatus.Conflict, Code: "VERSION_CONFLICT", Message: "La cita cambió. Recarga antes de continuar.");
    private static AgendaResult<AppointmentView> InvalidState() => new(AgendaStatus.Conflict, Code: "INVALID_STATE", Message: "El estado actual no permite esta acción.");
}
