using LouBarbershop.Application.Commissions;
using LouBarbershop.Domain.Commissions;
using LouBarbershop.Domain.Inventory;
using LouBarbershop.Domain.Sales;
using LouBarbershop.Domain.Staff;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace LouBarbershop.Infrastructure.Persistence;

public sealed class EfCommissionStore(AppDbContext db) : ICommissionStore
{
    public async Task<ICommissionTransaction> BeginAsync(CancellationToken ct)
    {
        var transaction = await db.Database.BeginTransactionAsync(ct);
        await db.Database.ExecuteSqlRawAsync("SELECT pg_advisory_xact_lock(8012026)", ct);
        return new Transaction(transaction);
    }

    public Task<Guid?> FindOwnBarberAsync(Guid userId, CancellationToken ct) =>
        (from barber in db.BarberProfiles.AsNoTracking()
         join staff in db.StaffProfiles.AsNoTracking() on barber.StaffProfileId equals staff.Id
         where staff.UserId == userId && staff.Active && barber.Active
         select (Guid?)barber.Id).SingleOrDefaultAsync(ct);

    public Task<bool> ContractorActiveAsync(Guid barberId, CancellationToken ct) =>
        db.BarberProfiles.AnyAsync(x => x.Id == barberId && x.Active && x.EmploymentType == EmploymentType.Contractor, ct);

    public async Task<IReadOnlyCollection<CommissionView>> ListCommissionsAsync(Guid? barberId, CommissionEntryStatus? status, CancellationToken ct)
    {
        var query = db.CommissionEntries.AsNoTracking().AsQueryable();
        if (barberId.HasValue) query = query.Where(x => x.BarberId == barberId);
        if (status.HasValue) query = query.Where(x => x.Status == status);
        var entries = await query.OrderByDescending(x => x.EarnedAt).ToArrayAsync(ct);
        return await MapEntriesAsync(entries, ct);
    }

    public async Task<IReadOnlyCollection<CommissionEntry>> AvailableAsync(Guid barberId, DateTimeOffset cutoffExclusive, CancellationToken ct) =>
        await db.CommissionEntries.Where(x => x.BarberId == barberId && x.Status == CommissionEntryStatus.Available && x.AmountCents != 0 && x.EarnedAt < cutoffExclusive).OrderBy(x => x.EarnedAt).ToArrayAsync(ct);

    public async Task<IReadOnlyCollection<CommissionEntry>> ListEntriesAsync(IReadOnlySet<Guid> ids, CancellationToken ct) =>
        await db.CommissionEntries.Where(x => ids.Contains(x.Id)).ToArrayAsync(ct);

    public Task<Settlement?> FindSettlementAsync(Guid id, CancellationToken ct) =>
        db.Settlements.Include(x => x.Items).Include(x => x.Adjustments).SingleOrDefaultAsync(x => x.Id == id, ct);

    public async Task<IReadOnlyCollection<SettlementView>> ListSettlementsAsync(Guid? barberId, CancellationToken ct)
    {
        var query = db.Settlements.AsNoTracking().AsQueryable();
        if (barberId.HasValue) query = query.Where(x => x.BarberId == barberId);
        var ids = await query.OrderByDescending(x => x.PeriodEnd).Select(x => x.Id).ToArrayAsync(ct);
        var rows = new List<SettlementView>(ids.Length);
        foreach (var id in ids) { var row = await ReadSettlementAsync(id, ct); if (row is not null) rows.Add(row); }
        return rows;
    }

