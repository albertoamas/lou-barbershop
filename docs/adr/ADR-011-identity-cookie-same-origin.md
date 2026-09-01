# ADR-011 — ASP.NET Core Identity con cookie same-origin

- **Estado:** Accepted
- **Fecha:** 2026-08-31
- **Fase:** 0

## Contexto

Los usuarios internos son dueño, administración y barberos. La PWA se sirve detrás del mismo dominio que la API mediante reverse proxy. No hay necesidad de tokens reutilizables por terceros en el MVP.

## Decisión

Usar ASP.NET Core Identity como adaptador de cuentas internas y sesión mediante cookie segura:

- `HttpOnly` y `Secure` en producción;
- `SameSite` apropiado al flujo same-origin;
- antiforgery en mutaciones autenticadas por cookie;
- políticas/capacidades del servidor además de roles;
- Data Protection keys persistentes fuera del filesystem efímero;
- revocación al desactivar usuario o cambiar credenciales por seguridad.

La identidad técnica queda en Infrastructure. Domain trabaja con `ActorId`, capacidades y contexto abstracto; no importa tipos Identity.

La reserva pública no crea cuenta. Usa token aleatorio por cita, cuyo hash se almacena y cuyo valor en claro no aparece en logs.

## Razones

- Reduce exposición de tokens a JavaScript.
- Encaja con PWA y API en el mismo origen.
- Proporciona almacenamiento seguro de contraseñas y ciclo de cuenta probado.
- Evita construir autenticación propia.

## Alternativas rechazadas

- **JWT en localStorage:** aumenta impacto de XSS y complejidad de revocación.
- **OAuth/OIDC externo desde el inicio:** dependencia/costo innecesario para pocas cuentas internas; puede agregarse como adaptador futuro.
- **Autenticación personalizada:** riesgo sin beneficio.

## Consecuencias

- Proxy y despliegue deben conservar HTTPS, host y forwarded headers.
- Mutaciones requieren protección CSRF/antiforgery.
- PWA y API se despliegan bajo un origen lógico.
- CORS no se usa como mecanismo de seguridad y no será permisivo.

## Verificación

- Pruebas de login/logout, expiración, usuario inactivo y revocación.
- Matriz de permisos positiva/negativa.
- Prueba detrás del proxy de staging.
- Escaneo de logs/bundle para secretos, cookies y tokens.

