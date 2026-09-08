namespace LouBarbershop.Domain.Inventory;

public sealed class InventoryReceiptItem
{
    private InventoryReceiptItem() { }

    public InventoryReceiptItem(Guid id, Guid receiptId, Guid productId, int quantity, long unitCostCents)
    {
        Id = id;
        ReceiptId = receiptId;
        ProductId = productId;
        Quantity = quantity;
        UnitCostCents = unitCostCents;
        LineTotalCents = checked((long)quantity * unitCostCents);
    }

    public Guid Id { get; private set; }
    public Guid ReceiptId { get; private set; }
    public Guid ProductId { get; private set; }
    public int Quantity { get; private set; }
    public long UnitCostCents { get; private set; }
    public long LineTotalCents { get; private set; }
}
