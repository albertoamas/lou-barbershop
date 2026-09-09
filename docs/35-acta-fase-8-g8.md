# Fase 8 — Productos, inventario y gastos

**Fecha:** 8 de septiembre de 2026 (America/La_Paz)  
**Estado:** `DONE` — implementación, verificación técnica y puerta aprobadas  
**Puerta G8:** aprobada por el dueño mediante «Vamos con la fase 9»  
**Entrada:** G7 aprobada; continúa la excepción local, sin Railway ni publicación remota.

## Resultado

La PWA registra recepciones pagadas con varios productos, deriva existencias de movimientos, calcula costo promedio ponderado, alerta mínimos y vende productos solos o junto con servicios. La salida se confirma atómicamente con el pago y conserva precio/costo históricos. Los gastos pagados pueden anularse sin borrar su historia y el flujo de caja separa cobros, compra de inventario y gasto operativo.

## Entregables

| ID | Entrega | Evidencia |
|---|---|---|
| ENT-08-01 | Recepciones pagadas e historial por detalle | `InventoryReceipt`, `/api/v1/inventory-receipts`, `InventoryPage` |
| ENT-08-02 | Movimientos, existencia y costo promedio | `InventoryMovement`, `AverageCostCalculator`, `/api/v1/inventory` |
| ENT-08-03 | Producto en atención y venta independiente | `SaleItemType.Product`, `PUT /operations/{id}/products`, cierre transaccional |
| ENT-08-04 | Conteo, daño, pérdida, consumo y apertura con motivo | `POST /products/{id}/adjustments` |
| ENT-08-05 | Gasto pagado y anulación auditada | `Expense`, `/api/v1/expenses`, `AuditLog` |
| ENT-08-06 | Alerta de mínimo y flujo preliminar separado | `LowStock`, `/api/v1/cash-flow`, panel PWA |

## Criterios de aceptación

| Criterio | Estado | Evidencia |
|---|---|---|
| AC-08-01 | Verificado | Dominio, integración y navegador: 3 × Bs 12 = Bs 36; existencia 3 y promedio Bs 12 |
| AC-08-02 | Verificado | Flujo muestra Bs 36 como compra de inventario y Bs 15 como gasto, en renglones distintos |
| AC-08-03 | Verificado | Dos pagos concurrentes sobre una unidad: un 200, un 409 `OUT_OF_STOCK`, una salida |
| AC-08-04 | Verificado | Ajustes agregan movimientos tipados con motivo/actor; existencia nunca se sobrescribe |
| AC-08-05 | Verificado | Integración desactiva el producto, conserva kardex e impide agregarlo a otra atención |
| AC-08-06 | Verificado | Dominio/API rechazan fecha omitida, importe no positivo o categoría/concepto inválidos |
| AC-08-07 | Verificado | T-009 cubierto por concurrencia real; T-017 por anulación, auditoría y exclusión de caja |

## Arquitectura y datos

- Domain contiene agregados y cálculos sin ASP.NET Core, EF Core o React.
- Application coordina permisos, reloj, IDs y transacciones mediante `IInventoryStore`/`ISalesStore`.
- Infrastructure deriva stock con SQL/EF Core, comparte el bloqueo de inventario y persiste la migración `AddInventoryAndExpenses`.
- Controllers solo traducen DTO/HTTP. La PWA usa contratos en `core/inventory`; las mutaciones críticas siguen deshabilitadas offline.
- La migración transforma los detalles de servicio históricos a `type=Service`, `quantity=1` antes de aplicar restricciones, por lo que preserva datos de Fase 7.
- Decisión completa: [ADR-015](adr/ADR-015-inventario-por-movimientos-y-caja-separada.md).

## Verificación ejecutada

```text
.NET: build sin advertencias; Domain 58, Application 6, arquitectura 2, integración 14
Frontend: 24 pruebas; Prettier, ESLint/Oxlint, TypeScript, Vite y Workbox
PostgreSQL 18: migración desde cero y sobre la base local existente
Docker Compose: migrate finaliza; API y web saludables
Navegador real 390×844: recepción, costo promedio, alerta, gasto y caja; sin errores funcionales (solo 401 esperado al invalidarse la sesión durante la rotación local de clave)
```

Evidencia visual: `output/playwright/fase-8/inventario-caja-mobile.png`.

## Puerta G8

La reconciliación `apertura + recepciones − ventas ± ajustes = existencia` y la separación inventario/gasto están demostradas. G8 está aprobada y habilita Fase 9.
