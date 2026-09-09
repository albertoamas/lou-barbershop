using LouBarbershop.Application.Reporting;
using LouBarbershop.Domain.Commissions;
using LouBarbershop.Domain.Expenses;
using LouBarbershop.Domain.Inventory;
using LouBarbershop.Domain.Sales;
using LouBarbershop.Domain.Scheduling;
using LouBarbershop.Domain.Staff;
using Microsoft.EntityFrameworkCore;

namespace LouBarbershop.Infrastructure.Persistence;

public sealed class EfReportingStore(AppDbContext db) : IReportingStore
{
    private static readonly TimeZoneInfo BusinessTimeZone = TimeZoneInfo.FindSystemTimeZoneById("America/La_Paz");

    public async Task<IReadOnlyCollection<DailyAppointmentSource>> ReadAppointmentsAsync(ReportPeriod period, CancellationToken ct) =>
        await (from appointment in db.Appointments.AsNoTracking()
               join customer in db.Customers.IgnoreQueryFilters().AsNoTracking() on appointment.CustomerId equals customer.Id
               join barber in db.BarberProfiles.AsNoTracking() on appointment.BarberId equals barber.Id
               join staff in db.StaffProfiles.IgnoreQueryFilters().AsNoTracking() on barber.StaffProfileId equals staff.Id
               join service in db.Services.IgnoreQueryFilters().AsNoTracking() on appointment.ServiceId equals service.Id
               where appointment.Range.StartsAt >= period.StartsAt && appointment.Range.StartsAt < period.EndsAt
               orderby appointment.Range.StartsAt
               select new DailyAppointmentSource(appointment.Id, customer.DisplayName, staff.DisplayName, service.Name, appointment.Status, appointment.Range.StartsAt)).ToArrayAsync(ct);

