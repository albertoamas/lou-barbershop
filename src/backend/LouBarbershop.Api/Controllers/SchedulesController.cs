using LouBarbershop.Api.Authorization;
using LouBarbershop.Application.Scheduling;
using LouBarbershop.Domain.Scheduling;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LouBarbershop.Api.Controllers;

[ApiController, Authorize, Route("api/v1/barbers/{barberId:guid}")]
public sealed class SchedulesController(SchedulingService scheduling) : SchedulingControllerBase
{
    [HttpGet("schedules")]
    public async Task<ActionResult<IReadOnlyCollection<ScheduleResponse>>> ListSchedulesAsync(Guid barberId, CancellationToken ct) => Ok((await scheduling.ListSchedulesAsync(barberId, ct)).Select(Map).ToArray());

    [HttpPost("schedules"), Authorize(Policy = AuthorizationPolicies.ManageScheduling)]
    public async Task<ActionResult<ScheduleChangeResponse>> CreateScheduleAsync(Guid barberId, ScheduleRequest request, CancellationToken ct) =>
        ToResponse(await scheduling.CreateScheduleAsync(barberId, new(request.Weekday, request.StartLocalTime, request.EndLocalTime, request.ValidFrom, request.ValidTo), ct), (value, conflicts) => new ScheduleChangeResponse(Map(value), conflicts));

    [HttpPatch("schedules/{id:guid}"), Authorize(Policy = AuthorizationPolicies.ManageScheduling)]
    public async Task<ActionResult<ScheduleChangeResponse>> UpdateScheduleAsync(Guid barberId, Guid id, UpdateScheduleRequest request, CancellationToken ct) =>
        ToResponse(await scheduling.UpdateScheduleAsync(barberId, id, new(request.Weekday, request.StartLocalTime, request.EndLocalTime, request.ValidFrom, request.ValidTo, request.Active, request.Version), ct), (value, conflicts) => new ScheduleChangeResponse(Map(value), conflicts));

    [HttpGet("availability-exceptions")]
    public async Task<ActionResult<IReadOnlyCollection<ExceptionResponse>>> ListExceptionsAsync(Guid barberId, CancellationToken ct) => Ok((await scheduling.ListExceptionsAsync(barberId, ct)).Select(Map).ToArray());

    [HttpPost("availability-exceptions"), Authorize(Policy = AuthorizationPolicies.ManageScheduling)]
    public async Task<ActionResult<ExceptionChangeResponse>> CreateExceptionAsync(Guid barberId, ExceptionRequest request, CancellationToken ct) =>
        ToResponse(await scheduling.CreateExceptionAsync(barberId, new(request.StartsAt, request.EndsAt, request.Kind, request.Reason), ct), (value, conflicts) => new ExceptionChangeResponse(Map(value), conflicts));

    [HttpPost("availability-exceptions/{id:guid}/deactivate"), Authorize(Policy = AuthorizationPolicies.ManageScheduling)]
    public async Task<ActionResult<ExceptionChangeResponse>> DeactivateExceptionAsync(Guid barberId, Guid id, VersionRequest request, CancellationToken ct) =>
        ToResponse(await scheduling.DeactivateExceptionAsync(barberId, id, request.Version, ct), (value, conflicts) => new ExceptionChangeResponse(Map(value), conflicts));

    private static ScheduleResponse Map(WorkingSchedule value) => new(value.Id, value.BarberId, value.Weekday, value.StartLocalTime, value.EndLocalTime, value.Period.ValidFrom, value.Period.ValidTo, value.Active, value.Version);
    private static ExceptionResponse Map(AvailabilityExceptionRule value) => new(value.Id, value.BarberId, value.Range.StartsAt, value.Range.EndsAt, value.Kind, value.Reason, value.Active, value.Version);

    public sealed record ScheduleRequest(int Weekday, TimeOnly StartLocalTime, TimeOnly EndLocalTime, DateOnly ValidFrom, DateOnly? ValidTo);
    public sealed record UpdateScheduleRequest(int Weekday, TimeOnly StartLocalTime, TimeOnly EndLocalTime, DateOnly ValidFrom, DateOnly? ValidTo, bool Active, uint Version);
    public sealed record ExceptionRequest(DateTimeOffset StartsAt, DateTimeOffset EndsAt, AvailabilityExceptionKind Kind, string Reason);
    public sealed record VersionRequest(uint Version);
    public sealed record ScheduleResponse(Guid Id, Guid BarberId, int Weekday, TimeOnly StartLocalTime, TimeOnly EndLocalTime, DateOnly ValidFrom, DateOnly? ValidTo, bool Active, uint Version);
    public sealed record ExceptionResponse(Guid Id, Guid BarberId, DateTimeOffset StartsAt, DateTimeOffset EndsAt, AvailabilityExceptionKind Kind, string Reason, bool Active, uint Version);
    public sealed record ScheduleChangeResponse(ScheduleResponse Schedule, IReadOnlyCollection<AppointmentConflict> Conflicts);
    public sealed record ExceptionChangeResponse(ExceptionResponse Exception, IReadOnlyCollection<AppointmentConflict> Conflicts);
}
