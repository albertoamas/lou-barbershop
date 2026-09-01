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

### Error

```json
{
  "error": {
    "code": "SLOT_TAKEN",
    "message": "El horario acaba de ser reservado.",
    "fieldErrors": {}
  },
  "meta": { "requestId": "uuid" }
}
```

### Códigos relevantes

`VALIDATION_ERROR`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `VERSION_CONFLICT`, `SLOT_TAKEN`, `OUT_OF_STOCK`, `PAYMENT_MISMATCH`, `COMMISSION_RULE_MISSING`, `ALREADY_SETTLED`, `INVALID_STATE`, `RATE_LIMITED`.

Las mutaciones sensibles aceptan `Idempotency-Key`. Los recursos editables reciben `version` para control optimista.

## 2. Identidad y personal

| Método | Ruta | Permiso |
|---|---|---|
| POST | `/auth/login` | Público |
| POST | `/auth/logout` | Autenticado |
| GET | `/me` | Autenticado |
| GET/POST | `/staff` | Dueño |
| PATCH | `/staff/{id}` | Dueño |
| GET/POST | `/barbers` | Lectura personal / escritura dueño |
| PATCH | `/barbers/{id}` | Dueño |
| GET/POST | `/barbers/{id}/commission-rules` | Dueño |

## 3. Catálogo y disponibilidad

| Método | Ruta | Propósito |
|---|---|---|
| GET/POST | `/services` | Listar/crear servicios |
| PATCH | `/services/{id}` | Modificar/desactivar |
| GET/POST | `/barbers/{id}/offerings` | Oferta por barbero |
| GET/POST | `/barbers/{id}/schedules` | Horario semanal |
| GET/POST | `/barbers/{id}/exceptions` | Ausencia/bloqueo |
| GET/POST | `/products` | Catálogo de productos |
| PATCH | `/products/{id}` | Modificar/desactivar |
| GET | `/availability` | Horarios válidos |

Ejemplo:

```http
GET /api/v1/availability?serviceId=...&barberId=any&dateFrom=2026-09-01&dateTo=2026-09-07
```

Respuesta devuelve `startsAt`, `endsAt`, `barberId`, `priceCents` y `durationMinutes`.

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
