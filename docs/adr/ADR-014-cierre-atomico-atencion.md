# ADR-014 — Cierre atómico e idempotente de una atención

**Estado:** Accepted  
**Fecha:** 7 de septiembre de 2026  
**Alcance:** Fase 7, una sola sucursal

## Contexto

Cobrar una atención puede modificar en conjunto la operación, sus pagos, la comisión del barbero y el estado de una cita vinculada. Un doble toque, una respuesta de red incierta o una regla de comisión faltante no deben duplicar ni dejar una parte de esos efectos confirmada.

## Decisión

- `SaleOperation` mantiene las reglas `DRAFT → READY_TO_PAY → PAID`, total exacto, cortesía sin pago e inmutabilidad después del cobro.
- Application define el caso de uso y sus puertos; no depende de ASP.NET Core, EF Core o PostgreSQL.
- `POST /api/v1/operations/{id}/pay` exige `Idempotency-Key`. Solo se persiste su hash SHA-256, nunca la clave original.
- Infrastructure abre una transacción PostgreSQL y usa un bloqueo transaccional de aplicación para serializar cierres. Dentro del bloqueo vuelve a consultar la clave antes de mutar.
- Operación, pagos, comisión, idempotencia, evento de cita y estado `COMPLETED` se guardan en un único commit.
- Una clave repetida para la misma operación devuelve el resultado ya confirmado; la misma clave para otra operación devuelve conflicto.
- La versión `xmin` protege cambios obsoletos. Restricciones SQL refuerzan importes no negativos, total consistente, pago positivo, una fila por método, una comisión por detalle y una clave/operación idempotente.
- La comisión se calcula sobre el neto distribuido del servicio; en cortesía conserva la referencia completa. El dueño produce sin generar comisión.

## Consecuencias

- Un fallo antes del commit no deja pago, comisión, cita completada ni clave consumida.
- La clave permite reintentar una respuesta incierta sin cobrar dos veces.
- El bloqueo global es deliberadamente simple y suficiente para una única sucursal; reduce concurrencia máxima de cobros, pero evita complejidad prematura. Si el volumen real lo exige, otro ADR podrá cambiarlo por un bloqueo por operación/clave.
- Los pagos requieren conexión. La PWA no los encola ni los reintenta automáticamente.

## Evidencia

- `PhaseSevenOperationTests`: totales, pago mixto, cortesía, inmutabilidad y desbordes.
- `PhaseSevenEndpointTests`: precio autoritativo, desajuste sin efectos, replay, comisión, permisos, cierre de cita y rollback por regla faltante.
- Migraciones `AddServiceOperations` y `HardenServiceOperations`.
- Simulación real documentada en el acta de la fase 7 (retirada; disponible en el historial de git).
