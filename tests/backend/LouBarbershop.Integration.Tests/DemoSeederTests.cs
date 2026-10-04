using LouBarbershop.Infrastructure.DemoData;
using LouBarbershop.Infrastructure.Identity;
using LouBarbershop.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Testcontainers.PostgreSql;

namespace LouBarbershop.Integration.Tests;

public sealed class DemoSeederTests : IAsyncLifetime
{
    private readonly PostgreSqlContainer _database = new PostgreSqlBuilder("postgres:18.6-alpine3.24").Build();
    private WebApplicationFactory<Program>? _factory;

    public async Task InitializeAsync()
    {
        await _database.StartAsync();
        _factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseSetting("ConnectionStrings:Database", _database.GetConnectionString());
            builder.UseSetting("BootstrapOwner:UserName", "owner-seed");
            builder.UseSetting("BootstrapOwner:Password", "Owner-seed!8426");
            builder.UseSetting("DemoSeed:StaffPassword", "Staff-seed!8426");
            builder.UseSetting("DemoSeed:HistoryDays", "7");
            builder.ConfigureTestServices(services => services.AddDemoSeeding());
        });

        await using var scope = _factory.Services.CreateAsyncScope();
        await scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.MigrateAsync();
        await scope.ServiceProvider.GetRequiredService<OwnerBootstrapper>().BootstrapAsync(CancellationToken.None);
    }

    public async Task DisposeAsync()
    {
        if (_factory is not null) await _factory.DisposeAsync();
        await _database.DisposeAsync();
    }

    [Fact]
    public async Task SeedsAConsistentWeekOfActivityThroughTheApplicationRules()
    {
        var seeder = _factory!.Services.GetRequiredService<DemoSeeder>();

        var summary = await seeder.SeedAsync(CancellationToken.None);

        Assert.Equal(60, summary.Customers);
        Assert.True(summary.Appointments > 50, $"Only {summary.Appointments} appointments were booked.");
        Assert.True(summary.PaidOperations > 20, $"Only {summary.PaidOperations} operations were paid.");
        Assert.True(summary.Settlements >= 2);

        await using var scope = _factory.Services.CreateAsyncScope();
        var database = scope.ServiceProvider.GetRequiredService<AppDbContext>().Database;
        async Task<int> CountAsync(string sql) => await database.SqlQueryRaw<int>(sql).SingleAsync();

        Assert.True(await CountAsync("SELECT count(DISTINCT status)::int AS \"Value\" FROM lou.appointments") >= 4);
        Assert.Equal(0, await CountAsync("""
            SELECT count(*)::int AS "Value" FROM lou.sale_operations o
            WHERE EXISTS (SELECT 1 FROM lou.payments p WHERE p.operation_id = o.id)
              AND o.total_cents <> (SELECT coalesce(sum(p.amount_cents), 0) FROM lou.payments p WHERE p.operation_id = o.id)
            """));
        Assert.Equal(0, await CountAsync("""
            SELECT count(*)::int AS "Value" FROM (
              SELECT product_id FROM lou.inventory_movements GROUP BY product_id HAVING sum(quantity_delta) < 0
            ) negative
            """));
        Assert.True(await CountAsync("SELECT count(*)::int AS \"Value\" FROM lou.expenses") > 0);
        Assert.Equal(0, await CountAsync("""
            SELECT count(*)::int AS "Value" FROM (
              SELECT customer_id FROM lou.appointments
              GROUP BY customer_id, (starts_at AT TIME ZONE 'America/La_Paz')::date HAVING count(*) > 1
            ) repeated
            """));
    }

    [Fact]
    public async Task RefusesToSeedADatabaseThatAlreadyHasStaff()
    {
        var seeder = _factory!.Services.GetRequiredService<DemoSeeder>();
        await seeder.SeedAsync(CancellationToken.None);

        var second = _factory.Services.GetRequiredService<DemoSeeder>();
        await Assert.ThrowsAsync<InvalidOperationException>(() => second.SeedAsync(CancellationToken.None));
    }
}
