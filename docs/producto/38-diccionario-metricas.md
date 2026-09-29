# Diccionario de métricas — Fase 10

Todos los importes se calculan en centavos enteros y se presentan en BOB. El rango es inclusivo por fecha local de `America/La_Paz`; técnicamente se consulta desde 00:00 del primer día hasta 00:00 exclusivo del día posterior al final.

| Métrica | Fórmula / fuente | Qué no significa |
|---|---|---|
| Cargos operativos | total final de operaciones `PAID` no revertidas | no equivale al medio de cobro |
| Servicios/productos | total final distribuido proporcionalmente entre importes brutos de detalles; el último componente absorbe el centavo residual | no reinterpreta precios históricos |
| Ticket promedio | cargos operativos / cantidad de operaciones pagadas | no promedio por detalle |
| Cobrado CASH/QR | componentes de pago de operaciones pagadas vigentes | no incluye deuda de comisión |
| COGS de productos | costo unitario histórico × cantidad vendida | no es compra de inventario |
| Comisión generada | suma firmada de entradas no anuladas ganadas en el período, incluidas correcciones negativas | no es comisión pagada |
| Disponible/liquidada/pagada | subconjuntos de esas entradas por estado actual | no es fotografía histórica al cierre del período |
| Pago de liquidaciones | `payable_total_cents` de liquidaciones cuya fecha de pago cae en el rango | no se resta otra vez del resultado |
| Gastos | gastos `RECORDED` del período | excluye anulados |
| Compra de inventario | recepciones `CONFIRMED` del período | afecta caja, no resultado del mismo día |
| Resultado operativo aproximado | cargos − COGS − comisión generada − gastos | no es utilidad neta/fiscal |
| Flujo de caja | cobros − compras de inventario − gastos − pagos de liquidación | no es resultado económico |
| Producción por barbero | cantidades y cargos de operaciones pagadas vigentes | dueño incluido sin comisión |
| Ocupación | minutos de citas completadas / minutos de horario disponible, máximo 100 % | llegadas directas no aportan minutos por falta de duración registrada |

Cada tarjeta enlaza su tabla fuente o dispone de CSV. La bitácora muestra actor, entidad, acción, instante y estados antes/después; sólo `OWNER` puede consultarla.
