using LouBarbershop.Domain.Common;
using LouBarbershop.Domain.Finance;

namespace LouBarbershop.Domain.Catalog;

public sealed class Product
{
    private Product() { Name = string.Empty; }
    private Product(Guid id, string name, string? brand, string? sku, string? description, Money price, int minimumStock, DateTimeOffset at)
    { Id = id; Name = name; Brand = brand; Sku = sku; Description = description; SalePrice = price; MinimumStock = minimumStock; Active = true; CreatedAt = at; UpdatedAt = at; }
    public Guid Id { get; private set; }
    public string Name { get; private set; }
    public string? Brand { get; private set; }
    public string? Sku { get; private set; }
    public string? Description { get; private set; }
    public Money SalePrice { get; private set; }
    public Money AverageCost { get; private set; } = Money.Zero;
    public int MinimumStock { get; private set; }
    public bool Active { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }
    public uint Version { get; private set; }

    public static DomainResult<Product> Create(Guid id, string? name, string? brand, string? sku, string? description, Money price, int minimumStock, DateTimeOffset at)
    {
        var normalized = name?.Trim();
        if (id == Guid.Empty || string.IsNullOrWhiteSpace(normalized) || normalized.Length > 120) return DomainResult.Failure<Product>(DomainErrors.InvalidCatalogName);
        if (minimumStock < 0) return DomainResult.Failure<Product>(DomainErrors.InvalidMinimumStock);
        return DomainResult.Success(new Product(id, normalized, Normalize(brand, 80), Normalize(sku, 50)?.ToUpperInvariant(), Normalize(description, 500), price, minimumStock, at.ToUniversalTime()));
    }

    public DomainResult<Product> Update(string? name, string? brand, string? sku, string? description, Money price, int minimumStock, bool active, DateTimeOffset at)
    {
        var normalized = name?.Trim();
        if (string.IsNullOrWhiteSpace(normalized) || normalized.Length > 120) return DomainResult.Failure<Product>(DomainErrors.InvalidCatalogName);
        if (minimumStock < 0) return DomainResult.Failure<Product>(DomainErrors.InvalidMinimumStock);
        Name = normalized; Brand = Normalize(brand, 80); Sku = Normalize(sku, 50)?.ToUpperInvariant(); Description = Normalize(description, 500); SalePrice = price; MinimumStock = minimumStock; Active = active; UpdatedAt = at.ToUniversalTime();
        return DomainResult.Success(this);
    }
    private static string? Normalize(string? value, int max) { var text = value?.Trim(); return string.IsNullOrEmpty(text) ? null : text[..Math.Min(text.Length, max)]; }
}
