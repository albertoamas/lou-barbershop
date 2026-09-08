using System.Numerics;
using System.Security.Cryptography;
using System.Text;
using LouBarbershop.Application.Abstractions;
using LouBarbershop.Domain.Commissions;
using LouBarbershop.Domain.Finance;
using LouBarbershop.Domain.Inventory;
using LouBarbershop.Domain.Sales;

namespace LouBarbershop.Application.Sales;

public sealed class SalesService(ISalesStore store, ICurrentActor actor, IClock clock, IIdGenerator ids)
{
    private static readonly TimeZoneInfo BusinessZone = TimeZoneInfo.FindSystemTimeZoneById("America/La_Paz");
    private bool CanManageAll => actor.IsInRole("OWNER") || actor.IsInRole("ADMIN");

    public async Task<SalesResult<OperationView>> OpenWalkInAsync(Guid customerId, Guid barberId, CancellationToken ct)
    {
        if (!actor.UserId.HasValue || !await CanUseBarberAsync(barberId, ct)) return Forbidden();
        if (!await store.CustomerExistsAsync(customerId, ct) || !await store.BarberActiveAsync(barberId, ct)) return NotFound();
        var operation = SaleOperation.Create(ids.Create(), null, customerId, barberId, SaleOrigin.WalkIn, actor.UserId.Value, clock.UtcNow);
        store.AddOperation(operation.Value); await store.SaveChangesAsync(ct); return Success((await store.ReadAsync(operation.Value.Id, ct))!);
    }

    public async Task<SalesResult<OperationView>> OpenAppointmentAsync(Guid appointmentId, CancellationToken ct)
    {
        if (!actor.UserId.HasValue) return Forbidden();
        var appointment = await store.FindAppointmentAsync(appointmentId, ct);
        if (appointment is null) return NotFound();
        if (!await CanUseBarberAsync(appointment.Value.BarberId, ct)) return Forbidden();
        if (appointment.Value.Status is not ("CHECKED_IN" or "IN_SERVICE")) return Conflict("INVALID_STATE", "Registra la llegada o inicia la atención antes de abrirla.");
        if (await store.OperationExistsForAppointmentAsync(appointmentId, ct)) return Conflict("OPERATION_EXISTS", "La cita ya tiene una atención.");
        var operation = SaleOperation.Create(ids.Create(), appointmentId, appointment.Value.CustomerId, appointment.Value.BarberId, SaleOrigin.Appointment, actor.UserId.Value, clock.UtcNow).Value;
        operation.ReplaceServices([new(ids.Create(), operation.Id, appointment.Value.ServiceId, appointment.Value.ServiceName, appointment.Value.PriceCents, appointment.Value.BarberId)], clock.UtcNow);
        store.AddOperation(operation);
        await store.SaveChangesAsync(ct);
        return Success((await store.ReadAsync(operation.Id, ct))!);
    }

    public async Task<SalesResult<OperationView>> ReadAsync(Guid id, CancellationToken ct)
    { var value = await store.ReadAsync(id, ct); return value is null ? NotFound() : await CanUseBarberAsync(value.BarberId, ct) ? Success(value) : Forbidden(); }

