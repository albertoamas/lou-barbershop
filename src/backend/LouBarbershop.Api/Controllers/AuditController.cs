using LouBarbershop.Api.Authorization;
using LouBarbershop.Application.Reporting;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LouBarbershop.Api.Controllers;

[ApiController, Authorize(Policy = AuthorizationPolicies.ViewReports), Route("api/v1/audit")]
public sealed class AuditController(ReportingService reporting) : ReportingControllerBase
{
    [HttpGet]
    public async Task<ActionResult<AuditPageView>> ReadAsync([FromQuery] DateOnly dateFrom, [FromQuery] DateOnly dateTo, [FromQuery] string? entityType, [FromQuery] Guid? actorId, [FromQuery] int page = 1, [FromQuery] int pageSize = 25, CancellationToken ct = default) => Respond(await reporting.AuditAsync(dateFrom, dateTo, entityType, actorId, page, pageSize, ct));
}
