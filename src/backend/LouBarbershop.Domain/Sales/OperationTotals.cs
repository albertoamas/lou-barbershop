using LouBarbershop.Domain.Common;
using LouBarbershop.Domain.Finance;

namespace LouBarbershop.Domain.Sales;

public readonly record struct OperationTotals(Money Subtotal, Money Discount, Money Courtesy, Money Total);

public static class OperationTotalCalculator
{
    public static DomainResult<OperationTotals> Calculate(Money subtotal, Money discount, Money courtesy)
    {
        var adjustments = discount.Add(courtesy);

        if (!adjustments.IsSuccess)
        {
            return DomainResult.Failure<OperationTotals>(adjustments.Error!);
        }

        var total = subtotal.Subtract(adjustments.Value);

        if (!total.IsSuccess)
        {
            return DomainResult.Failure<OperationTotals>(DomainErrors.InvalidOperationAdjustment);
        }

        return DomainResult.Success(new OperationTotals(subtotal, discount, courtesy, total.Value));
    }
}
