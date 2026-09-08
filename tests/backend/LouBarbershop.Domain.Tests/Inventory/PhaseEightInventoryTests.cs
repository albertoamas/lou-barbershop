using LouBarbershop.Domain.Expenses;
using LouBarbershop.Domain.Inventory;
using LouBarbershop.Domain.Sales;

namespace LouBarbershop.Domain.Tests.Inventory;

public sealed class PhaseEightInventoryTests
{
    private static readonly DateTimeOffset Now = new(2026, 9, 8, 12, 0, 0, TimeSpan.Zero);

    [Fact]
    public void Receipt_requires_consistent_positive_unique_details_and_calculates_total()
    {
        var receiptId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var receipt = InventoryReceipt.Create(receiptId, new DateOnly(2026, 9, 8), PaymentMethod.Cash, null, null, Guid.NewGuid(), Now,
            [new InventoryReceiptItem(Guid.NewGuid(), receiptId, productId, 3, 1_500)]);

        Assert.True(receipt.IsSuccess);
        Assert.Equal(4_500, receipt.Value.TotalCents);
        var duplicate = InventoryReceipt.Create(receiptId, new DateOnly(2026, 9, 8), PaymentMethod.Cash, null, null, Guid.NewGuid(), Now,
            [new InventoryReceiptItem(Guid.NewGuid(), receiptId, productId, 1, 1_000), new InventoryReceiptItem(Guid.NewGuid(), receiptId, productId, 1, 1_000)]);
        Assert.False(duplicate.IsSuccess);
    }

    [Fact]
    public void Expense_void_preserves_original_values_and_records_reason()
    {
        var expense = Expense.Create(Guid.NewGuid(), Guid.NewGuid(), new DateOnly(2026, 9, 8), "Electricidad", 25_000, PaymentMethod.Qr, Guid.NewGuid(), Now).Value;
        var result = expense.Void("Registro duplicado", Guid.NewGuid(), Now.AddMinutes(1));

        Assert.True(result.IsSuccess);
        Assert.Equal(ExpenseStatus.Voided, expense.Status);
        Assert.Equal(25_000, expense.AmountCents);
        Assert.Equal("Registro duplicado", expense.VoidReason);
    }

    [Fact]
    public void Product_lines_keep_quantity_price_and_historical_cost()
    {
        var operation = SaleOperation.Create(Guid.NewGuid(), null, Guid.NewGuid(), Guid.NewGuid(), SaleOrigin.WalkIn, Guid.NewGuid(), Now).Value;
        var item = SaleItem.CreateProduct(Guid.NewGuid(), operation.Id, Guid.NewGuid(), "Cera", 5_000, 2_000, 2, operation.BarberId).Value;

        var result = operation.ReplaceProducts([item], Now);

        Assert.True(result.IsSuccess);
        Assert.Equal(10_000, operation.SubtotalCents);
        Assert.Equal(2_000, operation.Items.Single().UnitCostCents);
    }
}
