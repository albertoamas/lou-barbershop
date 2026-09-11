# Acta de avance — rediseño Tailwind y movimiento

**Fecha:** 11 de septiembre de 2026  
**Estado:** `CHECKPOINT 02 EN REVISIÓN — CORRECCIONES MÓVILES APLICADAS`  
**Plan:** [48-plan-rediseño-tailwind-y-movimiento.md](48-plan-rediseño-tailwind-y-movimiento.md)

## Situación actual y próxima decisión

La fundación visual y la landing fueron aprobadas individualmente por el dueño el 10 de septiembre de 2026. La reserva pública está presentada para revisión después de una primera ronda de observaciones. Las demás pantallas mantienen implementación provisional hasta que sean presentadas en su checkpoint correspondiente.

Desde este punto el trabajo queda ordenado por los checkpoints 00–14 definidos en el plan. No se implementará el checkpoint 09 (Inventario y gastos) hasta recorrer y aprobar explícitamente los checkpoints anteriores.

### Checkpoints aprobados

**`00 — Base visual y navegación`** fue marcado `APROBADO` por el dueño el 10 de septiembre de 2026 después de aplicar y presentar las cuatro correcciones solicitadas.

**`01 — Landing`** fue marcado `APROBADO` por el dueño el 10 de septiembre de 2026 después de completar las revisiones de contenido, tarjetas, ubicación, avisos PWA, CSP, precarga y movimiento.

### Último checkpoint presentado

**`01 — Landing`** (`/`)

Revisión solicitada al dueño:

- navbar transparente sobre el hero y sólida al desplazarse;
- mensaje principal, composición del logo y llamadas a reservar o gestionar una cita;
- catálogo real con duración y precio, incluidos carga y error;
- secuencia `Elige`, `Reserva`, `Llega`;
- sección de ubicación con el Google Maps proporcionado por el dueño;
- llamada final `Tu próximo corte empieza aquí` y footer público aprobado;
- comportamiento y jerarquía en móvil y escritorio.

**Decisión registrada:** `APROBADO`. El checkpoint `02 — Reserva pública` queda habilitado como siguiente revisión, pero todavía no ha sido presentado.

### Checkpoint presentado actualmente

**`02 — Reserva pública`** (`/reservar`)

La pantalla se reorganizó como un wizard real de cinco decisiones: servicio, barbero, fecha y hora,
datos y confirmación. Cada paso reemplaza únicamente el contenido de trabajo con una transición
direccional; volver conserva las selecciones. En escritorio el resumen permanece lateral y en móvil
se presenta como un control desplegable inequívoco.

El dueño solicitó cuatro correcciones durante la primera revisión del 11 de septiembre:

1. sustituir la línea de progreso horizontal que no se adaptaba bien al teléfono;
2. presentar la fecha como calendario y hacer más cómoda la elección de hora;
3. convertir `Ver resumen` en un control que se reconozca visualmente como botón;
4. evitar una lista excesivamente larga de horas en móvil.

La segunda presentación incorpora:

- progreso móvil con nombre del paso, porcentaje y cinco segmentos sin desplazamiento horizontal;
- campo de calendario acompañado por cinco fechas rápidas;
- periodos `Mañana` y `Tarde` con cantidad disponible;
- deduplicación visual por hora cuando el cliente acepta cualquier barbero;
- ocho horarios iniciales y expansión voluntaria mediante `Ver horarios más`;
- botón blanco `Ver resumen` con indicador de apertura dentro del resumen móvil.

**Decisión pendiente:** aprobación explícita del dueño. El checkpoint 03 continúa bloqueado.

### Correcciones solicitadas para el checkpoint 01

El dueño solicitó el 10 de septiembre de 2026:

1. retirar del hero la repetición `Sin cuenta`, `Disponibilidad actualizada` y `Enlace privado`;
2. retirar de la composición de imagen los textos superpuestos `Lou Barbershop` y `Una sucursal`, porque ya forman parte del logo;
3. reemplazar las filas de servicios por un diseño de tarjetas nuevo;
4. eliminar la flecha de la acción principal y acompañar `Reserva tu cita` y `Gestionar mi cita` con iconos gráficos convencionales.

Las cuatro correcciones quedaron aplicadas. Los servicios ahora usan una cuadrícula responsive de tarjetas editoriales con identificador, icono de tijeras, descripción, duración y precio en zonas separadas. Las acciones del hero usan iconos SVG de calendario y reloj; no emplean emojis ni caracteres decorativos.

En una segunda revisión del checkpoint 01, el dueño solicitó:

