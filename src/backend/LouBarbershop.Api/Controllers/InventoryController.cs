using LouBarbershop.Api.Authorization;
using LouBarbershop.Application.Inventory;
using LouBarbershop.Domain.Inventory;
using LouBarbershop.Domain.Sales;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LouBarbershop.Api.Controllers;

[ApiController, Authorize, Route("api/v1")]
public sealed class InventoryController(InventoryService inventory) : InventoryControllerBase
{
    [HttpGet("inventory")] public async Task<ActionResult<IReadOnlyCollection<InventoryView>>> ListAsync(CancellationToken ct) => Respond(await inventory.ListAsync(ct));
    [HttpGet("products/{productId:guid}/movements"), Authorize(Policy = AuthorizationPolicies.ManageInventory)] public async Task<ActionResult<IReadOnlyCollection<MovementView>>> MovementsAsync(Guid productId, CancellationToken ct) => Respond(await inventory.MovementsAsync(productId, ct));
    [HttpGet("inventory-receipts"), Authorize(Policy = AuthorizationPolicies.ManageInventory)] public async Task<ActionResult<IReadOnlyCollection<ReceiptView>>> ReceiptsAsync(CancellationToken ct) => Respond(await inventory.ReceiptsAsync(ct));
    [HttpPost("inventory-receipts"), Authorize(Policy = AuthorizationPolicies.ManageInventory)] public async Task<ActionResult<ReceiptView>> ReceiveAsync(ReceiptRequest request, CancellationToken ct) => Respond(await inventory.ReceiveAsync(new(request.ReceiptDate, request.PaymentMethod, request.Reference, request.Note, request.Items.Select(x => new ReceiptItemInput(x.ProductId, x.Quantity, x.UnitCostCents)).ToArray()), ct));
    [HttpPost("products/{productId:guid}/adjustments"), Authorize(Policy = AuthorizationPolicies.ManageInventory)] public async Task<ActionResult<InventoryView>> AdjustAsync(Guid productId, AdjustmentRequest request, CancellationToken ct) => Respond(await inventory.AdjustAsync(productId, new(request.QuantityDelta, request.Type, request.Reason), ct));
    public sealed record ReceiptItemRequest(Guid ProductId, int Quantity, long UnitCostCents);
    public sealed record ReceiptRequest(DateOnly ReceiptDate, PaymentMethod PaymentMethod, string? Reference, string? Note, IReadOnlyCollection<ReceiptItemRequest> Items);
    public sealed record AdjustmentRequest(int QuantityDelta, InventoryMovementType Type, string Reason);
}
