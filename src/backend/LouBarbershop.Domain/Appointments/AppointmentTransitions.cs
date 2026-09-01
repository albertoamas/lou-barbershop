using LouBarbershop.Domain.Common;

namespace LouBarbershop.Domain.Appointments;

public static class AppointmentTransitions
{
    public static DomainResult<AppointmentStatus> Move(AppointmentStatus current, AppointmentStatus next) =>
        IsAllowed(current, next)
            ? DomainResult.Success(next)
            : DomainResult.Failure<AppointmentStatus>(DomainErrors.InvalidStateTransition);

    private static bool IsAllowed(AppointmentStatus current, AppointmentStatus next) => (current, next) switch
    {
        (AppointmentStatus.Confirmed, AppointmentStatus.Confirmed) => true,
        (AppointmentStatus.Confirmed, AppointmentStatus.CheckedIn) => true,
        (AppointmentStatus.Confirmed, AppointmentStatus.Cancelled) => true,
        (AppointmentStatus.Confirmed, AppointmentStatus.NoShow) => true,
        (AppointmentStatus.CheckedIn, AppointmentStatus.InService) => true,
        (AppointmentStatus.CheckedIn, AppointmentStatus.Cancelled) => true,
        (AppointmentStatus.InService, AppointmentStatus.Completed) => true,
        _ => false,
    };
}
