using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LouBarbershop.Infrastructure.Persistence.Migrations;

/// <inheritdoc />
public partial class AddReportingPerformanceIndexes : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateIndex(
            name: "ix_settlements_status_payment_date",
            schema: "lou",
            table: "settlements",
            columns: ["status", "payment_date"]);

        migrationBuilder.CreateIndex(
            name: "ix_sale_operations_status_paid_at",
            schema: "lou",
            table: "sale_operations",
            columns: ["status", "paid_at"]);

        migrationBuilder.CreateIndex(
            name: "ix_commission_entries_earned_status",
            schema: "lou",
            table: "commission_entries",
            columns: ["earned_at", "status"]);
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(
            name: "ix_settlements_status_payment_date",
            schema: "lou",
            table: "settlements");

        migrationBuilder.DropIndex(
            name: "ix_sale_operations_status_paid_at",
            schema: "lou",
            table: "sale_operations");

        migrationBuilder.DropIndex(
            name: "ix_commission_entries_earned_status",
            schema: "lou",
            table: "commission_entries");
    }
}
