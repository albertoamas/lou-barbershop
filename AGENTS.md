# Lou Barbershop — instrucciones del repositorio

## Fuente de verdad

Leer primero `docs/README.md` y `docs/17-plan-maestro-fases.md`. No implementar una fase cuya puerta de dependencia no esté aprobada.

## Arquitectura

- Backend Clean Architecture: Domain ← Application ← adaptadores externos.
- Domain y Application no dependen de ASP.NET Core, EF Core, PostgreSQL, React, Workbox o Sentry.
- Controllers son delgados y nunca acceden directamente a `DbContext`.
- Infrastructure implementa puertos definidos por Application.
- Frontend `core` no importa React ni adaptadores concretos.
- Monolito modular; no añadir microservicios, colas, Redis o Kubernetes sin ADR aprobado.

## Stack

- .NET 10 / ASP.NET Core Controllers / EF Core / Npgsql / PostgreSQL 18.
- React 19 / TypeScript estricto / Vite / Workbox.
- Docker y Compose para entorno reproducible.

## Reglas críticas

- No usar `double` o `float` para dinero.
- Reserva, atención, pago, comisión y liquidación son conceptos separados.
- No borrar historial económico; usar reversos o ajustes.
- Backend recalcula precio, total, permisos, inventario y comisión.
- Mutaciones económicas y reservas no funcionan offline.
- No exponer secretos, tokens ni datos personales en logs.

## Calidad

- Usar `apply_patch` para ediciones manuales.
- Agregar pruebas al cambiar comportamiento.
- Ejecutar formato, analyzers/lint, arquitectura, pruebas y build antes de cerrar trabajo.
- Actualizar ADR, OpenAPI, migraciones, docs y trazabilidad cuando corresponda.
- Seguir `docs/19-convenciones-trabajo.md`.

