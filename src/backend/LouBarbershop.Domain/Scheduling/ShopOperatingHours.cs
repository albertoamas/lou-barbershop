namespace LouBarbershop.Domain.Scheduling;

internal readonly record struct LocalOpeningWindow(TimeOnly StartsAt, TimeOnly EndsAt)
{
    public bool Contains(TimeOnly startsAt, TimeOnly endsAt) => startsAt >= StartsAt && endsAt <= EndsAt;
}

public static class ShopOperatingHours
{
    public const int ReservationStartIntervalMinutes = 30;

    private static readonly LocalOpeningWindow[] Windows =
    [
        new(new TimeOnly(8, 0), new TimeOnly(13, 0)),
        new(new TimeOnly(15, 0), new TimeOnly(21, 0)),
    ];

    public static bool Contains(TimeOnly startsAt, TimeOnly endsAt) =>
        endsAt > startsAt && Windows.Any(window => window.Contains(startsAt, endsAt));

    public static bool Contains(TimeRange range, TimeZoneInfo timeZone)
    {
        var localStart = TimeZoneInfo.ConvertTime(range.StartsAt, timeZone);
        var localEnd = TimeZoneInfo.ConvertTime(range.EndsAt, timeZone);
        return DateOnly.FromDateTime(localStart.DateTime) == DateOnly.FromDateTime(localEnd.DateTime)
            && Contains(TimeOnly.FromDateTime(localStart.DateTime), TimeOnly.FromDateTime(localEnd.DateTime));
    }

    internal static IEnumerable<LocalOpeningWindow> GetWindows()
    {
        foreach (var window in Windows) yield return window;
    }
}
