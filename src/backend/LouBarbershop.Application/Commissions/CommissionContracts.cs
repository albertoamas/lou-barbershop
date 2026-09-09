using LouBarbershop.Domain.Commissions;
using LouBarbershop.Domain.Inventory;
using LouBarbershop.Domain.Sales;
using LouBarbershop.Domain.Settlements;

namespace LouBarbershop.Application.Commissions;

public enum CommissionStatus { Success, Invalid, Forbidden, NotFound, Conflict }
public sealed record CommissionResult<T>(CommissionStatus Status, T? Value = default, string? Code = null, string? Message = null);
public sealed record CommissionView(Guid Id, Guid BarberId, Guid? OperationId, Guid? SaleItemId, string Description, CommissionEntryType Type, long BaseCents, int RateBasisPoints, long AmountCents, CommissionEntryStatus Status, Guid? SourceEntryId, string? Reason, DateTimeOffset EarnedAt);
public sealed record SettlementItemView(Guid Id, Guid CommissionEntryId, Guid? OperationId, string Description, long BaseCents, int RateBasisPoints, long AmountCents, CommissionEntryType Type);
public sealed record SettlementAdjustmentView(Guid Id, long AmountCents, string Reason, DateTimeOffset CreatedAt);
public sealed record SettlementView(Guid Id, Guid BarberId, string BarberName, DateOnly PeriodStart, DateOnly PeriodEnd, SettlementStatus Status, long CommissionTotalCents, long AdjustmentTotalCents, long PayableTotalCents, PaymentMethod? PaymentMethod, DateOnly? PaymentDate, DateTimeOffset? ClosedAt, DateTimeOffset? PaidAt, uint Version, IReadOnlyCollection<SettlementItemView> Items, IReadOnlyCollection<SettlementAdjustmentView> Adjustments);

public interface ICommissionTransaction : IAsyncDisposable { Task CommitAsync(CancellationToken ct); }
public interface ICommissionStore
{
    Task<ICommissionTransaction> BeginAsync(CancellationToken ct);
    Task<Guid?> FindOwnBarberAsync(Guid userId, CancellationToken ct);
    Task<bool> ContractorActiveAsync(Guid barberId, CancellationToken ct);
    Task<IReadOnlyCollection<CommissionView>> ListCommissionsAsync(Guid? barberId, CommissionEntryStatus? status, CancellationToken ct);
    Task<IReadOnlyCollection<CommissionEntry>> AvailableAsync(Guid barberId, DateTimeOffset cutoffExclusive, CancellationToken ct);
    Task<IReadOnlyCollection<CommissionEntry>> ListEntriesAsync(IReadOnlySet<Guid> ids, CancellationToken ct);
    Task<Settlement?> FindSettlementAsync(Guid id, CancellationToken ct);
    Task<IReadOnlyCollection<SettlementView>> ListSettlementsAsync(Guid? barberId, CancellationToken ct);
    Task<SettlementView?> ReadSettlementAsync(Guid id, CancellationToken ct);
    Task<SaleOperation?> FindPaidOperationAsync(Guid id, CancellationToken ct);
    Task<IReadOnlyCollection<CommissionEntry>> FindOperationCommissionsAsync(Guid operationId, CancellationToken ct);
    void Add(Settlement settlement);
    void Add(CommissionEntry entry);
    void Add(InventoryMovement movement);
    Task SaveChangesAsync(CancellationToken ct);
}
