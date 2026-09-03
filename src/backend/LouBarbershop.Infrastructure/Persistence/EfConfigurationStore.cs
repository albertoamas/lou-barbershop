using LouBarbershop.Application.Configuration;
using LouBarbershop.Domain.Catalog;
using LouBarbershop.Domain.Commissions;
using LouBarbershop.Domain.Expenses;
using LouBarbershop.Domain.Staff;
using LouBarbershop.Infrastructure.Identity;
using Microsoft.EntityFrameworkCore;

namespace LouBarbershop.Infrastructure.Persistence;

public sealed class EfConfigurationStore(AppDbContext dbContext) : IConfigurationStore
{
    public async Task<IReadOnlyCollection<StaffProfile>> ListStaffAsync(CancellationToken ct) => await dbContext.StaffProfiles.AsNoTracking().OrderBy(x => x.DisplayName).ToArrayAsync(ct);
    public Task<StaffProfile?> FindStaffAsync(Guid id, CancellationToken ct) => dbContext.StaffProfiles.SingleOrDefaultAsync(x => x.Id == id, ct);
    public Task<bool> UserExistsAsync(Guid userId, CancellationToken ct) => dbContext.Set<AppUser>().AnyAsync(x => x.Id == userId, ct);
    public Task<bool> UserHasStaffAsync(Guid userId, CancellationToken ct) => dbContext.StaffProfiles.AnyAsync(x => x.UserId == userId, ct);
    public void Add(StaffProfile entity) => dbContext.StaffProfiles.Add(entity);

    public async Task<IReadOnlyCollection<BarberProfile>> ListBarbersAsync(CancellationToken ct) => await dbContext.BarberProfiles.AsNoTracking().OrderBy(x => x.CreatedAt).ToArrayAsync(ct);
    public Task<BarberProfile?> FindBarberAsync(Guid id, CancellationToken ct) => dbContext.BarberProfiles.SingleOrDefaultAsync(x => x.Id == id, ct);
    public Task<bool> StaffHasBarberAsync(Guid staffId, CancellationToken ct) => dbContext.BarberProfiles.AnyAsync(x => x.StaffProfileId == staffId, ct);
    public void Add(BarberProfile entity) => dbContext.BarberProfiles.Add(entity);

    public async Task<IReadOnlyCollection<Service>> ListServicesAsync(CancellationToken ct) => await dbContext.Services.AsNoTracking().OrderBy(x => x.Name).ToArrayAsync(ct);
    public Task<Service?> FindServiceAsync(Guid id, CancellationToken ct) => dbContext.Services.SingleOrDefaultAsync(x => x.Id == id, ct);
    public void Add(Service entity) => dbContext.Services.Add(entity);

    public async Task<IReadOnlyCollection<BarberServiceOffering>> ListOfferingsAsync(Guid barberId, CancellationToken ct) => await dbContext.BarberServiceOfferings.AsNoTracking().Where(x => x.BarberId == barberId).OrderBy(x => x.Period.ValidFrom).ToArrayAsync(ct);
    public Task<BarberServiceOffering?> FindOfferingAsync(Guid id, CancellationToken ct) => dbContext.BarberServiceOfferings.SingleOrDefaultAsync(x => x.Id == id, ct);
    public Task<bool> OfferingOverlapsAsync(Guid barberId, Guid serviceId, DateOnly validFrom, DateOnly? validTo, CancellationToken ct) => dbContext.BarberServiceOfferings.AnyAsync(x => x.Active && x.BarberId == barberId && x.ServiceId == serviceId && (!x.Period.ValidTo.HasValue || validFrom <= x.Period.ValidTo.Value) && (!validTo.HasValue || x.Period.ValidFrom <= validTo.Value), ct);
    public void Add(BarberServiceOffering entity) => dbContext.BarberServiceOfferings.Add(entity);

    public async Task<IReadOnlyCollection<Product>> ListProductsAsync(CancellationToken ct) => await dbContext.Products.AsNoTracking().OrderBy(x => x.Name).ToArrayAsync(ct);
    public Task<Product?> FindProductAsync(Guid id, CancellationToken ct) => dbContext.Products.SingleOrDefaultAsync(x => x.Id == id, ct);
    public Task<bool> SkuExistsAsync(string sku, Guid? exceptId, CancellationToken ct) => dbContext.Products.AnyAsync(x => x.Sku == sku && (!exceptId.HasValue || x.Id != exceptId.Value), ct);
    public void Add(Product entity) => dbContext.Products.Add(entity);

    public async Task<IReadOnlyCollection<CommissionRule>> ListCommissionRulesAsync(Guid barberId, CancellationToken ct) => await dbContext.CommissionRules.AsNoTracking().Where(x => x.BarberId == barberId).OrderBy(x => x.Kind).ThenBy(x => x.Period.ValidFrom).ToArrayAsync(ct);
    public Task<CommissionRule?> FindCommissionRuleAsync(Guid id, CancellationToken ct) => dbContext.CommissionRules.SingleOrDefaultAsync(x => x.Id == id, ct);
    public Task<bool> CommissionRuleOverlapsAsync(Guid barberId, CommissionKind kind, DateOnly validFrom, DateOnly? validTo, CancellationToken ct) => dbContext.CommissionRules.AnyAsync(x => x.BarberId == barberId && x.Kind == kind && (!x.Period.ValidTo.HasValue || validFrom <= x.Period.ValidTo.Value) && (!validTo.HasValue || x.Period.ValidFrom <= validTo.Value), ct);
    public void Add(CommissionRule entity) => dbContext.CommissionRules.Add(entity);

    public async Task<IReadOnlyCollection<ExpenseCategory>> ListExpenseCategoriesAsync(CancellationToken ct) => await dbContext.ExpenseCategories.AsNoTracking().OrderBy(x => x.Name).ToArrayAsync(ct);
    public Task<ExpenseCategory?> FindExpenseCategoryAsync(Guid id, CancellationToken ct) => dbContext.ExpenseCategories.SingleOrDefaultAsync(x => x.Id == id, ct);
    public void Add(ExpenseCategory entity) => dbContext.ExpenseCategories.Add(entity);
    public Task SaveChangesAsync(CancellationToken ct) => dbContext.SaveChangesAsync(ct);
}
