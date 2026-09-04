using LouBarbershop.Domain.Appointments;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LouBarbershop.Infrastructure.Persistence.Configurations;

public sealed class AppointmentEventConfiguration : IEntityTypeConfiguration<AppointmentEventRecord>
{
    public void Configure(EntityTypeBuilder<AppointmentEventRecord> builder)
    {
        builder.ToTable("appointment_events");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever();
        builder.Property(x => x.AppointmentId).HasColumnName("appointment_id");
        builder.Property(x => x.ActorId).HasColumnName("actor_id");
        builder.Property(x => x.OccurredAt).HasColumnName("occurred_at");
        builder.Property(x => x.Action).HasColumnName("action").HasMaxLength(32);
        builder.Property(x => x.Reason).HasColumnName("reason").HasMaxLength(300);
        builder.Property(x => x.BeforeData).HasColumnName("before_data").HasColumnType("jsonb");
        builder.Property(x => x.AfterData).HasColumnName("after_data").HasColumnType("jsonb");
        builder.HasOne<Appointment>().WithMany().HasForeignKey(x => x.AppointmentId).OnDelete(DeleteBehavior.Restrict);
        builder.HasIndex(x => new { x.AppointmentId, x.OccurredAt }).HasDatabaseName("ix_appointment_events_appointment_time");
    }
}
