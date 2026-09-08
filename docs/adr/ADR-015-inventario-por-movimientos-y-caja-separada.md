# ADR-015 — Inventario por movimientos y caja separada

**Estado:** Accepted  
**Fecha:** 8 de septiembre de 2026

## Contexto

Lou necesita saber cuántas unidades tiene, cuánto costaron y cuánto dinero salió, sin convertir una compra de mercadería en gasto operativo ni sobrescribir cantidades históricas. También debe impedir que dos cobros vendan la última unidad.

## Decisión

- La existencia se deriva exclusivamente de la suma de `inventory_movements.quantity_delta`.
- Una recepción confirmada crea un movimiento positivo por detalle y recalcula costo promedio ponderado con enteros monetarios.
- Un producto agregado a una atención congela nombre, precio, cantidad y costo promedio vigente.
- El pago y las salidas de producto ocurren en la misma transacción PostgreSQL. Recepciones, ajustes y cobros comparten un bloqueo transaccional de sucursal única; por eso la última unidad solo puede comprometerse una vez.
- Los ajustes crean movimientos con tipo, actor, fecha y motivo. Nunca actualizan una columna de stock.
- Las compras de reventa y los gastos pagados son salidas de caja distintas. El flujo preliminar las presenta por separado y no pretende ser utilidad contable.
- La anulación de gasto cambia su estado y conserva importe, categoría, medio, motivo, actor, fecha y auditoría.

## Consecuencias

- El historial explica la existencia visible y permite reconstruirla.
- No hay lotes, proveedores ni cuentas por pagar en el MVP.
- La serialización global es deliberada para una sucursal pequeña. Si el volumen futuro lo exige, se podrá sustituir por bloqueo por producto sin alterar Domain/Application.
- Los reversos integrales de cobro y sus efectos coordinados con comisión pertenecen a Fase 9.