    public async Task<SalesResult<OperationView>> ReplaceServicesAsync(Guid id, uint version, IReadOnlyCollection<ServiceInput> inputs, CancellationToken ct)
    {
        var operation = await store.FindAsync(id, ct); if (operation is null) return NotFound();
        if (!await CanUseBarberAsync(operation.BarberId, ct)) return Forbidden(); if (operation.Version != version) return VersionConflict();
        var date = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(clock.UtcNow, BusinessZone).DateTime); var items = new List<SaleItem>();
        foreach (var input in inputs)
        { var service = await store.FindServiceAsync(input.ServiceId, operation.BarberId, date, ct); if (service is null || !service.Value.Active) return Conflict("SERVICE_UNAVAILABLE", "El servicio no está activo."); items.Add(new(ids.Create(), operation.Id, input.ServiceId, service.Value.Name, service.Value.PriceCents, operation.BarberId)); }
        var result = operation.ReplaceServices(items, clock.UtcNow); if (!result.IsSuccess) return Conflict("INVALID_STATE", result.Error!.Message);
        await store.SaveChangesAsync(ct); return Success((await store.ReadAsync(id, ct))!);
    }

    public async Task<SalesResult<OperationView>> ReplaceProductsAsync(Guid id, uint version, IReadOnlyCollection<ProductInput> inputs, CancellationToken ct)
    {
        var operation = await store.FindAsync(id, ct); if (operation is null) return NotFound();
        if (!await CanUseBarberAsync(operation.BarberId, ct)) return Forbidden(); if (operation.Version != version) return VersionConflict();
        if (inputs.Any(x => x.ProductId == Guid.Empty || x.Quantity <= 0) || inputs.GroupBy(x => x.ProductId).Any(x => x.Count() > 1)) return Conflict("INVALID_PRODUCTS", "Los productos y cantidades no son válidos.");
        var items = new List<SaleItem>();
        foreach (var input in inputs)
        {
            var product = await store.FindProductAsync(input.ProductId, ct);
            if (product is null || !product.Value.Active) return Conflict("PRODUCT_UNAVAILABLE", "El producto no está activo.");
            var item = SaleItem.CreateProduct(ids.Create(), operation.Id, input.ProductId, product.Value.Name, product.Value.SalePriceCents, product.Value.AverageCostCents, input.Quantity, operation.BarberId);
            if (!item.IsSuccess) return Conflict("INVALID_PRODUCTS", item.Error!.Message);
            items.Add(item.Value);
        }
        var result = operation.ReplaceProducts(items, clock.UtcNow); if (!result.IsSuccess) return Conflict("INVALID_STATE", result.Error!.Message);
        await store.SaveChangesAsync(ct); return Success((await store.ReadAsync(id, ct))!);
    }

    public async Task<SalesResult<OperationView>> AdjustAsync(Guid id, AdjustmentInput input, CancellationToken ct)
    {
        if (!CanManageAll) return Forbidden(); var operation = await store.FindAsync(id, ct); if (operation is null) return NotFound();
        if (operation.Version != input.Version) return VersionConflict(); var result = operation.Adjust(input.DiscountCents, input.Courtesy, input.Reason, clock.UtcNow);
        if (!result.IsSuccess) return new(SalesStatus.Invalid, Code: result.Error!.Code, Message: result.Error.Message);
        await store.SaveChangesAsync(ct); return Success((await store.ReadAsync(id, ct))!);
    }

    public async Task<SalesResult<OperationView>> ReadyAsync(Guid id, uint version, CancellationToken ct)
    { var operation = await store.FindAsync(id, ct); if (operation is null) return NotFound(); if (!await CanUseBarberAsync(operation.BarberId, ct)) return Forbidden(); if (operation.Version != version) return VersionConflict(); var result = operation.Ready(clock.UtcNow); if (!result.IsSuccess) return Conflict("INVALID_STATE", result.Error!.Message); await store.SaveChangesAsync(ct); return Success((await store.ReadAsync(id, ct))!); }

    public async Task<SalesResult<OperationView>> PayAsync(Guid id, uint version, IReadOnlyCollection<PaymentInput> inputs, string? idempotencyKey, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(idempotencyKey) || idempotencyKey.Length > 120) return new(SalesStatus.Invalid, Code: "IDEMPOTENCY_KEY_REQUIRED", Message: "Envía una clave de idempotencia válida.");
        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(idempotencyKey)));
        var replay = await store.FindPaidByIdempotencyKeyAsync(hash, ct); if (replay is not null) return replay.Id == id ? Success(replay) : Conflict("IDEMPOTENCY_KEY_REUSED", "La clave ya se utilizó para otra operación.");
        await using var transaction = await store.BeginAsync(ct);
        replay = await store.FindPaidByIdempotencyKeyAsync(hash, ct); if (replay is not null) return replay.Id == id ? Success(replay) : Conflict("IDEMPOTENCY_KEY_REUSED", "La clave ya se utilizó para otra operación.");
        var operation = await store.FindAsync(id, ct); if (operation is null) return NotFound();
        if (!actor.UserId.HasValue || !await CanUseBarberAsync(operation.BarberId, ct)) return Forbidden(); if (operation.Version != version) return VersionConflict();
        foreach (var item in operation.Items.Where(x => x.Type == SaleItemType.Product))
        {
            var available = await store.ProductQuantityAsync(item.ProductId!.Value, ct);
            if (available < item.Quantity) return Conflict("OUT_OF_STOCK", $"No hay existencias suficientes de {item.DescriptionSnapshot}.");
        }
        var payments = inputs.Select(x => new Payment(ids.Create(), id, x.Method, x.AmountCents, actor.UserId.Value, clock.UtcNow)).ToArray(); var paid = operation.Pay(payments, clock.UtcNow);
        if (!paid.IsSuccess) return new(SalesStatus.Conflict, Code: paid.Error!.Code, Message: paid.Error.Message);
        foreach (var item in operation.Items.Where(x => x.Type == SaleItemType.Product))
        {
            var movement = InventoryMovement.Create(ids.Create(), item.ProductId!.Value, InventoryMovementType.Sale, -item.Quantity, item.UnitCostCents, null, item.Id, null, actor.UserId.Value, clock.UtcNow);
            if (!movement.IsSuccess) return Conflict("INVALID_INVENTORY_MOVEMENT", movement.Error!.Message);
            store.AddInventoryMovement(movement.Value);
        }
        if (!await store.BarberIsOwnerAsync(operation.BarberId, ct))
        {
            var items = operation.Items.ToArray();
            var remainingBase = operation.TotalCents;
            for (var index = 0; index < items.Length; index++)
            {
                var item = items[index];
                var kind = item.Type == SaleItemType.Service ? CommissionKind.Service : CommissionKind.Product;
                var rate = await store.FindCommissionRateAsync(operation.BarberId, kind, DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(clock.UtcNow, BusinessZone).DateTime), ct);
                if (!rate.HasValue) return Conflict("COMMISSION_RULE_MISSING", $"No existe una tasa de comisión vigente para {kind.ToString().ToLowerInvariant()}.");
                var lineTotal = checked(item.UnitPriceCents * item.Quantity);
                var baseCents = operation.CourtesyCents > 0
                    ? lineTotal
                    : operation.SubtotalCents == 0
                        ? 0
                        : index == items.Length - 1
                            ? remainingBase
                            : (long)((BigInteger)lineTotal * operation.TotalCents / operation.SubtotalCents);
                if (operation.CourtesyCents == 0) remainingBase -= baseCents;
                var amount = CommissionCalculator.Calculate(Money.Create(baseCents).Value, CommissionRate.Create(rate.Value).Value).Value.Cents;
                store.AddCommission(new CommissionEntryRecord(ids.Create(), operation.BarberId, item.Id, baseCents, rate.Value, amount, actor.UserId.Value, clock.UtcNow));
            }
        }

        if (operation.AppointmentId.HasValue)
            await store.MarkAppointmentCompletedAsync(operation.AppointmentId.Value, ids.Create(), actor.UserId.Value, clock.UtcNow, ct);
        store.AddIdempotency(new IdempotencyRecord(ids.Create(), hash, id, clock.UtcNow)); await store.SaveChangesAsync(ct); await transaction.CommitAsync(ct); return Success((await store.ReadAsync(id, ct))!);
    }

    public async Task<SalesResult<DailyOperationsView>> DailyAsync(DateOnly date, CancellationToken ct)
    { Guid? barber = null; if (!CanManageAll) { if (!actor.UserId.HasValue || !actor.IsInRole("BARBER") || (barber = await store.FindOwnBarberAsync(actor.UserId.Value, ct)) is null) return new(SalesStatus.Forbidden); } var from = AtMidnight(date); var rows = await store.ListAsync(from, from.AddDays(1), barber, ct); return new(SalesStatus.Success, new(date, rows.Count(x => x.Status != SaleOperationStatus.Paid), rows.Count(x => x.Status == SaleOperationStatus.Paid), rows.Where(x => x.Status == SaleOperationStatus.Paid).Sum(x => x.TotalCents), rows.SelectMany(x => x.Payments).Where(x => x.Method == PaymentMethod.Cash).Sum(x => x.AmountCents), rows.SelectMany(x => x.Payments).Where(x => x.Method == PaymentMethod.Qr).Sum(x => x.AmountCents), rows)); }
    private async Task<bool> CanUseBarberAsync(Guid barberId, CancellationToken ct) => CanManageAll || actor.IsInRole("BARBER") && actor.UserId.HasValue && await store.FindOwnBarberAsync(actor.UserId.Value, ct) == barberId;
    private static DateTimeOffset AtMidnight(DateOnly date) => new(TimeZoneInfo.ConvertTimeToUtc(date.ToDateTime(TimeOnly.MinValue, DateTimeKind.Unspecified), BusinessZone));
    private static SalesResult<OperationView> Success(OperationView x) => new(SalesStatus.Success, x); private static SalesResult<OperationView> Forbidden() => new(SalesStatus.Forbidden); private static SalesResult<OperationView> NotFound() => new(SalesStatus.NotFound); private static SalesResult<OperationView> VersionConflict() => Conflict("VERSION_CONFLICT", "La atención cambió. Actualiza antes de continuar."); private static SalesResult<OperationView> Conflict(string code, string message) => new(SalesStatus.Conflict, Code: code, Message: message);
}
