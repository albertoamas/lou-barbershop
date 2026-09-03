using LouBarbershop.Domain.Common;
using LouBarbershop.Domain.Finance;

namespace LouBarbershop.Domain.Catalog;

public sealed class BarberServiceOffering
{
    private BarberServiceOffering() { }
    private BarberServiceOffering(Guid id, Guid barberId, Guid serviceId, int duration, Money price, EffectivePeriod period, DateTimeOffset at)
    { Id = id; BarberId = barberId; ServiceId = serviceId; DurationMinutes = duration; Price = price; Period = period; Active = true; CreatedAt = at; UpdatedAt = at; }

    public Guid Id { get; private set; }
    public Guid BarberId { get; private set; }
    public Guid ServiceId { get; private set; }
    public int DurationMinutes { get; private set; }
    public Money Price { get; private set; }
    public EffectivePeriod Period { get; private set; }
    public bool Active { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }
    public uint Version { get; private set; }

    public static DomainResult<BarberServiceOffering> Create(Guid id, Guid barberId, Guid serviceId, int duration, Money price, EffectivePeriod period, DateTimeOffset at)
    {
        if (id == Guid.Empty || barberId == Guid.Empty || serviceId == Guid.Empty) return DomainResult.Failure<BarberServiceOffering>(DomainErrors.InvalidBarberProfile);
        if (duration is < 5 or > 480) return DomainResult.Failure<BarberServiceOffering>(DomainErrors.InvalidDuration);
        return DomainResult.Success(new BarberServiceOffering(id, barberId, serviceId, duration, price, period, at.ToUniversalTime()));
    }

    public void Deactivate(DateTimeOffset at) { Active = false; UpdatedAt = at.ToUniversalTime(); }
}
