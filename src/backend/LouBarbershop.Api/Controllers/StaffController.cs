using System.ComponentModel.DataAnnotations;
using LouBarbershop.Api.Authorization;
using LouBarbershop.Application.Configuration;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LouBarbershop.Api.Controllers;

[ApiController, Authorize(Policy = AuthorizationPolicies.ManageCatalog), Route("api/v1/staff")]
public sealed class StaffController(ConfigurationService configuration) : ConfigurationControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyCollection<StaffResponse>>> ListAsync(CancellationToken ct) => Ok((await configuration.ListStaffAsync(ct)).Select(Map).ToArray());

    [HttpPost]
    public async Task<ActionResult<StaffResponse>> CreateAsync(CreateStaffRequest request, CancellationToken ct) => ToResponse(await configuration.CreateStaffAsync(new(request.UserId, request.DisplayName, request.Phone), ct), Map);

    [HttpPatch("{id:guid}")]
    public async Task<ActionResult<StaffResponse>> UpdateAsync(Guid id, UpdateStaffRequest request, CancellationToken ct) => ToResponse(await configuration.UpdateStaffAsync(id, new(request.DisplayName, request.Phone, request.Active, request.Version), ct), Map);

    private static StaffResponse Map(Domain.Staff.StaffProfile x) => new(x.Id, x.UserId, x.DisplayName, x.Phone, x.Active, x.Version);
    public sealed record CreateStaffRequest(Guid UserId, [Required, StringLength(120)] string DisplayName, [StringLength(30)] string? Phone);
    public sealed record UpdateStaffRequest([Required, StringLength(120)] string DisplayName, [StringLength(30)] string? Phone, bool Active, uint Version);
    public sealed record StaffResponse(Guid Id, Guid UserId, string DisplayName, string? Phone, bool Active, uint Version);
}
