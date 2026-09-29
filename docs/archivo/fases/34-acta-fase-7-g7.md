# Fase 7 — Atención, servicios, ajustes y cobro

**Fecha:** 8 de septiembre de 2026 (America/La_Paz)  
**Estado:** `DONE` — implementación, pruebas, simulación y puerta aprobadas  
**Puerta G7:** aprobada por el dueño mediante «Continua y finaliza»  
**Entrada:** G6 aprobada; continúa la excepción local, sin Railway ni publicación remota.

## Resultado

La PWA registra una atención desde una cita iniciada o como llegada directa `WALK_IN`, confirma los servicios realmente realizados con precio resuelto por el servidor, permite descuentos/cortesías autorizados y cierra con efectivo, QR o ambos. Reserva, atención, pago y deuda de comisión permanecen separados.

El cobro es una sola transacción: cambia la operación a `PAID`, inserta pagos, crea comisión cuando corresponde, completa la cita vinculada con evento y registra el hash de idempotencia. Si falta una condición o el total no coincide, no queda efecto parcial.

## Entregables

| ID | Entrega | Evidencia |
|---|---|---|
| ENT-07-01 | Atención desde cita y llegada directa sin cita ficticia | `SalesService`, `AppointmentOperationsController`, `OperationsController` |
| ENT-07-02 | Sustitución de detalle reservado por servicios reales | `SaleOperation.ReplaceServices`, resolución autoritativa de oferta |
| ENT-07-03 | Descuento y cortesía con motivo y permiso administrativo | `SaleOperation.Adjust`, UI condicional y pruebas de dominio |
| ENT-07-04 | Pago simple/mixto exacto, transaccional e idempotente | `PayAsync`, `Idempotency-Key`, ADR-014, restricciones PostgreSQL |
| ENT-07-05 | Panel operativo diario, total y medios de pago | `/api/v1/operations/daily`, `OperationsPage` |
| ENT-07-06 | Resumen interno inmutable después del cierre | bloque “Operación cerrada” con servicios, ajustes y pagos |

## Criterios de aceptación

| Criterio | Estado | Evidencia |
|---|---|---|
| AC-07-01 | Verificado | Prueba HTTP sustituye servicio reservado Bs 30 por servicio real Bs 70; servidor ignora cualquier total cliente |
| AC-07-02 | Verificado | Dominio y navegador: referencia Bs 70, cortesía Bs 70, total Bs 0 y cero filas de pago |
| AC-07-03 | Verificado | Dominio, HTTP y navegador: Bs 30 CASH + Bs 40 QR = Bs 70 |
| AC-07-04 | Verificado | Bs 69,99 es 409; operación continúa `READY_TO_PAY`, sin pagos ni comisión |
| AC-07-05 | Verificado | Repetición con la misma clave devuelve el mismo cierre y conserva una sola fila de idempotencia/pagos |
| AC-07-06 | Verificado | Comisión faltante después de validar el pago revierte la unidad completa; otra prueba confirma cita/evento solo con commit exitoso |
| AC-07-07 | Verificado | Application y pruebas restringen al barbero propio; ajustes solo OWNER/ADMIN; precio/tasa/total siempre servidor |
| AC-07-08 | Verificado | T-003–008 y T-015 cubiertos por pruebas de dominio/integración y simulación detallada |

## Simulación de jornada G7

Se ejecutó contra `deploy/compose.acceptance.yaml`, con PostgreSQL temporal, API y PWA de producción, sin mocks HTTP y con personas/importes ficticios:

1. administración abrió una llegada directa para Martín QA con Alex QA;
2. confirmó “Atención mixta QA” por Bs 70;
3. cerró Bs 30 en efectivo + Bs 40 por QR;
4. el resumen mostró 1 pagada, Bs 70 total, Bs 30 efectivo y Bs 40 QR;
5. abrió otra atención, aplicó cortesía total con motivo y cerró sin pago;
6. el resumen final mostró 2 pagadas, Bs 70 cobrados, preservando Bs 70 como referencia de la cortesía;
7. se revisó en 390×844 y 1024×768.

La exploración descubrió que una segunda operación conservaba los campos de pago de la anterior y bloqueaba la cortesía. Se corrigió reiniciando el borrador de cobro al cambiar de operación, se añadió prueba de regresión y se repitió el flujo exitosamente.

Capturas: `output/playwright/fase-7/cobro-mixto-mobile.png`, `cobro-mixto-tablet.png` y `cortesia-cerrada.png`. La única entrada de consola fue el 401 esperado de la comprobación anónima previa al login.

## Arquitectura y datos

- Domain contiene estados, totales, cortesía, pago exacto e inmutabilidad sin frameworks.
- Application orquesta permisos, reloj, precios, tasas, idempotencia y transacción mediante puertos.
- Infrastructure implementa EF/PostgreSQL, bloqueo transaccional, consultas y persistencia; Controllers solo traducen HTTP.
- Las migraciones `20260908002223_AddServiceOperations` y `20260908010554_HardenServiceOperations` agregan operaciones, detalles, pagos, comisiones e idempotencia, con FKs, índices, `xmin` y checks monetarios.
- Solo se almacena SHA-256 de `Idempotency-Key`. Ningún secreto o dato real aparece en evidencias.
- Decisión completa: [ADR-014](../../adr/ADR-014-cierre-atomico-atencion.md).

## Verificación ejecutada

```text
.NET Release: build sin advertencias
Backend: 55 Domain + 6 Application + 2 arquitectura + 13 integración = 76/76
Frontend: 23/23; ESLint/Oxlint, Prettier, TypeScript, Vite y PWA correctos
PostgreSQL 18 real: migraciones desde vacío y restricciones aplicadas
Docker: imágenes API/web construidas y health/ready 200 en aceptación
Navegador real: pago mixto, resumen, cortesía, móvil y tableta
```

## Cierre y alcance siguiente

G7 está `DONE`; habilita Fase 8. No se implementaron productos, inventario, gastos ni reversos, que pertenecen a fases posteriores. No se desplegó en Railway, no se hizo push y no se tocaron datos operativos.
