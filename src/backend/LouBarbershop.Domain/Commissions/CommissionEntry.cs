using LouBarbershop.Domain.Common;

namespace LouBarbershop.Domain.Commissions;

public enum CommissionEntryType { Earning, Reversal }

public sealed class CommissionEntry
{
    private CommissionEntry() { }
    private CommissionEntry(Guid id, Guid barberId, Guid? saleItemId, CommissionEntryType type, long baseCents, int rateBasisPoints, long amountCents, Guid? sourceEntryId, string? reason, Guid actorId, DateTimeOffset at)
    { Id = id; BarberId = barberId; SaleItemId = saleItemId; Type = type; BaseCents = baseCents; RateBasisPoints = rateBasisPoints; AmountCents = amountCents; SourceEntryId = sourceEntryId; Reason = reason; CreatedBy = actorId; EarnedAt = at.ToUniversalTime(); }
    public Guid Id { get; private set; }
    public Guid BarberId { get; private set; }
    public Guid? SaleItemId { get; private set; }
    public CommissionEntryType Type { get; private set; }
    public long BaseCents { get; private set; }
    public int RateBasisPoints { get; private set; }
    public long AmountCents { get; private set; }
    public CommissionEntryStatus Status { get; private set; } = CommissionEntryStatus.Available;
    public Guid? SourceEntryId { get; private set; }
    public string? Reason { get; private set; }
    public Guid CreatedBy { get; private set; }
    public DateTimeOffset EarnedAt { get; private set; }

    public static DomainResult<CommissionEntry> CreateEarning(Guid id, Guid barberId, Guid saleItemId, long baseCents, int rateBasisPoints, long amountCents, Guid actorId, DateTimeOffset at) =>
        id == Guid.Empty || barberId == Guid.Empty || saleItemId == Guid.Empty || actorId == Guid.Empty || baseCents < 0 || rateBasisPoints is < 0 or > 10_000 || amountCents < 0
            ? DomainResult.Failure<CommissionEntry>(DomainErrors.InvalidCommissionEntry)
            : DomainResult.Success(new CommissionEntry(id, barberId, saleItemId, CommissionEntryType.Earning, baseCents, rateBasisPoints, amountCents, null, null, actorId, at));

    public static DomainResult<CommissionEntry> CreateReversal(Guid id, CommissionEntry source, string? reason, Guid actorId, DateTimeOffset at)
    {
        var text = reason?.Trim();
        return id == Guid.Empty || actorId == Guid.Empty || source.Type != CommissionEntryType.Earning || string.IsNullOrWhiteSpace(text) || text.Length > 300
            ? DomainResult.Failure<CommissionEntry>(DomainErrors.InvalidCommissionEntry)
            : DomainResult.Success(new CommissionEntry(id, source.BarberId, null, CommissionEntryType.Reversal, source.BaseCents, source.RateBasisPoints, -source.AmountCents, source.Id, text, actorId, at));
    }

    public DomainResult<CommissionEntry> IncludeInSettlement() { if (Status != CommissionEntryStatus.Available) return DomainResult.Failure<CommissionEntry>(DomainErrors.InvalidStateTransition); Status = CommissionEntryStatus.Settled; return DomainResult.Success(this); }
    public DomainResult<CommissionEntry> MarkPaid() { if (Status != CommissionEntryStatus.Settled) return DomainResult.Failure<CommissionEntry>(DomainErrors.InvalidStateTransition); Status = CommissionEntryStatus.Paid; return DomainResult.Success(this); }
    public DomainResult<CommissionEntry> Void() { if (Status != CommissionEntryStatus.Available) return DomainResult.Failure<CommissionEntry>(DomainErrors.InvalidStateTransition); Status = CommissionEntryStatus.Voided; return DomainResult.Success(this); }
}
