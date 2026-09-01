# Evidencia de Fase 1 — G1

**Estado:** `ACCEPTANCE`  
**Release objetivo:** R0 — Esqueleto desplegable

## Evidencia automatizada

| Criterio | Evidencia | Estado |
|---|---|---|
| AC-01-01 Compose inicia DB/API/web | construcción real y healthchecks del 31-08-2026 | VERIFIED |
| AC-01-02 readiness depende de DB; liveness no | prueba controlada DB abajo: live `200`, ready `503`; recuperación ready `200` | VERIFIED |
| AC-01-03 núcleo sin frameworks | 2/2 pruebas estáticas de referencias mediante metadatos PE | VERIFIED |
| AC-01-04 PWA instalable y mutación offline bloqueada | manifest/SW, iconos PNG 192/512, prueba Playwright offline y captura móvil | VERIFIED local; instalación manual pendiente |
| AC-01-05 runtime sin SDK/secretos y no root | API uid `1654`, web uid `1000`, SDK ausente y metadatos/historial revisados | VERIFIED local |
| AC-01-06 CI parte de cero | workflow de backend, frontend, iconos reproducibles, imágenes, escaneo y smoke test de Compose | IMPLEMENTED; ejecución remota pendiente |
| AC-01-07 ProblemDetails consistente con requestId | integración automatizada y `404 application/problem+json` externo con `requestId` | VERIFIED local |

## Decisiones de alcance

- La migración inicial es deliberadamente vacía: crea la línea base técnica sin inventar tablas de negocio antes de Fase 2.
- No se habilitan mutaciones offline ni una cola de sincronización.
- OpenAPI solo se expone en Development.
- PostgreSQL queda en red privada en el Compose base.

## Pendientes para aprobar G1

1. Confirmar el diálogo de instalación en un teléfono o navegador compatible; el funcionamiento offline y el bloqueo ya fueron verificados con Playwright.
2. Ejecutar el workflow remoto en el repositorio GitHub elegido.
3. Definir y desplegar el staging técnico; requiere proveedor/destino de despliegue.

G1 no se considera aprobada hasta completar estos puntos, aunque el código local compile.

## Verificación local del 31 de agosto de 2026

- .NET Release: 0 advertencias, 0 errores.
- Pruebas .NET: 7/7 correctas.
- Frontend desde `npm ci`: formato, ESLint/Oxlint, 2/2 pruebas, PWA y Storybook correctos.
- Auditorías: NuGet y npm sin vulnerabilidades conocidas reportadas.
- Playwright: vista 390×844 correcta, 0 errores/advertencias de consola, shell disponible offline y mutación bloqueada.
- Evidencia visual: `output/playwright/fase-1-pwa-mobile.png`.

### Verificación Docker real del 31 de agosto y 1 de septiembre de 2026

- Las imágenes de API, migrador y web se construyeron correctamente.
- PostgreSQL 18.6 inició, recuperó el volumen persistente y alcanzó estado saludable.
- La migración terminó con código `0` y confirmó que la base estaba actualizada.
- La API inició en Production, respondió readiness contra PostgreSQL y Docker la marcó saludable.
- Caddy inició y sirvió la PWA después de la salud de la API.
- Se corrigieron y reconstruyeron las advertencias accionables: biblioteca `krb5-libs` para Npgsql/Alpine, puerto redundante, redirección HTTPS explícita por entorno, formato de Caddy y escaneo EF vacío.
- Los avisos de HTTP/2 y HTTP/3 sin TLS son esperables en el Compose local; TLS se resolverá en el borde del entorno desplegado.
- La red `backend` permanece interna; la web usa además `edge` y es el único servicio publicado, limitado a `127.0.0.1:8088`.
- Verificación HTTP externa: PWA, liveness, readiness, manifest y service worker respondieron `200`; una ruta API inexistente respondió `404 application/problem+json` con `requestId`.
- Verificación de fallo: al detener PostgreSQL, liveness permaneció `200` y readiness cambió a `503`; tras restaurarlo readiness regresó a `200`.
- Suite posterior a las correcciones: .NET 7/7, frontend 2/2, formato y analizadores sin hallazgos, build PWA correcto.
- Docker Scout sobre las imágenes finales: API `0C/0H` y web `0C/0H`. El OpenSSL vulnerable de las bases originales fue actualizado a `3.5.8-r0`.
- La imagen web final usa Caddy `2.11.4` recompilado con Go `1.26.7` y dependencias corregidas; el manifest se sirve como `application/manifest+json`.
- El manifest declara `id`, iconos PNG `192x192` y `512x512` más fallback SVG; los PNG se generan de forma reproducible con `npm run icons:generate` y CI rechaza diferencias.
- La imagen web reconstruida sirve ambos PNG como `image/png`; PWA, manifest, service worker, liveness y readiness responden `200`.
- CI incluye una prueba desde cero del Compose completo, recursos PWA, usuarios runtime no root y semántica `live=200`/`ready=503` durante pérdida de PostgreSQL; la misma secuencia fue validada localmente el 1 de septiembre de 2026.

AC-01-01, AC-01-02 y AC-01-05 quedan verificados localmente, incluido el escaneo de vulnerabilidades. La fase entra en `ACCEPTANCE`; G1 continúa pendiente de CI remoto, staging e instalación manual de la PWA.

Observaciones no bloqueantes: ESLint 9 se mantiene fijado porque los plugins actuales de accesibilidad/imports aún rechazan ESLint 10; `npm audit` reporta 0 vulnerabilidades. Storybook advierte sobre chunks grandes de su entorno de diseño, no del bundle productivo de la PWA.
