# Acta de Fase 5 y puerta G5 — Horarios y disponibilidad

**Fecha:** 2 de septiembre de 2026  
**Estado:** `DONE`  
**Puerta:** G5 aprobada para iniciar Fase 6  
**Dependencia:** G4 aprobada; G1 conserva la excepción local por staging diferido

## 1. Resultado

Lou Barbershop dispone de una fuente confiable para responder cuándo puede atender cada barbero. El cálculo combina horario semanal con vigencia, ausencias, aperturas extraordinarias, duración y precio efectivos del servicio, citas activas y la hora actual. Todo instante se normaliza a UTC y se presenta en la zona operativa `America/La_Paz`.

La disponibilidad visible avanza cada 30 minutos (`:00`/`:30`), pero la ocupación usa el intervalo completo del servicio. Desde la corrección de negocio del 11 de septiembre de 2026, el motor también intersecta todo turno o apertura extraordinaria con las ventanas de la única sucursal: 08:00–13:00 y 15:00–21:00. La búsqueda admite un barbero específico o “cualquiera”; en este último caso cada alternativa identifica al barbero concreto. No se incorporó una caché: al ser una consulta derivable y acotada, se calcula directamente y no puede quedar obsoleta tras cambiar oferta, horario, excepción o cita.

## 2. Entregables

| Entregable | Resultado | Evidencia principal |
|---|---|---|
| ENT-05-01 Horarios/excepciones | varios turnos semanales, vigencia, desactivación lógica, `UNAVAILABLE` y `AVAILABLE_OVERRIDE` | `WorkingSchedule`, `AvailabilityExceptionRule`, `SchedulesController`, migración y PWA |
| ENT-05-02 Motor puro | intervalos `[inicio, fin)`, UTC/zona, duración real, pasado, excepciones y ocupación | `AvailabilityEngine` en Domain, sin ASP.NET Core ni EF Core |
| ENT-05-03 API y consulta | `/availability`, `barberId=any`, catálogo de barberos y pantalla responsive | `SchedulingService`, `AvailabilityController`, `SchedulingPage` |
| ENT-05-04 Pruebas/rendimiento | adyacencia, solape, hueco corto, pasado, DST, medianoche, volumen y permisos | `PhaseFiveAvailabilityTests`, `PhaseFiveEndpointTests`, `MigrationTests` |

## 3. Criterios de aceptación

| Criterio | Estado | Demostración |
|---|---|---|
| AC-05-01 fuera de turno/ausencia nunca se ofrece | Cumple | matriz pura verifica bloqueo y apertura extraordinaria; flujo HTTP vuelve a consultar tras ausencia |
| AC-05-02 adyacencia sí, solape no | Cumple | intervalos semiabiertos y exclusión GiST de citas activas; prueba conserva 10:00 y 10:45 como límites válidos |
| AC-05-03 hueco menor a duración no se ofrece | Cumple | generador exige que el final completo pertenezca a la ventana |
| AC-05-04 “cualquiera” concreta barbero | Cumple | cada `AvailabilityOption` contiene `barberId` y `barberName`; prueba HTTP lo comprueba |
| AC-05-05 no muestra pasado | Cumple | motor compara el inicio en UTC contra `IClock.UtcNow` |
| AC-05-06 menos de 3 s | Cumple | matriz de 10 barberos × 31 días completa por debajo del umbral y endpoint acotado se mide en integración |
| AC-05-07 cambios no cancelan y listan conflictos | Cumple | desactivar horario mantiene la cita y devuelve su identificador/intervalo en `conflicts` |

## 4. Diseño y persistencia

Domain contiene el motor puro y los invariantes de horario, excepción y el agregado mínimo de cita necesario para representar ocupación. Application orquesta mediante `ISchedulingStore`, `IConfigurationStore`, `IClock`, `IIdGenerator` e `ICurrentActor`. Controllers traducen DTO/resultados y no acceden a `DbContext`; Infrastructure implementa consultas EF Core sin seguimiento.

La migración `20260903011634_AddSchedulingAvailability` añade `working_schedules`, `availability_exceptions` y la base estructural de `appointments`. PostgreSQL refuerza:

- valores de día, hora, vigencia, duración, estado, origen y motivo;
- claves foráneas restrictivas e índices por barbero/instante;
- exclusión GiST de horarios activos cuando coinciden día, vigencia e intervalo;
- exclusión GiST de citas activas solapadas por barbero;
- concurrencia optimista mediante `xmin` y auditoría automática.

Los endpoints operativos de alta y transición de cita pertenecen a Fase 6; en Fase 5 la tabla sólo aporta el dato de ocupación y la detección de conflictos, sin adelantar ese flujo.

## 5. API, permisos y PWA

OWNER y ADMIN pueden crear, cambiar o desactivar horarios/excepciones. OWNER, ADMIN y BARBER autenticados pueden listar reglas y consultar alternativas. La prueba HTTP demuestra escritura permitida al administrador y `403` al barbero; el catálogo de agenda sólo expone identificador, nombre visible y color de barberos activos.

La ruta PWA `/scheduling` incorpora consulta, horarios y excepciones. Expone carga, error, vacío, confirmación, conflictos y bloqueo offline de mutaciones. Los formularios usan controles semánticos de fecha/hora y el adaptador convierte la hora de negocio a ISO 8601; la UI no decide si un espacio es válido.

## 6. Validación ejecutada

```text
.NET Release: 0 advertencias, 0 errores
Backend: 45 Domain + 1 Application + 2 arquitectura + 10 integración = 58/58
Frontend: Prettier + ESLint/Oxlint + 10/10 pruebas + TypeScript/Vite/PWA build
PostgreSQL 18: migración desde cero y restricciones de exclusión verificadas
Rendimiento: volumen objetivo del motor y endpoint por debajo de 3 s
Compose: migración aplicada; db/api/web saludables
Playwright: redirección anónima real y UI autenticada en móvil/tablet sin errores de consola
```

Evidencia visual local:

- `output/playwright/fase-5/availability-mobile.png`
- `output/playwright/fase-5/schedules-tablet.png`

## 7. Decisión G5

G5 queda **aprobada**. La matriz de intervalos pasa, la API entrega alternativas concretas y agenda interna puede consumir el motor sin reproducir lógica temporal en controllers o React.

La próxima fase autorizada es **Fase 6 — Clientes y agenda interna**.
