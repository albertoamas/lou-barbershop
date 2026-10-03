# Contrato inicial de API

La API es interna a la aplicación web, pero se documenta como contrato para separar interfaz y reglas. Prefijo sugerido: `/api/v1`. JSON usa importes enteros en centavos y fechas ISO 8601.

## 1. Convenciones

### Respuesta exitosa

```json
{
  "data": {},
  "meta": { "requestId": "uuid" }
}
```

### Error `ProblemDetails`

```json
{
  "type": "https://lou-barbershop.local/errors/state.invalid_transition",
  "title": "La solicitud no puede procesarse.",
  "status": 409,
  "detail": "La transición de estado no está permitida.",
  "code": "state.invalid_transition",
  "requestId": "uuid"
}
```

`code` es estable para que la PWA tome decisiones sin analizar texto. Los
códigos de validación devuelven 400; conflictos de estado, 409; y desbordes
que no puede corregir el usuario, 422. Nunca se incluyen secretos ni detalles
internos de excepción.

### Códigos relevantes

`VALIDATION_ERROR`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `VERSION_CONFLICT`, `SLOT_TAKEN`, `OUT_OF_STOCK`, `PAYMENT_MISMATCH`, `COMMISSION_RULE_MISSING`, `ALREADY_SETTLED`, `INVALID_STATE`, `RATE_LIMITED`.

Las mutaciones sensibles aceptan `Idempotency-Key`. Los recursos editables reciben `version` para control optimista.

## 2. Identidad y personal

| Método | Ruta | Permiso |
|---|---|---|
| GET | `/auth/antiforgery` | Público; entrega token ligado a cookie |
| POST | `/auth/login` | Público; antiforgery y rate limit |
| POST | `/auth/logout` | Autenticado; antiforgery |
| GET | `/auth/me` | Autenticado |
| POST | `/auth/change-password` | Autenticado; exige contraseña actual |
| POST | `/auth/mfa/setup` | Autenticado; genera clave TOTP tras reautenticación |
| POST | `/auth/mfa/enable` | Autenticado; confirma TOTP y entrega códigos de recuperación una vez |
| POST | `/auth/mfa/disable` | Autenticado; exige contraseña y segundo factor actual |
| GET/POST | `/users` | Dueño |
| GET | `/users/{id}` | Dueño |
| PUT | `/users/{id}/roles` | Dueño |
| POST | `/users/{id}/activate` | Dueño |
| POST | `/users/{id}/deactivate` | Dueño; revoca sesiones |
| POST | `/users/{id}/reset-password` | Dueño; revoca sesiones |
| POST | `/users/{id}/reset-mfa` | Dueño; revoca el MFA de otra cuenta y sus sesiones |
| GET/POST | `/staff` | Dueño |
| PATCH | `/staff/{id}` | Dueño |
| GET/POST | `/barbers` | Lectura personal / escritura dueño |
| PATCH | `/barbers/{id}` | Dueño |
| GET/POST | `/barbers/{id}/commission-rules` | Dueño |

Todas las rutas de la tabla se publican bajo `/api/v1`. La cuenta en `users` es identidad técnica; `staff` y `barbers`, incorporados en Fase 4, contienen el perfil humano y laboral. La PWA no almacena tokens en Web Storage: usa cookie de sesión `HttpOnly` same-origin y envía `X-CSRF-TOKEN` en mutaciones. Cuando una cuenta tiene MFA activo, `POST /auth/login` responde `401` con `code=auth.two_factor_required` hasta recibir `twoFactorCode`; acepta TOTP o un código de recuperación de un solo uso.

## 3. Catálogo y disponibilidad

