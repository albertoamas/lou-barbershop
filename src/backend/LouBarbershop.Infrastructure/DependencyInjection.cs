using LouBarbershop.Application.Abstractions;
using LouBarbershop.Infrastructure.CurrentActor;
using LouBarbershop.Infrastructure.Identifiers;
using LouBarbershop.Infrastructure.Persistence;
using LouBarbershop.Infrastructure.Time;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace LouBarbershop.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Database");

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "ConnectionStrings:Database must be configured. Use user secrets or environment variables outside local development.");
        }

        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(
                connectionString,
                npgsql => npgsql.MigrationsAssembly(typeof(AppDbContext).Assembly.FullName)));
        services.AddSingleton<IClock, SystemClock>();
        services.AddSingleton<IIdGenerator, GuidIdGenerator>();
        services.AddScoped<ICurrentActor, AnonymousCurrentActor>();
        services.AddScoped<IUnitOfWork, EfUnitOfWork>();

        return services;
    }
}
