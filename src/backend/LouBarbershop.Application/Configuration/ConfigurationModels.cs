using LouBarbershop.Domain.Catalog;
using LouBarbershop.Domain.Commissions;
using LouBarbershop.Domain.Expenses;
using LouBarbershop.Domain.Staff;

namespace LouBarbershop.Application.Configuration;

public enum ConfigurationStatus { Success, Validation, NotFound, Conflict }

public sealed record ConfigurationResult<T>(ConfigurationStatus Status, T? Value = default, string? Code = null, string? Message = null);

public static class ConfigurationResults
{
    public static ConfigurationResult<T> Success<T>(T value) => new(ConfigurationStatus.Success, value);
    public static ConfigurationResult<T> Invalid<T>(string code, string message) => new(ConfigurationStatus.Validation, default, code, message);
    public static ConfigurationResult<T> Missing<T>() => new(ConfigurationStatus.NotFound);
    public static ConfigurationResult<T> Conflict<T>(string code, string message) => new(ConfigurationStatus.Conflict, default, code, message);
}

public sealed record StaffInput(Guid UserId, string DisplayName, string? Phone);
public sealed record StaffUpdate(string DisplayName, string? Phone, bool Active, uint Version);
public sealed record BarberInput(Guid StaffProfileId, EmploymentType EmploymentType, SettlementFrequency SettlementFrequency, string? Color);
public sealed record BarberUpdate(EmploymentType EmploymentType, SettlementFrequency SettlementFrequency, string? Color, bool Active, uint Version);
public sealed record ServiceInput(string Name, string? Description, int DefaultDurationMinutes, long DefaultPriceCents);
public sealed record ServiceUpdate(string Name, string? Description, int DefaultDurationMinutes, long DefaultPriceCents, bool Active, uint Version);
public sealed record OfferingInput(Guid ServiceId, int DurationMinutes, long PriceCents, DateOnly ValidFrom, DateOnly? ValidTo);
public sealed record ProductInput(string Name, string? Brand, string? Sku, string? Description, long SalePriceCents, int MinimumStock);
public sealed record ProductUpdate(string Name, string? Brand, string? Sku, string? Description, long SalePriceCents, int MinimumStock, bool Active, uint Version);
public sealed record CommissionRuleInput(CommissionKind Kind, int RateBasisPoints, DateOnly ValidFrom, DateOnly? ValidTo);
public sealed record ExpenseCategoryInput(string Name);
public sealed record ExpenseCategoryUpdate(string Name, bool Active, uint Version);

public sealed record EffectiveOffering(Guid ServiceId, string ServiceName, int DurationMinutes, long PriceCents, bool UsesBarberOverride);

public static class ConfigurationViews
{
    public static object Staff(StaffProfile value) => new { value.Id, value.UserId, value.DisplayName, value.Phone, value.Active, value.Version };
    public static object Barber(BarberProfile value) => new { value.Id, value.StaffProfileId, EmploymentType = value.EmploymentType.ToString().ToUpperInvariant(), SettlementFrequency = value.SettlementFrequency.ToString().ToUpperInvariant(), value.Color, value.Active, value.Version };
    public static object Service(Service value) => new { value.Id, value.Name, value.Description, value.DefaultDurationMinutes, DefaultPriceCents = value.DefaultPrice.Cents, value.Active, value.Version };
    public static object Offering(BarberServiceOffering value) => new { value.Id, value.BarberId, value.ServiceId, value.DurationMinutes, PriceCents = value.Price.Cents, value.Period.ValidFrom, value.Period.ValidTo, value.Active, value.Version };
    public static object Product(Product value) => new { value.Id, value.Name, value.Brand, value.Sku, value.Description, SalePriceCents = value.SalePrice.Cents, AverageCostCents = value.AverageCost.Cents, value.MinimumStock, value.Active, value.Version };
    public static object CommissionRule(CommissionRule value) => new { value.Id, value.BarberId, Kind = value.Kind.ToString().ToUpperInvariant(), RateBasisPoints = value.Rate.BasisPoints, value.Period.ValidFrom, value.Period.ValidTo, value.Active, value.Version };
    public static object ExpenseCategory(ExpenseCategory value) => new { value.Id, value.Name, value.Active, value.Version };
}
