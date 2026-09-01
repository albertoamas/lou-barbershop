using LouBarbershop.Domain.Common;

namespace LouBarbershop.Domain.Finance;

public static class CommissionCalculator
{
    public static DomainResult<Money> Calculate(Money basis, CommissionRate rate)
    {
        if (rate.BasisPoints == 0)
        {
            return DomainResult.Success(Money.Zero);
        }

        var wholeUnits = basis.Cents / CommissionRate.MaximumBasisPoints;
        var remainder = basis.Cents % CommissionRate.MaximumBasisPoints;

        var roundedRemainder = (remainder * rate.BasisPoints + (CommissionRate.MaximumBasisPoints / 2))
            / CommissionRate.MaximumBasisPoints;

        if (wholeUnits > (long.MaxValue - roundedRemainder) / rate.BasisPoints)
        {
            return DomainResult.Failure<Money>(DomainErrors.MoneyOverflow);
        }

        var amount = (wholeUnits * rate.BasisPoints) + roundedRemainder;

        return Money.Create(amount);
    }
}
