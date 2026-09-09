using System.Text.Json;
using LouBarbershop.Application.Agenda;
using LouBarbershop.Domain.Appointments;
using LouBarbershop.Domain.Customers;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace LouBarbershop.Infrastructure.Persistence;

public sealed class EfAgendaStore(AppDbContext db) : IAgendaStore
{
    public async Task<IAgendaTransaction> BeginAsync(CancellationToken ct)
    {
        var transaction = await db.Database.BeginTransactionAsync(ct);
        try
        {
            // A single short write lane is sufficient for one shop. The DB exclusion remains the final guard.
            await db.Database.ExecuteSqlRawAsync("SELECT pg_advisory_xact_lock(6012026)", ct);
            return new AgendaTransaction(transaction);
        }
        catch
        {
            await transaction.DisposeAsync();
            throw;
        }
    }

    public async Task<IReadOnlyCollection<Customer>> SearchCustomersAsync(string query, PhoneNumber? phone, CancellationToken ct)
    {
        var pattern = "%" + query.Replace("\\", "\\\\", StringComparison.Ordinal).Replace("%", "\\%", StringComparison.Ordinal).Replace("_", "\\_", StringComparison.Ordinal) + "%";
        var exactPhone = phone?.Value ?? string.Empty;
        return await db.Customers.FromSqlInterpolated($"SELECT *, xmin FROM lou.customers WHERE display_name ILIKE {pattern} OR phone_e164 LIKE {pattern} OR phone_e164 = {exactPhone}")
            .AsNoTracking().OrderBy(x => x.DisplayName).Take(50).ToArrayAsync(ct);
    }
    public Task<Customer?> FindCustomerAsync(Guid id, CancellationToken ct) => db.Customers.SingleOrDefaultAsync(x => x.Id == id, ct);
    public Task<Customer?> FindCustomerByIdentityAsync(string displayName, PhoneNumber phone, CancellationToken ct) =>
        db.Customers.FirstOrDefaultAsync(x => x.PhoneNumber == phone && x.DisplayName == displayName, ct);
    public void Add(Customer customer) => db.Customers.Add(customer);
    public async Task<Guid?> FindOwnBarberAsync(Guid userId, CancellationToken ct) => await
        (from barber in db.BarberProfiles.AsNoTracking()
         join staff in db.StaffProfiles.AsNoTracking() on barber.StaffProfileId equals staff.Id
         where staff.UserId == userId && staff.Active && barber.Active
         select (Guid?)barber.Id).SingleOrDefaultAsync(ct);

    private IQueryable<AppointmentView> Views(IQueryable<Appointment> appointments) =>
        from appointment in appointments
        join customer in db.Customers.IgnoreQueryFilters().AsNoTracking() on appointment.CustomerId equals customer.Id
        join barber in db.BarberProfiles.AsNoTracking() on appointment.BarberId equals barber.Id
        join staff in db.StaffProfiles.AsNoTracking() on barber.StaffProfileId equals staff.Id
        join service in db.Services.AsNoTracking() on appointment.ServiceId equals service.Id
        select new AppointmentView(appointment.Id, customer.Id, customer.DisplayName, barber.Id, staff.DisplayName, service.Id, service.Name,
            appointment.Range.StartsAt, appointment.Range.EndsAt, appointment.Status, appointment.QuotedPrice.Cents, appointment.QuotedDurationMinutes, appointment.Version);

    public async Task<IReadOnlyCollection<AppointmentView>> ListAsync(DateTimeOffset startsAt, DateTimeOffset endsAt, Guid? barberId, CancellationToken ct) =>
        await Views(db.Appointments.AsNoTracking().Where(x => x.Range.StartsAt < endsAt && x.Range.EndsAt > startsAt && (!barberId.HasValue || x.BarberId == barberId)).OrderBy(x => x.Range.StartsAt).ThenBy(x => x.BarberId)).ToArrayAsync(ct);
    public Task<Appointment?> FindAsync(Guid id, CancellationToken ct) => db.Appointments.SingleOrDefaultAsync(x => x.Id == id, ct);
    public Task<Appointment?> FindByManagementTokenHashAsync(string tokenHash, CancellationToken ct) =>
        db.Appointments.SingleOrDefaultAsync(x => x.ManagementTokenHash == tokenHash, ct);
    public Task<AppointmentView?> ReadAsync(Guid id, CancellationToken ct) => Views(db.Appointments.AsNoTracking().Where(x => x.Id == id)).SingleOrDefaultAsync(ct);
    public void Add(Appointment appointment) => db.Appointments.Add(appointment);
    public void Add(AgendaEvent appointmentEvent) => db.AppointmentEvents.Add(new AppointmentEventRecord
    {
        Id = appointmentEvent.Id,
        AppointmentId = appointmentEvent.AppointmentId,
        ActorId = appointmentEvent.ActorId,
        OccurredAt = appointmentEvent.OccurredAt.ToUniversalTime(),
        Action = appointmentEvent.Action,
        Reason = appointmentEvent.Reason,
        BeforeData = appointmentEvent.Before is null ? null : JsonSerializer.Serialize(appointmentEvent.Before),
        AfterData = JsonSerializer.Serialize(appointmentEvent.After),
    });
    public async Task<IReadOnlyCollection<AgendaEvent>> HistoryAsync(Guid appointmentId, CancellationToken ct)
    {
        var rows = await db.AppointmentEvents.AsNoTracking().Where(x => x.AppointmentId == appointmentId).OrderBy(x => x.OccurredAt).ToArrayAsync(ct);
        return rows.Select(x => new AgendaEvent(x.Id, x.AppointmentId, x.ActorId, x.OccurredAt, x.Action, x.Reason,
            x.BeforeData is null ? null : JsonSerializer.Deserialize<AppointmentSnapshot>(x.BeforeData), JsonSerializer.Deserialize<AppointmentSnapshot>(x.AfterData)!)).ToArray();
    }
    public Task SaveChangesAsync(CancellationToken ct) => db.SaveChangesAsync(ct);

    private sealed class AgendaTransaction(IDbContextTransaction transaction) : IAgendaTransaction
    {
        public Task CommitAsync(CancellationToken ct) => transaction.CommitAsync(ct);
        public ValueTask DisposeAsync() => transaction.DisposeAsync();
    }
}
