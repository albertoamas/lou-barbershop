# Wireframes de los seis flujos críticos

**Estado:** propuesta de baja fidelidad para aceptación de Fase 0  
**Objetivo:** validar jerarquía, pasos, información y acciones; no colores, marca o acabado visual.  
**Dispositivos:** teléfono para todos; agenda semanal y gestión amplia también en tablet.

## 1. Convenciones

- `[ Acción ]`: botón.
- `( )`: opción única.
- `[ ]`: selección múltiple.
- `!`: advertencia o error.
- `⋮`: acciones secundarias.
- La acción primaria aparece al final y es única por pantalla.
- Atrás conserva datos mientras el objeto no haya sido confirmado.

### Navegación interna

```text
Dueño:          Hoy | Agenda | Atender | Dinero | Más
Administración: Hoy | Agenda | Nueva cita | Cobrar | Más
Barbero:        Mi día | Atender | Mis comisiones | Perfil
```

---

## 2. Flujo A — Crear cita interna

**Actor:** administración/dueño  
**Objetivo:** confirmar una cita habitual en menos de un minuto.  
**Pasos:** servicio → barbero → horario → cliente/confirmación.

### A1 — Servicio

```text
┌──────────────────────────────┐
│ ‹ Hoy        Nueva cita      │
│ Paso 1 de 4                  │
│                              │
│ ¿Qué servicio necesita?      │
│ [ Buscar servicio...       ] │
│                              │
│ Corte clásico        45 min  │
│ Desde 50,00 Bs              ›│
│                              │
│ Barba                 30 min │
│ 35,00 Bs                    ›│
│                              │
│ Corte y barba         75 min │
│ 90,00 Bs                    ›│
└──────────────────────────────┘
```

No se pide cliente primero: servicio/duración determina disponibilidad.

### A2 — Barbero

```text
┌──────────────────────────────┐
│ ‹ Servicio    Elegir barbero │
│ Paso 2 de 4                  │
│                              │
│ (•) Cualquier disponible     │
│ ( ) Alex       70 Bs · 45 min│
│ ( ) Diego      50 Bs · 45 min│
│ ( ) Mateo      55 Bs · 60 min│
│                              │
│          [ Ver horarios ]    │
└──────────────────────────────┘
```

Precio y duración cambian junto al barbero, antes de consultar horario.

### A3 — Horario

```text
┌──────────────────────────────┐
│ ‹ Barbero       Septiembre › │
│ Lun 7  Mar 8  Mié 9  Jue 10 │
│        ━━━━━                 │
│                              │
│ Mañana                       │
│ [10:00 Diego] [11:00 Mateo]  │
│ [11:30 Diego]                │
│                              │
│ Tarde                        │
│ [15:00 Alex ] [15:30 Diego]  │
│ [17:00 Mateo]                │
└──────────────────────────────┘
```

“Cualquier disponible” siempre muestra el barbero concreto en cada alternativa.

### A4 — Cliente y confirmación

```text
┌──────────────────────────────┐
│ ‹ Horario      Confirmar     │
│ Mar 8 · 10:00–10:45 · Diego │
│ Corte clásico · 50,00 Bs     │
│                              │
│ Teléfono / WhatsApp          │
│ [ +591 70000001            ] │
│ Cliente encontrado           │
│ Ana Prueba                   │
│                              │
│ Nota opcional                │
│ [                          ] │
│                              │
│        [ Confirmar cita ]     │
└──────────────────────────────┘
```

### Estados y validación

- Si el horario fue tomado al confirmar: no borrar cliente; mostrar `Este horario acaba de ocuparse` y volver a alternativas.
- Teléfono compartido: mostrar personas coincidentes para elegir, no fusionar.
- Éxito: resumen y acciones `Ver cita` / `Nueva cita`; comunicación por WhatsApp continúa manual.

### Aceptación del wireframe

- Cuatro pasos como máximo.
- Siempre muestra barbero, precio, duración y hora antes de confirmar.
- La interfaz no permite escribir manualmente un horario no validado.
- Un error concurrente es recuperable sin reiniciar.

---

## 3. Flujo B — Agenda interna y contingencia

**Actor:** administración/dueño; barbero ve versión propia.  
**Objetivo:** entender el día y cambiar una cita sin perder contexto.

### Tablet — agenda diaria por columnas

```text
┌──────────────────────────────────────────────────────────────┐
│ Hoy · Martes 8 septiembre       [ + Nueva cita ] [ Filtros ]│
├──────────┬─────────────────┬─────────────────┬───────────────┤
│ Hora     │ Alex            │ Diego           │ Mateo         │
├──────────┼─────────────────┼─────────────────┼───────────────┤
│ 09:00    │ Ana             │                 │ Bruno         │
│          │ Corte · 45 min  │                 │ Corte · 60 min│
│ 10:00    │                 │ Camila          │               │
│          │                 │ Barba · 30 min  │               │
│ 11:00    │                 │ [ BLOQUEADO ]   │ Daniel        │
│ 12:00    │ Elena           │                 │               │
└──────────┴─────────────────┴─────────────────┴───────────────┘
```

