using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LouBarbershop.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddServiceOperations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "commission_entries",
                schema: "lou",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    barber_id = table.Column<Guid>(type: "uuid", nullable: false),
                    sale_item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    base_cents = table.Column<long>(type: "bigint", nullable: false),
                    rate_basis_points = table.Column<int>(type: "integer", nullable: false),
                    amount_cents = table.Column<long>(type: "bigint", nullable: false),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    created_by = table.Column<Guid>(type: "uuid", nullable: false),
                    earned_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_commission_entries", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "payment_idempotency",
                schema: "lou",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    key_hash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    operation_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_payment_idempotency", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "sale_operations",
                schema: "lou",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    appointment_id = table.Column<Guid>(type: "uuid", nullable: true),
                    customer_id = table.Column<Guid>(type: "uuid", nullable: false),
                    barber_id = table.Column<Guid>(type: "uuid", nullable: false),
                    origin = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    status = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: false),
                    subtotal_cents = table.Column<long>(type: "bigint", nullable: false),
                    discount_cents = table.Column<long>(type: "bigint", nullable: false),
                    courtesy_cents = table.Column<long>(type: "bigint", nullable: false),
                    total_cents = table.Column<long>(type: "bigint", nullable: false),
                    adjustment_reason = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    created_by = table.Column<Guid>(type: "uuid", nullable: false),
                    opened_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    paid_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sale_operations", x => x.id);
                    table.ForeignKey(
                        name: "FK_sale_operations_appointments_appointment_id",
                        column: x => x.appointment_id,
                        principalSchema: "lou",
                        principalTable: "appointments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_sale_operations_barber_profiles_barber_id",
                        column: x => x.barber_id,
                        principalSchema: "lou",
                        principalTable: "barber_profiles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_sale_operations_customers_customer_id",
                        column: x => x.customer_id,
                        principalSchema: "lou",
                        principalTable: "customers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "payments",
                schema: "lou",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    operation_id = table.Column<Guid>(type: "uuid", nullable: false),
                    method = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    amount_cents = table.Column<long>(type: "bigint", nullable: false),
                    recorded_by = table.Column<Guid>(type: "uuid", nullable: false),
                    paid_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_payments", x => x.id);
                    table.ForeignKey(
                        name: "FK_payments_sale_operations_operation_id",
                        column: x => x.operation_id,
                        principalSchema: "lou",
                        principalTable: "sale_operations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "sale_items",
                schema: "lou",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    operation_id = table.Column<Guid>(type: "uuid", nullable: false),
                    service_id = table.Column<Guid>(type: "uuid", nullable: false),
                    description_snapshot = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    unit_price_cents = table.Column<long>(type: "bigint", nullable: false),
                    barber_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sale_items", x => x.id);
                    table.ForeignKey(
                        name: "FK_sale_items_sale_operations_operation_id",
                        column: x => x.operation_id,
                        principalSchema: "lou",
                        principalTable: "sale_operations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_sale_items_services_service_id",
                        column: x => x.service_id,
                        principalSchema: "lou",
                        principalTable: "services",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_commission_entries_sale_item_id",
                schema: "lou",
                table: "commission_entries",
                column: "sale_item_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_payment_idempotency_key_hash",
                schema: "lou",
                table: "payment_idempotency",
                column: "key_hash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ux_payments_operation_method",
                schema: "lou",
                table: "payments",
                columns: new[] { "operation_id", "method" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sale_items_operation_id",
                schema: "lou",
                table: "sale_items",
                column: "operation_id");

            migrationBuilder.CreateIndex(
                name: "IX_sale_items_service_id",
                schema: "lou",
                table: "sale_items",
                column: "service_id");

            migrationBuilder.CreateIndex(
                name: "IX_sale_operations_barber_id",
                schema: "lou",
                table: "sale_operations",
                column: "barber_id");

            migrationBuilder.CreateIndex(
                name: "IX_sale_operations_customer_id",
                schema: "lou",
                table: "sale_operations",
                column: "customer_id");

            migrationBuilder.CreateIndex(
                name: "ix_sale_operations_opened_status",
                schema: "lou",
                table: "sale_operations",
                columns: new[] { "opened_at", "status" });

            migrationBuilder.CreateIndex(
                name: "ux_sale_operations_appointment",
                schema: "lou",
                table: "sale_operations",
                column: "appointment_id",
                unique: true,
                filter: "appointment_id IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "commission_entries",
                schema: "lou");

            migrationBuilder.DropTable(
                name: "payment_idempotency",
                schema: "lou");

            migrationBuilder.DropTable(
                name: "payments",
                schema: "lou");

            migrationBuilder.DropTable(
                name: "sale_items",
                schema: "lou");

            migrationBuilder.DropTable(
                name: "sale_operations",
                schema: "lou");
        }
    }
}
