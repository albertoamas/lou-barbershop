# Plan de rediseño visual, Tailwind y movimiento

**Estado:** `EN PROGRESO / ACEPTACIÓN VISUAL POR PANTALLA`  
**Alcance:** experiencia pública e interna de Lou Barbershop  
**Impacto funcional:** ninguno; no modifica reglas, contratos API, permisos ni persistencia  
**Objetivo:** convertir la aplicación funcional actual en una experiencia consistente, fluida, reconocible como Lou y fácil de operar desde teléfono, tablet y escritorio.

## 1. Diagnóstico de la interfaz actual

La aplicación ya tiene identidad monocromática, tipografías, navegación responsive y componentes reutilizables. El problema no es la ausencia de color: es la falta de profundidad visual, ritmo, jerarquía contextual y movimiento coordinado.

La implementación actual usa un único `index.css` de más de 1.700 líneas. Esto dificulta descubrir estilos, repetir patrones con exactitud y evolucionar una pantalla sin producir diferencias accidentales. La mayoría de los cambios de estado son instantáneos y sólo existe una transición CSS aislada; por eso la aplicación se percibe estática.

## 2. Decisión tecnológica recomendada

### 2.1 Stack que se conserva

- React 19 y TypeScript estricto;
- React Router 7;
- TanStack Query;
- React Hook Form y Zod;
- Vite, Workbox y PWA;
- Storybook, Testing Library, Vitest y Playwright;
- Barlow Condensed e Inter autohospedadas.

### 2.2 Capa visual propuesta

- **Tailwind CSS 4** con el plugin oficial `@tailwindcss/vite`;
- tokens de Lou definidos con variables CSS y `@theme`;
- `class-variance-authority`, `clsx` y `tailwind-merge` para variantes de componentes sin concatenaciones frágiles;
- **React Router View Transitions** para cambios de ruta con degradación segura;
- **Motion for React** mediante `LazyMotion` para paneles, pasos, listas y microinteracciones que CSS no resuelve limpiamente;
- CSS nativo únicamente para tokens, fuentes, estilos globales, View Transitions y casos especiales.

Tailwind no entra en `core`, `application` ni adaptadores HTTP. Vive sólo en `presentation`. Por tanto, no afecta Clean Architecture: las reglas de negocio continúan independientes de React, Tailwind y Motion.

No se incorporará un tema prefabricado como DaisyUI, Material UI o Bootstrap. Tampoco se copiará Shadcn completo. Lou tendrá componentes propios; se podrá usar un primitivo accesible y sin estilos para diálogos, menús o pestañas si una auditoría demuestra que el componente propio no cubre foco, teclado o lector de pantalla.

## 3. Línea visual común

### Concepto: “Precisión con carácter”

La interfaz combina la precisión de las navajas del logo con el trato cercano de una barbería local. Debe sentirse sobria, contemporánea y rápida, sin convertirse en una plantilla corporativa ni en una decoración vintage recargada.

### Lenguaje visual

- base `ink / charcoal / paper / white` y acero para detalles;
- borgoña sólo para peligro, verde para éxito y ámbar para advertencia;
- encabezados condensados, cuerpo muy legible y cifras tabulares;
- bloques con bordes finos, sombras contenidas y radios medianos;
- diagonales inspiradas en navajas como detalle editorial, nunca detrás de datos;
- fotografías reales sólo cuando el dueño las entregue y autorice;
- iconos lineales con el mismo grosor y área táctil mínima de 44 px;
- menos tarjetas genéricas: agrupación por jerarquía, divisores y espacio.

### Escala de movimiento

| Nivel | Uso | Duración objetivo |
|---|---|---:|
| instantáneo | validación, foco, bloqueo económico | 0–100 ms |
| micro | hover, tap, selección, badge | 100–160 ms |
| componente | acordeón, pestaña, toast, menú | 160–220 ms |
| navegación | ruta, paso, drawer, bottom sheet | 200–280 ms |