| Método | Ruta | Propósito |
|---|---|---|
| GET/POST | `/services` | Listar/crear servicios |
| PATCH | `/services/{id}` | Modificar/desactivar |
| GET/POST | `/barbers/{id}/offerings` | Oferta por barbero |
| GET/POST | `/barbers/{id}/schedules` | Horario semanal |
| PATCH | `/barbers/{id}/schedules/{scheduleId}` | Cambiar vigencia/estado con versión |
| GET/POST | `/barbers/{id}/availability-exceptions` | Ausencia u horario extraordinario |
| POST | `/barbers/{id}/availability-exceptions/{exceptionId}/deactivate` | Desactivar excepción con versión |
| GET/POST | `/products` | Catálogo de productos |
| PATCH | `/products/{id}` | Modificar/desactivar |
| GET/POST | `/expense-categories` | Categorías de gasto |
| PATCH | `/expense-categories/{id}` | Modificar/desactivar categoría |
| GET | `/availability` | Horarios válidos |
| GET | `/availability/barbers` | Barberos activos visibles en agenda |

Ejemplo:

```http
GET /api/v1/availability?serviceId=...&barberId=any&dateFrom=2026-09-01&dateTo=2026-09-07
```

Respuesta devuelve `startsAt`, `endsAt`, `barberId`, `barberName`, `serviceId`, `priceCents` y `durationMinutes`. `barberId=any` resuelve cada alternativa a un barbero concreto. El rango es inclusivo y admite de 1 a 31 días; las horas pasadas no se devuelven.

Los horarios reciben `weekday` (lunes `1` a domingo `7`), `startLocalTime`, `endLocalTime`, `validFrom` y `validTo` opcional. Se permiten varios bloques adyacentes, pero cada bloque debe caber completo en 08:00–13:00 o 15:00–21:00; salir de esas ventanas devuelve `400` con `schedule.outside_shop_hours`. Un solapamiento de hora y vigencia para el mismo barbero devuelve `409`. Las excepciones reciben instantes ISO 8601, `kind` (`UNAVAILABLE` o `AVAILABLE_OVERRIDE`) y un motivo obligatorio; un `AVAILABLE_OVERRIDE` fuera del horario de sucursal devuelve `400` con `availability_exception.outside_shop_hours`.

Una modificación de horario o ausencia nunca cancela citas. La respuesta de la mutación contiene `conflicts` con las citas activas que quedaron fuera de cobertura para revisión humana. OWNER y ADMIN administran horarios y pueden consultar los horarios/excepciones de todo el equipo. BARBER sólo consulta sus propios horarios y excepciones; `GET /barbers/{id}/schedules` y `GET /barbers/{id}/availability-exceptions` devuelven `403` al solicitar otro perfil. La consulta general de espacios no cambia. Las consultas se calculan desde información derivable y no mantienen caché persistente, evitando resultados obsoletos tras cambios de oferta, horario, excepción o cita.

Las alternativas de disponibilidad comienzan únicamente cada 30 minutos (`:00` o `:30`). La duración y el precio continúan siendo los efectivos de la oferta/barbero; el intervalo completo debe terminar antes del cierre de la ventana correspondiente.

### Contratos de maestros incorporados en Fase 4

- `POST /staff` vincula una cuenta existente mediante `userId`, `displayName` y `phone` opcional. Una cuenta no puede tener dos perfiles.
- `POST /barbers` recibe `staffProfileId`, `employmentType` (`OWNER`/`CONTRACTOR`), `settlementFrequency` y color opcional. El mismo perfil no se duplica.
- `POST /services` y `POST /products` reciben los importes en centavos enteros. Sus `PATCH` exigen el `version` devuelto por la última lectura y permiten desactivación lógica.
- `POST /barbers/{id}/offerings` crea una nueva condición con `serviceId`, `durationMinutes`, `priceCents`, `validFrom` y `validTo` opcional. No edita una vigencia previa.
- `GET /barbers/{id}/offerings/effective?serviceId=...&date=YYYY-MM-DD` reproduce la condición aplicable: primero oferta activa del barbero y, si no existe, referencia del servicio.
- `POST /barbers/{id}/commission-rules` recibe `kind`, `rateBasisPoints`, `validFrom` y `validTo`. Sólo acepta contratados y rechaza períodos solapados del mismo tipo.
- `GET /barbers/{id}/commission-rules/effective?kind=SERVICE&date=YYYY-MM-DD` devuelve la tasa reproducible para esa fecha o `404` si no existe.
- ofertas y reglas se desactivan mediante `POST /barbers/{barberId}/.../{id}/deactivate` con `version`; el registro histórico permanece.

