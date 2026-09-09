using System.Globalization;
using System.Text;
using LouBarbershop.Application.Abstractions;
using LouBarbershop.Domain.Appointments;
using LouBarbershop.Domain.Commissions;
using LouBarbershop.Domain.Sales;

namespace LouBarbershop.Application.Reporting;

public sealed class ReportingService(IReportingStore store, ICurrentActor actor)
{
    private static readonly TimeZoneInfo BusinessTimeZone = TimeZoneInfo.FindSystemTimeZoneById("America/La_Paz");

    public async Task<ReportingResult<DailyDashboardView>> DailyAsync(DateOnly date, CancellationToken ct)
    {
        if (!IsOwner) return Forbidden<DailyDashboardView>();
        var period = Period(date, date);
        if (period is null) return Invalid<DailyDashboardView>();
        var appointments = await store.ReadAppointmentsAsync(period, ct);
        var data = await store.ReadPeriodAsync(period, ct);
        var operations = data.Operations.Select(x => new DailyOperationSource(x.Id, x.CustomerName, x.BarberName, SaleOperationStatus.Paid, x.TotalCents, x.OccurredAt)).ToArray();
        var statuses = Enum.GetValues<AppointmentStatus>().ToDictionary(x => x, x => appointments.Count(a => a.Status == x));
        return Success(new DailyDashboardView(date, appointments.Count, statuses, operations.Length, data.Operations.Sum(x => x.TotalCents), data.Payments.Where(x => x.Method == PaymentMethod.Cash).Sum(x => x.AmountCents), data.Payments.Where(x => x.Method == PaymentMethod.Qr).Sum(x => x.AmountCents), appointments, operations));
    }

    public async Task<ReportingResult<PeriodReportView>> PeriodAsync(DateOnly dateFrom, DateOnly dateTo, CancellationToken ct)
    {
        if (!IsOwner) return Forbidden<PeriodReportView>();
        var period = Period(dateFrom, dateTo);
        if (period is null) return Invalid<PeriodReportView>();
        var data = await store.ReadPeriodAsync(period, ct);
        var operations = data.Operations.Select(AllocateNetRevenue).ToArray();
        var serviceRevenue = operations.Sum(x => x.ServiceRevenueCents);
        var productRevenue = operations.Sum(x => x.ProductRevenueCents);
        var productCost = operations.Sum(x => x.ProductCostCents);
        var charges = operations.Sum(x => x.TotalCents);
        var generated = data.Commissions.Sum(x => x.AmountCents);
        var available = data.Commissions.Where(x => x.Status == CommissionEntryStatus.Available).Sum(x => x.AmountCents);
        var settled = data.Commissions.Where(x => x.Status == CommissionEntryStatus.Settled).Sum(x => x.AmountCents);
        var paid = data.Commissions.Where(x => x.Status == CommissionEntryStatus.Paid).Sum(x => x.AmountCents);
        var expenses = data.Expenses.Sum(x => x.AmountCents);
        var purchases = data.Receipts.Sum(x => x.AmountCents);
        var settlementPayments = data.Settlements.Sum(x => x.AmountCents);
        var collected = data.Payments.Sum(x => x.AmountCents);
        var operationSources = operations.Select(x => new OperationReportSource(x.Id, LocalDate(x.OccurredAt), x.BarberName, x.CustomerName, x.ServiceQuantity, x.ServiceRevenueCents, x.ProductQuantity, x.ProductRevenueCents, x.ProductCostCents, x.CashCents, x.QrCents, x.TotalCents)).ToArray();
        var commissionSources = data.Commissions.Select(x => new CommissionReportSource(x.Id, LocalDate(x.EarnedAt), x.BarberId, x.BarberName, x.Status, x.AmountCents)).ToArray();
        var expenseSources = data.Expenses.Select(x => new ExpenseReportSource(x.Id, x.Date, x.Category, x.Description, x.Method, x.AmountCents)).ToArray();
        var purchaseSources = data.Receipts.Select(x => new InventoryPurchaseReportSource(x.Id, x.Date, x.Method, x.AmountCents)).ToArray();
        var settlementSources = data.Settlements.Select(x => new SettlementReportSource(x.Id, x.Date, x.BarberName, x.Method, x.AmountCents)).ToArray();
        var cashFlowCash = Flow(PaymentMethod.Cash, data);
        var cashFlowQr = Flow(PaymentMethod.Qr, data);
        return Success(new PeriodReportView(dateFrom, dateTo, operations.Length, serviceRevenue, productRevenue, productCost, operations.Length == 0 ? 0 : charges / operations.Length, data.Payments.Where(x => x.Method == PaymentMethod.Cash).Sum(x => x.AmountCents), data.Payments.Where(x => x.Method == PaymentMethod.Qr).Sum(x => x.AmountCents), generated, available, settled, paid, settlementPayments, expenses, purchases, charges - productCost - generated - expenses, collected - purchases - expenses - settlementPayments, cashFlowCash, cashFlowQr, operationSources, commissionSources, expenseSources, purchaseSources, settlementSources));
    }

