using LouBarbershop.Application.Abstractions;

namespace LouBarbershop.Infrastructure.Time;

public sealed class SystemClock : IClock
{
    public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;
}
