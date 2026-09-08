using LouBarbershop.Application.Abstractions;
using LouBarbershop.Domain.Common;
using LouBarbershop.Domain.Expenses;
using LouBarbershop.Domain.Finance;
using LouBarbershop.Domain.Inventory;

namespace LouBarbershop.Application.Inventory;

public sealed class InventoryService(IInventoryStore store, ICurrentActor actor, IClock clock, IIdGenerator ids)
{
    private bool CanManage => actor.IsInRole("OWNER") || actor.IsInRole("ADMIN");
    private bool CanOperate => CanManage || actor.IsInRole("BARBER");

    public async Task<InventoryResult<IReadOnlyCollection<InventoryView>>> ListAsync(CancellationToken ct)
    {
        if (!CanOperate) return Forbidden<IReadOnlyCollection<InventoryView>>();
        var rows = await store.ListInventoryAsync(ct);
        return Success<IReadOnlyCollection<InventoryView>>(CanManage ? rows : rows.Select(x => x with { AverageCostCents = null }).ToArray());
    }

    public async Task<InventoryResult<IReadOnlyCollection<MovementView>>> MovementsAsync(Guid productId, CancellationToken ct) =>
        CanManage ? Success(await store.ListMovementsAsync(productId, ct)) : Forbidden<IReadOnlyCollection<MovementView>>();

    public async Task<InventoryResult<IReadOnlyCollection<ReceiptView>>> ReceiptsAsync(CancellationToken ct) =>
        CanManage ? Success(await store.ListReceiptsAsync(ct)) : Forbidden<IReadOnlyCollection<ReceiptView>>();

    public async Task<InventoryResult<ReceiptView>> ReceiveAsync(ReceiptInput input, CancellationToken ct)
    {
        if (!CanManage || actor.UserId is not Guid actorId) return Forbidden<ReceiptView>();
        if (input.Items.Count == 0) return Invalid<ReceiptView>("inventory.invalid_receipt", "Agrega al menos un producto.");
        await using var transaction = await store.BeginAsync(ct);
        var receiptId = ids.Create(); var items = new List<InventoryReceiptItem>();
        try { foreach (var inputItem in input.Items) items.Add(new(ids.Create(), receiptId, inputItem.ProductId, inputItem.Quantity, inputItem.UnitCostCents)); }
        catch (OverflowException) { return Invalid<ReceiptView>("money.overflow", "El total excede el rango permitido."); }
        var receiptResult = InventoryReceipt.Create(receiptId, input.ReceiptDate, input.PaymentMethod, input.Reference, input.Note, actorId, clock.UtcNow, items);
        if (!receiptResult.IsSuccess) return Invalid<ReceiptView>(receiptResult.Error!.Code, receiptResult.Error.Message);
        foreach (var item in items)
        {
            var product = await store.FindProductAsync(item.ProductId, ct); if (product is null || !product.Active) return Conflict<ReceiptView>("PRODUCT_UNAVAILABLE", "El producto no está activo.");
            var quantity = await store.QuantityAsync(item.ProductId, ct); var received = Quantity.Create(item.Quantity); var cost = Money.Create(item.UnitCostCents);
            if (!received.IsSuccess || !cost.IsSuccess) return Invalid<ReceiptView>("inventory.invalid_receipt", "Cantidad y costo deben ser positivos.");
            var average = AverageCostCalculator.Calculate(quantity, product.AverageCost, received.Value, cost.Value); if (!average.IsSuccess) return Invalid<ReceiptView>(average.Error!.Code, average.Error.Message);
            product.SetAverageCost(average.Value, clock.UtcNow);
            var movement = InventoryMovement.Create(ids.Create(), product.Id, InventoryMovementType.PurchaseReceipt, item.Quantity, item.UnitCostCents, item.Id, null, null, actorId, clock.UtcNow);
            if (!movement.IsSuccess) return Invalid<ReceiptView>(movement.Error!.Code, movement.Error.Message);
            store.Add(movement.Value);
        }
        store.Add(receiptResult.Value); await store.SaveChangesAsync(ct); await transaction.CommitAsync(ct);
        return Success((await store.ListReceiptsAsync(ct)).Single(x => x.Id == receiptId));
    }

