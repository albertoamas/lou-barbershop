using LouBarbershop.Application.Agenda;
using LouBarbershop.Application.Commissions;
using LouBarbershop.Application.Configuration;
using LouBarbershop.Application.Inventory;
using LouBarbershop.Application.Sales;
using LouBarbershop.Application.Scheduling;
using LouBarbershop.Domain.Appointments;
using LouBarbershop.Domain.Commissions;
using LouBarbershop.Domain.Inventory;
using LouBarbershop.Domain.Sales;
using LouBarbershop.Domain.Scheduling;
using LouBarbershop.Domain.Staff;
using LouBarbershop.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using ConfigProductInput = LouBarbershop.Application.Configuration.ProductInput;
using ConfigServiceInput = LouBarbershop.Application.Configuration.ServiceInput;
using SaleAdjustmentInput = LouBarbershop.Application.Sales.AdjustmentInput;
using SaleProductInput = LouBarbershop.Application.Sales.ProductInput;
using SaleServiceInput = LouBarbershop.Application.Sales.ServiceInput;
using StockAdjustmentInput = LouBarbershop.Application.Inventory.AdjustmentInput;

namespace LouBarbershop.Infrastructure.DemoData;

public sealed record DemoSeedSummary(
    DateOnly From,
    DateOnly To,
    int Customers,
    int Appointments,
    int PaidOperations,
    int Settlements);

