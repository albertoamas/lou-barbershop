namespace LouBarbershop.Infrastructure.Persistence;

public sealed class AppointmentEventRecord
{
    public Guid Id { get; set; }
    public Guid AppointmentId { get; set; }
    public Guid? ActorId { get; set; }
    public DateTimeOffset OccurredAt { get; set; }
    public string Action { get; set; } = string.Empty;
    public string? Reason { get; set; }
    public string? BeforeData { get; set; }
    public string AfterData { get; set; } = string.Empty;
}
