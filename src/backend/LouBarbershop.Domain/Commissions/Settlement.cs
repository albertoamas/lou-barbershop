using LouBarbershop.Domain.Common;
using LouBarbershop.Domain.Sales;
using LouBarbershop.Domain.Settlements;

namespace LouBarbershop.Domain.Commissions;

public sealed class Settlement
{
    private readonly List<SettlementItem> _items = [];
    private readonly List<SettlementAdjustment> _adjustments = [];
    private Settlement() { }
    private Settlement(Guid id, Guid barberId, DateOnly start, DateOnly end, Guid actorId, DateTimeOffset at, IEnumerable<SettlementItem> items)
    { Id = id; BarberId = barberId; PeriodStart = start; PeriodEnd = end; CreatedBy = actorId; CreatedAt = at.ToUniversalTime(); UpdatedAt = CreatedAt; _items.AddRange(items); Recalculate(); }
    public Guid Id { get; private set; }
    public Guid BarberId { get; private set; }
    public DateOnly PeriodStart { get; private set; }
    public DateOnly PeriodEnd { get; private set; }
    public SettlementStatus Status { get; private set; } = SettlementStatus.Draft;
    public long CommissionTotalCents { get; private set; }
    public long AdjustmentTotalCents { get; private set; }
    public long PayableTotalCents { get; private set; }
    public PaymentMethod? PaymentMethod { get; private set; }
    public DateOnly? PaymentDate { get; private set; }
    public Guid CreatedBy { get; private set; }
    public Guid? ClosedBy { get; private set; }
    public Guid? PaidBy { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }
    public DateTimeOffset? ClosedAt { get; private set; }
    public DateTimeOffset? PaidAt { get; private set; }
    public uint Version { get; private set; }
    public IReadOnlyCollection<SettlementItem> Items => _items;
    public IReadOnlyCollection<SettlementAdjustment> Adjustments => _adjustments;

    public static DomainResult<Settlement> Create(Guid id, Guid barberId, DateOnly start, DateOnly end, Guid actorId, DateTimeOffset at, IEnumerable<SettlementItem> items)
    {
        var rows = items.ToArray();
        if (id == Guid.Empty || barberId == Guid.Empty || actorId == Guid.Empty || start == default || end < start || rows.Length == 0 || rows.Any(x => x.SettlementId != id || x.AmountCents == 0) || rows.GroupBy(x => x.CommissionEntryId).Any(x => x.Count() > 1))
            return DomainResult.Failure<Settlement>(DomainErrors.InvalidSettlement);
        try { return rows.Sum(x => x.AmountCents) < 0 ? DomainResult.Failure<Settlement>(DomainErrors.NegativeSettlement) : DomainResult.Success(new Settlement(id, barberId, start, end, actorId, at, rows)); }
        catch (OverflowException) { return DomainResult.Failure<Settlement>(DomainErrors.InvalidSettlement); }
    }
    public DomainResult<Settlement> AddAdjustment(SettlementAdjustment value, DateTimeOffset at)
    { if (Status != SettlementStatus.Draft || value.SettlementId != Id || _adjustments.Any(x => x.Id == value.Id)) return DomainResult.Failure<Settlement>(DomainErrors.InvalidStateTransition); long next; try { next = checked(PayableTotalCents + value.AmountCents); } catch (OverflowException) { return DomainResult.Failure<Settlement>(DomainErrors.InvalidSettlement); } if (next < 0) return DomainResult.Failure<Settlement>(DomainErrors.NegativeSettlement); _adjustments.Add(value); Recalculate(); UpdatedAt = at.ToUniversalTime(); return DomainResult.Success(this); }
    public DomainResult<Settlement> Close(Guid actorId, DateTimeOffset at)
    { if (Status != SettlementStatus.Draft || actorId == Guid.Empty || PayableTotalCents < 0) return DomainResult.Failure<Settlement>(DomainErrors.InvalidStateTransition); Status = SettlementStatus.Closed; ClosedBy = actorId; ClosedAt = at.ToUniversalTime(); UpdatedAt = ClosedAt.Value; return DomainResult.Success(this); }
    public DomainResult<Settlement> Pay(DateOnly date, PaymentMethod method, Guid actorId, DateTimeOffset at)
    { if (Status != SettlementStatus.Closed || date == default || actorId == Guid.Empty || !Enum.IsDefined(method)) return DomainResult.Failure<Settlement>(DomainErrors.InvalidStateTransition); Status = SettlementStatus.Paid; PaymentDate = date; PaymentMethod = method; PaidBy = actorId; PaidAt = at.ToUniversalTime(); UpdatedAt = PaidAt.Value; return DomainResult.Success(this); }
    private void Recalculate() { CommissionTotalCents = _items.Sum(x => x.AmountCents); AdjustmentTotalCents = _adjustments.Sum(x => x.AmountCents); PayableTotalCents = checked(CommissionTotalCents + AdjustmentTotalCents); }
}
