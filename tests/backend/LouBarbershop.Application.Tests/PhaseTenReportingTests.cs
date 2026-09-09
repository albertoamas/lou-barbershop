using System.Text;
using LouBarbershop.Application.Abstractions;
using LouBarbershop.Application.Reporting;
using LouBarbershop.Domain.Commissions;
using LouBarbershop.Domain.Sales;

namespace LouBarbershop.Application.Tests;

public sealed class PhaseTenReportingTests
{
    [Fact]
    public async Task PeriodKeepsOperatingResultAndCashFlowAsSeparateReproducibleMetrics()
    {
        var store = new FakeStore();
        var service = new ReportingService(store, new Actor(true));

        var result = await service.PeriodAsync(new DateOnly(2026, 9, 1), new DateOnly(2026, 9, 30), CancellationToken.None);

        Assert.Equal(ReportingStatus.Success, result.Status);
        Assert.Equal(7000, result.Value!.ApproximateOperatingResultCents);
        Assert.Equal(7000, result.Value.CashFlowCents);
        Assert.Equal(7000, result.Value.CashFlowCashCents);
        Assert.Equal(0, result.Value.CashFlowQrCents);
        Assert.Equal(5000, result.Value.CommissionGeneratedCents);
        Assert.Equal(4000, result.Value.CommissionPaymentsCents);
        Assert.Equal(2000, result.Value.ProductCostCents);
    }

    [Fact]
    public async Task CsvUsesUtf8BomAndNeutralizesSpreadsheetFormulaCells()
    {
        var service = new ReportingService(new FakeStore(), new Actor(true));

        var result = await service.ExportAsync("barbers", new DateOnly(2026, 9, 1), new DateOnly(2026, 9, 30), CancellationToken.None);

        Assert.Equal(ReportingStatus.Success, result.Status);
        Assert.Equal(Encoding.UTF8.Preamble, result.Value![..3]);
        Assert.Contains("\"'=Barber\"", Encoding.UTF8.GetString(result.Value));
    }

    [Fact]
    public async Task NonOwnerCannotReadEconomicReports()
    {
        var service = new ReportingService(new FakeStore(), new Actor(false));

        var result = await service.PeriodAsync(new DateOnly(2026, 9, 1), new DateOnly(2026, 9, 30), CancellationToken.None);

        Assert.Equal(ReportingStatus.Forbidden, result.Status);
    }

    private sealed class Actor(bool owner) : ICurrentActor
    {
        public Guid? UserId => Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
        public bool IsInRole(string role) => owner && role == "OWNER";
    }

    private sealed class FakeStore : IReportingStore
    {
        private static readonly Guid BarberId = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
        public Task<IReadOnlyCollection<DailyAppointmentSource>> ReadAppointmentsAsync(ReportPeriod period, CancellationToken ct) => Task.FromResult<IReadOnlyCollection<DailyAppointmentSource>>([]);
        public Task<PeriodDataset> ReadPeriodAsync(ReportPeriod period, CancellationToken ct) => Task.FromResult(new PeriodDataset(
            [new ReportingOperationRow(Guid.Parse("11111111-1111-1111-1111-111111111111"), BarberId, "=Barber", "Cliente", period.StartsAt, 1, 10_000, 1, 5_000, 2_000, 15_000, 0, 15_000, 45)],
            [new ReportingPaymentRow(PaymentMethod.Cash, 15_000)],
            [new ReportingCommissionRow(Guid.Parse("22222222-2222-2222-2222-222222222222"), BarberId, "=Barber", CommissionEntryStatus.Available, 5_000, period.StartsAt)],
            [new ReportingExpenseRow(Guid.NewGuid(), period.DateFrom, "Limpieza", "Insumos", PaymentMethod.Cash, 1_000)],
            [new ReportingReceiptRow(Guid.Parse("33333333-3333-3333-3333-333333333333"), period.DateFrom, PaymentMethod.Cash, 3_000)],
            [new ReportingSettlementRow(Guid.NewGuid(), period.DateFrom, "Barber", PaymentMethod.Cash, 4_000)]));
        public Task<IReadOnlyCollection<ReportingBarberRow>> ReadBarbersAsync(CancellationToken ct) => Task.FromResult<IReadOnlyCollection<ReportingBarberRow>>([new ReportingBarberRow(BarberId, "=Barber", true)]);
        public Task<IReadOnlyDictionary<Guid, int>> ReadScheduledMinutesAsync(DateOnly dateFrom, DateOnly dateTo, CancellationToken ct) => Task.FromResult<IReadOnlyDictionary<Guid, int>>(new Dictionary<Guid, int> { [BarberId] = 90 });
        public Task<AuditPageView> ReadAuditAsync(ReportPeriod period, string? entityType, Guid? actorId, int page, int pageSize, CancellationToken ct) => Task.FromResult(new AuditPageView(0, page, pageSize, []));
    }
}
