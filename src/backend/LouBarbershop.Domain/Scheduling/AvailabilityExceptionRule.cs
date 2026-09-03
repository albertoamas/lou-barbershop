using LouBarbershop.Domain.Common;

namespace LouBarbershop.Domain.Scheduling;

public enum AvailabilityExceptionKind { Unavailable, AvailableOverride }

public sealed class AvailabilityExceptionRule
{
    private AvailabilityExceptionRule() { Reason = string.Empty; }

    private AvailabilityExceptionRule(Guid id, Guid barberId, TimeRange range, AvailabilityExceptionKind kind, string reason, Guid createdBy, DateTimeOffset at)
    {
        Id = id;
        BarberId = barberId;
        Range = range;
        Kind = kind;
        Reason = reason;
        CreatedBy = createdBy;
        Active = true;
        CreatedAt = at;
        UpdatedAt = at;
    }

    public Guid Id { get; private set; }
    public Guid BarberId { get; private set; }
    public TimeRange Range { get; private set; }
    public AvailabilityExceptionKind Kind { get; private set; }
    public string Reason { get; private set; }
    public Guid CreatedBy { get; private set; }
    public bool Active { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }
    public uint Version { get; private set; }

    public static DomainResult<AvailabilityExceptionRule> Create(Guid id, Guid barberId, TimeRange range, AvailabilityExceptionKind kind, string? reason, Guid createdBy, DateTimeOffset at)
    {
        var normalizedReason = reason?.Trim();
        if (id == Guid.Empty || barberId == Guid.Empty || createdBy == Guid.Empty || string.IsNullOrWhiteSpace(normalizedReason) || normalizedReason.Length > 300)
            return DomainResult.Failure<AvailabilityExceptionRule>(DomainErrors.InvalidAvailabilityException);

        return DomainResult.Success(new AvailabilityExceptionRule(id, barberId, range, kind, normalizedReason, createdBy, at.ToUniversalTime()));
    }

    public void Deactivate(DateTimeOffset at)
    {
        Active = false;
        UpdatedAt = at.ToUniversalTime();
    }
}
