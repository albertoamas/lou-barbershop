using LouBarbershop.Domain.Common;
using LouBarbershop.Domain.Finance;
using LouBarbershop.Domain.Scheduling;

namespace LouBarbershop.Domain.Appointments;

public enum AppointmentSource { Internal, Public }

public sealed class Appointment
{
    private Appointment() { }

    private Appointment(Guid id, Guid customerId, Guid barberId, Guid serviceId, TimeRange range, Money price, int duration, AppointmentSource source, Guid createdBy, DateTimeOffset at)
    {
        Id = id;
        CustomerId = customerId;
        BarberId = barberId;
        ServiceId = serviceId;
        Range = range;
        QuotedPrice = price;
        QuotedDurationMinutes = duration;
        Source = source;
        Status = AppointmentStatus.Confirmed;
        CreatedBy = createdBy;
        CreatedAt = at;
        UpdatedAt = at;
    }

    public Guid Id { get; private set; }
    public Guid CustomerId { get; private set; }
    public Guid BarberId { get; private set; }
    public Guid ServiceId { get; private set; }
    public TimeRange Range { get; private set; }
    public AppointmentStatus Status { get; private set; }
    public AppointmentSource Source { get; private set; }
    public Money QuotedPrice { get; private set; }
    public int QuotedDurationMinutes { get; private set; }
    public string? CustomerNote { get; private set; }
    public string? ManagementTokenHash { get; private set; }
    public Guid CreatedBy { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }
    public uint Version { get; private set; }

    public bool OccupiesTime => Status is AppointmentStatus.Confirmed or AppointmentStatus.CheckedIn or AppointmentStatus.InService;

    public DomainResult<Appointment> Reschedule(Guid barberId, Guid serviceId, TimeRange range, Money price, int duration, DateTimeOffset at)
    {
        if (Status != AppointmentStatus.Confirmed)
            return DomainResult.Failure<Appointment>(DomainErrors.InvalidStateTransition);
        if (barberId == Guid.Empty || serviceId == Guid.Empty || duration is < 5 or > 480 || range.EndsAt - range.StartsAt != TimeSpan.FromMinutes(duration))
            return DomainResult.Failure<Appointment>(DomainErrors.InvalidAppointment);
        BarberId = barberId;
        ServiceId = serviceId;
        Range = range;
        QuotedPrice = price;
        QuotedDurationMinutes = duration;
        UpdatedAt = at.ToUniversalTime();
        return DomainResult.Success(this);
    }

    public DomainResult<Appointment> TransitionTo(AppointmentStatus next, DateTimeOffset at)
    {
        var transition = AppointmentTransitions.Move(Status, next);
        if (!transition.IsSuccess) return DomainResult.Failure<Appointment>(transition.Error!);
        Status = transition.Value;
        UpdatedAt = at.ToUniversalTime();
        return DomainResult.Success(this);
    }

    public static DomainResult<Appointment> Create(Guid id, Guid customerId, Guid barberId, Guid serviceId, TimeRange range, Money price, int duration, AppointmentSource source, Guid createdBy, DateTimeOffset at)
    {
        if (id == Guid.Empty || customerId == Guid.Empty || barberId == Guid.Empty || serviceId == Guid.Empty || createdBy == Guid.Empty || duration is < 5 or > 480 || range.EndsAt - range.StartsAt != TimeSpan.FromMinutes(duration))
            return DomainResult.Failure<Appointment>(DomainErrors.InvalidAppointment);

        return DomainResult.Success(new Appointment(id, customerId, barberId, serviceId, range, price, duration, source, createdBy, at.ToUniversalTime()));
    }
}