La elevación de tarjetas y botones constituye una excepción deliberada de `300 ms`: Tailwind 4 debe transicionar las propiedades individuales `translate` y `scale`, no sólo `transform`. Esto evita el salto instantáneo observado en navegadores modernos y mantiene un desplazamiento máximo de 1–2 px.

Las animaciones usarán principalmente `opacity` y `transform`, serán interrumpibles y respetarán `prefers-reduced-motion`. Ningún cobro, reserva o liquidación esperará una animación para persistirse.

## 4. Sistema compartido de componentes

### Marca y estructura

- `BrandLockup`: logo completo, isotipo y versiones claro/oscuro;
- `PublicHeader`: logo, `Reservar`, `Mi cita` y `Acceso del equipo`;
- `PublicFooter`: marca, navegación útil, zona horaria y moneda; contacto y dirección sólo con datos reales;
- `InternalShell`: sidebar, rail o barra inferior según ancho;
- `PageHeader`: título, contexto, acción primaria y acciones secundarias;
- `SectionTabs`, `Breadcrumbs` cuando exista profundidad real y `UserMenu`.

### Acciones y entrada

- botones `primary`, `secondary`, `ghost`, `danger` e `icon`;
- `Field`, `Select`, `Combobox`, `SearchField`, `DateField`, `MoneyField` y `PhoneField`;
- estados normal, hover, foco, deshabilitado, procesando, error y éxito;
- barras de acciones pegajosas sólo cuando eviten perder la acción principal en móvil.

### Datos y feedback

- `StatusBadge`, `Metric`, `AppointmentCard`, `TimeSlot`, `BarberCard` y `ServiceCard`;
- `DataTable` en escritorio con equivalente de lista resumida en móvil;
- `Skeleton`, `EmptyState`, `InlineAlert`, `Toast` y `ProgressButton`;
- `SidePanel` en escritorio y `BottomSheet` en móvil;
- `ConfirmDialog` para anulaciones, reversos, pagos y liquidaciones;
- `OfflineBanner` y `UpdateBanner` sin cubrir acciones críticas.

Cada componente tendrá variantes tipadas, historias de Storybook, estados accesibles y pruebas donde exista interacción.

## 5. Experiencia pública del cliente

El cliente no crea cuenta ni ve el shell interno.

### 5.1 Landing `/`

**Navbar:** transparente sobre el primer bloque y sólida al desplazarse; logo, `Servicios`, `Cómo funciona`, `Mi cita` y CTA `Reservar`.

**Hero:** mensaje breve, CTA principal, CTA secundario y composición del logo. Sin carrusel. Animación de entrada discreta y una línea diagonal inspirada en las navajas.

**Servicios:** tarjetas obtenidas del catálogo real con nombre, duración y precio. Skeleton durante carga; bloque recuperable si falla el catálogo.

**Cómo funciona:** tres pasos —elige, reserva, llega— con transición ligera al entrar al viewport.

**Ubicación:** sección `Estamos ubicados aquí` con mapa responsive de Google Maps y acceso externo a la ubicación proporcionada por el dueño. No inventar dirección, coordenadas ni sucursales; la coordenada incrustada debe corresponder al enlace aprobado.

**CTA final:** bloque oscuro `Tu próximo corte empieza aquí`.

**Footer:** logo, enlaces públicos, moneda BOB, zona horaria y acceso discreto del equipo.

### 5.2 Reserva `/reservar`

- wizard con progreso `Servicio → Barbero → Fecha y hora → Datos → Confirmar`;
- una decisión principal por paso;
- paso siguiente entra desde la derecha y volver invierte la dirección;
- resumen de reserva persistente: lateral en escritorio y acordeón pegajoso en móvil;
- servicio como tarjeta seleccionable, barbero como perfil compacto y horarios como rejilla táctil;
- validación junto al campo, preservación de selecciones y bloqueo explícito sin conexión;
- confirmación con check animado breve, resumen y acción `Gestionar mi cita`.

