using LouBarbershop.Domain.Appointments;
using LouBarbershop.Domain.Catalog;
using LouBarbershop.Domain.Customers;
using LouBarbershop.Domain.Sales;
using LouBarbershop.Domain.Staff;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LouBarbershop.Infrastructure.Persistence.Configurations;

public sealed class SaleOperationConfiguration : IEntityTypeConfiguration<SaleOperation>
{
    public void Configure(EntityTypeBuilder<SaleOperation> builder)
    {
        builder.ToTable("sale_operations", table =>
        {
            table.HasCheckConstraint("ck_sale_operations_non_negative", "subtotal_cents >= 0 AND discount_cents >= 0 AND courtesy_cents >= 0 AND total_cents >= 0");
            table.HasCheckConstraint("ck_sale_operations_total", "total_cents = subtotal_cents - discount_cents - courtesy_cents");
        });
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever();
        builder.Property(x => x.AppointmentId).HasColumnName("appointment_id");
        builder.Property(x => x.CustomerId).HasColumnName("customer_id");
        builder.Property(x => x.BarberId).HasColumnName("barber_id");
        builder.Property(x => x.Origin).HasColumnName("origin").HasConversion<string>().HasMaxLength(20);
        builder.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(24);
        builder.Property(x => x.SubtotalCents).HasColumnName("subtotal_cents");
        builder.Property(x => x.DiscountCents).HasColumnName("discount_cents");
        builder.Property(x => x.CourtesyCents).HasColumnName("courtesy_cents");
        builder.Property(x => x.TotalCents).HasColumnName("total_cents");
        builder.Property(x => x.AdjustmentReason).HasColumnName("adjustment_reason").HasMaxLength(300);
        builder.Property(x => x.CreatedBy).HasColumnName("created_by");
        builder.Property(x => x.OpenedAt).HasColumnName("opened_at");
        builder.Property(x => x.PaidAt).HasColumnName("paid_at");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        PhaseFourConfiguration.ConfigureAggregate(builder);

        builder.HasOne<Appointment>().WithOne().HasForeignKey<SaleOperation>(x => x.AppointmentId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<Customer>().WithMany().HasForeignKey(x => x.CustomerId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<BarberProfile>().WithMany().HasForeignKey(x => x.BarberId).OnDelete(DeleteBehavior.Restrict);
        builder.HasMany(x => x.Items).WithOne().HasForeignKey(x => x.OperationId).OnDelete(DeleteBehavior.Restrict);
        builder.HasMany(x => x.Payments).WithOne().HasForeignKey(x => x.OperationId).OnDelete(DeleteBehavior.Restrict);
        builder.HasIndex(x => x.AppointmentId).IsUnique().HasFilter("appointment_id IS NOT NULL").HasDatabaseName("ux_sale_operations_appointment");
        builder.HasIndex(x => new { x.OpenedAt, x.Status }).HasDatabaseName("ix_sale_operations_opened_status");
    }
}

public sealed class SaleItemConfiguration : IEntityTypeConfiguration<SaleItem>
{
    public void Configure(EntityTypeBuilder<SaleItem> builder)
    {
        builder.ToTable("sale_items", table => table.HasCheckConstraint("ck_sale_items_price", "unit_price_cents >= 0"));
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever();
        builder.Property(x => x.OperationId).HasColumnName("operation_id");
        builder.Property(x => x.ServiceId).HasColumnName("service_id");
        builder.Property(x => x.DescriptionSnapshot).HasColumnName("description_snapshot").HasMaxLength(120);
        builder.Property(x => x.UnitPriceCents).HasColumnName("unit_price_cents");
        builder.Property(x => x.BarberId).HasColumnName("barber_id");
        builder.HasOne<Service>().WithMany().HasForeignKey(x => x.ServiceId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<BarberProfile>().WithMany().HasForeignKey(x => x.BarberId).OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class PaymentConfiguration : IEntityTypeConfiguration<Payment>
{
    public void Configure(EntityTypeBuilder<Payment> builder)
    {
        builder.ToTable("payments", table => table.HasCheckConstraint("ck_payments_amount", "amount_cents > 0"));
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever();
        builder.Property(x => x.OperationId).HasColumnName("operation_id");
        builder.Property(x => x.Method).HasColumnName("method").HasConversion<string>().HasMaxLength(10);
        builder.Property(x => x.AmountCents).HasColumnName("amount_cents");
        builder.Property(x => x.RecordedBy).HasColumnName("recorded_by");
        builder.Property(x => x.PaidAt).HasColumnName("paid_at");
        builder.HasIndex(x => new { x.OperationId, x.Method }).IsUnique().HasDatabaseName("ux_payments_operation_method");
    }
}

public sealed class CommissionEntryRowConfiguration : IEntityTypeConfiguration<CommissionEntryRow>
{
    public void Configure(EntityTypeBuilder<CommissionEntryRow> builder)
    {
        builder.ToTable("commission_entries", table => table.HasCheckConstraint("ck_commission_entries_values", "base_cents >= 0 AND amount_cents >= 0 AND rate_basis_points >= 0 AND rate_basis_points <= 10000"));
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever();
        builder.Property(x => x.BarberId).HasColumnName("barber_id");
        builder.Property(x => x.SaleItemId).HasColumnName("sale_item_id");
        builder.Property(x => x.BaseCents).HasColumnName("base_cents");
        builder.Property(x => x.RateBasisPoints).HasColumnName("rate_basis_points");
        builder.Property(x => x.AmountCents).HasColumnName("amount_cents");
        builder.Property(x => x.Status).HasColumnName("status").HasMaxLength(20);
        builder.Property(x => x.CreatedBy).HasColumnName("created_by");
        builder.Property(x => x.EarnedAt).HasColumnName("earned_at");
        builder.HasOne<BarberProfile>().WithMany().HasForeignKey(x => x.BarberId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<SaleItem>().WithOne().HasForeignKey<CommissionEntryRow>(x => x.SaleItemId).OnDelete(DeleteBehavior.Restrict);
        builder.HasIndex(x => x.SaleItemId).IsUnique().HasDatabaseName("ux_commission_entries_sale_item");
    }
}

public sealed class IdempotencyRowConfiguration : IEntityTypeConfiguration<IdempotencyRow>
{
    public void Configure(EntityTypeBuilder<IdempotencyRow> builder)
    {
        builder.ToTable("payment_idempotency");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever();
        builder.Property(x => x.KeyHash).HasColumnName("key_hash").HasMaxLength(64);
        builder.Property(x => x.OperationId).HasColumnName("operation_id");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.HasOne<SaleOperation>().WithOne().HasForeignKey<IdempotencyRow>(x => x.OperationId).OnDelete(DeleteBehavior.Restrict);
        builder.HasIndex(x => x.KeyHash).IsUnique().HasDatabaseName("ux_payment_idempotency_key_hash");
        builder.HasIndex(x => x.OperationId).IsUnique().HasDatabaseName("ux_payment_idempotency_operation");
    }
}