1. igualar la separación entre icono y texto de las dos acciones del hero;
2. suavizar la elevación de tarjetas y botones, evitando que el borde se vuelva negro durante el hover;
3. eliminar el bloque `Reserva con claridad / Lo necesario. Nada escondido` y sustituirlo por la ubicación real de Lou Barbershop.

La revisión iguala ambos espacios con el mismo token, aumenta la transición a 300 ms con una elevación de un píxel en los botones y dos píxeles en las tarjetas, conserva el borde gris y reemplaza el bloque anterior por `Estamos ubicados aquí`, un mapa responsive y un enlace al Google Maps proporcionado por el dueño. La coordenada incrustada se obtuvo resolviendo ese mismo enlace público.

Durante la revisión manual se detectó que el aviso de actualización PWA se ubicaba detrás de la cabecera fija de la landing e impedía interactuar con la navegación. Los avisos públicos ahora comparten una región apilable posicionada exactamente debajo de los 73 px de cabecera y con una capa inferior al navbar; cuando no existe ningún aviso, esa región no ocupa espacio ni altera el hero.

La prueba en el contenedor de aceptación reveló dos diferencias respecto del servidor de desarrollo: Caddy bloqueaba el iframe por no declarar `frame-src`, y los `modulepreload` generados por Vite producían advertencias al cruzarse con recursos servidos por el service worker. La CSP permite ahora exclusivamente `https://www.google.com` como origen de marcos y conserva el resto de restricciones; Vite deja de emitir esos preloads y los módulos continúan cargándose mediante los imports del bundle.

Una revisión posterior identificó dos causas de la elevación tosca: Tailwind CSS 4 representa `translate`, `scale` y `rotate` como propiedades CSS individuales, mientras varios componentes sólo declaraban transición para `transform`; además, una regla global heredada y no estratificada sobrescribía las utilidades Tailwind con 180 ms. El cambio de posición ocurría por tanto de forma instantánea. Se retiró la regla global y se corrigieron botones compartidos, CTA del navbar, tarjetas de servicios, agenda, reserva, atención, comisiones, inicio, redes sociales y acción PWA para transicionar las propiedades reales durante 300 ms con `ease-lou`; la elevación queda limitada a 1 px en botones y 2 px en tarjetas.

### Segunda presentación del checkpoint 00

Cambios solicitados por el dueño el 10 de septiembre de 2026 y aplicados:

1. el shell público cambió a una columna flexible con `min-height: 100dvh`; el contenido ocupa el espacio restante y el footer termina el documento sin dejar una franja ajena debajo;
2. el footer muestra iconos reconocibles de Facebook, WhatsApp, Instagram y TikTok obtenidos de Simple Icons; hasta recibir las cuentas oficiales se identifican como pendientes y no enlazan a perfiles inventados;
3. las rutas internas ahora comparten un único `SessionBoundary` y una navegación persistente; al cambiar entre Agenda y Atención sólo se reemplaza/anima el contenido central;
4. las flechas y el cierre decorativos de texto fueron sustituidos por iconos SVG convencionales, y los cambios históricos se describen con palabras.

Además, las pantallas se cargan por ruta mediante `React.lazy`, reduciendo el paquete inicial y evitando descargar módulos administrativos que todavía no se visitaron.

**Estado de esta iteración:** aprobada por el dueño.

### Implementación del checkpoint 01

- cabecera fija transparente sobre el hero que adquiere fondo, borde y sombra después de desplazar la página;
- accesos de escritorio a `Servicios` y `Cómo funciona` con desplazamiento suave y respeto a `prefers-reduced-motion`;
- hero de altura completa con identidad Lou y dos acciones públicas inequívocas;
- catálogo servido por la API, limitado a servicios activos y con estados de carga y error;
- proceso corregido a `Elige`, `Reserva`, `Llega`;
- ubicación real en un mapa responsive de Google Maps y acceso externo al enlace aprobado;
- llamada final corregida a `Tu próximo corte empieza aquí`.

## Matriz resumida de aceptación

| Checkpoint | Implementación | Aprobación humana |
|---|---|---|
| 00 Base visual y navegación | terminada | `APROBADO` |
| 01 Landing | terminada | `APROBADO` |
| 02 Reserva pública | terminada y corregida | `EN_REVISIÓN` |
| 03 Mi cita | provisional; falta token vigente | bloqueada por 02 |
| 04 Login | provisional terminada | bloqueada por 03 |
| 05 Inicio por rol | provisional; referencias incompletas | bloqueada por 04 |
| 06 Agenda y citas | provisional terminada | bloqueada por 05 |
| 07 Atención y cobro | provisional terminada | bloqueada por 06 |
| 08 Comisiones | provisional terminada | bloqueada por 07 |
| 09 Inventario y gastos | pendiente | bloqueada por 08 |
| 10 Disponibilidad | pendiente | bloqueada por 09 |
| 11 Reportes | pendiente | bloqueada por 10 |
| 12 Configuración | pendiente | bloqueada por 11 |
| 13 Estados transversales | parcial | bloqueada por 12 |
| 14 Pulido final | pendiente | bloqueada por 13 |

