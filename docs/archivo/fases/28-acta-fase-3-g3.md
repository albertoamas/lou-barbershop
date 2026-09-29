# Acta de Fase 3 y puerta G3

**Fecha:** 2 de septiembre de 2026  
**Estado:** `DONE`  
**Puerta:** G3 aprobada para iniciar Fase 4  
**Dependencia:** G2 aprobada; G1 permanece en `ACCEPTANCE` por staging diferido

## 1. Resultado

La aplicación ya dispone de autenticación interna same-origin, autorización por capacidades y administración básica de cuentas. Las reglas se ejecutan en el servidor; la PWA solo representa el estado autorizado. `ICurrentActor` obtiene el identificador de la cookie autenticada sin introducir ASP.NET Core en Domain o Application.

La identidad técnica está aislada en Infrastructure: `users`, roles, hash, sellos y bloqueos no contienen el perfil humano. `staff_profiles` y `barber_profiles` se desarrollan en Fase 4, evitando convertir la cuenta de acceso en el modelo laboral.

## 2. Entregables

| Entregable | Resultado | Evidencia |
|---|---|---|
| ENT-03-01 Autenticación | Cookie `HttpOnly`, `Secure`, `SameSite=Lax`, login/logout/me, expiración, lockout y rate limit | `AuthController`, `Program`, PWA de login y `IdentityEndpointTests` |
| ENT-03-02 Autorización | Políticas `manage-users`, `manage-catalog` y `manage-operations`; autenticación precede autorización | `AuthorizationPolicies` y prueba 401/403 |
| ENT-03-03 Usuarios | Crear, consultar, activar, desactivar, cambiar roles y restablecer contraseña; solo OWNER | `UsersController` y prueba HTTP real |
| ENT-03-04 Matriz automatizada | OWNER positivo; BARBER negativo; anónimo, CSRF, inactivo, reset, recuperación y sesión revocada | 3 pruebas de identidad sobre PostgreSQL real |
| ENT-03-05 Procedimiento | Bootstrap y recuperación sin secretos versionados | sección 3 de `09-seguridad-roles-y-auditoria.md` |

## 3. Criterios de aceptación

| Criterio | Estado | Demostración |
|---|---|---|
| AC-03-01 inválido/inactivo no accede ni enumera | Cumple | ambos devuelven 401 genérico; lockout 5 intentos/15 min |
| AC-03-02 barbero no accede a recursos ajenos | Cumple en el alcance disponible | BARBER recibe 403 en `/api/v1/users`; las políticas de propiedad quedan listas para los recursos de Fases 5–9 |
| AC-03-03 dueño conserva OWNER + BARBER | Cumple | bootstrap idempotente y aserción sobre `/api/v1/auth/me` |
| AC-03-04 pipeline correcto | Cumple | `UseAuthentication()` precede `UseAuthorization()`; anónimo recibe 401 |
| AC-03-05 no hay secretos en repositorio/log/bundle | Cumple | Secret Manager/variables efímeras, cookie HttpOnly, búsqueda de secretos y logs sin cuerpos/credenciales |
| AC-03-06 cookie y antiforgery detrás del proxy | Cumple localmente por excepción aprobada | flujo PWA validado a través de Caddy en `http://localhost:8088`; solo Compose local usa `SameAsRequest`, mientras producción conserva `Secure=Always`; staging/Railway sigue diferido |

## 4. Persistencia y seguridad

- ASP.NET Core Identity vive solo en API/Infrastructure.
- Tablas y columnas Identity se normalizaron a `lou.users`, `roles`, `user_roles` y nombres `snake_case` mediante migración incremental no destructiva.
- Las claves de Data Protection se conservan en el volumen `data_protection_keys`.
- La imagen prepara ese volumen con el UID no privilegiado del API; Compose comprobó lectura/escritura después de recrearlo.
- Cambiar rol, contraseña o estado renueva el sello; la validación de cada petición rechaza cookies revocadas.
- Todas las mutaciones MVC exigen antiforgery; el token de petición no se persiste en Web Storage.
- Login aplica límite específico de 5 solicitudes cada 15 minutos por IP, además del límite global.
- Los eventos registran resultado e identificador técnico cuando corresponde, nunca usuario escrito, contraseña ni token.
- Se corrigió el mapeo de concurrencia de clientes para usar el `xmin` nativo de PostgreSQL.
- El service worker usa actualización automática para no dejar una versión anterior del acceso activa después de desplegar un bundle nuevo.

## 5. Validación ejecutada

La aceptación se cierra únicamente después de ejecutar:

```text
dotnet format --verify-no-changes
dotnet build -c Release
dotnet test -c Release
npm run format:check
npm run lint
npm run test -- --run
npm run build
npm run build-storybook
docker compose config
docker compose up --build -d
docker compose ps
Navegador real: redirección anónima, rechazo genérico a credenciales ficticias y viewport móvil 390×844
```

Las pruebas de integración levantan PostgreSQL 18 con Testcontainers y aplican desde cero las seis migraciones vigentes. La matriz de identidad prueba la API completa con cookies seguras y antiforgery, no dobles aislados del controlador. La recuperación OWNER se ejecuta de forma idempotente en esa base aislada.

Resultado final: 45 pruebas backend (34 Domain, 1 Application, 2 arquitectura y 8 integración) y 4 pruebas frontend, todas aprobadas; build .NET, PWA de producción y Storybook completados. Compose quedó con `db`, `api` y `web` saludables y la PWA actualizada se observó tanto en `localhost` como en viewport móvil.

## 6. Decisión G3

G3 queda **aprobada**. Los módulos siguientes pueden confiar en `ICurrentActor`, roles múltiples, políticas server-side y revocación de sesión. La aprobación no afirma que Railway esté desplegado: conserva la excepción local documentada y no modifica el pendiente de G1.

La próxima fase autorizada es Fase 4 — Personal, catálogo y configuración económica.
