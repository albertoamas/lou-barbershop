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
        await using var postgreSql = new PostgreSqlBuilder("postgres:18.6-alpine3.24").Build();
        await postgreSql.StartAsync();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(postgreSql.GetConnectionString())
            .Options;

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
        }

        await using var verificationContext = new AppDbContext(options);
        var persisted = await verificationContext.Customers.SingleAsync();
        var auditLog = await verificationContext.AuditLogs.SingleAsync();

        Assert.Equal(customer.Id, persisted.Id);
        Assert.Equal("+59171234567", persisted.PhoneNumber.Value);
        Assert.True(persisted.Active);
        Assert.Equal(customer.Id, auditLog.EntityId);
        Assert.Equal("customer", auditLog.EntityType);
    }
}
