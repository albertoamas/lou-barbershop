# Fase 6 — Clientes y agenda interna

**Fecha:** 3 de septiembre de 2026 (America/La_Paz)  
**Estado:** `DONE` — implementación, pruebas y simulación aceptadas  
**Puerta G6:** aprobada por el dueño el 7 de septiembre de 2026; autoriza Fase 7  
**Entrada:** G5 aprobada; continúa excepción local G1, sin Railway ni publicación remota.

## Resultado implementado

La PWA incluye `/agenda`: vista diaria y de siete días, filtro por barbero para administración, ficha mínima de cliente, reserva confirmada, reprogramación/cambio de servicio/reasignación, cancelación, inasistencia, llegada, inicio e historial. BARBER recibe solo sus citas y puede registrar llegada/inicio; no recibe notas, teléfono, precio ni historial administrativo.

Reserva y operación económica siguen separadas. Esta fase no incluye cobro, comisión, atención WALK_IN ni finalización económica de una cita. El comienzo cambia la cita a `IN_SERVICE`; su cierre se implementará en Fase 7.

## Entregables

| ID | Entrega | Evidencia |
|---|---|---|
| ENT-06-01 | Buscar, crear y corregir cliente; normalización E.164 y aviso por teléfono compartido | `CustomerService`, `CustomersController`, `CustomerPicker`, pruebas HTTP |
| ENT-06-02 | Agenda interna diaria/semanal y edición mediante alternativas del servidor | `AgendaPage`, `AppointmentEditor`, `AgendaService` |
| ENT-06-03 | Transiciones e historial antes/después, actor y motivo | `AppointmentEvent`, `AppointmentDetails`, migración `AddAppointmentEvents` |
| ENT-06-04 | Revalidación transaccional y exclusión PostgreSQL | `IAgendaTransaction`, `EfAgendaStore`, ADR-013, prueba de concurrencia y escritura directa solapada |
| ENT-06-05 | Mi día y permisos comprobados en servidor | `AgendaService`, `PhaseSixEndpointTests`, navegador con cuenta BARBER ficticia |
| ENT-06-06 | Guía de transición preparada, no ejecutada | [32-transicion-google-calendar.md](../../operacion/32-transicion-google-calendar.md) |

## Criterios y límites de la evidencia

| Criterio | Estado | Evidencia o pendiente |
|---|---|---|
| AC-06-01 | Verificado técnicamente | Dos POST simultáneos: una cita y un 409 `SLOT_TAKEN`; exclusión GiST probada además por escritura directa |
| AC-06-02 | Pendiente de prueba operativa | Formulario probado en navegador; falta cronometrar una reserva habitual por administración real en menos de 60 segundos. Automatización no equivale a usabilidad humana |
| AC-06-03 | Verificado técnicamente | Reprogramación guarda precio/duración anterior y nueva, actor, motivo y cambios de destino |
| AC-06-04 | Verificado técnicamente | HTTP rechaza agenda ajena/cancelación/historial/clientes al BARBER; navegador muestra solo Mi día y acciones permitidas |
| AC-06-05 | Verificado técnicamente | Cancelación permite ocupar nuevamente el intervalo; no-show desaparece de ocupación activa y conserva evento. No se invoca ni existe en este flujo creación económica |
| AC-06-06 | Verificado técnicamente | Cambiar catálogo no modifica snapshot; una reprogramación explícita sí toma nueva condición y conserva la anterior |
| AC-06-07 | Verificación técnica realizada; aceptación de uso pendiente | Navegador 390×844 y 1024×768, estados textuales, controles etiquetados y modal nativo; no es auditoría WCAG completa ni prueba con dispositivos físicos |
| AC-06-08 | Verificado técnicamente; dependencia corregida | T-001/T-002 pasan. T-003 WALK_IN y T-004 detalle real/cobro siguen pendientes y son exigidos por AC-07-08 en Fase 7 |

### Resolución aplicada para AC-06-08

Tras presentar la inconsistencia y recibir del usuario «Perfecto, haz lo que veas optimo», se aplica la corrección de planificación: AC-06-08 exige T-001/T-002; T-003/T-004 permanecen en AC-07-08, que ya los incluía. Antes se exigían T-001–004 para G6, creando una dependencia circular con capacidades que solo se construyen después de G6.

No se elimina ninguna prueba, se modifica ninguna regla de negocio ni se declara implementado el cobro. Esta autorización permite corregir la planificación; no se interpreta como evidencia de una prueba humana realizada ni como aprobación de G6. El backlog conserva `ACCEPTANCE` y Fase 7 permanece pendiente.

## Arquitectura y datos

