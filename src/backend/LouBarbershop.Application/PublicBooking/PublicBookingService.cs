using LouBarbershop.Application.Abstractions;
using LouBarbershop.Application.Agenda;
using LouBarbershop.Application.Configuration;
using LouBarbershop.Application.Scheduling;
using LouBarbershop.Domain.Appointments;
using LouBarbershop.Domain.Customers;
using LouBarbershop.Domain.Scheduling;

namespace LouBarbershop.Application.PublicBooking;

public sealed class PublicBookingService(
    IAgendaStore store,
    IConfigurationStore configuration,
    SchedulingService availability,
    IPublicManagementTokenService tokens,
    IClock clock,
    IIdGenerator ids)
{
    private const int ManagementHoursAfterAppointment = 48;
    private static readonly TimeZoneInfo BusinessZone = TimeZoneInfo.FindSystemTimeZoneById("America/La_Paz");

    public async Task<PublicCatalog> CatalogAsync(CancellationToken ct)
    {
        var services = (await configuration.ListServicesAsync(ct)).Where(x => x.Active)
            .Select(x => new PublicServiceOption(x.Id, x.Name, x.Description, x.DefaultDurationMinutes, x.DefaultPrice.Cents))
            .OrderBy(x => x.Name).ToArray();
        var barbers = (await availability.ListAvailableBarbersAsync(ct))
            .Select(x => new PublicBarberOption(x.Id, x.DisplayName)).ToArray();
        return new PublicCatalog(services, barbers);
    }

    public Task<SchedulingResult<IReadOnlyCollection<AvailabilityOption>>> AvailabilityAsync(
        Guid serviceId, Guid? barberId, DateOnly from, DateOnly to, CancellationToken ct) =>
        availability.SearchAvailabilityAsync(serviceId, barberId, from, to, ct);

    public async Task<PublicBookingResult<PublicBookingConfirmation>> CreateAsync(PublicAppointmentInput input, CancellationToken ct)
    {
        if (!input.PrivacyAccepted)
            return Invalid<PublicBookingConfirmation>("booking.privacy_required", "Acepta el uso de nombre y teléfono para gestionar la cita.");
        var displayName = input.DisplayName?.Trim() ?? string.Empty;
        if (displayName.Length is < 2 or > 120)
            return Invalid<PublicBookingConfirmation>("booking.invalid_name", "Escribe un nombre de 2 a 120 caracteres.");
        var phone = CustomerService.NormalizePhone(input.Phone);
        if (!phone.IsSuccess)
            return Invalid<PublicBookingConfirmation>(phone.Error!.Code, phone.Error.Message);

        await using var transaction = await store.BeginAsync(ct);
        var slot = await FindSlotAsync(input.BarberId, input.ServiceId, input.StartsAt, null, ct);
        if (slot is null) return SlotTaken<PublicBookingConfirmation>();
        var customer = await store.FindCustomerByIdentityAsync(displayName, phone.Value, ct);
        if (customer is null)
        {
            var createdCustomer = Customer.Create(ids.Create(), displayName, phone.Value, null, clock.UtcNow);
            if (!createdCustomer.IsSuccess)
                return Invalid<PublicBookingConfirmation>(createdCustomer.Error!.Code, createdCustomer.Error.Message);
            customer = createdCustomer.Value;
            store.Add(customer);
        }

        var appointment = Appointment.Create(ids.Create(), customer.Id, input.BarberId, input.ServiceId,
            TimeRange.Create(slot.StartsAt, slot.EndsAt).Value, LouBarbershop.Domain.Finance.Money.Create(slot.PriceCents).Value,
            slot.DurationMinutes, AppointmentSource.Public, null, clock.UtcNow);
        if (!appointment.IsSuccess)
            return Invalid<PublicBookingConfirmation>(appointment.Error!.Code, appointment.Error.Message);
        var management = tokens.Issue();
        var secured = appointment.Value.SetManagementToken(management.Hash, slot.EndsAt.AddHours(ManagementHoursAfterAppointment), clock.UtcNow);
        if (!secured.IsSuccess)
            return Invalid<PublicBookingConfirmation>(secured.Error!.Code, secured.Error.Message);
        store.Add(appointment.Value);
        Record(appointment.Value, "PUBLIC_CREATED", null);
        await store.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        var view = await MapAsync(appointment.Value, displayName, ct);
        return new(PublicBookingStatus.Success, new(view, management.PlainText, "/mi-cita#" + management.PlainText));
    }

    public async Task<PublicBookingResult<PublicAppointmentView>> ReadAsync(string? token, CancellationToken ct)
    {
        var appointment = await FindManagedAsync(token, ct);
        if (appointment is null) return Missing<PublicAppointmentView>();
        return new(PublicBookingStatus.Success, await MapAsync(appointment, null, ct));
    }

    public async Task<PublicBookingResult<PublicBookingConfirmation>> RescheduleAsync(string? token, PublicRescheduleInput input, CancellationToken ct)
    {
        await using var transaction = await store.BeginAsync(ct);
        var appointment = await FindManagedAsync(token, ct);
        if (appointment is null) return Missing<PublicBookingConfirmation>();
        if (appointment.Version != input.Version) return Conflict<PublicBookingConfirmation>("VERSION_CONFLICT", "La cita cambió. Vuelve a cargar el enlace.");
        if (appointment.Status != AppointmentStatus.Confirmed) return Conflict<PublicBookingConfirmation>("INVALID_STATE", "La cita ya no puede reprogramarse.");
        var slot = await FindSlotAsync(input.BarberId, input.ServiceId, input.StartsAt, appointment.Id, ct);
        if (slot is null) return SlotTaken<PublicBookingConfirmation>();
        var before = Snapshot(appointment);
        var changed = appointment.Reschedule(input.BarberId, input.ServiceId, TimeRange.Create(slot.StartsAt, slot.EndsAt).Value,
            LouBarbershop.Domain.Finance.Money.Create(slot.PriceCents).Value, slot.DurationMinutes, clock.UtcNow);
        if (!changed.IsSuccess) return Conflict<PublicBookingConfirmation>("INVALID_STATE", "La cita ya no puede reprogramarse.");
        var management = tokens.Issue();
        appointment.SetManagementToken(management.Hash, slot.EndsAt.AddHours(ManagementHoursAfterAppointment), clock.UtcNow);
        Record(appointment, "PUBLIC_RESCHEDULED", before);
        await store.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        var view = await MapAsync(appointment, null, ct);
        return new(PublicBookingStatus.Success, new(view, management.PlainText, "/mi-cita#" + management.PlainText));
    }

    public async Task<PublicBookingResult<PublicAppointmentView>> CancelAsync(string? token, uint version, CancellationToken ct)
    {
        await using var transaction = await store.BeginAsync(ct);
        var appointment = await FindManagedAsync(token, ct);
        if (appointment is null) return Missing<PublicAppointmentView>();
        if (appointment.Version != version) return Conflict<PublicAppointmentView>("VERSION_CONFLICT", "La cita cambió. Vuelve a cargar el enlace.");
        if (appointment.Status != AppointmentStatus.Confirmed) return Conflict<PublicAppointmentView>("INVALID_STATE", "La cita ya no puede cancelarse.");
        var before = Snapshot(appointment);
        var changed = appointment.TransitionTo(AppointmentStatus.Cancelled, clock.UtcNow);
        if (!changed.IsSuccess) return Conflict<PublicAppointmentView>("INVALID_STATE", "La cita ya no puede cancelarse.");
        appointment.RevokeManagementToken(clock.UtcNow);
        Record(appointment, "PUBLIC_CANCELLED", before);
        await store.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return new(PublicBookingStatus.Success, await MapAsync(appointment, null, ct));
    }

    private async Task<Appointment?> FindManagedAsync(string? plainToken, CancellationToken ct)
    {
        var hash = tokens.Hash(plainToken);
        if (hash is null) return null;
        var appointment = await store.FindByManagementTokenHashAsync(hash, ct);
        return appointment is not null && appointment.Source == AppointmentSource.Public &&
            appointment.ManagementTokenExpiresAt > clock.UtcNow ? appointment : null;
    }

    private async Task<AvailabilityOption?> FindSlotAsync(Guid barberId, Guid serviceId, DateTimeOffset startsAt, Guid? exceptId, CancellationToken ct)
    {
        var date = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(startsAt, BusinessZone).DateTime);
        var result = await availability.SearchAvailabilityAsync(serviceId, barberId, date, date, ct, exceptId);
        return result.Value?.SingleOrDefault(x => x.BarberId == barberId && x.StartsAt == startsAt);
    }

    private async Task<PublicAppointmentView> MapAsync(Appointment appointment, string? customerName, CancellationToken ct)
    {
        var row = await store.ReadAsync(appointment.Id, ct);
        return new(appointment.Id, customerName ?? row!.CustomerName, appointment.ServiceId, row!.ServiceName,
            appointment.BarberId, row.BarberName, appointment.Range.StartsAt, appointment.Range.EndsAt,
            appointment.Status, appointment.QuotedPrice.Cents, appointment.QuotedDurationMinutes, appointment.Version);
    }

    private void Record(Appointment appointment, string action, AppointmentSnapshot? before) =>
        store.Add(new AgendaEvent(ids.Create(), appointment.Id, null, clock.UtcNow, action, null, before, Snapshot(appointment)));
    private static AppointmentSnapshot Snapshot(Appointment value) => new(value.BarberId, value.ServiceId, value.Range.StartsAt,
        value.Range.EndsAt, value.Status, value.QuotedPrice.Cents, value.QuotedDurationMinutes);
    private static PublicBookingResult<T> Invalid<T>(string code, string message) => new(PublicBookingStatus.Invalid, Code: code, Message: message);
    private static PublicBookingResult<T> Missing<T>() => new(PublicBookingStatus.NotFound, Code: "booking.not_found", Message: "El enlace no es válido o ya venció.");
    private static PublicBookingResult<T> Conflict<T>(string code, string message) => new(PublicBookingStatus.Conflict, Code: code, Message: message);
    private static PublicBookingResult<T> SlotTaken<T>() => Conflict<T>("SLOT_TAKEN", "Ese horario acaba de ocuparse. Elige otra alternativa.");
}