## Resultado de la primera entrega

- Tailwind CSS 4.3.3 integrado mediante `@tailwindcss/vite`;
- tema Lou definido con colores, fuentes, sombras y curva de movimiento;
- helper de clases y variantes tipadas para componentes;
- Motion for React con preferencia de movimiento reducido y carga diferida;
- transiciones de ruta y navegación con React Router View Transitions;
- shell público con cabecera, navegación y footer nuevos;
- navegación interna responsive y adaptada a dueño, administrador y barbero;
- indicador activo animado y menú móvil como bottom sheet;
- landing, login, dashboard y reserva pública migrados a Tailwind;
- gestión pública de cita migrada, incluida confirmación destructiva propia;
- agenda interna migrada con filtros responsive, estados y panel de detalle adaptable;
- editor de citas, selector/alta de clientes y detalle/historial migrados al sistema Tailwind;
- navegación desde una cita en servicio corregida hacia la ruta canónica `/app/atenciones`, sin recarga completa;
- atención y cobro migrados de punta a punta: llegada directa, servicios, productos, ajustes, pago y resumen diario;
- reverso económico con formulario accesible propio, motivo obligatorio y explicación del historial, sin `window.prompt`;
- comisiones y liquidaciones migradas, con jerarquía distinta para deuda, borrador, cierre, pago y comprobante inmutable;
- estilos reutilizables para campos, etiquetas, paneles y estados de formulario;
- estados de conexión, actualización PWA, carga, error y selección ajustados;
- proxy de desarrollo configurable mediante `VITE_API_PROXY_TARGET` para validar contra un runtime local real.

El cambio permanece limitado a presentación y composición. No modifica reglas de dominio, contratos API, persistencia, cálculos económicos ni autorización del servidor.

## Evidencia visual

- [Landing móvil](assets/design/lou-tailwind-landing-mobile.png)
- [Landing escritorio](assets/design/lou-tailwind-landing-desktop.png)
- [Login escritorio](assets/design/lou-tailwind-login-desktop.png)
- [Dashboard administrador escritorio](assets/design/lou-tailwind-admin-dashboard-desktop.png)
- [Reserva pública móvil](assets/design/lou-tailwind-booking-mobile.png)
- [Agenda interna móvil](assets/design/lou-tailwind-agenda-mobile.png)
- [Editor de cita móvil](assets/design/lou-tailwind-appointment-editor-mobile.png)
- [Atención y cobro móvil](assets/design/lou-tailwind-operations-mobile.png)
- [Atención y cobro escritorio](assets/design/lou-tailwind-operations-desktop.png)
- [Estado de enlace privado inválido](assets/design/lou-tailwind-manage-invalid-mobile.png)
- [Footer corregido e iconos sociales](assets/design/lou-checkpoint-00-footer-desktop.png)
- [Checkpoint 01 — hero de landing en escritorio](assets/design/lou-checkpoint-01-landing-desktop.png)
- [Checkpoint 01 — servicios en escritorio](assets/design/lou-checkpoint-01-services-desktop.png)
- [Checkpoint 01 — hero de landing en móvil](assets/design/lou-checkpoint-01-landing-mobile.png)
- [Checkpoint 01 — servicios rediseñados en móvil](assets/design/lou-checkpoint-01-services-mobile.png)
- [Checkpoint 01 — proceso de reserva en móvil](assets/design/lou-checkpoint-01-process-mobile.png)
- [Checkpoint 01 — ubicación en escritorio](assets/design/lou-checkpoint-01-location-desktop.png)
- [Checkpoint 01 — ubicación en móvil](assets/design/lou-checkpoint-01-location-mobile.png)
- [Checkpoint 02 — reserva en móvil](assets/design/lou-checkpoint-02-booking-mobile.png)
- [Checkpoint 02 — fecha y horarios en móvil](assets/design/lou-checkpoint-02-booking-schedule-mobile.png)
- [Checkpoint 02 — reserva en escritorio](assets/design/lou-checkpoint-02-booking-desktop.png)

