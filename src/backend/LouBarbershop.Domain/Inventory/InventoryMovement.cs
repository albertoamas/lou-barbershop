using LouBarbershop.Domain.Common;

namespace LouBarbershop.Domain.Inventory;

public enum InventoryMovementType { Opening, PurchaseReceipt, Sale, SaleReversal, CountAdjustment, Damage, Loss, InternalUse }

public sealed class InventoryMovement
{
    private InventoryMovement() { }
    private InventoryMovement(Guid id, Guid productId, InventoryMovementType type, int quantityDelta, long unitCostCents, Guid? receiptItemId, Guid? saleItemId, string? reason, Guid actorId, DateTimeOffset at)
    {
        Id = id; ProductId = productId; Type = type; QuantityDelta = quantityDelta; UnitCostCents = unitCostCents; ReceiptItemId = receiptItemId; SaleItemId = saleItemId; Reason = reason?.Trim(); CreatedBy = actorId; OccurredAt = at.ToUniversalTime();
    }
    public Guid Id { get; private set; }
    public Guid ProductId { get; private set; }
    public InventoryMovementType Type { get; private set; }
    public int QuantityDelta { get; private set; }
    public long UnitCostCents { get; private set; }
    public Guid? ReceiptItemId { get; private set; }
    public Guid? SaleItemId { get; private set; }
    public string? Reason { get; private set; }
    public Guid CreatedBy { get; private set; }
    public DateTimeOffset OccurredAt { get; private set; }

    public static DomainResult<InventoryMovement> Create(Guid id, Guid productId, InventoryMovementType type, int quantityDelta, long unitCostCents, Guid? receiptItemId, Guid? saleItemId, string? reason, Guid actorId, DateTimeOffset at) =>
        id == Guid.Empty || productId == Guid.Empty || actorId == Guid.Empty || quantityDelta == 0 || unitCostCents < 0
            ? DomainResult.Failure<InventoryMovement>(DomainErrors.InvalidInventoryMovement)
            : DomainResult.Success(new InventoryMovement(id, productId, type, quantityDelta, unitCostCents, receiptItemId, saleItemId, reason, actorId, at));
}