    public async Task<InventoryResult<InventoryView>> AdjustAsync(Guid productId, AdjustmentInput input, CancellationToken ct)
    {
        if (!CanManage || actor.UserId is not Guid actorId) return Forbidden<InventoryView>();
        if (input.QuantityDelta == 0 || string.IsNullOrWhiteSpace(input.Reason) || input.Reason.Trim().Length > 300 || input.Type is not (InventoryMovementType.CountAdjustment or InventoryMovementType.Damage or InventoryMovementType.Loss or InventoryMovementType.InternalUse or InventoryMovementType.Opening))
            return Invalid<InventoryView>("inventory.invalid_movement", "Tipo, cantidad y motivo son obligatorios.");
        await using var transaction = await store.BeginAsync(ct); var product = await store.FindProductAsync(productId, ct); if (product is null) return NotFound<InventoryView>();
        var current = await store.QuantityAsync(productId, ct); var result = (long)current + input.QuantityDelta;
        if (result < 0 && !actor.IsInRole("OWNER")) return Conflict<InventoryView>("OUT_OF_STOCK", "El ajuste dejaría existencia negativa y requiere al dueño.");
        var movement = InventoryMovement.Create(ids.Create(), productId, input.Type, input.QuantityDelta, product.AverageCost.Cents, null, null, input.Reason.Trim(), actorId, clock.UtcNow);
        if (!movement.IsSuccess) return Invalid<InventoryView>(movement.Error!.Code, movement.Error.Message);
        store.Add(movement.Value);
        await store.SaveChangesAsync(ct); await transaction.CommitAsync(ct); return Success((await store.ListInventoryAsync(ct)).Single(x => x.ProductId == productId));
    }

    public async Task<InventoryResult<IReadOnlyCollection<ExpenseView>>> ExpensesAsync(DateOnly? from, DateOnly? to, CancellationToken ct) =>
        CanManage ? Success(await store.ListExpensesAsync(from, to, ct)) : Forbidden<IReadOnlyCollection<ExpenseView>>();

    public async Task<InventoryResult<ExpenseView>> CreateExpenseAsync(ExpenseInput input, CancellationToken ct)
    {
        if (!CanManage || actor.UserId is not Guid actorId) return Forbidden<ExpenseView>(); if (!await store.ExpenseCategoryActiveAsync(input.CategoryId, ct)) return NotFound<ExpenseView>();
        var value = Expense.Create(ids.Create(), input.CategoryId, input.ExpenseDate, input.Description, input.AmountCents, input.PaymentMethod, actorId, clock.UtcNow); if (!value.IsSuccess) return Invalid<ExpenseView>(value.Error!.Code, value.Error.Message);
        store.Add(value.Value); await store.SaveChangesAsync(ct); return Success((await store.ListExpensesAsync(null, null, ct)).Single(x => x.Id == value.Value.Id));
    }

    public async Task<InventoryResult<ExpenseView>> VoidExpenseAsync(Guid id, uint version, string reason, CancellationToken ct)
    {
        if (!CanManage || actor.UserId is not Guid actorId) return Forbidden<ExpenseView>(); var value = await store.FindExpenseAsync(id, ct); if (value is null) return NotFound<ExpenseView>(); if (value.Version != version) return Conflict<ExpenseView>("VERSION_CONFLICT", "El gasto cambió.");
        var result = value.Void(reason, actorId, clock.UtcNow); if (!result.IsSuccess) return Conflict<ExpenseView>(result.Error!.Code, result.Error.Message); await store.SaveChangesAsync(ct); return Success((await store.ListExpensesAsync(null, null, ct)).Single(x => x.Id == id));
    }

    public async Task<InventoryResult<CashFlowView>> CashFlowAsync(DateOnly from, DateOnly to, CancellationToken ct) =>
        !CanManage ? Forbidden<CashFlowView>() : from == default || to == default || to < from || to.DayNumber - from.DayNumber > 366 ? Invalid<CashFlowView>("date.invalid_range", "El rango admite hasta 366 días.") : Success(await store.CashFlowAsync(from, to, ct));

    private static InventoryResult<T> Success<T>(T value) => new(InventoryStatus.Success, value);
    private static InventoryResult<T> Forbidden<T>() => new(InventoryStatus.Forbidden);
    private static InventoryResult<T> NotFound<T>() => new(InventoryStatus.NotFound);
    private static InventoryResult<T> Invalid<T>(string code, string message) => new(InventoryStatus.Invalid, Code: code, Message: message);
    private static InventoryResult<T> Conflict<T>(string code, string message) => new(InventoryStatus.Conflict, Code: code, Message: message);
}
