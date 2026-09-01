# Matriz de trazabilidad

Esta matriz conecta objetivos, requisitos, casos de uso, historias y pruebas. Evita construir funciones sin propósito o reglas sin verificación.

La asignación completa de requisitos e historias a fases, entregables y puertas de salida se encuentra en [17-plan-maestro-fases.md](17-plan-maestro-fases.md).

## 1. Trazabilidad principal

| Área | Reglas | Requisitos | Casos de uso | Historias | Pruebas clave |
|---|---|---|---|---|---|
| Acceso/roles | Matriz permisos | RF-001–005 | CU-01 | HU-001–002 | T-014 + seguridad |
| Catálogo/ofertas | RN-ATE-03, 07 | RF-010–014 | CU-02 | HU-003 | T-016 |
| Horarios/disponibilidad | RN-AGEN-01–06 | RF-004, 021 | CU-03–04 | HU-004, 011 | T-001–002 |
| Clientes/reserva | RN-AGEN-04–10 | RF-020–028 | CU-05–08 | HU-010–016, 020 | T-001–004 |
| Atención real | RN-ATE-01–10 | RF-030–034 | CU-09–10 | HU-020–023 | T-003–004, 007–008 |
| Pagos | RN-PAG-01–06 | RF-035–037 | CU-11, 18 | HU-024–025 | T-005–006, 012–015 |
| Inventario | RN-INV-01–07 | RF-032, 040–043 | CU-11–12, 18 | HU-022, 030–031 | T-009, 012–013 |
| Gastos | RN-GAS-01–04 | RF-045–046 | CU-13 | HU-032 | T-017 |
| Comisión | RN-COM-01–07 | RF-005, 050–051 | CU-11, 16 | HU-040–041 | T-007–010 |
| Liquidación | RN-COM-08–12 | RF-052–055 | CU-14 | HU-042–043 | T-011–013 |
| Reportes | RN-REP-01–03 | RF-060–066 | CU-17 | HU-050–053 | consultas/reconciliación |
| Auditoría | D-15, D-19 | RF-065 | transversal | transversal | seguridad e integridad |
| PWA/offline | ADR-007 | RNF-14–15 | transversal | HU-001, 015–016, 050 | instalación/offline/update |
| Clean Architecture/SOLID | ADR-008 | RNF-16–17 | transversal | transversal | pruebas de arquitectura |
| Docker | ADR-009 | RNF-18 | transversal | transversal | build/healthcheck/seguridad |

## 2. Decisiones con impacto transversal

| Decisión | Datos | Flujos | Pruebas |
|---|---|---|---|
| D-01 fuente de agenda | `appointments` | reserva/reprogramación | concurrencia y transición |
| D-04 un servicio por cita | `appointments.service_id` | reserva simple | servicio adicional en atención |
| D-05 instantáneas | campos quoted/item | reserva y atención | cambio de catálogo no altera pasado |
| D-09 base neta | `commission_base_cents` | cierre | descuentos/tasa histórica |
| D-10 cortesía remunerada | courtesy + base | cortesía | T-007 |
| D-12 dueño sin comisión | employment type | cierre | T-008 |
| D-13 pago completo | payments/total | cobro | T-005–006 |
| D-14 liquidación completa | settlement status | liquidar | T-011 |
| D-15 ajustes/reversos | source links/audit | reverso | T-012–013 |
| D-16 costo promedio | movements/cost | entrada/venta | T-009 + cálculo unitario |

## 3. Cobertura de objetivos

| Objetivo | Evidencia de cumplimiento |
|---|---|
| Toda atención queda registrada | HU-020–021; reportes de operaciones por origen |
| Cobro explicable | HU-024; pagos por método; T-005–006 |
| Comisión rastreable | HU-040–043; sale item → commission → settlement |
| Sin doble reserva | restricción + T-001 |
| Resultados automáticos | HU-050–052; conciliación de reportes |
| Operación rápida | pruebas UX de documento 10 |

## 4. Cambios controlados

Si una regla cambia:

1. actualizar decisión/regla;
2. identificar requisitos e historias en esta matriz;
3. revisar modelo/API y migración;
4. añadir o actualizar pruebas;
5. documentar efecto sobre operaciones históricas;
6. no reinterpretar datos pasados sin una migración de negocio explícita.

## 5. Preguntas deliberadamente cerradas por decisión

El análisis inicial contenía preguntas abiertas. Para comenzar se cerraron así:

- base de servicio: neto después de descuento;
- base de producto: neto de venta;
- cortesía de servicio contratado: comisión sobre referencia;
- dueño: producción sin comisión;
- pago: completo, efectivo/QR/mixto;
- liquidación: completa, quincenal o mensual;
- una cita: un servicio/persona;
- cliente: nombre y teléfono, sin cuenta;
- inventario: costo promedio, sin lotes;
- Calendar: la aplicación será fuente oficial;
- gastos: solo pagados;
- propinas, anticipos, crédito, reembolsos fiscales y proveedores completos: fuera del MVP.

Estas decisiones son revisables, pero ya no bloquean el desarrollo. Si el negocio las cambia, debe evaluarse su impacto con la matriz anterior.
