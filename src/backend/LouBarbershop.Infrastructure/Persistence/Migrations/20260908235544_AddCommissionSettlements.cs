using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LouBarbershop.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCommissionSettlements : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_inventory_movements_sale_item_id",
                schema: "lou",
                table: "inventory_movements");

            migrationBuilder.DropIndex(
                name: "ux_commission_entries_sale_item",
                schema: "lou",
                table: "commission_entries");

            migrationBuilder.DropCheckConstraint(
                name: "ck_commission_entries_values",
                schema: "lou",
                table: "commission_entries");

            migrationBuilder.AddColumn<string>(
                name: "reversal_reason",
                schema: "lou",
                table: "sale_operations",
                type: "character varying(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "reversed_at",
                schema: "lou",
                table: "sale_operations",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "reversed_by",
                schema: "lou",
                table: "sale_operations",
                type: "uuid",
                nullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "sale_item_id",
                schema: "lou",
                table: "commission_entries",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddColumn<string>(
                name: "entry_type",
                schema: "lou",
                table: "commission_entries",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "reason",
                schema: "lou",
                table: "commission_entries",
                type: "character varying(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "source_entry_id",
                schema: "lou",
                table: "commission_entries",
                type: "uuid",
                nullable: true);

            migrationBuilder.Sql("UPDATE lou.commission_entries SET entry_type = 'Earning', status = CASE status WHEN 'AVAILABLE' THEN 'Available' WHEN 'SETTLED' THEN 'Settled' WHEN 'PAID' THEN 'Paid' WHEN 'VOIDED' THEN 'Voided' ELSE status END");

            migrationBuilder.CreateTable(
                name: "settlements",
                schema: "lou",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    barber_id = table.Column<Guid>(type: "uuid", nullable: false),
                    period_start = table.Column<DateOnly>(type: "date", nullable: false),
                    period_end = table.Column<DateOnly>(type: "date", nullable: false),
                    status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    commission_total_cents = table.Column<long>(type: "bigint", nullable: false),
                    adjustment_total_cents = table.Column<long>(type: "bigint", nullable: false),
                    payable_total_cents = table.Column<long>(type: "bigint", nullable: false),
                    payment_method = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    payment_date = table.Column<DateOnly>(type: "date", nullable: true),
                    created_by = table.Column<Guid>(type: "uuid", nullable: false),
                    closed_by = table.Column<Guid>(type: "uuid", nullable: true),
                    paid_by = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    closed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    paid_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_settlements", x => x.id);
                    table.CheckConstraint("ck_settlements_period", "period_end >= period_start");
                    table.CheckConstraint("ck_settlements_totals", "payable_total_cents = commission_total_cents + adjustment_total_cents AND payable_total_cents >= 0");
                    table.ForeignKey(
                        name: "FK_settlements_barber_profiles_barber_id",
                        column: x => x.barber_id,
                        principalSchema: "lou",
                        principalTable: "barber_profiles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "settlement_adjustments",
                schema: "lou",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    settlement_id = table.Column<Guid>(type: "uuid", nullable: false),
                    amount_cents = table.Column<long>(type: "bigint", nullable: false),
                    reason = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    authorized_by = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_settlement_adjustments", x => x.id);
                    table.CheckConstraint("ck_settlement_adjustments_amount", "amount_cents <> 0");
                    table.ForeignKey(
                        name: "FK_settlement_adjustments_settlements_settlement_id",
                        column: x => x.settlement_id,
                        principalSchema: "lou",
                        principalTable: "settlements",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "settlement_items",
                schema: "lou",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    settlement_id = table.Column<Guid>(type: "uuid", nullable: false),
                    commission_entry_id = table.Column<Guid>(type: "uuid", nullable: false),
                    amount_cents = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_settlement_items", x => x.id);
                    table.CheckConstraint("ck_settlement_items_amount", "amount_cents <> 0");
                    table.ForeignKey(
                        name: "FK_settlement_items_commission_entries_commission_entry_id",
                        column: x => x.commission_entry_id,
                        principalSchema: "lou",
                        principalTable: "commission_entries",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_settlement_items_settlements_settlement_id",
                        column: x => x.settlement_id,
                        principalSchema: "lou",
                        principalTable: "settlements",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_inventory_movements_sale_item_id",
                schema: "lou",
                table: "inventory_movements",
                column: "sale_item_id");

            migrationBuilder.CreateIndex(
                name: "ux_commission_entries_sale_item",
                schema: "lou",
                table: "commission_entries",
                column: "sale_item_id",
                unique: true,
                filter: "sale_item_id IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ux_commission_entries_source",
                schema: "lou",
                table: "commission_entries",
                column: "source_entry_id",
                unique: true,
                filter: "source_entry_id IS NOT NULL");

            migrationBuilder.AddCheckConstraint(
                name: "ck_commission_entries_source",
                schema: "lou",
                table: "commission_entries",
                sql: "(entry_type = 'Earning' AND sale_item_id IS NOT NULL AND source_entry_id IS NULL) OR (entry_type = 'Reversal' AND sale_item_id IS NULL AND source_entry_id IS NOT NULL AND reason IS NOT NULL)");

            migrationBuilder.AddCheckConstraint(
                name: "ck_commission_entries_values",
                schema: "lou",
                table: "commission_entries",
                sql: "base_cents >= 0 AND rate_basis_points >= 0 AND rate_basis_points <= 10000 AND ((entry_type = 'Earning' AND amount_cents >= 0) OR (entry_type = 'Reversal' AND amount_cents <= 0))");

            migrationBuilder.CreateIndex(
                name: "IX_settlement_adjustments_settlement_id",
                schema: "lou",
                table: "settlement_adjustments",
                column: "settlement_id");

            migrationBuilder.CreateIndex(
                name: "IX_settlement_items_settlement_id",
                schema: "lou",
                table: "settlement_items",
                column: "settlement_id");

            migrationBuilder.CreateIndex(
                name: "ux_settlement_items_commission_entry",
                schema: "lou",
                table: "settlement_items",
                column: "commission_entry_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_settlements_barber_period",
                schema: "lou",
                table: "settlements",
                columns: new[] { "barber_id", "period_end" });

            migrationBuilder.AddForeignKey(
                name: "FK_commission_entries_commission_entries_source_entry_id",
                schema: "lou",
                table: "commission_entries",
                column: "source_entry_id",
                principalSchema: "lou",
                principalTable: "commission_entries",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_commission_entries_commission_entries_source_entry_id",
                schema: "lou",
                table: "commission_entries");

            migrationBuilder.DropTable(
                name: "settlement_adjustments",
                schema: "lou");

            migrationBuilder.DropTable(
                name: "settlement_items",
                schema: "lou");

            migrationBuilder.DropTable(
                name: "settlements",
                schema: "lou");

            migrationBuilder.DropIndex(
                name: "IX_inventory_movements_sale_item_id",
                schema: "lou",
                table: "inventory_movements");

            migrationBuilder.DropIndex(
                name: "ux_commission_entries_sale_item",
                schema: "lou",
                table: "commission_entries");

            migrationBuilder.DropIndex(
                name: "ux_commission_entries_source",
                schema: "lou",
                table: "commission_entries");

            migrationBuilder.DropCheckConstraint(
                name: "ck_commission_entries_source",
                schema: "lou",
                table: "commission_entries");

            migrationBuilder.DropCheckConstraint(
                name: "ck_commission_entries_values",
                schema: "lou",
                table: "commission_entries");

            migrationBuilder.DropColumn(
                name: "reversal_reason",
                schema: "lou",
                table: "sale_operations");

            migrationBuilder.DropColumn(
                name: "reversed_at",
                schema: "lou",
                table: "sale_operations");

            migrationBuilder.DropColumn(
                name: "reversed_by",
                schema: "lou",
                table: "sale_operations");

            migrationBuilder.DropColumn(
                name: "entry_type",
                schema: "lou",
                table: "commission_entries");

            migrationBuilder.DropColumn(
                name: "reason",
                schema: "lou",
                table: "commission_entries");

            migrationBuilder.DropColumn(
                name: "source_entry_id",
                schema: "lou",
                table: "commission_entries");

            migrationBuilder.Sql("UPDATE lou.commission_entries SET status = UPPER(status)");

            migrationBuilder.AlterColumn<Guid>(
                name: "sale_item_id",
                schema: "lou",
                table: "commission_entries",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_inventory_movements_sale_item_id",
                schema: "lou",
                table: "inventory_movements",
                column: "sale_item_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ux_commission_entries_sale_item",
                schema: "lou",
                table: "commission_entries",
                column: "sale_item_id",
                unique: true);

            migrationBuilder.AddCheckConstraint(
                name: "ck_commission_entries_values",
                schema: "lou",
                table: "commission_entries",
                sql: "base_cents >= 0 AND amount_cents >= 0 AND rate_basis_points >= 0 AND rate_basis_points <= 10000");
        }
    }
}
