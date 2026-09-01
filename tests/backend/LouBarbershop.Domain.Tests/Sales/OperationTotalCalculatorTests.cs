using LouBarbershop.Domain.Finance;
using LouBarbershop.Domain.Sales;

namespace LouBarbershop.Domain.Tests.Sales;

public sealed class OperationTotalCalculatorTests
{
    [Fact]
    public void CalculateWhenAdjustmentsFitSubtotalReturnsNetTotal()
    {
        var result = OperationTotalCalculator.Calculate(Money.Create(7_000).Value, Money.Create(1_000).Value, Money.Create(500).Value);

        Assert.True(result.IsSuccess);
        Assert.Equal(5_500, result.Value.Total.Cents);
    }

    [Fact]
    public void CalculateWhenAdjustmentsExceedSubtotalReturnsValidationError()
    {
        var result = OperationTotalCalculator.Calculate(Money.Create(1_000).Value, Money.Create(1_001).Value, Money.Zero);

        Assert.False(result.IsSuccess);
        Assert.Equal("operation.invalid_adjustment", result.Error?.Code);
    }
}
