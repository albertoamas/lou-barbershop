# Fase 9 — Comisiones, liquidaciones y reversos

**Fecha:** 8 de septiembre de 2026 (America/La_Paz)  
**Estado:** `DONE`  
**Puerta G9:** aprobada explícitamente por el dueño el 9 de septiembre de 2026 mediante «Listo la fase 9»  
**Entrada:** G8 aprobada; continúa la excepción local, sin Railway ni publicación remota.

## Resultado

La aplicación separa la deuda de comisión del dinero cobrado. Cada entrada conserva detalle, operación, base, tasa histórica, importe y fecha. El dueño puede preparar un borrador por corte, revisar ajustes firmados, cerrarlo y registrar el pago completo. El barbero consulta su propio libro y comprobantes. Los reversos conservan la historia: anulan lo disponible o generan una corrección negativa futura cuando el original ya fue liquidado.

## Entregables

| ID | Entrega | Evidencia |
|---|---|---|
| ENT-09-01 | Ledger de comisiones trazable | `CommissionEntry`, `/api/v1/commissions`, migración `AddCommissionSettlements` |
| ENT-09-02 | Vista propia por estado | `CommissionService`, autorización OWNER/BARBER, `CommissionsPage` |
| ENT-09-03 | Crear, revisar, cerrar y pagar | `Settlement`, `/api/v1/settlements`, control `xmin` |
| ENT-09-04 | Reversos y correcciones posteriores | `POST /operations/{id}/reverse`, `SaleReversal`, entrada negativa enlazada |
| ENT-09-05 | Comprobante interno | detalle de liquidación PWA con operaciones, bases, tasas, ajustes y total |

## Criterios de aceptación

| Criterio | Estado | Evidencia |
|---|---|---|
| AC-09-01 | Verificado | Entrada por detalle con operación, barbero, base, tasa, importe y fecha |
| AC-09-02 | Verificado | Integración paga servicio del dueño y confirma ausencia de comisión |
| AC-09-03 | Verificado | Cortesía Bs 70,01: cliente Bs 0; comisión 50 % = Bs 35,01 |
| AC-09-04 | Verificado | La entrada conserva 5000 puntos base después de desactivar la regla; el cálculo pasado no consulta reglas actuales |
| AC-09-05 | Verificado | Dos creaciones concurrentes: un 200, un 409 y un solo `settlement_item` |
| AC-09-06 | Verificado | Ajustar una liquidación pagada devuelve 409 y conserva comprobante/importes |
| AC-09-07 | Verificado | Original `PAID` permanece; reverso crea `AVAILABLE` por −Bs 35,01 enlazado |
| AC-09-08 | Verificado | T-007–013 cubiertos entre F8/F9 y cálculo en centavos reproducible |

## Verificación ejecutada

```text
.NET: compilación Release sin advertencias; Domain 61, Application 6, arquitectura 2
Integración PostgreSQL 18: identidad/configuración 5; agenda/operación/inventario/comisiones 6
Frontend: 26 pruebas; ESLint/Oxlint, Prettier, TypeScript, Vite y Workbox
Migración: 20260908235544_AddCommissionSettlements aplicada sobre la base local existente
Docker Compose: migrate finaliza; API, PostgreSQL y web saludables; /health/ready = 200
Navegador real 390×844: ruta /commissions, navegación y controles; consola sin errores
```

Evidencia visual: `output/playwright/phase9-mobile.png`.

## Límites mantenidos

- No hay pago parcial de liquidación ni edición después del pago.
- No hay reembolso físico/fiscal automatizado al cliente.
- Los ajustes y reversos requieren conexión y autorización del dueño.
- Los reportes agregados y auditoría consultable pertenecen a Fase 10.

## Puerta G9

G9 fue aprobada por el dueño el 9 de septiembre de 2026. Fase 10 queda habilitada bajo la excepción local vigente; la aprobación no autoriza Railway ni publicación remota.
