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
| GET/POST | `/users` | Dueño |
| GET | `/users/{id}` | Dueño |
| PUT | `/users/{id}/roles` | Dueño |
| POST | `/users/{id}/activate` | Dueño |
| POST | `/users/{id}/deactivate` | Dueño; revoca sesiones |
| POST | `/users/{id}/reset-password` | Dueño; revoca sesiones |
| GET/POST | `/staff` | Dueño |
| PATCH | `/staff/{id}` | Dueño |
| GET/POST | `/barbers` | Lectura personal / escritura dueño |
| PATCH | `/barbers/{id}` | Dueño |
| GET/POST | `/barbers/{id}/commission-rules` | Dueño |

Todas las rutas de la tabla se publican bajo `/api/v1`. La cuenta en `users` es identidad técnica; `staff` y `barbers`, incorporados en Fase 4, contienen el perfil humano y laboral. La PWA no almacena tokens en Web Storage: usa cookie de sesión `HttpOnly` same-origin y envía `X-CSRF-TOKEN` en mutaciones.

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

Los horarios reciben `weekday` (lunes `1` a domingo `7`), `startLocalTime`, `endLocalTime`, `validFrom` y `validTo` opcional. Se permiten varios bloques adyacentes, pero un solapamiento de hora y vigencia para el mismo barbero devuelve `409`. Las excepciones reciben instantes ISO 8601, `kind` (`UNAVAILABLE` o `AVAILABLE_OVERRIDE`) y un motivo obligatorio.

Una modificación de horario o ausencia nunca cancela citas. La respuesta de la mutación contiene `conflicts` con las citas activas que quedaron fuera de cobertura para revisión humana. OWNER y ADMIN administran horarios; OWNER, ADMIN y BARBER consultan disponibilidad. Las consultas se calculan desde información derivable y no mantienen caché persistente, evitando resultados obsoletos tras cambios de oferta, horario, excepción o cita.

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
| POST | `/public/appointments` | Reserva pública |
| GET/PATCH | `/public/appointments/{token}` | Consultar/cambiar con token |
| POST | `/public/appointments/{token}/cancel` | Cancelar con token |

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

Las rutas internas anteriores están implementadas; `/public/*` continúa pendiente de Fase 11. Los endpoints implementados devuelven objetos/colecciones directamente, no el envoltorio conceptual `data/meta` de la sección 1. El esquema OpenAPI se genera desde Controllers en desarrollo.

- `GET /customers?query=`: máximo 50 coincidencias, búsqueda de hasta 120 caracteres por nombre o teléfono. Solo OWNER/ADMIN; incluye `id`, `displayName`, `phone`, `notes`, `version`.
- Alta/corrección de cliente: `displayName`, `phone`, `notes` opcional (máximo 1000); PATCH agrega `version`. Devuelve `{ customer, possibleDuplicates }`. Un teléfono local de ocho dígitos se normaliza con `+591`; compartirlo no bloquea el alta.
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
| POST | `/appointments/{id}/operation` | Crear desde cita |
| GET/PATCH | `/operations/{id}` | Consultar/editar borrador |
| POST | `/operations/{id}/items` | Añadir detalle |
| PATCH/DELETE | `/operations/{id}/items/{itemId}` | Modificar/quitar borrador |
| POST | `/operations/{id}/adjustments` | Descuento/cortesía |
| POST | `/operations/{id}/ready` | Validar para cobro |
| POST | `/operations/{id}/pay` | Cierre atómico |
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

El servidor responde con totales, movimientos de inventario y comisiones creadas. Repetir la misma solicitud con igual `Idempotency-Key` devuelve el mismo resultado.

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

## 7. Comisiones y liquidaciones

| Método | Ruta | Propósito |
|---|---|---|
| GET | `/commissions` | Propias o filtradas según rol |
| GET | `/barbers/{id}/commissions/available` | Disponibles para liquidar |
| POST | `/settlements` | Crear borrador |
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

## 8. Paneles, reportes y auditoría

| Método | Ruta | Propósito |
|---|---|---|
| GET | `/dashboard/daily?date=` | Operación del día |
| GET | `/reports/sales` | Servicios/productos/cobros |
| GET | `/reports/commissions` | Generadas/pendientes/pagadas |
| GET | `/reports/expenses` | Gastos |
| GET | `/reports/operating-result` | Resultado aproximado |
| GET | `/reports/barber-performance` | Producción/ocupación |
| GET | `/reports/{name}.csv` | Exportación autorizada |
| GET | `/audit` | Bitácora, solo dueño |

## 9. Paginación y filtros

Listados usan cursor para grandes históricos; agenda por rango puede devolver colección completa acotada. Filtros de fechas exigen límites razonables. Orden predeterminado: eventos operativos ascendentes por hora; históricos descendentes por fecha.

## 10. Protección de rutas públicas

- Limitación por IP/huella razonable.
- Token CSRF cuando aplique al mecanismo de sesión.
- Token de gestión de alta entropía y almacenado con hash.
- Mensajes que no permitan enumerar clientes o citas.
- CAPTCHA solo si aparece abuso real; no añadir fricción desde el primer día.
