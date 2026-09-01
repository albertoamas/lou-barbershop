using LouBarbershop.Domain.Common;

namespace LouBarbershop.Domain.Customers;

public readonly record struct PhoneNumber
{
    private PhoneNumber(string value) => Value = value;

    public string Value { get; }

    public static DomainResult<PhoneNumber> Create(string? value)
    {
        var normalized = value?.Trim();

        if (string.IsNullOrWhiteSpace(normalized)
            || normalized.Length is < 8 or > 16
            || normalized[0] != '+'
            || normalized.Skip(1).Any(character => !char.IsAsciiDigit(character)))
        {
            return DomainResult.Failure<PhoneNumber>(DomainErrors.InvalidPhoneNumber);
        }

        return DomainResult.Success(new PhoneNumber(normalized));
    }
}
