# Fase 6 — Simulación delegada en imágenes de producción

Fecha: 4 de septiembre de 2026, America/La_Paz. Ejecutor: agente mediante Playwright en Chromium real, por petición «Hazla». Datos exclusivamente ficticios. Base de código: `301082b` más la corrección de empaquetado descrita aquí.

## Resultado

Simulación funcional aprobada después de corregir el runtime. G6 conserva `ACCEPTANCE`: no participaron personas como administración/barbero y no se certifica el criterio de velocidad humana menor de 60 segundos. No se inicia Fase 7 ni se elimina ese requisito del plan.

| Comprobación | Resultado observado |
|---|---|
| Reserva habitual | ADMIN confirma a Martín QA, Corte QA, Alex QA, 5/9 a las 09:00; sin cobro |
| Teléfono compartido | Sara QA usa el mismo teléfono ficticio; aparece advertencia y queda seleccionada Sara, no Martín |
| Reprogramación | Martín pasa a Diego QA, Barba QA, 10:00; historial conserva 45 min/Bs 60 antes y 30 min/Bs 40 después, actor y motivo |
| Cancelación y liberación | Sara a las 09:45 se cancela; después de actualizar disponibilidad se ofrece nuevamente 09:45 y otra reserva ocupa ese intervalo |
| Inasistencia | Reserva de prueba preparada en fecha pasada; UI confirma NO_SHOW con motivo y conserva evento |
| BARBER | Diego solo ve su cita, sin precio, teléfono, notas, historial administrativo ni acción de cancelar; registra llegada e inicio |
| Sin conexión | Se muestra aviso y Registrar llegada queda deshabilitado; al recuperar conexión funciona la confirmación explícita |
| Tablet y móvil | 1024×768 y 390×844; capturas inspeccionadas, sin desbordamiento horizontal; no equivale a dispositivos físicos ni auditoría WCAG |
| Persistencia | Tres citas finales: una CANCELLED, una NO_SHOW y una IN_SERVICE; eventos CREATED ×3, RESCHEDULED, CANCELLED, NO_SHOW, CHECKED_IN e IN_SERVICE |

Una repetición de reserva de Sara con datos ya cargados devolvió 104 ms según `Date.now()` dentro del lote automático. Es una medición instrumental del lote, no tiempo humano ni benchmark representativo. AC-06-02 sigue sin certificación humana.

Para el no-show se cambió por SQL únicamente la segunda reserva ficticia de Sara al 3/9/2026, 09:45–10:30; luego la transición se ejecutó en la UI. No se alteró el reloj. El evento inicial conserva la fecha de creación de la fixture: ese historial preparado no representa una operación real.

## Fallo encontrado y corregido

La imagen `aspnet:10.0.11-alpine3.24` no contenía `/usr/share/zoneinfo/America/La_Paz`. El login funcionaba, pero consultar agenda producía HTTP 500 con `TimeZoneNotFoundException` en `AgendaService`. Las pruebas anteriores ejecutadas sobre SDK no detectaban esta diferencia del runtime final.

Se agrega `tzdata` en `deploy/docker/api.Dockerfile`, con verificación de existencia del archivo durante el build. Se reconstruyen API/migrador y se repite la simulación sobre esa imagen final. No cambia ninguna regla, contrato ni migración.

Regresión reproducible: `deploy/test-acceptance-runtime.ps1` inicia sesión ADMIN ficticia y exige una consulta de agenda exitosa sobre el contenedor final. Sin la corrección, esa consulta falla con 500. No basta con que `/health/ready` responda 200.

## Reproducción aislada

Desde la raíz, con Docker iniciado y el puerto 8091 libre:

```powershell
docker compose build api migrate web
docker compose -f deploy/compose.acceptance.yaml up -d
docker compose -f deploy/compose.acceptance.yaml run --rm -e BootstrapOwner__UserName=acceptance-owner -e 'BootstrapOwner__Password=Acceptance-owner!8426' api --bootstrap-owner
./deploy/seed-acceptance.ps1
./deploy/test-acceptance-runtime.ps1
```

Esperar a que la API responda antes del bootstrap/seed. El seed se ejecuta una sola vez por base vacía. Las credenciales visibles en estos archivos son fixtures públicas, descartables y exclusivas de QA, nunca credenciales operativas. El proyecto `lou-acceptance` publica solo `127.0.0.1:8091` y usa PostgreSQL en tmpfs. No reutilizar esta configuración fuera de pruebas locales.

Abrir `http://127.0.0.1:8091/app/agenda`, usar las cuentas ficticias del seed y el guion del acta. Elegir una fecha futura si se reproduce después del 5/9/2026. Al terminar:

```powershell
docker compose -f deploy/compose.acceptance.yaml down -v
```

Este comando elimina únicamente el entorno QA y sus datos descartables, no el proyecto principal `lou-barbershop`.

## Evidencias

- `output/playwright/fase-6-acceptance/admin-tablet.png`
- `output/playwright/fase-6-acceptance/barber-mobile.png`
- `output/playwright/fase-6-acceptance/offline-mobile.png`
- Backend reejecutado: 46 Domain + 6 Application + 2 arquitectura + 11 integración = 65/65, sin omitidas; PostgreSQL real aislado.
- Frontend reejecutado: 18/18; formato, ESLint/Oxlint, TypeScript y build Vite/PWA correctos.
- `dotnet format --verify-no-changes --no-restore`: correcto sobre la imagen SDK de pruebas del mismo código.
- Build API/migrador y prueba autenticada del runtime corregido: correctos; Compose QA válido y `git diff --check` sin errores.
- Instalación principal actualizada: API, PostgreSQL y web saludables; `/health/ready` responde 200 en localhost:8088.

Limpieza realizada: se eliminaron los cuatro contenedores QA, su red y los datos ficticios de PostgreSQL en tmpfs (incluidas las bases de integración). Son descartables y se reconstruyen con el seed; no se eliminaron los volúmenes ni datos de la instalación principal. Se conservan las capturas.

Los HTTP 500 iniciales son el defecto corregido, no se ocultan. Al recrear la API temporal se invalidó la cookie por usar claves efímeras; se volvió a iniciar sesión. El 401 de acceso anónimo es esperado. No se publican logs de sesiones, tokens ni datos reales.

No se toca Google Calendar ni se despliega en Railway. La aceptación humana del acta permanece explícitamente pendiente.
