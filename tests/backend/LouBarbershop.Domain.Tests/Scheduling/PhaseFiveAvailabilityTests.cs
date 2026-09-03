using System.Diagnostics;
using LouBarbershop.Domain.Common;
using LouBarbershop.Domain.Finance;
using LouBarbershop.Domain.Scheduling;

namespace LouBarbershop.Domain.Tests.Scheduling;

public sealed class PhaseFiveAvailabilityTests
{
    private static readonly TimeZoneInfo Bolivia = TimeZoneInfo.FindSystemTimeZoneById("America/La_Paz");
    private static readonly DateOnly Monday = new(2026, 9, 7);

    [Fact]
    public void AdjacentAppointmentsAreAllowedAndOverlappingSlotsAreRemoved()
    {
        var barberId = Guid.NewGuid();
        var terms = Terms(barberId, Monday, 45);
        var schedule = Schedule(barberId, 1, new TimeOnly(9, 0), new TimeOnly(12, 0));
        var busy = new BusyAppointment(Guid.NewGuid(), barberId, Range(Monday, new TimeOnly(10, 0), new TimeOnly(10, 45)));

        var slots = AvailabilityEngine.Calculate(Monday, Monday, At(Monday, new TimeOnly(8, 0)), Bolivia, [terms], [schedule], [], [busy]);

        Assert.Contains(slots, x => LocalTime(x.StartsAt) == new TimeOnly(9, 15) && LocalTime(x.EndsAt) == new TimeOnly(10, 0));
        Assert.Contains(slots, x => LocalTime(x.StartsAt) == new TimeOnly(10, 45));
        Assert.DoesNotContain(slots, x => LocalTime(x.StartsAt) >= new TimeOnly(9, 30) && LocalTime(x.StartsAt) < new TimeOnly(10, 45));
    }

    [Fact]
    public void UnavailableBlocksAndOverrideAddsCapacityOutsideRegularShift()
    {
        var barberId = Guid.NewGuid();
        var actor = Guid.NewGuid();
        var schedule = Schedule(barberId, 1, new TimeOnly(9, 0), new TimeOnly(11, 0));
        var unavailable = AvailabilityExceptionRule.Create(Guid.NewGuid(), barberId, Range(Monday, new TimeOnly(9, 30), new TimeOnly(10, 30)), AvailabilityExceptionKind.Unavailable, "Cita médica", actor, DateTimeOffset.UtcNow).Value;
        var extra = AvailabilityExceptionRule.Create(Guid.NewGuid(), barberId, Range(Monday, new TimeOnly(18, 0), new TimeOnly(19, 0)), AvailabilityExceptionKind.AvailableOverride, "Horario especial", actor, DateTimeOffset.UtcNow).Value;

        var slots = AvailabilityEngine.Calculate(Monday, Monday, At(Monday, new TimeOnly(8, 0)), Bolivia, [Terms(barberId, Monday, 30)], [schedule], [unavailable, extra], []);

        Assert.DoesNotContain(slots, x => LocalTime(x.StartsAt) >= new TimeOnly(9, 15) && LocalTime(x.StartsAt) < new TimeOnly(10, 30));
        Assert.Contains(slots, x => LocalTime(x.StartsAt) == new TimeOnly(18, 0));
    }

    [Fact]
    public void ShortGapsAndPastSlotsAreNeverOffered()
    {
        var barberId = Guid.NewGuid();
        var shortShift = Schedule(barberId, 1, new TimeOnly(9, 0), new TimeOnly(9, 30));
        var normalShift = Schedule(barberId, 1, new TimeOnly(10, 0), new TimeOnly(12, 0));

        var slots = AvailabilityEngine.Calculate(Monday, Monday, At(Monday, new TimeOnly(10, 20)), Bolivia, [Terms(barberId, Monday, 45)], [shortShift, normalShift], [], []);

        Assert.DoesNotContain(slots, x => LocalTime(x.StartsAt) < new TimeOnly(10, 20));
        Assert.DoesNotContain(slots, x => LocalTime(x.StartsAt) == new TimeOnly(9, 0));
        Assert.All(slots, x => Assert.Equal(0, LocalTime(x.StartsAt).Minute % 15));
    }