    public async Task<PeriodDataset> ReadPeriodAsync(ReportPeriod period, CancellationToken ct)
    {
        var operations = await db.SaleOperations.AsNoTracking().Include(x => x.Items).Include(x => x.Payments)
            .Where(x => x.Status == SaleOperationStatus.Paid && x.PaidAt >= period.StartsAt && x.PaidAt < period.EndsAt)
            .OrderBy(x => x.PaidAt).ToArrayAsync(ct);
        var barberIds = operations.Select(x => x.BarberId).ToHashSet();
        var customerIds = operations.Select(x => x.CustomerId).ToHashSet();
        var appointmentIds = operations.Where(x => x.AppointmentId.HasValue).Select(x => x.AppointmentId!.Value).ToHashSet();
        var names = await (from barber in db.BarberProfiles.AsNoTracking()
                           join staff in db.StaffProfiles.IgnoreQueryFilters().AsNoTracking() on barber.StaffProfileId equals staff.Id
                           where barberIds.Contains(barber.Id)
                           select new { barber.Id, staff.DisplayName }).ToDictionaryAsync(x => x.Id, x => x.DisplayName, ct);
        var customers = await db.Customers.IgnoreQueryFilters().AsNoTracking().Where(x => customerIds.Contains(x.Id)).ToDictionaryAsync(x => x.Id, x => x.DisplayName, ct);
        var durations = await db.Appointments.AsNoTracking().Where(x => appointmentIds.Contains(x.Id)).ToDictionaryAsync(x => x.Id, x => x.QuotedDurationMinutes, ct);
        var operationRows = operations.Select(operation => new ReportingOperationRow(
            operation.Id, operation.BarberId, names.GetValueOrDefault(operation.BarberId, "Barbero"), customers.GetValueOrDefault(operation.CustomerId, "Cliente"), operation.PaidAt!.Value,
            operation.Items.Where(x => x.Type == SaleItemType.Service).Sum(x => x.Quantity),
            operation.Items.Where(x => x.Type == SaleItemType.Service).Sum(x => checked(x.UnitPriceCents * x.Quantity)),
            operation.Items.Where(x => x.Type == SaleItemType.Product).Sum(x => x.Quantity),
            operation.Items.Where(x => x.Type == SaleItemType.Product).Sum(x => checked(x.UnitPriceCents * x.Quantity)),
            operation.Items.Where(x => x.Type == SaleItemType.Product).Sum(x => checked(x.UnitCostCents * x.Quantity)), operation.Payments.Where(x => x.Method == PaymentMethod.Cash).Sum(x => x.AmountCents), operation.Payments.Where(x => x.Method == PaymentMethod.Qr).Sum(x => x.AmountCents),
            operation.TotalCents, operation.AppointmentId.HasValue ? durations.GetValueOrDefault(operation.AppointmentId.Value) : 0)).ToArray();
        var operationIds = operations.Select(x => x.Id).ToHashSet();
        var payments = await db.Payments.AsNoTracking().Where(x => operationIds.Contains(x.OperationId)).Select(x => new ReportingPaymentRow(x.Method, x.AmountCents)).ToArrayAsync(ct);
        var commissions = await (from entry in db.CommissionEntries.AsNoTracking()
                                 join barber in db.BarberProfiles.AsNoTracking() on entry.BarberId equals barber.Id
                                 join staff in db.StaffProfiles.IgnoreQueryFilters().AsNoTracking() on barber.StaffProfileId equals staff.Id
                                 where entry.EarnedAt >= period.StartsAt && entry.EarnedAt < period.EndsAt && entry.Status != CommissionEntryStatus.Voided
                                 select new ReportingCommissionRow(entry.Id, entry.BarberId, staff.DisplayName, entry.Status, entry.AmountCents, entry.EarnedAt)).ToArrayAsync(ct);
        var expenses = await (from expense in db.Expenses.AsNoTracking()
                              join category in db.ExpenseCategories.IgnoreQueryFilters().AsNoTracking() on expense.CategoryId equals category.Id
                              where expense.ExpenseDate >= period.DateFrom && expense.ExpenseDate <= period.DateTo && expense.Status == ExpenseStatus.Recorded
                              orderby expense.ExpenseDate
                              select new ReportingExpenseRow(expense.Id, expense.ExpenseDate, category.Name, expense.Description, expense.PaymentMethod, expense.AmountCents)).ToArrayAsync(ct);
        var receipts = await db.InventoryReceipts.AsNoTracking().Where(x => x.ReceiptDate >= period.DateFrom && x.ReceiptDate <= period.DateTo && x.Status == InventoryReceiptStatus.Confirmed).Select(x => new ReportingReceiptRow(x.Id, x.ReceiptDate, x.PaymentMethod, x.TotalCents)).ToArrayAsync(ct);
        var settlements = await (from settlement in db.Settlements.AsNoTracking()
                                 join barber in db.BarberProfiles.AsNoTracking() on settlement.BarberId equals barber.Id
                                 join staff in db.StaffProfiles.IgnoreQueryFilters().AsNoTracking() on barber.StaffProfileId equals staff.Id
                                 where settlement.Status == LouBarbershop.Domain.Settlements.SettlementStatus.Paid && settlement.PaymentDate >= period.DateFrom && settlement.PaymentDate <= period.DateTo
                                 orderby settlement.PaymentDate
                                 select new ReportingSettlementRow(settlement.Id, settlement.PaymentDate!.Value, staff.DisplayName, settlement.PaymentMethod!.Value, settlement.PayableTotalCents)).ToArrayAsync(ct);
        return new(operationRows, payments, commissions, expenses, receipts, settlements);
    }

    public async Task<IReadOnlyCollection<ReportingBarberRow>> ReadBarbersAsync(CancellationToken ct) =>
        await (from barber in db.BarberProfiles.AsNoTracking()
               join staff in db.StaffProfiles.IgnoreQueryFilters().AsNoTracking() on barber.StaffProfileId equals staff.Id
               orderby staff.DisplayName
               select new ReportingBarberRow(barber.Id, staff.DisplayName, barber.EmploymentType == EmploymentType.Owner)).ToArrayAsync(ct);

