# Guía de componentes, accesibilidad y pulido visual

**Fecha:** 19 de septiembre de 2026  
**Alcance:** cierre del checkpoint `14 — Pulido final` del rediseño Tailwind  
**Estado:** `APROBADO`

## 1. Propósito

Esta guía conserva las decisiones transversales que deben respetar las pantallas nuevas de Lou Barbershop. Complementa el plan visual y no sustituye las reglas de negocio, permisos ni contratos documentados.

## 2. Componentes compartidos

| Componente | Responsabilidad | Regla de uso |
|---|---|---|
| `BrandLockup` | marca completa o compacta | usar el logo real; mantener texto alternativo y contraste según el fondo |
| `Button` | acciones primarias, secundarias, discretas y destructivas | altura táctil mínima de 44 px; una sola acción primaria por contexto |
| `AppIcon` | iconografía funcional | decorativo por defecto; la acción contenedora aporta el nombre accesible |
| `InternalNavigation` | destinos permitidos por rol | móvil con barra y diálogo `Más`; escritorio con rail/sidebar persistente |
| `SystemStateCard` | 403, 404, sesión expirada y error global | título explícito, explicación breve y salida segura |
| `ConnectivityBanner` | estado sin conexión | indicar posible antigüedad de los datos y bloquear mutaciones críticas |
| `ServiceWorkerUpdateBanner` | actualización PWA | permitir actualizar o posponer sin cubrir la navegación |
| `ConfirmDialog` | acciones sensibles | título descriptivo, cancelación disponible y foco retenido por el diálogo nativo |

Los componentes pertenecen a `presentation`. No se importan Tailwind, React ni Motion desde `core` o desde reglas de negocio.

## 3. Accesibilidad obligatoria

- toda ruta tiene un encabezado principal visible;
- el enlace `Saltar al contenido` es el primer control de teclado del shell;
- al cambiar de ruta sin fragmento, el foco pasa al contenido principal y el scroll vuelve al inicio;
- botones sólo con icono tienen `aria-label`; iconos decorativos usan `aria-hidden`;
- formularios conservan etiqueta, mensaje asociado y foco visible;
- diálogos retienen el foco, responden a `Escape` cuando la acción no está procesándose y devuelven el foco al disparador;
- estado o selección no dependen exclusivamente del color;
- `prefers-reduced-motion` desactiva movimiento estructural y las transiciones nativas de vista;
- axe-core, ESLint con `jsx-a11y` y pruebas de teclado forman parte de la validación automática.

## 4. Responsive

Los anchos mínimos de aceptación son 320, 390, 768 y 1440 px. Ninguna página debe producir desplazamiento horizontal. Las tablas se transforman en tarjetas o mantienen un contenedor de scroll localizado; nunca ensanchan el documento. La navegación interna usa barra inferior en móvil, rail en tablet y sidebar en escritorio.

## 5. Movimiento

- microinteracción: 100–160 ms;
- pestaña, menú o acordeón: 160–220 ms;
- navegación, panel o bottom sheet: 200–280 ms;
- elevación deliberada de botones/tarjetas: 300 ms, con máximo de 1–2 px;
- usar principalmente opacidad y transformación; una persistencia nunca espera a la animación.

## 6. CSS y rendimiento

`src/frontend/src/index.css` contiene únicamente Tailwind, tokens, base global, foco y política de movimiento reducido. Los estilos de cada pantalla se expresan con utilidades Tailwind o variantes compartidas. No deben volver a añadirse clases globales específicas de páginas.

Presupuesto de referencia del cierre:

- CSS de producción: 67,78 kB, 11,84 kB gzip;
- entrada principal JavaScript: 358,03 kB, 115,51 kB gzip;
- PWA: 52 entradas y 906,16 KiB en precache;
- pantallas internas y públicas de mayor tamaño continúan divididas en chunks diferidos.

## 7. Lista de verificación para cambios visuales

1. probar 320, 390, 768 y 1440 px;
2. recorrer el flujo principal sólo con teclado;
3. revisar nombres accesibles, encabezados y mensajes;
4. comprobar movimiento reducido;
5. ejecutar `npm run format:check`, `npm run lint`, `npm run test`, `npm run build` y `npm run build-storybook`;
6. comprobar consola, overflow y comportamiento offline/PWA;
7. actualizar el acta visual si cambia un checkpoint aprobado.
