using LouBarbershop.Api.Authorization;
using LouBarbershop.Application.Sales;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LouBarbershop.Api.Controllers;

[ApiController, Authorize(Policy = AuthorizationPolicies.ManageOperations), Route("api/v1/appointments")]
public sealed class AppointmentOperationsController(SalesService sales) : SalesControllerBase
{ [HttpPost("{id:guid}/operation")] public async Task<ActionResult<OperationView>> OpenAsync(Guid id, CancellationToken ct) => Respond(await sales.OpenAppointmentAsync(id, ct)); }
