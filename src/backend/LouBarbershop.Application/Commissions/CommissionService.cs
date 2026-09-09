using LouBarbershop.Application.Abstractions;
using LouBarbershop.Domain.Commissions;
using LouBarbershop.Domain.Inventory;
using LouBarbershop.Domain.Sales;

namespace LouBarbershop.Application.Commissions;

public sealed class CommissionService(ICommissionStore store, ICurrentActor actor, IClock clock, IIdGenerator ids)
{
    private static readonly TimeZoneInfo BusinessZone = TimeZoneInfo.FindSystemTimeZoneById("America/La_Paz");
    private bool IsOwner => actor.IsInRole("OWNER");

    public async Task<CommissionResult<IReadOnlyCollection<CommissionView>>> ListCommissionsAsync(Guid? barberId, CommissionEntryStatus? status, CancellationToken ct)
    {
        if (IsOwner) return Success(await store.ListCommissionsAsync(barberId, status, ct));
        if (!actor.IsInRole("BARBER") || actor.UserId is not Guid userId) return Forbidden<IReadOnlyCollection<CommissionView>>();
        var own = await store.FindOwnBarberAsync(userId, ct); return own is null ? Forbidden<IReadOnlyCollection<CommissionView>>() : Success(await store.ListCommissionsAsync(own, status, ct));
    }

    public async Task<CommissionResult<IReadOnlyCollection<SettlementView>>> ListSettlementsAsync(Guid? barberId, CancellationToken ct)
    {
        if (IsOwner) return Success(await store.ListSettlementsAsync(barberId, ct));
        if (!actor.IsInRole("BARBER") || actor.UserId is not Guid userId) return Forbidden<IReadOnlyCollection<SettlementView>>();
        var own = await store.FindOwnBarberAsync(userId, ct); return own is null ? Forbidden<IReadOnlyCollection<SettlementView>>() : Success(await store.ListSettlementsAsync(own, ct));
    }

    public async Task<CommissionResult<SettlementView>> ReadSettlementAsync(Guid id, CancellationToken ct)
    {
        var value = await store.ReadSettlementAsync(id, ct);
        if (value is null) return NotFound<SettlementView>();
        if (IsOwner) return Success(value);
        if (!actor.IsInRole("BARBER") || actor.UserId is not Guid userId) return Forbidden<SettlementView>();
        var own = await store.FindOwnBarberAsync(userId, ct);
        return own == value.BarberId ? Success(value) : Forbidden<SettlementView>();
    }

