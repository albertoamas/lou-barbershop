using LouBarbershop.Application.PublicBooking;
using LouBarbershop.Application.Scheduling;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace LouBarbershop.Api.Controllers;

[ApiController]
[AllowAnonymous]
[EnableRateLimiting("public-booking")]
[Route("api/v1/public")]
public sealed class PublicBookingController(PublicBookingService bookings) : ControllerBase
{
    private const string ManagementTokenHeader = "X-Management-Token";

    [HttpGet("catalog")]
    public Task<PublicCatalog> CatalogAsync(CancellationToken ct) => bookings.CatalogAsync(ct);

    [HttpGet("availability")]
    public async Task<ActionResult<IReadOnlyCollection<AvailabilityOption>>> AvailabilityAsync(
        [FromQuery] Guid serviceId, [FromQuery] string? barberId, [FromQuery] DateOnly dateFrom,
        [FromQuery] DateOnly dateTo, CancellationToken ct)
    {
        Guid? selectedBarber = null;
        if (!string.IsNullOrWhiteSpace(barberId) && !string.Equals(barberId, "any", StringComparison.OrdinalIgnoreCase))
        {
            if (!Guid.TryParse(barberId, out var parsed)) return BadRequest();
            selectedBarber = parsed;
        }
        var result = await bookings.AvailabilityAsync(serviceId, selectedBarber, dateFrom, dateTo, ct);
        return result.Status switch
        {
            SchedulingStatus.Success => Ok(result.Value),
            SchedulingStatus.NotFound => NotFound(),
            _ => ProblemResponse(result.Status == SchedulingStatus.Conflict ? 409 : 400, result.Code, result.Message),
        };
    }

    [HttpPost("appointments")]
    [EnableRateLimiting("public-booking-create")]
    public async Task<ActionResult<PublicBookingConfirmation>> CreateAsync(CreateRequest request, CancellationToken ct) =>
        Respond(await bookings.CreateAsync(new(request.ServiceId, request.BarberId, request.StartsAt,
            request.DisplayName, request.Phone, request.PrivacyAccepted), ct), 201);

    [HttpGet("appointments/manage")]
    public async Task<ActionResult<PublicAppointmentView>> ReadAsync(
        [FromHeader(Name = ManagementTokenHeader)] string? managementToken, CancellationToken ct) =>
        Respond(await bookings.ReadAsync(managementToken, ct));

    [HttpPatch("appointments/manage")]
    public async Task<ActionResult<PublicBookingConfirmation>> RescheduleAsync(
        [FromHeader(Name = ManagementTokenHeader)] string? managementToken, RescheduleRequest request, CancellationToken ct) =>
        Respond(await bookings.RescheduleAsync(managementToken,
            new(request.ServiceId, request.BarberId, request.StartsAt, request.Version), ct));

    [HttpPost("appointments/manage/cancel")]
    public async Task<ActionResult<PublicAppointmentView>> CancelAsync(
        [FromHeader(Name = ManagementTokenHeader)] string? managementToken, VersionRequest request, CancellationToken ct) =>
        Respond(await bookings.CancelAsync(managementToken, request.Version, ct));

    private ActionResult<T> Respond<T>(PublicBookingResult<T> result, int successStatus = 200) => result.Status switch
    {
        PublicBookingStatus.Success when successStatus == 201 => StatusCode(successStatus, result.Value),
        PublicBookingStatus.Success => Ok(result.Value),
        PublicBookingStatus.NotFound => NotFound(new ProblemDetails
        {
            Status = 404,
            Title = "La cita no está disponible.",
            Detail = "El enlace no es válido o ya venció.",
            Extensions = { ["code"] = "booking.not_found", ["requestId"] = HttpContext.TraceIdentifier },
        }),
        _ => ProblemResponse(result.Status == PublicBookingStatus.Conflict ? 409 : 400, result.Code, result.Message),
    };

    private ObjectResult ProblemResponse(int status, string? code, string? message) => StatusCode(status, new ProblemDetails
    {
        Status = status,
        Title = "La solicitud no puede procesarse.",
        Detail = message,
        Type = $"https://lou-barbershop.local/errors/{code}",
        Extensions = { ["code"] = code, ["requestId"] = HttpContext.TraceIdentifier },
    });

    public sealed record CreateRequest(Guid ServiceId, Guid BarberId, DateTimeOffset StartsAt,
        string DisplayName, string Phone, bool PrivacyAccepted);
    public sealed record RescheduleRequest(Guid ServiceId, Guid BarberId, DateTimeOffset StartsAt, uint Version);
    public sealed record VersionRequest(uint Version);
}
