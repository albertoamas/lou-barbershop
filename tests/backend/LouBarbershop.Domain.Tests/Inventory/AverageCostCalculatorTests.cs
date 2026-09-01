using LouBarbershop.Domain.Common;
using LouBarbershop.Domain.Finance;
using LouBarbershop.Domain.Inventory;

namespace LouBarbershop.Domain.Tests.Inventory;

public sealed class AverageCostCalculatorTests
{
    [Fact]
    public void CalculateWhenReceivingStockReturnsRoundedWeightedAverage()
    {
        var result = AverageCostCalculator.Calculate(
            2,
            Money.Create(1_000).Value,
            Quantity.Create(3).Value,
            Money.Create(2_000).Value);

        Assert.True(result.IsSuccess);
        Assert.Equal(1_600, result.Value.Cents);
    }

    [Fact]
    public void CalculateWhenCurrentQuantityIsNegativeReturnsValidationError()
    {
        var result = AverageCostCalculator.Calculate(
            -1,
            Money.Zero,
            Quantity.Create(1).Value,
            Money.Create(100).Value);

        Assert.False(result.IsSuccess);
        Assert.Equal("inventory.invalid_average_cost", result.Error?.Code);
    }
}
