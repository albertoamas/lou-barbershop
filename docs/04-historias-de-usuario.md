# Historias de usuario y criterios de aceptación

Las historias están agrupadas por épica. `P0` es imprescindible para operar; `P1` completa el MVP; `P2` es posterior.

## Épica A — Acceso y configuración

### HU-001 — Acceso interno (`P0`)

**Como** integrante del personal, **quiero** iniciar sesión, **para** acceder únicamente a las funciones de mi rol.

**Criterios:** credenciales inválidas no revelan qué dato falló; usuario inactivo no entra; sesión expira; el servidor valida permisos en cada acción.

### HU-002 — Gestionar barberos (`P0`)

**Como** dueño, **quiero** crear y desactivar barberos indicando si son contratados o dueño, **para** asignar agenda y comisiones correctamente.

**Criterios:** un contratado requiere condición de comisión antes de liquidar; desactivar no borra historial; el dueño puede tener rol de barbero y propietario en la misma cuenta.

### HU-003 — Configurar servicios y ofertas (`P0`)

**Como** dueño, **quiero** definir servicios y sus condiciones por barbero, **para** mostrar precio y duración correctos.

**Criterios:** precio/duración específicos prevalecen sobre referencia; solo ofertas activas se reservan; cambios no alteran citas ni operaciones históricas.

### HU-004 — Configurar horarios (`P0`)

**Como** dueño o administración, **quiero** definir turnos y excepciones, **para** ofrecer únicamente horarios atendibles.

**Criterios:** intervalos inválidos o superpuestos se rechazan; una ausencia bloquea disponibilidad; modificar horario no cancela citas existentes y muestra conflictos para resolver.

## Épica B — Clientes y agenda

### HU-010 — Buscar o crear cliente (`P0`)

**Como** administración, **quiero** buscar por nombre o teléfono y crear con datos mínimos, **para** reservar rápidamente.

**Criterios:** teléfono se normaliza; se advierte posible duplicado; nombre y teléfono son obligatorios para cita; notas son opcionales y restringidas.

### HU-011 — Consultar disponibilidad (`P0`)

**Como** administración, **quiero** ver horarios por servicio y preferencia de barbero, **para** responder al cliente sin cálculos manuales.

**Criterios:** considera duración, turnos, excepciones y citas activas; “cualquiera” devuelve alternativas con barbero concreto; no muestra horarios pasados.

### HU-012 — Crear cita (`P0`)

**Como** administración, **quiero** confirmar una cita, **para** reservar el tiempo del barbero.

**Criterios:** revalida el espacio al guardar; conserva precio/duración informados; evita doble reserva; crea auditoría.

### HU-013 — Cambiar cita (`P0`)

**Como** administración, **quiero** reprogramar, cambiar servicio o reasignar barbero, **para** resolver solicitudes y contingencias.

**Criterios:** solo permite destino disponible; registra antes/después; actualiza precio y duración mostrados; no crea cobro.

### HU-014 — Cancelar o marcar inasistencia (`P0`)

**Como** administración o dueño, **quiero** cerrar una cita no atendida con su causa, **para** liberar la agenda y medir incidencias.

**Criterios:** estados diferentes para cancelación e inasistencia; no genera comisión; cita completada no puede cancelarse.

### HU-015 — Ver agenda propia (`P0`)

**Como** barbero, **quiero** ver mi jornada ordenada, **para** prepararme y reconocer mis espacios libres.

**Criterios:** muestra hora, cliente, servicio y estado; oculta información económica no necesaria; cambios recientes son visibles al refrescar.

### HU-016 — Reserva pública sin cuenta (`P1`)

**Como** cliente, **quiero** reservar desde mi teléfono en pocos pasos, **para** no depender de una conversación prolongada.

**Criterios:** no exige contraseña; solicita servicio, barbero/cualquiera, horario, nombre y teléfono; confirma solo si sigue libre; entrega enlace privado de gestión; interfaz accesible y móvil.

## Épica C — Atención y cobro

### HU-020 — Registrar llegada directa (`P0`)

**Como** administración o barbero, **quiero** iniciar una atención sin reserva, **para** no omitir clientes espontáneos.

**Criterios:** selecciona cliente o crea uno; selecciona barbero efectivo; conserva origen `WALK_IN`; no ocupa retrospectivamente una cita ficticia.

### HU-021 — Confirmar servicios realizados (`P0`)

**Como** barbero, **quiero** ajustar lo realmente realizado, **para** que cobro y comisión sean correctos.

**Criterios:** puede añadir varios servicios; cada detalle conserva precio; solo modifica atención propia salvo permisos superiores; operación pagada queda bloqueada.

### HU-022 — Vender productos (`P0`)

**Como** barbero o administración, **quiero** añadir productos y cantidades, **para** cobrar y actualizar existencias.

