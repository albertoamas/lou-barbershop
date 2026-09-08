using LouBarbershop.Api.Authorization;
using LouBarbershop.Application.Inventory;
using LouBarbershop.Domain.Sales;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LouBarbershop.Api.Controllers;

[ApiController, Authorize(Policy = AuthorizationPolicies.ManageInventory), Route("api/v1/expenses")]
public sealed class ExpensesController(InventoryService inventory) : InventoryControllerBase
{
    [HttpGet] public async Task<ActionResult<IReadOnlyCollection<ExpenseView>>> ListAsync([FromQuery] DateOnly? dateFrom, [FromQuery] DateOnly? dateTo, CancellationToken ct) => Respond(await inventory.ExpensesAsync(dateFrom, dateTo, ct));
    [HttpPost] public async Task<ActionResult<ExpenseView>> CreateAsync(ExpenseRequest request, CancellationToken ct) => Respond(await inventory.CreateExpenseAsync(new(request.CategoryId, request.ExpenseDate, request.Description, request.AmountCents, request.PaymentMethod), ct));
    [HttpPost("{id:guid}/void")] public async Task<ActionResult<ExpenseView>> VoidAsync(Guid id, VoidRequest request, CancellationToken ct) => Respond(await inventory.VoidExpenseAsync(id, request.Version, request.Reason, ct));
    public sealed record ExpenseRequest(Guid CategoryId, DateOnly ExpenseDate, string Description, long AmountCents, PaymentMethod PaymentMethod);
    public sealed record VoidRequest(uint Version, string Reason);
}