    [Fact]
    public void DstInvalidLocalTimesAreSkippedWithoutThrowing()
    {
        var zone = TimeZoneInfo.FindSystemTimeZoneById("America/New_York");
        var date = new DateOnly(2026, 3, 8);
        var barberId = Guid.NewGuid();
        var schedule = Schedule(barberId, 7, new TimeOnly(1, 30), new TimeOnly(4, 0), date);

        var slots = AvailabilityEngine.Calculate(date, date, new DateTimeOffset(2026, 3, 8, 0, 0, 0, TimeSpan.Zero), zone, [Terms(barberId, date, 30)], [schedule], [], []);

        Assert.NotEmpty(slots);
        Assert.DoesNotContain(slots, x => TimeZoneInfo.ConvertTime(x.StartsAt, zone).Hour == 2);
    }

    [Fact]
    public void OverrideAcrossMidnightIsCalculatedOnEachLocalDay()
    {
        var barberId = Guid.NewGuid();
        var tuesday = Monday.AddDays(1);
        var range = TimeRange.Create(At(Monday, new TimeOnly(23, 0)), At(tuesday, new TimeOnly(1, 0))).Value;
        var extra = AvailabilityExceptionRule.Create(Guid.NewGuid(), barberId, range, AvailabilityExceptionKind.AvailableOverride, "Apertura nocturna", Guid.NewGuid(), DateTimeOffset.UtcNow).Value;

        var slots = AvailabilityEngine.Calculate(Monday, tuesday, At(Monday, new TimeOnly(22, 0)), Bolivia, [Terms(barberId, Monday, 30), Terms(barberId, tuesday, 30)], [], [extra], []);

        Assert.Contains(slots, x => DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(x.StartsAt, Bolivia).DateTime) == Monday && LocalTime(x.StartsAt) == new TimeOnly(23, 30));
        Assert.Contains(slots, x => DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(x.StartsAt, Bolivia).DateTime) == tuesday && LocalTime(x.StartsAt) == new TimeOnly(0, 0));
    }

    [Fact]
    public void ObjectiveVolumeCompletesBelowThreeSeconds()
    {
        var terms = new List<AvailabilityTerms>();
        var schedules = new List<WorkingSchedule>();
        for (var index = 0; index < 10; index++)
        {
            var barberId = Guid.NewGuid();
            for (var weekday = 1; weekday <= 7; weekday++) schedules.Add(Schedule(barberId, weekday, new TimeOnly(8, 0), new TimeOnly(20, 0)));
            for (var date = Monday; date <= Monday.AddDays(30); date = date.AddDays(1)) terms.Add(Terms(barberId, date, 30));
        }
        var watch = Stopwatch.StartNew();
        var slots = AvailabilityEngine.Calculate(Monday, Monday.AddDays(30), At(Monday, new TimeOnly(7, 0)), Bolivia, terms, schedules, [], []);
        watch.Stop();

        Assert.NotEmpty(slots);
        Assert.True(watch.Elapsed < TimeSpan.FromSeconds(3), $"Elapsed: {watch.Elapsed}");
    }

    private static AvailabilityTerms Terms(Guid barberId, DateOnly date, int minutes) => new(barberId, Guid.NewGuid(), date, minutes, Money.Create(5_000).Value);
    private static WorkingSchedule Schedule(Guid barberId, int weekday, TimeOnly start, TimeOnly end, DateOnly? from = null) => WorkingSchedule.Create(Guid.NewGuid(), barberId, weekday, start, end, EffectivePeriod.Create(from ?? Monday, null).Value, DateTimeOffset.UtcNow).Value;
    private static TimeRange Range(DateOnly date, TimeOnly start, TimeOnly end) => TimeRange.Create(At(date, start), At(date, end)).Value;
    private static DateTimeOffset At(DateOnly date, TimeOnly time) { var local = date.ToDateTime(time, DateTimeKind.Unspecified); return new DateTimeOffset(local, Bolivia.GetUtcOffset(local)); }
    private static TimeOnly LocalTime(DateTimeOffset value) => TimeOnly.FromDateTime(TimeZoneInfo.ConvertTime(value, Bolivia).DateTime);
}
