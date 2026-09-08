using LouBarbershop.Application.Abstractions;
using LouBarbershop.Domain.Customers;

namespace LouBarbershop.Application.Agenda;

public sealed class CustomerService(IAgendaStore store, ICurrentActor actor, IClock clock, IIdGenerator ids)
{
    private bool CanManage => actor.IsInRole("OWNER") || actor.IsInRole("ADMIN");
    private bool CanOperate => CanManage || actor.IsInRole("BARBER");

    public async Task<AgendaResult<IReadOnlyCollection<CustomerView>>> SearchAsync(string? query, CancellationToken ct)
    {
        if (!CanOperate) return new(AgendaStatus.Forbidden);
        var normalized = query?.Trim() ?? string.Empty;
        if (normalized.Length > 120) return new(AgendaStatus.Invalid, Code: "query.invalid", Message: "La búsqueda admite hasta 120 caracteres.");
        var phone = NormalizePhone(normalized);
        var customers = await store.SearchCustomersAsync(normalized, phone.IsSuccess ? phone.Value : null, ct);
        return new(AgendaStatus.Success, customers.Select(MapForActor).ToArray());
    }

    public async Task<AgendaResult<CustomerChange>> SaveAsync(Guid? id, CustomerInput input, uint? version, CancellationToken ct)
    {
        if (!CanOperate || (id.HasValue && !CanManage)) return new(AgendaStatus.Forbidden);
        if (!CanManage) input = input with { Notes = null };
        if (input.Notes?.Length > 1000) return new(AgendaStatus.Invalid, Code: "customer.notes_too_long", Message: "La nota admite hasta 1000 caracteres.");
        var phone = NormalizePhone(input.Phone);
        if (!phone.IsSuccess) return new(AgendaStatus.Invalid, Code: phone.Error!.Code, Message: phone.Error.Message);
        Customer? customer;
        if (id.HasValue)
        {
            customer = await store.FindCustomerAsync(id.Value, ct);
            if (customer is null) return new(AgendaStatus.NotFound);
            if (customer.Version != version) return new(AgendaStatus.Conflict, Code: "VERSION_CONFLICT", Message: "El cliente cambió. Recarga antes de guardar.");
            var changed = customer.UpdateDetails(input.DisplayName, phone.Value, input.Notes, clock.UtcNow);
            if (!changed.IsSuccess) return new(AgendaStatus.Invalid, Code: changed.Error!.Code, Message: changed.Error.Message);
        }
        else
        {
            var created = Customer.Create(ids.Create(), input.DisplayName, phone.Value, input.Notes, clock.UtcNow);
            if (!created.IsSuccess) return new(AgendaStatus.Invalid, Code: created.Error!.Code, Message: created.Error.Message);
            customer = created.Value;
            store.Add(customer);
        }
        var duplicates = await store.SearchCustomersAsync(phone.Value.Value, phone.Value, ct);
        await store.SaveChangesAsync(ct);
        return new(AgendaStatus.Success, new CustomerChange(Map(customer), duplicates.Where(x => x.Id != customer.Id && x.PhoneNumber == phone.Value).Select(Map).ToArray()));
    }

    public static LouBarbershop.Domain.Common.DomainResult<PhoneNumber> NormalizePhone(string? value)
    {
        var normalized = string.Concat((value ?? string.Empty).Where(x => x != ' ' && x != '-' && x != '(' && x != ')'));
        if (normalized.Length == 8 && normalized.All(char.IsAsciiDigit)) normalized = "+591" + normalized;
        if (normalized.StartsWith("00", StringComparison.Ordinal)) normalized = "+" + normalized[2..];
        return PhoneNumber.Create(normalized);
    }

    private static CustomerView Map(Customer value) => new(value.Id, value.DisplayName, value.PhoneNumber.Value, value.Notes, value.Version);
    private CustomerView MapForActor(Customer value) => CanManage ? Map(value) : Map(value) with { Notes = null };
}
