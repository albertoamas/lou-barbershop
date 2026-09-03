using LouBarbershop.Domain.Catalog;
using LouBarbershop.Domain.Commissions;
using LouBarbershop.Domain.Expenses;
using LouBarbershop.Domain.Finance;
using LouBarbershop.Domain.Staff;
using LouBarbershop.Infrastructure.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LouBarbershop.Infrastructure.Persistence.Configurations;

internal static class PhaseFourConfiguration
{
    public static void ConfigureAggregate<TEntity>(EntityTypeBuilder<TEntity> builder) where TEntity : class =>
        builder.Property<uint>("Version").IsRowVersion();
}

public sealed class StaffProfileConfiguration : IEntityTypeConfiguration<StaffProfile>
{
    public void Configure(EntityTypeBuilder<StaffProfile> builder)
    {
        builder.ToTable("staff_profiles"); builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever(); builder.Property(x => x.UserId).HasColumnName("user_id");
        builder.Property(x => x.DisplayName).HasColumnName("display_name").HasMaxLength(120).IsRequired(); builder.Property(x => x.Phone).HasColumnName("phone").HasMaxLength(30);
        builder.Property(x => x.Active).HasColumnName("active"); builder.Property(x => x.CreatedAt).HasColumnName("created_at"); builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.HasIndex(x => x.UserId).IsUnique().HasDatabaseName("ux_staff_profiles_user_id");
        builder.HasOne<AppUser>().WithOne().HasForeignKey<StaffProfile>(x => x.UserId).OnDelete(DeleteBehavior.Restrict); PhaseFourConfiguration.ConfigureAggregate(builder);
    }
}

public sealed class BarberProfileConfiguration : IEntityTypeConfiguration<BarberProfile>
{
    public void Configure(EntityTypeBuilder<BarberProfile> builder)
    {
        builder.ToTable("barber_profiles"); builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever(); builder.Property(x => x.StaffProfileId).HasColumnName("staff_profile_id");
        builder.Property(x => x.EmploymentType).HasColumnName("employment_type").HasConversion(value => value == EmploymentType.Owner ? "OWNER" : "CONTRACTOR", value => value == "OWNER" ? EmploymentType.Owner : EmploymentType.Contractor).HasMaxLength(20); builder.Property(x => x.SettlementFrequency).HasColumnName("settlement_frequency").HasConversion(value => value == SettlementFrequency.Biweekly ? "BIWEEKLY" : "MONTHLY", value => value == "BIWEEKLY" ? SettlementFrequency.Biweekly : SettlementFrequency.Monthly).HasMaxLength(20);
        builder.Property(x => x.Color).HasColumnName("color").HasMaxLength(7); builder.Property(x => x.Active).HasColumnName("active"); builder.Property(x => x.CreatedAt).HasColumnName("created_at"); builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.HasIndex(x => x.StaffProfileId).IsUnique().HasDatabaseName("ux_barber_profiles_staff_id"); builder.HasOne<StaffProfile>().WithOne().HasForeignKey<BarberProfile>(x => x.StaffProfileId).OnDelete(DeleteBehavior.Restrict); PhaseFourConfiguration.ConfigureAggregate(builder);
    }
}

public sealed class ServiceConfiguration : IEntityTypeConfiguration<Service>
{
    public void Configure(EntityTypeBuilder<Service> builder)
    {
        builder.ToTable("services"); builder.HasKey(x => x.Id); builder.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever();
        builder.Property(x => x.Name).HasColumnName("name").HasMaxLength(120); builder.Property(x => x.Description).HasColumnName("description").HasMaxLength(500); builder.Property(x => x.DefaultDurationMinutes).HasColumnName("default_duration_minutes");
        builder.Property(x => x.DefaultPrice).HasColumnName("default_price_cents").HasConversion(x => x.Cents, x => Money.Create(x).Value);
        builder.Property(x => x.Active).HasColumnName("active"); builder.Property(x => x.CreatedAt).HasColumnName("created_at"); builder.Property(x => x.UpdatedAt).HasColumnName("updated_at"); builder.HasIndex(x => x.Name).HasDatabaseName("ix_services_name"); PhaseFourConfiguration.ConfigureAggregate(builder);
    }
}