PostgreSQL refuerza las vigencias con restricciones de exclusión, además de la validación de Application. Una colisión concurrente o versión obsoleta devuelve `409 ProblemDetails`; un importe, duración, tasa o período inválido devuelve `400`.

## 4. Clientes y citas

| Método | Ruta | Propósito |
|---|---|---|
| GET | `/customers?query=` | Buscar nombre/teléfono |
| POST | `/customers` | Crear cliente |
| PATCH | `/customers/{id}` | Corregir datos mínimos |
| GET | `/appointments` | Agenda filtrada |
| POST | `/appointments` | Crear cita interna |
| GET | `/appointments/{id}` | Detalle |
| PATCH | `/appointments/{id}/reschedule` | Reprogramar/reasignar |
| POST | `/appointments/{id}/check-in` | Marcar llegada |
| POST | `/appointments/{id}/start` | Iniciar atención, sin operación económica |
| GET | `/appointments/{id}/events` | Historial antes/después, actor y motivo |
| GET | `/appointments/{id}/availability` | Alternativas para cambiar cita excluyendo su propio intervalo |
| POST | `/appointments/{id}/cancel` | Cancelar |
| POST | `/appointments/{id}/no-show` | Inasistencia |
| GET | `/public/catalog` | Servicios y barberos públicos activos |
| GET | `/public/availability` | Horarios públicos por servicio/barbero/día |
| POST | `/public/appointments` | Reserva pública |
| GET/PATCH | `/public/appointments/manage` | Consultar/cambiar con cabecera privada |
| POST | `/public/appointments/manage/cancel` | Cancelar con cabecera privada |

Crear cita:

```json
{
  "customerId": "uuid",
  "serviceId": "uuid",
  "barberId": "uuid",
  "startsAt": "2026-09-01T14:00:00-04:00"
}
```

No se acepta precio desde el cliente; el servidor obtiene y congela la oferta vigente.

### Contrato implementado en Fase 6

Las rutas internas y públicas anteriores están implementadas. Los endpoints devuelven objetos/colecciones directamente, no el envoltorio conceptual `data/meta` de la sección 1. El esquema OpenAPI se genera desde Controllers en desarrollo.

### Contrato público implementado en Fase 11

- `GET /public/catalog` entrega únicamente nombre, descripción, duración/precio de referencia y barberos activos; no expone usuarios, clientes, teléfonos ni configuración interna.
- `GET /public/availability` acepta `serviceId`, `barberId=any|uuid`, `dateFrom` y `dateTo`; usa el mismo motor autoritativo de disponibilidad y el límite de 31 días.
- `POST /public/appointments` acepta `serviceId`, barbero concreto de la alternativa, `startsAt`, `displayName`, `phone` y `privacyAccepted`. Precio, duración y disponibilidad se recalculan dentro de la transacción.
- La creación devuelve la cita y una sola vez `managementToken`/`managementPath`. La PWA coloca el token en el fragmento `#` del enlace, que el navegador no envía al servidor al pedir la página.
- Consultar, reprogramar y cancelar usan `X-Management-Token`; el token nunca forma parte de la ruta API ni del query string. Reprogramar rota el token y cancelar lo revoca.
- El servidor guarda SHA-256 del token aleatorio de 256 bits y caducidad 48 horas después del fin previsto; nombre/teléfono no sirven como autorización.
- Token ausente, inválido, vencido o revocado produce el mismo 404. No existe listado público de citas/clientes.
- Todas las rutas públicas tienen rate limit por IP. Las mutaciones conservan antiforgery same-origin y nunca se reintentan ni encolan offline.
- Crear reservas tiene además una ventana propia de 6 solicitudes por hora/IP por defecto. Un mismo teléfono puede conservar como máximo dos reservas públicas futuras activas; la tercera responde `409` con `code=booking.active_limit`. El límite se evalúa dentro de la misma transacción y bloqueo lógico que crea la cita.

