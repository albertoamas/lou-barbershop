using LouBarbershop.Api.Authorization;
using LouBarbershop.Application.Sales;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LouBarbershop.Api.Controllers;

[ApiController, Authorize(Policy = AuthorizationPolicies.ManageOperations), Route("api/v1/operations/daily")]
public sealed class DailyOperationsController(SalesService sales) : SalesControllerBase
{ [HttpGet] public async Task<ActionResult<DailyOperationsView>> ReadAsync([FromQuery] DateOnly date, CancellationToken ct) => Respond(await sales.DailyAsync(date, ct)); }
