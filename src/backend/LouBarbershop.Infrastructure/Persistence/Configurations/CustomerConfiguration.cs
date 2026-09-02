using LouBarbershop.Domain.Customers;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LouBarbershop.Infrastructure.Persistence.Configurations;

public sealed class CustomerConfiguration : IEntityTypeConfiguration<Customer>
{
    public void Configure(EntityTypeBuilder<Customer> builder)
    {
        builder.ToTable("customers");
        builder.HasKey(customer => customer.Id);

        builder.Property(customer => customer.Id)
            .HasColumnName("id")
            .ValueGeneratedNever();
        builder.Property(customer => customer.DisplayName)
            .HasColumnName("display_name")
            .HasMaxLength(120)
            .IsRequired();
        builder.Property(customer => customer.PhoneNumber)
            .HasColumnName("phone_e164")
            .HasMaxLength(16)
            .HasConversion(phoneNumber => phoneNumber.Value, value => PhoneNumber.Create(value).Value)
            .IsRequired();
        builder.Property(customer => customer.Notes)
            .HasColumnName("notes")
            .HasMaxLength(1_000);
        builder.Property(customer => customer.Active)
            .HasColumnName("active")
            .IsRequired();
        builder.Property(customer => customer.CreatedAt)
            .HasColumnName("created_at")
            .IsRequired();
        builder.Property(customer => customer.UpdatedAt)
            .HasColumnName("updated_at")
            .IsRequired();
        builder.Property(customer => customer.Version)
            .IsRowVersion();

        builder.HasIndex(customer => customer.PhoneNumber).HasDatabaseName("ix_customers_phone_e164");
        builder.HasIndex(customer => customer.DisplayName).HasDatabaseName("ix_customers_display_name");
        builder.HasQueryFilter(customer => customer.Active);
    }
}
