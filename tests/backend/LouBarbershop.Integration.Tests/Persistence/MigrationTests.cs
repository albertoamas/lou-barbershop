using LouBarbershop.Domain.Customers;
using LouBarbershop.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Testcontainers.PostgreSql;

namespace LouBarbershop.Integration.Tests.Persistence;

public sealed class MigrationTests
{
    [Fact]
    public async Task MigrationsApplyToEmptyPostgreSqlAndPersistCustomer()
    {
        var externalConnectionString = Environment.GetEnvironmentVariable("LOU_MIGRATION_TEST_CONNECTION");
        PostgreSqlContainer? postgreSql = null;
        if (string.IsNullOrWhiteSpace(externalConnectionString))
        {
            postgreSql = new PostgreSqlBuilder("postgres:18.6-alpine3.24").Build();
            await postgreSql.StartAsync();
        }

        var builder = new DbContextOptionsBuilder<AppDbContext>();
        builder.UseLouPostgreSql(externalConnectionString ?? postgreSql!.GetConnectionString());
        var options = builder.Options;

        var phoneNumber = PhoneNumber.Create("+59171234567").Value;
        var customer = Customer.Create(
            Guid.Parse("e82f5cdf-bb5a-4c50-a3c7-325bfd20939c"),
            "Cliente de prueba",
            phoneNumber,
            null,
            DateTimeOffset.UtcNow).Value;

        await using (var context = new AppDbContext(options))
        {
            await context.Database.MigrateAsync();
            context.Customers.Add(customer);
            await context.SaveChangesAsync();

            var migrations = await context.Database.GetAppliedMigrationsAsync();
            Assert.Contains("20260901010253_InitialTechnicalBaseline", migrations);
            Assert.Contains("20260901164600_AddCustomerFoundation", migrations);
            Assert.Contains("20260901201104_AddAuditLog", migrations);
            Assert.Contains("20260901203102_AddInternalIdentity", migrations);
            Assert.Contains("20260902034855_NormalizeIdentitySchema", migrations);
            Assert.Contains("20260902035330_UsePostgreSqlXminConcurrency", migrations);
            Assert.Contains("20260902193625_AddPhaseFourMasterData", migrations);
            Assert.Contains("20260902203000_ProtectCommissionRuleHistory", migrations);
            Assert.Contains("20260903011634_AddSchedulingAvailability", migrations);
            Assert.Contains("20260904020203_AddAppointmentEvents", migrations);
            Assert.Contains("20260908002223_AddServiceOperations", migrations);
            Assert.Contains("20260908010554_HardenServiceOperations", migrations);
            Assert.Contains("20260908180229_AddInventoryAndExpenses", migrations);
            Assert.Contains("20260908235544_AddCommissionSettlements", migrations);
            Assert.Contains("20260909044837_AddReportingAuditIndex", migrations);
            Assert.Contains("20260909111737_AddPublicBookingManagement", migrations);
            Assert.Contains("20260909124042_AddReportingPerformanceIndexes", migrations);
        }

        await using var verificationContext = new AppDbContext(options);
        var persisted = await verificationContext.Customers.SingleAsync();
        var auditLog = await verificationContext.AuditLogs.SingleAsync();

        Assert.Equal(customer.Id, persisted.Id);
        Assert.Equal("+59171234567", persisted.PhoneNumber.Value);
        Assert.True(persisted.Active);
        Assert.Equal(customer.Id, auditLog.EntityId);
        Assert.Equal("customer", auditLog.EntityType);

        if (postgreSql is not null)
        {
            await postgreSql.DisposeAsync();
        }
    }

    // Production runs as a user named "lou", whose "$user" search path resolves to the
    // "lou" schema once the first migration creates it. Migrating again must still find
    // the history and apply nothing.
    [Fact]
    public async Task MigrationsCanRunAgainWhenTheDatabaseUserOwnsTheLouSchema()
    {
        await using var postgreSql = new PostgreSqlBuilder("postgres:18.6-alpine3.24")
            .WithUsername("lou")
            .WithDatabase("lou_barbershop")
            .Build();
        await postgreSql.StartAsync();
        var builder = new DbContextOptionsBuilder<AppDbContext>();
        builder.UseLouPostgreSql(postgreSql.GetConnectionString());

        await using (var first = new AppDbContext(builder.Options))
        {
            await first.Database.MigrateAsync();
        }

        await using var second = new AppDbContext(builder.Options);
        await second.Database.MigrateAsync();

        Assert.Empty(await second.Database.GetPendingMigrationsAsync());
        var historySchemas = await second.Database
            .SqlQueryRaw<string>(
                "SELECT table_schema AS \"Value\" FROM information_schema.tables WHERE table_name = '__EFMigrationsHistory'")
            .ToListAsync();
        Assert.Equal([PostgreSqlOptions.MigrationsHistorySchema], historySchemas);
    }
}
