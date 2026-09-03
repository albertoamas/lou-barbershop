using System.ComponentModel.DataAnnotations;
using LouBarbershop.Api.Authorization;
using LouBarbershop.Application.Configuration;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LouBarbershop.Api.Controllers;

[ApiController, Authorize, Route("api/v1/services")]
public sealed class ServicesController(ConfigurationService configuration) : ConfigurationControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyCollection<ServiceResponse>>> ListAsync(CancellationToken ct) => Ok((await configuration.ListServicesAsync(ct)).Select(Map).ToArray());
    [HttpPost, Authorize(Policy = AuthorizationPolicies.ManageCatalog)]
    public async Task<ActionResult<ServiceResponse>> CreateAsync(ServiceRequest request, CancellationToken ct) => ToResponse(await configuration.CreateServiceAsync(new(request.Name, request.Description, request.DefaultDurationMinutes, request.DefaultPriceCents), ct), Map);
    [HttpPatch("{id:guid}"), Authorize(Policy = AuthorizationPolicies.ManageCatalog)]
    public async Task<ActionResult<ServiceResponse>> UpdateAsync(Guid id, UpdateServiceRequest request, CancellationToken ct) => ToResponse(await configuration.UpdateServiceAsync(id, new(request.Name, request.Description, request.DefaultDurationMinutes, request.DefaultPriceCents, request.Active, request.Version), ct), Map);
    private static ServiceResponse Map(Domain.Catalog.Service x) => new(x.Id, x.Name, x.Description, x.DefaultDurationMinutes, x.DefaultPrice.Cents, x.Active, x.Version);
    public record ServiceRequest([Required, StringLength(120)] string Name, [StringLength(500)] string? Description, [Range(5, 480)] int DefaultDurationMinutes, [Range(0, long.MaxValue)] long DefaultPriceCents);
    public sealed record UpdateServiceRequest(string Name, string? Description, int DefaultDurationMinutes, long DefaultPriceCents, bool Active, uint Version) : ServiceRequest(Name, Description, DefaultDurationMinutes, DefaultPriceCents);
    public sealed record ServiceResponse(Guid Id, string Name, string? Description, int DefaultDurationMinutes, long DefaultPriceCents, bool Active, uint Version);
}
