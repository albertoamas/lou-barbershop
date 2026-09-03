using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LouBarbershop.Infrastructure.Persistence.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260902203000_ProtectCommissionRuleHistory")]
public sealed class ProtectCommissionRuleHistory : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("ALTER TABLE lou.commission_rules DROP CONSTRAINT ex_commission_rules_no_overlap;");
        migrationBuilder.Sql("ALTER TABLE lou.commission_rules ADD CONSTRAINT ex_commission_rules_no_overlap EXCLUDE USING gist (barber_id WITH =, kind WITH =, daterange(valid_from, valid_to, '[]') WITH &&);");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("ALTER TABLE lou.commission_rules DROP CONSTRAINT ex_commission_rules_no_overlap;");
        migrationBuilder.Sql("ALTER TABLE lou.commission_rules ADD CONSTRAINT ex_commission_rules_no_overlap EXCLUDE USING gist (barber_id WITH =, kind WITH =, daterange(valid_from, valid_to, '[]') WITH &&) WHERE (active);");
    }
}
