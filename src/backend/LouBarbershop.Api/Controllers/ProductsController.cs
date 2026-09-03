using System.ComponentModel.DataAnnotations;
using LouBarbershop.Api.Authorization;
using LouBarbershop.Application.Configuration;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LouBarbershop.Api.Controllers;

[ApiController, Authorize, Route("api/v1/products")]
public sealed class ProductsController(ConfigurationService configuration) : ConfigurationControllerBase
{
    [HttpGet] public async Task<ActionResult<IReadOnlyCollection<ProductResponse>>> ListAsync(CancellationToken ct) => Ok((await configuration.ListProductsAsync(ct)).Select(Map).ToArray());
    [HttpPost, Authorize(Policy = AuthorizationPolicies.ManageCatalog)] public async Task<ActionResult<ProductResponse>> CreateAsync(ProductRequest request, CancellationToken ct) => ToResponse(await configuration.CreateProductAsync(new(request.Name, request.Brand, request.Sku, request.Description, request.SalePriceCents, request.MinimumStock), ct), Map);
    [HttpPatch("{id:guid}"), Authorize(Policy = AuthorizationPolicies.ManageCatalog)] public async Task<ActionResult<ProductResponse>> UpdateAsync(Guid id, UpdateProductRequest request, CancellationToken ct) => ToResponse(await configuration.UpdateProductAsync(id, new(request.Name, request.Brand, request.Sku, request.Description, request.SalePriceCents, request.MinimumStock, request.Active, request.Version), ct), Map);
    private static ProductResponse Map(Domain.Catalog.Product x) => new(x.Id, x.Name, x.Brand, x.Sku, x.Description, x.SalePrice.Cents, x.AverageCost.Cents, x.MinimumStock, x.Active, x.Version);
    public record ProductRequest([Required, StringLength(120)] string Name, [StringLength(80)] string? Brand, [StringLength(50)] string? Sku, [StringLength(500)] string? Description, [Range(0, long.MaxValue)] long SalePriceCents, [Range(0, int.MaxValue)] int MinimumStock);
    public sealed record UpdateProductRequest(string Name, string? Brand, string? Sku, string? Description, long SalePriceCents, int MinimumStock, bool Active, uint Version) : ProductRequest(Name, Brand, Sku, Description, SalePriceCents, MinimumStock);
    public sealed record ProductResponse(Guid Id, string Name, string? Brand, string? Sku, string? Description, long SalePriceCents, long AverageCostCents, int MinimumStock, bool Active, uint Version);
}
