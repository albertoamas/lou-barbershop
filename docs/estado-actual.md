# Estado actual de Lou Barbershop

**Fecha de corte:** 6 de octubre de 2026  
**Estado local:** `FUNCIONAL Y VALIDADO`  
**Estado productivo:** `PENDIENTE DE DESPLIEGUE`

## Qué está terminado

- experiencia pública: landing, reserva y gestión privada de cita;
- acceso interno con dueño, administrador y barbero;
- cambio de contraseña y MFA TOTP con códigos de recuperación; exigencia configurable para dueño;
- panel por rol, agenda, atención, cobro, comisiones, inventario, gastos, disponibilidad, reportes y configuración;
- PWA responsive con estados offline y actualización controlada;
- rediseño visual completo de las 15 pantallas según el [plan de rediseño](diseno/plan-rediseno.md), cerrado el 6 de octubre de 2026;
- backend Clean Architecture, persistencia PostgreSQL y autorización por rol;
- Docker local reproducible, migraciones y procedimientos de backup/restauración.

## Validación vigente

| Control | Resultado |
|---|---|
| Backend | 105/105 pruebas (Domain 66, Application 9, Architecture 5, Integration 25) |
| Frontend | 228/228 pruebas, lint, formato, build y Storybook |
| Integración y seguridad | 25/25 con PostgreSQL real, incluida la migración repetida con el usuario `lou` |
| Migraciones | 17 aplicadas; el migrador puede repetirse (historial fijado en `public`) |
| Docker | DB, API y web saludables; migrador en código 0 |
| Restauración | backup restaurado con huella idéntica |
| Dependencias .NET | sin vulnerabilidades conocidas |
| Imágenes API/web | 0 críticas y 0 altas |
| Dependencias | NuGet sin vulnerabilidades conocidas; npm con una alerta alta en `source-map-js`, dependencia de las herramientas de build (Vite, Tailwind), que no llega al navegador; se corrige con `npm audit fix` |

## Qué puede probarse

- `/`: sitio público;
- `/reservar`: creación de una reserva sin cuenta;
- `/mi-cita#token`: consulta, reprogramación y cancelación mediante enlace privado;
- `/privacidad`: uso y protección de datos de la reserva;
- `/app/login`: acceso del equipo;
- `/app`: inicio según rol;
- `/app/agenda`, `/app/atenciones`, `/app/comisiones`, `/app/inventario`, `/app/disponibilidad`, `/app/reportes`, `/app/configuracion` y `/app/seguridad`.

Consulta [páginas, secciones y roles](diseno/paginas-y-roles.md) para el propósito de cada pantalla.

## Próximos pasos

1. fase 6 del rediseño: revisión global, pruebas E2E con Playwright, rendimiento y accesibilidad (plan, sección 14.3);
2. cargar datos reales de la barbería: servicios, precios, barberos, horarios y comisiones;
3. desplegar en un servidor (VPS recomendado: Compose y Caddy ya cubren HTTPS) con backups externos;
4. piloto de dos semanas en paralelo al sistema actual, conciliando la caja diaria.

## Mejoras detectadas que requieren backend

Surgieron en el rediseño y quedan fuera de su alcance (plan, sección 1):

- mostrar el teléfono del cliente en el detalle de la cita (la cita no lo incluye hoy);
- reprogramar arrastrando la cita en la línea de tiempo;
- mostrar la hora real de llegada del cliente ("llegó a las 15:24").
- apertura y cierre de caja con arqueo del efectivo;
- comprobante del cobro por WhatsApp o impreso;
- ver el total calculado por el servidor mientras se elige el consumo, antes de guardarlo.
- recordatorio automático por WhatsApp antes de la cita;
- ausencias que se repiten (por ejemplo, todos los lunes en la tarde);
- saludar por el nombre real en el inicio ("Buenas tardes, Lucía"): la sesión solo devuelve el usuario técnico;
- nombrar al barbero o al cliente en la pestaña Actividad de Reportes ("cerró la liquidación de Diego"): el registro solo guarda identificadores;
- distinguir servicios y productos dentro de una liquidación: el detalle no trae el tipo de cada comisión;
- verificar con datos reales que se pueda cargar un precio nuevo cuando el barbero ya tiene uno vigente para ese servicio.

## Datos pendientes de la barbería

Se completan sin tocar diseño, en `src/frontend/src/presentation/content/publicSite.ts` o en la configuración:

- dirección escrita del local (hoy la portada muestra "Lou Barbershop, Tarija" y "Cómo llegar");
- enlaces de redes y WhatsApp (`VITE_SOCIAL_*`); sin el de WhatsApp, la portada no muestra "Escribir por WhatsApp";
- fotos del local, trabajos y barberos en `public/media/` (mientras falten, la portada muestra marcos de marca listos para ellas);
- servicios destacados como "Recomendado" (`featuredServices`, hoy "Corte y barba" y "Corte clásico").

## Qué falta antes de producción

1. contratar el servidor y configurar dominio/HTTPS;
2. generar secretos productivos nuevos, `AllowedHosts` exacto y activar MFA obligatorio del dueño;
3. configurar proxy confiable y claves Data Protection cifradas/persistentes;
4. automatizar backups cifrados fuera del servicio;
5. configurar observabilidad y alertas sin PII;
6. repetir smoke, rollback y flujos críticos en staging;
7. probar la PWA en Android, iOS y tablet físicos;
8. ejecutar piloto con datos y responsables aprobados.

Los ocho puntos anteriores necesitan el entorno o una decisión real; no se resuelven inventando secretos, dominio o proveedores.

No hay datos productivos ni variables reales de producción en el repositorio. El `.env` local está ignorado y no debe reutilizarse fuera del equipo.

## Stack vigente

- .NET 10, ASP.NET Core Controllers, EF Core y Npgsql;
- PostgreSQL 18;
- React 19, TypeScript estricto, React Router, TanStack Query y Vite;
- Tailwind CSS 4, Motion y componentes propios;
- Workbox/PWA;
- Docker Compose y Caddy.

## Fuentes de verdad

- reglas: [producto/reglas-de-negocio.md](producto/reglas-de-negocio.md);
- arquitectura: [tecnica/arquitectura.md](tecnica/arquitectura.md) y [ADR](adr/README.md);
- API: [tecnica/api.md](tecnica/api.md);
- seguridad: [tecnica/seguridad-y-roles.md](tecnica/seguridad-y-roles.md);
- operación: [operacion/runbooks.md](operacion/runbooks.md);
- forma de trabajo: [convenciones.md](convenciones.md).
