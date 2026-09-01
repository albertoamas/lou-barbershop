namespace LouBarbershop.Application.Abstractions;

public interface IClock
{
    DateTimeOffset UtcNow { get; }
}
