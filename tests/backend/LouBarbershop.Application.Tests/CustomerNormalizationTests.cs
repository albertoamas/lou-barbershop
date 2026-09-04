using LouBarbershop.Application.Agenda;

namespace LouBarbershop.Application.Tests;

public sealed class CustomerNormalizationTests
{
    [Theory]
    [InlineData("7123 4567", "+59171234567")]
    [InlineData("+591 (7123)-4567", "+59171234567")]
    [InlineData("0059171234567", "+59171234567")]
    public void NormalizesSupportedPhoneFormats(string input, string expected) => Assert.Equal(expected, CustomerService.NormalizePhone(input).Value.Value);

    [Theory]
    [InlineData("")]
    [InlineData("abc71234567")]
    public void RejectsInvalidPhones(string input) => Assert.False(CustomerService.NormalizePhone(input).IsSuccess);
}
