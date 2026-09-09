# Acta de cierre técnico local — Fase 12

**Fecha:** 9 de septiembre de 2026  
**Estado del incremento local:** `COMPLETE`  
**Puerta G12:** `DEFERRED / NOT APPROVED`

## Decisión

La Fase 12 queda terminada en todo lo ejecutable sin infraestructura externa. Esto no equivale a un release candidate productivo: el dueño decidió postergar despliegue, por lo que G11 humana, staging, dominio/TLS, proveedores de observabilidad y backup externo permanecen pendientes. No se cargan datos reales definitivos ni se habilita Fase 13 por esta acta.

## Entregables

| Entregable | Estado | Evidencia |
|---|---|---|
| ENT-12-01 hardening/threat model | completo local | [informe](41-hardening-y-evidencia.md) y [threat model](Peluqueria-threat-model.md) |
| ENT-12-02 pruebas | completo local | 95 backend, 29 frontend, arquitectura, auditorías y smoke |
| ENT-12-03 benchmark/correcciones | completo local | 100.000 operaciones; índices F12; 48,462 ms de base |
| ENT-12-04 backup/restauración | completo local | T-018 con dump real, restauración aislada y 17 migraciones consistentes |
| ENT-12-05 observabilidad/runbooks | parcial externo | adaptadores y [runbooks](42-runbooks-operacion-y-recuperacion.md) listos; paneles/alertas requieren proveedor |
| ENT-12-06 release firmado | pendiente | requiere G11, staging, configuración productiva, SHA y firma del dueño |

## Resultado por criterio

| Criterio | Resultado |
|---|---|
| AC-12-01 evidencia RNF | matriz local completa; evidencias externas identificadas, no simuladas |
| AC-12-02 defectos críticos/altos | 0 fallos de suite y 0 CVE críticas/altas corregibles en imágenes finales |
| AC-12-03 permisos negativos | suites de integración previas + regla arquitectónica de autorización explícita, aprobadas |
| AC-12-04 restauración | `RESTORE_OK`; huella de tablas críticas y 17 migraciones idéntica |
| AC-12-05 rendimiento | consulta anual local 48,462 ms < 2.000 ms; latencia end-to-end pendiente en staging |
| AC-12-06 reproducibilidad/contenedores | build reproducible; non-root, read-only, cap-drop y sin secretos en configuración versionada |
| AC-12-07 rollback | `ROLLBACK_OK` tras candidato web deliberadamente inválido |
| AC-12-08 seis escenarios humanos | pendiente junto con G11 en dispositivos reales |

## Evidencia reproducida al cierre

- Backend Release: 0 errores y 0 advertencias; formato sin diferencias.
- Backend: Domain 62/62, Application 9/9, Architecture 5/5, Integration 19/19.
- Frontend: 29/29; formato, lint, build y audit sin error.
- NuGet: ocho proyectos sin paquetes vulnerables reportados.
- Docker Scout: API y web con 0 críticas y 0 altas corregibles. El hallazgo inicial de cuatro altas en Caddy se corrigió actualizando gRPC, `x/crypto` y `x/net`, y se reconstruyó antes del segundo escaneo.
- SBOM CycloneDX backend/frontend generado; CI genera y conserva también SBOM por imagen.
- HTTP final: raíz, liveness, readiness y manifest 200; sesión anónima 401 con `no-store`, CSP y request ID.
- Stack principal sano en `http://localhost:8088` después de todas las pruebas.

## Pendientes exactos para G12

1. Ejecutar G11 y AC-12-08 con dueño/admin/barbero en Android, iOS y tablet.
2. Desplegar staging equivalente, configurar dominio, TLS, host exacto, proxy privado, secretos y claves persistentes.
3. Configurar Sentry/OTLP, paneles, alertas y receptores; verificar redacción con eventos reales controlados.
4. Activar backup cifrado externo diario, alerta de antigüedad y restauración desde ese almacenamiento.
5. Repetir rendimiento, concurrencia, PWA/HTTPS y rollback con imágenes identificadas por SHA.
6. Aprobar privacidad/retención, fijar GitHub Actions por SHA y firmar el checklist técnico/dueño.

Hasta completar estos seis puntos, el estado correcto es **Fase 12 local completa, G12 no aprobada**.
