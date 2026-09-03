using LouBarbershop.Domain.Common;
using LouBarbershop.Domain.Finance;

namespace LouBarbershop.Domain.Commissions;

public enum CommissionKind { Service, Product }

public sealed class CommissionRule
{
    private CommissionRule() { }
    private CommissionRule(Guid id, Guid barberId, CommissionKind kind, CommissionRate rate, EffectivePeriod period, Guid createdBy, DateTimeOffset at)
    { Id = id; BarberId = barberId; Kind = kind; Rate = rate; Period = period; CreatedBy = createdBy; Active = true; CreatedAt = at; UpdatedAt = at; }
    public Guid Id { get; private set; }
    public Guid BarberId { get; private set; }
    public CommissionKind Kind { get; private set; }
    public CommissionRate Rate { get; private set; }
    public EffectivePeriod Period { get; private set; }
    public Guid CreatedBy { get; private set; }
    public bool Active { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }
    public uint Version { get; private set; }

    public static DomainResult<CommissionRule> Create(Guid id, Guid barberId, CommissionKind kind, CommissionRate rate, EffectivePeriod period, Guid createdBy, DateTimeOffset at) =>
        id == Guid.Empty || barberId == Guid.Empty || createdBy == Guid.Empty
            ? DomainResult.Failure<CommissionRule>(DomainErrors.InvalidBarberProfile)
            : DomainResult.Success(new CommissionRule(id, barberId, kind, rate, period, createdBy, at.ToUniversalTime()));

    public void Deactivate(DateTimeOffset at) { Active = false; UpdatedAt = at.ToUniversalTime(); }
}
