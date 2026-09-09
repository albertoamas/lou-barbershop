using LouBarbershop.Application.Abstractions;
using LouBarbershop.Domain.Appointments;
using LouBarbershop.Domain.Catalog;
using LouBarbershop.Domain.Commissions;
using LouBarbershop.Domain.Customers;
using LouBarbershop.Domain.Expenses;
using LouBarbershop.Domain.Inventory;
using LouBarbershop.Domain.Sales;
using LouBarbershop.Domain.Scheduling;
using LouBarbershop.Domain.Staff;
using LouBarbershop.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace LouBarbershop.Infrastructure.Persistence;

public sealed class AppDbContext(
    DbContextOptions<AppDbContext> options,
    ICurrentActor? currentActor = null,
    IClock? clock = null) : IdentityDbContext<AppUser, AppRole, Guid>(options)
{
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<StaffProfile> StaffProfiles => Set<StaffProfile>();
    public DbSet<BarberProfile> BarberProfiles => Set<BarberProfile>();
    public DbSet<Service> Services => Set<Service>();
    public DbSet<BarberServiceOffering> BarberServiceOfferings => Set<BarberServiceOffering>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<CommissionRule> CommissionRules => Set<CommissionRule>();
    public DbSet<ExpenseCategory> ExpenseCategories => Set<ExpenseCategory>();
    public DbSet<WorkingSchedule> WorkingSchedules => Set<WorkingSchedule>();
    public DbSet<AvailabilityExceptionRule> AvailabilityExceptions => Set<AvailabilityExceptionRule>();
    public DbSet<Appointment> Appointments => Set<Appointment>();
    public DbSet<AppointmentEventRecord> AppointmentEvents => Set<AppointmentEventRecord>();
    public DbSet<SaleOperation> SaleOperations => Set<SaleOperation>();
    public DbSet<SaleItem> SaleItems => Set<SaleItem>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<CommissionEntry> CommissionEntries => Set<CommissionEntry>();
    public DbSet<Settlement> Settlements => Set<Settlement>();
    public DbSet<SettlementItem> SettlementItems => Set<SettlementItem>();
    public DbSet<SettlementAdjustment> SettlementAdjustments => Set<SettlementAdjustment>();
    public DbSet<IdempotencyRow> PaymentIdempotency => Set<IdempotencyRow>();
    public DbSet<InventoryReceipt> InventoryReceipts => Set<InventoryReceipt>();
    public DbSet<InventoryReceiptItem> InventoryReceiptItems => Set<InventoryReceiptItem>();
    public DbSet<InventoryMovement> InventoryMovements => Set<InventoryMovement>();
    public DbSet<Expense> Expenses => Set<Expense>();

    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        ArgumentNullException.ThrowIfNull(builder);

        builder.HasDefaultSchema("lou");
        builder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
        base.OnModelCreating(builder);
        ConfigureIdentityTables(builder);
    }

    private static void ConfigureIdentityTables(ModelBuilder builder)
    {
        builder.Entity<AppUser>(entity =>
        {
            entity.ToTable("users");
            entity.Property(user => user.Id).HasColumnName("id");
            entity.Property(user => user.UserName).HasColumnName("user_name");
            entity.Property(user => user.NormalizedUserName).HasColumnName("normalized_user_name");
            entity.Property(user => user.Email).HasColumnName("email");
            entity.Property(user => user.NormalizedEmail).HasColumnName("normalized_email");
            entity.Property(user => user.EmailConfirmed).HasColumnName("email_confirmed");
            entity.Property(user => user.PasswordHash).HasColumnName("password_hash");
            entity.Property(user => user.SecurityStamp).HasColumnName("security_stamp");
            entity.Property(user => user.ConcurrencyStamp).HasColumnName("concurrency_stamp");
            entity.Property(user => user.PhoneNumber).HasColumnName("phone_number");
            entity.Property(user => user.PhoneNumberConfirmed).HasColumnName("phone_number_confirmed");
            entity.Property(user => user.TwoFactorEnabled).HasColumnName("two_factor_enabled");
            entity.Property(user => user.LockoutEnd).HasColumnName("lockout_end");
            entity.Property(user => user.LockoutEnabled).HasColumnName("lockout_enabled");
            entity.Property(user => user.AccessFailedCount).HasColumnName("access_failed_count");
            entity.Property(user => user.Active).HasColumnName("active");
            entity.Property(user => user.CreatedAt).HasColumnName("created_at");
            entity.Property(user => user.UpdatedAt).HasColumnName("updated_at");
        });
        builder.Entity<AppRole>(entity =>
        {
            entity.ToTable("roles");
            entity.Property(role => role.Id).HasColumnName("id");
            entity.Property(role => role.Name).HasColumnName("name");
            entity.Property(role => role.NormalizedName).HasColumnName("normalized_name");
            entity.Property(role => role.ConcurrencyStamp).HasColumnName("concurrency_stamp");
        });
        builder.Entity<IdentityUserRole<Guid>>(entity =>
        {
            entity.ToTable("user_roles");
            entity.Property(item => item.UserId).HasColumnName("user_id");
            entity.Property(item => item.RoleId).HasColumnName("role_id");
        });
        builder.Entity<IdentityUserClaim<Guid>>(entity =>
        {
            entity.ToTable("user_claims");
            entity.Property(item => item.Id).HasColumnName("id");
            entity.Property(item => item.UserId).HasColumnName("user_id");
            entity.Property(item => item.ClaimType).HasColumnName("claim_type");
            entity.Property(item => item.ClaimValue).HasColumnName("claim_value");
        });
        builder.Entity<IdentityUserLogin<Guid>>(entity =>
        {
            entity.ToTable("user_logins");
            entity.Property(item => item.LoginProvider).HasColumnName("login_provider");
            entity.Property(item => item.ProviderKey).HasColumnName("provider_key");
            entity.Property(item => item.ProviderDisplayName).HasColumnName("provider_display_name");
            entity.Property(item => item.UserId).HasColumnName("user_id");
        });
        builder.Entity<IdentityUserToken<Guid>>(entity =>
        {
            entity.ToTable("user_tokens");
            entity.Property(item => item.UserId).HasColumnName("user_id");
            entity.Property(item => item.LoginProvider).HasColumnName("login_provider");
            entity.Property(item => item.Name).HasColumnName("name");
            entity.Property(item => item.Value).HasColumnName("value");
        });
        builder.Entity<IdentityRoleClaim<Guid>>(entity =>
        {
            entity.ToTable("role_claims");
            entity.Property(item => item.Id).HasColumnName("id");
            entity.Property(item => item.RoleId).HasColumnName("role_id");
            entity.Property(item => item.ClaimType).HasColumnName("claim_type");
            entity.Property(item => item.ClaimValue).HasColumnName("claim_value");
        });
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        AddAuditLogs();
        return base.SaveChangesAsync(cancellationToken);
    }

    private void AddAuditLogs()
    {
        var auditableTypes = new HashSet<Type>
        {
            typeof(Customer), typeof(StaffProfile), typeof(BarberProfile), typeof(Service),
            typeof(BarberServiceOffering), typeof(Product), typeof(CommissionRule), typeof(ExpenseCategory), typeof(Expense),
            typeof(WorkingSchedule), typeof(AvailabilityExceptionRule), typeof(Appointment), typeof(SaleOperation), typeof(Settlement),
        };
        var changedEntries = ChangeTracker.Entries()
            .Where(entry => auditableTypes.Contains(entry.Entity.GetType()) && entry.State is EntityState.Added or EntityState.Modified or EntityState.Deleted)
            .ToArray();

        foreach (var entry in changedEntries)
        {
            var before = entry.State is EntityState.Added ? null : SerializeValues(entry.OriginalValues.Properties.ToDictionary(p => p.Name, p => entry.OriginalValues[p]));
            var after = entry.State is EntityState.Deleted ? null : SerializeValues(entry.CurrentValues.Properties.ToDictionary(p => p.Name, p => entry.CurrentValues[p]));
            AuditLogs.Add(new AuditLog
            {
                Id = Guid.NewGuid(),
                ActorUserId = currentActor?.UserId,
                Action = entry.State.ToString(),
                EntityType = AuditEntityName(entry.Entity.GetType()),
                EntityId = (Guid)(entry.Property("Id").CurrentValue ?? Guid.Empty),
                BeforeData = before,
                AfterData = after,
                CreatedAt = (clock?.UtcNow ?? DateTimeOffset.UtcNow).ToUniversalTime(),
            });
        }
    }

    private static string SerializeValues(IReadOnlyDictionary<string, object?> values) =>
        System.Text.Json.JsonSerializer.Serialize(values);

    private static string AuditEntityName(Type type) => type.Name switch
    {
        nameof(Customer) => "customer",
        nameof(StaffProfile) => "staff_profile",
        nameof(BarberProfile) => "barber_profile",
        nameof(Service) => "service",
        nameof(BarberServiceOffering) => "barber_service_offering",
        nameof(Product) => "product",
        nameof(CommissionRule) => "commission_rule",
        nameof(ExpenseCategory) => "expense_category",
        nameof(WorkingSchedule) => "working_schedule",
        nameof(AvailabilityExceptionRule) => "availability_exception",
        nameof(Appointment) => "appointment",
        nameof(Expense) => "expense",
        nameof(Settlement) => "settlement",
        _ => type.Name,
    };
}
