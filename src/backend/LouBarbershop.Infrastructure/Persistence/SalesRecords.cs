namespace LouBarbershop.Infrastructure.Persistence;

public sealed class IdempotencyRow
{
    public Guid Id { get; set; }
    public string KeyHash { get; set; } = string.Empty;
    public Guid OperationId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