    public async Task<CommissionResult<SettlementView>> CreateSettlementAsync(Guid barberId, DateOnly periodEnd, CancellationToken ct)
    {
        if (!IsOwner || actor.UserId is not Guid actorId) return Forbidden<SettlementView>();
        if (periodEnd == default || !await store.ContractorActiveAsync(barberId, ct)) return Invalid<SettlementView>("settlement.invalid_barber", "Selecciona un barbero contratado activo y fecha de corte.");
        await using var transaction = await store.BeginAsync(ct); var entries = await store.AvailableAsync(barberId, AtEndExclusive(periodEnd), ct);
        if (entries.Count == 0) return Conflict<SettlementView>("NO_AVAILABLE_COMMISSIONS", "No hay comisiones disponibles hasta la fecha indicada.");
        var settlementId = ids.Create(); var items = entries.Select(x => new SettlementItem(ids.Create(), settlementId, x.Id, x.AmountCents)).ToArray();
        var periodStart = entries.Min(x => DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(x.EarnedAt, BusinessZone).DateTime));
        var settlement = Settlement.Create(settlementId, barberId, periodStart, periodEnd, actorId, clock.UtcNow, items); if (!settlement.IsSuccess) return Invalid<SettlementView>(settlement.Error!.Code, settlement.Error.Message);
        foreach (var entry in entries) { var included = entry.IncludeInSettlement(); if (!included.IsSuccess) return Conflict<SettlementView>(included.Error!.Code, included.Error.Message); }
        store.Add(settlement.Value); await store.SaveChangesAsync(ct); await transaction.CommitAsync(ct); return Success((await store.ReadSettlementAsync(settlementId, ct))!);
    }

    public async Task<CommissionResult<SettlementView>> AddAdjustmentAsync(Guid id, uint version, long amountCents, string reason, CancellationToken ct)
    {
        if (!IsOwner || actor.UserId is not Guid actorId) return Forbidden<SettlementView>(); var settlement = await store.FindSettlementAsync(id, ct); if (settlement is null) return NotFound<SettlementView>(); if (settlement.Version != version) return VersionConflict<SettlementView>();
        var adjustment = SettlementAdjustment.Create(ids.Create(), id, amountCents, reason, actorId, clock.UtcNow); if (!adjustment.IsSuccess) return Invalid<SettlementView>(adjustment.Error!.Code, adjustment.Error.Message);
        var added = settlement.AddAdjustment(adjustment.Value, clock.UtcNow); if (!added.IsSuccess) return Conflict<SettlementView>(added.Error!.Code, added.Error.Message); await store.SaveChangesAsync(ct); return Success((await store.ReadSettlementAsync(id, ct))!);
    }

    public async Task<CommissionResult<SettlementView>> CloseAsync(Guid id, uint version, CancellationToken ct)
    {
        if (!IsOwner || actor.UserId is not Guid actorId) return Forbidden<SettlementView>(); var settlement = await store.FindSettlementAsync(id, ct); if (settlement is null) return NotFound<SettlementView>(); if (settlement.Version != version) return VersionConflict<SettlementView>();
        var closed = settlement.Close(actorId, clock.UtcNow); if (!closed.IsSuccess) return Conflict<SettlementView>(closed.Error!.Code, closed.Error.Message); await store.SaveChangesAsync(ct); return Success((await store.ReadSettlementAsync(id, ct))!);
    }

    public async Task<CommissionResult<SettlementView>> PayAsync(Guid id, uint version, DateOnly paymentDate, PaymentMethod method, CancellationToken ct)
    {
        if (!IsOwner || actor.UserId is not Guid actorId) return Forbidden<SettlementView>(); await using var transaction = await store.BeginAsync(ct); var settlement = await store.FindSettlementAsync(id, ct); if (settlement is null) return NotFound<SettlementView>(); if (settlement.Version != version) return VersionConflict<SettlementView>();
        var paid = settlement.Pay(paymentDate, method, actorId, clock.UtcNow); if (!paid.IsSuccess) return Conflict<SettlementView>(paid.Error!.Code, paid.Error.Message);
        var entryIds = settlement.Items.Select(x => x.CommissionEntryId).ToHashSet();
        foreach (var entry in await store.ListEntriesAsync(entryIds, ct)) { var marked = entry.MarkPaid(); if (!marked.IsSuccess) return Conflict<SettlementView>(marked.Error!.Code, marked.Error.Message); }
        await store.SaveChangesAsync(ct); await transaction.CommitAsync(ct); return Success((await store.ReadSettlementAsync(id, ct))!);
    }

    public async Task<CommissionResult<bool>> ReverseOperationAsync(Guid id, uint version, string reason, CancellationToken ct)
    {
        if (!IsOwner || actor.UserId is not Guid actorId) return Forbidden<bool>(); await using var transaction = await store.BeginAsync(ct); var operation = await store.FindPaidOperationAsync(id, ct); if (operation is null) return NotFound<bool>(); if (operation.Version != version) return VersionConflict<bool>();
        var reversed = operation.Reverse(reason, actorId, clock.UtcNow); if (!reversed.IsSuccess) return Conflict<bool>(reversed.Error!.Code, reversed.Error.Message);
        foreach (var item in operation.Items.Where(x => x.Type == SaleItemType.Product)) { var movement = InventoryMovement.Create(ids.Create(), item.ProductId!.Value, InventoryMovementType.SaleReversal, item.Quantity, item.UnitCostCents, null, item.Id, reason, actorId, clock.UtcNow); if (!movement.IsSuccess) return Invalid<bool>(movement.Error!.Code, movement.Error.Message); store.Add(movement.Value); }
        foreach (var entry in await store.FindOperationCommissionsAsync(id, ct)) { if (entry.Status == CommissionEntryStatus.Available) entry.Void(); else { var correction = CommissionEntry.CreateReversal(ids.Create(), entry, reason, actorId, clock.UtcNow); if (!correction.IsSuccess) return Invalid<bool>(correction.Error!.Code, correction.Error.Message); store.Add(correction.Value); } }
        await store.SaveChangesAsync(ct); await transaction.CommitAsync(ct); return Success(true);
    }

    private static DateTimeOffset AtEndExclusive(DateOnly date) => new(TimeZoneInfo.ConvertTimeToUtc(date.AddDays(1).ToDateTime(TimeOnly.MinValue, DateTimeKind.Unspecified), BusinessZone));
    private static CommissionResult<T> Success<T>(T value) => new(CommissionStatus.Success, value); private static CommissionResult<T> Forbidden<T>() => new(CommissionStatus.Forbidden); private static CommissionResult<T> NotFound<T>() => new(CommissionStatus.NotFound); private static CommissionResult<T> Invalid<T>(string code, string message) => new(CommissionStatus.Invalid, Code: code, Message: message); private static CommissionResult<T> Conflict<T>(string code, string message) => new(CommissionStatus.Conflict, Code: code, Message: message); private static CommissionResult<T> VersionConflict<T>() => Conflict<T>("VERSION_CONFLICT", "El registro cambió. Actualiza antes de continuar.");
}
