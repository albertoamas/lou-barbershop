using LouBarbershop.Application.Abstractions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace LouBarbershop.Infrastructure.DemoData;

public static class DemoSeedingRegistration
{
    /// <summary>
    /// Replaces the clock and current actor for a one-off demo seeding process. Never
    /// call this in a process that serves requests: every service would see the
    /// simulated time and the seeding actor.
    /// </summary>
    public static IServiceCollection AddDemoSeeding(this IServiceCollection services)
    {
        var clock = new SimulatedClock();
        var actor = new SeedActor();
        services.Replace(ServiceDescriptor.Singleton<IClock>(clock));
        services.Replace(ServiceDescriptor.Scoped<ICurrentActor>(_ => actor));
        services.AddSingleton(clock);
        services.AddSingleton(actor);
        services.AddSingleton<DemoSeeder>();
        return services;
    }
}
