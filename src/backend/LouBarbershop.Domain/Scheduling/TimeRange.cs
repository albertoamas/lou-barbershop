using LouBarbershop.Domain.Common;

namespace LouBarbershop.Domain.Scheduling;

public readonly record struct TimeRange
{
    private TimeRange(DateTimeOffset startsAt, DateTimeOffset endsAt)
    {
        StartsAt = startsAt.ToUniversalTime();
        EndsAt = endsAt.ToUniversalTime();
    }

    public DateTimeOffset StartsAt { get; }

    public DateTimeOffset EndsAt { get; }

    public static DomainResult<TimeRange> Create(DateTimeOffset startsAt, DateTimeOffset endsAt) => endsAt <= startsAt
        ? DomainResult.Failure<TimeRange>(DomainErrors.InvalidTimeRange)
        : DomainResult.Success(new TimeRange(startsAt, endsAt));

    public bool Overlaps(TimeRange other) => StartsAt < other.EndsAt && other.StartsAt < EndsAt;
}