    public async Task<IReadOnlyDictionary<Guid, int>> ReadScheduledMinutesAsync(DateOnly dateFrom, DateOnly dateTo, CancellationToken ct)
    {
        var schedules = await db.WorkingSchedules.AsNoTracking().Where(x => x.Active && x.Period.ValidFrom <= dateTo && (!x.Period.ValidTo.HasValue || x.Period.ValidTo >= dateFrom)).ToArrayAsync(ct);
        var start = ToUtc(dateFrom, TimeOnly.MinValue);
        var end = ToUtc(dateTo.AddDays(1), TimeOnly.MinValue);
        var exceptions = await db.AvailabilityExceptions.AsNoTracking().Where(x => x.Active && x.Range.EndsAt > start && x.Range.StartsAt < end).ToArrayAsync(ct);
        var result = new Dictionary<Guid, int>();
        foreach (var barberId in schedules.Select(x => x.BarberId).Concat(exceptions.Select(x => x.BarberId)).Distinct())
        {
            var minutes = 0;
            for (var date = dateFrom; date <= dateTo; date = date.AddDays(1))
            {
                var weekday = ((int)date.DayOfWeek + 6) % 7 + 1;
                var windows = schedules.Where(x => x.BarberId == barberId && x.Weekday == weekday && x.Period.Contains(date)).Select(x => (Start: ToUtc(date, x.StartLocalTime), End: ToUtc(date, x.EndLocalTime))).ToList();
                windows.AddRange(exceptions.Where(x => x.BarberId == barberId && x.Kind == AvailabilityExceptionKind.AvailableOverride).Select(x => (Start: Max(x.Range.StartsAt, ToUtc(date, TimeOnly.MinValue)), End: Min(x.Range.EndsAt, ToUtc(date.AddDays(1), TimeOnly.MinValue)))).Where(x => x.End > x.Start));
                var available = Merge(windows);
                var unavailable = Merge(exceptions.Where(x => x.BarberId == barberId && x.Kind == AvailabilityExceptionKind.Unavailable).Select(x => (Start: Max(x.Range.StartsAt, ToUtc(date, TimeOnly.MinValue)), End: Min(x.Range.EndsAt, ToUtc(date.AddDays(1), TimeOnly.MinValue)))).Where(x => x.End > x.Start));
                minutes += available.Sum(window => (int)(window.End - window.Start).TotalMinutes - unavailable.Sum(block => OverlapMinutes(window, block)));
            }
            result[barberId] = Math.Max(0, minutes);
        }
        return result;
    }

    public async Task<AuditPageView> ReadAuditAsync(ReportPeriod period, string? entityType, Guid? actorId, int page, int pageSize, CancellationToken ct)
    {
        var query = db.AuditLogs.AsNoTracking().Where(x => x.CreatedAt >= period.StartsAt && x.CreatedAt < period.EndsAt);
        if (entityType is not null) query = query.Where(x => x.EntityType == entityType);
        if (actorId.HasValue) query = query.Where(x => x.ActorUserId == actorId);
        var total = await query.CountAsync(ct);
        var rows = await (from log in query
                          join user in db.Users.AsNoTracking() on log.ActorUserId equals user.Id into users
                          from user in users.DefaultIfEmpty()
                          orderby log.CreatedAt descending
                          select new AuditLogView(log.Id, log.ActorUserId, user == null ? null : user.UserName, log.Action, log.EntityType, log.EntityId, log.BeforeData, log.AfterData, log.RequestId, log.CreatedAt)).Skip((page - 1) * pageSize).Take(pageSize).ToArrayAsync(ct);
        return new(total, page, pageSize, rows);
    }

    private static DateTimeOffset ToUtc(DateOnly date, TimeOnly time) => new(TimeZoneInfo.ConvertTimeToUtc(date.ToDateTime(time, DateTimeKind.Unspecified), BusinessTimeZone));
    private static DateTimeOffset Min(DateTimeOffset a, DateTimeOffset b) => a < b ? a : b;
    private static DateTimeOffset Max(DateTimeOffset a, DateTimeOffset b) => a > b ? a : b;
    private static int OverlapMinutes((DateTimeOffset Start, DateTimeOffset End) a, (DateTimeOffset Start, DateTimeOffset End) b) => (int)Math.Max(0, (Min(a.End, b.End) - Max(a.Start, b.Start)).TotalMinutes);
    private static List<(DateTimeOffset Start, DateTimeOffset End)> Merge(IEnumerable<(DateTimeOffset Start, DateTimeOffset End)> values)
    {
        var ordered = values.OrderBy(x => x.Start).ToArray();
        if (ordered.Length == 0) return [];
        var result = new List<(DateTimeOffset Start, DateTimeOffset End)> { ordered[0] };
        foreach (var value in ordered.Skip(1)) { var last = result[^1]; if (value.Start <= last.End) result[^1] = (last.Start, Max(last.End, value.End)); else result.Add(value); }
        return result;
    }
}
