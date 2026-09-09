using LouBarbershop.Api.Authorization;
using LouBarbershop.Application.Commissions;
using LouBarbershop.Application.Sales;
using LouBarbershop.Domain.Sales;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LouBarbershop.Api.Controllers;

[ApiController, Authorize(Policy = AuthorizationPolicies.ManageOperations), Route("api/v1/operations")]
public sealed class OperationsController(SalesService sales, CommissionService commissions) : SalesControllerBase
{
    [HttpPost] public async Task<ActionResult<OperationView>> OpenAsync(OpenRequest request, CancellationToken ct) => Respond(await sales.OpenWalkInAsync(request.CustomerId, request.BarberId, ct));
    [HttpGet("{id:guid}")] public async Task<ActionResult<OperationView>> ReadAsync(Guid id, CancellationToken ct) => Respond(await sales.ReadAsync(id, ct));
    [HttpPut("{id:guid}/services")] public async Task<ActionResult<OperationView>> ServicesAsync(Guid id, ServicesRequest request, CancellationToken ct) => Respond(await sales.ReplaceServicesAsync(id, request.Version, request.Services.Select(x => new ServiceInput(x.ServiceId)).ToArray(), ct));
    [HttpPut("{id:guid}/products")] public async Task<ActionResult<OperationView>> ProductsAsync(Guid id, ProductsRequest request, CancellationToken ct) => Respond(await sales.ReplaceProductsAsync(id, request.Version, request.Products.Select(x => new ProductInput(x.ProductId, x.Quantity)).ToArray(), ct));
    [HttpPost("{id:guid}/adjustments")] public async Task<ActionResult<OperationView>> AdjustAsync(Guid id, AdjustmentRequest request, CancellationToken ct) => Respond(await sales.AdjustAsync(id, new(request.DiscountCents, request.Courtesy, request.Reason, request.Version), ct));
    [HttpPost("{id:guid}/ready")] public async Task<ActionResult<OperationView>> ReadyAsync(Guid id, VersionRequest request, CancellationToken ct) => Respond(await sales.ReadyAsync(id, request.Version, ct));
    [HttpPost("{id:guid}/pay")] public async Task<ActionResult<OperationView>> PayAsync(Guid id, PayRequest request, [FromHeader(Name = "Idempotency-Key")] string? key, CancellationToken ct) => Respond(await sales.PayAsync(id, request.Version, request.Payments.Select(x => new PaymentInput(x.Method, x.AmountCents)).ToArray(), key, ct));
    [Authorize(Policy = AuthorizationPolicies.ManageSettlements), HttpPost("{id:guid}/reverse")]
    public async Task<ActionResult<bool>> ReverseAsync(Guid id, ReverseRequest request, CancellationToken ct)
    {
        var result = await commissions.ReverseOperationAsync(id, request.Version, request.Reason, ct);
        return result.Status switch { CommissionStatus.Success => Ok(result.Value), CommissionStatus.Forbidden => Forbid(), CommissionStatus.NotFound => NotFound(), _ => Problem(statusCode: result.Status == CommissionStatus.Conflict ? 409 : 400, title: "La solicitud no puede procesarse.", detail: result.Message, extensions: new Dictionary<string, object?> { ["code"] = result.Code }) };
    }
    public sealed record OpenRequest(Guid CustomerId, Guid BarberId); public sealed record ServiceRequest(Guid ServiceId); public sealed record ServicesRequest(uint Version, IReadOnlyCollection<ServiceRequest> Services); public sealed record ProductRequest(Guid ProductId, int Quantity); public sealed record ProductsRequest(uint Version, IReadOnlyCollection<ProductRequest> Products); public sealed record AdjustmentRequest(uint Version, long DiscountCents, bool Courtesy, string Reason); public sealed record VersionRequest(uint Version); public sealed record PaymentRequest(PaymentMethod Method, long AmountCents); public sealed record PayRequest(uint Version, IReadOnlyCollection<PaymentRequest> Payments); public sealed record ReverseRequest(uint Version, string Reason);
}
