using LouBarbershop.Application.Abstractions;
using LouBarbershop.Domain.Catalog;
using LouBarbershop.Domain.Commissions;
using LouBarbershop.Domain.Common;
using LouBarbershop.Domain.Expenses;
using LouBarbershop.Domain.Finance;
using LouBarbershop.Domain.Staff;

namespace LouBarbershop.Application.Configuration;

public sealed class ConfigurationService(IConfigurationStore store, IClock clock, IIdGenerator ids, ICurrentActor actor)
{
    public Task<IReadOnlyCollection<StaffProfile>> ListStaffAsync(CancellationToken ct) => store.ListStaffAsync(ct);
    public Task<IReadOnlyCollection<BarberProfile>> ListBarbersAsync(CancellationToken ct) => store.ListBarbersAsync(ct);
    public Task<IReadOnlyCollection<Service>> ListServicesAsync(CancellationToken ct) => store.ListServicesAsync(ct);
    public Task<IReadOnlyCollection<Product>> ListProductsAsync(CancellationToken ct) => store.ListProductsAsync(ct);
    public Task<IReadOnlyCollection<ExpenseCategory>> ListExpenseCategoriesAsync(CancellationToken ct) => store.ListExpenseCategoriesAsync(ct);
    public Task<IReadOnlyCollection<BarberServiceOffering>> ListOfferingsAsync(Guid barberId, CancellationToken ct) => store.ListOfferingsAsync(barberId, ct);
    public Task<IReadOnlyCollection<CommissionRule>> ListCommissionRulesAsync(Guid barberId, CancellationToken ct) => store.ListCommissionRulesAsync(barberId, ct);

    public async Task<ConfigurationResult<StaffProfile>> CreateStaffAsync(StaffInput input, CancellationToken ct)
    {
        if (!await store.UserExistsAsync(input.UserId, ct)) return ConfigurationResults.Invalid<StaffProfile>("staff.user_not_found", "La cuenta seleccionada no existe.");
        if (await store.UserHasStaffAsync(input.UserId, ct)) return ConfigurationResults.Conflict<StaffProfile>("staff.user_already_linked", "La cuenta ya tiene un perfil de personal.");
        return await PersistCreatedAsync(StaffProfile.Create(ids.Create(), input.UserId, input.DisplayName, input.Phone, clock.UtcNow), store.Add, ct);
    }

    public async Task<ConfigurationResult<StaffProfile>> UpdateStaffAsync(Guid id, StaffUpdate input, CancellationToken ct)
    {
        var entity = await store.FindStaffAsync(id, ct);
        if (entity is null) return ConfigurationResults.Missing<StaffProfile>();
        if (entity.Version != input.Version) return VersionConflict<StaffProfile>();
        return await PersistUpdatedAsync(entity.Update(input.DisplayName, input.Phone, input.Active, clock.UtcNow), ct);
    }

    public async Task<ConfigurationResult<BarberProfile>> CreateBarberAsync(BarberInput input, CancellationToken ct)
    {
        var staff = await store.FindStaffAsync(input.StaffProfileId, ct);
        if (staff is null || !staff.Active) return ConfigurationResults.Invalid<BarberProfile>("barber.staff_not_found", "El perfil de personal no existe o está inactivo.");
        if (await store.StaffHasBarberAsync(input.StaffProfileId, ct)) return ConfigurationResults.Conflict<BarberProfile>("barber.staff_already_linked", "La persona ya tiene perfil de barbero.");
        return await PersistCreatedAsync(BarberProfile.Create(ids.Create(), input.StaffProfileId, input.EmploymentType, input.SettlementFrequency, input.Color, clock.UtcNow), store.Add, ct);
    }

    public async Task<ConfigurationResult<BarberProfile>> UpdateBarberAsync(Guid id, BarberUpdate input, CancellationToken ct)
    {
        var entity = await store.FindBarberAsync(id, ct);
        if (entity is null) return ConfigurationResults.Missing<BarberProfile>();
        if (entity.Version != input.Version) return VersionConflict<BarberProfile>();
        if (input.EmploymentType is EmploymentType.Owner && (await store.ListCommissionRulesAsync(id, ct)).Any(x => x.Active))
            return ConfigurationResults.Conflict<BarberProfile>("barber.owner_has_commission", "Desactive las reglas de comisión antes de cambiar a dueño.");
        return await PersistUpdatedAsync(entity.Update(input.EmploymentType, input.SettlementFrequency, input.Color, input.Active, clock.UtcNow), ct);
    }

    public async Task<ConfigurationResult<Service>> CreateServiceAsync(ServiceInput input, CancellationToken ct)
    {
        var money = Money.Create(input.DefaultPriceCents);
        if (!money.IsSuccess) return Invalid<Service>(money.Error!);
        return await PersistCreatedAsync(Service.Create(ids.Create(), input.Name, input.Description, input.DefaultDurationMinutes, money.Value, clock.UtcNow), store.Add, ct);
    }

