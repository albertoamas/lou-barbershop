using LouBarbershop.Api.Authorization;
using LouBarbershop.Application.Reporting;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LouBarbershop.Api.Controllers;

[ApiController, Authorize(Policy = AuthorizationPolicies.ViewReports), Route("api/v1/reports")]
public sealed class ReportsController(ReportingService reporting) : ReportingControllerBase
{
    [HttpGet("daily")]
    public async Task<ActionResult<DailyDashboardView>> DailyAsync([FromQuery] DateOnly date, CancellationToken ct) => Respond(await reporting.DailyAsync(date, ct));

    [HttpGet("period")]
    public async Task<ActionResult<PeriodReportView>> PeriodAsync([FromQuery] DateOnly dateFrom, [FromQuery] DateOnly dateTo, CancellationToken ct) => Respond(await reporting.PeriodAsync(dateFrom, dateTo, ct));

    [HttpGet("barber-performance")]
    public async Task<ActionResult<IReadOnlyCollection<BarberPerformanceView>>> BarberPerformanceAsync([FromQuery] DateOnly dateFrom, [FromQuery] DateOnly dateTo, CancellationToken ct) => Respond(await reporting.BarberPerformanceAsync(dateFrom, dateTo, ct));

    [HttpGet("export")]
    public async Task<IActionResult> ExportAsync([FromQuery] string report, [FromQuery] DateOnly dateFrom, [FromQuery] DateOnly dateTo, CancellationToken ct)
    {
        var result = await reporting.ExportAsync(report, dateFrom, dateTo, ct);
        if (result.Status == ReportingStatus.Success)
            return File(result.Value!, "text/csv; charset=utf-8", $"lou-{report}-{dateFrom:yyyyMMdd}-{dateTo:yyyyMMdd}.csv");
        return Problem(statusCode: result.Status == ReportingStatus.Forbidden ? 403 : 400, title: result.Message, extensions: new Dictionary<string, object?> { ["code"] = result.Code });
    }
}
