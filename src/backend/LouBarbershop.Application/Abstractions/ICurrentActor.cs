namespace LouBarbershop.Application.Abstractions;

public interface ICurrentActor
{
    Guid? UserId { get; }
    bool IsInRole(string role) => false;
}