### 5.3 Mi cita `/mi-cita#token`

- tarjeta principal con estado, fecha, hora, servicio y barbero;
- línea temporal corta de la cita;
- acciones `Reprogramar` y `Cancelar`, separando claramente la acción destructiva;
- reprogramación dentro del mismo flujo de fecha/hora;
- enlace inválido, cita no disponible, offline, procesando y cancelada con mensajes propios.

## 6. Acceso y shell interno

### 6.1 Login `/app/login`

- pantalla dividida en escritorio y una columna en móvil;
- marca y mensaje corto, sin promoción ni menú público completo;
- formulario de dos campos, mostrar/ocultar contraseña y estado de procesamiento;
- entrada con fade corto; error estable sin sacudir el formulario;
- enlace de regreso a la landing.

### 6.2 Navegación responsive

| Rol | Navegación principal |
|---|---|
| Dueño | Inicio, Agenda, Atender, Comisiones, Reportes, Inventario, Disponibilidad, Configuración |
| Administrador | Inicio, Agenda, Atender, Inventario, Disponibilidad |
| Barbero | Mi día, Agenda, Atender, Mis comisiones, Disponibilidad |

- móvil: barra inferior con cuatro destinos frecuentes y menú `Más` como bottom sheet;
- tablet: rail lateral con iconos, texto corto y tooltip;
- escritorio: sidebar expandida con grupo principal, gestión y cuenta;
- indicador activo animado, no sólo cambio de color;
- encabezado contextual con fecha operativa, estado de conexión y usuario;
- el menú oculta lo no permitido, pero el backend conserva la autorización real.

## 7. Pantallas por rol

### 7.1 Inicio `/app`

**Dueño:** ventas del día, efectivo/QR, comisiones pendientes, próximas citas y alertas de inventario. Accesos a reportes y cierre económico.

**Administrador:** estado de agenda, próximas llegadas, atenciones en curso, cobros pendientes y stock bajo. Acción primaria `Nueva cita`.

**Barbero:** `Mi día`, próxima cita, producción personal, comisión propia y acción `Atender llegada directa`.

Los números usan conteo animado sólo en la carga inicial y nunca cuando el movimiento reducido esté activo.

### 7.2 Agenda `/app/agenda`

- dueño/admin: agenda de todo el equipo con filtro de barbero;
- barbero: su propia agenda, sin selector que prometa acceso ajeno;
- encabezado pegajoso con fecha, hoy/anterior/siguiente y filtros;
- móvil: lista temporal; tablet/escritorio: columnas por barbero o línea de tiempo;
- cita abre bottom sheet o side panel con transición compartida;
- estados, huecos y solapamientos son distinguibles por texto y forma;
- drag-and-drop no entra en este rediseño: reprogramar sigue siendo una acción explícita y segura.

### 7.3 Atender y cobrar `/app/atenciones`

- flujo por etapas: cliente/cita, servicios y productos, ajustes, pago, confirmación;
- total y estado permanecen visibles;
- dueño/admin pueden elegir barbero efectivo y aplicar ajustes autorizados;
- barbero opera su propia atención dentro de sus permisos;
- pago en efectivo, QR o mixto con diferencia calculada en tiempo real;
- confirmación de cobro inequívoca, botón bloqueado durante envío y éxito persistente;
- reverso visible únicamente al dueño y separado del flujo normal.

### 7.4 Comisiones `/app/comisiones`

**Dueño:** saldo por barbero, período, detalle por operación, crear/cerrar/pagar liquidación y reversos autorizados.

**Barbero:** saldo propio, operaciones que lo componen y liquidaciones propias; nunca controles de pago.

- resumen superior, filtros compactos y detalle expandible;
- estados de liquidación con línea temporal;
- importes alineados y deuda de comisión visualmente separada del dinero cobrado.

### 7.5 Inventario y gastos `/app/inventario`

**Dueño/admin:** pestañas `Existencias`, `Compras`, `Gastos` y `Caja de hoy`.