- `GET /customers?query=`: máximo 50 coincidencias, búsqueda de hasta 120 caracteres por nombre o teléfono. OWNER/ADMIN reciben `notes`; BARBER necesita al menos tres caracteres para buscar y sólo recibe el subconjunto necesario para abrir una atención propia, sin notas.
- Alta/corrección de cliente: `displayName`, `phone`, `notes` opcional (máximo 1000); PATCH agrega `version`. OWNER/ADMIN crean y corrigen; BARBER puede crear para una atención y el servidor ignora cualquier nota. Devuelve `{ customer, possibleDuplicates }`. Un teléfono local de ocho dígitos se normaliza con `+591`; compartirlo no bloquea el alta.
- `GET /appointments?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD&barberId=uuid`: rango inclusivo de 1 a 31 días en Bolivia. Omitir barbero consulta todos para administración y solo el propio para BARBER. No se permite un filtro ajeno al barbero.
- La cita devuelve cliente/barbero/servicio y nombres, instantes ISO, `status`, `quotedPriceCents`, `quotedDurationMinutes`, `version`. Para BARBER el precio es `null`; no se entregan teléfono ni notas del cliente.
- `PATCH /appointments/{id}/reschedule`: `barberId`, `serviceId`, `startsAt`, `version`, `reason` (1–300 caracteres no vacíos). Solo CONFIRMED; cambia fecha, servicio y/o barbero en una sola operación con nuevo snapshot.
- `GET /appointments/{id}/availability?serviceId=uuid&barberId=uuid&date=YYYY-MM-DD`: solo administración; omitir `barberId` equivale a cualquiera. Excluye únicamente esa cita, previa comprobación de permiso/estado. La confirmación vuelve a validar dentro de transacción.
- Transiciones: `version` y `reason` obligatorio para cancelación/inasistencia. Inasistencia no se admite antes de la hora prevista. Llegada/inicio pueden realizarlos OWNER/ADMIN o el barbero asignado; solo administración cancela/reprograma/marca inasistencia.
- Eventos: `id`, `appointmentId`, `actorId`, `occurredAt`, `action`, `reason`, `before`, `after`. Snapshots incluyen estado, barbero, servicio, intervalo, precio y duración. Solo OWNER/ADMIN.
- Errores: 400 validación, 403 permisos, 404 inexistente, 409 `SLOT_TAKEN`, `VERSION_CONFLICT` o `INVALID_STATE`. Una carrera de `xmin` detectada por persistencia conserva el código común `version.conflict`.
- Todas las mutaciones exigen cookie y antiforgery. Ninguna funciona offline. La agenda no crea pagos, comisiones ni operaciones; no ofrece completar una atención (Fase 7).

La cabecera `Idempotency-Key` de la especificación general todavía no tiene registro de replay en estas altas de agenda. Ante respuesta incierta se consulta el estado antes de reintentar; no hay reintentos automáticos de mutaciones.

## 5. Operaciones, pagos y reversos

| Método | Ruta | Propósito |
|---|---|---|
| POST | `/operations` | Llegada directa/venta independiente |
| GET | `/operations/own-barber` | Resolver el perfil de barbero de la sesión actual |
| POST | `/appointments/{id}/operation` | Crear desde cita |
| GET | `/operations/{id}` | Consultar atención |
| PUT | `/operations/{id}/services` | Reemplazar servicios reales del borrador |
| POST | `/operations/{id}/adjustments` | Descuento/cortesía |
| POST | `/operations/{id}/ready` | Validar para cobro |
| POST | `/operations/{id}/pay` | Cierre atómico |
| GET | `/operations/daily?date=YYYY-MM-DD` | Panel diario propio o administrativo |
| POST | `/operations/{id}/reverse` | Reverso por dueño |

Pago mixto:

```json
{
  "version": 4,
  "payments": [
    { "method": "CASH", "amountCents": 3000 },
    { "method": "QR", "amountCents": 4000 }
  ]
}
```

