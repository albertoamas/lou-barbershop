using LouBarbershop.Domain.Catalog;
using LouBarbershop.Domain.Expenses;
using LouBarbershop.Domain.Inventory;
using LouBarbershop.Domain.Sales;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LouBarbershop.Infrastructure.Persistence.Configurations;

public sealed class InventoryReceiptConfiguration : IEntityTypeConfiguration<InventoryReceipt>
{
    public void Configure(EntityTypeBuilder<InventoryReceipt> builder)
    {
        builder.ToTable("inventory_receipts", t => t.HasCheckConstraint("ck_inventory_receipts_total", "total_cents > 0")); builder.HasKey(x => x.Id); builder.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever(); builder.Property(x => x.ReceiptDate).HasColumnName("receipt_date"); builder.Property(x => x.PaymentMethod).HasColumnName("payment_method").HasConversion<string>().HasMaxLength(10); builder.Property(x => x.TotalCents).HasColumnName("total_cents"); builder.Property(x => x.Reference).HasColumnName("reference").HasMaxLength(120); builder.Property(x => x.Note).HasColumnName("note").HasMaxLength(500); builder.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(20); builder.Property(x => x.CreatedBy).HasColumnName("created_by"); builder.Property(x => x.CreatedAt).HasColumnName("created_at"); PhaseFourConfiguration.ConfigureAggregate(builder); builder.HasMany(x => x.Items).WithOne().HasForeignKey(x => x.ReceiptId).OnDelete(DeleteBehavior.Restrict); builder.HasIndex(x => x.ReceiptDate).HasDatabaseName("ix_inventory_receipts_date");
    }
}
public sealed class InventoryReceiptItemConfiguration : IEntityTypeConfiguration<InventoryReceiptItem>
{
    public void Configure(EntityTypeBuilder<InventoryReceiptItem> builder)
    { builder.ToTable("inventory_receipt_items", t => { t.HasCheckConstraint("ck_inventory_receipt_items_quantity", "quantity > 0"); t.HasCheckConstraint("ck_inventory_receipt_items_cost", "unit_cost_cents > 0 AND line_total_cents = quantity * unit_cost_cents"); }); builder.HasKey(x => x.Id); builder.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever(); builder.Property(x => x.ReceiptId).HasColumnName("receipt_id"); builder.Property(x => x.ProductId).HasColumnName("product_id"); builder.Property(x => x.Quantity).HasColumnName("quantity"); builder.Property(x => x.UnitCostCents).HasColumnName("unit_cost_cents"); builder.Property(x => x.LineTotalCents).HasColumnName("line_total_cents"); builder.HasOne<Product>().WithMany().HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Restrict); builder.HasIndex(x => new { x.ReceiptId, x.ProductId }).IsUnique().HasDatabaseName("ux_inventory_receipt_items_product"); }
}
public sealed class InventoryMovementConfiguration : IEntityTypeConfiguration<InventoryMovement>
{
    public void Configure(EntityTypeBuilder<InventoryMovement> builder)
    { builder.ToTable("inventory_movements", t => { t.HasCheckConstraint("ck_inventory_movements_quantity", "quantity_delta <> 0"); t.HasCheckConstraint("ck_inventory_movements_cost", "unit_cost_cents >= 0"); }); builder.HasKey(x => x.Id); builder.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever(); builder.Property(x => x.ProductId).HasColumnName("product_id"); builder.Property(x => x.Type).HasColumnName("movement_type").HasConversion<string>().HasMaxLength(30); builder.Property(x => x.QuantityDelta).HasColumnName("quantity_delta"); builder.Property(x => x.UnitCostCents).HasColumnName("unit_cost_cents"); builder.Property(x => x.ReceiptItemId).HasColumnName("receipt_item_id"); builder.Property(x => x.SaleItemId).HasColumnName("sale_item_id"); builder.Property(x => x.Reason).HasColumnName("reason").HasMaxLength(300); builder.Property(x => x.CreatedBy).HasColumnName("created_by"); builder.Property(x => x.OccurredAt).HasColumnName("occurred_at"); builder.HasOne<Product>().WithMany().HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Restrict); builder.HasOne<InventoryReceiptItem>().WithOne().HasForeignKey<InventoryMovement>(x => x.ReceiptItemId).OnDelete(DeleteBehavior.Restrict); builder.HasOne<SaleItem>().WithOne().HasForeignKey<InventoryMovement>(x => x.SaleItemId).OnDelete(DeleteBehavior.Restrict); builder.HasIndex(x => new { x.ProductId, x.OccurredAt }).HasDatabaseName("ix_inventory_movements_product_time"); }
}
public sealed class ExpenseConfiguration : IEntityTypeConfiguration<Expense>
{
    public void Configure(EntityTypeBuilder<Expense> builder)
    { builder.ToTable("expenses", t => t.HasCheckConstraint("ck_expenses_amount", "amount_cents > 0")); builder.HasKey(x => x.Id); builder.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever(); builder.Property(x => x.CategoryId).HasColumnName("category_id"); builder.Property(x => x.ExpenseDate).HasColumnName("expense_date"); builder.Property(x => x.Description).HasColumnName("description").HasMaxLength(300); builder.Property(x => x.AmountCents).HasColumnName("amount_cents"); builder.Property(x => x.PaymentMethod).HasColumnName("payment_method").HasConversion<string>().HasMaxLength(10); builder.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(20); builder.Property(x => x.VoidReason).HasColumnName("void_reason").HasMaxLength(300); builder.Property(x => x.RecordedBy).HasColumnName("recorded_by"); builder.Property(x => x.VoidedBy).HasColumnName("voided_by"); builder.Property(x => x.CreatedAt).HasColumnName("created_at"); builder.Property(x => x.VoidedAt).HasColumnName("voided_at"); PhaseFourConfiguration.ConfigureAggregate(builder); builder.HasOne<ExpenseCategory>().WithMany().HasForeignKey(x => x.CategoryId).OnDelete(DeleteBehavior.Restrict); builder.HasIndex(x => new { x.ExpenseDate, x.Status }).HasDatabaseName("ix_expenses_date_status"); }
}
