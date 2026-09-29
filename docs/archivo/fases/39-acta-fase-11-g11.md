# Fase 11 — Reserva pública y madurez PWA

**Fecha:** 9 de septiembre de 2026 (America/La_Paz)  
**Estado:** `ACCEPTANCE-DEFERRED` — implementación y validación técnica completas  
**Puerta G11:** prueba humana aplazada por decisión del dueño hasta disponer de despliegue  
**Entrada:** G6 estable y G10 aprobada; ejecución local bajo la excepción vigente, sin Railway.

## Resultado

`/reservar` permite reservar sin cuenta con servicio, preferencia de barbero, fecha, horario, nombre y teléfono. `/mi-cita#token` consulta, reprograma o cancela sólo esa cita. El backend comparte el motor autoritativo de disponibilidad, revalida dentro de la misma transacción de agenda y no acepta precio/duración del navegador. Desde el 9 de septiembre de 2026, `/book` y `/book/manage#token` permanecen como redirecciones compatibles.

## Entregables y criterios

| Elemento | Estado | Evidencia |
|---|---|---|
| ENT-11-01 / AC-11-01/02 | Verificado | flujo móvil y carrera HTTP: una creación, un `SLOT_TAKEN` |
| ENT-11-02 / AC-11-03/04 | Verificado | 256 bits, hash único, expiración, fragmento/cabecera, rotación/revocación y 404 común |
| ENT-11-03 / AC-11-08 | Verificado técnicamente | manifest, iconos 192/512 maskable, standalone, shortcuts y SW generados |
| ENT-11-04 / AC-11-05 | Verificado | lectura pública cacheable marcada; mutaciones/gestión Network Only y botones offline bloqueados |
| ENT-11-05 / AC-11-06 | Verificado | actualización `prompt`, sin `skipWaiting`/`clientsClaim` automáticos; [política](../../tecnica/40-politica-pwa-cache-actualizacion.md) |
| AC-11-07 | Verificado técnicamente | etiquetas/foco/objetivos táctiles y layout móvil; falta prueba humana G11 |

El incremento opcional de medición de abandono no fue activado: requería aprobación específica y no se añadió rastreo invasivo.

## Verificación técnica

- Build .NET 10 Release sin advertencias; 62 pruebas de dominio, 9 de Application y 2 de arquitectura aprobadas.
- `PhaseElevenEndpointTests` aprobado sobre PostgreSQL 18: catálogo mínimo, antiforgery, concurrencia, privacidad, token, gestión, no enumeración y rate limit.
- Migración `20260909111737_AddPublicBookingManagement` probada desde base vacía.
- PWA: TypeScript estricto, lint, Prettier, 29 pruebas Vitest y build Workbox aprobados.
- Compose reconstruido: PostgreSQL, API y web quedaron `healthy`; `GET /health/ready` respondió `200 Healthy`.
- Playwright validó la reserva pública a 390 × 844, sin errores ni advertencias durante el flujo conectado. El service worker tomó control después de su instalación y la recarga sin red conservó el shell y el catálogo, mostró el aviso offline y no habilitó mutaciones. [Captura móvil](../../../output/playwright/phase11-public-mobile.png).
- La inspección del artefacto final confirmó modo standalone, iconos 192/512, shortcut de reserva, rutas cacheables explícitas y ausencia de Background Sync.

## Puerta G11

Abrir `/reservar` en teléfono, completar una reserva sin explicación, guardar el enlace, reprogramar y cancelar. Repetir brevemente sin red para comprobar que ninguna mutación se confirma y aceptar una actualización sólo al terminar la tarea. Con esa validación el dueño puede aprobar G11 y habilitar Fase 12.

El 9 de septiembre de 2026 el dueño decidió dejar esta prueba pendiente porque la aplicación aún no está desplegada y autorizó continuar Fase 12 en local. Esta excepción habilita trabajo técnico de hardening, pero no equivale a aprobar G11 ni sustituye la validación posterior en un entorno accesible para clientes.
