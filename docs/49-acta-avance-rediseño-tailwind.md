# Acta de avance — rediseño Tailwind y movimiento

**Fecha:** 10 de septiembre de 2026  
**Estado:** `UX-0/UX-1 EN PROGRESO`  
**Plan:** [48-plan-rediseño-tailwind-y-movimiento.md](48-plan-rediseño-tailwind-y-movimiento.md)

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
- paquete principal: 493,36 kB minificado; Motion se separa en un chunk diferido de 37,21 kB;
- Playwright: landing 390 × 844 y 1440 × 900, login 1440 × 900, dashboard admin 1440 × 900 y reserva 390 × 844;
- Playwright: agenda y estado inválido de `Mi cita` verificados a 390 × 844;
- Playwright: editor de cita a 390 × 844 y atención/cobro a 390 × 844 y 1440 × 900;
- consola del editor y de atención/cobro validada sin errores ni advertencias después de cargar los fixtures completos.

El único `401` observado correspondió a un primer intento manual de QA con una contraseña de fixture equivocada; el segundo acceso con la credencial correcta fue exitoso. No es un defecto de la aplicación.

## Pendientes del plan

- completar la referencia del dashboard de dueño;
- verificar `Mi cita` con un token vigente y el flujo completo de reprogramación/cancelación;
- migrar comisiones, inventario, disponibilidad, reportes y configuración;
- eliminar CSS heredado cuando todos sus consumidores hayan sido migrados;
- completar auditoría visual, accesibilidad y rendimiento de UX-6.

La entrega actual no cierra el plan completo; establece la fundación aprobada y un primer incremento vertical demostrable.
