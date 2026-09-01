using LouBarbershop.Domain.Common;

namespace LouBarbershop.Domain.Finance;

public readonly record struct CommissionRate
{
    public const int MaximumBasisPoints = 10_000;

    private CommissionRate(int basisPoints) => BasisPoints = basisPoints;

    public int BasisPoints { get; }

    public static DomainResult<CommissionRate> Create(int basisPoints) => basisPoints is < 0 or > MaximumBasisPoints
        ? DomainResult.Failure<CommissionRate>(DomainErrors.InvalidCommissionRate)
        : DomainResult.Success(new CommissionRate(basisPoints));
}
