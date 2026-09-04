# ADR-013 — Escritura transaccional de agenda para una sucursal

**Estado:** Accepted (decisión técnica dentro del alcance de Fase 6)  
**Fecha:** 3 de septiembre de 2026

## Contexto

Consultar disponibilidad no reserva un espacio. Dos dispositivos pueden elegir la misma alternativa. Deben confirmarse cita, snapshot y evento en una única transacción, sin añadir coordinación distribuida para una barbería.

## Decisión

- Application depende de `IAgendaStore` e `IAgendaTransaction`, sin referencias a EF/PostgreSQL.
- El adaptador inicia transacción y toma `pg_advisory_xact_lock(6012026)` para las mutaciones de citas. Es un carril de escritura breve para toda la sucursal, no un bloqueo de navegación ni una transacción mientras el usuario rellena formularios.
- Bajo ese bloqueo se vuelven a leer cita/versión y disponibilidad. Se persisten estado, precio/duración y `AppointmentEvent` antes del commit.
- La exclusión GiST `ex_appointments_no_overlap` sigue siendo la última defensa, incluso ante otra vía de escritura que no tome el bloqueo. Se responde `SLOT_TAKEN` tanto por disponibilidad ocupada como por esa restricción.
- `xmin` mantiene control de versión para evitar que un formulario antiguo sobreescriba cambios.
- El historial conserva actor, instante, acción, motivo y snapshots antes/después; no existe API para editar/borrar eventos.

## Consecuencias

La estrategia serializa escrituras de citas de distintos barberos, aceptable para una sucursal. Si métricas futuras demuestran contención, evolucionar a bloqueos ordenados por barbero con otra decisión y pruebas de reasignación/deadlocks. No incorporar Redis, colas o microservicios.

Los cambios de horarios/ofertas conservan la política de Fase 5: no cancelan citas existentes y los conflictos requieren revisión. El bloqueo de agenda no implica bloquear todos los maestros. La consulta previa del navegador es orientativa; la confirmación siempre recalcula en servidor.

Un reintento de la misma alta mientras su intervalo permanece ocupado no crea una segunda cita. No se implementa aún almacenamiento de respuestas por `Idempotency-Key`; tras una respuesta de red incierta debe consultarse la agenda antes de reintentar. Los cobros idempotentes pertenecen a Fase 7.
