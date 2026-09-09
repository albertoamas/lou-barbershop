using LouBarbershop.Domain.Appointments;
using LouBarbershop.Domain.Catalog;
using LouBarbershop.Domain.Customers;
using LouBarbershop.Domain.Finance;
using LouBarbershop.Domain.Scheduling;
using LouBarbershop.Domain.Staff;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LouBarbershop.Infrastructure.Persistence.Configurations;

public sealed class WorkingScheduleConfiguration : IEntityTypeConfiguration<WorkingSchedule>
{
    public void Configure(EntityTypeBuilder<WorkingSchedule> builder)
    {
        builder.ToTable("working_schedules"); builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever(); builder.Property(x => x.BarberId).HasColumnName("barber_id"); builder.Property(x => x.Weekday).HasColumnName("weekday");
        builder.Property(x => x.StartLocalTime).HasColumnName("start_local_time"); builder.Property(x => x.EndLocalTime).HasColumnName("end_local_time");
        builder.ComplexProperty(x => x.Period, period => { period.Property(x => x.ValidFrom).HasColumnName("valid_from"); period.Property(x => x.ValidTo).HasColumnName("valid_to"); });
        builder.Property(x => x.Active).HasColumnName("active"); builder.Property(x => x.CreatedAt).HasColumnName("created_at"); builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.HasOne<BarberProfile>().WithMany().HasForeignKey(x => x.BarberId).OnDelete(DeleteBehavior.Restrict); builder.HasIndex(x => new { x.BarberId, x.Weekday }).HasDatabaseName("ix_working_schedules_barber_weekday"); PhaseFourConfiguration.ConfigureAggregate(builder);
    }
}

public sealed class AvailabilityExceptionConfiguration : IEntityTypeConfiguration<AvailabilityExceptionRule>
{
    public void Configure(EntityTypeBuilder<AvailabilityExceptionRule> builder)
    {
        builder.ToTable("availability_exceptions"); builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever(); builder.Property(x => x.BarberId).HasColumnName("barber_id");
        builder.ComplexProperty(x => x.Range, range => { range.Property(x => x.StartsAt).HasColumnName("starts_at"); range.Property(x => x.EndsAt).HasColumnName("ends_at"); });
        builder.Property(x => x.Kind).HasColumnName("kind").HasConversion(value => value == AvailabilityExceptionKind.Unavailable ? "UNAVAILABLE" : "AVAILABLE_OVERRIDE", value => value == "UNAVAILABLE" ? AvailabilityExceptionKind.Unavailable : AvailabilityExceptionKind.AvailableOverride).HasMaxLength(24);
        builder.Property(x => x.Reason).HasColumnName("reason").HasMaxLength(300); builder.Property(x => x.CreatedBy).HasColumnName("created_by"); builder.Property(x => x.Active).HasColumnName("active"); builder.Property(x => x.CreatedAt).HasColumnName("created_at"); builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.HasOne<BarberProfile>().WithMany().HasForeignKey(x => x.BarberId).OnDelete(DeleteBehavior.Restrict); builder.HasIndex(x => new { x.BarberId, x.Active }).HasDatabaseName("ix_availability_exceptions_barber_active"); PhaseFourConfiguration.ConfigureAggregate(builder);
    }
}

public sealed class AppointmentConfiguration : IEntityTypeConfiguration<Appointment>
{
    public void Configure(EntityTypeBuilder<Appointment> builder)
    {
        builder.ToTable("appointments"); builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever(); builder.Property(x => x.CustomerId).HasColumnName("customer_id"); builder.Property(x => x.BarberId).HasColumnName("barber_id"); builder.Property(x => x.ServiceId).HasColumnName("service_id");
        builder.ComplexProperty(x => x.Range, range => { range.Property(x => x.StartsAt).HasColumnName("starts_at"); range.Property(x => x.EndsAt).HasColumnName("ends_at"); });
        builder.Property(x => x.Status).HasColumnName("status").HasConversion(value => value == AppointmentStatus.Confirmed ? "CONFIRMED" : value == AppointmentStatus.CheckedIn ? "CHECKED_IN" : value == AppointmentStatus.InService ? "IN_SERVICE" : value == AppointmentStatus.Completed ? "COMPLETED" : value == AppointmentStatus.Cancelled ? "CANCELLED" : "NO_SHOW", value => value == "CONFIRMED" ? AppointmentStatus.Confirmed : value == "CHECKED_IN" ? AppointmentStatus.CheckedIn : value == "IN_SERVICE" ? AppointmentStatus.InService : value == "COMPLETED" ? AppointmentStatus.Completed : value == "CANCELLED" ? AppointmentStatus.Cancelled : AppointmentStatus.NoShow).HasMaxLength(24);
        builder.Property(x => x.Source).HasColumnName("source").HasConversion(value => value == AppointmentSource.Internal ? "INTERNAL" : "PUBLIC", value => value == "INTERNAL" ? AppointmentSource.Internal : AppointmentSource.Public).HasMaxLength(24);
        builder.Property(x => x.QuotedPrice).HasColumnName("quoted_price_cents").HasConversion(x => x.Cents, x => Money.Create(x).Value); builder.Property(x => x.QuotedDurationMinutes).HasColumnName("quoted_duration_minutes");
        builder.Property(x => x.CustomerNote).HasColumnName("customer_note").HasMaxLength(500); builder.Property(x => x.ManagementTokenHash).HasColumnName("management_token_hash").HasMaxLength(128); builder.Property(x => x.ManagementTokenExpiresAt).HasColumnName("management_token_expires_at"); builder.Property(x => x.CreatedBy).HasColumnName("created_by"); builder.Property(x => x.CreatedAt).HasColumnName("created_at"); builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.HasOne<Customer>().WithMany().HasForeignKey(x => x.CustomerId).OnDelete(DeleteBehavior.Restrict); builder.HasOne<BarberProfile>().WithMany().HasForeignKey(x => x.BarberId).OnDelete(DeleteBehavior.Restrict); builder.HasOne<Service>().WithMany().HasForeignKey(x => x.ServiceId).OnDelete(DeleteBehavior.Restrict);
        PhaseFourConfiguration.ConfigureAggregate(builder);
        builder.HasIndex(x => x.ManagementTokenHash).IsUnique().HasFilter("management_token_hash IS NOT NULL").HasDatabaseName("ux_appointments_management_token_hash");
        builder.Ignore(x => x.OccupiesTime);
    }
}