Las capturas anteriores usan fixtures locales. Las tres capturas nuevas de editor y atención usan respuestas ficticias aisladas mediante Playwright porque el runtime activo no conservaba los usuarios sembrados; no modifican la base ni contienen datos reales.

## Evidencia automática

- Prettier: conforme;
- ESLint y Oxlint: sin hallazgos;
- Vitest: 18 archivos y 39 pruebas aprobadas;
- TypeScript estricto: aprobado;
- Vite/PWA: build aprobado, 47 entradas precacheadas por la división de pantallas;
- paquete inicial: 354,01 kB minificado; cada pantalla se entrega en un chunk diferido y Motion queda separado en 37,25 kB;
- Playwright: landing 390 × 844 y 1440 × 900, login 1440 × 900, dashboard admin 1440 × 900 y reserva 390 × 844;
- Playwright: agenda y estado inválido de `Mi cita` verificados a 390 × 844;
- Playwright: editor de cita a 390 × 844 y atención/cobro a 390 × 844 y 1440 × 900;
- consola del editor y de atención/cobro validada sin errores ni advertencias después de cargar los fixtures completos.
- Playwright: footer verificado en el final de `/reservar`, con cuatro redes y sin espacio residual bajo el footer;
- Playwright: el mismo nodo DOM del sidebar permaneció montado al navegar `Inicio → Agenda → Atención y cobro`; consola final sin errores ni advertencias con fixtures aislados completos.
- Checkpoint 01: Prettier, ESLint, Oxlint, TypeScript estricto y build Vite/PWA aprobados; 19 archivos y 41 pruebas Vitest aprobadas.
- Checkpoint 01: Playwright verificó la landing a 1440 × 900 y 390 × 844 con catálogo ficticio aislado; los accesos internos desplazan a la sección correcta, la cabecera pasa de `transparent` a `solid`, el ancho de contenido móvil coincide con el viewport y la consola termina con cero errores y cero advertencias.
- Revisión del checkpoint 01: las cuatro correcciones solicitadas se verificaron nuevamente a 1440 × 900 y 390 × 844; las tarjetas forman tres columnas en escritorio y una columna en móvil, sin desbordamiento horizontal, errores ni advertencias de consola.
- Segunda revisión del checkpoint 01: Playwright confirmó una transición de hover de 300 ms sin cambio del borde gris, iframe cargado desde Google Maps con la coordenada del enlace aprobado, adaptación a 1440 × 900 y 390 × 844, ancho móvil sin overflow y consola con cero errores y cero advertencias.
- Corrección del aviso PWA: fixture de actualización visible a 390 × 844 confirmó cabecera en `y=0..73`, aviso desde `y=73`, capas `40/30`, navegación `Reservar` interactuable y consola con cero errores y cero advertencias.
- Corrección CSP/preload validada en el contenedor principal de `localhost:8088`: `frame-src https://www.google.com`, mapa visible y cargado, cero elementos `modulepreload`, cero errores y cero advertencias de consola.
- Corrección de movimiento medida en Chromium: tarjeta `0 → -1,69 → -2 px` y botón `0 → -0,88 → -1 px` durante 300 ms; ambos declaran `translate` en `transition-property` y la consola termina sin errores ni advertencias.
- Checkpoint 02: seed local ejecutado dos veces consecutivas sin duplicados; se verificaron 5 servicios públicos, 2 barberos ficticios y 64 huecos antes de crear la cita de prueba.
- Checkpoint 02: reserva real ficticia completada de punta a punta en `localhost:8088`, incluido enlace privado de gestión; consola con cero errores y cero advertencias.
- Checkpoint 02: Playwright verificó progreso, resumen, calendario, periodos y límite inicial de horarios a 390 × 844; `scrollWidth` coincide con el viewport a 320 y 1440 px.
- Checkpoint 02: Prettier, ESLint, Oxlint, TypeScript, build PWA y 19 archivos con 41 pruebas Vitest aprobados.

El único `401` observado correspondió a un primer intento manual de QA con una contraseña de fixture equivocada; el segundo acceso con la credencial correcta fue exitoso. No es un defecto de la aplicación.

## Pendientes del plan

- completar la referencia del dashboard de dueño;
- verificar `Mi cita` con un token vigente y el flujo completo de reprogramación/cancelación;
- migrar inventario, disponibilidad, reportes y configuración;
- eliminar CSS heredado cuando todos sus consumidores hayan sido migrados;
- completar auditoría visual, accesibilidad y rendimiento de UX-6.

La entrega actual no cierra el plan completo; establece la fundación aprobada y un primer incremento vertical demostrable.
