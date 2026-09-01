using LouBarbershop.Domain.Common;

namespace LouBarbershop.Domain.Finance;

public readonly record struct Money
{
    private Money(long cents) => Cents = cents;

    public long Cents { get; }

    public static Money Zero => new(0);

    public static DomainResult<Money> Create(long cents) => cents < 0
        ? DomainResult.Failure<Money>(DomainErrors.InvalidMoneyAmount)
        : DomainResult.Success(new Money(cents));

    public DomainResult<Money> Add(Money other)
    {
        if (long.MaxValue - Cents < other.Cents)
        {
            return DomainResult.Failure<Money>(DomainErrors.MoneyOverflow);
        }

        return DomainResult.Success(new Money(Cents + other.Cents));
    }

    public DomainResult<Money> Subtract(Money other) => Cents < other.Cents
        ? DomainResult.Failure<Money>(DomainErrors.NegativeResult)
        : DomainResult.Success(new Money(Cents - other.Cents));
}