### Teléfono — lista cronológica

```text
┌──────────────────────────────┐
│ Mi día · Mar 8        Diego  │
│                              │
│ 10:00  Camila                │
│ Barba · Confirmada           │
│ [ Marcar llegada ]           │
│                              │
│ 11:00–12:00                  │
│ No disponible                │
│                              │
│ 12:15  Libre                 │
└──────────────────────────────┘
```

### Detalle y acciones autorizadas

```text
┌──────────────────────────────┐
│ ‹ Agenda       Cita de Camila│
│ Mar 8 · 10:00 · Diego        │
│ Barba · 30 min · 35,00 Bs    │
│                              │
│ [ Marcar llegada ]           │
│ [ Reprogramar ]              │
│ [ Cambiar barbero ]          │
│ [ Cancelar cita ]            │
│ ⋮ Marcar inasistencia        │
└──────────────────────────────┘
```

El barbero ve `Marcar llegada` y datos propios, pero no reprograma/cancela por emergencia. Dueño/administración gestionan el cambio.

### Aceptación del wireframe

- Estados tienen texto, no solo color.
- Tablet aprovecha columnas; teléfono no exige desplazamiento horizontal.
- Cambiar/cancelar requiere motivo cuando corresponde y muestra efecto.
- Una cita completada no ofrece cancelación.

---

## 4. Flujo C — Atención real

**Actor:** barbero, administración o dueño.  
**Objetivo:** registrar lo realizado sin procesos administrativos largos.

### C1 — Abrir atención

```text
┌──────────────────────────────┐
│ Atención · Ana · Diego       │
│ Origen: cita 10:00           │
│                              │
│ Servicios realizados         │
│ Corte clásico                │
│ 1 × 50,00 Bs             [⋮]│
│                              │
│ [ + Añadir servicio ]        │
│ [ + Añadir producto ]        │
│                              │
│ Subtotal            50,00 Bs │
│          [ Ir al cobro ]      │
└──────────────────────────────┘
```

Una llegada directa empieza con búsqueda/creación rápida de cliente y barbero efectivo, y muestra `Origen: sin reserva`.

### C2 — Trato especial

```text
┌──────────────────────────────┐
│ Ajustar Corte clásico        │
│ Precio referencia   50,00 Bs │
│                              │
│ ( ) Descuento                │
│ (•) Cortesía total           │
│ Motivo *                     │
│ [ Autorizada por el dueño  ] │
│                              │
│ El servicio seguirá contando │
│ para la actividad de Diego.  │
│       [ Aplicar cortesía ]    │
└──────────────────────────────┘
```

Solo roles autorizados llegan a este diálogo. No muestra detalles de cálculo de comisión al cliente.

### Aceptación del wireframe

- Servicio reservado se precarga pero puede corregirse antes de pagar.
- Añadir servicios/productos no requiere crear otra cita.
- Total siempre visible.
- Operación pagada deja de ser editable.

---

## 5. Flujo D — Cobro mixto

**Actor:** administración, dueño o barbero sobre operación propia.  
**Objetivo:** cerrar una vez, sin diferencias ni doble toque.

```text
┌──────────────────────────────┐
│ ‹ Atención          Cobrar   │
│ Total                 70,00 Bs│
│                              │
│ ¿Cómo paga?                  │
│ ( ) Efectivo                 │
│ ( ) QR                       │
│ (•) Mixto                    │
│                              │
│ Efectivo                     │
│ [ 30,00                    ] │
│ QR                           │
│ [ 40,00                    ] │
│ ──────────────────────────── │
│ Falta                  0,00 Bs│
│                              │
│       [ Confirmar cobro ]     │
└──────────────────────────────┘
```

### Error

```text
! Los medios suman 65,00 Bs.
  Faltan 5,00 Bs para completar el cobro.
```

### Confirmación

```text
┌──────────────────────────────┐
│ ✓ Cobro registrado           │
│ Total                 70,00 Bs│
│ Efectivo              30,00 Bs│
│ QR                    40,00 Bs│
│                              │
│ [ Ver resumen ]              │
│ [ Volver a Hoy ]             │
└──────────────────────────────┘
```

Mientras confirma, el botón queda ocupado y no permite segundo envío. Mala conexión muestra resultado consultado por idempotencia, nunca éxito supuesto.

### Aceptación del wireframe

- Mixto muestra restante en tiempo real.
- Total cero omite medios y usa `Cerrar cortesía`.
- Falta/sobra bloquea confirmación.
- Éxito identifica claramente medios e importe.

