using LouBarbershop.Application.Commissions;
using LouBarbershop.Domain.Commissions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LouBarbershop.Api.Controllers;

[ApiController, Authorize(Roles = "OWNER,BARBER"), Route("api/v1/commissions")]
public sealed class CommissionsController(CommissionService service) : CommissionControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyCollection<CommissionView>>> ListAsync(Guid? barberId, CommissionEntryStatus? status, CancellationToken ct) => Respond(await service.ListCommissionsAsync(barberId, status, ct));
}
