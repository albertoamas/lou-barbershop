using LouBarbershop.Domain.Common;
using LouBarbershop.Domain.Finance;

namespace LouBarbershop.Domain.Inventory;

public static class AverageCostCalculator
{
    public static DomainResult<Money> Calculate(
        int currentQuantity,
        Money currentAverageCost,
        Quantity receivedQuantity,
        Money receivedUnitCost)
    {
        if (currentQuantity < 0)
        {
            return DomainResult.Failure<Money>(DomainErrors.InvalidAverageCost);
        }

        var totalQuantity = (long)currentQuantity + receivedQuantity.Value;

        if (!TryMultiply(currentQuantity, currentAverageCost.Cents, out var currentValue)
            || !TryMultiply(receivedQuantity.Value, receivedUnitCost.Cents, out var receivedValue))
        {
            return DomainResult.Failure<Money>(DomainErrors.MoneyOverflow);
        }

        if (currentValue > long.MaxValue - receivedValue)
        {
            return DomainResult.Failure<Money>(DomainErrors.MoneyOverflow);
        }

        var totalValue = currentValue + receivedValue;
        var roundedAverage = (totalValue + (totalQuantity / 2)) / totalQuantity;

        return Money.Create(roundedAverage);
    }

    private static bool TryMultiply(int quantity, long unitCost, out long result)
    {
        result = 0;

        if (quantity == 0 || unitCost == 0)
        {
            return true;
        }

        if (unitCost > long.MaxValue / quantity)
        {
            return false;
        }

        result = quantity * unitCost;
        return true;
    }
}
