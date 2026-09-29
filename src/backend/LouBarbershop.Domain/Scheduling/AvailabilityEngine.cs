using LouBarbershop.Domain.Finance;

namespace LouBarbershop.Domain.Scheduling;

public sealed record AvailabilityTerms(Guid BarberId, Guid ServiceId, DateOnly Date, int DurationMinutes, Money Price);
public sealed record BusyAppointment(Guid AppointmentId, Guid BarberId, TimeRange Range);
public sealed record AvailabilitySlot(Guid BarberId, Guid ServiceId, DateTimeOffset StartsAt, DateTimeOffset EndsAt, int DurationMinutes, Money Price);

public static class AvailabilityEngine
{
    public const int StepMinutes = ShopOperatingHours.ReservationStartIntervalMinutes;

    public static IReadOnlyCollection<AvailabilitySlot> Calculate(
        DateOnly dateFrom,
        DateOnly dateTo,
        DateTimeOffset now,
        TimeZoneInfo timeZone,
        IReadOnlyCollection<AvailabilityTerms> terms,
        IReadOnlyCollection<WorkingSchedule> schedules,
        IReadOnlyCollection<AvailabilityExceptionRule> exceptions,
        IReadOnlyCollection<BusyAppointment> appointments)
    {
        if (dateTo < dateFrom) return [];
        var result = new List<AvailabilitySlot>();
        var seen = new HashSet<(Guid BarberId, DateTimeOffset StartsAt)>();

        foreach (var item in terms.Where(x => x.Date >= dateFrom && x.Date <= dateTo))
        {
            var date = item.Date;
            var weekday = ((int)date.DayOfWeek + 6) % 7 + 1;
            var available = schedules
                .Where(x => x.BarberId == item.BarberId && x.Active && x.Weekday == weekday && x.Period.Contains(date))
                .Select(x => ToUtcRange(date, x.StartLocalTime, x.EndLocalTime, timeZone))
                .Where(x => x.HasValue)
                .Select(x => x!.Value)
                .ToList();

            var activeExceptions = exceptions.Where(x => x.BarberId == item.BarberId && x.Active).ToArray();
            available.AddRange(activeExceptions
                .Where(x => x.Kind is AvailabilityExceptionKind.AvailableOverride && IsOnLocalDate(x.Range, date, timeZone))
                .Select(x => ClipToLocalDate(x.Range, date, timeZone))
                .Where(x => x.HasValue)
                .Select(x => x!.Value));

            foreach (var window in IntersectWithShopHours(available, date, timeZone))
            {
                foreach (var slot in GenerateSlots(item, window, now, timeZone))
                {
                    var range = TimeRange.Create(slot.StartsAt, slot.EndsAt).Value;
                    var unavailable = activeExceptions.Any(x => x.Kind is AvailabilityExceptionKind.Unavailable && x.Range.Overlaps(range));
                    var occupied = appointments.Any(x => x.BarberId == item.BarberId && x.Range.Overlaps(range));
                    if (!unavailable && !occupied && seen.Add((item.BarberId, slot.StartsAt))) result.Add(slot);
                }
            }
        }

        return result.OrderBy(x => x.StartsAt).ThenBy(x => x.BarberId).ToArray();
    }

    public static bool IsCovered(TimeRange appointment, Guid barberId, TimeZoneInfo timeZone, IReadOnlyCollection<WorkingSchedule> schedules, IReadOnlyCollection<AvailabilityExceptionRule> exceptions)
    {
        var localStart = TimeZoneInfo.ConvertTime(appointment.StartsAt, timeZone);
        var date = DateOnly.FromDateTime(localStart.DateTime);
        var weekday = ((int)date.DayOfWeek + 6) % 7 + 1;
        var windows = schedules.Where(x => x.BarberId == barberId && x.Active && x.Weekday == weekday && x.Period.Contains(date))
            .Select(x => ToUtcRange(date, x.StartLocalTime, x.EndLocalTime, timeZone)).Where(x => x.HasValue).Select(x => x!.Value).ToList();
        windows.AddRange(exceptions.Where(x => x.BarberId == barberId && x.Active && x.Kind is AvailabilityExceptionKind.AvailableOverride).Select(x => x.Range));
        windows = IntersectWithShopHours(windows, date, timeZone).ToList();
        var blocked = exceptions.Any(x => x.BarberId == barberId && x.Active && x.Kind is AvailabilityExceptionKind.Unavailable && x.Range.Overlaps(appointment));
        return !blocked && windows.Any(x => x.StartsAt <= appointment.StartsAt && x.EndsAt >= appointment.EndsAt);
    }

