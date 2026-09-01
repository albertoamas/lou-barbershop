using LouBarbershop.Domain.Scheduling;

namespace LouBarbershop.Domain.Tests.Scheduling;

public sealed class TimeRangeTests
{
    [Fact]
    public void Create_WhenEndIsNotAfterStart_ReturnsValidationError()
    {
        var instant = new DateTimeOffset(2026, 9, 1, 9, 0, 0, TimeSpan.Zero);

        var result = TimeRange.Create(instant, instant);

        Assert.False(result.IsSuccess);
        Assert.Equal("time.invalid_range", result.Error?.Code);
    }

    [Fact]
    public void Overlaps_WhenRangesAreAdjacent_ReturnsFalse()
    {
        var first = TimeRange.Create(
            new DateTimeOffset(2026, 9, 1, 9, 0, 0, TimeSpan.Zero),
            new DateTimeOffset(2026, 9, 1, 9, 30, 0, TimeSpan.Zero)).Value;
        var second = TimeRange.Create(
            new DateTimeOffset(2026, 9, 1, 9, 30, 0, TimeSpan.Zero),
            new DateTimeOffset(2026, 9, 1, 10, 0, 0, TimeSpan.Zero)).Value;

        Assert.False(first.Overlaps(second));
    }

    [Fact]
    public void Overlaps_WhenRangesIntersect_ReturnsTrue()
    {
        var first = TimeRange.Create(
            new DateTimeOffset(2026, 9, 1, 9, 0, 0, TimeSpan.Zero),
            new DateTimeOffset(2026, 9, 1, 10, 0, 0, TimeSpan.Zero)).Value;
        var second = TimeRange.Create(
            new DateTimeOffset(2026, 9, 1, 9, 45, 0, TimeSpan.Zero),
            new DateTimeOffset(2026, 9, 1, 10, 15, 0, TimeSpan.Zero)).Value;

        Assert.True(first.Overlaps(second));
    }
}
