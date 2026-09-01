using LouBarbershop.Application.Abstractions;

namespace LouBarbershop.Infrastructure.CurrentActor;

public sealed class AnonymousCurrentActor : ICurrentActor
{
    public Guid? UserId => null;
}
