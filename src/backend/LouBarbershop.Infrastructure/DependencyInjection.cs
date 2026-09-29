using LouBarbershop.Application.Abstractions;
using LouBarbershop.Application.Agenda;
using LouBarbershop.Application.Commissions;
using LouBarbershop.Application.Configuration;
using LouBarbershop.Application.Inventory;
using LouBarbershop.Application.PublicBooking;
using LouBarbershop.Application.Reporting;
using LouBarbershop.Application.Sales;
using LouBarbershop.Application.Scheduling;
using LouBarbershop.Infrastructure.CurrentActor;
using LouBarbershop.Infrastructure.Identifiers;
using LouBarbershop.Infrastructure.Identity;
using LouBarbershop.Infrastructure.Persistence;
using LouBarbershop.Infrastructure.Security;
using LouBarbershop.Infrastructure.Time;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace LouBarbershop.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Database");

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "ConnectionStrings:Database must be configured. Use user secrets or environment variables outside local development.");
        }

        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(
                connectionString,
                npgsql => npgsql.MigrationsAssembly(typeof(AppDbContext).Assembly.FullName)));
        services.AddIdentityCore<AppUser>(options =>
            {
                options.Password.RequiredLength = 12;
                options.Password.RequireDigit = true;
                options.Password.RequireLowercase = true;
                options.Password.RequireUppercase = true;
                options.Password.RequireNonAlphanumeric = true;
                options.Lockout.AllowedForNewUsers = true;
                options.Lockout.MaxFailedAccessAttempts = 5;
                options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
                options.User.RequireUniqueEmail = false;
            })
            .AddRoles<AppRole>()
            .AddEntityFrameworkStores<AppDbContext>()
            .AddDefaultTokenProviders()
            .AddSignInManager();
        services.AddScoped<IUserClaimsPrincipalFactory<AppUser>, AppUserClaimsPrincipalFactory>();
        services.AddSingleton<IClock, SystemClock>();
        services.AddSingleton<IIdGenerator, GuidIdGenerator>();
        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentActor, HttpCurrentActor>();
        services.AddScoped<IRequestContext, HttpRequestContext>();
        services.AddScoped<IUnitOfWork, EfUnitOfWork>();
        services.AddScoped<IConfigurationStore, EfConfigurationStore>();
        services.AddScoped<ConfigurationService>();
        services.AddScoped<ISchedulingStore, EfSchedulingStore>();
        services.AddScoped<SchedulingService>();
        services.AddScoped<IAgendaStore, EfAgendaStore>();
        services.AddScoped<AgendaService>();
        services.AddScoped<CustomerService>();
        services.AddScoped<ISalesStore, EfSalesStore>();
        services.AddScoped<SalesService>();
        services.AddScoped<IInventoryStore, EfInventoryStore>();
        services.AddScoped<InventoryService>();
        services.AddScoped<ICommissionStore, EfCommissionStore>();
        services.AddScoped<CommissionService>();
        services.AddScoped<IReportingStore, EfReportingStore>();
        services.AddScoped<ReportingService>();
        services.AddSingleton<IPublicManagementTokenService, PublicManagementTokenService>();
        services.AddScoped<PublicBookingService>();
        services.AddScoped<OwnerBootstrapper>();
        services.AddScoped<InternalUserAdministration>();

        return services;
    }
}
