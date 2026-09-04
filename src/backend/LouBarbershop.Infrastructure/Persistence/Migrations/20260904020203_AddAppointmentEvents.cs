using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LouBarbershop.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddAppointmentEvents : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "appointment_events",
                schema: "lou",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    appointment_id = table.Column<Guid>(type: "uuid", nullable: false),
                    actor_id = table.Column<Guid>(type: "uuid", nullable: false),
                    occurred_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    action = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    reason = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    before_data = table.Column<string>(type: "jsonb", nullable: true),
                    after_data = table.Column<string>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_appointment_events", x => x.id);
                    table.ForeignKey(
                        name: "FK_appointment_events_appointments_appointment_id",
                        column: x => x.appointment_id,
                        principalSchema: "lou",
                        principalTable: "appointments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_appointment_events_appointment_time",
                schema: "lou",
                table: "appointment_events",
                columns: new[] { "appointment_id", "occurred_at" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "appointment_events",
                schema: "lou");
        }
    }
}
