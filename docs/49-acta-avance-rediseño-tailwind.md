# Acta de avance — rediseño Tailwind y movimiento

**Fecha:** 10 de septiembre de 2026  
**Estado:** `PAUSADO EN ACEPTACIÓN VISUAL — CHECKPOINT 01`  
**Plan:** [48-plan-rediseño-tailwind-y-movimiento.md](48-plan-rediseño-tailwind-y-movimiento.md)

## Situación actual y próxima decisión

La fundación visual fue aprobada individualmente por el dueño el 10 de septiembre de 2026. Las demás pantallas mantienen implementación provisional hasta que sean presentadas en su checkpoint correspondiente.

Desde este punto el trabajo queda ordenado por los checkpoints 00–14 definidos en el plan. No se implementará el checkpoint 09 (Inventario y gastos) hasta recorrer y aprobar explícitamente los checkpoints anteriores.

### Checkpoint aprobado

**`00 — Base visual y navegación`** fue marcado `APROBADO` por el dueño el 10 de septiembre de 2026 después de aplicar y presentar las cuatro correcciones solicitadas.

### Checkpoint presentado ahora

**`01 — Landing`** (`/`)

Revisión solicitada al dueño:

- navbar transparente sobre el hero y sólida al desplazarse;
- mensaje principal, composición del logo y llamadas a reservar o gestionar una cita;
- catálogo real con duración y precio, incluidos carga y error;
- secuencia `Elige`, `Reserva`, `Llega`;
- sección de confianza sin testimonios ni información inventada;
- llamada final `Tu próximo corte empieza aquí` y footer público aprobado;
- comportamiento y jerarquía en móvil y escritorio.

**Decisión pendiente:** `APROBADO` o `CAMBIOS SOLICITADOS`. Una vez aprobado el checkpoint 01, se presenta el `02 — Reserva pública`.

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
- bloque de confianza basado únicamente en hechos del producto: una sucursal, sin cuenta, precio visible y enlace privado;
- llamada final corregida a `Tu próximo corte empieza aquí`.

## Matriz resumida de aceptación

| Checkpoint | Implementación | Aprobación humana |
|---|---|---|
| 00 Base visual y navegación | terminada | `APROBADO` |
| 01 Landing | terminada | `EN_REVISIÓN` |
| 02 Reserva pública | provisional terminada | bloqueada por 01 |
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
- [Checkpoint 01 — proceso de reserva en móvil](assets/design/lou-checkpoint-01-process-mobile.png)

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

El único `401` observado correspondió a un primer intento manual de QA con una contraseña de fixture equivocada; el segundo acceso con la credencial correcta fue exitoso. No es un defecto de la aplicación.

## Pendientes del plan

- completar la referencia del dashboard de dueño;
- verificar `Mi cita` con un token vigente y el flujo completo de reprogramación/cancelación;
- migrar inventario, disponibilidad, reportes y configuración;
- eliminar CSS heredado cuando todos sus consumidores hayan sido migrados;
- completar auditoría visual, accesibilidad y rendimiento de UX-6.

La entrega actual no cierra el plan completo; establece la fundación aprobada y un primer incremento vertical demostrable.
