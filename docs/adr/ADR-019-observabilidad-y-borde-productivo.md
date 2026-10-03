# ADR-019 — Observabilidad opcional y borde productivo único

**Estado:** Accepted; la parte de OpenTelemetry/OTLP fue reemplazada por [ADR-020](ADR-020-sentry-como-unica-observabilidad.md)  
**Fecha:** 9 de septiembre de 2026

## Contexto

La aplicación se ejecutará en contenedores y más adelante se desplegará en Railway. Las reglas no deben depender de un proveedor de observabilidad ni confiar ciegamente en cabeceras externas.

## Decisión

- Caddy es el único borde HTTP público; API y PostgreSQL permanecen privados.
- HSTS/TLS y host exacto son obligatorios en el despliegue. Forwarded headers se habilitan explícitamente, aceptan un salto y sólo cuando la red impide acceso directo a API.
- API emite JSON logs, request ID y telemetría estándar OpenTelemetry. El exportador OTLP se activa únicamente con endpoint configurado.
- Sentry es un adaptador opcional activado sólo con DSN; `SendDefaultPii=false` permanece fijo.
- Domain/Application no importan OpenTelemetry, Sentry, Caddy ni APIs de hosting.
- Métricas no usan teléfono, nombre, token, cookie, cuerpos ni identificadores de cliente como etiquetas.

## Consecuencias

Local funciona sin terceros. Cambiar Sentry/OTLP o el host no altera reglas de negocio. La operación productiva no queda aprobada hasta configurar dominio, TLS, secretos, paneles y alertas y verificar que API no sea públicamente enrutable.
