using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LouBarbershop.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPublicBookingManagement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<Guid>(name: "created_by", schema: "lou", table: "appointments",
                type: "uuid", nullable: true, oldClrType: typeof(Guid), oldType: "uuid");
            migrationBuilder.AddColumn<DateTimeOffset>(name: "management_token_expires_at", schema: "lou",
                table: "appointments", type: "timestamp with time zone", nullable: true);
            migrationBuilder.AlterColumn<Guid>(name: "actor_id", schema: "lou", table: "appointment_events",
                type: "uuid", nullable: true, oldClrType: typeof(Guid), oldType: "uuid");
            migrationBuilder.CreateIndex(name: "ux_appointments_management_token_hash", schema: "lou",
                table: "appointments", column: "management_token_hash", unique: true,
                filter: "management_token_hash IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(name: "ux_appointments_management_token_hash", schema: "lou", table: "appointments");
            migrationBuilder.DropColumn(name: "management_token_expires_at", schema: "lou", table: "appointments");
            migrationBuilder.AlterColumn<Guid>(name: "created_by", schema: "lou", table: "appointments",
                type: "uuid", nullable: false, defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid), oldType: "uuid", oldNullable: true);
            migrationBuilder.AlterColumn<Guid>(name: "actor_id", schema: "lou", table: "appointment_events",
                type: "uuid", nullable: false, defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid), oldType: "uuid", oldNullable: true);
        }
    }
}
