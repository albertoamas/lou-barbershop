using LouBarbershop.Domain.Sales;

namespace LouBarbershop.Application.Sales;

public enum SalesStatus { Success, Invalid, Forbidden, NotFound, Conflict }
public sealed record SalesResult<T>(SalesStatus Status, T? Value = default, string? Code = null, string? Message = null);
public sealed record ServiceInput(Guid ServiceId);
public sealed record AdjustmentInput(long DiscountCents, bool Courtesy, string Reason, uint Version);
public sealed record PaymentInput(PaymentMethod Method, long AmountCents);
public sealed record OperationView(Guid Id, Guid? AppointmentId, Guid CustomerId, string CustomerName, Guid BarberId, string BarberName,
    SaleOrigin Origin, SaleOperationStatus Status, long SubtotalCents, long DiscountCents, long CourtesyCents, long TotalCents,
    string? AdjustmentReason, DateTimeOffset OpenedAt, DateTimeOffset? PaidAt, uint Version, IReadOnlyCollection<ItemView> Items, IReadOnlyCollection<PaymentView> Payments);
public sealed record ItemView(Guid Id, Guid ServiceId, string Description, long UnitPriceCents);
public sealed record PaymentView(Guid Id, PaymentMethod Method, long AmountCents);
public sealed record DailyOperationsView(DateOnly Date, int DraftCount, int PaidCount, long TotalCents, long CashCents, long QrCents, IReadOnlyCollection<OperationView> Operations);

public interface ISalesTransaction : IAsyncDisposable { Task CommitAsync(CancellationToken ct); }
public interface ISalesStore
{
    Task<ISalesTransaction> BeginAsync(CancellationToken ct);
    Task<Guid?> FindOwnBarberAsync(Guid userId, CancellationToken ct);
    Task<(Guid CustomerId, Guid BarberId, Guid ServiceId, string ServiceName, long PriceCents, string Status)?> FindAppointmentAsync(Guid id, CancellationToken ct);
    Task<(string Name, long PriceCents, bool Active)?> FindServiceAsync(Guid id, Guid barberId, DateOnly businessDate, CancellationToken ct);
    Task<bool> CustomerExistsAsync(Guid id, CancellationToken ct);
    Task<bool> BarberActiveAsync(Guid id, CancellationToken ct);
    Task<bool> BarberIsOwnerAsync(Guid id, CancellationToken ct);
    Task<int?> FindCommissionRateAsync(Guid barberId, DateOnly businessDate, CancellationToken ct);
    Task<SaleOperation?> FindAsync(Guid id, CancellationToken ct);
    Task<bool> OperationExistsForAppointmentAsync(Guid appointmentId, CancellationToken ct);
    Task<OperationView?> ReadAsync(Guid id, CancellationToken ct);
    Task<IReadOnlyCollection<OperationView>> ListAsync(DateTimeOffset startsAt, DateTimeOffset endsAt, Guid? barberId, CancellationToken ct);
    Task<OperationView?> FindPaidByIdempotencyKeyAsync(string keyHash, CancellationToken ct);
    void AddOperation(SaleOperation operation);
    void AddCommission(CommissionEntryRecord entry);
    void AddIdempotency(IdempotencyRecord record);
    Task MarkAppointmentCompletedAsync(Guid appointmentId, Guid eventId, Guid actorId, DateTimeOffset at, CancellationToken ct);
    Task SaveChangesAsync(CancellationToken ct);
}

public sealed record CommissionEntryRecord(Guid Id, Guid BarberId, Guid SaleItemId, long BaseCents, int RateBasisPoints, long AmountCents, Guid CreatedBy, DateTimeOffset EarnedAt);
public sealed record IdempotencyRecord(Guid Id, string KeyHash, Guid OperationId, DateTimeOffset CreatedAt);
