namespace LouBarbershop.Domain.Common;

public readonly record struct EffectivePeriod
{
    private EffectivePeriod(DateOnly validFrom, DateOnly? validTo)
    {
        ValidFrom = validFrom;
        ValidTo = validTo;
    }

    public DateOnly ValidFrom { get; }

    public DateOnly? ValidTo { get; }

    public static DomainResult<EffectivePeriod> Create(DateOnly validFrom, DateOnly? validTo) =>
        validTo.HasValue && validTo.Value < validFrom
            ? DomainResult.Failure<EffectivePeriod>(DomainErrors.InvalidEffectivePeriod)
            : DomainResult.Success(new EffectivePeriod(validFrom, validTo));

    public bool Contains(DateOnly date) => date >= ValidFrom && (!ValidTo.HasValue || date <= ValidTo.Value);

    public bool Overlaps(EffectivePeriod other) =>
        (!ValidTo.HasValue || other.ValidFrom <= ValidTo.Value)
        && (!other.ValidTo.HasValue || ValidFrom <= other.ValidTo.Value);
}
