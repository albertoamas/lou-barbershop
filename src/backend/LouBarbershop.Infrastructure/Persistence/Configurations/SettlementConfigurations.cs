using LouBarbershop.Domain.Commissions;
using LouBarbershop.Domain.Staff;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LouBarbershop.Infrastructure.Persistence.Configurations;

public sealed class SettlementConfiguration : IEntityTypeConfiguration<Settlement>
{
    public void Configure(EntityTypeBuilder<Settlement> builder)
    {
        builder.ToTable("settlements", table =>
        {
            table.HasCheckConstraint("ck_settlements_period", "period_end >= period_start");
            table.HasCheckConstraint("ck_settlements_totals", "payable_total_cents = commission_total_cents + adjustment_total_cents AND payable_total_cents >= 0");
        });
        builder.HasKey(x => x.Id); builder.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever(); builder.Property(x => x.BarberId).HasColumnName("barber_id"); builder.Property(x => x.PeriodStart).HasColumnName("period_start"); builder.Property(x => x.PeriodEnd).HasColumnName("period_end"); builder.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(16); builder.Property(x => x.CommissionTotalCents).HasColumnName("commission_total_cents"); builder.Property(x => x.AdjustmentTotalCents).HasColumnName("adjustment_total_cents"); builder.Property(x => x.PayableTotalCents).HasColumnName("payable_total_cents"); builder.Property(x => x.PaymentMethod).HasColumnName("payment_method").HasConversion<string>().HasMaxLength(10); builder.Property(x => x.PaymentDate).HasColumnName("payment_date"); builder.Property(x => x.CreatedBy).HasColumnName("created_by"); builder.Property(x => x.ClosedBy).HasColumnName("closed_by"); builder.Property(x => x.PaidBy).HasColumnName("paid_by"); builder.Property(x => x.CreatedAt).HasColumnName("created_at"); builder.Property(x => x.UpdatedAt).HasColumnName("updated_at"); builder.Property(x => x.ClosedAt).HasColumnName("closed_at"); builder.Property(x => x.PaidAt).HasColumnName("paid_at"); PhaseFourConfiguration.ConfigureAggregate(builder); builder.HasOne<BarberProfile>().WithMany().HasForeignKey(x => x.BarberId).OnDelete(DeleteBehavior.Restrict); builder.HasMany(x => x.Items).WithOne().HasForeignKey(x => x.SettlementId).OnDelete(DeleteBehavior.Restrict); builder.HasMany(x => x.Adjustments).WithOne().HasForeignKey(x => x.SettlementId).OnDelete(DeleteBehavior.Restrict); builder.HasIndex(x => new { x.BarberId, x.PeriodEnd }).HasDatabaseName("ix_settlements_barber_period"); builder.HasIndex(x => new { x.Status, x.PaymentDate }).HasDatabaseName("ix_settlements_status_payment_date");
    }
}

public sealed class SettlementItemConfiguration : IEntityTypeConfiguration<SettlementItem>
{
    public void Configure(EntityTypeBuilder<SettlementItem> builder)
    { builder.ToTable("settlement_items", table => table.HasCheckConstraint("ck_settlement_items_amount", "amount_cents <> 0")); builder.HasKey(x => x.Id); builder.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever(); builder.Property(x => x.SettlementId).HasColumnName("settlement_id"); builder.Property(x => x.CommissionEntryId).HasColumnName("commission_entry_id"); builder.Property(x => x.AmountCents).HasColumnName("amount_cents"); builder.HasOne<CommissionEntry>().WithOne().HasForeignKey<SettlementItem>(x => x.CommissionEntryId).OnDelete(DeleteBehavior.Restrict); builder.HasIndex(x => x.CommissionEntryId).IsUnique().HasDatabaseName("ux_settlement_items_commission_entry"); }
}

public sealed class SettlementAdjustmentConfiguration : IEntityTypeConfiguration<SettlementAdjustment>
{
    public void Configure(EntityTypeBuilder<SettlementAdjustment> builder)
    { builder.ToTable("settlement_adjustments", table => table.HasCheckConstraint("ck_settlement_adjustments_amount", "amount_cents <> 0")); builder.HasKey(x => x.Id); builder.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever(); builder.Property(x => x.SettlementId).HasColumnName("settlement_id"); builder.Property(x => x.AmountCents).HasColumnName("amount_cents"); builder.Property(x => x.Reason).HasColumnName("reason").HasMaxLength(300); builder.Property(x => x.AuthorizedBy).HasColumnName("authorized_by"); builder.Property(x => x.CreatedAt).HasColumnName("created_at"); }
}
