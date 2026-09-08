using LouBarbershop.Domain.Common;

namespace LouBarbershop.Domain.Sales;

public enum SaleOrigin { Appointment, WalkIn }
public enum PaymentMethod { Cash, Qr }

public sealed class SaleOperation
{
    private readonly List<SaleItem> _items = [];
    private readonly List<Payment> _payments = [];
    private SaleOperation() { }
    private SaleOperation(Guid id, Guid? appointmentId, Guid customerId, Guid barberId, SaleOrigin origin, Guid actorId, DateTimeOffset at)
    { Id = id; AppointmentId = appointmentId; CustomerId = customerId; BarberId = barberId; Origin = origin; CreatedBy = actorId; OpenedAt = at; UpdatedAt = at; }

    public Guid Id { get; private set; }
    public Guid? AppointmentId { get; private set; }
    public Guid CustomerId { get; private set; }
    public Guid BarberId { get; private set; }
    public SaleOrigin Origin { get; private set; }
    public SaleOperationStatus Status { get; private set; } = SaleOperationStatus.Draft;
    public long SubtotalCents { get; private set; }
    public long DiscountCents { get; private set; }
    public long CourtesyCents { get; private set; }
    public long TotalCents { get; private set; }
    public string? AdjustmentReason { get; private set; }
    public Guid CreatedBy { get; private set; }
    public DateTimeOffset OpenedAt { get; private set; }
    public DateTimeOffset? PaidAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }
    public uint Version { get; private set; }
    public IReadOnlyCollection<SaleItem> Items => _items;
    public IReadOnlyCollection<Payment> Payments => _payments;

    public static DomainResult<SaleOperation> Create(Guid id, Guid? appointmentId, Guid customerId, Guid barberId, SaleOrigin origin, Guid actorId, DateTimeOffset at) =>
        id == Guid.Empty || customerId == Guid.Empty || barberId == Guid.Empty || actorId == Guid.Empty
            ? DomainResult.Failure<SaleOperation>(DomainErrors.InvalidSaleOperation)
            : DomainResult.Success(new SaleOperation(id, appointmentId, customerId, barberId, origin, actorId, at.ToUniversalTime()));

    public DomainResult<SaleOperation> ReplaceServices(IEnumerable<SaleItem> items, DateTimeOffset at)
    {
        if (Status != SaleOperationStatus.Draft) return DomainResult.Failure<SaleOperation>(DomainErrors.InvalidStateTransition);
        var rows = items.ToArray();
        if (rows.Length == 0 || rows.Any(x => x.Id == Guid.Empty || x.OperationId != Id || x.ServiceId == Guid.Empty || x.BarberId != BarberId || string.IsNullOrWhiteSpace(x.DescriptionSnapshot) || x.UnitPriceCents < 0)) return DomainResult.Failure<SaleOperation>(DomainErrors.InvalidSaleOperation);
        _items.Clear(); _items.AddRange(rows); DiscountCents = 0; CourtesyCents = 0; AdjustmentReason = null; Recalculate(); UpdatedAt = at.ToUniversalTime(); return DomainResult.Success(this);
    }

    public DomainResult<SaleOperation> Adjust(long discountCents, bool courtesy, string? reason, DateTimeOffset at)
    {
        if (Status != SaleOperationStatus.Draft || discountCents < 0 || string.IsNullOrWhiteSpace(reason) || reason.Trim().Length > 300)
            return DomainResult.Failure<SaleOperation>(DomainErrors.InvalidOperationAdjustment);
        var courtesyCents = courtesy ? SubtotalCents - discountCents : 0;
        if (discountCents > SubtotalCents || courtesyCents < 0) return DomainResult.Failure<SaleOperation>(DomainErrors.InvalidOperationAdjustment);
        DiscountCents = discountCents; CourtesyCents = courtesyCents; AdjustmentReason = reason.Trim(); Recalculate(); UpdatedAt = at.ToUniversalTime(); return DomainResult.Success(this);
    }

    public DomainResult<SaleOperation> Ready(DateTimeOffset at)
    {
        if (Status != SaleOperationStatus.Draft || _items.Count == 0) return DomainResult.Failure<SaleOperation>(DomainErrors.InvalidStateTransition);
        Status = SaleOperationStatus.ReadyToPay; UpdatedAt = at.ToUniversalTime(); return DomainResult.Success(this);
    }

    public DomainResult<SaleOperation> Pay(IEnumerable<Payment> payments, DateTimeOffset at)
    {
        if (Status != SaleOperationStatus.ReadyToPay) return DomainResult.Failure<SaleOperation>(DomainErrors.InvalidStateTransition);
        var rows = payments.ToArray();
        if (!TrySum(rows, out var paidCents) || rows.GroupBy(x => x.Method).Any(x => x.Count() > 1) || rows.Any(x => x.Id == Guid.Empty || x.OperationId != Id || x.RecordedBy == Guid.Empty || x.AmountCents <= 0) || paidCents != TotalCents || (TotalCents == 0 && rows.Length != 0))
            return DomainResult.Failure<SaleOperation>(DomainErrors.PaymentMismatch);
        _payments.AddRange(rows); Status = SaleOperationStatus.Paid; PaidAt = at.ToUniversalTime(); UpdatedAt = PaidAt.Value; return DomainResult.Success(this);
    }

    private void Recalculate()
    { SubtotalCents = _items.Sum(x => x.UnitPriceCents); TotalCents = SubtotalCents - DiscountCents - CourtesyCents; }

    private static bool TrySum(IEnumerable<Payment> payments, out long total)
    {
        total = 0;
        try
        {
            foreach (var payment in payments) total = checked(total + payment.AmountCents);
            return true;
        }
        catch (OverflowException)
        {
            total = 0;
            return false;
        }
    }
}

public sealed class SaleItem
{
    private SaleItem() { DescriptionSnapshot = string.Empty; }
    public SaleItem(Guid id, Guid operationId, Guid serviceId, string description, long unitPriceCents, Guid barberId)
    { Id = id; OperationId = operationId; ServiceId = serviceId; DescriptionSnapshot = description; UnitPriceCents = unitPriceCents; BarberId = barberId; }
    public Guid Id { get; private set; }
    public Guid OperationId { get; private set; }
    public Guid ServiceId { get; private set; }
    public string DescriptionSnapshot { get; private set; }
    public long UnitPriceCents { get; private set; }
    public Guid BarberId { get; private set; }
}

public sealed class Payment
{
    private Payment() { }
    public Payment(Guid id, Guid operationId, PaymentMethod method, long amountCents, Guid recordedBy, DateTimeOffset paidAt)
    { Id = id; OperationId = operationId; Method = method; AmountCents = amountCents; RecordedBy = recordedBy; PaidAt = paidAt; }
    public Guid Id { get; private set; }
    public Guid OperationId { get; private set; }
    public PaymentMethod Method { get; private set; }
    public long AmountCents { get; private set; }
    public Guid RecordedBy { get; private set; }
    public DateTimeOffset PaidAt { get; private set; }
}
