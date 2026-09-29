# Guía de páginas, secciones y roles

**Fecha:** 19 de septiembre de 2026  
**Base local:** `http://localhost:8088`  
**Objetivo:** explicar qué ve cada rol y qué tarea se realiza en cada pantalla

## 1. Mapa rápido

| Ruta | Quién entra | Para qué sirve |
|---|---|---|
| `/` | cualquiera | conocer la barbería, servicios, proceso y ubicación |
| `/reservar` | cliente, sin cuenta | reservar una cita |
| `/mi-cita#token` | cliente con enlace privado | consultar, reprogramar o cancelar su cita |
| `/privacidad` | cualquiera | conocer qué datos usa la reserva y cómo se protegen |
| `/app/login` | equipo | iniciar sesión |
| `/app` | dueño, administrador, barbero | resumen de trabajo adaptado al rol |
| `/app/agenda` | equipo | consultar y gestionar citas dentro de sus permisos |
| `/app/atenciones` | equipo | registrar lo realmente atendido y cobrar |
| `/app/comisiones` | dueño y barbero | consultar deuda de comisión y liquidaciones |
| `/app/inventario` | dueño y administrador | controlar existencias, compras, gastos y caja diaria |
| `/app/disponibilidad` | equipo | consultar horarios; dueño/admin los administran |
| `/app/reportes` | dueño | analizar operación, caja, comisiones, equipo y auditoría |
| `/app/configuracion` | dueño | administrar catálogos, equipo, reglas y usuarios |
| `/app/seguridad` | equipo | cambiar contraseña y configurar MFA |

## 2. Páginas públicas

### Landing — `/`

- **Cabecera:** logo y accesos a servicios, funcionamiento, `Mi cita`, reserva y acceso del equipo.
- **Hero:** presenta Lou Barbershop y lleva directamente a reservar o gestionar una cita.
- **Servicios:** catálogo público activo con duración y precio de referencia.
- **Cómo funciona:** explica el recorrido `Elige → Reserva → Llega`.
- **Ubicación:** mapa aprobado y enlace externo a Google Maps.
- **Llamada final:** último acceso a la reserva.
- **Footer:** marca, rutas públicas, moneda/zona horaria y redes sociales oficiales cuando se configuren.

El cliente usa esta página para entender la oferta; no crea cuenta ni ve información interna.

### Reserva — `/reservar`

El flujo tiene cinco pasos:

1. **Servicio:** se elige qué trabajo se desea y se ve duración/precio base.
2. **Barbero:** se selecciona un profesional disponible.
3. **Fecha y hora:** calendario, período mañana/tarde y huecos válidos cada 30 minutos. El backend descarta cruces con cierres, descansos, horarios personales y citas existentes.
4. **Datos:** nombre, teléfono y notas necesarias para identificar al cliente.
5. **Confirmar:** revisión completa antes de enviar.

El **resumen** permanece visible en escritorio y se abre como acordeón en móvil. Al terminar aparece la confirmación y el enlace privado `Gestionar mi cita`. Reservar necesita conexión; el backend vuelve a validar precio y disponibilidad.

### Mi cita — `/mi-cita#token`

- **Entrada vacía:** explica que hace falta el enlace/código privado recibido al confirmar.
- **Detalle:** estado, fecha, hora, servicio, barbero y resumen del cliente.
- **Línea temporal:** muestra el avance de la cita.
- **Reprogramar:** abre fecha/horarios válidos y rota el enlace privado después del cambio.
- **Cancelar:** acción destructiva separada y confirmada.
- **Estados propios:** enlace inválido/vencido, cita cancelada, offline, carga o conflicto.

No existe una cuenta de cliente. El fragmento `#token` permanece en el navegador y la aplicación lo envía a la API mediante una cabecera protegida.

### Privacidad — `/privacidad`

Explica los datos mínimos solicitados, su finalidad, la protección del enlace privado y cómo pedir una corrección. Está enlazada desde el formulario de reserva y el footer público.

