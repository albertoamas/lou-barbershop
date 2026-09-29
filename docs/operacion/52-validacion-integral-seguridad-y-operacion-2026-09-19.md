# Validación integral, seguridad y operación — 19 de septiembre de 2026

**Estado:** `VALIDACIÓN LOCAL APROBADA`  
**Entorno:** Docker Desktop, imágenes de producción locales y PostgreSQL 18  
**Alcance:** código actual, Compose local, backend, migraciones, respaldo/restauración, dependencias, imágenes y configuración  
**No incluido:** despliegue público, dominio, TLS y proveedores externos

## 1. Resultado ejecutivo

El incremento local quedó validado. La aplicación compila dentro de sus imágenes, los contenedores principales están sanos, la suite backend completa pasa, la base tiene todas las migraciones y una copia se pudo restaurar sin diferencias en las tablas críticas. No se detectaron vulnerabilidades altas o críticas en las imágenes ni paquetes vulnerables en NuGet.

Esto demuestra preparación local reproducible. No transforma el entorno local en producción: las variables y servicios reales de despliegue siguen pendientes hasta elegir y configurar Railway, dominio, almacenamiento de backups y observabilidad.

## 2. Evidencia ejecutada

| Control | Resultado |
|---|---|
| `docker compose config --quiet` | correcto |
| build y arranque Compose | API y web reconstruidas; migrador terminó con código 0 |
| estado de runtime | DB, API y web saludables |
| formato backend | `dotnet format --verify-no-changes`: correcto |
| pruebas Domain | 66/66 |
| pruebas Application | 9/9 |
| pruebas Architecture | 5/5 |
| pruebas Integration/seguridad | 22/22; 20 escenarios sobre PostgreSQL temporal |
| total backend | 102/102 |
| runtime de aceptación | login y agenda autenticada aprobados en imagen Alpine de producción |
| smoke HTTP | `/`, `/health/live`, `/health/ready` y `/manifest.webmanifest`: 200 |
| sesión anónima | `/api/v1/auth/me`: 401 esperado, `Cache-Control: no-store` |
| frontend de producción | Prettier/lint/build correctos; 116/116 pruebas; `npm audit` reportó 0 vulnerabilidades |
| NuGet | 8 proyectos, sin paquetes vulnerables reportados |
| Docker Scout API | 0 críticas, 0 altas |
| Docker Scout web | 0 críticas, 0 altas |

Las dos pruebas de integración que inicialmente fallaron eran fixtures obsoletos: una fecha fija ya estaba en el pasado y una cita de 60 minutos comenzaba exactamente al cierre de la mañana. Se corrigieron para usar una fecha futura y un inicio válido; las reglas productivas no fueron debilitadas.

## 3. Seguridad revisada

- autenticación mediante ASP.NET Core Identity y cookie `HttpOnly`, `SameSite=Strict` y `Secure=Always` por defecto;
- antiforgery automático en mutaciones y cabecera explícita para el cliente web;
- autorización definitiva en backend, además del filtrado visual por rol;
- límites de login, reserva pública y tráfico global;
- Kestrel sin cabecera de servidor y con límites de cuerpo/cabeceras;
- CSP restrictiva, bloqueo de framing, `nosniff`, política de permisos, COOP y `no-referrer`;
- respuestas sensibles y de salud con `no-store`;
- tokens de gestión pública aleatorios, almacenados como hash y enviados en cabecera, no en URL del servidor;
- Sentry desactiva PII y elimina cookies, antiforgery y token de gestión antes de enviar eventos;
- API, web y migrador ejecutan como usuarios no root, filesystem de solo lectura, `cap_drop: ALL` y `no-new-privileges`;
- PostgreSQL y API no publican puertos al host; sólo Caddy escucha en `127.0.0.1:8088` en local;
- `.env`, `backups/` y material de claves están ignorados; ningún archivo secreto está rastreado por Git.
- TOTP/recovery codes, cambio de contraseña y MFA obligatorio configurable protegen especialmente al dueño.
- Sesión limitada por inactividad y máximo absoluto; cambios de contraseña, rol o MFA revocan cookies mediante sello.
- Creación pública limitada por IP y a dos citas futuras activas por teléfono.
- Auditoría de cliente redacta nombre, teléfono y notas.
- Claves Data Protection persistentes exigen certificado y forwarded headers exigen proxy/red conocidos.
- Actions están fijadas por SHA y CodeQL revisa C# y TypeScript.

Durante la inspección, Caddy intentaba escribir su autosave y limpieza en el directorio personal de solo lectura. Se configuraron `XDG_CONFIG_HOME=/config` y `XDG_DATA_HOME=/data`, ambos respaldados por `tmpfs`; el contenedor conserva el hardening y los errores desaparecieron.

## 4. Migraciones

