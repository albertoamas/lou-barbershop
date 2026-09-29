# Hardening y evidencia de preparación productiva

## Alcance

Este documento controla la Fase 12 sin fingir que local equivale a producción. La columna **local** exige código/pruebas reproducibles; **despliegue** identifica lo que sólo puede cerrarse con dominio, TLS, almacenamiento y proveedores reales.

## Matriz RNF

| RNF | Control/evidencia local | Estado dependiente del despliegue |
|---|---|---|
| RNF-01 Usabilidad | flujos móviles y capturas F6–F11 | repetir prueba humana en dispositivos reales |
| RNF-02 Rendimiento | consultas acotadas, índices y benchmark aislado de 100.000 operaciones | repetir latencia end-to-end en staging equivalente |
| RNF-03 Integridad | transacciones y pruebas de cierre/reverso | monitorear conflictos/rollback |
| RNF-04 Concurrencia | carreras de agenda, inventario y liquidación sobre PostgreSQL 18 | repetir bajo carga de staging |
| RNF-05 Disponibilidad | liveness/readiness y restart policy | medir 99,5 %, alertas y mantenimiento |
| RNF-06 Respaldo | `backup.ps1` y restauración aislada T-018 | backup diario cifrado fuera del servicio |
| RNF-07 Seguridad | Identity, cookies seguras, antiforgery, CSP, HSTS, proxy/hosts y rate limit | validar TLS/dominio/topología Railway |
| RNF-08 Privacidad | minimización, no PII en logs, token hasheado | aprobar retención y proveedor de telemetría |
| RNF-09 Auditoría | actor, antes/después, fecha y request ID | retención/backup inmutable según política final |
| RNF-10 Accesibilidad | etiquetas, teclado, estados no sólo por color | auditoría manual últimas dos versiones móviles |
| RNF-11 Mantenibilidad | Clean Architecture, migraciones, pruebas | mantener Definition of Done |
| RNF-12 Observabilidad | JSON, request ID, OTel/Sentry opcionales sin PII | configurar endpoints, paneles y receptores de alertas |
| RNF-13 Compatibilidad | responsive/PWA y Playwright Chromium | Android/iOS/tablet reales |
| RNF-14 PWA | manifest, SW, update prompt y Workbox verificados | instalación bajo HTTPS público |
| RNF-15 Offline seguro | mutaciones Network Only y UI bloqueada | prueba con red móvil real |
| RNF-16 Independencia | Domain/Application sin frameworks externos | regla automática permanente |
| RNF-17 Arquitectura | pruebas de dependencias, seguridad de acciones y controllers delgados | CI obligatorio en rama protegida |
| RNF-18 Contenedores | Compose, non-root, read-only, cap drop, redes privadas | límites/volúmenes de plataforma |

## Controles aplicados en F12

- Kestrel sin cabecera de servidor y con límites de cuerpo/cabeceras.
- Cookie productiva `__Host-`, validación frecuente de sello y respuestas 401/403 sin redirect.
- Forwarded headers desactivados por defecto; sólo un salto y únicamente cuando la API está detrás del proxy privado.
- CSP, `frame-ancestors`, `nosniff`, `no-referrer`, COOP y Permissions Policy en Caddy; respuestas sensibles `no-store` también desde API.
- Rate limit devuelve `ProblemDetails` correlacionable; request timeout global.
- Contenedores API/web/migración sin privilegios adicionales, capabilities eliminadas y filesystem de runtime de sólo lectura.
- Auditoría recibe el mismo `requestId` HTTP mediante un puerto de Application, sin acoplar el núcleo a ASP.NET Core.
- OpenTelemetry exporta métricas/trazas sólo cuando existe endpoint; Sentry sólo cuando existe DSN, nunca activa PII y elimina explícitamente cookie, antiforgery y token público antes de enviar eventos.
- CI audita dependencias, escanea imágenes, genera SBOM CycloneDX y mantiene actualizaciones con Dependabot.

## Evidencia local ejecutada

| Control | Resultado del 9 de septiembre de 2026 |
|---|---|
| Compilación y formato backend | Release: 0 errores, 0 advertencias; `dotnet format`: limpio |
| Pruebas backend | 95/95: Domain 62, Application 9, Architecture 5, Integration 19 |
| Pruebas frontend | 29/29; Prettier, ESLint, Oxlint y build: correctos; `npm audit`: 0 vulnerabilidades |
| Dependencias .NET | 8 proyectos, 0 paquetes vulnerables reportados por NuGet |
| Imágenes finales | Docker Scout: API 0 críticas/altas; web 0 críticas/altas corregibles |
| SBOM | CycloneDX backend y frontend generados correctamente; CI conserva artefactos por componente |
| Contenedores | API/web/migrate no root, filesystem de sólo lectura, sin capabilities y `no-new-privileges` |
| Restauración T-018 | huella idéntica en PostgreSQL 18 aislado; 17 migraciones y tablas críticas consistentes |
| Volumen | 100.000 operaciones/5 años; consulta anual de 19.656 filas en 48,462 ms de base, umbral 2.000 ms |
| Rollback AC-12-07 | candidato web inválido detectado y restauración de imagen sana: `ROLLBACK_OK` |
| Smoke final | raíz, liveness, readiness y manifest 200; endpoint autenticado anónimo 401 y `no-store` |

La actualización de dependencias del binario Caddy fijó gRPC 1.83.2, `x/crypto` 0.56.0 y `x/net` 0.58.0 después de que el primer escaneo encontrara cuatro vulnerabilidades altas corregibles. El segundo escaneo sobre las imágenes reconstruidas quedó en cero.

## Riesgos abiertos que bloquean release candidate

1. G11 humana pendiente y pruebas en Android/iOS/tablet.
2. Dominio, HTTPS, `AllowedHosts` y topología privada de Railway sin configurar.
3. Backups automáticos/cifrados y restauración desde almacenamiento externo sin proveedor.
4. Sentry/OTLP, paneles, alertas y receptores sin entorno externo.
5. Latencia end-to-end, concurrencia y disponibilidad deben repetirse en staging equivalente; el benchmark local sólo cubre la consulta de base.
6. Política de privacidad/retención pendiente de aprobación del dueño y revisión aplicable.
7. Verificar en GitHub que CodeQL, acciones fijadas por SHA, auditorías e imágenes pasan en el commit candidato.

Ningún punto se rebaja silenciosamente: F12 puede cerrar su incremento local, pero G12 y el release candidate permanecen bloqueados hasta obtener estas evidencias.

## Revalidación integral del 19 de septiembre de 2026

La evidencia histórica anterior se volvió a ejecutar después del cierre visual y del hardening adicional. El resultado vigente es: formato backend limpio; 102/102 pruebas (`66 Domain`, `9 Application`, `5 Architecture`, `22 Integration/seguridad`); 116/116 frontend; Compose y migrador correctos; 17/17 migraciones aplicadas y modelo EF sin cambios pendientes; restauración aislada con huella idéntica; NuGet/npm sin vulnerabilidades reportadas; imágenes API y web con el último escaneo en `0 critical / 0 high`; smoke de raíz, privacidad, liveness, readiness y manifest en 200, y sesión anónima en 401 con `no-store`. El cierre de seguridad está en [54-cierre-seguridad-preproduccion.md](54-cierre-seguridad-preproduccion.md); la matriz operacional previa está en [52-validacion-integral-seguridad-y-operacion-2026-09-19.md](../operacion/52-validacion-integral-seguridad-y-operacion-2026-09-19.md).
