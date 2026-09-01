using Microsoft.EntityFrameworkCore;

namespace LouBarbershop.Infrastructure.Persistence;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        ArgumentNullException.ThrowIfNull(modelBuilder);

        modelBuilder.HasDefaultSchema("lou");
        base.OnModelCreating(modelBuilder);
    }
}
