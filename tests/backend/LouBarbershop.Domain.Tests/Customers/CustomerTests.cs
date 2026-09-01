using LouBarbershop.Domain.Customers;

namespace LouBarbershop.Domain.Tests.Customers;

public sealed class CustomerTests
{
    [Fact]
    public void CreateWhenDetailsAreValidNormalizesAndActivatesCustomer()
    {
        var phoneNumber = PhoneNumber.Create(" +59171234567 ").Value;
        var occurredAt = new DateTimeOffset(2026, 9, 1, 8, 0, 0, TimeSpan.FromHours(-4));

        var result = Customer.Create(
            Guid.Parse("d2098054-9574-423c-9c63-b3cf9183eebb"),
            "  Alberto  ",
            phoneNumber,
            "  Cliente frecuente  ",
            occurredAt);

        Assert.True(result.IsSuccess);
        Assert.Equal("Alberto", result.Value.DisplayName);
        Assert.Equal("+59171234567", result.Value.PhoneNumber.Value);
        Assert.Equal("Cliente frecuente", result.Value.Notes);
        Assert.True(result.Value.Active);
        Assert.Equal(TimeSpan.Zero, result.Value.CreatedAt.Offset);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void CreateWhenNameIsMissingReturnsValidationError(string? displayName)
    {
        var phoneNumber = PhoneNumber.Create("+59171234567").Value;

        var result = Customer.Create(Guid.NewGuid(), displayName, phoneNumber, null, DateTimeOffset.UtcNow);

        Assert.False(result.IsSuccess);
        Assert.Equal("customer.invalid_name", result.Error?.Code);
    }

    [Fact]
    public void ArchiveMarksCustomerInactiveAndUpdatesTimestamp()
    {
        var phoneNumber = PhoneNumber.Create("+59171234567").Value;
        var customer = Customer.Create(Guid.NewGuid(), "Alberto", phoneNumber, null, DateTimeOffset.UtcNow).Value;
        var archivedAt = new DateTimeOffset(2026, 9, 2, 16, 30, 0, TimeSpan.Zero);

        customer.Archive(archivedAt);

        Assert.False(customer.Active);
        Assert.Equal(archivedAt, customer.UpdatedAt);
    }
}
