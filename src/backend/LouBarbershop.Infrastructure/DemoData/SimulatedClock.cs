using LouBarbershop.Application.Abstractions;

namespace LouBarbershop.Infrastructure.DemoData;

/// <summary>
/// Clock the demo seeder moves through past days so application services stamp
/// operations, payments and events as if they had happened at that time.
/// Registered only by <see cref="DemoSeedingRegistration.AddDemoSeeding"/>.
/// </summary>
public sealed class SimulatedClock : IClock
{
    public DateTimeOffset UtcNow { get; private set; } = DateTimeOffset.UtcNow;

    public void Set(DateTimeOffset instant) => UtcNow = instant.ToUniversalTime();
}