/// <summary>
/// Builds a realistic local dataset by replaying four weeks of barbershop activity
/// day by day through the application services, with a simulated clock. Nothing is
/// written to the database directly, so every business rule, price, commission,
/// inventory movement and audit event is produced exactly as in normal use.
/// </summary>
public sealed partial class DemoSeeder(
    IServiceScopeFactory scopes,
    SimulatedClock clock,
    SeedActor actor,
    IConfiguration configuration,
    ILogger<DemoSeeder> logger)
{
    private static readonly TimeZoneInfo BusinessZone = TimeZoneInfo.FindSystemTimeZoneById("America/La_Paz");

    private readonly DemoRandom random = new(20261003);
    private readonly List<DemoBarber> barbers = [];
    private readonly Dictionary<string, DemoService> services = new(StringComparer.Ordinal);
    private readonly List<DemoProduct> products = [];
    private readonly Dictionary<Guid, int> stock = [];
    private readonly List<Guid> customers = [];
    private readonly List<Booking> bookings = [];
    private readonly List<PaidOperation> paidOperations = [];
    private readonly Dictionary<string, Guid> categories = new(StringComparer.Ordinal);
    private int settlements;

    public async Task<DemoSeedSummary> SeedAsync(CancellationToken ct)
    {
        var password = configuration["DemoSeed:StaffPassword"];
        if (string.IsNullOrWhiteSpace(password))
            throw new InvalidOperationException("Define DemoSeed__StaffPassword para las cuentas de prueba del equipo.");

        var realNow = DateTimeOffset.UtcNow;
        var today = LocalDate(realNow);
        var historyDays = Math.Clamp(configuration.GetValue("DemoSeed:HistoryDays", 28), 7, 60);
        var first = today.AddDays(-historyDays);
        var cutoff = TodayCutoff(today, realNow);

        clock.Set(At(first.AddDays(-3), 9, 0));
        await using (var scope = scopes.CreateAsyncScope())
        {
            var provider = scope.ServiceProvider;
            var ownerName = configuration["BootstrapOwner:UserName"]?.Trim();
            var owner = string.IsNullOrWhiteSpace(ownerName)
                ? null
                : await provider.GetRequiredService<UserManager<AppUser>>().FindByNameAsync(ownerName);
            if (owner is null)
                throw new InvalidOperationException("Crea primero el dueño con --bootstrap-owner.");
            actor.ActAs(owner.Id, RoleNames.Owner, RoleNames.Admin);

            var configurationService = provider.GetRequiredService<ConfigurationService>();
            if ((await configurationService.ListStaffAsync(ct)).Count > 0)
                throw new InvalidOperationException("La base ya tiene personal registrado. Reinicia la base local antes de sembrar datos de prueba.");

            await CreateTeamAsync(provider, owner.Id, password, first, ct);
            await CreateCatalogAsync(provider, first, ct);
            await CreateCustomersAsync(provider, ct);
        }

        await BookDayAsync(first, At(first.AddDays(-1), 19, 30), 100, ct);
        for (var day = first; day < today; day = day.AddDays(1))
        {
            await RunBackOfficeAsync(day, first, today, ct);
            await RunDayAsync(day, null, ct);
            if (day == today.AddDays(-4)) await ReverseOneOperationAsync(day, ct);
            await BookDayAsync(day.AddDays(1), At(day, 19, 30), 100, ct);
            LogDaySeeded(logger, day);
        }

        await RunBackOfficeAsync(today, first, today, ct);
        await RunDayAsync(today, cutoff, ct);

        var bookingTime = cutoff;
        await CreateUpcomingExceptionsAsync(today, bookingTime, ct);
        for (var offset = 1; offset <= 7; offset++)
            await BookDayAsync(today.AddDays(offset), bookingTime, offset <= 2 ? 80 : 45, ct);

        clock.Set(realNow);
        var summary = new DemoSeedSummary(first, today.AddDays(7), customers.Count, bookings.Count, paidOperations.Count, settlements);
        LogSeedCompleted(logger, summary.From, summary.To, summary.Customers, summary.Appointments, summary.PaidOperations, summary.Settlements);
        return summary;
    }

    private async Task CreateTeamAsync(IServiceProvider provider, Guid ownerId, string password, DateOnly first, CancellationToken ct)
    {
        var users = provider.GetRequiredService<InternalUserAdministration>();
        var configurationService = provider.GetRequiredService<ConfigurationService>();
        var scheduling = provider.GetRequiredService<SchedulingService>();
        var validFrom = first.AddDays(-3);

        async Task<Guid> CreateUserAsync(string userName, string role)
        {
            var created = await users.CreateAsync(userName, password, [role], ct);
            return created.User?.Id ?? throw new InvalidOperationException($"No se pudo crear el usuario {userName}: {string.Join(" ", created.Errors.Select(x => x.Description))}");
        }

        var receptionist = await CreateUserAsync("recepcion.lucia", RoleNames.Admin);
        var diegoUser = await CreateUserAsync("barbero.diego", RoleNames.Barber);
        var mateoUser = await CreateUserAsync("barbero.mateo", RoleNames.Barber);
        var lucasUser = await CreateUserAsync("barbero.lucas", RoleNames.Barber);

        Require(await configurationService.CreateStaffAsync(new StaffInput(receptionist, "Lucía Flores", "+59171230001"), ct), "recepción");
        var team = new (Guid UserId, string Name, string Phone, EmploymentType Type, SettlementFrequency Frequency, string Color, int Load)[]
        {
            (ownerId, "Lou", "+59171230000", EmploymentType.Owner, SettlementFrequency.Monthly, "#000000", 2),
            (diegoUser, "Diego Rojas", "+59171230002", EmploymentType.Contractor, SettlementFrequency.Biweekly, "#2E3338", 6),
            (mateoUser, "Mateo Vargas", "+59171230003", EmploymentType.Contractor, SettlementFrequency.Biweekly, "#5F676F", 5),
            (lucasUser, "Lucas Mendoza", "+59171230004", EmploymentType.Contractor, SettlementFrequency.Monthly, "#1E4FA8", 4),
        };
        foreach (var member in team)
        {
            var staff = Require(await configurationService.CreateStaffAsync(new StaffInput(member.UserId, member.Name, member.Phone), ct), member.Name);
            var barber = Require(await configurationService.CreateBarberAsync(new BarberInput(staff.Id, member.Type, member.Frequency, member.Color), ct), member.Name);
            barbers.Add(new DemoBarber(barber.Id, member.Name, member.Type == EmploymentType.Contractor, member.Load));
        }

        var schedules = new Dictionary<string, (int[] Days, TimeOnly Start, TimeOnly End)[]>(StringComparer.Ordinal)
        {
            ["Lou"] = [([1, 3, 5], new(10, 0), new(13, 0))],
            ["Diego Rojas"] = [([1, 2, 3, 4, 5, 6], new(8, 0), new(13, 0)), ([1, 2, 3, 4, 5, 6], new(15, 0), new(21, 0))],
            ["Mateo Vargas"] = [([2, 3, 4, 5, 6, 7], new(9, 0), new(13, 0)), ([2, 3, 4, 5, 6, 7], new(15, 0), new(20, 0))],
            ["Lucas Mendoza"] = [([1, 2, 3, 4, 5], new(15, 0), new(21, 0)), ([6], new(8, 0), new(13, 0))],
        };
        foreach (var barber in barbers)
        {
            foreach (var (days, start, end) in schedules[barber.Name])
            {
                foreach (var day in days)
                    Require(await scheduling.CreateScheduleAsync(barber.Id, new ScheduleInput(day, start, end, validFrom, null), ct), $"horario de {barber.Name}");
                barber.WorkingDays.UnionWith(days);
            }
        }

        foreach (var barber in barbers.Where(x => x.Contractor))
        {
            var serviceRate = barber.Name switch { "Diego Rojas" => 5000, "Mateo Vargas" => 4500, _ => 4000 };
            Require(await configurationService.CreateCommissionRuleAsync(barber.Id, new CommissionRuleInput(CommissionKind.Service, serviceRate, validFrom, null), ct), "comisión de servicio");
            Require(await configurationService.CreateCommissionRuleAsync(barber.Id, new CommissionRuleInput(CommissionKind.Product, 1000, validFrom, null), ct), "comisión de producto");
        }
    }

    private async Task CreateCatalogAsync(IServiceProvider provider, DateOnly first, CancellationToken ct)
    {
        var configurationService = provider.GetRequiredService<ConfigurationService>();
        var validFrom = first.AddDays(-3);
        var catalog = new (string Name, string Description, int Minutes, long Cents, int Weight)[]
        {
            ("Corte clásico", "Tijera y máquina con terminación limpia.", 45, 6000, 38),
            ("Corte y barba", "Corte completo y perfilado de barba.", 75, 9000, 24),
            ("Barba", "Perfilado y acabado con navaja.", 30, 3500, 14),
            ("Diseño", "Líneas y detalles con máquina.", 30, 3000, 8),
            ("Corte infantil", "Para niños de hasta 12 años.", 30, 4500, 8),
            ("Afeitado con navaja", "Toalla caliente, espuma y navaja.", 40, 5000, 6),
            ("Cejas", "Perfilado de cejas.", 15, 1500, 2),
        };
        foreach (var item in catalog)
        {
            var service = Require(await configurationService.CreateServiceAsync(new ConfigServiceInput(item.Name, item.Description, item.Minutes, item.Cents), ct), item.Name);
            services[item.Name] = new DemoService(service.Id, item.Name, item.Minutes, item.Cents, item.Weight);
        }

        string[] ownerServices = ["Corte clásico", "Barba", "Afeitado con navaja"];
        foreach (var barber in barbers)
        {
            foreach (var service in services.Values)
            {
                if (barber.Name == "Lou" && !ownerServices.Contains(service.Name)) continue;
                if (barber.Name == "Lucas Mendoza" && service.Name == "Corte infantil") continue;
                var price = barber.Name == "Lucas Mendoza" && service.Name == "Corte y barba" ? 10000 : service.PriceCents;
                Require(await configurationService.CreateOfferingAsync(barber.Id, new OfferingInput(service.Id, service.Minutes, price, validFrom, null), ct), $"oferta de {barber.Name}");
                barber.Services.Add(service);
            }
        }

        var catalogProducts = new (string Name, string? Brand, string Sku, long Price, long Cost, int Minimum, int Opening, bool Restock)[]
        {
            ("Cera mate", "Lou", "LOU-CER-01", 4500, 2200, 5, 18, true),
            ("Pomada brillo", "Lou", "LOU-POM-01", 5000, 2500, 5, 15, true),
            ("Aceite para barba", "Barbas", "BAR-ACE-01", 6000, 3000, 4, 12, true),
            ("Shampoo anticaída", "Capilar", "CAP-SHA-01", 7000, 3800, 3, 10, true),
            ("Peine de madera", null, "LOU-PEI-01", 2500, 900, 5, 20, true),
            ("Gel fijación fuerte", "Fix", "FIX-GEL-01", 3000, 1400, 6, 7, false),
            ("Bálsamo after shave", "Barbas", "BAR-BAL-01", 5500, 2700, 3, 3, false),
        };
        foreach (var item in catalogProducts)
        {
            var product = Require(await configurationService.CreateProductAsync(new ConfigProductInput(item.Name, item.Brand, item.Sku, null, item.Price, item.Minimum), ct), item.Name);
            products.Add(new DemoProduct(product.Id, item.Name, item.Cost, item.Minimum, item.Opening, item.Restock));
            stock[product.Id] = 0;
        }

        foreach (var category in await configurationService.ListExpenseCategoriesAsync(ct))
            categories[category.Name] = category.Id;
    }

    private async Task CreateCustomersAsync(IServiceProvider provider, CancellationToken ct)
    {
        var customerService = provider.GetRequiredService<CustomerService>();
        string[] firstNames = ["Carlos", "Jorge", "Luis", "Andrés", "Pablo", "Marco", "Iván", "Rubén", "Sergio", "Daniel", "Álvaro", "Fernando", "Ricardo", "Gonzalo", "Mauricio", "Javier", "Rodrigo", "Martín", "Esteban", "Alejandro"];
        string[] lastNames = ["Rojas", "Mendoza", "Paredes", "Vargas", "Suárez", "Torres", "Choque", "López", "Gutiérrez", "Flores", "Quispe", "Castro"];
        string[] notes = ["Prefiere máquina 2 a los costados.", "Llega en bicicleta, avisar si hay demora.", "Alérgico a la loción con alcohol.", "Cliente desde la apertura."];
        for (var index = 0; index < 60; index++)
        {
            var name = $"{firstNames[index % firstNames.Length]} {lastNames[(index * 7 + index / firstNames.Length) % lastNames.Length]}";
            var phone = $"+5917{1000000 + (index * 7919 % 8999999):D7}";
            var note = index % 9 == 0 ? notes[index / 9 % notes.Length] : null;
            var saved = RequireAgenda(await customerService.SaveAsync(null, new CustomerInput(name, phone, note), null, ct), name);
            customers.Add(saved.Customer.Id);
        }
    }

    private async Task BookDayAsync(DateOnly date, DateTimeOffset at, int intensityPercent, CancellationToken ct)
    {
        clock.Set(at);
        await using var scope = scopes.CreateAsyncScope();
        var scheduling = scope.ServiceProvider.GetRequiredService<SchedulingService>();
        var agenda = scope.ServiceProvider.GetRequiredService<AgendaService>();
        var weekday = (int)date.DayOfWeek == 0 ? 7 : (int)date.DayOfWeek;
        // A customer has at most one appointment per day, as in real life.
        var bookedToday = bookings.Where(x => LocalDate(x.StartsAt) == date).Select(x => x.CustomerId).ToHashSet();
        foreach (var barber in barbers.Where(x => x.WorkingDays.Contains(weekday)))
        {
            var target = Math.Max(1, (barber.Load + (weekday == 6 ? 2 : weekday == 5 ? 1 : 0)) * intensityPercent / 100);
            var created = 0;
            for (var attempt = 0; created < target && attempt < target * 3; attempt++)
            {
                var service = WeightedService(barber);
                var options = await scheduling.SearchAvailabilityAsync(service.Id, barber.Id, date, date, ct);
                if (options.Status != SchedulingStatus.Success || options.Value is null || options.Value.Count == 0) continue;
                var slot = options.Value.ElementAt(random.Next(options.Value.Count));
                var free = customers.Where(x => !bookedToday.Contains(x)).ToArray();
                if (free.Length == 0) break;
                var customerId = random.Pick(free);
                var result = await agenda.CreateAsync(new AppointmentInput(customerId, barber.Id, service.Id, slot.StartsAt), ct);
                if (result.Status != AgendaStatus.Success || result.Value is null) continue;
                bookedToday.Add(customerId);
                bookings.Add(new Booking(result.Value.Id, result.Value.Version, customerId, barber, service, result.Value.StartsAt, result.Value.EndsAt));
                created++;
            }
        }
    }

    private async Task RunDayAsync(DateOnly date, DateTimeOffset? cutoff, CancellationToken ct)
    {
        await using var scope = scopes.CreateAsyncScope();
        var agenda = scope.ServiceProvider.GetRequiredService<AgendaService>();
        var sales = scope.ServiceProvider.GetRequiredService<SalesService>();
        var day = bookings.Where(x => LocalDate(x.StartsAt) == date).OrderBy(x => x.StartsAt).ToArray();

        if (cutoff is null)
        {
            foreach (var booking in day)
            {
                var roll = random.Next(100);
                if (roll < 5) await CancelAsync(agenda, booking, At(date, 8, 15), "El cliente pidió cancelar por mensaje.", ct);
                else if (roll < 11) await NoShowAsync(agenda, booking, ct);
                else await CompleteAsync(agenda, sales, booking, date, ct);
            }
            await WalkInsAsync(sales, date, 1 + random.Next(2), null, ct);
            return;
        }

        var limit = cutoff.Value;
        var finished = day.Where(x => x.EndsAt <= limit).ToArray();
        for (var index = 0; index < finished.Length; index++)
        {
            if (index == 0 && finished.Length > 2) await NoShowAsync(agenda, finished[index], ct);
            else await CompleteAsync(agenda, sales, finished[index], date, ct);
        }
        foreach (var booking in day.Where(x => x.StartsAt <= limit && x.EndsAt > limit))
        {
            await TransitionAsync(agenda, booking, AppointmentStatus.CheckedIn, booking.StartsAt.AddMinutes(-6), null, ct);
            await TransitionAsync(agenda, booking, AppointmentStatus.InService, booking.StartsAt.AddMinutes(1), null, ct);
            clock.Set(booking.StartsAt.AddMinutes(2));
            RequireSales(await sales.OpenAppointmentAsync(booking.Id, ct), "abrir atención en curso");
        }
        var upcoming = day.Where(x => x.StartsAt > limit).ToArray();
        foreach (var booking in upcoming.Where(x => x.StartsAt <= limit.AddMinutes(40)))
            await TransitionAsync(agenda, booking, AppointmentStatus.CheckedIn, limit.AddMinutes(-3), null, ct);
        var cancellable = upcoming.Where(x => x.StartsAt > limit.AddMinutes(40)).ToArray();
        if (cancellable.Length > 2)
            await CancelAsync(agenda, cancellable[^1], limit, "El cliente avisó que no podrá venir.", ct);
        if (finished.Length > 0) await WalkInsAsync(sales, date, 1, limit, ct);
    }

    private async Task CompleteAsync(AgendaService agenda, SalesService sales, Booking booking, DateOnly date, CancellationToken ct)
    {
        await TransitionAsync(agenda, booking, AppointmentStatus.CheckedIn, booking.StartsAt.AddMinutes(-6), null, ct);
        await TransitionAsync(agenda, booking, AppointmentStatus.InService, booking.StartsAt.AddMinutes(1), null, ct);
        clock.Set(booking.StartsAt.AddMinutes(2));
        var operation = RequireSales(await sales.OpenAppointmentAsync(booking.Id, ct), "abrir atención");
        await FinishOperationAsync(sales, operation, booking.EndsAt, date, ct);
    }

    private async Task WalkInsAsync(SalesService sales, DateOnly date, int count, DateTimeOffset? latest, CancellationToken ct)
    {
        var weekday = (int)date.DayOfWeek == 0 ? 7 : (int)date.DayOfWeek;
        var working = barbers.Where(x => x.WorkingDays.Contains(weekday) && x.Name != "Lou").ToArray();
        if (working.Length == 0) return;
        (int Hour, int Minute)[] moments = [(11, 40), (17, 50), (12, 20), (18, 30)];
        for (var index = 0; index < count; index++)
        {
            var (hour, minute) = moments[(index + random.Next(2)) % moments.Length];
            var start = At(date, hour, minute);
            if (latest.HasValue && start.AddMinutes(45) > latest.Value) continue;
            var barber = random.Pick(working);
            var serviceName = random.Chance(70) ? "Corte clásico" : "Barba";
            var service = barber.Services.First(x => x.Name == serviceName);
            clock.Set(start);
            var operation = RequireSales(await sales.OpenWalkInAsync(random.Pick(customers), barber.Id, ct), "abrir llegada directa");
            operation = RequireSales(await sales.ReplaceServicesAsync(operation.Id, operation.Version, [new SaleServiceInput(service.Id)], ct), "servicio de llegada directa");
            await FinishOperationAsync(sales, operation, start.AddMinutes(service.Minutes), date, ct);
        }
    }

    private async Task FinishOperationAsync(SalesService sales, OperationView operation, DateTimeOffset endsAt, DateOnly date, CancellationToken ct)
    {
        if (random.Chance(22))
        {
            var available = products.Where(x => stock[x.Id] > 0).ToArray();
            if (available.Length > 0)
            {
                var product = random.Pick(available);
                operation = RequireSales(await sales.ReplaceProductsAsync(operation.Id, operation.Version, [new SaleProductInput(product.Id, 1)], ct), "venta de producto");
                stock[product.Id]--;
            }
        }

        var roll = random.Next(100);
        if (roll < 5)
            operation = RequireSales(await sales.AdjustAsync(operation.Id, new SaleAdjustmentInput(Math.Min(1000, operation.SubtotalCents), false, "Descuento por cliente frecuente.", operation.Version), ct), "descuento");
        else if (roll < 7)
            operation = RequireSales(await sales.AdjustAsync(operation.Id, new SaleAdjustmentInput(0, true, "Cortesía por la demora en la atención.", operation.Version), ct), "cortesía");

        clock.Set(endsAt.AddMinutes(-1));
        operation = RequireSales(await sales.ReadyAsync(operation.Id, operation.Version, ct), "lista para cobrar");
        clock.Set(endsAt);
        var paid = RequireSales(await sales.PayAsync(operation.Id, operation.Version, Payments(operation.TotalCents), $"demo-{operation.Id:N}", ct), "cobro");
        paidOperations.Add(new PaidOperation(paid.Id, paid.Version, date));
    }

    private IReadOnlyCollection<PaymentInput> Payments(long totalCents)
    {
        if (totalCents == 0) return [];
        var roll = random.Next(100);
        if (roll < 55) return [new PaymentInput(PaymentMethod.Cash, totalCents)];
        if (roll < 90 || totalCents < 2000) return [new PaymentInput(PaymentMethod.Qr, totalCents)];
        var cash = totalCents / 2 / 1000 * 1000;
        return cash <= 0 || cash >= totalCents
            ? [new PaymentInput(PaymentMethod.Cash, totalCents)]
            : [new PaymentInput(PaymentMethod.Cash, cash), new PaymentInput(PaymentMethod.Qr, totalCents - cash)];
    }

    private async Task RunBackOfficeAsync(DateOnly day, DateOnly first, DateOnly today, CancellationToken ct)
    {
        await using var scope = scopes.CreateAsyncScope();
        var inventory = scope.ServiceProvider.GetRequiredService<InventoryService>();
        var commissions = scope.ServiceProvider.GetRequiredService<CommissionService>();
        var offset = day.DayNumber - first.DayNumber;
        clock.Set(At(day, 7, 45));

        if (offset == 0)
        {
            await ReceiveAsync(inventory, day, products.Select(x => (x, x.Opening)).ToArray(), "Compra inicial de productos.", PaymentMethod.Qr, ct);
            await ExpenseAsync(inventory, day, "Alquiler", $"Alquiler del local, {day:MM/yyyy}.", 350000, PaymentMethod.Qr, ct);
        }
        else if (day.Day == 1)
        {
            await ExpenseAsync(inventory, day, "Alquiler", $"Alquiler del local, {day:MM/yyyy}.", 350000, PaymentMethod.Qr, ct);
        }

        if (offset > 0 && day.DayOfWeek == DayOfWeek.Monday)
        {
            var restock = products.Where(x => x.Restock && stock[x.Id] < x.Minimum * 2).Select(x => (x, x.Minimum * 3 - stock[x.Id])).ToArray();
            if (restock.Length > 0) await ReceiveAsync(inventory, day, restock, "Reposición semanal.", PaymentMethod.Cash, ct);
            await ExpenseAsync(inventory, day, "Insumos", "Navajas desechables y cuchillas.", 9000 + random.Next(6) * 1000, PaymentMethod.Cash, ct);
        }

        switch (offset)
        {
            case 3: await ExpenseAsync(inventory, day, "Servicios básicos", "Internet del mes.", 19900, PaymentMethod.Qr, ct); break;
            case 6: await ExpenseAsync(inventory, day, "Otros", "Café y agua para clientes.", 6000, PaymentMethod.Cash, ct); break;
            case 9: await ExpenseAsync(inventory, day, "Servicios básicos", "Factura de luz.", 28000, PaymentMethod.Qr, ct); break;
            case 10: await ExpenseAsync(inventory, day, "Servicios básicos", "Factura de agua.", 9000, PaymentMethod.Qr, ct); break;
            case 12:
                var pomade = products.First(x => x.Name == "Pomada brillo");
                RequireInventory(await inventory.AdjustAsync(pomade.Id, new StockAdjustmentInput(-1, InventoryMovementType.Loss, "Envase dañado al recibirlo."), ct), "pérdida de inventario");
                stock[pomade.Id]--;
                break;
            case 14:
                foreach (var barber in barbers.Where(x => x.Name is "Diego Rojas" or "Mateo Vargas"))
                {
                    clock.Set(At(day, 9, 0));
                    var settlement = RequireCommission(await commissions.CreateSettlementAsync(barber.Id, day.AddDays(-1), ct), "liquidación");
                    settlement = RequireCommission(await commissions.CloseAsync(settlement.Id, settlement.Version, ct), "cierre de liquidación");
                    clock.Set(At(day, 19, 0));
                    RequireCommission(await commissions.PayAsync(settlement.Id, settlement.Version, day, barber.Name == "Diego Rojas" ? PaymentMethod.Cash : PaymentMethod.Qr, ct), "pago de liquidación");
                    settlements++;
                }
                break;
            case 16: await ExpenseAsync(inventory, day, "Mantenimiento", "Afilado de tijeras.", 15000, PaymentMethod.Cash, ct); break;
            case 20:
                var duplicated = await ExpenseAsync(inventory, day, "Insumos", "Navajas desechables y cuchillas.", 12000, PaymentMethod.Cash, ct);
                clock.Set(At(day, 20, 30));
                RequireInventory(await inventory.VoidExpenseAsync(duplicated.Id, duplicated.Version, "Registro duplicado.", ct), "anular gasto");
                break;
        }

        if (day == today)
        {
            clock.Set(At(day, 8, 30));
            var diego = barbers.First(x => x.Name == "Diego Rojas");
            var current = RequireCommission(await commissions.CreateSettlementAsync(diego.Id, day.AddDays(-1), ct), "liquidación actual");
            RequireCommission(await commissions.CloseAsync(current.Id, current.Version, ct), "cierre de liquidación actual");
            var mateo = barbers.First(x => x.Name == "Mateo Vargas");
            var draft = RequireCommission(await commissions.CreateSettlementAsync(mateo.Id, day.AddDays(-1), ct), "liquidación en borrador");
            RequireCommission(await commissions.AddAdjustmentAsync(draft.Id, draft.Version, 5000, "Bono por buena atención en la quincena.", ct), "ajuste de liquidación");
            settlements += 2;
        }
    }

    private async Task ReverseOneOperationAsync(DateOnly day, CancellationToken ct)
    {
        var candidate = paidOperations.LastOrDefault(x => x.Date == day);
        if (candidate is null) return;
        await using var scope = scopes.CreateAsyncScope();
        var commissions = scope.ServiceProvider.GetRequiredService<CommissionService>();
        clock.Set(At(day, 20, 45));
        RequireCommission(await commissions.ReverseOperationAsync(candidate.Id, candidate.Version, "Cobro registrado al cliente equivocado.", ct), "reverso de cobro");
    }

    private async Task CreateUpcomingExceptionsAsync(DateOnly today, DateTimeOffset at, CancellationToken ct)
    {
        clock.Set(at);
        await using var scope = scopes.CreateAsyncScope();
        var scheduling = scope.ServiceProvider.GetRequiredService<SchedulingService>();
        var mateo = barbers.First(x => x.Name == "Mateo Vargas");
        var absence = NextWorkingDay(today.AddDays(2), mateo);
        Require(await scheduling.CreateExceptionAsync(mateo.Id, new AvailabilityExceptionInput(At(absence, 15, 0), At(absence, 20, 0), AvailabilityExceptionKind.Unavailable, "Trámite personal."), ct), "ausencia de Mateo");
        var lucas = barbers.First(x => x.Name == "Lucas Mendoza");
        var saturday = today.AddDays(1);
        while (saturday.DayOfWeek != DayOfWeek.Saturday) saturday = saturday.AddDays(1);
        Require(await scheduling.CreateExceptionAsync(lucas.Id, new AvailabilityExceptionInput(At(saturday, 15, 0), At(saturday, 18, 0), AvailabilityExceptionKind.AvailableOverride, "Apoyo por alta demanda."), ct), "apertura extra de Lucas");
    }

    private async Task ReceiveAsync(InventoryService inventory, DateOnly day, IReadOnlyCollection<(DemoProduct Product, int Quantity)> lines, string note, PaymentMethod method, CancellationToken ct)
    {
        var items = lines.Where(x => x.Quantity > 0).Select(x => new ReceiptItemInput(x.Product.Id, x.Quantity, x.Product.CostCents)).ToArray();
        if (items.Length == 0) return;
        RequireInventory(await inventory.ReceiveAsync(new ReceiptInput(day, method, null, note, items), ct), "recepción de productos");
        foreach (var (product, quantity) in lines) stock[product.Id] += Math.Max(0, quantity);
    }

    private async Task<ExpenseView> ExpenseAsync(InventoryService inventory, DateOnly day, string category, string description, long cents, PaymentMethod method, CancellationToken ct) =>
        RequireInventory(await inventory.CreateExpenseAsync(new ExpenseInput(categories[category], day, description, cents, method), ct), "gasto");

    private async Task CancelAsync(AgendaService agenda, Booking booking, DateTimeOffset at, string reason, CancellationToken ct) =>
        await TransitionAsync(agenda, booking, AppointmentStatus.Cancelled, at, reason, ct);

    private async Task NoShowAsync(AgendaService agenda, Booking booking, CancellationToken ct) =>
        await TransitionAsync(agenda, booking, AppointmentStatus.NoShow, booking.StartsAt.AddMinutes(20), "No se presentó ni avisó.", ct);

    private async Task TransitionAsync(AgendaService agenda, Booking booking, AppointmentStatus next, DateTimeOffset at, string? reason, CancellationToken ct)
    {
        clock.Set(at);
        var changed = RequireAgenda(await agenda.TransitionAsync(booking.Id, next, booking.Version, reason, ct), $"cita a {next}");
        booking.Version = changed.Version;
    }

    private DemoService WeightedService(DemoBarber barber)
    {
        var total = barber.Services.Sum(x => x.Weight);
        var roll = random.Next(total);
        foreach (var service in barber.Services)
        {
            if (roll < service.Weight) return service;
            roll -= service.Weight;
        }
        return barber.Services[0];
    }

    private static DateOnly NextWorkingDay(DateOnly from, DemoBarber barber)
    {
        var day = from;
        while (!barber.WorkingDays.Contains((int)day.DayOfWeek == 0 ? 7 : (int)day.DayOfWeek)) day = day.AddDays(1);
        return day;
    }

    // Today's activity stops at the real time during the working day. Late in the day
    // it stops at 16:20 so the agenda still shows every state (in service, waiting,
    // confirmed); before opening nothing runs yet.
    private static DateTimeOffset TodayCutoff(DateOnly today, DateTimeOffset realNow)
    {
        var local = TimeZoneInfo.ConvertTime(realNow, BusinessZone).TimeOfDay;
        if (local < new TimeSpan(9, 0, 0)) return At(today, 8, 59);
        return local > new TimeSpan(18, 30, 0) ? At(today, 16, 20) : realNow;
    }

    private static DateOnly LocalDate(DateTimeOffset instant) =>
        DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(instant, BusinessZone).DateTime);

    private static DateTimeOffset At(DateOnly date, int hour, int minute) =>
        new(TimeZoneInfo.ConvertTimeToUtc(date.ToDateTime(new TimeOnly(hour, minute)), BusinessZone), TimeSpan.Zero);

    private static T Require<T>(ConfigurationResult<T> result, string what) =>
        result.Status == ConfigurationStatus.Success && result.Value is not null ? result.Value : throw Failure(what, result.Code, result.Message);

    private static T Require<T>(SchedulingResult<T> result, string what) =>
        result.Status == SchedulingStatus.Success && result.Value is not null ? result.Value : throw Failure(what, result.Code, result.Message);

    private static T RequireAgenda<T>(AgendaResult<T> result, string what) =>
        result.Status == AgendaStatus.Success && result.Value is not null ? result.Value : throw Failure(what, result.Code, result.Message);

    private static T RequireSales<T>(SalesResult<T> result, string what) =>
        result.Status == SalesStatus.Success && result.Value is not null ? result.Value : throw Failure(what, result.Code, result.Message);

    private static T RequireInventory<T>(InventoryResult<T> result, string what) =>
        result.Status == InventoryStatus.Success && result.Value is not null ? result.Value : throw Failure(what, result.Code, result.Message);

    private static T RequireCommission<T>(CommissionResult<T> result, string what) =>
        result.Status == CommissionStatus.Success && result.Value is not null ? result.Value : throw Failure(what, result.Code, result.Message);

    private static InvalidOperationException Failure(string what, string? code, string? message) =>
        new($"El seed falló en {what}: {code} {message}".Trim());

    [LoggerMessage(EventId = 9002, Level = LogLevel.Information, Message = "Demo seed completed from {From} to {To}: {Customers} customers, {Appointments} appointments, {PaidOperations} paid operations, {Settlements} settlements.")]
    private static partial void LogSeedCompleted(ILogger logger, DateOnly from, DateOnly to, int customers, int appointments, int paidOperations, int settlements);

    [LoggerMessage(EventId = 9001, Level = LogLevel.Information, Message = "Demo data seeded for {Day}.")]
    private static partial void LogDaySeeded(ILogger logger, DateOnly day);

    private sealed record DemoService(Guid Id, string Name, int Minutes, long PriceCents, int Weight);

    private sealed record DemoProduct(Guid Id, string Name, long CostCents, int Minimum, int Opening, bool Restock);

    private sealed record PaidOperation(Guid Id, uint Version, DateOnly Date);

    private sealed class DemoBarber(Guid id, string name, bool contractor, int load)
    {
        public Guid Id { get; } = id;
        public string Name { get; } = name;
        public bool Contractor { get; } = contractor;
        public int Load { get; } = load;
        public HashSet<int> WorkingDays { get; } = [];
        public List<DemoService> Services { get; } = [];
    }

    private sealed class Booking(Guid id, uint version, Guid customerId, DemoBarber barber, DemoService service, DateTimeOffset startsAt, DateTimeOffset endsAt)
    {
        public Guid Id { get; } = id;
        public uint Version { get; set; } = version;
        public Guid CustomerId { get; } = customerId;
        public DemoBarber Barber { get; } = barber;
        public DemoService Service { get; } = service;
        public DateTimeOffset StartsAt { get; } = startsAt;
        public DateTimeOffset EndsAt { get; } = endsAt;
    }
}
