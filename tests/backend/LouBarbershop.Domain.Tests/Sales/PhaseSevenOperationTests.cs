using LouBarbershop.Domain.Sales;

namespace LouBarbershop.Domain.Tests.Sales;

public sealed class PhaseSevenOperationTests
{
    private static readonly DateTimeOffset Now = new(2026, 9, 7, 16, 0, 0, TimeSpan.Zero);
    [Fact]
    public void RealServicesDetermineTotalInsteadOfReservation()
    { var value = Draft(7000); Assert.Equal(7000, value.TotalCents); Assert.Equal("Servicio real", value.Items.Single().DescriptionSnapshot); }

    [Fact]
    public void CourtesyKeepsReferenceAndPaysZero()
    { var value = Draft(7000); Assert.True(value.Adjust(0, true, "Cortesía autorizada", Now).IsSuccess); Assert.True(value.Ready(Now).IsSuccess); Assert.True(value.Pay([], Now).IsSuccess); Assert.Equal(7000, value.CourtesyCents); Assert.Equal(0, value.TotalCents); Assert.Equal(SaleOperationStatus.Paid, value.Status); }

    [Fact]
    public void MixedPaymentClosesExactTotal()
    { var value = Draft(7000); value.Ready(Now); Assert.True(value.Pay([Payment(value.Id, PaymentMethod.Cash, 3000), Payment(value.Id, PaymentMethod.Qr, 4000)], Now).IsSuccess); Assert.Equal(2, value.Payments.Count); }

    [Theory, InlineData(6999), InlineData(7001)]
    public void PaymentMismatchLeavesOperationUnpaid(long amount)
    { var value = Draft(7000); value.Ready(Now); var result = value.Pay([Payment(value.Id, PaymentMethod.Cash, amount)], Now); Assert.False(result.IsSuccess); Assert.Equal(SaleOperationStatus.ReadyToPay, value.Status); Assert.Empty(value.Payments); }

    [Fact]
    public void PaidOperationCannotBeEditedOrPaidAgain()
    { var value = Draft(7000); value.Ready(Now); value.Pay([Payment(value.Id, PaymentMethod.Cash, 7000)], Now); Assert.False(value.ReplaceServices([Item(value.Id, 4000)], Now).IsSuccess); Assert.False(value.Pay([Payment(value.Id, PaymentMethod.Cash, 7000)], Now).IsSuccess); }

    [Fact]
    public void DuplicatePaymentMethodIsRejected()
    { var value = Draft(7000); value.Ready(Now); Assert.False(value.Pay([Payment(value.Id, PaymentMethod.Cash, 3000), Payment(value.Id, PaymentMethod.Cash, 4000)], Now).IsSuccess); Assert.Empty(value.Payments); }

    [Fact]
    public void DiscountCannotExceedSubtotal()
    { var value = Draft(7000); Assert.False(value.Adjust(7001, false, "Inválido", Now).IsSuccess); Assert.Equal(7000, value.TotalCents); }

    [Fact]
    public void OverflowedPaymentTotalIsRejectedWithoutChangingState()
    { var value = Draft(7000); value.Ready(Now); Assert.False(value.Pay([Payment(value.Id, PaymentMethod.Cash, long.MaxValue), Payment(value.Id, PaymentMethod.Qr, long.MaxValue)], Now).IsSuccess); Assert.Equal(SaleOperationStatus.ReadyToPay, value.Status); }

    private static SaleOperation Draft(long cents) { var operation = SaleOperation.Create(Guid.NewGuid(), null, Guid.NewGuid(), Guid.NewGuid(), SaleOrigin.WalkIn, Guid.NewGuid(), Now).Value; operation.ReplaceServices([Item(operation.Id, cents, operation.BarberId)], Now); return operation; }
    private static SaleItem Item(Guid operationId, long cents, Guid? barberId = null) => new(Guid.NewGuid(), operationId, Guid.NewGuid(), "Servicio real", cents, barberId ?? Guid.NewGuid());
    private static Payment Payment(Guid operationId, PaymentMethod method, long cents) => new(Guid.NewGuid(), operationId, method, cents, Guid.NewGuid(), Now);
}
