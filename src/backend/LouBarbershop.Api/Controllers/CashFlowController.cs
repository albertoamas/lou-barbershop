using LouBarbershop.Api.Authorization;
using LouBarbershop.Application.Inventory;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LouBarbershop.Api.Controllers;

[ApiController, Authorize(Policy = AuthorizationPolicies.ManageInventory), Route("api/v1/cash-flow")]
public sealed class CashFlowController(InventoryService inventory) : InventoryControllerBase
{
    [HttpGet] public async Task<ActionResult<CashFlowView>> GetAsync([FromQuery] DateOnly dateFrom, [FromQuery] DateOnly dateTo, CancellationToken ct) => Respond(await inventory.CashFlowAsync(dateFrom, dateTo, ct));
}
