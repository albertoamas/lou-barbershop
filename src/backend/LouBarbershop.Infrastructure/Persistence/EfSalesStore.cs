using System.Text.Json;
using LouBarbershop.Application.Sales;
using LouBarbershop.Domain.Appointments;
using LouBarbershop.Domain.Commissions;
using LouBarbershop.Domain.Inventory;
using LouBarbershop.Domain.Sales;
using LouBarbershop.Domain.Staff;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace LouBarbershop.Infrastructure.Persistence;

public sealed class EfSalesStore(AppDbContext db) : ISalesStore
{
    public async Task<ISalesTransaction> BeginAsync(CancellationToken ct) { var transaction = await db.Database.BeginTransactionAsync(ct); await db.Database.ExecuteSqlRawAsync("SELECT pg_advisory_xact_lock(8012026)", ct); return new Transaction(transaction); }
    public async Task<Guid?> FindOwnBarberAsync(Guid userId, CancellationToken ct) => await (from b in db.BarberProfiles.AsNoTracking() join s in db.StaffProfiles.AsNoTracking() on b.StaffProfileId equals s.Id where s.UserId == userId && s.Active && b.Active select (Guid?)b.Id).SingleOrDefaultAsync(ct);
    public async Task<(Guid, Guid, Guid, string, long, string)?> FindAppointmentAsync(Guid id, CancellationToken ct) => await (from a in db.Appointments.AsNoTracking() join s in db.Services.AsNoTracking() on a.ServiceId equals s.Id where a.Id == id select new ValueTuple<Guid, Guid, Guid, string, long, string>(a.CustomerId, a.BarberId, a.ServiceId, s.Name, a.QuotedPrice.Cents, Status(a.Status))).SingleOrDefaultAsync(ct);
    public async Task<(string, long, bool)?> FindServiceAsync(Guid id, Guid barberId, DateOnly businessDate, CancellationToken ct) { var offer = await db.BarberServiceOfferings.AsNoTracking().Where(x => x.BarberId == barberId && x.ServiceId == id && x.Active && x.Period.ValidFrom <= businessDate && (!x.Period.ValidTo.HasValue || x.Period.ValidTo >= businessDate)).Select(x => new { x.Price.Cents }).SingleOrDefaultAsync(ct); return await db.Services.AsNoTracking().Where(x => x.Id == id).Select(x => new ValueTuple<string, long, bool>(x.Name, offer == null ? x.DefaultPrice.Cents : offer.Cents, x.Active)).SingleOrDefaultAsync(ct); }
    public async Task<(string, long, long, bool)?> FindProductAsync(Guid id, CancellationToken ct) => await db.Products.AsNoTracking().Where(x => x.Id == id).Select(x => new { x.Name, SalePriceCents = x.SalePrice.Cents, AverageCostCents = x.AverageCost.Cents, x.Active }).Select(x => new ValueTuple<string, long, long, bool>(x.Name, x.SalePriceCents, x.AverageCostCents, x.Active)).Cast<(string, long, long, bool)?>().SingleOrDefaultAsync(ct);
    public async Task<int> ProductQuantityAsync(Guid productId, CancellationToken ct) => await db.InventoryMovements.Where(x => x.ProductId == productId).SumAsync(x => (int?)x.QuantityDelta, ct) ?? 0;
    public Task<bool> CustomerExistsAsync(Guid id, CancellationToken ct) => db.Customers.AnyAsync(x => x.Id == id && x.Active, ct); public Task<bool> BarberActiveAsync(Guid id, CancellationToken ct) => db.BarberProfiles.AnyAsync(x => x.Id == id && x.Active, ct); public Task<bool> BarberIsOwnerAsync(Guid id, CancellationToken ct) => db.BarberProfiles.AnyAsync(x => x.Id == id && x.EmploymentType == EmploymentType.Owner, ct);
    public Task<int?> FindCommissionRateAsync(Guid barberId, CommissionKind kind, DateOnly businessDate, CancellationToken ct) => db.CommissionRules.AsNoTracking().Where(x => x.BarberId == barberId && x.Kind == kind && x.Active && x.Period.ValidFrom <= businessDate && (!x.Period.ValidTo.HasValue || x.Period.ValidTo >= businessDate)).Select(x => (int?)x.Rate.BasisPoints).SingleOrDefaultAsync(ct);
    public Task<SaleOperation?> FindAsync(Guid id, CancellationToken ct) => db.SaleOperations.Include(x => x.Items).Include(x => x.Payments).SingleOrDefaultAsync(x => x.Id == id, ct);
    public Task<bool> OperationExistsForAppointmentAsync(Guid appointmentId, CancellationToken ct) => db.SaleOperations.AnyAsync(x => x.AppointmentId == appointmentId, ct);
    private IQueryable<OperationView> Views(IQueryable<SaleOperation> source) => from o in source join c in db.Customers.IgnoreQueryFilters() on o.CustomerId equals c.Id join b in db.BarberProfiles on o.BarberId equals b.Id join s in db.StaffProfiles on b.StaffProfileId equals s.Id select new OperationView(o.Id, o.AppointmentId, o.CustomerId, c.DisplayName, o.BarberId, s.DisplayName, o.Origin, o.Status, o.SubtotalCents, o.DiscountCents, o.CourtesyCents, o.TotalCents, o.AdjustmentReason, o.OpenedAt, o.PaidAt, o.Version, o.Items.Select(i => new ItemView(i.Id, i.Type, i.ServiceId, i.ProductId, i.DescriptionSnapshot, i.UnitPriceCents, i.UnitCostCents, i.Quantity)).ToArray(), o.Payments.Select(p => new PaymentView(p.Id, p.Method, p.AmountCents)).ToArray());
    public Task<OperationView?> ReadAsync(Guid id, CancellationToken ct) => Views(db.SaleOperations.AsNoTracking().Where(x => x.Id == id)).SingleOrDefaultAsync(ct);
    public async Task<IReadOnlyCollection<OperationView>> ListAsync(DateTimeOffset startsAt, DateTimeOffset endsAt, Guid? barberId, CancellationToken ct)
    {
        var ids = await db.SaleOperations.AsNoTracking().Where(x => x.OpenedAt >= startsAt && x.OpenedAt < endsAt && (!barberId.HasValue || x.BarberId == barberId)).OrderBy(x => x.OpenedAt).Select(x => x.Id).ToArrayAsync(ct);
        var rows = new List<OperationView>(ids.Length);
        foreach (var id in ids) { var value = await ReadAsync(id, ct); if (value is not null) rows.Add(value); }
        return rows;
    }
    public async Task<OperationView?> FindPaidByIdempotencyKeyAsync(string keyHash, CancellationToken ct) { var id = await db.PaymentIdempotency.AsNoTracking().Where(x => x.KeyHash == keyHash).Select(x => (Guid?)x.OperationId).SingleOrDefaultAsync(ct); return id.HasValue ? await ReadAsync(id.Value, ct) : null; }
    public void AddOperation(SaleOperation operation) => db.SaleOperations.Add(operation); public void AddCommission(CommissionEntryRecord entry) => db.CommissionEntries.Add(new() { Id = entry.Id, BarberId = entry.BarberId, SaleItemId = entry.SaleItemId, BaseCents = entry.BaseCents, RateBasisPoints = entry.RateBasisPoints, AmountCents = entry.AmountCents, CreatedBy = entry.CreatedBy, EarnedAt = entry.EarnedAt }); public void AddIdempotency(IdempotencyRecord record) => db.PaymentIdempotency.Add(new() { Id = record.Id, KeyHash = record.KeyHash, OperationId = record.OperationId, CreatedAt = record.CreatedAt }); public void AddInventoryMovement(InventoryMovement movement) => db.InventoryMovements.Add(movement);
    public async Task MarkAppointmentCompletedAsync(Guid appointmentId, Guid eventId, Guid actorId, DateTimeOffset at, CancellationToken ct)
    {
        var appointment = await db.Appointments.SingleAsync(x => x.Id == appointmentId, ct);
        var before = Snapshot(appointment);
        if (appointment.Status == AppointmentStatus.CheckedIn) appointment.TransitionTo(AppointmentStatus.InService, at);
        var completed = appointment.TransitionTo(AppointmentStatus.Completed, at);
        if (!completed.IsSuccess) throw new InvalidOperationException(completed.Error!.Message);
        db.AppointmentEvents.Add(new AppointmentEventRecord
        {
            Id = eventId,
            AppointmentId = appointmentId,
            ActorId = actorId,
            OccurredAt = at,
            Action = "COMPLETED_FROM_PAYMENT",
            BeforeData = JsonSerializer.Serialize(before),
            AfterData = JsonSerializer.Serialize(Snapshot(appointment)),
        });
    }
    public Task SaveChangesAsync(CancellationToken ct) => db.SaveChangesAsync(ct);
    private static string Status(AppointmentStatus x) => x switch { AppointmentStatus.CheckedIn => "CHECKED_IN", AppointmentStatus.InService => "IN_SERVICE", _ => x.ToString().ToUpperInvariant() };
    private static object Snapshot(Appointment x) => new { x.BarberId, x.ServiceId, StartsAt = x.Range.StartsAt, EndsAt = x.Range.EndsAt, Status = Status(x.Status), PriceCents = x.QuotedPrice.Cents, x.QuotedDurationMinutes };
    private sealed class Transaction(IDbContextTransaction value) : ISalesTransaction { public Task CommitAsync(CancellationToken ct) => value.CommitAsync(ct); public ValueTask DisposeAsync() => value.DisposeAsync(); }
}
