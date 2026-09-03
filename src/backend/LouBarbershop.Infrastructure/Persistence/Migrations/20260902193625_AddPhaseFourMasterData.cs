
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LouBarbershop.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPhaseFourMasterData : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("CREATE EXTENSION IF NOT EXISTS btree_gist;");
            migrationBuilder.AddColumn<string>(
                name: "after_data",
                schema: "lou",
                table: "audit_logs",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "before_data",
                schema: "lou",
                table: "audit_logs",
                type: "jsonb",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "expense_categories",
                schema: "lou",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_expense_categories", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "products",
                schema: "lou",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    brand = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: true),
                    sku = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    sale_price_cents = table.Column<long>(type: "bigint", nullable: false),
                    average_cost_cents = table.Column<long>(type: "bigint", nullable: false),
                    minimum_stock = table.Column<int>(type: "integer", nullable: false),
                    active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_products", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "services",
                schema: "lou",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    default_duration_minutes = table.Column<int>(type: "integer", nullable: false),
                    default_price_cents = table.Column<long>(type: "bigint", nullable: false),
                    active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_services", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "staff_profiles",
                schema: "lou",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    display_name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    phone = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_staff_profiles", x => x.id);
                    table.ForeignKey(
                        name: "FK_staff_profiles_users_user_id",
                        column: x => x.user_id,
                        principalSchema: "lou",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "barber_profiles",
                schema: "lou",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    staff_profile_id = table.Column<Guid>(type: "uuid", nullable: false),
                    employment_type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    settlement_frequency = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    color = table.Column<string>(type: "character varying(7)", maxLength: 7, nullable: true),
                    active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_barber_profiles", x => x.id);
                    table.ForeignKey(
                        name: "FK_barber_profiles_staff_profiles_staff_profile_id",
                        column: x => x.staff_profile_id,
                        principalSchema: "lou",
                        principalTable: "staff_profiles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "barber_service_offerings",
                schema: "lou",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    barber_id = table.Column<Guid>(type: "uuid", nullable: false),
                    service_id = table.Column<Guid>(type: "uuid", nullable: false),
                    duration_minutes = table.Column<int>(type: "integer", nullable: false),
                    price_cents = table.Column<long>(type: "bigint", nullable: false),
                    active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false),
                    valid_from = table.Column<DateOnly>(type: "date", nullable: false),
                    valid_to = table.Column<DateOnly>(type: "date", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_barber_service_offerings", x => x.id);
                    table.ForeignKey(
                        name: "FK_barber_service_offerings_barber_profiles_barber_id",
                        column: x => x.barber_id,
                        principalSchema: "lou",
                        principalTable: "barber_profiles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_barber_service_offerings_services_service_id",
                        column: x => x.service_id,
                        principalSchema: "lou",
                        principalTable: "services",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "commission_rules",
                schema: "lou",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    barber_id = table.Column<Guid>(type: "uuid", nullable: false),
                    kind = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    rate_basis_points = table.Column<int>(type: "integer", nullable: false),
                    created_by = table.Column<Guid>(type: "uuid", nullable: false),
                    active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false),
                    valid_from = table.Column<DateOnly>(type: "date", nullable: false),
                    valid_to = table.Column<DateOnly>(type: "date", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_commission_rules", x => x.id);
                    table.ForeignKey(
                        name: "FK_commission_rules_barber_profiles_barber_id",
                        column: x => x.barber_id,
                        principalSchema: "lou",
                        principalTable: "barber_profiles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ux_barber_profiles_staff_id",
                schema: "lou",
                table: "barber_profiles",
                column: "staff_profile_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_barber_service_offerings_service_id",
                schema: "lou",
                table: "barber_service_offerings",
                column: "service_id");

            migrationBuilder.CreateIndex(
                name: "ix_offerings_barber_service",
                schema: "lou",
                table: "barber_service_offerings",
                columns: new[] { "barber_id", "service_id" });

            migrationBuilder.CreateIndex(
                name: "ix_commission_rules_barber_kind",
                schema: "lou",
                table: "commission_rules",
                columns: new[] { "barber_id", "kind" });

            migrationBuilder.CreateIndex(
                name: "ux_expense_categories_name",
                schema: "lou",
                table: "expense_categories",
                column: "name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ux_products_sku",
                schema: "lou",
                table: "products",
                column: "sku",
                unique: true,
                filter: "sku IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ix_services_name",
                schema: "lou",
                table: "services",
                column: "name");

            migrationBuilder.CreateIndex(
                name: "ux_staff_profiles_user_id",
                schema: "lou",
                table: "staff_profiles",
                column: "user_id",
                unique: true);

            migrationBuilder.Sql("ALTER TABLE lou.services ADD CONSTRAINT ck_services_duration CHECK (default_duration_minutes BETWEEN 5 AND 480), ADD CONSTRAINT ck_services_price CHECK (default_price_cents >= 0);");
            migrationBuilder.Sql("ALTER TABLE lou.products ADD CONSTRAINT ck_products_values CHECK (sale_price_cents >= 0 AND average_cost_cents >= 0 AND minimum_stock >= 0);");
            migrationBuilder.Sql("ALTER TABLE lou.barber_profiles ADD CONSTRAINT ck_barber_employment_type CHECK (employment_type IN ('OWNER','CONTRACTOR')), ADD CONSTRAINT ck_barber_settlement_frequency CHECK (settlement_frequency IN ('BIWEEKLY','MONTHLY'));");
            migrationBuilder.Sql("ALTER TABLE lou.barber_service_offerings ADD CONSTRAINT ck_offerings_values CHECK (duration_minutes BETWEEN 5 AND 480 AND price_cents >= 0 AND (valid_to IS NULL OR valid_to >= valid_from));");
            migrationBuilder.Sql("ALTER TABLE lou.commission_rules ADD CONSTRAINT ck_commission_rules_values CHECK (kind IN ('SERVICE','PRODUCT') AND rate_basis_points BETWEEN 0 AND 10000 AND (valid_to IS NULL OR valid_to >= valid_from));");
            migrationBuilder.Sql("ALTER TABLE lou.barber_service_offerings ADD CONSTRAINT ex_offerings_no_overlap EXCLUDE USING gist (barber_id WITH =, service_id WITH =, daterange(valid_from, valid_to, '[]') WITH &&) WHERE (active);");
            migrationBuilder.Sql("ALTER TABLE lou.commission_rules ADD CONSTRAINT ex_commission_rules_no_overlap EXCLUDE USING gist (barber_id WITH =, kind WITH =, daterange(valid_from, valid_to, '[]') WITH &&) WHERE (active);");

            migrationBuilder.InsertData(
                schema: "lou",
                table: "expense_categories",
                columns: new[] { "id", "name", "active", "created_at", "updated_at" },
                values: new object[,]
                {
                    { new Guid("4eaa6268-0da7-43a9-ae4a-c9f45b25c001"), "Alquiler", true, new DateTimeOffset(2026, 1, 1, 0, 0, 0, TimeSpan.Zero), new DateTimeOffset(2026, 1, 1, 0, 0, 0, TimeSpan.Zero) },
                    { new Guid("4eaa6268-0da7-43a9-ae4a-c9f45b25c002"), "Servicios básicos", true, new DateTimeOffset(2026, 1, 1, 0, 0, 0, TimeSpan.Zero), new DateTimeOffset(2026, 1, 1, 0, 0, 0, TimeSpan.Zero) },
                    { new Guid("4eaa6268-0da7-43a9-ae4a-c9f45b25c003"), "Insumos", true, new DateTimeOffset(2026, 1, 1, 0, 0, 0, TimeSpan.Zero), new DateTimeOffset(2026, 1, 1, 0, 0, 0, TimeSpan.Zero) },
                    { new Guid("4eaa6268-0da7-43a9-ae4a-c9f45b25c004"), "Mantenimiento", true, new DateTimeOffset(2026, 1, 1, 0, 0, 0, TimeSpan.Zero), new DateTimeOffset(2026, 1, 1, 0, 0, 0, TimeSpan.Zero) },
                    { new Guid("4eaa6268-0da7-43a9-ae4a-c9f45b25c005"), "Otros", true, new DateTimeOffset(2026, 1, 1, 0, 0, 0, TimeSpan.Zero), new DateTimeOffset(2026, 1, 1, 0, 0, 0, TimeSpan.Zero) },
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "barber_service_offerings",
                schema: "lou");

            migrationBuilder.DropTable(
                name: "commission_rules",
                schema: "lou");

            migrationBuilder.DropTable(
                name: "expense_categories",
                schema: "lou");

            migrationBuilder.DropTable(
                name: "products",
                schema: "lou");

            migrationBuilder.DropTable(
                name: "services",
                schema: "lou");

            migrationBuilder.DropTable(
                name: "barber_profiles",
                schema: "lou");

            migrationBuilder.DropTable(
                name: "staff_profiles",
                schema: "lou");

            migrationBuilder.DropColumn(
                name: "after_data",
                schema: "lou",
                table: "audit_logs");

            migrationBuilder.DropColumn(
                name: "before_data",
                schema: "lou",
                table: "audit_logs");
        }
    }
}
