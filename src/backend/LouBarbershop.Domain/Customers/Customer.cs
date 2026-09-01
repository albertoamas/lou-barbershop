using LouBarbershop.Domain.Common;

namespace LouBarbershop.Domain.Customers;

public sealed class Customer
{
    private Customer()
    {
        DisplayName = string.Empty;
    }

    private Customer(
        Guid id,
        string displayName,
        PhoneNumber phoneNumber,
        string? notes,
        DateTimeOffset occurredAt)
    {
        Id = id;
        DisplayName = displayName;
        PhoneNumber = phoneNumber;
        Notes = notes;
        Active = true;
        CreatedAt = occurredAt;
        UpdatedAt = occurredAt;
    }

    public Guid Id { get; private set; }

    public string DisplayName { get; private set; }

    public PhoneNumber PhoneNumber { get; private set; }

    public string? Notes { get; private set; }

    public bool Active { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    public DateTimeOffset UpdatedAt { get; private set; }

    public uint Version { get; private set; }

    public static DomainResult<Customer> Create(
        Guid id,
        string? displayName,
        PhoneNumber phoneNumber,
        string? notes,
        DateTimeOffset occurredAt)
    {
        var normalizedName = displayName?.Trim();

        if (id == Guid.Empty
            || string.IsNullOrWhiteSpace(normalizedName)
            || normalizedName.Length > 120)
        {
            return DomainResult.Failure<Customer>(DomainErrors.InvalidCustomerName);
        }

        return DomainResult.Success(
            new Customer(id, normalizedName, phoneNumber, NormalizeNotes(notes), occurredAt.ToUniversalTime()));
    }

    public DomainResult<Customer> UpdateDetails(
        string? displayName,
        PhoneNumber phoneNumber,
        string? notes,
        DateTimeOffset occurredAt)
    {
        var normalizedName = displayName?.Trim();

        if (string.IsNullOrWhiteSpace(normalizedName) || normalizedName.Length > 120)
        {
            return DomainResult.Failure<Customer>(DomainErrors.InvalidCustomerName);
        }

        DisplayName = normalizedName;
        PhoneNumber = phoneNumber;
        Notes = NormalizeNotes(notes);
        UpdatedAt = occurredAt.ToUniversalTime();

        return DomainResult.Success(this);
    }

    public void Archive(DateTimeOffset occurredAt)
    {
        Active = false;
        UpdatedAt = occurredAt.ToUniversalTime();
    }

    private static string? NormalizeNotes(string? notes)
    {
        var normalized = notes?.Trim();
        return string.IsNullOrEmpty(normalized) ? null : normalized;
    }
}