**Criterios:** muestra existencia; impide cantidad superior; conserva precio/costo; puede crear venta sin servicio.

### HU-023 — Aplicar descuento o cortesía (`P0`)

**Como** dueño o administración autorizada, **quiero** registrar un trato especial, **para** conservar el trabajo aunque se cobre menos o nada.

**Criterios:** exige motivo; nunca produce total negativo; cortesía de servicio de contratado conserva comisión sobre referencia; queda auditado.

### HU-024 — Cobrar con uno o dos medios (`P0`)

**Como** administración o barbero, **quiero** dividir el cobro entre efectivo y QR, **para** reflejar el pago real.

**Criterios:** suma exacta al total; no duplica un medio; total cero no solicita pago; cierre crea en una transacción pagos, inventario y comisiones.

### HU-025 — Revertir operación (`P1`)

**Como** dueño, **quiero** revertir un cierre incorrecto, **para** corregir inventario y comisiones sin borrar evidencia.

**Criterios:** motivo obligatorio; solo dueño; repone inventario; anula comisión disponible o crea ajuste si fue pagada; conserva original.

## Épica D — Inventario y gastos

### HU-030 — Registrar entrada de producto (`P0`)

**Como** dueño o administración, **quiero** registrar una recepción pagada con productos, cantidades y costos, **para** conocer existencia, salida de caja y margen.

**Criterios:** cantidad/costo positivos; total coincide con detalles; registra efectivo o QR; recalcula costo promedio; no se duplica como gasto; recepción confirmada no se edita y su corrección usa ajuste/reverso.

### HU-031 — Ajustar por conteo o pérdida (`P1`)

**Como** dueño o administración, **quiero** ajustar diferencias con motivo, **para** que la existencia coincida con la realidad.

**Criterios:** muestra antes/después; motivo y tipo obligatorios; no permite resultado negativo sin permiso del dueño; audita actor.

### HU-032 — Registrar gasto (`P0`)

**Como** dueño o administración, **quiero** registrar un gasto pagado, **para** obtener resultados sin usar el cuaderno.

**Criterios:** fecha, categoría, concepto, importe y medio obligatorios; importe positivo; anulación auditada; aparece en reportes del período correcto.

## Épica E — Comisiones

### HU-040 — Configurar condiciones (`P0`)

**Como** dueño, **quiero** definir tasas de servicio y producto con vigencia, **para** calcular cada operación correctamente.

**Criterios:** tasa entre 0 y 100 %; períodos del mismo tipo no se solapan; cambio futuro no altera lo generado.

### HU-041 — Consultar comisiones propias (`P1`)

**Como** barbero contratado, **quiero** ver comisión por operación y estado, **para** entender cuánto se me debe.

**Criterios:** solo ve datos propios; diferencia disponible, liquidada y pagada; muestra base, tasa e importe; no expone costos ni gastos generales.

### HU-042 — Crear liquidación (`P0`)

**Como** dueño, **quiero** agrupar comisiones pendientes hasta una fecha, **para** revisarlas y pagarlas sin duplicidad.

**Criterios:** solo incluye `AVAILABLE`; una comisión no entra dos veces; muestra operaciones de origen; admite ajustes justificados.

### HU-043 — Pagar liquidación (`P0`)

**Como** dueño, **quiero** registrar el pago completo, **para** cerrar la deuda con el barbero.

**Criterios:** liquidación cerrada; medio y fecha obligatorios; cambia estados atómicamente; después queda inmutable.

## Épica F — Gestión y reportes

### HU-050 — Panel del día (`P0`)

**Como** dueño o administración, **quiero** ver citas, atenciones y cobros del día, **para** controlar la operación.

**Criterios:** diferencia programado y realizado; separa efectivo/QR; datos cambian al registrar operaciones; totales enlazan al detalle.

### HU-051 — Resultado por período (`P1`)

**Como** dueño, **quiero** comparar ventas, costos, comisiones y gastos, **para** entender el resultado operativo.

**Criterios:** filtro por fechas; define cada métrica; separa generado y pagado; no llama “utilidad neta” a un resultado incompleto.

### HU-052 — Producción por barbero (`P1`)

**Como** dueño, **quiero** ver servicios, ventas, importe y ocupación por barbero, **para** tomar decisiones con contexto.

**Criterios:** incluye al dueño; no confunde producción con comisión; muestra horas disponibles; permite llegar a operaciones fuente.

### HU-053 — Exportar CSV (`P2`)

**Como** dueño, **quiero** exportar listados, **para** analizarlos o compartirlos con un profesional.

**Criterios:** respeta filtros y permisos; usa encabezados claros; codificación UTF-8; no exporta contraseñas, tokens ni datos técnicos.