    public async Task<ConfigurationResult<Service>> UpdateServiceAsync(Guid id, ServiceUpdate input, CancellationToken ct)
    {
        var entity = await store.FindServiceAsync(id, ct);
        if (entity is null) return ConfigurationResults.Missing<Service>();
        if (entity.Version != input.Version) return VersionConflict<Service>();
        var money = Money.Create(input.DefaultPriceCents);
        if (!money.IsSuccess) return Invalid<Service>(money.Error!);
        return await PersistUpdatedAsync(entity.Update(input.Name, input.Description, input.DefaultDurationMinutes, money.Value, input.Active, clock.UtcNow), ct);
    }

    public async Task<ConfigurationResult<BarberServiceOffering>> CreateOfferingAsync(Guid barberId, OfferingInput input, CancellationToken ct)
    {
        var barber = await store.FindBarberAsync(barberId, ct);
        var service = await store.FindServiceAsync(input.ServiceId, ct);
        if (barber is null || !barber.Active || service is null || !service.Active) return ConfigurationResults.Invalid<BarberServiceOffering>("offering.references_inactive", "El barbero y el servicio deben existir y estar activos.");
        var money = Money.Create(input.PriceCents); if (!money.IsSuccess) return Invalid<BarberServiceOffering>(money.Error!);
        var period = EffectivePeriod.Create(input.ValidFrom, input.ValidTo); if (!period.IsSuccess) return Invalid<BarberServiceOffering>(period.Error!);
        if (await store.OfferingOverlapsAsync(barberId, input.ServiceId, input.ValidFrom, input.ValidTo, ct)) return ConfigurationResults.Conflict<BarberServiceOffering>("offering.period_overlap", "Ya existe una oferta activa que se solapa con esa vigencia.");
        return await PersistCreatedAsync(BarberServiceOffering.Create(ids.Create(), barberId, input.ServiceId, input.DurationMinutes, money.Value, period.Value, clock.UtcNow), store.Add, ct);
    }

    public async Task<ConfigurationResult<EffectiveOffering>> ResolveOfferingAsync(Guid barberId, Guid serviceId, DateOnly date, CancellationToken ct)
    {
        var service = await store.FindServiceAsync(serviceId, ct);
        if (service is null || !service.Active) return ConfigurationResults.Missing<EffectiveOffering>();
        var offering = (await store.ListOfferingsAsync(barberId, ct)).SingleOrDefault(x => x.Active && x.ServiceId == serviceId && x.Period.Contains(date));
        return ConfigurationResults.Success(offering is null
            ? new EffectiveOffering(service.Id, service.Name, service.DefaultDurationMinutes, service.DefaultPrice.Cents, false)
            : new EffectiveOffering(service.Id, service.Name, offering.DurationMinutes, offering.Price.Cents, true));
    }

    public async Task<ConfigurationResult<BarberServiceOffering>> DeactivateOfferingAsync(Guid barberId, Guid id, uint version, CancellationToken ct)
    {
        var entity = await store.FindOfferingAsync(id, ct);
        if (entity is null || entity.BarberId != barberId) return ConfigurationResults.Missing<BarberServiceOffering>();
        if (entity.Version != version) return VersionConflict<BarberServiceOffering>();
        entity.Deactivate(clock.UtcNow); await store.SaveChangesAsync(ct); return ConfigurationResults.Success(entity);
    }

    public async Task<ConfigurationResult<Product>> CreateProductAsync(ProductInput input, CancellationToken ct)
    {
        var money = Money.Create(input.SalePriceCents); if (!money.IsSuccess) return Invalid<Product>(money.Error!);
        var sku = input.Sku?.Trim().ToUpperInvariant();
        if (!string.IsNullOrEmpty(sku) && await store.SkuExistsAsync(sku, null, ct)) return ConfigurationResults.Conflict<Product>("product.sku_exists", "El SKU ya está en uso.");
        return await PersistCreatedAsync(Product.Create(ids.Create(), input.Name, input.Brand, input.Sku, input.Description, money.Value, input.MinimumStock, clock.UtcNow), store.Add, ct);
    }

    public async Task<ConfigurationResult<Product>> UpdateProductAsync(Guid id, ProductUpdate input, CancellationToken ct)
    {
        var entity = await store.FindProductAsync(id, ct); if (entity is null) return ConfigurationResults.Missing<Product>();
        if (entity.Version != input.Version) return VersionConflict<Product>();
        var money = Money.Create(input.SalePriceCents); if (!money.IsSuccess) return Invalid<Product>(money.Error!);
        var sku = input.Sku?.Trim().ToUpperInvariant();
        if (!string.IsNullOrEmpty(sku) && await store.SkuExistsAsync(sku, id, ct)) return ConfigurationResults.Conflict<Product>("product.sku_exists", "El SKU ya está en uso.");
        return await PersistUpdatedAsync(entity.Update(input.Name, input.Brand, input.Sku, input.Description, money.Value, input.MinimumStock, input.Active, clock.UtcNow), ct);
    }

