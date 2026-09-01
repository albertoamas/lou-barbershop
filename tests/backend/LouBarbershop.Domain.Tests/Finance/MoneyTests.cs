using LouBarbershop.Domain.Finance;

namespace LouBarbershop.Domain.Tests.Finance;

public sealed class MoneyTests
{
    [Fact]
    public void Create_WhenCentsAreNegative_ReturnsValidationError()
    {
        var result = Money.Create(-1);

        Assert.False(result.IsSuccess);
        Assert.Equal("money.invalid_amount", result.Error?.Code);
    }

    [Fact]
    public void Add_WhenSumFitsInLong_ReturnsExactCents()
    {
        var left = Money.Create(7_050).Value;
        var right = Money.Create(2_950).Value;

        var result = left.Add(right);

        Assert.True(result.IsSuccess);
        Assert.Equal(10_000, result.Value.Cents);
    }

    [Fact]
    public void Add_WhenSumOverflows_ReturnsValidationError()
    {
        var left = Money.Create(long.MaxValue).Value;
        var right = Money.Create(1).Value;

        var result = left.Add(right);

        Assert.False(result.IsSuccess);
        Assert.Equal("money.overflow", result.Error?.Code);
    }

    [Fact]
    public void Subtract_WhenResultWouldBeNegative_ReturnsValidationError()
    {
        var amount = Money.Create(100).Value;
        var discount = Money.Create(101).Value;

        var result = amount.Subtract(discount);

        Assert.False(result.IsSuccess);
        Assert.Equal("money.negative_result", result.Error?.Code);
    }
}
