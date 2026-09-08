using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LouBarbershop.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class HardenServiceOperations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_payments_sale_operations_operation_id",
                schema: "lou",
                table: "payments");

            migrationBuilder.DropForeignKey(
                name: "FK_sale_items_sale_operations_operation_id",
                schema: "lou",
                table: "sale_items");

            migrationBuilder.RenameIndex(
                name: "IX_payment_idempotency_key_hash",
                schema: "lou",
                table: "payment_idempotency",
                newName: "ux_payment_idempotency_key_hash");

            migrationBuilder.RenameIndex(
                name: "IX_commission_entries_sale_item_id",
                schema: "lou",
                table: "commission_entries",
                newName: "ux_commission_entries_sale_item");

            migrationBuilder.AddCheckConstraint(
                name: "ck_sale_operations_non_negative",
                schema: "lou",
                table: "sale_operations",
                sql: "subtotal_cents >= 0 AND discount_cents >= 0 AND courtesy_cents >= 0 AND total_cents >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "ck_sale_operations_total",
                schema: "lou",
                table: "sale_operations",
                sql: "total_cents = subtotal_cents - discount_cents - courtesy_cents");

            migrationBuilder.CreateIndex(
                name: "IX_sale_items_barber_id",
                schema: "lou",
                table: "sale_items",
                column: "barber_id");

            migrationBuilder.AddCheckConstraint(
                name: "ck_sale_items_price",
                schema: "lou",
                table: "sale_items",
                sql: "unit_price_cents >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "ck_payments_amount",
                schema: "lou",
                table: "payments",
                sql: "amount_cents > 0");

            migrationBuilder.CreateIndex(
                name: "ux_payment_idempotency_operation",
                schema: "lou",
                table: "payment_idempotency",
                column: "operation_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_commission_entries_barber_id",
                schema: "lou",
                table: "commission_entries",
                column: "barber_id");

            migrationBuilder.AddCheckConstraint(
                name: "ck_commission_entries_values",
                schema: "lou",
                table: "commission_entries",
                sql: "base_cents >= 0 AND amount_cents >= 0 AND rate_basis_points >= 0 AND rate_basis_points <= 10000");

            migrationBuilder.AddForeignKey(
                name: "FK_commission_entries_barber_profiles_barber_id",
                schema: "lou",
                table: "commission_entries",
                column: "barber_id",
                principalSchema: "lou",
                principalTable: "barber_profiles",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_commission_entries_sale_items_sale_item_id",
                schema: "lou",
                table: "commission_entries",
                column: "sale_item_id",
                principalSchema: "lou",
                principalTable: "sale_items",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_payment_idempotency_sale_operations_operation_id",
                schema: "lou",
                table: "payment_idempotency",
                column: "operation_id",
                principalSchema: "lou",
                principalTable: "sale_operations",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_payments_sale_operations_operation_id",
                schema: "lou",
                table: "payments",
                column: "operation_id",
                principalSchema: "lou",
                principalTable: "sale_operations",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_sale_items_barber_profiles_barber_id",
                schema: "lou",
                table: "sale_items",
                column: "barber_id",
                principalSchema: "lou",
                principalTable: "barber_profiles",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_sale_items_sale_operations_operation_id",
                schema: "lou",
                table: "sale_items",
                column: "operation_id",
                principalSchema: "lou",
                principalTable: "sale_operations",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_commission_entries_barber_profiles_barber_id",
                schema: "lou",
                table: "commission_entries");

            migrationBuilder.DropForeignKey(
                name: "FK_commission_entries_sale_items_sale_item_id",
                schema: "lou",
                table: "commission_entries");

            migrationBuilder.DropForeignKey(
                name: "FK_payment_idempotency_sale_operations_operation_id",
                schema: "lou",
                table: "payment_idempotency");

            migrationBuilder.DropForeignKey(
                name: "FK_payments_sale_operations_operation_id",
                schema: "lou",
                table: "payments");

            migrationBuilder.DropForeignKey(
                name: "FK_sale_items_barber_profiles_barber_id",
                schema: "lou",
                table: "sale_items");

            migrationBuilder.DropForeignKey(
                name: "FK_sale_items_sale_operations_operation_id",
                schema: "lou",
                table: "sale_items");

            migrationBuilder.DropCheckConstraint(
                name: "ck_sale_operations_non_negative",
                schema: "lou",
                table: "sale_operations");

            migrationBuilder.DropCheckConstraint(
                name: "ck_sale_operations_total",
                schema: "lou",
                table: "sale_operations");

            migrationBuilder.DropIndex(
                name: "IX_sale_items_barber_id",
                schema: "lou",
                table: "sale_items");

            migrationBuilder.DropCheckConstraint(
                name: "ck_sale_items_price",
                schema: "lou",
                table: "sale_items");

            migrationBuilder.DropCheckConstraint(
                name: "ck_payments_amount",
                schema: "lou",
                table: "payments");

            migrationBuilder.DropIndex(
                name: "ux_payment_idempotency_operation",
                schema: "lou",
                table: "payment_idempotency");

            migrationBuilder.DropIndex(
                name: "IX_commission_entries_barber_id",
                schema: "lou",
                table: "commission_entries");

            migrationBuilder.DropCheckConstraint(
                name: "ck_commission_entries_values",
                schema: "lou",
                table: "commission_entries");

            migrationBuilder.RenameIndex(
                name: "ux_payment_idempotency_key_hash",
                schema: "lou",
                table: "payment_idempotency",
                newName: "IX_payment_idempotency_key_hash");

            migrationBuilder.RenameIndex(
                name: "ux_commission_entries_sale_item",
                schema: "lou",
                table: "commission_entries",
                newName: "IX_commission_entries_sale_item_id");

            migrationBuilder.AddForeignKey(
                name: "FK_payments_sale_operations_operation_id",
                schema: "lou",
                table: "payments",
                column: "operation_id",
                principalSchema: "lou",
                principalTable: "sale_operations",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_sale_items_sale_operations_operation_id",
                schema: "lou",
                table: "sale_items",
                column: "operation_id",
                principalSchema: "lou",
                principalTable: "sale_operations",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
