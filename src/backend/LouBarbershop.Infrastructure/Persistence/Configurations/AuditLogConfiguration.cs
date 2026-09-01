using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LouBarbershop.Infrastructure.Persistence.Configurations;

public sealed class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
{
    public void Configure(EntityTypeBuilder<AuditLog> builder)
    {
        builder.ToTable("audit_logs");
        builder.HasKey(auditLog => auditLog.Id);
        builder.Property(auditLog => auditLog.Id).HasColumnName("id").ValueGeneratedNever();
        builder.Property(auditLog => auditLog.ActorUserId).HasColumnName("actor_user_id");
        builder.Property(auditLog => auditLog.Action).HasColumnName("action").HasMaxLength(40).IsRequired();
        builder.Property(auditLog => auditLog.EntityType).HasColumnName("entity_type").HasMaxLength(80).IsRequired();
        builder.Property(auditLog => auditLog.EntityId).HasColumnName("entity_id");
        builder.Property(auditLog => auditLog.RequestId).HasColumnName("request_id").HasMaxLength(128);
        builder.Property(auditLog => auditLog.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.HasIndex(auditLog => new { auditLog.EntityType, auditLog.EntityId, auditLog.CreatedAt })
            .HasDatabaseName("ix_audit_logs_entity_created_at");
    }
}
