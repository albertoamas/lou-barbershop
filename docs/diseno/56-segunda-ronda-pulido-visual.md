# Segunda ronda de mejora visual por pantalla

**Estado:** EN_CURSO — C00 en revisión, C01–C14 pendientes.  
**Alcance:** presentación de las rutas públicas e internas existentes.  
**Base:** checkpoints 00–14 aprobados en `48-plan-rediseño-tailwind-y-movimiento.md`.

Esta ronda responde a una nueva solicitud de mejora. Conserva la identidad aprobada de Lou, las reglas de negocio, los permisos y los contratos de la API. El dueño revisa cada pantalla antes de avanzar a la siguiente, como en la primera ronda. Una mejora compartida se vuelve a comprobar en las pantallas ya aceptadas.

## Dirección visual

- **Marca:** precisión y oficio expresados con el logo real, trazos sobrios y contraste alto. No añadir símbolos decorativos genéricos.
- **Color:** tinta `#080808`, carbón `#171717`, papel `#f5f3ee`, niebla `#dededa`, blanco `#ffffff` y acero `#a7a7a7`. Verde, ámbar y borgoña se reservan para estados.
- **Tipo:** Barlow Condensed en titulares y cifras destacadas; Inter en controles, tablas y lectura. Etiquetas auxiliares legibles incluso en móvil; no depender de microtexto en mayúsculas.
- **Composición:** una acción primaria por contexto; datos económicos alineados y agrupados por concepto; menos contenedores repetidos cuando un divisor o una lista comunica mejor.
- **Movimiento:** responde a navegación, selección y confirmación. Respeta movimiento reducido. Ninguna animación demora una reserva, cobro o liquidación.

Esquema de referencia para las páginas operativas:

```text
Escritorio: navegación persistente | título + contexto + acción | filtros | trabajo | detalle
Móvil:      título + contexto             | filtros compactos | trabajo | barra de navegación
```

La primera auditoría visual de `/`, `/reservar` y `/app` mostró una base coherente. El ajuste transversal más concreto es la barra móvil interna: su área inferior no contemplaba la zona segura de teléfonos con indicador de inicio y sus etiquetas eran pequeñas. C00 corrige ambos puntos y refuerza el estado activo sin alterar rutas.

## Orden y alcance por pantalla

