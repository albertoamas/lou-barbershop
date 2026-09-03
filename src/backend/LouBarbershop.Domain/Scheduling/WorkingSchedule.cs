using LouBarbershop.Domain.Common;

namespace LouBarbershop.Domain.Scheduling;

public sealed class WorkingSchedule
{
    private WorkingSchedule() { }

    private WorkingSchedule(Guid id, Guid barberId, int weekday, TimeOnly start, TimeOnly end, EffectivePeriod period, DateTimeOffset at)
    {
        Id = id;
        BarberId = barberId;
        Weekday = weekday;
        StartLocalTime = start;
        EndLocalTime = end;
        Period = period;
        Active = true;
        CreatedAt = at;
        UpdatedAt = at;
    }

    public Guid Id { get; private set; }
    public Guid BarberId { get; private set; }
    public int Weekday { get; private set; }
    public TimeOnly StartLocalTime { get; private set; }
    public TimeOnly EndLocalTime { get; private set; }
    public EffectivePeriod Period { get; private set; }
    public bool Active { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }
    public uint Version { get; private set; }

    public static DomainResult<WorkingSchedule> Create(Guid id, Guid barberId, int weekday, TimeOnly start, TimeOnly end, EffectivePeriod period, DateTimeOffset at)
    {
        if (id == Guid.Empty || barberId == Guid.Empty || weekday is < 1 or > 7 || end <= start)
            return DomainResult.Failure<WorkingSchedule>(DomainErrors.InvalidSchedule);

        return DomainResult.Success(new WorkingSchedule(id, barberId, weekday, start, end, period, at.ToUniversalTime()));
    }

    public DomainResult<WorkingSchedule> Update(int weekday, TimeOnly start, TimeOnly end, EffectivePeriod period, bool active, DateTimeOffset at)
    {
        if (weekday is < 1 or > 7 || end <= start)
            return DomainResult.Failure<WorkingSchedule>(DomainErrors.InvalidSchedule);

        Weekday = weekday;
        StartLocalTime = start;
        EndLocalTime = end;
        Period = period;
        Active = active;
        UpdatedAt = at.ToUniversalTime();
        return DomainResult.Success(this);
    }
}
