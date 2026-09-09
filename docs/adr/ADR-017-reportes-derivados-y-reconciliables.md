# ADR-017 — Reportes derivados, separados y reconciliables

**Estado:** Accepted  
**Fecha:** 9 de septiembre de 2026

## Contexto

La barbería necesita decidir con cifras útiles, pero ventas, cobros, costo asignado, compras, gastos y comisiones representan hechos distintos. Guardar totales duplicados introduciría divergencia y llamar «utilidad» a un cálculo incompleto crearía una falsa precisión contable.

## Decisión

Los reportes se calculan desde operaciones pagadas vigentes, pagos, costo histórico de cada detalle, entradas de comisión, liquidaciones pagadas, gastos y recepciones confirmadas. Application define fórmulas y permisos mediante `IReportingStore`; EF Core sólo adapta lecturas. Cada total económico devuelve o exporta sus fuentes. Los bordes usan `America/La_Paz` y los rangos se limitan a 367 días.

El resultado se denomina **operativo aproximado**. El flujo de caja se calcula aparte y se presenta total, CASH y QR. La compra de inventario afecta caja; el costo histórico vendido afecta resultado, nunca ambos dentro de la misma fórmula. La producción del dueño se incluye, pero no genera deuda de comisión.

## Consecuencias

- No se crean tablas de agregados ni cierres contables en Fase 10.
- Reversos desaparecen de operaciones vigentes y sus correcciones permanecen en el ledger.
- Los estados de comisión describen las entradas generadas dentro del rango según su estado actual.
- La ocupación usa minutos de citas completadas sobre horario configurado; las llegadas directas cuentan como producción pero no como minutos ocupados porque hoy no conservan duración.
- CSV se entrega con BOM UTF-8, autorización OWNER y neutralización de fórmulas.
