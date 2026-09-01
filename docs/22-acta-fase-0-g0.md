# Acta de Fase 0 y puerta G0

**Fecha:** 31 de agosto de 2026  
**Fase:** 0 — Baseline y preparación ejecutiva  
**Estado actual:** `DONE`  
**Entrada autorizada por:** propietario/usuario del proyecto

## 1. Entregables

| Entregable | Evidencia | Estado |
|---|---|---|
| ENT-00-01 Plan maestro | [17-plan-maestro-fases.md](17-plan-maestro-fases.md) | Aprobado |
| ENT-00-02 Backlog operativo | [18-backlog-operativo.md](18-backlog-operativo.md) y [CSV](backlog/backlog-mvp.csv) | Completo |
| ENT-00-03 ADR técnicos | [Registro ADR](adr/README.md) | Completo |
| ENT-00-04 Releases/responsables | Plan maestro secciones 3, 5 y 21 | Completo |
| ENT-00-05 Wireframes críticos | [21-wireframes-flujos-criticos.md](21-wireframes-flujos-criticos.md) | Aprobado |

Artefactos de apoyo:

- [Convenciones](19-convenciones-trabajo.md)
- [Datos ficticios](20-datos-ficticios.md)
- [AGENTS.md](../AGENTS.md)
- [Plantilla de PR](../.github/PULL_REQUEST_TEMPLATE.md)

## 2. Criterios AC-00

| Criterio | Evidencia | Resultado |
|---|---|---|
| AC-00-01 Todo RF/HU tiene fase | auditoría automatizada del plan: 46 RF y 28 HU sin faltantes | Cumple |
| AC-00-02 Cada fase tiene entradas/salidas | plan maestro fases 0–14 | Cumple |
| AC-00-03 Arquitectura/stack/plan coherentes | ADR-010–012 y docs 07/14/15 | Cumple |
| AC-00-04 Fuera de MVP separado | documento 01 y backlog | Cumple |
| AC-00-05 Dueño reconoce seis flujos | wireframes sección 8 y aprobación del 31 de agosto de 2026 | Cumple |

## 3. Decisiones cerradas

- ASP.NET Core 10 Web API con Controllers delgados.
- ASP.NET Core Identity y cookie same-origin.
- Monorepo con Clean Architecture y SOLID.
- React/Vite como PWA; mutaciones críticas online.
- PostgreSQL 18, EF Core/Npgsql como adaptadores.
- Docker/Compose como entorno reproducible.
- Código técnico en inglés e interfaz/documentación de negocio en español.
- Fase 1 no comienza hasta aprobar AC-00-05.

## 4. Cierre de G0

El propietario aprobó continuar después de revisar los entregables. `TEC-001` y `TEC-002` están `DONE`; `TEC-010` y `TEC-011` pasan a `READY`; comienza la Fase 1.

## 5. Resultado formal

G0 está **aprobada**. La Fase 0 está cerrada y la Fase 1 habilitada.
