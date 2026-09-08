using LouBarbershop.Domain.Catalog;
using LouBarbershop.Domain.Expenses;
using LouBarbershop.Domain.Inventory;
using LouBarbershop.Domain.Sales;

namespace LouBarbershop.Application.Inventory;

public enum InventoryStatus { Success, Invalid, Forbidden, NotFound, Conflict }
public sealed record InventoryResult<T>(InventoryStatus Status, T? Value = default, string? Code = null, string? Message = null);
public sealed record ReceiptItemInput(Guid ProductId, int Quantity, long UnitCostCents);
public sealed record ReceiptInput(DateOnly ReceiptDate, PaymentMethod PaymentMethod, string? Reference, string? Note, IReadOnlyCollection<ReceiptItemInput> Items);
public sealed record AdjustmentInput(int QuantityDelta, InventoryMovementType Type, string Reason);
public sealed record ExpenseInput(Guid CategoryId, DateOnly ExpenseDate, string Description, long AmountCents, PaymentMethod PaymentMethod);
public sealed record InventoryView(Guid ProductId, string Name, string? Sku, long SalePriceCents, long? AverageCostCents, int Quantity, int MinimumStock, bool LowStock, bool Active);
public sealed record MovementView(Guid Id, Guid ProductId, InventoryMovementType Type, int QuantityDelta, long UnitCostCents, string? Reason, DateTimeOffset OccurredAt);
public sealed record ReceiptItemView(Guid Id, Guid ProductId, string ProductName, int Quantity, long UnitCostCents, long LineTotalCents);
public sealed record ReceiptView(Guid Id, DateOnly ReceiptDate, PaymentMethod PaymentMethod, long TotalCents, string? Reference, string? Note, InventoryReceiptStatus Status, DateTimeOffset CreatedAt, uint Version, IReadOnlyCollection<ReceiptItemView> Items);
public sealed record ExpenseView(Guid Id, Guid CategoryId, string CategoryName, DateOnly ExpenseDate, string Description, long AmountCents, PaymentMethod PaymentMethod, ExpenseStatus Status, string? VoidReason, uint Version);
public sealed record CashFlowView(DateOnly DateFrom, DateOnly DateTo, long SalesCashCents, long SalesQrCents, long InventoryCashCents, long InventoryQrCents, long ExpenseCashCents, long ExpenseQrCents, long NetCashCents, long NetQrCents);

public interface IInventoryTransaction : IAsyncDisposable { Task CommitAsync(CancellationToken ct); }
public interface IInventoryStore
{
    Task<IInventoryTransaction> BeginAsync(CancellationToken ct);
    Task<Product?> FindProductAsync(Guid id, CancellationToken ct);
    Task<int> QuantityAsync(Guid productId, CancellationToken ct);
    Task<bool> ExpenseCategoryActiveAsync(Guid id, CancellationToken ct);
    Task<Expense?> FindExpenseAsync(Guid id, CancellationToken ct);
    Task<IReadOnlyCollection<InventoryView>> ListInventoryAsync(CancellationToken ct);
    Task<IReadOnlyCollection<MovementView>> ListMovementsAsync(Guid productId, CancellationToken ct);
    Task<IReadOnlyCollection<ReceiptView>> ListReceiptsAsync(CancellationToken ct);
    Task<IReadOnlyCollection<ExpenseView>> ListExpensesAsync(DateOnly? dateFrom, DateOnly? dateTo, CancellationToken ct);
    Task<CashFlowView> CashFlowAsync(DateOnly dateFrom, DateOnly dateTo, CancellationToken ct);
    void Add(InventoryReceipt value);
    void Add(InventoryMovement value);
    void Add(Expense value);
    Task SaveChangesAsync(CancellationToken ct);
}
