# Cierre de seguridad ejecutable antes del despliegue

**Fecha:** 19 de septiembre de 2026  
**Resultado del código/local:** `APROBADO`  
**Release Candidate productivo:** `PENDIENTE DE ENTORNO REAL Y FIRMA G12`

## Resumen ejecutivo

Se cerraron los hallazgos de seguridad que podían corregirse y verificarse desde el repositorio. El backend compila sin advertencias, las 102 pruebas pasan —incluidas 22 de integración y seguridad, 20 de ellas con PostgreSQL real—, el frontend pasa 116 pruebas, los gestores de paquetes no reportan vulnerabilidades conocidas y el stack reconstruido está saludable.

No se declara producción completa: dominio, TLS, secretos, almacenamiento externo de backups, alertas y dispositivos físicos sólo pueden validarse al crear staging/Railway. Esos puntos no son fallos de código y no deben simularse con valores inventados.

## Controles cerrados

| Área | Implementación | Evidencia |
|---|---|---|
| Cuenta privilegiada | TOTP, recovery codes, cambio de contraseña, reset administrativo ajeno y MFA obligatorio para OWNER configurable | prueba de integración de alta, login y recuperación |
| Sesión | 60 min inactiva, 8 h absolutas, sello de seguridad y revocación por cambios sensibles | compilación/analyzers y pruebas Identity |
| Reserva pública | 6 creaciones/hora/IP por defecto y máximo de dos citas futuras activas por teléfono | prueba PostgreSQL: tercera reserva rechazada con `booking.active_limit` |
| Privacidad operativa | BARBER necesita búsqueda de 3 caracteres; notas ocultas; auditoría redacta nombre/teléfono/notas | pruebas de roles y lectura directa de auditoría |
| Claves criptográficas | Data Protection persistente exige certificado; sólo Compose local permite claves sin cifrar explícitamente | arranque fail-closed por configuración |
| Proxy | forwarded headers sólo con proxies/redes conocidas; configuración incompleta detiene arranque | validación de configuración en `Program.cs` |
| Cadena de suministro | Actions fijadas por SHA y CodeQL para C#/TypeScript; audit, Trivy y SBOM permanecen en CI | workflow versionado |
| Transparencia al cliente | `/privacidad` y enlace desde reserva/footer; enlace privado puede copiarse o compartirse por WhatsApp | prueba frontend y build PWA |
| Separación DB | overlay productivo acepta una conexión DDL para migrador y otra DML para runtime | `deploy/compose.production.example.yaml` validado |

## Verificación final

| Control | Resultado |
|---|---|
| `dotnet format --verify-no-changes` | limpio |
| build Release | 0 errores, 0 advertencias |
| Domain | 66/66 |
| Application | 9/9 |
| Architecture | 5/5 |
| Integration y seguridad | 22/22; 20 escenarios usan PostgreSQL real |
| Total backend | 102/102 |
| Prettier + ESLint + Oxlint | correcto |
| Frontend | 116/116 |
| PWA build | correcto; 55 recursos precargados |
| NuGet vulnerable | 0 paquetes reportados en 8 proyectos |
| npm audit | 0 vulnerabilidades reportadas |
| Compose | plantilla local y overlay productivo válidos |
| Runtime | DB/API/web saludables; migrador código 0 |
| Smoke | landing, privacidad, live, ready y manifest 200; sesión anónima 401 + `no-store` |
| Migraciones | 17 aplicadas; base al día; modelo sin cambios pendientes |
| Backup/restore | `RESTORE_OK`, huella de 10 tablas y 17 migraciones idéntica |

## Riesgo residual y decisión

| Pendiente externo | Riesgo si se omite | Condición de cierre |
|---|---|---|
| Dominio, TLS y `AllowedHosts` | suplantación o transporte inseguro | HTTPS público y host exacto verificados |
| Secretos productivos | toma de cuenta/base | valores nuevos en gestor de Railway; ninguna credencial demo |
| Certificado/volumen Data Protection | cierre de sesiones o claves expuestas | certificado, volumen y reinicio probados |
| Roles DB separados | impacto excesivo ante compromiso API | runtime sin DDL; migrador efímero con DDL |
| Backups externos | pérdida total del proveedor | job diario cifrado, alerta y restauración desde almacenamiento real |
| Sentry/OTLP y alertas | incidente silencioso | evento de prueba sin PII y receptor confirmado |
| Dispositivos reales | fallos de instalación/UX | Android, iOS y tablet aprobados |
| Política/aceptación | uso de datos sin acuerdo | dueño aprueba política, responsables y G12 |

## Conclusión

No queda un hallazgo crítico o alto conocido que pueda resolverse exclusivamente en código local. El siguiente paso correcto no es añadir más infraestructura al monolito: es crear staging, inyectar valores reales de forma segura y ejecutar el checklist de entrega.
