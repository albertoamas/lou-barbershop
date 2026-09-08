namespace LouBarbershop.Infrastructure.Persistence;

public sealed class CommissionEntryRow
{
    public Guid Id { get; set; }
    public Guid BarberId { get; set; }
    public Guid SaleItemId { get; set; }
    public long BaseCents { get; set; }
    public int RateBasisPoints { get; set; }
    public long AmountCents { get; set; }
    public string Status { get; set; } = "AVAILABLE";
    public Guid CreatedBy { get; set; }
    public DateTimeOffset EarnedAt { get; set; }
}
public sealed class IdempotencyRow
{
    public Guid Id { get; set; }
    public string KeyHash { get; set; } = string.Empty;
    public Guid OperationId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
