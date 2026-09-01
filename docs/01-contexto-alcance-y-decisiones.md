# Contexto, alcance y decisiones asumidas

## 1. Visión del producto

Crear una PWA móvil e instalable que concentre la agenda, las atenciones, los cobros, las ventas, los gastos, las comisiones y el inventario básico de Lou Barbershop. Debe reducir registros duplicados y cálculos manuales sin convertir la jornada de los barberos en trabajo administrativo.

## 2. Objetivos medibles del MVP

- Toda atención realizada queda registrada, tenga o no reserva y sea pagada o de cortesía.
- Todo cobro puede explicarse por sus conceptos y medios de pago.
- Toda comisión puede rastrearse hasta la operación que la generó y la liquidación que la pagó.
- La agenda evita solapamientos del mismo barbero y considera la duración del servicio.
- El dueño obtiene resúmenes diarios y por período sin rehacer cálculos manuales.
- Administración puede registrar una reserva normal en menos de un minuto en condiciones habituales.
- Un barbero puede consultar su jornada y cerrar una atención con pocos toques.

## 3. Alcance del MVP

### Incluido

- Una sucursal y una zona horaria.
- Usuarios internos: dueño, administración y barberos.
- Clientes sin cuenta obligatoria.
- Catálogo dinámico de servicios y productos.
- Oferta, precio y duración por combinación de servicio y barbero.
- Horarios semanales y excepciones puntuales por barbero.
- Agenda, reservas, reprogramaciones, cancelaciones e inasistencias.
- Llegadas directas.
- Registro de atención real con uno o varios servicios.
- Cortesías y descuentos autorizados.
- Cobros en efectivo, QR o ambos.
- Ventas de productos dentro de una atención o independientes.
- Existencias, entradas y ajustes básicos.
- Gastos pagados.
- Comisiones por servicios y productos con vigencia histórica.
- Liquidaciones de comisiones y registro de su pago.
- Paneles y reportes operativos básicos.
- Auditoría de cambios sensibles.
- PWA responsive e instalable con experiencia offline segura de solo lectura.
- Clean Architecture, SOLID y adaptadores tecnológicos reemplazables.
- Entorno reproducible mediante Docker y Docker Compose.

### Fuera del MVP

- Múltiples sucursales, franquicias o monedas.
- Nómina, sueldo fijo, control biométrico o recursos humanos completos.
- Compras y cuentas por pagar a proveedores.
- Contabilidad formal, impuestos o facturación fiscal.
- Integración automática con bancos o proveedores de QR.
- Fidelización, puntos, membresías y campañas de marketing.
- Lista de espera automatizada.
- Propinas gestionadas por el sistema.
- Pagos anticipados, crédito al cliente, pagos parciales o devoluciones monetarias.
- Integración técnica con WhatsApp.
- Integración bidireccional con Google Calendar.
- Aplicación móvil nativa.

## 4. Decisiones asumidas para desbloquear el desarrollo

Estas decisiones no provienen literalmente del contexto inicial; se adoptan porque son simples, coherentes y reversibles para una barbería pequeña.

### D-01. Fuente oficial de agenda

Al entrar en producción, la aplicación será la fuente oficial de disponibilidad. Google Calendar podrá mantenerse temporalmente como referencia manual o, después, como vista sincronizada en un solo sentido. No se permitirán dos fuentes editables sin resolución de conflictos.

### D-02. Identificación del cliente

El cliente no crea cuenta. Para reservar se solicita nombre y número de WhatsApp/teléfono. El teléfono normalizado es el principal dato de contacto, pero no se considera una identidad perfecta: pueden existir teléfonos compartidos. Administración puede crear un cliente con datos mínimos.

### D-03. Reserva pública

El MVP interno permite que administración registre todas las reservas. La reserva pública sin cuenta se implementa al final del MVP si la operación interna ya es estable. El cliente elige servicio, barbero o “cualquiera”, horario y deja nombre/teléfono. La disponibilidad se confirma de forma transaccional.

### D-04. Contenido de la cita

Una cita reserva **un servicio principal para una persona y un barbero**. Esto mantiene la búsqueda de disponibilidad simple. Si al atender se añaden servicios, se registran en la atención real. Reservas para varias personas se crean como citas separadas.

### D-05. Duración y precio

Cada servicio tiene un precio y duración de referencia. Una oferta por barbero puede sobrescribir ambos. La cita guarda una instantánea del precio y duración informados. La atención guarda los valores realmente aplicados.

### D-06. Intervalos de agenda

La disponibilidad se ofrece en incrementos configurables de 15 minutos, pero la ocupación se calcula con intervalos reales de inicio y fin. No se asigna más de una cita simultánea al mismo barbero.

### D-07. Confirmación y cambios

