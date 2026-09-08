using LouBarbershop.Domain.Common;
using LouBarbershop.Domain.Sales;

namespace LouBarbershop.Domain.Expenses;

public enum ExpenseStatus { Recorded, Voided }

public sealed class Expense
{
    private Expense() { Description = string.Empty; }
    private Expense(Guid id, Guid categoryId, DateOnly date, string description, long amount, PaymentMethod method, Guid actorId, DateTimeOffset at)
    { Id = id; CategoryId = categoryId; ExpenseDate = date; Description = description; AmountCents = amount; PaymentMethod = method; RecordedBy = actorId; CreatedAt = at.ToUniversalTime(); }
    public Guid Id { get; private set; }
    public Guid CategoryId { get; private set; }
    public DateOnly ExpenseDate { get; private set; }
    public string Description { get; private set; }
    public long AmountCents { get; private set; }
    public PaymentMethod PaymentMethod { get; private set; }
    public ExpenseStatus Status { get; private set; } = ExpenseStatus.Recorded;
    public string? VoidReason { get; private set; }
    public Guid RecordedBy { get; private set; }
    public Guid? VoidedBy { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset? VoidedAt { get; private set; }
    public uint Version { get; private set; }
    public static DomainResult<Expense> Create(Guid id, Guid categoryId, DateOnly date, string? description, long amount, PaymentMethod method, Guid actorId, DateTimeOffset at)
    { var text = description?.Trim(); return id == Guid.Empty || categoryId == Guid.Empty || actorId == Guid.Empty || date == default || string.IsNullOrWhiteSpace(text) || text.Length > 300 || amount <= 0 ? DomainResult.Failure<Expense>(DomainErrors.InvalidExpense) : DomainResult.Success(new Expense(id, categoryId, date, text, amount, method, actorId, at)); }
    public DomainResult<Expense> Void(string? reason, Guid actorId, DateTimeOffset at)
    { var text = reason?.Trim(); if (Status != ExpenseStatus.Recorded || actorId == Guid.Empty || string.IsNullOrWhiteSpace(text) || text.Length > 300) return DomainResult.Failure<Expense>(DomainErrors.InvalidStateTransition); Status = ExpenseStatus.Voided; VoidReason = text; VoidedBy = actorId; VoidedAt = at.ToUniversalTime(); return DomainResult.Success(this); }
}
