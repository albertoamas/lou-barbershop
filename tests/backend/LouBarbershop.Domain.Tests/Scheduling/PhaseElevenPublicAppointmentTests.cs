using LouBarbershop.Domain.Appointments;
using LouBarbershop.Domain.Finance;
using LouBarbershop.Domain.Scheduling;

namespace LouBarbershop.Domain.Tests.Scheduling;

public sealed class PhaseElevenPublicAppointmentTests
{
    [Fact]
    public void PublicAppointmentRequiresAnonymousCreatorAndSupportsTokenLifecycle()
    {
        var at = new DateTimeOffset(2026, 9, 10, 12, 0, 0, TimeSpan.Zero);
        var range = TimeRange.Create(at.AddHours(1), at.AddHours(2)).Value;

        var invalidCreator = Appointment.Create(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(),
            range, Money.Create(5_000).Value, 60, AppointmentSource.Public, Guid.NewGuid(), at);
        var appointment = Appointment.Create(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(),
            range, Money.Create(5_000).Value, 60, AppointmentSource.Public, null, at).Value;

        Assert.False(invalidCreator.IsSuccess);
        Assert.True(appointment.SetManagementToken(new string('a', 64), range.EndsAt.AddHours(48), at).IsSuccess);
        Assert.Equal(new string('a', 64), appointment.ManagementTokenHash);
        Assert.Equal(range.EndsAt.AddHours(48), appointment.ManagementTokenExpiresAt);
        appointment.RevokeManagementToken(at.AddMinutes(1));
        Assert.Null(appointment.ManagementTokenHash);
        Assert.Null(appointment.ManagementTokenExpiresAt);
    }
}