    public async Task<ReportingResult<IReadOnlyCollection<BarberPerformanceView>>> BarberPerformanceAsync(DateOnly dateFrom, DateOnly dateTo, CancellationToken ct)
    {
        if (!IsOwner) return Forbidden<IReadOnlyCollection<BarberPerformanceView>>();
        var period = Period(dateFrom, dateTo);
        if (period is null) return Invalid<IReadOnlyCollection<BarberPerformanceView>>();
        var data = await store.ReadPeriodAsync(period, ct);
        var barbers = await store.ReadBarbersAsync(ct);
        var scheduled = await store.ReadScheduledMinutesAsync(dateFrom, dateTo, ct);
        var rows = barbers.Select(barber =>
        {
            var operations = data.Operations.Where(x => x.BarberId == barber.Id).ToArray();
            var productive = operations.Sum(x => x.ProductiveMinutes);
            var capacity = scheduled.GetValueOrDefault(barber.Id);
            var occupancy = capacity == 0 ? 0 : (int)Math.Min(10_000, (long)productive * 10_000 / capacity);
            return new BarberPerformanceView(barber.Id, barber.Name, barber.IsOwner, operations.Sum(x => x.ServiceQuantity), operations.Sum(x => x.ProductQuantity), operations.Sum(x => x.TotalCents), productive, capacity, occupancy);
        }).ToArray();
        return Success<IReadOnlyCollection<BarberPerformanceView>>(rows);
    }

    public async Task<ReportingResult<AuditPageView>> AuditAsync(DateOnly dateFrom, DateOnly dateTo, string? entityType, Guid? actorId, int page, int pageSize, CancellationToken ct)
    {
        if (!IsOwner) return Forbidden<AuditPageView>();
        var period = Period(dateFrom, dateTo);
        if (period is null || page < 1 || pageSize is < 1 or > 100 || (entityType?.Length ?? 0) > 80) return Invalid<AuditPageView>();
        return Success(await store.ReadAuditAsync(period, string.IsNullOrWhiteSpace(entityType) ? null : entityType.Trim().ToLowerInvariant(), actorId, page, pageSize, ct));
    }

