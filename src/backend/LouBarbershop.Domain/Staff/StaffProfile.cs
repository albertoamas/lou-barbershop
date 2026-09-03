using LouBarbershop.Domain.Common;

namespace LouBarbershop.Domain.Staff;

public sealed class StaffProfile
{
    private StaffProfile() => DisplayName = string.Empty;

    private StaffProfile(Guid id, Guid userId, string displayName, string? phone, DateTimeOffset occurredAt)
    {
        Id = id;
        UserId = userId;
        DisplayName = displayName;
        Phone = phone;
        Active = true;
        CreatedAt = occurredAt;
        UpdatedAt = occurredAt;
    }

    public Guid Id { get; private set; }
    public Guid UserId { get; private set; }
    public string DisplayName { get; private set; }
    public string? Phone { get; private set; }
    public bool Active { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }
    public uint Version { get; private set; }

    public static DomainResult<StaffProfile> Create(Guid id, Guid userId, string? displayName, string? phone, DateTimeOffset occurredAt)
    {
        var name = displayName?.Trim();
        if (id == Guid.Empty || userId == Guid.Empty || string.IsNullOrWhiteSpace(name) || name.Length > 120)
        {
            return DomainResult.Failure<StaffProfile>(DomainErrors.InvalidStaffProfile);
        }

        return DomainResult.Success(new StaffProfile(id, userId, name, Normalize(phone, 30), occurredAt.ToUniversalTime()));
    }

    public DomainResult<StaffProfile> Update(string? displayName, string? phone, bool active, DateTimeOffset occurredAt)
    {
        var name = displayName?.Trim();
        if (string.IsNullOrWhiteSpace(name) || name.Length > 120)
        {
            return DomainResult.Failure<StaffProfile>(DomainErrors.InvalidStaffProfile);
        }

        DisplayName = name;
        Phone = Normalize(phone, 30);
        Active = active;
        UpdatedAt = occurredAt.ToUniversalTime();
        return DomainResult.Success(this);
    }

    private static string? Normalize(string? value, int maximumLength)
    {
        var normalized = value?.Trim();
        return string.IsNullOrEmpty(normalized) ? null : normalized[..Math.Min(normalized.Length, maximumLength)];
    }
}
