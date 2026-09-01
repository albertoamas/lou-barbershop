namespace LouBarbershop.Infrastructure.Persistence;

public sealed class AuditLog
{
    public Guid Id { get; set; }

    public Guid? ActorUserId { get; set; }

    public required string Action { get; set; }

    public required string EntityType { get; set; }

    public Guid EntityId { get; set; }

    public string? RequestId { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
}
