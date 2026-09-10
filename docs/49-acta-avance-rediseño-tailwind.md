# Acta de avance — rediseño Tailwind y movimiento

**Fecha:** 10 de septiembre de 2026  
**Estado:** `PAUSADO EN ACEPTACIÓN VISUAL — CHECKPOINT 00`  
**Plan:** [48-plan-rediseño-tailwind-y-movimiento.md](48-plan-rediseño-tailwind-y-movimiento.md)

## Situación actual y próxima decisión

La fundación visual y varias pantallas ya tienen implementación provisional, pero **ninguna pantalla está aprobada individualmente por el dueño**. La aprobación del 9 de septiembre confirmó el plan, Tailwind y la dirección “Precisión con carácter”; no confirmó el resultado visual de cada ruta.

Desde este punto el trabajo queda ordenado por los checkpoints 00–14 definidos en el plan. No se implementará el checkpoint 09 (Inventario y gastos) hasta recorrer y aprobar explícitamente los checkpoints anteriores.

### Checkpoint presentado ahora

**`00 — Base visual y navegación`**

Revisión solicitada al dueño:

- identidad monocromática, Barlow Condensed e Inter;
- jerarquía de títulos, texto, cifras, paneles y formularios;
- botones primario, secundario, discreto y peligro;
- navbar/footer públicos;
- sidebar de escritorio, navegación móvil y menú `Más`;
- velocidad y estilo de transiciones;
- legibilidad, contraste y sensación general de Lou Barbershop.

**Decisión pendiente:** `APROBADO` o `CAMBIOS SOLICITADOS`. Una vez aprobado el checkpoint 00, se presenta el `01 — Landing`.

## Matriz resumida de aceptación

| Checkpoint | Implementación | Aprobación humana |
|---|---|---|
| 00 Base visual y navegación | terminada | `EN_REVISIÓN` |
| 01 Landing | provisional terminada | bloqueada por 00 |
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

Las capturas anteriores usan fixtures locales. Las tres capturas nuevas de editor y atención usan respuestas ficticias aisladas mediante Playwright porque el runtime activo no conservaba los usuarios sembrados; no modifican la base ni contienen datos reales.

## Evidencia automática

- Prettier: conforme;
- ESLint y Oxlint: sin hallazgos;
- Vitest: 16 archivos y 37 pruebas aprobadas;
- TypeScript estricto: aprobado;
- Vite/PWA: build aprobado, 20 entradas precacheadas;
- paquete principal: 497,57 kB minificado; Motion se separa en un chunk diferido de 37,21 kB;
- Playwright: landing 390 × 844 y 1440 × 900, login 1440 × 900, dashboard admin 1440 × 900 y reserva 390 × 844;
- Playwright: agenda y estado inválido de `Mi cita` verificados a 390 × 844;
- Playwright: editor de cita a 390 × 844 y atención/cobro a 390 × 844 y 1440 × 900;
- consola del editor y de atención/cobro validada sin errores ni advertencias después de cargar los fixtures completos.

El único `401` observado correspondió a un primer intento manual de QA con una contraseña de fixture equivocada; el segundo acceso con la credencial correcta fue exitoso. No es un defecto de la aplicación.

## Pendientes del plan

- completar la referencia del dashboard de dueño;
- verificar `Mi cita` con un token vigente y el flujo completo de reprogramación/cancelación;
- migrar inventario, disponibilidad, reportes y configuración;
- eliminar CSS heredado cuando todos sus consumidores hayan sido migrados;
- completar auditoría visual, accesibilidad y rendimiento de UX-6.

La entrega actual no cierra el plan completo; establece la fundación aprobada y un primer incremento vertical demostrable.