## 3. Acceso y estructura interna

### Login — `/app/login`

- marca y acceso de regreso a la página pública;
- usuario y contraseña;
- control para mostrar/ocultar contraseña;
- estado de verificación y mensajes genéricos de credencial incorrecta, límite de intentos o conexión.

Después del login se entra a la ruta solicitada o al inicio del rol. Si la cuenta usa MFA, se solicita el código del autenticador o uno de recuperación. El menú sólo muestra destinos permitidos, aunque la autorización real siempre la decide el backend.

### Seguridad — `/app/seguridad`

Todo integrante puede cambiar su propia contraseña y activar/desactivar TOTP tras volver a acreditar contraseña y factor actual. Los códigos de recuperación se muestran una sola vez. En producción el dueño no continúa al resto del panel hasta configurar MFA.

### Navegación común

- **Escritorio:** sidebar persistente; al cambiar de sección sólo cambia el contenido central.
- **Tablet:** rail lateral compacto.
- **Móvil:** barra inferior con destinos frecuentes y menú `Más`.
- **Encabezado:** título, contexto operativo, conexión y acciones propias de la pantalla.
- **Avisos:** offline y actualización PWA se muestran sin tapar la navegación.

## 4. Inicio por rol — `/app`

### Dueño

Ve ventas y medios de pago del día, comisiones pendientes, próximas citas, alertas de inventario y accesos a reportes/cierre. Sirve para entender rápidamente negocio y operación.

### Administrador

Ve situación de agenda, próximas llegadas, atenciones en curso, cobros pendientes y stock bajo. Su acción habitual es crear o ubicar una cita y coordinar la jornada.

### Barbero

Ve `Mi día`, próxima cita, producción y comisión propias, además del acceso a atender una llegada directa. No ve cifras globales del negocio.

## 5. Agenda — `/app/agenda`

- **Navegación temporal:** hoy, anterior, siguiente y selección de fecha.
- **Vista día/semana:** columnas por barbero en escritorio o lista temporal compacta en móvil.
- **Filtros:** dueño/admin pueden filtrar equipo; el barbero queda limitado a su agenda.
- **Nueva cita:** cliente, servicio, barbero y uno de los horarios ofrecidos por el backend.
- **Detalle:** datos, estado, acciones autorizadas e historial comprensible.
- **Reprogramación/cancelación:** acciones explícitas; no existe arrastrar y soltar.
- **Inicio de atención:** una cita llegada puede pasar al flujo de atención sin recargar toda la app.

La agenda planifica. No registra todavía el consumo ni el dinero cobrado.

## 6. Atención y cobro — `/app/atenciones`

El flujo separa cinco etapas:

1. **Cliente/cita:** se parte de una reserva o se registra llegada directa.
2. **Consumo:** servicios realmente realizados y productos entregados.
3. **Ajustes:** descuento o cortesía con motivo y permiso suficiente.
4. **Pago:** efectivo, QR o mixto; se calcula diferencia en tiempo real.
5. **Confirmación:** revisión y cobro definitivo.

El total y el barbero efectivo permanecen visibles. Dueño/admin pueden operar para el equipo; el barbero atiende dentro de su alcance. El **reverso** está separado, requiere motivo y sólo lo ejecuta el dueño. Cobrar al cliente y generar deuda de comisión son registros diferentes.

## 7. Comisiones — `/app/comisiones`

### Dueño

- saldos separados entre disponible, incluido en liquidación y pagado;
- filtro por barbero/estado y libro por operación;
- crear borrador, añadir ajuste, cerrar y registrar pago de liquidación;
- detalle y línea temporal `Borrador → Cerrada → Pagada`.

### Barbero

Ve únicamente sus comisiones, operaciones y liquidaciones. No puede escoger compañeros, ajustar, cerrar ni registrar pagos.

