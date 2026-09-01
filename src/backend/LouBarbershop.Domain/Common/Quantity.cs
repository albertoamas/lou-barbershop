namespace LouBarbershop.Domain.Common;

public readonly record struct Quantity
{
    private Quantity(int value) => Value = value;

    public int Value { get; }

    public static DomainResult<Quantity> Create(int value) => value <= 0
        ? DomainResult.Failure<Quantity>(DomainErrors.InvalidQuantity)
        : DomainResult.Success(new Quantity(value));
}