- alertas de stock antes de la tabla;
- búsqueda y filtros pegajosos;
- tabla en escritorio y tarjetas densas en móvil;
- movimientos aparecen como historial, no como edición destructiva;
- formularios de entrada, ajuste y gasto en panel contextual;
- barbero no tiene acceso a esta sección.

### 7.6 Disponibilidad `/app/disponibilidad`

- dueño/admin: selector de barbero, horarios semanales y excepciones editables;
- barbero: lectura de su horario y excepciones, sin controles de edición;
- semana visual compacta, no siete formularios largos;
- editar abre panel con hora inicial/final y validación clara;
- excepción se muestra dentro del calendario y en una lista próxima.

### 7.7 Reportes `/app/reportes`

**Sólo dueño.**

- período global persistente;
- pestañas `Operación`, `Caja`, `Comisiones`, `Equipo` y `Auditoría`;
- cada pestaña inicia con 2–4 métricas y luego detalle;
- gráficos únicamente cuando expliquen tendencia; tablas para reconciliación exacta;
- skeleton con la geometría final para evitar saltos;
- exportar conserva filtros y comunica claramente qué se descargará.

### 7.8 Configuración `/app/configuracion`

**Sólo dueño.**

- navegación secundaria: equipo, servicios, ofertas, productos, comisiones y usuarios;
- vista lista/detalle para evitar una página interminable;
- crear/editar en side panel, no múltiples formularios abiertos a la vez;
- activar/desactivar separado de editar;
- avisos específicos para cambios que afecten precios o condiciones futuras;
- las reglas históricas permanecen intactas.

### 7.9 Estados del sistema

- sesión expirada: explicar, volver a ingresar y retornar al destino solicitado;
- acceso denegado: indicar límite del rol y ofrecer volver al inicio;
- página no encontrada pública e interna con shell correspondiente;
- error inesperado con identificador de solicitud cuando exista;
- actualización PWA disponible con acción diferible;
- offline: lectura cacheada identificada y mutaciones críticas bloqueadas.

## 8. Plan de ejecución UX

Este trabajo es una mejora transversal dentro del backlog de estabilización; no reabre las puertas funcionales ya aceptadas.

### 8.1 Regla de avance y aprobación humana

La aprobación general del plan autoriza la tecnología, la línea visual y el orden de trabajo, pero **no equivale a aprobar cada pantalla**. Desde el 10 de septiembre de 2026 se aplicará esta secuencia obligatoria:

1. implementar o ajustar un único checkpoint visual;
2. validar código, comportamiento, responsive y accesibilidad básica;
3. presentar al dueño las rutas, roles y capturas del checkpoint;
4. recibir una decisión explícita: `APROBADO` o `CAMBIOS SOLICITADOS`;
5. corregir y volver a presentar si corresponde;
6. avanzar al siguiente checkpoint únicamente cuando el actual esté `APROBADO`.

Los estados se interpretan así:

| Estado | Significado |
|---|---|
| `PENDIENTE` | todavía no se implementó el rediseño |
| `IMPLEMENTADO_SIN_APROBAR` | existe código y evidencia técnica, pero falta opinión del dueño |
| `EN_REVISIÓN` | es el único checkpoint presentado actualmente al dueño |
| `CAMBIOS_SOLICITADOS` | el dueño pidió correcciones; no se avanza |
| `APROBADO` | el dueño aceptó explícitamente el checkpoint |
| `LISTO_PARA_REVISIÓN` | la dependencia anterior está aprobada, pero este checkpoint aún no fue presentado |

Una pantalla posterior puede tener implementación provisional por trabajo previo, pero permanece bloqueada para aceptación hasta aprobar las anteriores. La coherencia visual se revisa nuevamente si una corrección aprobada cambia componentes compartidos.

### 8.2 Orden de revisión pantalla por pantalla

