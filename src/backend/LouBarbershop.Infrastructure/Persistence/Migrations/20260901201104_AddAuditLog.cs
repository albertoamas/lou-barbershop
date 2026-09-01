using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LouBarbershop.Infrastructure.Persistence.Migrations;

/// <inheritdoc />
public partial class AddAuditLog : Migration
{
    private static readonly string[] AuditLogIndexColumns = ["entity_type", "entity_id", "created_at"];

    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "audit_logs",
            schema: "lou",
            columns: table => new
            {
                id = table.Column<System.Guid>(type: "uuid", nullable: false),
                actor_user_id = table.Column<System.Guid>(type: "uuid", nullable: true),
                action = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                entity_type = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                entity_id = table.Column<System.Guid>(type: "uuid", nullable: false),
                request_id = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                created_at = table.Column<System.DateTimeOffset>(type: "timestamp with time zone", nullable: false),
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_audit_logs", x => x.id);
            });

        migrationBuilder.CreateIndex(
            name: "ix_audit_logs_entity_created_at",
            schema: "lou",
            table: "audit_logs",
            columns: AuditLogIndexColumns);
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "audit_logs", schema: "lou");
    }
}