- archivos de migración: 17;
- registros en `lou.__EFMigrationsHistory`: 17;
- última migración en ambos lados: `20260909124042_AddReportingPerformanceIndexes`;
- el job `migrate` informa que la base está al día y termina con código 0;
- `dotnet ef migrations has-pending-model-changes`: no existen cambios de modelo pendientes;
- la suite de integración crea el esquema desde cero y pasa sus 19 escenarios.

Las migraciones se ejecutan como trabajo único antes de levantar la API. No deben ejecutarse desde cada réplica ni revertirse destructivamente; una corrección de esquema usa una migración compensatoria probada.

## 5. Respaldo y restauración

Se ejecutó `deploy/verify-backup-restore.ps1`. El script creó un dump temporal de la base local, inició PostgreSQL 18 aislado sobre `tmpfs`, restauró el dump y comparó una huella de migraciones y tablas críticas. Resultado: `RESTORE_OK`, con 17 migraciones y conteos idénticos. El contenedor y el archivo temporal fueron eliminados al finalizar; la base operativa no fue modificada.

Para producción siguen siendo obligatorios: respaldo automático diario, cifrado fuera del servicio, alerta por antigüedad/error, política de retención y ensayo mensual de restauración.

## 6. Variables y secretos

### Estado local comprobado

El `.env` local existe, está ignorado y no se muestran sus valores en esta documentación. Contiene variables de PostgreSQL, puerto web y credenciales de demostración local. La contraseña del dueño cumple la política de complejidad; la contraseña de PostgreSQL coincide con un valor local conocido. Es aceptable únicamente porque la base no publica puerto y el entorno está limitado al equipo local. No puede copiarse a staging o producción.

### Matriz para un entorno real

| Variable/configuración | Producción | Regla |
|---|---|---|
| `MIGRATION_DATABASE_CONNECTION` | obligatoria para job | rol efímero con DDL; secreto y TLS del proveedor |
| `RUNTIME_DATABASE_CONNECTION` / `ConnectionStrings__Database` | obligatoria para API | rol sin DDL; secreto y TLS del proveedor |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | según topología | no usar valores de Compose local; preferir variables gestionadas por Railway |
| `AllowedHosts` | obligatoria | dominio exacto, sin comodín |
| `Security__RequireSecureCookies` | `true` | no trasladar la excepción HTTP local |
| `Security__RequireOwnerMfa` | `true` | el OWNER sólo accede a seguridad hasta registrar TOTP |
| `Security__SessionIdleMinutes` / `SessionAbsoluteHours` | `60` / `8` inicial | ajustar sólo con decisión documentada |
| `Http__UseHttpsRedirection` | `true` o terminación equivalente validada | todo acceso público por HTTPS |
| `Http__TrustForwardedHeaders` | sólo si corresponde | `true` únicamente con API privada detrás de un único proxy confiable |
| `DataProtection__KeysPath` | obligatoria con volumen persistente | compartir/persistir claves entre reinicios o réplicas |
| `DataProtection__CertificateBase64` / `CertificatePassword` | obligatorias al persistir | cifrar claves; mantener ambos valores en gestor de secretos |
| `Http__KnownProxies__0` o `KnownNetworks__0` | si se confían forwarded headers | no se acepta confianza global; debe coincidir con topología real |
| `BootstrapOwner__UserName` y `BootstrapOwner__Password` | efímeras | inyectar sólo para bootstrap/recuperación y retirar inmediatamente |
| `SENTRY_DSN` / `Sentry__Dsn` | opcional recomendado | secreto; proyecto sin PII y alertas configuradas |
| `OTEL_EXPORTER_OTLP_ENDPOINT` / `Otlp__Endpoint` | opcional recomendado | endpoint privado o autenticado |
| límites `RateLimiting__*` | opcionales | comenzar con defaults y calibrar con tráfico real |
| `VITE_SOCIAL_*_URL` | opcionales | sólo cuentas oficiales confirmadas; se incorporan en build del frontend |

No existen todavía valores productivos verificables porque el despliegue fue pospuesto por decisión del dueño. No se inventaron dominio, DSN, tokens ni contraseñas. Antes del despliegue se debe crear un inventario de secretos en Railway y contrastarlo con esta matriz sin volcar sus valores a logs o documentos.

## 7. Pendientes antes de producción

1. crear proyecto/servicios reales, dominio y HTTPS;
2. rotar todas las credenciales respecto del entorno local;
3. configurar hosts, proxy y persistencia de Data Protection según la topología real;
4. automatizar y cifrar backups externos, y verificar restauración desde ese almacenamiento;
5. configurar Sentry/OTLP, paneles y alertas sin PII;
6. repetir smoke, login, reserva, agenda, cobro y rollback en staging;
7. probar instalación PWA y responsive en Android, iOS y tablet reales;
8. proteger la rama/release y confirmar CodeQL, auditorías e imágenes del commit candidato.

La aplicación puede seguir probándose localmente en `http://localhost:8088`. No debe declararse lista para producción hasta cerrar estos ocho puntos. El detalle del hardening posterior está en [54-cierre-seguridad-preproduccion.md](../tecnica/54-cierre-seguridad-preproduccion.md).
