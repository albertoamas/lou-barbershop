# Evidencia de avance — Fase 2

**Fecha:** 2026-09-01  
**Estado de Fase 2:** `DONE`  
**Alcance de esta evidencia:** implementación local aceptada mediante G2.

Este trabajo se realiza bajo la excepción documentada en
[25-excepcion-g1-local.md](25-excepcion-g1-local.md). No convierte G1 en
`DONE`, no realiza un despliegue externo y no usa datos reales.

## Entregado en este incremento

- Resultado explícito de dominio: `DomainResult<T>` y catálogo de errores de
  negocio, sin excepciones para flujos esperables de validación.
- Objetos de valor inmutables: `Money` en centavos, `CommissionRate` en puntos
  base, `TimeRange` UTC, `PhoneNumber` E.164 y `Quantity` positiva.
- Comisión con redondeo *half-up* por ítem, incluido el caso de tasa cero, sin
  `float` ni `double`.
- Máquinas de estado explícitas para cita, operación de venta, comisión y
  liquidación. Una transición no permitida devuelve `DOMAIN_INVALID_STATE_TRANSITION`.
- Políticas puras de total neto (subtotal − descuento − cortesía) y costo
  promedio ponderado, ambas protegidas frente a importes inválidos/desbordes.
- Puertos de Application: reloj, generador de identificadores, actor actual y
  unidad de trabajo; Infrastructure provee adaptadores de reloj, GUID y EF Core.
- Base de auditoría técnica sin valores personales: entidad, acción, actor
  disponible, instante UTC y correlación de solicitud cuando el flujo la provea.
- El contenedor de inyección registra los adaptadores sin introducir
  dependencias de ASP.NET Core o EF Core en Domain/Application.
- Persistencia incremental de `Customer` (UUID, E.164, borrado lógico e
  índices) y de auditoría técnica mínima. La auditoría solo registra tipo de
  entidad, acción, identidad técnica disponible e instante UTC; no guarda datos
  personales, secretos ni tokens.
- Conversión central de errores de dominio a `ProblemDetails` con `code` y
  `requestId` estables.
- 34 pruebas de dominio para dinero, comisión, rangos, teléfonos, clientes,
  transiciones, totales y costo promedio; pruebas de arquitectura, API e
  integración de migraciones contra PostgreSQL.

## Verificación local

| Verificación | Resultado |
|---|---|
| Compilación de Domain, Application, Infrastructure y API | Correcta, 0 advertencias / 0 errores |
| Pruebas de dominio | 34 superadas, 0 fallidas |
| Pruebas Application y arquitectura | 3 superadas, 0 fallidas |
| `docker compose up --build --wait` | Migraciones base, clientes y auditoría aplicadas; PostgreSQL, API y PWA saludables |

## Alcance diferido de forma intencional

- Agenda, catálogo, operaciones, pagos, inventario operativo y comisiones
  persistidas empiezan en sus fases asignadas y no son pendientes de Fase 2.

La excepción local de G1 continúa vigente y no autoriza despliegue.
