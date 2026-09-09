namespace LouBarbershop.Application.Abstractions;

public interface IRequestContext
{
    string? RequestId { get; }
}
