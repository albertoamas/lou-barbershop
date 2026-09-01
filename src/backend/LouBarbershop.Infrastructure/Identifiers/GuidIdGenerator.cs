using LouBarbershop.Application.Abstractions;

namespace LouBarbershop.Infrastructure.Identifiers;

public sealed class GuidIdGenerator : IIdGenerator
{
    public Guid Create() => Guid.NewGuid();
}
