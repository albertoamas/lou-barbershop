using LouBarbershop.Domain.Finance;

namespace LouBarbershop.Domain.Tests.Finance;

public sealed class CommissionCalculatorTests
{
    [Theory]
    [InlineData(1, 5_000, 1)]
    [InlineData(5_050, 2_500, 1_263)]
    [InlineData(7_000, 10_000, 7_000)]
    public void Calculate_RoundsEachEntryHalfUp(long basisCents, int basisPoints, long expectedCents)
    {
        var basis = Money.Create(basisCents).Value;
        var rate = CommissionRate.Create(basisPoints).Value;

        var result = CommissionCalculator.Calculate(basis, rate);

        Assert.True(result.IsSuccess);
        Assert.Equal(expectedCents, result.Value.Cents);
    }

    [Fact]
    public void Calculate_WhenRateIsZero_ReturnsZero()
    {
        var basis = Money.Create(7_050).Value;
        var rate = CommissionRate.Create(0).Value;

        var result = CommissionCalculator.Calculate(basis, rate);

        Assert.True(result.IsSuccess);
        Assert.Equal(0, result.Value.Cents);
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(10_001)]
    public void Create_WhenRateIsOutsideBasisPointRange_ReturnsValidationError(int basisPoints)
    {
        var result = CommissionRate.Create(basisPoints);

        Assert.False(result.IsSuccess);
        Assert.Equal("commission.invalid_rate", result.Error?.Code);
    }
}
