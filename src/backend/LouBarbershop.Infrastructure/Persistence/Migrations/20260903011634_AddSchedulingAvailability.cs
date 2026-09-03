using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LouBarbershop.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSchedulingAvailability : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "appointments",
                schema: "lou",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    customer_id = table.Column<Guid>(type: "uuid", nullable: false),
                    barber_id = table.Column<Guid>(type: "uuid", nullable: false),
                    service_id = table.Column<Guid>(type: "uuid", nullable: false),
                    status = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: false),
                    source = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: false),
                    quoted_price_cents = table.Column<long>(type: "bigint", nullable: false),
                    quoted_duration_minutes = table.Column<int>(type: "integer", nullable: false),
                    customer_note = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    management_token_hash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    created_by = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false),
                    ends_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    starts_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_appointments", x => x.id);
                    table.ForeignKey(
                        name: "FK_appointments_barber_profiles_barber_id",
                        column: x => x.barber_id,
                        principalSchema: "lou",
                        principalTable: "barber_profiles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_appointments_customers_customer_id",
                        column: x => x.customer_id,
                        principalSchema: "lou",
                        principalTable: "customers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_appointments_services_service_id",
                        column: x => x.service_id,
                        principalSchema: "lou",
                        principalTable: "services",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "availability_exceptions",
                schema: "lou",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    barber_id = table.Column<Guid>(type: "uuid", nullable: false),
                    kind = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: false),
                    reason = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    created_by = table.Column<Guid>(type: "uuid", nullable: false),
                    active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false),
                    ends_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    starts_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_availability_exceptions", x => x.id);
                    table.ForeignKey(
                        name: "FK_availability_exceptions_barber_profiles_barber_id",
                        column: x => x.barber_id,
                        principalSchema: "lou",
                        principalTable: "barber_profiles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "working_schedules",
                schema: "lou",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    barber_id = table.Column<Guid>(type: "uuid", nullable: false),
                    weekday = table.Column<int>(type: "integer", nullable: false),
                    start_local_time = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    end_local_time = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false),
                    valid_from = table.Column<DateOnly>(type: "date", nullable: false),
                    valid_to = table.Column<DateOnly>(type: "date", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_working_schedules", x => x.id);
                    table.ForeignKey(
                        name: "FK_working_schedules_barber_profiles_barber_id",
                        column: x => x.barber_id,
                        principalSchema: "lou",
                        principalTable: "barber_profiles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_appointments_barber_id",
                schema: "lou",
                table: "appointments",
                column: "barber_id");

            migrationBuilder.CreateIndex(
                name: "IX_appointments_customer_id",
                schema: "lou",
                table: "appointments",
                column: "customer_id");

            migrationBuilder.CreateIndex(
                name: "IX_appointments_service_id",
                schema: "lou",
                table: "appointments",
                column: "service_id");

            migrationBuilder.CreateIndex(
                name: "ix_availability_exceptions_barber_active",
                schema: "lou",
                table: "availability_exceptions",
                columns: new[] { "barber_id", "active" });

            migrationBuilder.CreateIndex(
                name: "ix_working_schedules_barber_weekday",
                schema: "lou",
                table: "working_schedules",
                columns: new[] { "barber_id", "weekday" });

            migrationBuilder.CreateIndex(
                name: "ix_appointments_barber_starts_at",
                schema: "lou",
                table: "appointments",
                columns: new[] { "barber_id", "starts_at" });

            migrationBuilder.CreateIndex(
                name: "ix_appointments_customer_starts_at",
                schema: "lou",
                table: "appointments",
                columns: new[] { "customer_id", "starts_at" });

            migrationBuilder.Sql("ALTER TABLE lou.working_schedules ADD CONSTRAINT ck_working_schedules_values CHECK (weekday BETWEEN 1 AND 7 AND end_local_time > start_local_time AND (valid_to IS NULL OR valid_to >= valid_from));");
            migrationBuilder.Sql("ALTER TABLE lou.availability_exceptions ADD CONSTRAINT ck_availability_exceptions_values CHECK (ends_at > starts_at AND kind IN ('UNAVAILABLE','AVAILABLE_OVERRIDE') AND length(trim(reason)) BETWEEN 1 AND 300);");
            migrationBuilder.Sql("ALTER TABLE lou.appointments ADD CONSTRAINT ck_appointments_values CHECK (ends_at > starts_at AND quoted_price_cents >= 0 AND quoted_duration_minutes BETWEEN 5 AND 480 AND ends_at = starts_at + quoted_duration_minutes * interval '1 minute' AND status IN ('CONFIRMED','CHECKED_IN','IN_SERVICE','COMPLETED','CANCELLED','NO_SHOW') AND source IN ('INTERNAL','PUBLIC'));");
            migrationBuilder.Sql("ALTER TABLE lou.working_schedules ADD CONSTRAINT ex_working_schedules_no_overlap EXCLUDE USING gist (barber_id WITH =, weekday WITH =, daterange(valid_from, valid_to, '[]') WITH &&, int4range((extract(hour from start_local_time)::int * 60 + extract(minute from start_local_time)::int), (extract(hour from end_local_time)::int * 60 + extract(minute from end_local_time)::int), '[)') WITH &&) WHERE (active);");
            migrationBuilder.Sql("ALTER TABLE lou.appointments ADD CONSTRAINT ex_appointments_no_overlap EXCLUDE USING gist (barber_id WITH =, tstzrange(starts_at, ends_at, '[)') WITH &&) WHERE (status IN ('CONFIRMED','CHECKED_IN','IN_SERVICE'));");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "appointments",
                schema: "lou");

            migrationBuilder.DropTable(
                name: "availability_exceptions",
                schema: "lou");

            migrationBuilder.DropTable(
                name: "working_schedules",
                schema: "lou");
        }
    }
}
