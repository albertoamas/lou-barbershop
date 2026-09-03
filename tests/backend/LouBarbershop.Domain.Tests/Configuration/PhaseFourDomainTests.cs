using LouBarbershop.Domain.Catalog;
using LouBarbershop.Domain.Common;
using LouBarbershop.Domain.Finance;
using LouBarbershop.Domain.Staff;

namespace LouBarbershop.Domain.Tests.Configuration;

public sealed class PhaseFourDomainTests
{
    [Fact]
    public void EffectivePeriodUsesInclusiveBoundariesAndRejectsInverseRange()
    {
        var period = EffectivePeriod.Create(new DateOnly(2026, 9, 1), new DateOnly(2026, 9, 15));
        var adjacent = EffectivePeriod.Create(new DateOnly(2026, 9, 16), null);

        Assert.True(period.IsSuccess);
        Assert.True(period.Value.Contains(new DateOnly(2026, 9, 15)));
        Assert.False(period.Value.Overlaps(adjacent.Value));
        Assert.False(EffectivePeriod.Create(new DateOnly(2026, 9, 2), new DateOnly(2026, 9, 1)).IsSuccess);
    }

    [Fact]
    public void ServiceAndOfferingKeepIndependentPrices()
    {
        var basePrice = Money.Create(6_000).Value;
        var overridePrice = Money.Create(5_000).Value;
        var service = Service.Create(Guid.NewGuid(), "Corte", null, 45, basePrice, DateTimeOffset.UtcNow).Value;
        var offering = BarberServiceOffering.Create(Guid.NewGuid(), Guid.NewGuid(), service.Id, 60, overridePrice, EffectivePeriod.Create(new DateOnly(2026, 1, 1), null).Value, DateTimeOffset.UtcNow).Value;

        Assert.Equal(6_000, service.DefaultPrice.Cents);
        Assert.Equal(5_000, offering.Price.Cents);
        Assert.Equal(60, offering.DurationMinutes);
    }

    [Theory]
    [InlineData(4)]
    [InlineData(481)]
    public void ServiceRejectsUnsafeDurations(int minutes)
    {
        var result = Service.Create(Guid.NewGuid(), "Corte", null, minutes, Money.Zero, DateTimeOffset.UtcNow);
        Assert.False(result.IsSuccess);
        Assert.Equal("catalog.invalid_duration", result.Error!.Code);
    }

    [Fact]
    public void BarberProfileNormalizesCalendarColor()
    {
        var result = BarberProfile.Create(Guid.NewGuid(), Guid.NewGuid(), EmploymentType.Contractor, SettlementFrequency.Biweekly, "#a55f32", DateTimeOffset.UtcNow);
        Assert.True(result.IsSuccess);
        Assert.Equal("#A55F32", result.Value.Color);
    }
}
