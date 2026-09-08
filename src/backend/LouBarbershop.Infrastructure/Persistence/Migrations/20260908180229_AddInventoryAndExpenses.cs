using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LouBarbershop.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddInventoryAndExpenses : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_sale_items_price",
                schema: "lou",
                table: "sale_items");

            migrationBuilder.AlterColumn<Guid>(
                name: "service_id",
                schema: "lou",
                table: "sale_items",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddColumn<Guid>(
                name: "product_id",
                schema: "lou",
                table: "sale_items",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "quantity",
                schema: "lou",
                table: "sale_items",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "type",
                schema: "lou",
                table: "sale_items",
                type: "character varying(12)",
                maxLength: 12,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<long>(
                name: "unit_cost_cents",
                schema: "lou",
                table: "sale_items",
                type: "bigint",
                nullable: false,
                defaultValue: 0L);

            migrationBuilder.CreateTable(
                name: "expenses",
                schema: "lou",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    category_id = table.Column<Guid>(type: "uuid", nullable: false),
                    expense_date = table.Column<DateOnly>(type: "date", nullable: false),
                    description = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    amount_cents = table.Column<long>(type: "bigint", nullable: false),
                    payment_method = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    void_reason = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    recorded_by = table.Column<Guid>(type: "uuid", nullable: false),
                    voided_by = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    voided_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_expenses", x => x.id);
                    table.CheckConstraint("ck_expenses_amount", "amount_cents > 0");
                    table.ForeignKey(
                        name: "FK_expenses_expense_categories_category_id",
                        column: x => x.category_id,
                        principalSchema: "lou",
                        principalTable: "expense_categories",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "inventory_receipts",
                schema: "lou",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    receipt_date = table.Column<DateOnly>(type: "date", nullable: false),
                    payment_method = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    total_cents = table.Column<long>(type: "bigint", nullable: false),
                    reference = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    note = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    created_by = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_inventory_receipts", x => x.id);
                    table.CheckConstraint("ck_inventory_receipts_total", "total_cents > 0");
                });

            migrationBuilder.CreateTable(
                name: "inventory_receipt_items",
                schema: "lou",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    receipt_id = table.Column<Guid>(type: "uuid", nullable: false),
                    product_id = table.Column<Guid>(type: "uuid", nullable: false),
                    quantity = table.Column<int>(type: "integer", nullable: false),
                    unit_cost_cents = table.Column<long>(type: "bigint", nullable: false),
                    line_total_cents = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_inventory_receipt_items", x => x.id);
                    table.CheckConstraint("ck_inventory_receipt_items_cost", "unit_cost_cents > 0 AND line_total_cents = quantity * unit_cost_cents");
                    table.CheckConstraint("ck_inventory_receipt_items_quantity", "quantity > 0");
                    table.ForeignKey(
                        name: "FK_inventory_receipt_items_inventory_receipts_receipt_id",
                        column: x => x.receipt_id,
                        principalSchema: "lou",
                        principalTable: "inventory_receipts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_inventory_receipt_items_products_product_id",
                        column: x => x.product_id,
                        principalSchema: "lou",
                        principalTable: "products",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "inventory_movements",
                schema: "lou",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    product_id = table.Column<Guid>(type: "uuid", nullable: false),
                    movement_type = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    quantity_delta = table.Column<int>(type: "integer", nullable: false),
                    unit_cost_cents = table.Column<long>(type: "bigint", nullable: false),
                    receipt_item_id = table.Column<Guid>(type: "uuid", nullable: true),
                    sale_item_id = table.Column<Guid>(type: "uuid", nullable: true),
                    reason = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    created_by = table.Column<Guid>(type: "uuid", nullable: false),
                    occurred_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_inventory_movements", x => x.id);
                    table.CheckConstraint("ck_inventory_movements_cost", "unit_cost_cents >= 0");
                    table.CheckConstraint("ck_inventory_movements_quantity", "quantity_delta <> 0");
                    table.ForeignKey(
                        name: "FK_inventory_movements_inventory_receipt_items_receipt_item_id",
                        column: x => x.receipt_item_id,
                        principalSchema: "lou",
                        principalTable: "inventory_receipt_items",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_inventory_movements_products_product_id",
                        column: x => x.product_id,
                        principalSchema: "lou",
                        principalTable: "products",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_inventory_movements_sale_items_sale_item_id",
                        column: x => x.sale_item_id,
                        principalSchema: "lou",
                        principalTable: "sale_items",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_sale_items_product_id",
                schema: "lou",
                table: "sale_items",
                column: "product_id");

            migrationBuilder.Sql("UPDATE lou.sale_items SET type = 'Service', quantity = 1 WHERE service_id IS NOT NULL;");

            migrationBuilder.AddCheckConstraint(
                name: "ck_sale_items_reference",
                schema: "lou",
                table: "sale_items",
                sql: "(type = 'Service' AND service_id IS NOT NULL AND product_id IS NULL) OR (type = 'Product' AND service_id IS NULL AND product_id IS NOT NULL)");

            migrationBuilder.AddCheckConstraint(
                name: "ck_sale_items_values",
                schema: "lou",
                table: "sale_items",
                sql: "unit_price_cents >= 0 AND unit_cost_cents >= 0 AND quantity > 0");

            migrationBuilder.CreateIndex(
                name: "IX_expenses_category_id",
                schema: "lou",
                table: "expenses",
                column: "category_id");

            migrationBuilder.CreateIndex(
                name: "ix_expenses_date_status",
                schema: "lou",
                table: "expenses",
                columns: new[] { "expense_date", "status" });

            migrationBuilder.CreateIndex(
                name: "ix_inventory_movements_product_time",
                schema: "lou",
                table: "inventory_movements",
                columns: new[] { "product_id", "occurred_at" });

            migrationBuilder.CreateIndex(
                name: "IX_inventory_movements_receipt_item_id",
                schema: "lou",
                table: "inventory_movements",
                column: "receipt_item_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_inventory_movements_sale_item_id",
                schema: "lou",
                table: "inventory_movements",
                column: "sale_item_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_inventory_receipt_items_product_id",
                schema: "lou",
                table: "inventory_receipt_items",
                column: "product_id");

            migrationBuilder.CreateIndex(
                name: "ux_inventory_receipt_items_product",
                schema: "lou",
                table: "inventory_receipt_items",
                columns: new[] { "receipt_id", "product_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_inventory_receipts_date",
                schema: "lou",
                table: "inventory_receipts",
                column: "receipt_date");

            migrationBuilder.AddForeignKey(
                name: "FK_sale_items_products_product_id",
                schema: "lou",
                table: "sale_items",
                column: "product_id",
                principalSchema: "lou",
                principalTable: "products",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_sale_items_products_product_id",
                schema: "lou",
                table: "sale_items");

            migrationBuilder.DropTable(
                name: "expenses",
                schema: "lou");

            migrationBuilder.DropTable(
                name: "inventory_movements",
                schema: "lou");

            migrationBuilder.DropTable(
                name: "inventory_receipt_items",
                schema: "lou");

            migrationBuilder.DropTable(
                name: "inventory_receipts",
                schema: "lou");

            migrationBuilder.DropIndex(
                name: "IX_sale_items_product_id",
                schema: "lou",
                table: "sale_items");

            migrationBuilder.DropCheckConstraint(
                name: "ck_sale_items_reference",
                schema: "lou",
                table: "sale_items");

            migrationBuilder.DropCheckConstraint(
                name: "ck_sale_items_values",
                schema: "lou",
                table: "sale_items");

            migrationBuilder.DropColumn(
                name: "product_id",
                schema: "lou",
                table: "sale_items");

            migrationBuilder.DropColumn(
                name: "quantity",
                schema: "lou",
                table: "sale_items");

            migrationBuilder.DropColumn(
                name: "type",
                schema: "lou",
                table: "sale_items");

            migrationBuilder.DropColumn(
                name: "unit_cost_cents",
                schema: "lou",
                table: "sale_items");

            migrationBuilder.AlterColumn<Guid>(
                name: "service_id",
                schema: "lou",
                table: "sale_items",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AddCheckConstraint(
                name: "ck_sale_items_price",
                schema: "lou",
                table: "sale_items",
                sql: "unit_price_cents >= 0");
        }
    }
}
