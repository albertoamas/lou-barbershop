# Fase 10 — Paneles, reportes y auditoría

**Fecha:** 9 de septiembre de 2026 (America/La_Paz)  
**Estado:** `READY_FOR_G10` — implementación y validación técnica completas  
**Puerta G10:** pendiente de reconciliación del dueño  
**Entrada:** G8 y G9 aprobadas; excepción local vigente, sin Railway ni publicación remota.

## Resultado

La ruta `/reports` ofrece panel del día, resultado por período, flujo de caja total/CASH/QR, estados de comisión, producción/ocupación por barbero, detalle fuente, auditoría paginada y dos CSV. Las fórmulas residen en Application, los datos se leen mediante un puerto y el adaptador EF usa consultas de sólo lectura. No se añadió contabilidad fiscal ni almacenamiento agregado.

## Entregables y criterios

| Elemento | Estado | Evidencia |
|---|---|---|
| ENT-10-01 / AC-10-01 | Verificado | panel diario y enlaces a citas/operaciones fuente |
| ENT-10-02 / AC-10-02/03 | Verificado | resultado y caja separados; compra sólo en caja y COGS sólo en resultado |
| ENT-10-03 / AC-10-04 | Verificado | producción/ocupación incluye dueño marcado sin deuda |
| ENT-10-04 | Verificado | `/api/v1/audit` OWNER, filtros y paginación de 1–100 filas |
| ENT-10-05 / AC-10-06 | Verificado | CSV de operaciones/barberos, BOM UTF-8 y neutralización de fórmulas |
| ENT-10-06 | Verificado | [diccionario de métricas](38-diccionario-metricas.md) |
| AC-10-05 | Verificado | bordes Bolivia y rango máximo de 367 días en Application |
| AC-10-07 | Verificado técnicamente | dataset HTTP controlado reproduce cada total; índice por fecha de auditoría |

## Verificación técnica

- Build .NET 10 Release y `dotnet format --verify-no-changes` sin advertencias ni cambios pendientes; 2 pruebas de arquitectura aprobadas.
- Dominio: 61 pruebas aprobadas. Application: 9 pruebas aprobadas, incluida `PhaseTenReportingTests` para fórmula resultado/caja, permisos y CSV seguro.
- `PhaseTenEndpointTests`: prueba integral aprobada con dos operaciones, compra, gasto, comisiones, dueño, caja, panel, auditoría y CSV sobre PostgreSQL 18 aislado.
- Migraciones: prueba desde base vacía aprobada, incluida F10.
- Frontend: TypeScript estricto, ESLint/Oxlint y Prettier aprobados; 27 pruebas Vitest y build PWA aprobados.
- Migración `20260909044837_AddReportingAuditIndex` generada desde el modelo EF.
- Compose reconstruido con API, PostgreSQL y web en estado `healthy`; `/health/ready` responde HTTP 200.
- Revisión responsive a 390 px documentada en [`output/playwright/phase10-mobile.png`](../output/playwright/phase10-mobile.png).

## Puerta G10

Para aprobar G10, el dueño selecciona un período de prueba en **Reportes** y confirma que las operaciones individuales explican cargos/cobros, el COGS no duplica compras, comisiones y liquidaciones están separadas, y resultado/flujo coinciden con el [diccionario](38-diccionario-metricas.md). Hasta entonces Fase 11 permanece bloqueada.