    public async Task<ReportingResult<byte[]>> ExportAsync(string report, DateOnly dateFrom, DateOnly dateTo, CancellationToken ct)
    {
        if (!IsOwner) return Forbidden<byte[]>();
        if (string.Equals(report, "period", StringComparison.OrdinalIgnoreCase))
        {
            var result = await PeriodAsync(dateFrom, dateTo, ct);
            if (result.Status != ReportingStatus.Success) return new(result.Status, Code: result.Code, Message: result.Message);
            var rows = result.Value!.Operations.Select(x => new[] { x.Id.ToString(), x.Date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture), x.BarberName, x.CustomerName, x.ServiceQuantity.ToString(CultureInfo.InvariantCulture), x.ServiceRevenueCents.ToString(CultureInfo.InvariantCulture), x.ProductQuantity.ToString(CultureInfo.InvariantCulture), x.ProductRevenueCents.ToString(CultureInfo.InvariantCulture), x.ProductCostCents.ToString(CultureInfo.InvariantCulture), x.TotalCents.ToString(CultureInfo.InvariantCulture) });
            return Success(Csv(["operation_id", "date", "barber", "customer", "service_quantity", "service_revenue_cents", "product_quantity", "product_revenue_cents", "product_cost_cents", "total_cents"], rows));
        }
        if (string.Equals(report, "barbers", StringComparison.OrdinalIgnoreCase))
        {
            var result = await BarberPerformanceAsync(dateFrom, dateTo, ct);
            if (result.Status != ReportingStatus.Success) return new(result.Status, Code: result.Code, Message: result.Message);
            var rows = result.Value!.Select(x => new[] { x.BarberId.ToString(), x.BarberName, x.IsOwner.ToString(), x.Services.ToString(CultureInfo.InvariantCulture), x.Products.ToString(CultureInfo.InvariantCulture), x.RevenueCents.ToString(CultureInfo.InvariantCulture), x.ProductiveMinutes.ToString(CultureInfo.InvariantCulture), x.ScheduledMinutes.ToString(CultureInfo.InvariantCulture), x.OccupancyBasisPoints.ToString(CultureInfo.InvariantCulture) });
            return Success(Csv(["barber_id", "barber", "is_owner", "services", "products", "revenue_cents", "productive_minutes", "scheduled_minutes", "occupancy_basis_points"], rows));
        }
        return Invalid<byte[]>("REPORT_NOT_SUPPORTED", "El reporte solicitado no está disponible.");
    }

    private bool IsOwner => actor.IsInRole("OWNER");
    private static ReportPeriod? Period(DateOnly from, DateOnly to)
    {
        if (from == default || to < from || to.DayNumber - from.DayNumber > 366) return null;
        var start = TimeZoneInfo.ConvertTimeToUtc(from.ToDateTime(TimeOnly.MinValue, DateTimeKind.Unspecified), BusinessTimeZone);
        var end = TimeZoneInfo.ConvertTimeToUtc(to.AddDays(1).ToDateTime(TimeOnly.MinValue, DateTimeKind.Unspecified), BusinessTimeZone);
        return new(from, to, new DateTimeOffset(start), new DateTimeOffset(end));
    }
    private static DateOnly LocalDate(DateTimeOffset value) => DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(value, BusinessTimeZone).DateTime);
    private static ReportingOperationRow AllocateNetRevenue(ReportingOperationRow row)
    {
        var gross = checked(row.ServiceRevenueCents + row.ProductRevenueCents);
        if (gross == 0) return row with { ServiceRevenueCents = 0, ProductRevenueCents = 0 };
        var service = checked((long)Math.Round((decimal)row.TotalCents * row.ServiceRevenueCents / gross, MidpointRounding.AwayFromZero));
        return row with { ServiceRevenueCents = service, ProductRevenueCents = row.TotalCents - service };
    }
    private static long Flow(PaymentMethod method, PeriodDataset data) =>
        data.Payments.Where(x => x.Method == method).Sum(x => x.AmountCents)
        - data.Receipts.Where(x => x.Method == method).Sum(x => x.AmountCents)
        - data.Expenses.Where(x => x.Method == method).Sum(x => x.AmountCents)
        - data.Settlements.Where(x => x.Method == method).Sum(x => x.AmountCents);
    private static byte[] Csv(IReadOnlyCollection<string> header, IEnumerable<string[]> rows)
    {
        var text = new StringBuilder().AppendLine(string.Join(',', header.Select(Cell)));
        foreach (var row in rows) text.AppendLine(string.Join(',', row.Select(Cell)));
        return [.. Encoding.UTF8.Preamble, .. Encoding.UTF8.GetBytes(text.ToString())];
    }
    private static string Cell(string value)
    {
        var safe = value.Length > 0 && "=+-@\t\r".Contains(value[0]) ? $"'{value}" : value;
        return $"\"{safe.Replace("\"", "\"\"", StringComparison.Ordinal)}\"";
    }
    private static ReportingResult<T> Success<T>(T value) => new(ReportingStatus.Success, value);
    private static ReportingResult<T> Forbidden<T>() => new(ReportingStatus.Forbidden, Code: "FORBIDDEN", Message: "No tienes permiso para consultar este reporte.");
    private static ReportingResult<T> Invalid<T>(string code = "INVALID_REPORT_RANGE", string message = "El rango debe ser válido y no superar 367 días.") => new(ReportingStatus.Invalid, Code: code, Message: message);
}
