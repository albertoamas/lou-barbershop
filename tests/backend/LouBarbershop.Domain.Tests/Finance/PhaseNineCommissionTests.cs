using LouBarbershop.Domain.Commissions;
using LouBarbershop.Domain.Sales;
using LouBarbershop.Domain.Settlements;

namespace LouBarbershop.Domain.Tests.Finance;

public sealed class PhaseNineCommissionTests
{
    private static readonly DateTimeOffset Now = new(2026, 9, 8, 12, 0, 0, TimeSpan.Zero);

    [Fact]
    public void Earning_keeps_historical_base_rate_and_exact_amount()
    {
        var entry = CommissionEntry.CreateEarning(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), 7_001, 3_333, 2_333, Guid.NewGuid(), Now).Value;
        Assert.Equal(7_001, entry.BaseCents); Assert.Equal(3_333, entry.RateBasisPoints); Assert.Equal(2_333, entry.AmountCents); Assert.Equal(CommissionEntryStatus.Available, entry.Status);
    }

    [Fact]
    public void Paid_entry_is_immutable_and_reversal_is_a_new_negative_available_entry()
    {
        var source = CommissionEntry.CreateEarning(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), 10_000, 5_000, 5_000, Guid.NewGuid(), Now).Value;
        source.IncludeInSettlement(); source.MarkPaid();
        var reversal = CommissionEntry.CreateReversal(Guid.NewGuid(), source, "Operación revertida", Guid.NewGuid(), Now.AddDays(1)).Value;
        Assert.Equal(CommissionEntryStatus.Paid, source.Status); Assert.Equal(-5_000, reversal.AmountCents); Assert.Equal(source.Id, reversal.SourceEntryId); Assert.Equal(CommissionEntryStatus.Available, reversal.Status);
    }

    [Fact]
    public void Settlement_rejects_negative_total_and_paid_settlement_cannot_change()
    {
        var settlementId = Guid.NewGuid();
        var rejected = Settlement.Create(settlementId, Guid.NewGuid(), new DateOnly(2026, 9, 1), new DateOnly(2026, 9, 8), Guid.NewGuid(), Now, [new SettlementItem(Guid.NewGuid(), settlementId, Guid.NewGuid(), -1)]);
        Assert.False(rejected.IsSuccess);
        settlementId = Guid.NewGuid();
        var settlement = Settlement.Create(settlementId, Guid.NewGuid(), new DateOnly(2026, 9, 1), new DateOnly(2026, 9, 8), Guid.NewGuid(), Now, [new SettlementItem(Guid.NewGuid(), settlementId, Guid.NewGuid(), 5_000)]).Value;
        var adjustment = SettlementAdjustment.Create(Guid.NewGuid(), settlementId, -500, "Anticipo documentado", Guid.NewGuid(), Now).Value;
        Assert.True(settlement.AddAdjustment(adjustment, Now).IsSuccess); Assert.Equal(4_500, settlement.PayableTotalCents);
        settlement.Close(Guid.NewGuid(), Now); settlement.Pay(new DateOnly(2026, 9, 8), PaymentMethod.Qr, Guid.NewGuid(), Now);
        Assert.False(settlement.AddAdjustment(SettlementAdjustment.Create(Guid.NewGuid(), settlementId, 100, "Tardío", Guid.NewGuid(), Now).Value, Now).IsSuccess); Assert.Equal(SettlementStatus.Paid, settlement.Status);
    }
}
