# Acta de Fase 2 y puerta G2

**Fecha:** 1 de septiembre de 2026  
**Fase:** 2 — Núcleo de dominio y persistencia  
**Estado:** `DONE`  
**Aceptación:** propietario/usuario del proyecto, para entorno local.

## Entregables

| Entregable | Evidencia | Resultado |
|---|---|---|
| ENT-02-01 | Objetos de valor y políticas puras en `LouBarbershop.Domain` | Completo |
| ENT-02-02 | Puertos Application y adaptadores de reloj, GUID, actor y EF | Completo |
| ENT-02-03 | `AppDbContext`, concurrencia, auditoría y migraciones incrementales | Completo |
| ENT-02-04 | Pruebas de dinero, rango, estados, totales, comisión y costo promedio | Completo |
| ENT-02-05 | [Contrato ProblemDetails](08-api.md) y fábrica central de errores | Completo |

## Criterios de aceptación

| Criterio | Evidencia | Resultado |
|---|---|---|
| AC-02-01 | `Money`, `CommissionRate`, totales y costo promedio usan enteros; no `double`/`float` | Cumple |
| AC-02-02 | `CommissionRate` es un valor inmutable en puntos base, apto para congelar tasa histórica | Cumple |
| AC-02-03 | Máquinas de estado devuelven resultado explícito y no modifican estado en transición prohibida | Cumple |
| AC-02-04 | 34 pruebas de dominio ejecutadas sin host web ni base de datos | Cumple |
| AC-02-05 | Migraciones base, clientes y auditoría aplicadas desde historial anterior en PostgreSQL local; prueba Testcontainers incluida | Cumple |
| AC-02-06 | Domain/Application no dependen de EF ni ASP.NET; pruebas de arquitectura verdes | Cumple |

## Verificación de cierre

- Domain: 34 pruebas correctas.
- Application y arquitectura: 3 pruebas correctas.
- API/Infrastructure: compilación Release sin advertencias ni errores.
- `docker compose up --build --wait`: migrador completó, PostgreSQL/API/PWA
  quedaron saludables en `http://localhost:8088`.
- Las migraciones `InitialTechnicalBaseline`, `AddCustomerFoundation` y
  `AddAuditLog` quedan en secuencia incremental.

## Resultado formal

G2 está **aprobada** para el entorno local. La Fase 3 queda habilitada por su
dependencia G2. G1 continúa separado en `ACCEPTANCE`; no hay aprobación de
staging, despliegue externo ni instalación manual de PWA implícita en esta acta.
