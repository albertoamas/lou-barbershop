using LouBarbershop.Domain.Appointments;
using LouBarbershop.Domain.Commissions;
using LouBarbershop.Domain.Sales;
using LouBarbershop.Domain.Settlements;

namespace LouBarbershop.Domain.Tests;

public sealed class StateTransitionsTests
{
    [Fact]
    public void Appointment_WhenCheckedInCanStartService()
    {
        var result = AppointmentTransitions.Move(AppointmentStatus.CheckedIn, AppointmentStatus.InService);

        Assert.True(result.IsSuccess);
        Assert.Equal(AppointmentStatus.InService, result.Value);
    }

    [Fact]
    public void Appointment_WhenCompletedCannotBeCancelled()
    {
        var result = AppointmentTransitions.Move(AppointmentStatus.Completed, AppointmentStatus.Cancelled);

        Assert.False(result.IsSuccess);
        Assert.Equal("state.invalid_transition", result.Error?.Code);
    }

    [Fact]
    public void SaleOperation_WhenReadyCanBePaid()
    {
        var result = SaleOperationTransitions.Move(SaleOperationStatus.ReadyToPay, SaleOperationStatus.Paid);

        Assert.True(result.IsSuccess);
        Assert.Equal(SaleOperationStatus.Paid, result.Value);
    }

    [Fact]
    public void Commission_WhenSettledCanBeMarkedPaid()
    {
        var result = CommissionEntryTransitions.Move(CommissionEntryStatus.Settled, CommissionEntryStatus.Paid);

        Assert.True(result.IsSuccess);
        Assert.Equal(CommissionEntryStatus.Paid, result.Value);
    }

    [Fact]
    public void Settlement_WhenPaidCannotBeCancelled()
    {
        var result = SettlementTransitions.Move(SettlementStatus.Paid, SettlementStatus.Cancelled);

        Assert.False(result.IsSuccess);
        Assert.Equal("state.invalid_transition", result.Error?.Code);
    }
}
