using LouBarbershop.Api.Authorization;
using LouBarbershop.Application.Scheduling;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LouBarbershop.Api.Controllers;

[ApiController, Authorize(Policy = AuthorizationPolicies.ManageOperations), Route("api/v1/availability")]
public sealed class AvailabilityController(SchedulingService scheduling) : SchedulingControllerBase
{
    [HttpGet("barbers")]
    public Task<IReadOnlyCollection<BarberAvailability>> ListBarbersAsync(CancellationToken ct) => scheduling.ListAvailableBarbersAsync(ct);

    [HttpGet]
    public async Task<ActionResult<IReadOnlyCollection<AvailabilityOption>>> SearchAsync([FromQuery] Guid serviceId, [FromQuery] string? barberId, [FromQuery] DateOnly dateFrom, [FromQuery] DateOnly dateTo, CancellationToken ct)
    {
        Guid? selectedBarber = null;
        if (!string.IsNullOrWhiteSpace(barberId) && !string.Equals(barberId, "any", StringComparison.OrdinalIgnoreCase))
        {
            if (!Guid.TryParse(barberId, out var parsed)) return BadRequest();
            selectedBarber = parsed;
        }
        return ToResponse(await scheduling.SearchAvailabilityAsync(serviceId, selectedBarber, dateFrom, dateTo, ct), (value, _) => value);
    }
}
