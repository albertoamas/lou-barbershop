using LouBarbershop.Domain.Common;

namespace LouBarbershop.Domain.Commissions;

public static class CommissionEntryTransitions
{
    public static DomainResult<CommissionEntryStatus> Move(CommissionEntryStatus current, CommissionEntryStatus next) =>
        IsAllowed(current, next)
            ? DomainResult.Success(next)
            : DomainResult.Failure<CommissionEntryStatus>(DomainErrors.InvalidStateTransition);

    private static bool IsAllowed(CommissionEntryStatus current, CommissionEntryStatus next) => (current, next) switch
    {
        (CommissionEntryStatus.Available, CommissionEntryStatus.Settled) => true,
        (CommissionEntryStatus.Available, CommissionEntryStatus.Voided) => true,
        (CommissionEntryStatus.Settled, CommissionEntryStatus.Paid) => true,
        _ => false,
    };
}