    private static IEnumerable<AvailabilitySlot> GenerateSlots(AvailabilityTerms terms, TimeRange window, DateTimeOffset now, TimeZoneInfo timeZone)
    {
        var localStart = TimeZoneInfo.ConvertTime(window.StartsAt, timeZone);
        var minute = localStart.Hour * 60 + localStart.Minute;
        minute = ((minute + StepMinutes - 1) / StepMinutes) * StepMinutes;
        var date = DateOnly.FromDateTime(localStart.DateTime);

        while (minute < 24 * 60)
        {
            var local = date.ToDateTime(TimeOnly.FromTimeSpan(TimeSpan.FromMinutes(minute)), DateTimeKind.Unspecified);
            var start = ToUtc(local, timeZone);
            if (!start.HasValue) { minute += StepMinutes; continue; }
            var end = start.Value.AddMinutes(terms.DurationMinutes);
            if (start.Value >= window.StartsAt && end <= window.EndsAt && start.Value >= now)
                yield return new AvailabilitySlot(terms.BarberId, terms.ServiceId, start.Value, end, terms.DurationMinutes, terms.Price);
            if (end > window.EndsAt) yield break;
            minute += StepMinutes;
        }
    }

    private static TimeRange? ToUtcRange(DateOnly date, TimeOnly start, TimeOnly end, TimeZoneInfo timeZone)
    {
        var startsAt = ToUtc(date.ToDateTime(start, DateTimeKind.Unspecified), timeZone);
        var endsAt = ToUtc(date.ToDateTime(end, DateTimeKind.Unspecified), timeZone);
        if (!startsAt.HasValue || !endsAt.HasValue || endsAt <= startsAt) return null;
        return TimeRange.Create(startsAt.Value, endsAt.Value).Value;
    }

    private static DateTimeOffset? ToUtc(DateTime local, TimeZoneInfo timeZone)
    {
        if (timeZone.IsInvalidTime(local)) return null;
        var offset = timeZone.IsAmbiguousTime(local)
            ? timeZone.GetAmbiguousTimeOffsets(local).Max()
            : timeZone.GetUtcOffset(local);
        return new DateTimeOffset(local, offset).ToUniversalTime();
    }

    private static IEnumerable<TimeRange> IntersectWithShopHours(IEnumerable<TimeRange> ranges, DateOnly date, TimeZoneInfo timeZone)
    {
        var openingRanges = ShopOperatingHours.GetWindows()
            .Select(window => ToUtcRange(date, window.StartsAt, window.EndsAt, timeZone))
            .Where(window => window.HasValue)
            .Select(window => window!.Value)
            .ToArray();

        foreach (var range in ranges)
        {
            foreach (var openingRange in openingRanges)
            {
                var startsAt = range.StartsAt > openingRange.StartsAt ? range.StartsAt : openingRange.StartsAt;
                var endsAt = range.EndsAt < openingRange.EndsAt ? range.EndsAt : openingRange.EndsAt;
                if (endsAt > startsAt) yield return TimeRange.Create(startsAt, endsAt).Value;
            }
        }
    }

    private static bool IsOnLocalDate(TimeRange range, DateOnly date, TimeZoneInfo timeZone)
    {
        var startDate = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(range.StartsAt, timeZone).DateTime);
        var endDate = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(range.EndsAt.AddTicks(-1), timeZone).DateTime);
        return date >= startDate && date <= endDate;
    }

    private static TimeRange? ClipToLocalDate(TimeRange range, DateOnly date, TimeZoneInfo timeZone)
    {
        var dayStart = ToUtc(date.ToDateTime(TimeOnly.MinValue, DateTimeKind.Unspecified), timeZone);
        var dayEnd = ToUtc(date.AddDays(1).ToDateTime(TimeOnly.MinValue, DateTimeKind.Unspecified), timeZone);
        if (!dayStart.HasValue || !dayEnd.HasValue) return null;
        var startsAt = range.StartsAt > dayStart.Value ? range.StartsAt : dayStart.Value;
        var endsAt = range.EndsAt < dayEnd.Value ? range.EndsAt : dayEnd.Value;
        return endsAt > startsAt ? TimeRange.Create(startsAt, endsAt).Value : null;
    }
}
