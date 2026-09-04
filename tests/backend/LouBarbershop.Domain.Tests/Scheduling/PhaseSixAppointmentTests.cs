using LouBarbershop.Domain.Appointments;
using LouBarbershop.Domain.Finance;
using LouBarbershop.Domain.Scheduling;

namespace LouBarbershop.Domain.Tests.Scheduling;

public sealed class PhaseSixAppointmentTests
{
    [Fact]
    public void RescheduleUpdatesSnapshotAndRejectsChangesAfterArrival()
    {
        var start = new DateTimeOffset(2026, 10, 1, 13, 0, 0, TimeSpan.Zero);
        var appointment = Appointment.Create(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), TimeRange.Create(start, start.AddMinutes(45)).Value, Money.Create(6000).Value, 45, AppointmentSource.Internal, Guid.NewGuid(), start.AddDays(-1)).Value;
        Assert.True(appointment.Reschedule(Guid.NewGuid(), Guid.NewGuid(), TimeRange.Create(start.AddHours(1), start.AddHours(2)).Value, Money.Create(7000).Value, 60, start).IsSuccess);
        Assert.Equal(7000, appointment.QuotedPrice.Cents);
        Assert.Equal(60, appointment.QuotedDurationMinutes);
        Assert.True(appointment.TransitionTo(AppointmentStatus.CheckedIn, start).IsSuccess);
        Assert.False(appointment.Reschedule(Guid.NewGuid(), Guid.NewGuid(), TimeRange.Create(start, start.AddMinutes(45)).Value, Money.Create(1).Value, 45, start).IsSuccess);
        Assert.True(appointment.TransitionTo(AppointmentStatus.InService, start).IsSuccess);
        Assert.False(appointment.TransitionTo(AppointmentStatus.Cancelled, start).IsSuccess);
    }
}
