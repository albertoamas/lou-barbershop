using LouBarbershop.Domain.Common;

namespace LouBarbershop.Domain.Sales;

public enum SaleOrigin { Appointment, WalkIn }
public enum PaymentMethod { Cash, Qr }
public enum SaleItemType { Service, Product }

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
    public DateTimeOffset? ReversedAt { get; private set; }
    public Guid? ReversedBy { get; private set; }
    public string? ReversalReason { get; private set; }
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
        if (rows.Length == 0 || rows.Any(x => !x.IsValidFor(Id, BarberId) || x.Type != SaleItemType.Service)) return DomainResult.Failure<SaleOperation>(DomainErrors.InvalidSaleOperation);
        if (!TrySubtotal(_items.Where(x => x.Type == SaleItemType.Product).Concat(rows), out var subtotal)) return DomainResult.Failure<SaleOperation>(DomainErrors.MoneyOverflow);
        _items.RemoveAll(x => x.Type == SaleItemType.Service); _items.AddRange(rows); ResetAdjustment(); Recalculate(subtotal); UpdatedAt = at.ToUniversalTime(); return DomainResult.Success(this);
    }

    public DomainResult<SaleOperation> ReplaceProducts(IEnumerable<SaleItem> items, DateTimeOffset at)
    {
        if (Status != SaleOperationStatus.Draft) return DomainResult.Failure<SaleOperation>(DomainErrors.InvalidStateTransition);
        var rows = items.ToArray();
        if (rows.Any(x => !x.IsValidFor(Id, BarberId) || x.Type != SaleItemType.Product) || rows.GroupBy(x => x.ProductId).Any(x => x.Count() > 1)) return DomainResult.Failure<SaleOperation>(DomainErrors.InvalidSaleOperation);
        if (!TrySubtotal(_items.Where(x => x.Type == SaleItemType.Service).Concat(rows), out var subtotal)) return DomainResult.Failure<SaleOperation>(DomainErrors.MoneyOverflow);
        _items.RemoveAll(x => x.Type == SaleItemType.Product); _items.AddRange(rows); ResetAdjustment(); Recalculate(subtotal); UpdatedAt = at.ToUniversalTime(); return DomainResult.Success(this);
    }

    public DomainResult<SaleOperation> Adjust(long discountCents, bool courtesy, string? reason, DateTimeOffset at)
    {
        if (Status != SaleOperationStatus.Draft || discountCents < 0 || string.IsNullOrWhiteSpace(reason) || reason.Trim().Length > 300)
            return DomainResult.Failure<SaleOperation>(DomainErrors.InvalidOperationAdjustment);
        var courtesyCents = courtesy ? SubtotalCents - discountCents : 0;
        if (discountCents > SubtotalCents || courtesyCents < 0) return DomainResult.Failure<SaleOperation>(DomainErrors.InvalidOperationAdjustment);
        DiscountCents = discountCents; CourtesyCents = courtesyCents; AdjustmentReason = reason.Trim(); Recalculate(SubtotalCents); UpdatedAt = at.ToUniversalTime(); return DomainResult.Success(this);
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

    public DomainResult<SaleOperation> Reverse(string? reason, Guid actorId, DateTimeOffset at)
    {
        var text = reason?.Trim();
        if (Status != SaleOperationStatus.Paid || actorId == Guid.Empty || string.IsNullOrWhiteSpace(text) || text.Length > 300) return DomainResult.Failure<SaleOperation>(DomainErrors.InvalidStateTransition);
        Status = SaleOperationStatus.Reversed; ReversalReason = text; ReversedBy = actorId; ReversedAt = at.ToUniversalTime(); UpdatedAt = ReversedAt.Value; return DomainResult.Success(this);
    }

    private void ResetAdjustment() { DiscountCents = 0; CourtesyCents = 0; AdjustmentReason = null; }

    private void Recalculate(long subtotal)
    { SubtotalCents = subtotal; TotalCents = SubtotalCents - DiscountCents - CourtesyCents; }

    private static bool TrySubtotal(IEnumerable<SaleItem> items, out long subtotal)
    {
        subtotal = 0;
        try { foreach (var item in items) subtotal = checked(subtotal + checked(item.UnitPriceCents * item.Quantity)); return true; }
        catch (OverflowException) { subtotal = 0; return false; }
    }

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
    { Id = id; OperationId = operationId; Type = SaleItemType.Service; ServiceId = serviceId; DescriptionSnapshot = description; UnitPriceCents = unitPriceCents; Quantity = 1; BarberId = barberId; }
    private SaleItem(Guid id, Guid operationId, Guid productId, string description, long unitPriceCents, long unitCostCents, int quantity, Guid barberId)
    { Id = id; OperationId = operationId; Type = SaleItemType.Product; ProductId = productId; DescriptionSnapshot = description; UnitPriceCents = unitPriceCents; UnitCostCents = unitCostCents; Quantity = quantity; BarberId = barberId; }
    public Guid Id { get; private set; }
    public Guid OperationId { get; private set; }
    public SaleItemType Type { get; private set; }
    public Guid? ServiceId { get; private set; }
    public Guid? ProductId { get; private set; }
    public string DescriptionSnapshot { get; private set; }
    public long UnitPriceCents { get; private set; }
    public long UnitCostCents { get; private set; }
    public int Quantity { get; private set; }
    public Guid BarberId { get; private set; }

    public static DomainResult<SaleItem> CreateProduct(Guid id, Guid operationId, Guid productId, string? description, long unitPriceCents, long unitCostCents, int quantity, Guid barberId)
    {
        var value = new SaleItem(id, operationId, productId, description?.Trim() ?? string.Empty, unitPriceCents, unitCostCents, quantity, barberId);
        return value.IsValidFor(operationId, barberId) ? DomainResult.Success(value) : DomainResult.Failure<SaleItem>(DomainErrors.InvalidSaleOperation);
    }

    internal bool IsValidFor(Guid operationId, Guid barberId) => Id != Guid.Empty && OperationId == operationId && BarberId == barberId && !string.IsNullOrWhiteSpace(DescriptionSnapshot) && DescriptionSnapshot.Length <= 120 && UnitPriceCents >= 0 && UnitCostCents >= 0 && Quantity > 0 &&
        (Type == SaleItemType.Service ? ServiceId.HasValue && !ProductId.HasValue && Quantity == 1 && UnitCostCents == 0 : ProductId.HasValue && !ServiceId.HasValue);
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
