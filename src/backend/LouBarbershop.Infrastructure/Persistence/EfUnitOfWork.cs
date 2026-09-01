using LouBarbershop.Application.Abstractions;

namespace LouBarbershop.Infrastructure.Persistence;

public sealed class EfUnitOfWork(AppDbContext dbContext) : IUnitOfWork
{
    public Task SaveChangesAsync(CancellationToken cancellationToken) => dbContext.SaveChangesAsync(cancellationToken);
}
