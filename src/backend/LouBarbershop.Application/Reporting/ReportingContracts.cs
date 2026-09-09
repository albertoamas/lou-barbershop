using LouBarbershop.Domain.Appointments;
using LouBarbershop.Domain.Commissions;
using LouBarbershop.Domain.Sales;

namespace LouBarbershop.Application.Reporting;

public enum ReportingStatus { Success, Invalid, Forbidden }
public sealed record ReportingResult<T>(ReportingStatus Status, T? Value = default, string? Code = null, string? Message = null);
public sealed record ReportPeriod(DateOnly DateFrom, DateOnly DateTo, DateTimeOffset StartsAt, DateTimeOffset EndsAt);
public sealed record DailyAppointmentSource(Guid Id, string CustomerName, string BarberName, string ServiceName, AppointmentStatus Status, DateTimeOffset StartsAt);
public sealed record DailyOperationSource(Guid Id, string CustomerName, string BarberName, SaleOperationStatus Status, long TotalCents, DateTimeOffset OpenedAt);
public sealed record DailyDashboardView(DateOnly Date, int AppointmentCount, IReadOnlyDictionary<AppointmentStatus, int> AppointmentsByStatus, int PaidOperationCount, long ChargesCents, long CashCollectedCents, long QrCollectedCents, IReadOnlyCollection<DailyAppointmentSource> Appointments, IReadOnlyCollection<DailyOperationSource> Operations);
public sealed record OperationReportSource(Guid Id, DateOnly Date, string BarberName, string CustomerName, int ServiceQuantity, long ServiceRevenueCents, int ProductQuantity, long ProductRevenueCents, long ProductCostCents, long CashCents, long QrCents, long TotalCents);
public sealed record CommissionReportSource(Guid Id, DateOnly Date, Guid BarberId, string BarberName, CommissionEntryStatus Status, long AmountCents);
public sealed record InventoryPurchaseReportSource(Guid Id, DateOnly Date, PaymentMethod Method, long AmountCents);
public sealed record ExpenseReportSource(Guid Id, DateOnly Date, string Category, string Description, PaymentMethod Method, long AmountCents);
public sealed record SettlementReportSource(Guid Id, DateOnly Date, string BarberName, PaymentMethod Method, long AmountCents);
public sealed record PeriodReportView(
    DateOnly DateFrom, DateOnly DateTo, int PaidOperationCount, long ServiceRevenueCents, long ProductRevenueCents,
    long ProductCostCents, long AverageTicketCents, long CashCollectedCents, long QrCollectedCents,
    long CommissionGeneratedCents, long CommissionAvailableCents, long CommissionSettledCents, long CommissionPaidCents,
    long CommissionPaymentsCents, long ExpenseCents, long InventoryPurchaseCents, long ApproximateOperatingResultCents,
    long CashFlowCents, long CashFlowCashCents, long CashFlowQrCents, IReadOnlyCollection<OperationReportSource> Operations,
    IReadOnlyCollection<CommissionReportSource> Commissions, IReadOnlyCollection<ExpenseReportSource> Expenses,
    IReadOnlyCollection<InventoryPurchaseReportSource> InventoryPurchases, IReadOnlyCollection<SettlementReportSource> SettlementPayments);
public sealed record BarberPerformanceView(Guid BarberId, string BarberName, bool IsOwner, int Services, int Products, long RevenueCents, int ProductiveMinutes, int ScheduledMinutes, int OccupancyBasisPoints);
public sealed record AuditLogView(Guid Id, Guid? ActorUserId, string? ActorName, string Action, string EntityType, Guid EntityId, string? BeforeData, string? AfterData, string? RequestId, DateTimeOffset CreatedAt);
public sealed record AuditPageView(int Total, int Page, int PageSize, IReadOnlyCollection<AuditLogView> Items);

public sealed record ReportingOperationRow(Guid Id, Guid BarberId, string BarberName, string CustomerName, DateTimeOffset OccurredAt, int ServiceQuantity, long ServiceRevenueCents, int ProductQuantity, long ProductRevenueCents, long ProductCostCents, long CashCents, long QrCents, long TotalCents, int ProductiveMinutes);
public sealed record ReportingPaymentRow(PaymentMethod Method, long AmountCents);
public sealed record ReportingCommissionRow(Guid Id, Guid BarberId, string BarberName, CommissionEntryStatus Status, long AmountCents, DateTimeOffset EarnedAt);
public sealed record ReportingExpenseRow(Guid Id, DateOnly Date, string Category, string Description, PaymentMethod Method, long AmountCents);
public sealed record ReportingReceiptRow(Guid Id, DateOnly Date, PaymentMethod Method, long AmountCents);
public sealed record ReportingSettlementRow(Guid Id, DateOnly Date, string BarberName, PaymentMethod Method, long AmountCents);
public sealed record ReportingBarberRow(Guid Id, string Name, bool IsOwner);
public sealed record PeriodDataset(IReadOnlyCollection<ReportingOperationRow> Operations, IReadOnlyCollection<ReportingPaymentRow> Payments, IReadOnlyCollection<ReportingCommissionRow> Commissions, IReadOnlyCollection<ReportingExpenseRow> Expenses, IReadOnlyCollection<ReportingReceiptRow> Receipts, IReadOnlyCollection<ReportingSettlementRow> Settlements);

public interface IReportingStore
{
    Task<IReadOnlyCollection<DailyAppointmentSource>> ReadAppointmentsAsync(ReportPeriod period, CancellationToken ct);
    Task<PeriodDataset> ReadPeriodAsync(ReportPeriod period, CancellationToken ct);
    Task<IReadOnlyCollection<ReportingBarberRow>> ReadBarbersAsync(CancellationToken ct);
    Task<IReadOnlyDictionary<Guid, int>> ReadScheduledMinutesAsync(DateOnly dateFrom, DateOnly dateTo, CancellationToken ct);
    Task<AuditPageView> ReadAuditAsync(ReportPeriod period, string? entityType, Guid? actorId, int page, int pageSize, CancellationToken ct);
}
