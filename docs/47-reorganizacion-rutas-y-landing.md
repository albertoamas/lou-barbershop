# Reorganización de rutas y landing pública

**Fecha:** 9 de septiembre de 2026  
**Estado:** `IMPLEMENTED / LOCAL-VERIFIED`

## 1. Objetivo

Separar claramente la experiencia del cliente del sistema interno. El dominio raíz presenta Lou Barbershop y conduce a la reserva; todo el trabajo autenticado vive bajo `/app`.

## 2. Rutas canónicas

### Clientes

| Ruta | Propósito | Autenticación |
|---|---|---|
| `/` | landing pública y catálogo activo | no |
| `/reservar` | crear una reserva | no |
| `/mi-cita#token` | consultar, reprogramar o cancelar una cita | enlace privado |

### Equipo

| Ruta | Propósito |
|---|---|
| `/app/login` | acceso del personal |
| `/app` | inicio interno |
| `/app/agenda` | agenda y Mi día |
| `/app/atenciones` | atención y cobro |
| `/app/comisiones` | comisiones y liquidaciones |
| `/app/reportes` | reportes y auditoría |
| `/app/inventario` | inventario, compras, gastos y caja |
| `/app/disponibilidad` | horarios y excepciones |
| `/app/configuracion` | configuración autorizada |

Las pantallas internas continúan protegidas por `SessionBoundary`; el servidor conserva la autorización real por rol y propiedad.

## 3. Compatibilidad

Las rutas anteriores redirigen con `replace` a la nueva dirección:

- `/book` → `/reservar`;
- `/book/manage#token` → `/mi-cita#token`, conservando el fragmento privado;
- `/login` → `/app/login`;
- las rutas internas antiguas (`/agenda`, `/operations`, `/commissions`, `/reports`, `/inventory`, `/scheduling`, `/configuration`) → su equivalente bajo `/app`.

Las nuevas confirmaciones y reprogramaciones ya generan `/mi-cita#token`. El token continúa en el fragmento y no viaja en la petición HTTP inicial.

## 4. Landing

La página utiliza el sistema visual aprobado y contiene:

- propuesta de valor y llamadas principales;
- acceso directo a reservar o gestionar una cita;
- catálogo activo servido por el backend, con precio y duración autoritativos;
- manejo explícito de carga y fallo del catálogo;
- explicación del proceso en tres pasos;
- diseño responsive sin datos de contacto, ubicación u horarios inventados.

## 5. Evidencia

- [Landing móvil 390 × 844](assets/design/lou-landing-mobile-v1.png)
- [Landing escritorio 1440 × 900](assets/design/lou-landing-desktop-v1.png)

Playwright verificó `/`, navegación a `/reservar`, `/app/login`, ausencia de overflow horizontal y migración de un enlace antiguo con conservación de `#token`. El catálogo de las capturas fue ficticio e interceptado sólo en memoria.

## 6. Pruebas

- `LandingPage.test.tsx`: acciones públicas y catálogo activo;
- `LegacyRedirect.test.tsx`: conservación del fragmento privado;
- Vitest: 16 archivos, 36 pruebas aprobadas;
- formato, ESLint, Oxlint, TypeScript y build PWA aprobados.

La aserción de integración del backend fue actualizada al nuevo `managementPath`. La suite .NET debe repetirse dentro de Docker antes de staging porque el SDK 10.0.400 no está expuesto en la sesión local de Codex.
