# UX móvil y diseño de interacción

## 1. Principios

1. Una acción principal visible por pantalla.
2. No pedir dos veces un dato ya conocido.
3. Mostrar lenguaje del negocio: cita, atención, cobro, comisión y liquidación.
4. Totales y consecuencias antes de confirmar acciones irreversibles.
5. Formularios cortos, teclado adecuado y objetivos táctiles amplios.
6. Estados visibles por texto e icono; no depender solo del color.
7. Errores junto al campo y conservación de lo escrito.
8. La agenda y el cobro deben soportar interrupciones normales de la jornada.
9. La PWA comunica claramente conexión, datos desactualizados y disponibilidad de una nueva versión.

## 2. Navegación por rol

### Dueño

`Hoy` · `Agenda` · `Atender` · `Dinero` · `Más`

En `Dinero`: cobros, gastos, comisiones, liquidaciones y reportes. En `Más`: catálogo, personal, horarios, productos y auditoría.

### Administración

`Hoy` · `Agenda` · `Nueva cita` · `Cobrar` · `Más`

### Barbero

`Mi día` · `Atender` · `Mis comisiones` · `Perfil`

No se muestra navegación a funciones prohibidas.

## 3. Pantallas esenciales

### Panel “Hoy”

- Fecha y estado general.
- Próximas citas ordenadas.
- Acciones: nueva cita, llegada directa, registrar gasto según rol.
- Contadores: confirmadas, atendidas, canceladas/no presentadas.
- Cobros del día separados en efectivo y QR para dueño/admin.

### Agenda

- Vista de día predeterminada en teléfono; semana en tablet.
- Filtro por barbero.
- Bloques con hora, cliente, servicio y estado.
- Toque abre detalle y acciones autorizadas.
- Huecos no se consideran disponibilidad hasta elegir servicio/duración.

### Nueva cita — máximo cuatro pasos

1. Servicio.
2. Barbero específico o cualquiera.
3. Horario disponible.
4. Cliente y confirmación.

Administración puede buscar cliente antes; el flujo público pide datos al final para reducir abandono.

### Atención

- Encabezado con cliente, origen y barbero.
- Servicios precargados desde cita.
- Botones claros para añadir servicio/producto.
- Precio editable solo según permiso; cualquier cambio requiere motivo.
- Resumen fijo con subtotal, ajuste y total.
- Botón `Ir al cobro`.

### Cobro

- Total grande y desglose accesible.
- Opciones: efectivo, QR o mixto.
- Para mixto, ingresar una parte y calcular visualmente el restante.
- Confirmación final evita doble toque y muestra progreso.
- Resultado inequívoco: `Cobro registrado` con medios e importe.

### Liquidación

- Lista por fecha con servicio/producto, base, porcentaje y comisión.
- Totales visibles, ajustes separados.
- Dos acciones distintas: `Cerrar liquidación` y `Registrar pago`.
- Confirmación advierte que después del pago no se edita.

## 4. Reserva pública

- Sin menú administrativo ni creación de cuenta.
- Carga rápida y textos breves.
- Permite “cualquier barbero”.
- Muestra precio y duración antes de confirmar.
- Solicita nombre y WhatsApp/teléfono solamente.
- Pantalla final con día, hora, dirección conocida del negocio cuando se configure, barbero, servicio y enlace de gestión.
- No promete recordatorio automático si todavía no existe integración.

## 5. Estados vacíos y errores

- Sin citas: “No hay citas para este día” + acción autorizada.
- Sin disponibilidad: ofrecer cambiar día o barbero; no callejón sin salida.
- Horario tomado: explicar que otra persona lo reservó y refrescar alternativas.
- Sin stock: impedir cierre y señalar producto/cantidad.
- Mismatch de pago: mostrar cuánto falta o sobra.
- Mala conexión: mantener borrador local de formulario no económico cuando sea seguro; no fingir que el cobro se guardó.
- Sin conexión: permitir abrir el shell y consultar la última lectura marcada; deshabilitar mutaciones con explicación y acción `Reintentar`.
- Nueva versión: ofrecer actualización al terminar la tarea actual, nunca durante un cobro.

## 6. Accesibilidad y contenido

- Contraste AA, foco visible y etiquetas asociadas.
- Botones de al menos 44 × 44 CSS px.
- Fechas en formato natural local y moneda como `70,00 Bs`.
- Confirmaciones destructivas nombran el objeto: “Cancelar cita de Ana a las 15:00”.
- Evitar tecnicismos como `rollback`, `ledger` o `constraint` en la interfaz.
- Lectores de pantalla reciben estado de operación y errores.

## 7. Prototipos que deben probarse antes de construir todo

1. Administración crea una cita mientras responde WhatsApp.
2. Cliente público reserva con cualquier barbero.
3. Barbero cambia el servicio real y añade un producto.
4. Administración cobra parte efectivo y parte QR.
5. Dueño concede cortesía de servicio de contratado.
6. Dueño revisa y paga una liquidación.

Se prueba con teléfono real y tablet, midiendo tiempo, errores y dudas. El prototipo no decide reglas: debe respetar las de estos documentos.

## 8. Criterio de simplicidad

Si un dato no afecta disponibilidad, cobro, comisión, inventario, comunicación o una decisión concreta, no debe ser obligatorio. Los detalles poco frecuentes se ubican en secciones secundarias, no en el camino principal.

## 9. Experiencia de instalación PWA

- No interrumpir la primera visita con una solicitud agresiva de instalación.
- Mostrar `Instalar aplicación` desde el menú después de que el usuario interno haya iniciado sesión y usado el sistema.
- En iOS, explicar pasos manuales solo cuando el usuario elija instalar.
- Usar `standalone`, iconos maskable y nombre corto reconocible.
- La aplicación instalada debe abrir en `Hoy` para personal y en el flujo público para enlaces de cliente.