---

## 6. Flujo E — Liquidación del barbero

**Actor:** dueño; barbero consulta resultado propio.  
**Objetivo:** revisar deuda, ajustar justificadamente y pagar una sola vez.

### E1 — Borrador

```text
┌──────────────────────────────┐
│ Liquidar a Diego             │
│ Corte hasta 15 septiembre    │
│                              │
│ 8 sep · Corte                │
│ Base 50,00 · 50 %   25,00 Bs │
│ 9 sep · Producto             │
│ Base 35,00 · 10 %    3,50 Bs │
│ 10 sep · Cortesía servicio   │
│ Base 50,00 · 50 %   25,00 Bs │
│                              │
│ Comisiones           53,50 Bs│
│ Ajustes               0,00 Bs│
│ Total                53,50 Bs│
│                              │
│ [ + Añadir ajuste ]          │
│ [ Cerrar liquidación ]       │
└──────────────────────────────┘
```

### E2 — Registrar pago

```text
┌──────────────────────────────┐
│ Liquidación cerrada          │
│ Diego · 53,50 Bs             │
│                              │
│ Medio                        │
│ (•) Efectivo   ( ) QR        │
│ Fecha [ 15/09/2026 ]         │
│                              │
│ Después de pagar no podrá    │
│ editarse. Correcciones futuras│
│ se harán mediante ajustes.   │
│                              │
│       [ Registrar pago ]      │
└──────────────────────────────┘
```

### Aceptación del wireframe

- Diferencia claramente disponible, cerrada y pagada.
- Cada línea muestra operación/base/tasa/importe.
- Ajuste exige signo, motivo y confirmación.
- Pago es acción separada del cierre.
- Barbero ve solo su liquidación, sin controles de edición.

---

## 7. Flujo F — Reserva pública sin cuenta

**Actor:** cliente desde teléfono.  
**Objetivo:** reservar con mínima fricción y gestionar por enlace privado.

### F1–F3 — Selección

```text
┌──────────────────────────────┐
│ Lou Barbershop               │
│ Reserva tu horario           │
│                              │
│ 1. Servicio                  │
│ [ Corte clásico · desde 50 ] │
│                              │
│ 2. Barbero                   │
│ [ Cualquier disponible     ▼]│
│                              │
│ 3. Horario                   │
│ Mar 8                        │
│ [10:00 Diego] [11:00 Mateo]  │
│ [ Ver otro día ]             │
└──────────────────────────────┘
```

### F4 — Datos mínimos

```text
┌──────────────────────────────┐
│ Confirma tu reserva          │
│ Mar 8 · 10:00 · Diego        │
│ Corte · 45 min · 50,00 Bs    │
│                              │
│ Tu nombre                    │
│ [ Ana                      ] │
│ WhatsApp / teléfono          │
│ [ +591 70000001            ] │
│                              │
│ Usaremos estos datos para    │
│ gestionar esta cita.         │
│                              │
│       [ Confirmar reserva ]   │
└──────────────────────────────┘
```

### F5 — Resultado y gestión

```text
┌──────────────────────────────┐
│ ✓ Tu cita está confirmada    │
│ Martes 8 · 10:00             │
│ Diego · Corte clásico        │
│ 50,00 Bs · 45 min            │
│                              │
│ Guarda este enlace para      │
│ cambiar o cancelar tu cita.  │
│ [ Gestionar mi cita ]        │
│                              │
│ [ Instalar Lou Barbershop ]  │
└──────────────────────────────┘
```

No se obliga a instalar ni crear contraseña. La invitación de instalación no interrumpe la primera selección.

### Sin disponibilidad/offline

- Sin horario: acciones `Cambiar día` y `Aceptar cualquier barbero`.
- Horario ocupado al final: conserva datos y ofrece nuevas alternativas.
- Offline: muestra última información solo si está marcada como desactualizada; deshabilita confirmar.

### Aceptación del wireframe

- Solicita únicamente servicio, preferencia, horario, nombre y teléfono.
- Precio/duración/barbero visibles antes de confirmar.
- El enlace, no el teléfono, autoriza gestión.
- Funciona a 320 px sin desplazamiento horizontal.

---

## 8. Validación solicitada para G0

Para aprobar AC-00-05 se debe confirmar que:

1. la reserva interna representa cómo administración trabaja;
2. la agenda muestra información suficiente sin exponer de más;
3. el barbero puede cerrar una atención sin pasos innecesarios;
4. el pago mixto coincide con la operación real;
5. la liquidación es comprensible para dueño y barbero;
6. la reserva pública resulta suficientemente simple para un cliente.

Los cambios de estructura se realizan ahora. Colores, tipografía, fotografías y marca se definen en el sistema visual antes de implementar las pantallas finales.