    public async Task<ConfigurationResult<CommissionRule>> CreateCommissionRuleAsync(Guid barberId, CommissionRuleInput input, CancellationToken ct)
    {
        var barber = await store.FindBarberAsync(barberId, ct);
        if (barber is null || !barber.Active) return ConfigurationResults.Missing<CommissionRule>();
        if (barber.EmploymentType is EmploymentType.Owner) return ConfigurationResults.Conflict<CommissionRule>("commission.owner_not_allowed", "El dueño produce, pero no genera deuda de comisión.");
        var rate = CommissionRate.Create(input.RateBasisPoints); if (!rate.IsSuccess) return Invalid<CommissionRule>(rate.Error!);
        var period = EffectivePeriod.Create(input.ValidFrom, input.ValidTo); if (!period.IsSuccess) return Invalid<CommissionRule>(period.Error!);
        if (await store.CommissionRuleOverlapsAsync(barberId, input.Kind, input.ValidFrom, input.ValidTo, ct)) return ConfigurationResults.Conflict<CommissionRule>("commission.period_overlap", "Ya existe una tasa del mismo tipo que se solapa con esa vigencia.");
        if (actor.UserId is not Guid actorId) return ConfigurationResults.Invalid<CommissionRule>("actor.required", "Se requiere un actor autenticado.");
        return await PersistCreatedAsync(CommissionRule.Create(ids.Create(), barberId, input.Kind, rate.Value, period.Value, actorId, clock.UtcNow), store.Add, ct);
    }

    public async Task<ConfigurationResult<CommissionRule>> ResolveCommissionRuleAsync(Guid barberId, CommissionKind kind, DateOnly date, CancellationToken ct)
    {
        var rule = (await store.ListCommissionRulesAsync(barberId, ct))
            .SingleOrDefault(item => item.Active && item.Kind == kind && item.Period.Contains(date));
        return rule is null ? ConfigurationResults.Missing<CommissionRule>() : ConfigurationResults.Success(rule);
    }

    public async Task<ConfigurationResult<CommissionRule>> DeactivateCommissionRuleAsync(Guid barberId, Guid id, uint version, CancellationToken ct)
    {
        var entity = await store.FindCommissionRuleAsync(id, ct);
        if (entity is null || entity.BarberId != barberId) return ConfigurationResults.Missing<CommissionRule>();
        if (entity.Version != version) return VersionConflict<CommissionRule>();
        entity.Deactivate(clock.UtcNow); await store.SaveChangesAsync(ct); return ConfigurationResults.Success(entity);
    }

    public async Task<ConfigurationResult<ExpenseCategory>> CreateExpenseCategoryAsync(ExpenseCategoryInput input, CancellationToken ct) =>
        await PersistCreatedAsync(ExpenseCategory.Create(ids.Create(), input.Name, clock.UtcNow), store.Add, ct);

    public async Task<ConfigurationResult<ExpenseCategory>> UpdateExpenseCategoryAsync(Guid id, ExpenseCategoryUpdate input, CancellationToken ct)
    {
        var entity = await store.FindExpenseCategoryAsync(id, ct); if (entity is null) return ConfigurationResults.Missing<ExpenseCategory>();
        if (entity.Version != input.Version) return VersionConflict<ExpenseCategory>();
        return await PersistUpdatedAsync(entity.Update(input.Name, input.Active, clock.UtcNow), ct);
    }

    private async Task<ConfigurationResult<T>> PersistCreatedAsync<T>(DomainResult<T> result, Action<T> add, CancellationToken ct) where T : class
    { if (!result.IsSuccess) return Invalid<T>(result.Error!); add(result.Value); await store.SaveChangesAsync(ct); return ConfigurationResults.Success(result.Value); }
    private async Task<ConfigurationResult<T>> PersistUpdatedAsync<T>(DomainResult<T> result, CancellationToken ct) where T : class
    { if (!result.IsSuccess) return Invalid<T>(result.Error!); await store.SaveChangesAsync(ct); return ConfigurationResults.Success(result.Value); }
    private static ConfigurationResult<T> Invalid<T>(DomainError error) => ConfigurationResults.Invalid<T>(error.Code, error.Message);
    private static ConfigurationResult<T> VersionConflict<T>() => ConfigurationResults.Conflict<T>("version.conflict", "El registro cambió; recargue antes de guardar.");
}