public sealed class BarberServiceOfferingConfiguration : IEntityTypeConfiguration<BarberServiceOffering>
{
    public void Configure(EntityTypeBuilder<BarberServiceOffering> builder)
    {
        builder.ToTable("barber_service_offerings"); builder.HasKey(x => x.Id); builder.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever(); builder.Property(x => x.BarberId).HasColumnName("barber_id"); builder.Property(x => x.ServiceId).HasColumnName("service_id"); builder.Property(x => x.DurationMinutes).HasColumnName("duration_minutes");
        builder.Property(x => x.Price).HasColumnName("price_cents").HasConversion(x => x.Cents, x => Money.Create(x).Value);
        builder.ComplexProperty(x => x.Period, period => { period.Property(x => x.ValidFrom).HasColumnName("valid_from"); period.Property(x => x.ValidTo).HasColumnName("valid_to"); });
        builder.Property(x => x.Active).HasColumnName("active"); builder.Property(x => x.CreatedAt).HasColumnName("created_at"); builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.HasOne<BarberProfile>().WithMany().HasForeignKey(x => x.BarberId).OnDelete(DeleteBehavior.Restrict); builder.HasOne<Service>().WithMany().HasForeignKey(x => x.ServiceId).OnDelete(DeleteBehavior.Restrict); builder.HasIndex(x => new { x.BarberId, x.ServiceId }).HasDatabaseName("ix_offerings_barber_service"); PhaseFourConfiguration.ConfigureAggregate(builder);
    }
}

public sealed class ProductConfiguration : IEntityTypeConfiguration<Product>
{
    public void Configure(EntityTypeBuilder<Product> builder)
    {
        builder.ToTable("products"); builder.HasKey(x => x.Id); builder.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever(); builder.Property(x => x.Name).HasColumnName("name").HasMaxLength(120); builder.Property(x => x.Brand).HasColumnName("brand").HasMaxLength(80); builder.Property(x => x.Sku).HasColumnName("sku").HasMaxLength(50); builder.Property(x => x.Description).HasColumnName("description").HasMaxLength(500);
        builder.Property(x => x.SalePrice).HasColumnName("sale_price_cents").HasConversion(x => x.Cents, x => Money.Create(x).Value); builder.Property(x => x.AverageCost).HasColumnName("average_cost_cents").HasConversion(x => x.Cents, x => Money.Create(x).Value);
        builder.Property(x => x.MinimumStock).HasColumnName("minimum_stock"); builder.Property(x => x.Active).HasColumnName("active"); builder.Property(x => x.CreatedAt).HasColumnName("created_at"); builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.HasIndex(x => x.Sku).IsUnique().HasFilter("sku IS NOT NULL").HasDatabaseName("ux_products_sku"); PhaseFourConfiguration.ConfigureAggregate(builder);
    }
}

public sealed class CommissionRuleConfiguration : IEntityTypeConfiguration<CommissionRule>
{
    public void Configure(EntityTypeBuilder<CommissionRule> builder)
    {
        builder.ToTable("commission_rules"); builder.HasKey(x => x.Id); builder.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever(); builder.Property(x => x.BarberId).HasColumnName("barber_id"); builder.Property(x => x.Kind).HasColumnName("kind").HasConversion(value => value == CommissionKind.Service ? "SERVICE" : "PRODUCT", value => value == "SERVICE" ? CommissionKind.Service : CommissionKind.Product).HasMaxLength(20);
        builder.Property(x => x.Rate).HasColumnName("rate_basis_points").HasConversion(x => x.BasisPoints, x => CommissionRate.Create(x).Value); builder.ComplexProperty(x => x.Period, period => { period.Property(x => x.ValidFrom).HasColumnName("valid_from"); period.Property(x => x.ValidTo).HasColumnName("valid_to"); });
        builder.Property(x => x.CreatedBy).HasColumnName("created_by"); builder.Property(x => x.Active).HasColumnName("active"); builder.Property(x => x.CreatedAt).HasColumnName("created_at"); builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.HasOne<BarberProfile>().WithMany().HasForeignKey(x => x.BarberId).OnDelete(DeleteBehavior.Restrict); builder.HasIndex(x => new { x.BarberId, x.Kind }).HasDatabaseName("ix_commission_rules_barber_kind"); PhaseFourConfiguration.ConfigureAggregate(builder);
    }
}

public sealed class ExpenseCategoryConfiguration : IEntityTypeConfiguration<ExpenseCategory>
{
    public void Configure(EntityTypeBuilder<ExpenseCategory> builder)
    {
        builder.ToTable("expense_categories"); builder.HasKey(x => x.Id); builder.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever(); builder.Property(x => x.Name).HasColumnName("name").HasMaxLength(120); builder.Property(x => x.Active).HasColumnName("active"); builder.Property(x => x.CreatedAt).HasColumnName("created_at"); builder.Property(x => x.UpdatedAt).HasColumnName("updated_at"); builder.HasIndex(x => x.Name).IsUnique().HasDatabaseName("ux_expense_categories_name"); PhaseFourConfiguration.ConfigureAggregate(builder);
    }
}
