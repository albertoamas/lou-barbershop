using LouBarbershop.Domain.Common;
using LouBarbershop.Domain.Finance;

namespace LouBarbershop.Domain.Catalog;

public sealed class Service
{
    private Service() { Name = string.Empty; Description = string.Empty; }
    private Service(Guid id, string name, string? description, int duration, Money price, DateTimeOffset at)
    { Id = id; Name = name; Description = description; DefaultDurationMinutes = duration; DefaultPrice = price; Active = true; CreatedAt = at; UpdatedAt = at; }

    public Guid Id { get; private set; }
    public string Name { get; private set; }
    public string? Description { get; private set; }
    public int DefaultDurationMinutes { get; private set; }
    public Money DefaultPrice { get; private set; }
    public bool Active { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }
    public uint Version { get; private set; }

    public static DomainResult<Service> Create(Guid id, string? name, string? description, int duration, Money price, DateTimeOffset at)
    {
        var normalized = name?.Trim();
        if (id == Guid.Empty || string.IsNullOrWhiteSpace(normalized) || normalized.Length > 120) return DomainResult.Failure<Service>(DomainErrors.InvalidCatalogName);
        if (duration is < 5 or > 480) return DomainResult.Failure<Service>(DomainErrors.InvalidDuration);
        return DomainResult.Success(new Service(id, normalized, Normalize(description, 500), duration, price, at.ToUniversalTime()));
    }

    public DomainResult<Service> Update(string? name, string? description, int duration, Money price, bool active, DateTimeOffset at)
    {
        var normalized = name?.Trim();
        if (string.IsNullOrWhiteSpace(normalized) || normalized.Length > 120) return DomainResult.Failure<Service>(DomainErrors.InvalidCatalogName);
        if (duration is < 5 or > 480) return DomainResult.Failure<Service>(DomainErrors.InvalidDuration);
        Name = normalized; Description = Normalize(description, 500); DefaultDurationMinutes = duration; DefaultPrice = price; Active = active; UpdatedAt = at.ToUniversalTime();
        return DomainResult.Success(this);
    }

    private static string? Normalize(string? value, int max) { var text = value?.Trim(); return string.IsNullOrEmpty(text) ? null : text[..Math.Min(text.Length, max)]; }
}
