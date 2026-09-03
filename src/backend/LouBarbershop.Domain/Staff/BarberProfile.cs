using LouBarbershop.Domain.Common;

namespace LouBarbershop.Domain.Staff;

public enum EmploymentType { Owner, Contractor }
public enum SettlementFrequency { Biweekly, Monthly }

public sealed class BarberProfile
{
    private BarberProfile() { }

    private BarberProfile(Guid id, Guid staffProfileId, EmploymentType employmentType, SettlementFrequency settlementFrequency, string? color, DateTimeOffset occurredAt)
    {
        Id = id;
        StaffProfileId = staffProfileId;
        EmploymentType = employmentType;
        SettlementFrequency = settlementFrequency;
        Color = color;
        Active = true;
        CreatedAt = occurredAt;
        UpdatedAt = occurredAt;
    }

    public Guid Id { get; private set; }
    public Guid StaffProfileId { get; private set; }
    public EmploymentType EmploymentType { get; private set; }
    public SettlementFrequency SettlementFrequency { get; private set; }
    public string? Color { get; private set; }
    public bool Active { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }
    public uint Version { get; private set; }

    public static DomainResult<BarberProfile> Create(Guid id, Guid staffProfileId, EmploymentType employmentType, SettlementFrequency settlementFrequency, string? color, DateTimeOffset occurredAt)
    {
        if (id == Guid.Empty || staffProfileId == Guid.Empty || !IsColor(color))
        {
            return DomainResult.Failure<BarberProfile>(DomainErrors.InvalidBarberProfile);
        }

        return DomainResult.Success(new BarberProfile(id, staffProfileId, employmentType, settlementFrequency, NormalizeColor(color), occurredAt.ToUniversalTime()));
    }

    public DomainResult<BarberProfile> Update(EmploymentType employmentType, SettlementFrequency settlementFrequency, string? color, bool active, DateTimeOffset occurredAt)
    {
        if (!IsColor(color)) return DomainResult.Failure<BarberProfile>(DomainErrors.InvalidBarberProfile);
        EmploymentType = employmentType;
        SettlementFrequency = settlementFrequency;
        Color = NormalizeColor(color);
        Active = active;
        UpdatedAt = occurredAt.ToUniversalTime();
        return DomainResult.Success(this);
    }

    private static bool IsColor(string? color) => string.IsNullOrWhiteSpace(color) || (color.Length == 7 && color[0] == '#' && color[1..].All(Uri.IsHexDigit));
    private static string? NormalizeColor(string? color) => string.IsNullOrWhiteSpace(color) ? null : color.ToUpperInvariant();
}
