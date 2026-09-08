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
    public static readonly DomainError InvalidCatalogName = new("catalog.invalid_name", "El nombre es obligatorio y no puede superar 120 caracteres.");
    public static readonly DomainError InvalidDuration = new("catalog.invalid_duration", "La duración debe estar entre 5 y 480 minutos.");
    public static readonly DomainError InvalidMinimumStock = new("catalog.invalid_minimum_stock", "La existencia mínima no puede ser negativa.");
    public static readonly DomainError InvalidEffectivePeriod = new("catalog.invalid_effective_period", "La fecha final no puede ser anterior a la fecha inicial.");
    public static readonly DomainError InvalidStaffProfile = new("staff.invalid_profile", "El perfil de personal requiere usuario y nombre válidos.");
    public static readonly DomainError InvalidBarberProfile = new("barber.invalid_profile", "El perfil de barbero no es válido.");
    public static readonly DomainError InvalidSchedule = new("schedule.invalid", "El horario requiere un día y un intervalo local válidos.");
    public static readonly DomainError InvalidAvailabilityException = new("availability_exception.invalid", "La excepción de disponibilidad no es válida.");
    public static readonly DomainError InvalidAppointment = new("appointment.invalid", "La cita no contiene un intervalo o referencias válidas.");
    public static readonly DomainError InvalidSaleOperation = new("operation.invalid", "La atención no contiene datos válidos.");
    public static readonly DomainError PaymentMismatch = new("PAYMENT_MISMATCH", "Los pagos deben sumar exactamente el total.");
}
