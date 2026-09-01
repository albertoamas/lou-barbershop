using LouBarbershop.Domain.Customers;

namespace LouBarbershop.Domain.Tests.Customers;

public sealed class PhoneNumberTests
{
    [Theory]
    [InlineData("+59171234567")]
    [InlineData(" +59171234567 ")]
    public void Create_WhenValueUsesE164_ReturnsNormalizedPhone(string value)
    {
        var result = PhoneNumber.Create(value);

        Assert.True(result.IsSuccess);
        Assert.Equal("+59171234567", result.Value.Value);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("59171234567")]
    [InlineData("+591-71234567")]
    [InlineData("+591712")]
    public void Create_WhenValueIsNotE164_ReturnsValidationError(string? value)
    {
        var result = PhoneNumber.Create(value);

        Assert.False(result.IsSuccess);
        Assert.Equal("customer.invalid_phone_number", result.Error?.Code);
    }
}
