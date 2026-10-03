# ADR-020 — Sentry como única herramienta de observabilidad

**Estado:** Accepted  
**Fecha:** 3 de octubre de 2026  
**Reemplaza:** la parte de OpenTelemetry/OTLP de [ADR-019](ADR-019-observabilidad-y-borde-productivo.md)

## Contexto

ADR-019 dejó dos adaptadores de observabilidad: Sentry y OpenTelemetry con exportador OTLP. OTLP solo aporta valor con un colector y un backend de trazas o métricas (Grafana, Jaeger, etc.), y una barbería de una sola sucursal no justifica operar esa infraestructura. Sin endpoint configurado, OpenTelemetry instrumentaba cada petición sin exportar nada: costo de dependencias y actualizaciones sin beneficio.

## Decisión

- Se retiran OpenTelemetry y el exportador OTLP de la API.
- Sentry sigue siendo el único adaptador de observabilidad. Se activa solo con DSN, mantiene `SendDefaultPii=false`, elimina `Cookie`, `X-CSRF-TOKEN` y `X-Management-Token` y cubre errores y trazas de rendimiento muestreadas (`Sentry:TracesSampleRate`).
- Los logs JSON estructurados y el `requestId` en cada respuesta no cambian.
- El resto de ADR-019 (Caddy como único borde público, cabeceras reenviadas explícitas, sin PII en métricas ni eventos) sigue vigente.

## Consecuencias

Menos dependencias y menos superficie de actualización. Se pierden las métricas de runtime vía OTLP, que no se estaban recolectando. Si en el futuro se necesitan métricas o trazas distribuidas, se reintroduce OpenTelemetry con un ADR nuevo que defina el colector y quién lo opera.
