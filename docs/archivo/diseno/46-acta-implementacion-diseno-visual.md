# Acta de implementación del diseño visual de Lou Barbershop

**Fecha:** 9 de septiembre de 2026  
**Estado:** `IMPLEMENTED / VISUAL-REVIEW-READY`  
**Alcance:** presentación, navegación, PWA y organización visual; sin cambios de dominio, API ni persistencia.

## 1. Resultado

La propuesta visual aprobada quedó convertida en código reutilizable. La aplicación utiliza la identidad real de Lou Barbershop, una paleta monocromática con fondo blanco cálido, tipografía funcional autohospedada y una jerarquía común para pantallas públicas e internas.

El rediseño preserva la separación entre agenda, atención, cobro, comisión y liquidación. Ningún componente de presentación calcula precios, permisos, stock o importes autoritativos.

## 2. Entregables

- `BrandLockup` reutilizable con el logo real y variantes compacta/completa;
- iconografía SVG propia mediante `AppIcon`, sin dependencia de una librería visual externa;
- `AppSidebar` de escritorio, rail de tablet y `MobileTabBar` de cuatro tareas frecuentes;
- menú secundario por rol, sesión visible y cierre de sesión accesible;
- tokens CSS de color, espaciado, radios, sombras, estados y movimiento;
- Barlow Condensed e Inter autohospedadas y limitadas al subconjunto latino;
- login, reserva pública y dashboard adaptados a la identidad Lou;
- reportes separados en Operación, Caja, Comisiones, Equipo y Auditoría;
- inventario separado en Existencias, Compras, Gastos y Caja de hoy;
- iconos PWA regenerados y colores de manifiesto alineados a la marca;
- textos técnicos de fase eliminados de la interfaz.

## 3. Responsive y accesibilidad

| Rango | Navegación | Resultado verificado |
|---|---|---|
| 320–639 px | barra inferior: Inicio, Agenda, Atender, Más | sin desbordamiento a 320 px |
| 640–1023 px | rail lateral compacto | sin desbordamiento a 768 px |
| 1024 px o más | sidebar completa con usuario y destinos permitidos | jerarquía estable a 1440 px |

Se mantuvieron foco visible, áreas táctiles mínimas, etiquetas accesibles, estados por texto y soporte de `prefers-reduced-motion`. La selección activa no depende únicamente del color.

## 4. Evidencia visual

- [Login móvil](../../assets/design/lou-login-mobile-v1.png)
- [Reserva pública móvil](../../assets/design/lou-booking-mobile-v1.png)
- [Dashboard tablet](../../assets/design/lou-dashboard-tablet-v1.png)
- [Dashboard escritorio](../../assets/design/lou-dashboard-desktop-v1.png)
- [Landing pública móvil](../../assets/design/lou-landing-mobile-v1.png)
- [Landing pública escritorio](../../assets/design/lou-landing-desktop-v1.png)

Las respuestas de catálogo y sesión usadas para las capturas fueron ficticias, interceptadas sólo en el navegador de prueba y nunca persistidas.

## 5. Evidencia automática

- Prettier: conforme.
- ESLint + Oxlint: sin errores.
- Vitest: 14 archivos y 33 pruebas aprobadas.
- TypeScript estricto + Vite: build de producción aprobado.
- Storybook: build estático aprobado.
- PWA: manifiesto y service worker generados; 19 entradas precacheadas.
- Playwright: login, reserva y dashboard revisados en móvil, tablet y escritorio.

La suite .NET no se repitió porque esta sesión no expuso el SDK 10.0.400 y el cambio no toca backend, contratos ni datos. Sus resultados previos permanecen registrados en el acta de Fase 12; antes de staging se ejecutará nuevamente dentro del entorno reproducible de Docker.

## 6. Criterios de aceptación cubiertos

- Logo real en lugar de la `L` provisional: **cumplido**.
- Sin etiquetas `Fase N` visibles: **cumplido**.
- Cuatro tareas frecuentes a un toque en móvil: **cumplido**.
- Sin overflow horizontal a 320 px: **cumplido**.
- Reportes e inventario agrupados: **cumplido**.
- Identidad Lou reconocible y consistente: **cumplido técnicamente; listo para validación del dueño**.
- Aceptación humana completa y Lighthouse en entorno desplegado: **diferidos hasta staging**, junto con G11.

## 7. Riesgo residual y siguiente puerta

El ejecutable Docker no estuvo disponible en el `PATH` de la sesión de verificación, aunque el frontend pudo ejecutarse y probarse de forma aislada con Vite. Antes de staging debe reconstruirse la imagen web con `docker compose up --build`, repetir los flujos con API/PostgreSQL reales y completar la aceptación humana G11. Esto no bloquea la revisión visual local ni cambia el estado técnico de Fase 12.

La separación posterior entre experiencia pública e interna se documenta en [47-reorganizacion-rutas-y-landing.md](47-reorganizacion-rutas-y-landing.md).
