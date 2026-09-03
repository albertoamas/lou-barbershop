using LouBarbershop.Domain.Common;

namespace LouBarbershop.Domain.Expenses;

public sealed class ExpenseCategory
{
    private ExpenseCategory() => Name = string.Empty;
    private ExpenseCategory(Guid id, string name, DateTimeOffset at) { Id = id; Name = name; Active = true; CreatedAt = at; UpdatedAt = at; }
    public Guid Id { get; private set; }
    public string Name { get; private set; }
    public bool Active { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }
    public uint Version { get; private set; }
    public static DomainResult<ExpenseCategory> Create(Guid id, string? name, DateTimeOffset at)
    { var text = name?.Trim(); return id == Guid.Empty || string.IsNullOrWhiteSpace(text) || text.Length > 120 ? DomainResult.Failure<ExpenseCategory>(DomainErrors.InvalidCatalogName) : DomainResult.Success(new ExpenseCategory(id, text, at.ToUniversalTime())); }
    public DomainResult<ExpenseCategory> Update(string? name, bool active, DateTimeOffset at)
    { var text = name?.Trim(); if (string.IsNullOrWhiteSpace(text) || text.Length > 120) return DomainResult.Failure<ExpenseCategory>(DomainErrors.InvalidCatalogName); Name = text; Active = active; UpdatedAt = at.ToUniversalTime(); return DomainResult.Success(this); }
}