El servidor responde con la operación, sus totales y pagos. La comisión se registra internamente y no se mezcla con el dinero cobrado. Repetir la misma solicitud con igual `Idempotency-Key` devuelve el mismo resultado.

### Contrato implementado en Fase 7

- `POST /operations` recibe únicamente `customerId` y `barberId`. No crea cita ficticia.
- `GET /operations/own-barber` devuelve únicamente el `barberId` asociado a la sesión con rol BARBER. Permite fijar la llegada directa al perfil propio sin mostrar un selector de compañeros; OWNER/ADMIN no consumen esta ruta.
- `POST /appointments/{id}/operation` solo acepta cita `CHECKED_IN` o `IN_SERVICE`, exige barbero propio/administración, evita duplicados y precarga el snapshot reservado.
- `PUT /operations/{id}/services` recibe `version` y `services: [{ serviceId }]`. Reemplaza el detalle mientras está `DRAFT`; nombre y precio efectivo los resuelve el servidor para fecha/barbero.
- `POST /operations/{id}/adjustments` recibe `version`, `discountCents`, `courtesy` y `reason`. Solo OWNER/ADMIN; un ajuste no puede producir total negativo.
- `POST /operations/{id}/ready` recibe `version`; exige al menos un servicio o producto.
- `POST /operations/{id}/pay` recibe `version` y componentes `CASH`/`QR`, además de `Idempotency-Key` obligatoria (máximo 120 caracteres). Pago positivo y suma exacta; una cortesía total exige arreglo vacío.
- El cierre guarda operación, pagos, comisión, cita/evento e idempotencia en la misma transacción. `COMMISSION_RULE_MISSING`, `PAYMENT_MISMATCH`, versión obsoleta o fallo de persistencia no dejan efectos parciales.
- La clave se persiste como hash. Repetirla para la misma operación devuelve el cierre anterior; reutilizarla en otra operación devuelve `IDEMPOTENCY_KEY_REUSED`.
- `GET /operations/daily` usa el día Bolivia y devuelve contadores, total, efectivo, QR y operaciones. BARBER solo recibe las propias.
- La respuesta no expone filas de comisión. Fase 8 añade productos y movimientos; los reversos coordinados de cobro/comisión siguen pendientes de Fase 9.
- Todos los cambios requieren sesión, antiforgery y conexión. La PWA conserva la misma clave para reintentar una respuesta incierta y no encola el cobro offline.

OpenAPI se genera desde los Controllers de ASP.NET Core en desarrollo y refleja estas rutas/DTO. La decisión transaccional está en [ADR-014](../adr/ADR-014-cierre-atomico-atencion.md).

## 6. Inventario y gastos

| Método | Ruta | Propósito |
|---|---|---|
| GET | `/inventory` | Existencias y alertas |
| GET | `/products/{id}/movements` | Kardex simple |
| POST | `/inventory-receipts` | Recepción pagada con uno o más productos |
| GET | `/inventory-receipts` | Historial de recepciones |
| POST | `/inventory-receipts/{id}/reverse` | Reverso autorizado |
| POST | `/products/{id}/adjustments` | Ajuste con motivo |
| GET/POST | `/expense-categories` | Categorías |
| GET/POST | `/expenses` | Consultar/registrar gasto |
| POST | `/expenses/{id}/void` | Anular gasto |
| GET | `/cash-flow?dateFrom=&dateTo=` | Cobros y salidas por medio, separando inventario de gasto |

### Contrato implementado en Fase 8

- `PUT /operations/{id}/products` recibe `version` y `products: [{ productId, quantity }]`; el servidor congela precio y costo vigente.
- El pago confirma la salida de inventario en la misma transacción. Falta de unidades devuelve `OUT_OF_STOCK` sin pago, comisión ni movimiento parcial.
- `POST /inventory-receipts` recibe fecha, medio y uno o más detalles positivos; el servidor calcula total, promedio y movimientos.
- `POST /products/{id}/adjustments` exige tipo, delta y motivo. OWNER puede autorizar una corrección negativa; ADMIN no puede dejar stock negativo.
- `POST /expenses/{id}/void` exige `version` y motivo; conserva el gasto y lo excluye del flujo vigente.
- El reverso integral de recepción de la tabla conceptual se mantiene fuera del contrato ejecutable de Fase 8; las correcciones se registran como ajuste explícito.

