# ADR-018 — Token público en fragmento web y cabecera API

**Estado:** Accepted  
**Fecha:** 9 de septiembre de 2026

## Contexto

La reserva pública no usa cuenta. Su enlace privado debe autorizar sólo una cita, pero un token colocado en ruta o query puede aparecer en logs de proxy, historial de servidor y telemetría. El teléfono no puede actuar como credencial.

## Decisión

- Emitir 32 bytes aleatorios codificados como Base64URL y entregarlos una sola vez al crear/reprogramar.
- Guardar únicamente SHA-256 del token con índice único y caducidad 48 horas después de la cita.
- Usar `/mi-cita#token` en la PWA: el fragmento no viaja en la petición HTTP. La ruta histórica `/book/manage#token` redirige conservando el fragmento.
- Enviar el token a endpoints fijos mediante `X-Management-Token`; nunca ruta o query string.
- Rotar al reprogramar, revocar al cancelar y responder con un 404 indistinguible para token inválido/vencido/revocado.
- Mantener antiforgery same-origin, rate limit por IP y revalidación transaccional de disponibilidad.

## Consecuencias

El cliente debe conservar el enlace; no existe recuperación automática por teléfono en el MVP. Los endpoints de gestión no se cachean y el token vive sólo en memoria/fragmento del navegador. Una integración futura de mensajería podrá reenviar un enlace nuevo mediante un flujo de identidad aprobado, sin cambiar las reglas de agenda.
