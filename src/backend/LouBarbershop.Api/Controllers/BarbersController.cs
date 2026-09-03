using LouBarbershop.Api.Authorization;
using LouBarbershop.Application.Configuration;
using LouBarbershop.Domain.Commissions;
using LouBarbershop.Domain.Staff;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LouBarbershop.Api.Controllers;

[ApiController, Authorize, Route("api/v1/barbers")]
public sealed class BarbersController(ConfigurationService configuration) : ConfigurationControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyCollection<BarberResponse>>> ListAsync(CancellationToken ct) => Ok((await configuration.ListBarbersAsync(ct)).Select(Map).ToArray());

    [HttpPost, Authorize(Policy = AuthorizationPolicies.ManageCatalog)]
    public async Task<ActionResult<BarberResponse>> CreateAsync(CreateBarberRequest request, CancellationToken ct) => ToResponse(await configuration.CreateBarberAsync(new(request.StaffProfileId, request.EmploymentType, request.SettlementFrequency, request.Color), ct), Map);

    [HttpPatch("{id:guid}"), Authorize(Policy = AuthorizationPolicies.ManageCatalog)]
    public async Task<ActionResult<BarberResponse>> UpdateAsync(Guid id, UpdateBarberRequest request, CancellationToken ct) => ToResponse(await configuration.UpdateBarberAsync(id, new(request.EmploymentType, request.SettlementFrequency, request.Color, request.Active, request.Version), ct), Map);

    [HttpGet("{barberId:guid}/offerings")]
    public async Task<ActionResult<IReadOnlyCollection<OfferingResponse>>> ListOfferingsAsync(Guid barberId, CancellationToken ct) => Ok((await configuration.ListOfferingsAsync(barberId, ct)).Select(MapOffering).ToArray());

    [HttpPost("{barberId:guid}/offerings"), Authorize(Policy = AuthorizationPolicies.ManageCatalog)]
    public async Task<ActionResult<OfferingResponse>> CreateOfferingAsync(Guid barberId, OfferingRequest request, CancellationToken ct) => ToResponse(await configuration.CreateOfferingAsync(barberId, new(request.ServiceId, request.DurationMinutes, request.PriceCents, request.ValidFrom, request.ValidTo), ct), MapOffering);

    [HttpGet("{barberId:guid}/offerings/effective")]
    public async Task<ActionResult<EffectiveOffering>> EffectiveOfferingAsync(Guid barberId, [FromQuery] Guid serviceId, [FromQuery] DateOnly date, CancellationToken ct) => ToResponse(await configuration.ResolveOfferingAsync(barberId, serviceId, date, ct), x => x);

    [HttpPost("{barberId:guid}/offerings/{id:guid}/deactivate"), Authorize(Policy = AuthorizationPolicies.ManageCatalog)]
    public async Task<IActionResult> DeactivateOfferingAsync(Guid barberId, Guid id, VersionRequest request, CancellationToken ct) => ToNoContent(await configuration.DeactivateOfferingAsync(barberId, id, request.Version, ct));

    [HttpGet("{barberId:guid}/commission-rules"), Authorize(Policy = AuthorizationPolicies.ManageCatalog)]
    public async Task<ActionResult<IReadOnlyCollection<CommissionRuleResponse>>> ListRulesAsync(Guid barberId, CancellationToken ct) => Ok((await configuration.ListCommissionRulesAsync(barberId, ct)).Select(MapRule).ToArray());

    [HttpPost("{barberId:guid}/commission-rules"), Authorize(Policy = AuthorizationPolicies.ManageCatalog)]
    public async Task<ActionResult<CommissionRuleResponse>> CreateRuleAsync(Guid barberId, CommissionRuleRequest request, CancellationToken ct) => ToResponse(await configuration.CreateCommissionRuleAsync(barberId, new(request.Kind, request.RateBasisPoints, request.ValidFrom, request.ValidTo), ct), MapRule);

    [HttpGet("{barberId:guid}/commission-rules/effective"), Authorize(Policy = AuthorizationPolicies.ManageCatalog)]
    public async Task<ActionResult<CommissionRuleResponse>> EffectiveRuleAsync(Guid barberId, [FromQuery] CommissionKind kind, [FromQuery] DateOnly date, CancellationToken ct) => ToResponse(await configuration.ResolveCommissionRuleAsync(barberId, kind, date, ct), MapRule);

    [HttpPost("{barberId:guid}/commission-rules/{id:guid}/deactivate"), Authorize(Policy = AuthorizationPolicies.ManageCatalog)]
    public async Task<IActionResult> DeactivateRuleAsync(Guid barberId, Guid id, VersionRequest request, CancellationToken ct) => ToNoContent(await configuration.DeactivateCommissionRuleAsync(barberId, id, request.Version, ct));

    private static BarberResponse Map(BarberProfile x) => new(x.Id, x.StaffProfileId, x.EmploymentType.ToString().ToUpperInvariant(), x.SettlementFrequency.ToString().ToUpperInvariant(), x.Color, x.Active, x.Version);
    private static OfferingResponse MapOffering(Domain.Catalog.BarberServiceOffering x) => new(x.Id, x.BarberId, x.ServiceId, x.DurationMinutes, x.Price.Cents, x.Period.ValidFrom, x.Period.ValidTo, x.Active, x.Version);
    private static CommissionRuleResponse MapRule(CommissionRule x) => new(x.Id, x.BarberId, x.Kind.ToString().ToUpperInvariant(), x.Rate.BasisPoints, x.Period.ValidFrom, x.Period.ValidTo, x.Active, x.Version);
    public sealed record CreateBarberRequest(Guid StaffProfileId, EmploymentType EmploymentType, SettlementFrequency SettlementFrequency, string? Color);
    public sealed record UpdateBarberRequest(EmploymentType EmploymentType, SettlementFrequency SettlementFrequency, string? Color, bool Active, uint Version);
    public sealed record OfferingRequest(Guid ServiceId, int DurationMinutes, long PriceCents, DateOnly ValidFrom, DateOnly? ValidTo);
    public sealed record CommissionRuleRequest(CommissionKind Kind, int RateBasisPoints, DateOnly ValidFrom, DateOnly? ValidTo);
    public sealed record VersionRequest(uint Version);
    public sealed record BarberResponse(Guid Id, Guid StaffProfileId, string EmploymentType, string SettlementFrequency, string? Color, bool Active, uint Version);
    public sealed record OfferingResponse(Guid Id, Guid BarberId, Guid ServiceId, int DurationMinutes, long PriceCents, DateOnly ValidFrom, DateOnly? ValidTo, bool Active, uint Version);
    public sealed record CommissionRuleResponse(Guid Id, Guid BarberId, string Kind, int RateBasisPoints, DateOnly ValidFrom, DateOnly? ValidTo, bool Active, uint Version);
}
