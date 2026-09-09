using LouBarbershop.Api.Authorization;
using LouBarbershop.Application.Commissions;
using LouBarbershop.Domain.Sales;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LouBarbershop.Api.Controllers;

[ApiController, Authorize(Roles = "OWNER,BARBER"), Route("api/v1/settlements")]
public sealed class SettlementsController(CommissionService service) : CommissionControllerBase
{
    [HttpGet] public async Task<ActionResult<IReadOnlyCollection<SettlementView>>> ListAsync(Guid? barberId, CancellationToken ct) => Respond(await service.ListSettlementsAsync(barberId, ct));
    [HttpGet("{id:guid}")] public async Task<ActionResult<SettlementView>> ReadAsync(Guid id, CancellationToken ct) => Respond(await service.ReadSettlementAsync(id, ct));
    [Authorize(Policy = AuthorizationPolicies.ManageSettlements), HttpPost]
    public async Task<ActionResult<SettlementView>> CreateAsync(CreateRequest request, CancellationToken ct) => Respond(await service.CreateSettlementAsync(request.BarberId, request.PeriodEnd, ct));
    [Authorize(Policy = AuthorizationPolicies.ManageSettlements), HttpPost("{id:guid}/adjustments")]
    public async Task<ActionResult<SettlementView>> AdjustAsync(Guid id, AdjustmentRequest request, CancellationToken ct) => Respond(await service.AddAdjustmentAsync(id, request.Version, request.AmountCents, request.Reason, ct));
    [Authorize(Policy = AuthorizationPolicies.ManageSettlements), HttpPost("{id:guid}/close")]
    public async Task<ActionResult<SettlementView>> CloseAsync(Guid id, VersionRequest request, CancellationToken ct) => Respond(await service.CloseAsync(id, request.Version, ct));
    [Authorize(Policy = AuthorizationPolicies.ManageSettlements), HttpPost("{id:guid}/pay")]
    public async Task<ActionResult<SettlementView>> PayAsync(Guid id, PayRequest request, CancellationToken ct) => Respond(await service.PayAsync(id, request.Version, request.PaymentDate, request.Method, ct));
    public sealed record CreateRequest(Guid BarberId, DateOnly PeriodEnd);
    public sealed record AdjustmentRequest(uint Version, long AmountCents, string Reason);
    public sealed record VersionRequest(uint Version);
    public sealed record PayRequest(uint Version, DateOnly PaymentDate, PaymentMethod Method);
}
