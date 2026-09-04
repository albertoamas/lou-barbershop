using LouBarbershop.Api.Authorization;
using LouBarbershop.Application.Agenda;
using LouBarbershop.Domain.Appointments;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LouBarbershop.Api.Controllers;

[ApiController, Authorize(Policy = AuthorizationPolicies.ManageOperations), Route("api/v1/appointments")]
public sealed class AppointmentsController(AgendaService agenda) : AgendaControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyCollection<AppointmentView>>> ListAsync([FromQuery] DateOnly dateFrom, [FromQuery] DateOnly dateTo, [FromQuery] Guid? barberId, CancellationToken ct) => Respond(await agenda.ListAsync(dateFrom, dateTo, barberId, ct));
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<AppointmentView>> ReadAsync(Guid id, CancellationToken ct) => Respond(await agenda.ReadAsync(id, ct));
    [HttpGet("{id:guid}/events"), Authorize(Policy = AuthorizationPolicies.ManageScheduling)]
    public async Task<ActionResult<IReadOnlyCollection<AgendaEvent>>> HistoryAsync(Guid id, CancellationToken ct) => Respond(await agenda.HistoryAsync(id, ct));
    [HttpPost, Authorize(Policy = AuthorizationPolicies.ManageScheduling)]
    public async Task<ActionResult<AppointmentView>> CreateAsync(CreateRequest request, CancellationToken ct) => Respond(await agenda.CreateAsync(new(request.CustomerId, request.BarberId, request.ServiceId, request.StartsAt), ct));
    [HttpGet("{id:guid}/availability"), Authorize(Policy = AuthorizationPolicies.ManageScheduling)]
    public async Task<ActionResult<IReadOnlyCollection<LouBarbershop.Application.Scheduling.AvailabilityOption>>> AlternativesAsync(Guid id, [FromQuery] Guid serviceId, [FromQuery] Guid? barberId, [FromQuery] DateOnly date, CancellationToken ct) => Respond(await agenda.AlternativesAsync(id, serviceId, barberId, date, ct));
    [HttpPatch("{id:guid}/reschedule"), Authorize(Policy = AuthorizationPolicies.ManageScheduling)]
    public async Task<ActionResult<AppointmentView>> RescheduleAsync(Guid id, RescheduleRequest request, CancellationToken ct) => Respond(await agenda.RescheduleAsync(id, new(request.BarberId, request.ServiceId, request.StartsAt, request.Version, request.Reason), ct));
    [HttpPost("{id:guid}/cancel"), Authorize(Policy = AuthorizationPolicies.ManageScheduling)]
    public async Task<ActionResult<AppointmentView>> CancelAsync(Guid id, TransitionRequest request, CancellationToken ct) => Respond(await agenda.TransitionAsync(id, AppointmentStatus.Cancelled, request.Version, request.Reason, ct));
    [HttpPost("{id:guid}/no-show"), Authorize(Policy = AuthorizationPolicies.ManageScheduling)]
    public async Task<ActionResult<AppointmentView>> NoShowAsync(Guid id, TransitionRequest request, CancellationToken ct) => Respond(await agenda.TransitionAsync(id, AppointmentStatus.NoShow, request.Version, request.Reason, ct));
    [HttpPost("{id:guid}/check-in")]
    public async Task<ActionResult<AppointmentView>> CheckInAsync(Guid id, TransitionRequest request, CancellationToken ct) => Respond(await agenda.TransitionAsync(id, AppointmentStatus.CheckedIn, request.Version, null, ct));
    [HttpPost("{id:guid}/start")]
    public async Task<ActionResult<AppointmentView>> StartAsync(Guid id, TransitionRequest request, CancellationToken ct) => Respond(await agenda.TransitionAsync(id, AppointmentStatus.InService, request.Version, null, ct));
    public sealed record CreateRequest(Guid CustomerId, Guid BarberId, Guid ServiceId, DateTimeOffset StartsAt);
    public sealed record RescheduleRequest(Guid BarberId, Guid ServiceId, DateTimeOffset StartsAt, uint Version, string Reason);
    public sealed record TransitionRequest(uint Version, string? Reason);
}
