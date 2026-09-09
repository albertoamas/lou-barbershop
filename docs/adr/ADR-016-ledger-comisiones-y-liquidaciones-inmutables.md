# ADR-016 — Ledger de comisiones y liquidaciones inmutables

**Estado:** Accepted  
**Fecha:** 8 de septiembre de 2026

## Contexto

Lou debe distinguir el dinero pagado por clientes de la deuda devengada a un barbero contratado. La tasa puede cambiar, una cortesía de servicio sigue remunerando al contratado y una operación puede revertirse antes o después de pagar una liquidación. Sobrescribir importes históricos impediría reconciliar el negocio.

## Decisión

- Cada detalle vendido genera como máximo una entrada de comisión con base, tasa histórica, importe entero, barbero, actor y fecha. El dueño no genera entrada.
- La cortesía de servicio contratado usa el precio de referencia como base; una cortesía de producto usa base cero.
- Una liquidación toma entradas `AVAILABLE` no nulas hasta un corte de negocio. `settlement_items.commission_entry_id` es único global y la selección se serializa con el bloqueo transaccional de sucursal única.
- Los ajustes pertenecen al borrador, tienen signo, motivo y autorizador; el total pagable nunca puede ser negativo.
- Cierre y pago son transiciones explícitas. Una liquidación pagada es inmutable.
- Un reverso antes de liquidar marca la comisión `VOIDED`. Después de incluirla, conserva el original y crea una entrada `REVERSAL` negativa disponible para una liquidación futura.
- Cobro, stock, comisión y liquidación conservan tablas y semánticas independientes aunque se coordinen en una transacción.

## Consecuencias

- El barbero puede reconstruir cada total desde operaciones y tasas históricas.
- No se registran pagos parciales, anticipos ni transferencias bancarias distintas de CASH/QR en el MVP.
- El reverso es una corrección interna; cualquier devolución física al cliente queda fuera del alcance actual.
- La serialización global es adecuada para una única sucursal y puede sustituirse en Infrastructure sin cambiar Domain/Application.
