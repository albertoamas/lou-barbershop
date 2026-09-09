namespace LouBarbershop.Domain.Commissions;

public sealed class SettlementItem
{
    private SettlementItem() { }
    public SettlementItem(Guid id, Guid settlementId, Guid commissionEntryId, long amountCents)
    { Id = id; SettlementId = settlementId; CommissionEntryId = commissionEntryId; AmountCents = amountCents; }
    public Guid Id { get; private set; }
    public Guid SettlementId { get; private set; }
    public Guid CommissionEntryId { get; private set; }
    public long AmountCents { get; private set; }
}
