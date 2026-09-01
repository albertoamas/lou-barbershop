using LouBarbershop.Domain.Common;

namespace LouBarbershop.Domain.Settlements;

public static class SettlementTransitions
{
    public static DomainResult<SettlementStatus> Move(SettlementStatus current, SettlementStatus next) =>
        IsAllowed(current, next)
            ? DomainResult.Success(next)
            : DomainResult.Failure<SettlementStatus>(DomainErrors.InvalidStateTransition);

    private static bool IsAllowed(SettlementStatus current, SettlementStatus next) => (current, next) switch
    {
        (SettlementStatus.Draft, SettlementStatus.Closed) => true,
        (SettlementStatus.Draft, SettlementStatus.Cancelled) => true,
        (SettlementStatus.Closed, SettlementStatus.Paid) => true,
        _ => false,
    };
}
