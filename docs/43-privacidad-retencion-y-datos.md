# Privacidad, retención y respuesta sobre datos

## Datos permitidos

- Cliente: nombre, teléfono normalizado y nota estrictamente operativa.
- Personal: usuario, roles, vínculo laboral y datos mínimos para operar.
- Negocio: citas, atenciones, pagos CASH/QR, inventario, gastos, comisiones, liquidaciones y auditoría.
- Técnicos: request ID, estado HTTP, duración, versión y métricas sin PII.

No recoger documento de identidad, fecha de nacimiento, fotografía, dato médico, tarjeta, ubicación ni contactos del dispositivo. Un campo libre nunca debe contener credenciales o información médica.

## Clasificación y acceso

| Clase | Ejemplos | Acceso |
|---|---|---|
| Restringido | contraseña/hash, cookie, token, claves, backup | Identity/plataforma; nunca UI/log |
| Confidencial | teléfono, nota, historial de cliente | dueño/admin y barbero sólo cuando su tarea lo requiere |
| Económico | cobros, gastos, comisiones, liquidaciones | dueño; administración según operación definida |
| Operativo | servicio, horario, disponibilidad | personal; subconjunto público sin PII |
| Técnico | SHA, request ID, latencia | operación/desarrollo autorizado |

## Política propuesta antes de producción

- Token público: hash hasta 48 h después de la cita; revocación al cancelar y rotación al reprogramar.
- Sesión: cookie de 8 h con validación de sello cada 5 min; revocación por cambio de contraseña/rol o desactivación.
- Logs/Sentry/trazas: 30 días como punto inicial, sin cuerpos ni PII.
- Backups: diarios 35 días y una copia mensual por 12 meses como propuesta, cifrados y fuera del servicio.
- Citas/economía/auditoría: conservar durante el plazo que aprueben dueño y asesor aplicable; no borrar movimientos para satisfacer una solicitud.
- Cliente sin vínculo histórico obligatorio: anonimizar nombre/teléfono/notas después del plazo aprobado, preservando referencias económicas agregadas.

Los plazos de logs/backups y la regla de anonimización son una propuesta técnica, no una conclusión legal. Deben aprobarse antes de datos reales según jurisdicción y obligaciones del negocio.

## Solicitud de acceso, corrección o eliminación

1. El dueño verifica la identidad por un canal acordado; el teléfono por sí solo no autoriza acceso remoto.
2. Localiza datos por herramientas internas, registra request ID/actor y evita exportar información de homónimos.
3. Corrige datos maestros sin reescribir operaciones históricas.
4. Si procede eliminación, anonimiza datos personales; conserva importes, estados, inventario, comisión y auditoría necesarios.
5. Registra alcance, decisión, fecha y resultado sin copiar más PII a tickets/logs.

## Incidente de privacidad

Revocar sesiones/tokens comprometidos, preservar evidencia, identificar campos/personas/ventana temporal, cerrar el acceso, restaurar integridad si aplica y obtener asesoramiento para notificaciones. No compartir dumps o capturas con datos reales en GitHub, chat o documentación.