Las reservas creadas por personal interno quedan confirmadas. Una reserva pública también queda confirmada si el horario continúa libre al enviarla. El cliente puede gestionar su cita mediante un enlace con token no adivinable; si no tiene el enlace, solicita el cambio por WhatsApp a administración.

### D-08. Atrasos e inasistencias

No existen multas ni cobros automáticos. Administración o dueño marca la inasistencia. La tolerancia se decide humanamente; el sistema no cancela por tiempo transcurrido en el MVP.

### D-09. Base de comisión de servicios

Para un barbero contratado, la comisión se calcula sobre el importe neto del servicio después de descuento, salvo cortesía autorizada. La tasa efectiva se toma de la condición vigente al completar la atención y queda congelada en la operación.

### D-10. Cortesías

Solo dueño o administración pueden aplicar una cortesía; administración actúa por autorización del dueño. Si un barbero contratado realizó el servicio, la barbería asume la cortesía y la comisión se calcula sobre el precio de referencia antes de la cortesía. Así, el barbero no pierde su remuneración por una decisión comercial del dueño. Una cortesía hecha por el dueño no genera comisión.

### D-11. Comisión de productos

La comisión de un producto vendido por un barbero contratado se calcula sobre el importe neto de venta después de descuento, no sobre el margen. La tasa de producto puede diferir de la tasa de servicio. Un producto entregado como cortesía no genera comisión, salvo ajuste manual autorizado.

### D-12. Dueño como barbero

Las operaciones del dueño se atribuyen a su producción, pero no crean entradas de comisión ni liquidaciones a su favor. “100 % para el dueño” significa ausencia de comisión de tercero, no utilidad neta.

### D-13. Cobro

Una operación se marca pagada cuando la suma de efectivo y QR coincide con el total a cobrar. El MVP no permite dejar saldo. Una cortesía total tiene total a cobrar cero y se cierra sin componente de pago.

### D-14. Liquidaciones

Cada barbero tiene periodicidad quincenal o mensual. Una liquidación agrupa todas las comisiones disponibles hasta una fecha de corte, permite ajustes justificados y se paga completa. Anticipos y pagos parciales quedan fuera del MVP.

### D-15. Correcciones económicas

Una operación cerrada no se elimina. Antes de liquidar puede corregirse con auditoría; después de liquidar se crea un ajuste positivo o negativo para la próxima liquidación.

### D-16. Inventario

Se controla por producto y cantidad, sin lotes ni vencimientos en el MVP. Una recepción agrupa los productos comprados, sus cantidades, costos, total pagado y medio de pago. Las ventas usan costo promedio ponderado para reportar margen. Se admiten ajustes por conteo, daño, pérdida o consumo interno con motivo obligatorio. La compra de mercadería se muestra como salida de caja por inventario y no se duplica como gasto operativo.

### D-17. Gastos

Solo se registran gastos ya pagados. Categorías iniciales: alquiler, servicios básicos, insumos consumibles, limpieza, mantenimiento, herramientas/equipos, marketing, comisiones bancarias, impuestos/licencias, capacitación, transporte y otros. Los productos destinados a reventa se registran mediante recepción de inventario, no nuevamente como gasto.

### D-18. Zona horaria y moneda

La única moneda es BOB. La zona operativa es `America/La_Paz`. En la base se guardan instantes en UTC y se presentan en hora local.

### D-19. Eliminación lógica

Servicios, productos, clientes y usuarios referenciados por operaciones no se eliminan físicamente; se desactivan. Los registros económicos se revierten o ajustan.

### D-20. Datos personales

Se recolecta lo mínimo: nombre, teléfono y notas operativas necesarias. No se almacenan datos sensibles ni fotografías en el MVP. Las notas no deben contener diagnósticos, documentos de identidad ni información irrelevante.

## 5. Actores y responsabilidades

| Actor | Responsabilidad principal |
|---|---|
| Cliente | Solicitar o gestionar una reserva y recibir/pagar servicios |
| Administración | Atender consultas, gestionar agenda, registrar operaciones y apoyar el cobro |
| Barbero | Consultar agenda, realizar y cerrar atenciones/ventas propias |
| Dueño | Todo lo anterior como barbero, además de configurar, autorizar, liquidar y analizar |

## 6. Glosario operativo

- **Cita:** compromiso planificado.
- **Atención:** visita real en la que se prestan servicios o se venden productos.
- **Operación:** conjunto económico de servicios y productos cobrados juntos.
- **Cortesía:** reducción autorizada que puede llevar el importe a cero sin borrar el trabajo.
- **Comisión generada:** obligación de la barbería con el barbero.
- **Liquidación:** agrupación cerrada de comisiones y ajustes a pagar.
- **Oferta del barbero:** servicio que un barbero puede realizar con precio/duración aplicables.
- **Movimiento de inventario:** hecho que aumenta o disminuye existencias.
