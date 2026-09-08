using LouBarbershop.Api.Authorization;
using LouBarbershop.Application.Agenda;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LouBarbershop.Api.Controllers;

[ApiController, Authorize(Policy = AuthorizationPolicies.ManageOperations), Route("api/v1/customers")]
public sealed class CustomersController(CustomerService customers) : AgendaControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyCollection<CustomerView>>> SearchAsync([FromQuery] string? query, CancellationToken ct) => Respond(await customers.SearchAsync(query, ct));
    [HttpPost]
    public async Task<ActionResult<CustomerChange>> CreateAsync(CustomerRequest request, CancellationToken ct) => Respond(await customers.SaveAsync(null, new(request.DisplayName, request.Phone, request.Notes), null, ct));
    [HttpPatch("{id:guid}"), Authorize(Policy = AuthorizationPolicies.ManageScheduling)]
    public async Task<ActionResult<CustomerChange>> UpdateAsync(Guid id, UpdateCustomerRequest request, CancellationToken ct) => Respond(await customers.SaveAsync(id, new(request.DisplayName, request.Phone, request.Notes), request.Version, ct));
    public sealed record CustomerRequest(string DisplayName, string Phone, string? Notes);
    public sealed record UpdateCustomerRequest(string DisplayName, string Phone, string? Notes, uint Version);
}
