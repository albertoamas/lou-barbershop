using LouBarbershop.Domain.Common;
using LouBarbershop.Domain.Sales;

namespace LouBarbershop.Domain.Inventory;

public enum InventoryReceiptStatus { Confirmed, Reversed }

public sealed class InventoryReceipt
{
    private readonly List<InventoryReceiptItem> _items = [];
    private InventoryReceipt() { }
    private InventoryReceipt(Guid id, DateOnly date, PaymentMethod method, string? reference, string? note, Guid actorId, DateTimeOffset at, IEnumerable<InventoryReceiptItem> items, long total)
    { Id = id; ReceiptDate = date; PaymentMethod = method; Reference = reference; Note = note; CreatedBy = actorId; CreatedAt = at.ToUniversalTime(); TotalCents = total; _items.AddRange(items); }
    public Guid Id { get; private set; }
    public DateOnly ReceiptDate { get; private set; }
    public PaymentMethod PaymentMethod { get; private set; }
    public long TotalCents { get; private set; }
    public string? Reference { get; private set; }
    public string? Note { get; private set; }
    public InventoryReceiptStatus Status { get; private set; } = InventoryReceiptStatus.Confirmed;
    public Guid CreatedBy { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public uint Version { get; private set; }
    public IReadOnlyCollection<InventoryReceiptItem> Items => _items;

    public static DomainResult<InventoryReceipt> Create(Guid id, DateOnly date, PaymentMethod method, string? reference, string? note, Guid actorId, DateTimeOffset at, IEnumerable<InventoryReceiptItem> items)
    {
        var rows = items.ToArray();
        if (id == Guid.Empty || actorId == Guid.Empty || date == default || rows.Length == 0 || rows.Any(x => x.ReceiptId != id || x.ProductId == Guid.Empty || x.Quantity <= 0 || x.UnitCostCents <= 0) || rows.GroupBy(x => x.ProductId).Any(x => x.Count() > 1))
            return DomainResult.Failure<InventoryReceipt>(DomainErrors.InvalidInventoryReceipt);
        try { return DomainResult.Success(new InventoryReceipt(id, date, method, Normalize(reference, 120), Normalize(note, 500), actorId, at, rows, rows.Sum(x => checked((long)x.Quantity * x.UnitCostCents)))); }
        catch (OverflowException) { return DomainResult.Failure<InventoryReceipt>(DomainErrors.MoneyOverflow); }
    }
    private static string? Normalize(string? value, int max) { var text = value?.Trim(); return string.IsNullOrEmpty(text) ? null : text[..Math.Min(text.Length, max)]; }
}
