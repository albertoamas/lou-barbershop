using LouBarbershop.Domain.Catalog;
using LouBarbershop.Domain.Commissions;
using LouBarbershop.Domain.Expenses;
using LouBarbershop.Domain.Staff;

namespace LouBarbershop.Application.Configuration;

public interface IConfigurationStore
{
    Task<IReadOnlyCollection<StaffProfile>> ListStaffAsync(CancellationToken ct);
    Task<StaffProfile?> FindStaffAsync(Guid id, CancellationToken ct);
    Task<bool> UserExistsAsync(Guid userId, CancellationToken ct);
    Task<bool> UserHasStaffAsync(Guid userId, CancellationToken ct);
    void Add(StaffProfile entity);

    Task<IReadOnlyCollection<BarberProfile>> ListBarbersAsync(CancellationToken ct);
    Task<BarberProfile?> FindBarberAsync(Guid id, CancellationToken ct);
    Task<bool> StaffHasBarberAsync(Guid staffId, CancellationToken ct);
    void Add(BarberProfile entity);

    Task<IReadOnlyCollection<Service>> ListServicesAsync(CancellationToken ct);
    Task<Service?> FindServiceAsync(Guid id, CancellationToken ct);
    void Add(Service entity);

    Task<IReadOnlyCollection<BarberServiceOffering>> ListOfferingsAsync(Guid barberId, CancellationToken ct);
    Task<BarberServiceOffering?> FindOfferingAsync(Guid id, CancellationToken ct);
    Task<bool> OfferingOverlapsAsync(Guid barberId, Guid serviceId, DateOnly validFrom, DateOnly? validTo, CancellationToken ct);
    void Add(BarberServiceOffering entity);

    Task<IReadOnlyCollection<Product>> ListProductsAsync(CancellationToken ct);
    Task<Product?> FindProductAsync(Guid id, CancellationToken ct);
    Task<bool> SkuExistsAsync(string sku, Guid? exceptId, CancellationToken ct);
    void Add(Product entity);

    Task<IReadOnlyCollection<CommissionRule>> ListCommissionRulesAsync(Guid barberId, CancellationToken ct);
    Task<CommissionRule?> FindCommissionRuleAsync(Guid id, CancellationToken ct);
    Task<bool> CommissionRuleOverlapsAsync(Guid barberId, CommissionKind kind, DateOnly validFrom, DateOnly? validTo, CancellationToken ct);
    void Add(CommissionRule entity);

    Task<IReadOnlyCollection<ExpenseCategory>> ListExpenseCategoriesAsync(CancellationToken ct);
    Task<ExpenseCategory?> FindExpenseCategoryAsync(Guid id, CancellationToken ct);
    void Add(ExpenseCategory entity);

    Task SaveChangesAsync(CancellationToken ct);
}
