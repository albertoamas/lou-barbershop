using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable IDE0161

namespace LouBarbershop.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCustomerFoundation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(name: "lou");

            migrationBuilder.CreateTable(
                name: "customers",
                schema: "lou",
                columns: table => new
                {
                    id = table.Column<System.Guid>(type: "uuid", nullable: false),
                    display_name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    phone_e164 = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<System.DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<System.DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    version = table.Column<uint>(type: "xid", rowVersion: true, nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_customers", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_customers_display_name",
                schema: "lou",
                table: "customers",
                column: "display_name");

            migrationBuilder.CreateIndex(
                name: "ix_customers_phone_e164",
                schema: "lou",
                table: "customers",
                column: "phone_e164");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "customers", schema: "lou");
        }
    }
}
