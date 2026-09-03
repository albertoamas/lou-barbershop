using System.ComponentModel.DataAnnotations;
using LouBarbershop.Api.Authorization;
using LouBarbershop.Application.Configuration;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LouBarbershop.Api.Controllers;

[ApiController, Authorize, Route("api/v1/expense-categories")]
public sealed class ExpenseCategoriesController(ConfigurationService configuration) : ConfigurationControllerBase
{
    [HttpGet] public async Task<ActionResult<IReadOnlyCollection<CategoryResponse>>> ListAsync(CancellationToken ct) => Ok((await configuration.ListExpenseCategoriesAsync(ct)).Select(Map).ToArray());
    [HttpPost, Authorize(Policy = AuthorizationPolicies.ManageCatalog)] public async Task<ActionResult<CategoryResponse>> CreateAsync(CategoryRequest request, CancellationToken ct) => ToResponse(await configuration.CreateExpenseCategoryAsync(new(request.Name), ct), Map);
    [HttpPatch("{id:guid}"), Authorize(Policy = AuthorizationPolicies.ManageCatalog)] public async Task<ActionResult<CategoryResponse>> UpdateAsync(Guid id, UpdateCategoryRequest request, CancellationToken ct) => ToResponse(await configuration.UpdateExpenseCategoryAsync(id, new(request.Name, request.Active, request.Version), ct), Map);
    private static CategoryResponse Map(Domain.Expenses.ExpenseCategory x) => new(x.Id, x.Name, x.Active, x.Version);
    public record CategoryRequest([Required, StringLength(120)] string Name);
    public sealed record UpdateCategoryRequest(string Name, bool Active, uint Version) : CategoryRequest(Name);
    public sealed record CategoryResponse(Guid Id, string Name, bool Active, uint Version);
}