| Orden | Checkpoint | Rutas/elementos | Roles | Implementación | Aprobación del dueño |
|---:|---|---|---|---|---|
| 00 | Base visual y navegación | tokens, tipografías, botones, campos, movimiento, navbar, sidebar y barra móvil | todos | `IMPLEMENTADO` | `APROBADO` |
| 01 | Landing | `/` y footer público | cliente | `IMPLEMENTADO` | `APROBADO` |
| 02 | Reserva pública | `/reservar`, pasos y confirmación | cliente | `IMPLEMENTADO` | `EN_REVISIÓN` |
| 03 | Gestión de cita | `/mi-cita#token`, reprogramación y cancelación | cliente | `IMPLEMENTADO_SIN_APROBAR`; falta QA con token vigente | `BLOQUEADO_POR_02` |
| 04 | Acceso interno | `/app/login`, sesión y recuperación de errores | equipo | `IMPLEMENTADO_SIN_APROBAR` | `BLOQUEADO_POR_03` |
| 05 | Inicio por rol | `/app` para dueño, administrador y barbero | internos | `IMPLEMENTADO_SIN_APROBAR`; faltan referencias dueño/barbero | `BLOQUEADO_POR_04` |
| 06 | Agenda y citas | `/app/agenda`, creación, detalle, historial y reprogramación | internos | `IMPLEMENTADO_SIN_APROBAR` | `BLOQUEADO_POR_05` |
| 07 | Atención y cobro | `/app/atenciones` y reverso del dueño | internos | `IMPLEMENTADO_SIN_APROBAR` | `BLOQUEADO_POR_06` |
| 08 | Comisiones | `/app/comisiones` y liquidaciones | dueño/barbero | `IMPLEMENTADO_SIN_APROBAR` | `BLOQUEADO_POR_07` |
| 09 | Inventario y gastos | `/app/inventario` | dueño/admin | `PENDIENTE` | `BLOQUEADO_POR_08` |
| 10 | Disponibilidad | `/app/disponibilidad` | internos según permisos | `PENDIENTE` | `BLOQUEADO_POR_09` |
| 11 | Reportes | `/app/reportes` | dueño | `PENDIENTE` | `BLOQUEADO_POR_10` |
| 12 | Configuración | `/app/configuracion` | dueño | `PENDIENTE` | `BLOQUEADO_POR_11` |
| 13 | Estados transversales | offline, actualización PWA, 403, 404, error y sesión expirada | todos | `IMPLEMENTACIÓN_PARCIAL` | `BLOQUEADO_POR_12` |
| 14 | Pulido final | responsive, teclado, lector, rendimiento y limpieza CSS | todos | `PENDIENTE` | `BLOQUEADO_POR_13` |

**Último checkpoint aprobado:** `01 — Landing`. El dueño lo aprobó explícitamente el 10 de septiembre de 2026 después de revisar sus correcciones funcionales, visuales, PWA, CSP y de movimiento. El checkpoint `02 — Reserva pública` está `EN_REVISIÓN`; sus cuatro correcciones móviles solicitadas el 11 de septiembre fueron implementadas y presentadas nuevamente. No se habilita el checkpoint 03 hasta recibir aprobación explícita.

Para aceptar cada checkpoint se presentará como mínimo: rutas y credenciales/forma de acceso, vista móvil y escritorio cuando aplique, roles afectados, estados principales, evidencia automática y una lista corta de elementos que el dueño debe observar.

### UX-0 — Baseline y contrato visual

**Entregables:** inventario de pantallas/estados, capturas actuales, tokens Tailwind, mapa de componentes y presupuesto de movimiento.

**Aceptación:** ninguna pantalla o estado queda sin inventariar; se aprueban tres referencias: landing, agenda móvil y panel de dueño escritorio.

### UX-1 — Fundación Tailwind

**Entregables:** instalación Tailwind 4, `@theme`, utilidades compartidas, helper de clases, componentes base y Storybook.

**Estrategia:** migración incremental por pantalla; no mezclar reescritura funcional. El CSS antiguo se elimina sólo cuando deja de tener consumidores.