    public async Task<SettlementView?> ReadSettlementAsync(Guid id, CancellationToken ct)
    {
        var settlement = await db.Settlements.AsNoTracking().Include(x => x.Items).Include(x => x.Adjustments).SingleOrDefaultAsync(x => x.Id == id, ct);
        if (settlement is null) return null;
        var name = await (from barber in db.BarberProfiles.AsNoTracking() join staff in db.StaffProfiles.AsNoTracking() on barber.StaffProfileId equals staff.Id where barber.Id == settlement.BarberId select staff.DisplayName).SingleAsync(ct);
        var entryIds = settlement.Items.Select(x => x.CommissionEntryId).ToHashSet();
        var entries = await db.CommissionEntries.AsNoTracking().Where(x => entryIds.Contains(x.Id)).ToArrayAsync(ct);
        var mapped = (await MapEntriesAsync(entries, ct)).ToDictionary(x => x.Id);
        var items = settlement.Items.Select(x => { var e = mapped[x.CommissionEntryId]; return new SettlementItemView(x.Id, x.CommissionEntryId, e.OperationId, e.Description, e.BaseCents, e.RateBasisPoints, x.AmountCents, e.Type); }).ToArray();
        return new(settlement.Id, settlement.BarberId, name, settlement.PeriodStart, settlement.PeriodEnd, settlement.Status, settlement.CommissionTotalCents, settlement.AdjustmentTotalCents, settlement.PayableTotalCents, settlement.PaymentMethod, settlement.PaymentDate, settlement.ClosedAt, settlement.PaidAt, settlement.Version, items, settlement.Adjustments.OrderBy(x => x.CreatedAt).Select(x => new SettlementAdjustmentView(x.Id, x.AmountCents, x.Reason, x.CreatedAt)).ToArray());
    }

    public Task<SaleOperation?> FindPaidOperationAsync(Guid id, CancellationToken ct) =>
        db.SaleOperations.Include(x => x.Items).Include(x => x.Payments).SingleOrDefaultAsync(x => x.Id == id, ct);

    public async Task<IReadOnlyCollection<CommissionEntry>> FindOperationCommissionsAsync(Guid operationId, CancellationToken ct)
    {
        var itemIds = db.SaleItems.Where(x => x.OperationId == operationId).Select(x => x.Id);
        return await db.CommissionEntries.Where(x => x.SaleItemId.HasValue && itemIds.Contains(x.SaleItemId.Value)).ToArrayAsync(ct);
    }

    public void Add(Settlement settlement) => db.Settlements.Add(settlement);
    public void Add(CommissionEntry entry) => db.CommissionEntries.Add(entry);
    public void Add(InventoryMovement movement) => db.InventoryMovements.Add(movement);
    public Task SaveChangesAsync(CancellationToken ct) => db.SaveChangesAsync(ct);

    private async Task<IReadOnlyCollection<CommissionView>> MapEntriesAsync(IReadOnlyCollection<CommissionEntry> entries, CancellationToken ct)
    {
        var sourceIds = entries.Where(x => x.SourceEntryId.HasValue).Select(x => x.SourceEntryId!.Value).ToHashSet();
        sourceIds.ExceptWith(entries.Select(x => x.Id));
        var sources = sourceIds.Count == 0 ? [] : await db.CommissionEntries.AsNoTracking().Where(x => sourceIds.Contains(x.Id)).ToArrayAsync(ct);
        var all = entries.Concat(sources).ToDictionary(x => x.Id);
        var saleItemIds = all.Values.Where(x => x.SaleItemId.HasValue).Select(x => x.SaleItemId!.Value).ToHashSet();
        var saleItems = saleItemIds.Count == 0 ? [] : await db.SaleItems.AsNoTracking().Where(x => saleItemIds.Contains(x.Id)).ToArrayAsync(ct);
        var items = saleItems.ToDictionary(x => x.Id);
        return entries.Select(entry =>
        {
            var original = entry.SaleItemId.HasValue ? entry : all[entry.SourceEntryId!.Value];
            var item = items[original.SaleItemId!.Value];
            return new CommissionView(entry.Id, entry.BarberId, item.OperationId, entry.SaleItemId, item.DescriptionSnapshot, entry.Type, entry.BaseCents, entry.RateBasisPoints, entry.AmountCents, entry.Status, entry.SourceEntryId, entry.Reason, entry.EarnedAt);
        }).ToArray();
    }

    private sealed class Transaction(IDbContextTransaction value) : ICommissionTransaction
    { public Task CommitAsync(CancellationToken ct) => value.CommitAsync(ct); public ValueTask DisposeAsync() => value.DisposeAsync(); }
}