## 7. Comisiones y liquidaciones

| Método | Ruta | Propósito |
|---|---|---|
| GET | `/commissions` | Propias o filtradas según rol |
| POST | `/settlements` | Crear borrador |
| GET | `/settlements` | Propias o filtradas según rol |
| GET | `/settlements/{id}` | Detalle |
| POST | `/settlements/{id}/adjustments` | Ajuste |
| POST | `/settlements/{id}/close` | Cerrar |
| POST | `/settlements/{id}/pay` | Pagar completa |

Crear borrador:

```json
{
  "barberId": "uuid",
  "periodEnd": "2026-09-15"
}
```

El servidor selecciona comisiones disponibles; el cliente no envía importes calculados.

### Contrato implementado en Fase 9

- `GET /commissions?barberId=&status=` devuelve detalle, operación, base, tasa histórica, importe firmado, tipo, estado, fecha y referencia de reverso. BARBER solo puede consultar lo propio; OWNER puede filtrar.
- `POST /settlements` es exclusivo de OWNER. Selecciona entradas `AVAILABLE` no nulas hasta el final de `periodEnd` en `America/La_Paz`; el bloqueo transaccional y el índice único global impiden incluir una comisión dos veces.
- `GET /settlements` y `GET /settlements/{id}` entregan el comprobante interno reproducible. BARBER solo ve los propios.
- Los ajustes reciben `version`, `amountCents` con signo y `reason`; no pueden hacer negativo el total y quedan ligados al actor autenticado.
- Cerrar recibe `version`; pagar recibe además `paymentDate` y `method`. El pago es completo y una liquidación pagada no acepta cambios.
- `POST /operations/{id}/reverse` recibe `version` y `reason`, solo OWNER. Excluye el cobro de caja vigente, repone productos mediante movimientos y, si la comisión aún estaba disponible, la anula. Si ya estaba liquidada/pagada, crea una entrada negativa futura sin modificar la original.
- Ninguna mutación de comisión, liquidación o reverso funciona offline.

## 8. Paneles, reportes y auditoría

| Método | Ruta | Propósito |
|---|---|---|
| GET | `/reports/daily?date=` | Citas, atenciones y cobros del día |
| GET | `/reports/period?dateFrom=&dateTo=` | Resultado, caja y detalle reconciliable |
| GET | `/reports/barber-performance?dateFrom=&dateTo=` | Producción/ocupación |
| GET | `/reports/export?report=period|barbers&dateFrom=&dateTo=` | CSV UTF-8 autorizado |
| GET | `/audit?dateFrom=&dateTo=&entityType=&actorId=&page=&pageSize=` | Bitácora paginada, solo dueño |

Todas las rutas son exclusivas de `OWNER`; el servidor limita el período a 367 días y usa bordes de día en `America/La_Paz`. `period` devuelve totales y fuentes de operaciones, gastos y liquidaciones. El CSV neutraliza celdas que comienzan con `=`, `+`, `-`, `@`, tabulador o retorno antes de aplicar escapado RFC 4180.

## 9. Paginación y filtros

Listados usan cursor para grandes históricos; agenda por rango puede devolver colección completa acotada. Filtros de fechas exigen límites razonables. Orden predeterminado: eventos operativos ascendentes por hora; históricos descendentes por fecha.

## 10. Protección de rutas públicas

- Limitación por IP/huella razonable.
- Token CSRF cuando aplique al mecanismo de sesión.
- Token de gestión de alta entropía y almacenado con hash.
- Mensajes que no permitan enumerar clientes o citas.
- CAPTCHA solo si aparece abuso real; no añadir fricción desde el primer día.
