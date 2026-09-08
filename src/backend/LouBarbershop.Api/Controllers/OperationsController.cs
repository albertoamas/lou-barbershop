using LouBarbershop.Api.Authorization;
using LouBarbershop.Application.Sales;
using LouBarbershop.Domain.Sales;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LouBarbershop.Api.Controllers;

[ApiController, Authorize(Policy = AuthorizationPolicies.ManageOperations), Route("api/v1/operations")]
public sealed class OperationsController(SalesService sales) : SalesControllerBase
{
    [HttpPost] public async Task<ActionResult<OperationView>> OpenAsync(OpenRequest request, CancellationToken ct) => Respond(await sales.OpenWalkInAsync(request.CustomerId, request.BarberId, ct));
    [HttpGet("{id:guid}")] public async Task<ActionResult<OperationView>> ReadAsync(Guid id, CancellationToken ct) => Respond(await sales.ReadAsync(id, ct));
    [HttpPut("{id:guid}/services")] public async Task<ActionResult<OperationView>> ServicesAsync(Guid id, ServicesRequest request, CancellationToken ct) => Respond(await sales.ReplaceServicesAsync(id, request.Version, request.Services.Select(x => new ServiceInput(x.ServiceId)).ToArray(), ct));
    [HttpPost("{id:guid}/adjustments")] public async Task<ActionResult<OperationView>> AdjustAsync(Guid id, AdjustmentRequest request, CancellationToken ct) => Respond(await sales.AdjustAsync(id, new(request.DiscountCents, request.Courtesy, request.Reason, request.Version), ct));
    [HttpPost("{id:guid}/ready")] public async Task<ActionResult<OperationView>> ReadyAsync(Guid id, VersionRequest request, CancellationToken ct) => Respond(await sales.ReadyAsync(id, request.Version, ct));
    [HttpPost("{id:guid}/pay")] public async Task<ActionResult<OperationView>> PayAsync(Guid id, PayRequest request, [FromHeader(Name = "Idempotency-Key")] string? key, CancellationToken ct) => Respond(await sales.PayAsync(id, request.Version, request.Payments.Select(x => new PaymentInput(x.Method, x.AmountCents)).ToArray(), key, ct));
    public sealed record OpenRequest(Guid CustomerId, Guid BarberId); public sealed record ServiceRequest(Guid ServiceId); public sealed record ServicesRequest(uint Version, IReadOnlyCollection<ServiceRequest> Services); public sealed record AdjustmentRequest(uint Version, long DiscountCents, bool Courtesy, string Reason); public sealed record VersionRequest(uint Version); public sealed record PaymentRequest(PaymentMethod Method, long AmountCents); public sealed record PayRequest(uint Version, IReadOnlyCollection<PaymentRequest> Payments);
}
