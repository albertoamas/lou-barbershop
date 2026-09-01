# Backlog operativo inicial

**Estado de baseline:** aprobado para preparar la Fase 0  
**Fuente:** requisitos, historias y plan maestro  
**Unidad de planificación:** historia funcional o habilitador técnico con evidencia propia

El backlog ejecutable está también disponible en [backlog/backlog-mvp.csv](backlog/backlog-mvp.csv). El CSV sirve para importar a una herramienta de trabajo; este documento conserva contexto y reglas de uso.

## 1. Flujo de estados

```text
PENDING → READY → IN_PROGRESS → REVIEW → ACCEPTANCE → DONE
                    ↘ BLOCKED ↗
```

- `PENDING`: depende de una puerta anterior o aún no cumple Definition of Ready.
- `READY`: puede tomarse sin decisión faltante.
- `IN_PROGRESS`: tiene un responsable activo.
- `REVIEW`: código/artefacto terminado y en revisión técnica.
- `ACCEPTANCE`: técnicamente aprobado; falta aceptación funcional.
- `DONE`: criterios demostrados y puerta correspondiente aprobada.
- `BLOCKED`: impedimento explícito, responsable y acción registrados.

No se permite `DONE` sin evidencia de los criterios de aceptación.

## 2. Habilitadores técnicos

| ID | Fase | Prioridad | Tamaño | Elemento | Dependencias | Estado inicial | Evidencia principal |
|---|---:|---:|:---:|---|---|---|---|
| TEC-001 | 0 | P0 | S | Gobierno, convenciones y baseline | — | DONE | ENT-00-01–04 |
| TEC-002 | 0 | P0 | M | Wireframes de seis flujos | TEC-001 | DONE | ENT-00-05 / AC-00-05 |
| TEC-010 | 1 | P0 | M | Inicializar repositorio y solución .NET | G0 | DONE | AC-01-03/06 |
| TEC-011 | 1 | P0 | M | Crear PWA React/Vite y límites frontend | G0 | DONE | AC-01-04 |
| TEC-012 | 1 | P0 | M | Dockerfiles, Compose y PostgreSQL | TEC-010–011 | IN_PROGRESS | AC-01-01/02/05 |
| TEC-013 | 1 | P0 | M | API Controllers, ProblemDetails y OpenAPI | TEC-010 | DONE | AC-01-07 |
| TEC-014 | 1 | P0 | M | CI, analyzers, lint y pruebas de arquitectura | TEC-010–013 | DONE | AC-01-03/06 |
| TEC-015 | 1 | P0 | S | Staging técnico, health y observabilidad base | TEC-012–014 | IN_PROGRESS | ENT-01-05 |
| TEC-020 | 2 | P0 | L | Value objects, estados y políticas puras | G1 | PENDING | AC-02-01–04 |
| TEC-021 | 2 | P0 | L | Puertos, EF Core, migraciones y concurrencia | TEC-020 | PENDING | AC-02-05/06 |
| TEC-090 | 12 | P0 | L | Hardening, threat model y seguridad | G10, G11 | PENDING | AC-12-01–03 |
| TEC-091 | 12 | P0 | M | Rendimiento, accesibilidad y compatibilidad | G10, G11 | PENDING | AC-12-05/08 |
| OPS-001 | 12 | P0 | M | Backup, restauración, alertas y runbooks | TEC-090 | PENDING | AC-12-04/07 |
| OPS-010 | 13 | P0 | L | Migración real y dry runs | G12 | PENDING | AC-13-01–05 |
| OPS-011 | 13 | P0 | L | Capacitación, piloto y go-live | OPS-010 | PENDING | AC-13-06–08 |

## 3. Historias funcionales

| ID | Fase | Prioridad | Tamaño | Dependencias principales | Estado | Puerta |
|---|---:|---:|:---:|---|---|---|
| HU-001 | 3 | P0 | M | G2, TEC-021 | PENDING | G3 |
| HU-002 | 3–4 | P0 | M | HU-001 | PENDING | G4 |
| HU-003 | 4 | P0 | M | HU-002 | PENDING | G4 |
| HU-004 | 5 | P0 | M | HU-002 | PENDING | G5 |
| HU-010 | 6 | P0 | M | G5 | PENDING | G6 |
| HU-011 | 5 | P0 | L | HU-003–004 | PENDING | G5 |
| HU-012 | 6 | P0 | L | HU-010–011 | PENDING | G6 |
| HU-013 | 6 | P0 | M | HU-012 | PENDING | G6 |
| HU-014 | 6 | P0 | S | HU-012 | PENDING | G6 |
| HU-015 | 6 | P0 | M | HU-001, HU-012 | PENDING | G6 |
| HU-016 | 11 | P1 | L | G6, TEC-090 base | PENDING | G11 |
| HU-020 | 7 | P0 | M | G6 | PENDING | G7 |
| HU-021 | 7 | P0 | M | HU-020 | PENDING | G7 |
| HU-022 | 8 | P0 | M | HU-024, HU-030 | PENDING | G8 |
| HU-023 | 7 | P0 | M | HU-021 | PENDING | G7 |
| HU-024 | 7 | P0 | L | HU-021, HU-023 | PENDING | G7 |
| HU-025 | 9 | P1 | L | HU-024, HU-043 | PENDING | G9 |
| HU-030 | 8 | P0 | L | G7, HU-003 | PENDING | G8 |
| HU-031 | 8 | P1 | M | HU-030 | PENDING | G8 |
| HU-032 | 8 | P0 | M | G7 | PENDING | G8 |
| HU-040 | 4 | P0 | M | HU-002 | PENDING | G4 |
| HU-041 | 9 | P1 | M | HU-024, HU-040 | PENDING | G9 |
| HU-042 | 9 | P0 | L | HU-041 | PENDING | G9 |
| HU-043 | 9 | P0 | M | HU-042 | PENDING | G9 |
| HU-050 | 10 | P0 | M | G8, G9 | PENDING | G10 |
| HU-051 | 10 | P1 | L | HU-050 | PENDING | G10 |
| HU-052 | 10 | P1 | M | HU-050 | PENDING | G10 |
| HU-053 | 10 | P2 | S | HU-051–052 | PENDING | diferible formalmente |

Los títulos y criterios completos están en [04-historias-de-usuario.md](04-historias-de-usuario.md). La fase no reemplaza la prioridad: una historia P1 puede ser necesaria para la puerta de su release si el plan maestro así lo exige.

## 4. Orden de ejecución inmediato después de G0

1. TEC-010 — repositorio y solución.
2. TEC-011 — PWA y límites frontend.
3. TEC-012 — Docker/DB.
4. TEC-013 — host API.
5. TEC-014 — calidad/CI.
6. TEC-015 — staging.
7. TEC-020 y TEC-021 — núcleo y persistencia.

## 5. Reglas del tablero

- Un responsable activo por elemento.
- Máximo recomendado de dos elementos `IN_PROGRESS` por desarrollador.
- Bloqueo visible en el mismo día en que se detecta.
- Los habilitadores no pueden acumular infraestructura sin un slice próximo que la utilice.
- La deuda técnica tiene ID, riesgo, criterio de cierre y fase; no queda en comentarios dispersos.
- Un cambio de alcance actualiza CSV, plan maestro y trazabilidad en el mismo PR.