| Punto | Ruta y rol | Componentes y mejora detallada | Estados que se deben revisar | Estado |
|---|---|---|---|---|
| C00 | Todas; todos | `AppShell`, `InternalNavigation`, `Button`, campos, badges y diálogos: tamaño táctil, foco, áreas seguras, jerarquía tipográfica, contraste y movimiento. | Móvil/escritorio, menú Más, offline, actualización PWA. | EN_REVISIÓN |
| C01 | `/`; público | Cabecera, hero, logo, servicios, pasos, mapa, CTA y footer: ritmo vertical, lectura móvil, imágenes y enlaces útiles. | Catálogo cargando, vacío/error, mapa bloqueado, redes no configuradas. | PENDIENTE |
| C02 | `/reservar`; cliente | Progreso, tarjetas de servicio/barbero, calendario, horarios, formulario, resumen y confirmación: una decisión clara por paso y precio/hora legibles. | Sin huecos, error, offline, conflicto, envío, enlace privado. | PENDIENTE |
| C03 | `/mi-cita`; cliente | Entrada por enlace, tarjeta de cita, estado, reprogramación y cancelación: prioridad a fecha/hora y acciones inequívocas. | Sin token, inválido, caducado, cancelado, offline, conflicto. | PENDIENTE |
| C04 | `/privacidad`; público | Título, secciones, enlaces y tipografía de lectura: contenido escaneable en móvil sin sacrificar información. | Enlaces, texto largo, zoom. | PENDIENTE |
| C05 | `/app/login`; equipo | Marca, formulario, contraseña visible, mensajes y enlace público: foco y errores estables. | Credenciales inválidas, límite de intentos, MFA, conexión. | PENDIENTE |
| C06 | `/app`; dueño/admin/barbero | Encabezado, estado de conexión, CTA, métricas, próxima cita y alertas: densidad ajustada al rol y separación de ventas, caja y comisión. | Datos en cero, carga parcial, error y los tres roles. | PENDIENTE |
| C07 | `/app/agenda`; equipo | Navegación de fecha, vistas, filtros, tarjetas/columnas, detalle y editor: lectura temporal rápida y acciones por permiso. | Vacío, múltiples barberos, solapamiento, conflicto, móvil. | PENDIENTE |
| C08 | `/app/atenciones`; equipo | Cinco etapas, consumo, ajustes, pago, total persistente, confirmación y reverso: dinero y efecto económico siempre explícitos. | Llegada directa, cortesía, pago mixto, error, doble envío. | PENDIENTE |
| C09 | `/app/comisiones`; dueño/barbero | Saldos, filtros, libro, liquidaciones y detalle: deuda diferenciada de cobro y controles del dueño separados. | Sin movimientos, borrador, cerrada, pagada, reverso. | PENDIENTE |
| C10 | `/app/inventario`; dueño/admin | Alertas, cuatro pestañas, búsqueda, tabla/tarjetas, compras, ajustes y gastos: cantidades y costos comparables. | Sin stock, stock bajo, listas largas, validación, panel móvil. | PENDIENTE |
| C11 | `/app/disponibilidad`; equipo | Semana, turnos, excepciones y editor: diferencia visible entre lectura del barbero y edición de administración. | Día cerrado, pausa, excepción, conflicto con cita. | PENDIENTE |
| C12 | `/app/reportes`; dueño | Período, pestañas, métricas, detalle y CSV: cifras tabulares, fuente clara y filtros persistentes. | Sin datos, carga, error, tablas anchas, exportación. | PENDIENTE |
| C13 | `/app/configuracion`; dueño | Navegación secundaria, lista/detalle y editor de equipo, servicios, ofertas, productos, reglas, usuarios y gastos. | Sin registros, inactivo, versión futura, formularios largos. | PENDIENTE |
| C14 | `/app/seguridad` y estados de sistema; equipo | Contraseña, MFA, recuperación, sesión expirada, 403/404/error: mensajes accionables y controles accesibles. | Código inválido, recuperación, offline y retorno seguro. | PENDIENTE |

## Criterios de aceptación de cada punto

1. El flujo principal funciona con sus permisos y datos reales o ficticios del entorno local; el backend continúa decidiendo precios, disponibilidad, cobros y comisiones.
2. Se revisan 320, 390, 768 y 1440 px, sin scroll horizontal del documento ni acciones ocultas por barras fijas o áreas seguras.
3. Se prueban teclado, foco visible, etiquetas, estados anunciados y movimiento reducido.
4. Hay estados de carga, vacío, error, offline y confirmación cuando la ruta los necesita.
5. Pasan formato, lint, pruebas, build y comprobación visual con navegador. Las pruebas nuevas cubren cambios de comportamiento, no clases CSS sin semántica.
6. Se presentan al dueño la ruta, los roles afectados, las diferencias visibles y cómo probarlas. Sólo `APROBADO` permite comenzar el siguiente punto.

## Evidencia y decisión de C00

- La navegación interna permanece montada al cambiar de ruta.
- La barra móvil reserva la zona segura inferior, tiene etiquetas de 12 px y muestra mejor el destino activo.
- El contenido deja espacio suficiente para que la barra no cubra el último control.
- `Button` conserva una altura táctil mínima de 44 px; los campos tienen etiqueta y foco visible; `ConfirmDialog` usa el diálogo nativo y permite cancelar con Escape. No necesitaron cambios visuales en C00.
- Se comprobó sin desbordamiento horizontal a 320, 390, 768 y 1440 px. A 768 px aparece el rail y se oculta la barra móvil. El menú Más se revisó a 320 px.
- Con movimiento reducido, la transición CSS de la navegación dura `0.01 ms`; Motion respeta la preferencia del usuario mediante `MotionConfig`.
- `npm run format:check`, `npm run lint`, `npm run test` (116/116), `npm run build` y `npm run build-storybook` pasaron. La suite de arquitectura .NET no se ejecutó en el host porque falta el SDK 10.0.400; C00 no cambió C# ni referencias de proyectos.
- Pendiente: revisión visual del dueño en móvil y escritorio. Estado: **EN_REVISIÓN**.