Esta pantalla representa la deuda con el barbero; no es el saldo de caja ni repite el pago del cliente.

## 8. Inventario y gastos — `/app/inventario`

Disponible para dueño y administrador.

- **Existencias:** stock actual, búsqueda, alertas y movimientos históricos.
- **Compras:** registra entrada de productos y su costo.
- **Gastos:** registra salidas operativas por categoría y motivo.
- **Caja de hoy:** resume movimientos del día sin mezclarlos con comisiones.
- **Paneles contextuales:** compra, ajuste de stock o gasto; nunca se borra historia para “corregir”.

El barbero no accede a esta sección.

## 9. Disponibilidad — `/app/disponibilidad`

- **Semana:** turnos por día dentro del horario de sucursal y excepciones superpuestas.
- **Buscar espacios:** consulta huecos reales según servicio y rango.
- **Excepciones:** ausencias/bloqueos u horarios extraordinarios con vigencia y motivo.
- **Editor:** dueño/admin crean, modifican o desactivan horarios sin borrar su historia.

El barbero consulta su propio horario y excepciones, pero no los edita. Una excepción que afecta citas existentes genera conflictos para revisión; no cancela clientes automáticamente.

## 10. Reportes — `/app/reportes`

Sólo el dueño.

- **Período global:** controla todas las vistas y se conserva al cambiar de pestaña.
- **Operación:** atenciones, servicios, clientes y tendencia operativa.
- **Caja:** dinero cobrado y medios de pago; fuente contable distinta a comisiones.
- **Comisiones:** deuda, liquidaciones y pagos a barberos.
- **Equipo:** producción por persona dentro de permisos y período.
- **Auditoría:** acciones sensibles, actor, fecha y referencia para investigar cambios.
- **Exportación CSV:** respeta período y filtros activos.

Las métricas resumen; las tablas permiten reconciliar el detalle exacto.

## 11. Configuración — `/app/configuracion`

Sólo el dueño.

- **Equipo/barberos:** perfiles, relación laboral y estado.
- **Servicios:** nombre, duración, precio y activación.
- **Ofertas:** condiciones y vigencias promocionales.
- **Productos:** catálogo y datos necesarios para inventario/venta.
- **Comisiones:** reglas por tipo y vigencia; no reescriben operaciones históricas.
- **Usuarios:** crear cuenta, asignar roles, activar/desactivar y renovar contraseña.
- **Categorías de gasto:** clasificación usada al registrar gastos.

La pantalla usa lista/detalle y un único panel de edición para evitar muchos formularios simultáneos. Activar/desactivar está separado de editar.

## 12. Estados del sistema

- **Sesión expirada — `/app/sesion-expirada`:** explica lo ocurrido, permite volver a entrar y conserva el destino seguro.
- **Acceso denegado:** informa que el rol no tiene permiso y ofrece volver al inicio.
- **404 pública/interna:** distingue el sitio público del shell del equipo.
- **Error inesperado:** ofrece recuperación y muestra identificador de solicitud cuando existe.
- **Offline:** avisa que la lectura puede estar desactualizada y bloquea reservas, cobros y demás mutaciones críticas.
- **Actualización PWA:** permite actualizar ahora o posponer sin tapar controles importantes.

## 13. Flujos cotidianos recomendados

- **Cliente:** `/` → `/reservar` → guardar enlace → `/mi-cita#token` si necesita consultar o cambiar.
- **Administrador:** login → inicio → agenda → crear/abrir cita → atención y cobro → inventario si hubo producto o gasto.
- **Barbero:** login → `Mi día` → agenda propia → atender → revisar `Mis comisiones`.
- **Dueño:** login → panel general → operación diaria → comisiones/reportes → configuración sólo cuando cambia una regla futura.

La aplicación local permanece disponible en `http://localhost:8088`. Las credenciales de prueba se conservan únicamente en el `.env` local ignorado y no se documentan aquí para evitar convertirlas en datos reutilizables fuera del equipo.