**Aceptación:** build, lint, pruebas y arquitectura verdes; no hay cambio funcional ni CSS global huérfano en el alcance migrado.

### UX-2 — Movimiento y shell

**Entregables:** `MotionProvider`, preferencias reducidas, transiciones de ruta, sidebar/rail/tabbar, menús, paneles, toasts y skeletons.

**Aceptación:** navegación sin saltos, foco restaurado, 60 fps objetivo en dispositivo medio y cero animaciones obligatorias con movimiento reducido.

### UX-3 — Cliente público

**Entregables:** landing, footer, reserva paso a paso, confirmación y gestión de cita.

**Aceptación:** reserva completa a 320, 390, 768 y 1440 px; sin overflow; sin datos inventados; mutaciones offline bloqueadas.

### UX-4 — Operación diaria

**Entregables:** login, inicios por rol, agenda, detalle, atención y cobro.

**Aceptación:** dueño, admin y barbero completan sus tareas críticas; permisos visuales y del servidor coinciden; doble envío impedido.

### UX-5 — Economía y gestión

**Entregables:** comisiones, inventario/gastos, disponibilidad, reportes y configuración.

**Aceptación:** deuda, cobro e inventario siguen separados; tablas son legibles en móvil; acciones sensibles tienen confirmación y auditoría existente.

### UX-6 — Pulido y aceptación

**Entregables:** auditoría responsive, accesibilidad, rendimiento, PWA, capturas finales y guía de componentes.

**Aceptación:** cero errores serios/críticos de accesibilidad, flujos por teclado aprobados, ausencia de overflow, pruebas visuales y funcionales verdes, y aprobación humana del dueño.

## 9. Criterios globales de terminado

- la aplicación se reconoce como Lou sin depender de adornos o fotografías;
- cliente, dueño, administrador y barbero ven una jerarquía adaptada a su objetivo;
- todas las pantallas tienen loading, vacío, error, éxito, offline y permiso cuando aplique;
- las transiciones orientan y responden, pero no retrasan trabajo;
- `prefers-reduced-motion` funciona en toda la aplicación;
- no se duplican reglas de precio, comisión, stock, permisos ni disponibilidad;
- Tailwind no sale de `presentation` y el frontend `core` continúa sin React;
- Storybook cubre variantes compartidas;
- Vitest, lint, TypeScript, build PWA y pruebas de navegador quedan verdes;
- se verifican 320 × 568, 390 × 844, 768 × 1024 y 1440 × 900;
- no quedan reglas consumidas en el antiguo CSS global.

## 10. Riesgos y controles

| Riesgo | Control |
|---|---|
| Tailwind produce clases repetidas | componentes tipados y variantes centralizadas |
| apariencia genérica | tokens Lou y componentes propios; no tema prefabricado |
| exceso de animación | presupuesto de movimiento y revisión por flujo |
| aumento de bundle | `LazyMotion`, imports selectivos y presupuesto medido |
| regresión durante migración | una pantalla por incremento, capturas y pruebas |
| permisos sólo ocultos en UI | conservar autorización del backend y pruebas negativas |
| CSS antiguo convive indefinidamente | inventario y eliminación por consumidores |

## 11. Puerta de aprobación

Antes de UX-1 deben aprobarse:

1. Tailwind CSS 4 como herramienta de estilos de presentación;
2. Motion for React sólo para movimiento estructural y microinteracciones complejas;
3. la línea “Precisión con carácter”;
4. el orden de implementación UX-0 a UX-6;
5. las tres referencias visuales iniciales requeridas en UX-0.

**Aprobación:** confirmada por el dueño el 9 de septiembre de 2026. Tailwind CSS se usará como sistema general de estilos de presentación, no únicamente para transiciones.

Esta aprobación corresponde al **plan general**. Las aprobaciones visuales de los checkpoints 00–14 se registran por separado en el acta de avance y requieren confirmación explícita del dueño.
