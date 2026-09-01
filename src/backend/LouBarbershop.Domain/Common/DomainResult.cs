namespace LouBarbershop.Domain.Common;

public sealed class DomainResult<T>
{
    internal DomainResult(T value, DomainError? error)
    {
        Value = value;
        Error = error;
    }

    public T Value { get; }

    public DomainError? Error { get; }

    public bool IsSuccess => Error is null;

}

public static class DomainResult
{
    public static DomainResult<T> Success<T>(T value) => new(value, null);

    public static DomainResult<T> Failure<T>(DomainError error)
    {
        ArgumentNullException.ThrowIfNull(error);

        return new DomainResult<T>(default!, error);
    }
}
