using LouBarbershop.Application.Abstractions;
using LouBarbershop.Domain.Customers;
using Microsoft.EntityFrameworkCore;

namespace LouBarbershop.Infrastructure.Persistence;

public sealed class AppDbContext(
    DbContextOptions<AppDbContext> options,
    ICurrentActor? currentActor = null,
    IClock? clock = null) : DbContext(options)
{
    public DbSet<Customer> Customers => Set<Customer>();

    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        ArgumentNullException.ThrowIfNull(modelBuilder);

        modelBuilder.HasDefaultSchema("lou");
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        AddAuditLogs();
        return base.SaveChangesAsync(cancellationToken);
    }

    private void AddAuditLogs()
    {
        var changedCustomers = ChangeTracker.Entries<Customer>()
            .Where(entry => entry.State is EntityState.Added or EntityState.Modified or EntityState.Deleted)
            .ToArray();

        foreach (var entry in changedCustomers)
        {
            AuditLogs.Add(new AuditLog
            {
                Id = Guid.NewGuid(),
                ActorUserId = currentActor?.UserId,
                Action = entry.State.ToString(),
                EntityType = "customer",
                EntityId = entry.Entity.Id,
                CreatedAt = (clock?.UtcNow ?? DateTimeOffset.UtcNow).ToUniversalTime(),
            });
        }
    }
}
