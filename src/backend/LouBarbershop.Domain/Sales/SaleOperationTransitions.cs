using LouBarbershop.Domain.Common;

namespace LouBarbershop.Domain.Sales;

public static class SaleOperationTransitions
{
    public static DomainResult<SaleOperationStatus> Move(SaleOperationStatus current, SaleOperationStatus next) =>
        IsAllowed(current, next)
            ? DomainResult.Success(next)
            : DomainResult.Failure<SaleOperationStatus>(DomainErrors.InvalidStateTransition);

    private static bool IsAllowed(SaleOperationStatus current, SaleOperationStatus next) => (current, next) switch
    {
        (SaleOperationStatus.Draft, SaleOperationStatus.ReadyToPay) => true,
        (SaleOperationStatus.Draft, SaleOperationStatus.Voided) => true,
        (SaleOperationStatus.ReadyToPay, SaleOperationStatus.Paid) => true,
        (SaleOperationStatus.ReadyToPay, SaleOperationStatus.Draft) => true,
        (SaleOperationStatus.Paid, SaleOperationStatus.Reversed) => true,
        _ => false,
    };
}