- Domain mantiene invariantes de cita y estados; Application orquesta con puertos, reloj y actor.
- Infrastructure implementa búsqueda parametrizada, lectura sin seguimiento, `xmin`, transacción y persistencia de eventos. Controllers no acceden al contexto.
- La migración `20260904020203_AddAppointmentEvents` agrega `lou.appointment_events`, índice cita/fecha y FK restrictiva; no borra ni reescribe citas previas.
- Los snapshots JSONB son datos históricos, no sustituyen las relaciones de cita, cliente, servicio y barbero.
- Reprogramar exige versión y motivo. Cliente también protege correcciones con versión. No se permite no-show antes del horario previsto.
- La PWA no calcula disponibilidad ni precios, no reintenta mutaciones automáticamente, no guarda datos privados en almacenamiento persistente y limpia la caché de consultas al cerrar sesión.
- Historial económico y cobros no se adelantan. Detalles de concurrencia/reintentos: [ADR-013](../../adr/ADR-013-agenda-transaccional-sucursal-unica.md).

## Pruebas ejecutadas

```text
.NET Release: 0 errores, 0 advertencias
Backend: 46 Domain + 6 Application + 2 arquitectura + 11 integración = 65/65
Frontend: 18/18 pruebas; TypeScript/Vite/PWA build; Prettier, ESLint/Oxlint
dotnet format --verify-no-changes: correcto
PostgreSQL real: migraciones desde vacío, concurrencia, versiones, exclusión y eventos
Navegador real: login, alta de cliente con aviso de duplicado, reserva y
reprogramación con otro barbero/servicio; cuenta BARBER con agenda restringida,
llegada e inicio; aviso offline y recuperación de red
Docker Compose: migración aditiva aplicada; db/api/web saludables; /health/ready 200
```

La prueba de navegador utiliza una API/base temporal con datos ficticios, sin mocks HTTP y sin modificar datos operativos. Se detectó un 401 esperado al entrar anónimamente. Los 502 iniciales del proxy temporal se corrigieron antes de probar los flujos. El backend de pruebas usa hosts separados para no agotar entre suites la ventana de rate limiting; los límites productivos no se redujeron.

## Guion de aceptación operativa pendiente

La simulación delegada del 4 de septiembre está registrada en [33-simulacion-fase-6.md](33-simulacion-fase-6.md). Incluye la corrección de un fallo del runtime Alpine y repetición exitosa sobre imágenes de producción. No sustituye la medición humana de AC-06-02 ni declara una aceptación humana que no ocurrió.

El 7 de septiembre el dueño respondió «Perfecto, terminaste esta fase? continua con la siguiente». Se registra como aceptación explícita de G6 y autorización de avance, con la limitación anterior visible y sin inventar participantes o mediciones humanas.

Capturas de datos ficticios: `output/playwright/fase-6/agenda-tablet.png`, `mi-dia-mobile.png` y `offline-mobile.png`. La consola del flujo de barbero no registra errores ni advertencias.

1. En la instalación local, dueño/administración abre Agenda con horarios configurados y elige una fecha de simulación.
2. Cronometrar desde Nueva cita hasta confirmación para un cliente y servicio habituales; debe tardar menos de 60 s. Registrar duración y observaciones.
3. Crear otra persona con teléfono compartido: comprobar aviso y selección correcta.
4. Cambiar hora, barbero y servicio; revisar condición anterior/nueva y motivo.
5. Cancelar una reserva y comprobar que el espacio vuelve a ofrecerse. Para no-show usar una cita cuyo inicio ya pasó, sin adelantar el reloj operativo.
6. Ingresar como barbero vinculado: ver únicamente sus citas, registrar llegada/inicio; comprobar ausencia de cancelación/precio/notas.
7. Desconectar la red: no debe poder confirmar ni cambiar citas. Recuperar conexión y actualizar.
8. Registrar el resultado de la simulación y la aceptación del dueño y usuario del flujo. La corrección documental de AC-06-08 ya está aplicada. Solo después de la aceptación operativa registrar G6 `DONE`.

### Registro a completar después de la prueba

- Fecha y versión probada: pendiente.
- Administración y barbero participantes: pendiente.
- Tiempo de reserva habitual (objetivo menor a 60 s): pendiente.
- Resultado de pasos 3–7 y observaciones: pendiente.
- Decisión: pendiente; si hay un fallo, registrar reproducción y corregir antes del cierre.

Se puede informar el resultado en esta conversación para incorporarlo al acta; no hace falta compartir contraseñas ni datos personales de clientes.

No se editó Google Calendar, no se desplegó en Railway y no se publicaron datos ni commits remotos.

Limpieza: se retiraron el contenedor API temporal, tres bases exclusivas de pruebas y su rol de PostgreSQL. Sus datos eran ficticios y descartables; las capturas se conservan. La base y los volúmenes de la instalación principal no se eliminaron.
