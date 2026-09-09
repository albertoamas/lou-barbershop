using LouBarbershop.Domain.Common;

namespace LouBarbershop.Domain.Commissions;

public sealed class SettlementAdjustment
{
    private SettlementAdjustment() { Reason = string.Empty; }
    private SettlementAdjustment(Guid id, Guid settlementId, long amount, string reason, Guid actorId, DateTimeOffset at)
    { Id = id; SettlementId = settlementId; AmountCents = amount; Reason = reason; AuthorizedBy = actorId; CreatedAt = at.ToUniversalTime(); }
    public Guid Id { get; private set; }
    public Guid SettlementId { get; private set; }
    public long AmountCents { get; private set; }
    public string Reason { get; private set; }
    public Guid AuthorizedBy { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public static DomainResult<SettlementAdjustment> Create(Guid id, Guid settlementId, long amount, string? reason, Guid actorId, DateTimeOffset at)
    { var text = reason?.Trim(); return id == Guid.Empty || settlementId == Guid.Empty || amount == 0 || actorId == Guid.Empty || string.IsNullOrWhiteSpace(text) || text.Length > 300 ? DomainResult.Failure<SettlementAdjustment>(DomainErrors.InvalidSettlement) : DomainResult.Success(new SettlementAdjustment(id, settlementId, amount, text, actorId, at)); }
}
