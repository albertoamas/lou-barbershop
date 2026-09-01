namespace LouBarbershop.Domain.Common;

public static class DomainErrors
{
    public static readonly DomainError InvalidMoneyAmount = new("money.invalid_amount", "El importe debe ser mayor o igual a cero.");
    public static readonly DomainError MoneyOverflow = new("money.overflow", "El importe excede el rango permitido.");
    public static readonly DomainError NegativeResult = new("money.negative_result", "La operación produciría un importe negativo.");
    public static readonly DomainError InvalidCommissionRate = new("commission.invalid_rate", "La tasa de comisión debe estar entre 0 y 10000 puntos base.");
    public static readonly DomainError InvalidTimeRange = new("time.invalid_range", "El fin del intervalo debe ser posterior al inicio.");
    public static readonly DomainError InvalidPhoneNumber = new("customer.invalid_phone_number", "El teléfono debe usar formato E.164.");
    public static readonly DomainError InvalidCustomerName = new("customer.invalid_name", "El nombre del cliente es obligatorio y no puede superar 120 caracteres.");
    public static readonly DomainError InvalidStateTransition = new("state.invalid_transition", "La transición de estado no está permitida.");
    public static readonly DomainError InvalidQuantity = new("quantity.invalid", "La cantidad debe ser mayor que cero.");
    public static readonly DomainError InvalidOperationAdjustment = new("operation.invalid_adjustment", "El descuento y la cortesía no pueden superar el subtotal.");
    public static readonly DomainError InvalidAverageCost = new("inventory.invalid_average_cost", "No se puede calcular un costo promedio con cantidades inválidas.");
}
