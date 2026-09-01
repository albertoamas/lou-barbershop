# Requisitos funcionales y casos de uso

## 1. Requisitos funcionales

### Configuración y personal

- **RF-001:** autenticar usuarios internos y cerrar sesiones.
- **RF-002:** administrar usuarios, roles y estado activo.
- **RF-003:** mantener perfil de barbero e indicar si es dueño o contratado.
- **RF-004:** mantener horarios semanales y excepciones de disponibilidad.
- **RF-005:** mantener condiciones de comisión con vigencia histórica.

### Catálogo

- **RF-010:** crear, editar, activar y desactivar servicios.
- **RF-011:** definir duración y precio de referencia del servicio.
- **RF-012:** definir oferta, precio y duración específicos por barbero.
- **RF-013:** crear, editar, activar y desactivar productos.
- **RF-014:** registrar precio de venta, marca y existencia mínima.

### Clientes y agenda

- **RF-020:** buscar o registrar cliente con nombre y teléfono.
- **RF-021:** calcular disponibilidad por servicio, barbero y rango de fecha.
- **RF-022:** crear una cita confirmada.
- **RF-023:** reprogramar, reasignar o cambiar servicio conservando auditoría.
- **RF-024:** cancelar o marcar inasistencia.
- **RF-025:** visualizar agenda diaria/semanal por barbero.
- **RF-026:** registrar llegada y comenzar atención.
- **RF-027:** permitir atención sin reserva.
- **RF-028:** permitir reserva pública sin cuenta mediante token seguro.

### Atención, venta y pago

- **RF-030:** crear atención desde cita o llegada directa.
- **RF-031:** registrar uno o más servicios realmente realizados.
- **RF-032:** registrar productos vendidos y validar existencias.
- **RF-033:** aplicar descuento o cortesía con permisos y motivo.
- **RF-034:** mostrar totales antes de cobrar.
- **RF-035:** registrar pago en efectivo, QR o mixto.
- **RF-036:** cerrar atómicamente operación, inventario y comisiones.
- **RF-037:** revertir una operación con autorización y auditoría.

### Inventario y gastos

- **RF-040:** registrar recepción pagada de productos y recalcular costo promedio.
- **RF-041:** registrar ajustes de inventario con motivo.
- **RF-042:** consultar existencia y movimientos.
- **RF-043:** advertir productos bajo existencia mínima.
- **RF-045:** registrar, consultar y anular gastos pagados.
- **RF-046:** mantener categorías de gasto.

### Comisiones y liquidaciones

- **RF-050:** calcular comisión por detalle usando la condición vigente.
- **RF-051:** consultar comisiones disponibles por barbero y período.
- **RF-052:** crear y revisar liquidación.
- **RF-053:** añadir ajustes autorizados.
- **RF-054:** cerrar y registrar pago de liquidación.
- **RF-055:** mostrar al barbero sus comisiones y liquidaciones.

### Reportes y auditoría

- **RF-060:** panel diario con citas, atenciones y cobros.
- **RF-061:** reporte por período de servicios, productos y medios de pago.
- **RF-062:** reporte de comisiones generadas, pendientes y pagadas.
- **RF-063:** reporte de gastos, flujo de caja y resultado operativo básico sin duplicar compra de inventario y costo de venta.
- **RF-064:** reporte de producción por barbero, incluido el dueño.
- **RF-065:** consultar bitácora de acciones sensibles.
- **RF-066:** exportar reportes tabulares a CSV.

## 2. Catálogo de casos de uso

| ID | Caso de uso | Actor principal | Resultado |
|---|---|---|---|
| CU-01 | Iniciar sesión | Personal | Acceso según rol |
| CU-02 | Configurar servicio y oferta | Dueño | Servicio reservable por barbero |
| CU-03 | Configurar horario/excepción | Dueño/Administración | Disponibilidad actualizada |
| CU-04 | Consultar disponibilidad | Administración/Cliente | Alternativas válidas |
| CU-05 | Crear reserva | Administración/Cliente | Cita confirmada |
| CU-06 | Reprogramar o reasignar | Administración/Dueño/Cliente limitado | Cita actualizada y auditada |
| CU-07 | Cancelar o marcar inasistencia | Administración/Dueño/Cliente limitado | Cita cerrada sin operación |
| CU-08 | Registrar llegada directa | Administración/Barbero | Atención sin reserva |
| CU-09 | Ejecutar y cerrar atención | Barbero/Administración/Dueño | Operación lista para cobro |
| CU-10 | Aplicar cortesía/descuento | Dueño/Administración | Total ajustado con motivo |
| CU-11 | Cobrar operación | Administración/Barbero/Dueño | Pago, inventario y comisión confirmados |
| CU-12 | Registrar entrada/ajuste de producto | Dueño/Administración | Existencia explicable |
| CU-13 | Registrar gasto | Dueño/Administración | Gasto incorporado a reportes |
| CU-14 | Liquidar comisiones | Dueño | Obligación pagada y trazable |
| CU-15 | Consultar agenda propia | Barbero | Jornada visible |
| CU-16 | Consultar comisión propia | Barbero | Detalle de lo generado/pagado |
| CU-17 | Revisar panel y reportes | Dueño | Información para decidir |
| CU-18 | Revertir operación | Dueño | Corrección auditada |

## 3. Casos de uso detallados

### CU-05 — Crear reserva

**Precondiciones:** servicio y barbero activos; oferta vigente; cliente identificable; horario dentro de disponibilidad.

**Flujo principal:**

1. Actor selecciona servicio.
2. Selecciona barbero concreto o “cualquiera”.
3. Indica fecha o rango.
4. El sistema calcula horarios disponibles.
5. Actor selecciona un horario.
6. Busca o registra nombre y teléfono del cliente.
7. El sistema vuelve a comprobar el intervalo dentro de una transacción.
8. Crea cita `CONFIRMED` con instantáneas de precio y duración.
9. Presenta confirmación y enlace de gestión si es reserva pública.

**Alternativas:** el horario fue tomado: se informa y se ofrecen alternativas; no existe cliente: se crea; barbero “cualquiera”: el sistema asigna uno antes de confirmar.

**Postcondiciones:** la cita ocupa el intervalo; no existe operación económica.

### CU-06 — Reprogramar o reasignar

**Precondiciones:** cita `CONFIRMED`; actor autorizado.

1. Se carga la cita y su versión.
2. Se solicitan nuevas condiciones.
3. Se calcula y selecciona disponibilidad.
4. Se verifica concurrencia.
5. Se actualizan barbero, servicio, precio/duración informados e intervalo.
6. Se registra evento con antes/después y actor.

Si el cliente usa token público, solo puede cambiar fecha/hora dentro de las reglas publicadas o cancelar; el cambio de precio/barbero se presenta claramente.

### CU-09 — Ejecutar y cerrar atención

**Precondiciones:** barbero autenticado; cita registrada o llegada directa.

1. Se crea atención `DRAFT` con el barbero efectivo.
2. Si proviene de una cita, se precarga el servicio reservado.
3. Se confirma, añade o elimina lo realmente realizado.
4. Se añaden productos vendidos.
5. Se aplican descuentos/cortesías autorizados.
6. Se valida total, existencias y tasas de comisión.
7. La operación pasa a `READY_TO_PAY`.

**Postcondición:** aún no se afectan comisiones ni inventario definitivo hasta completar CU-11.

### CU-11 — Cobrar operación

**Precondiciones:** operación `READY_TO_PAY`.

1. Se muestra total neto.
2. Se indican importes de efectivo y/o QR.
3. El sistema valida igualdad con el total.
4. En una sola transacción: marca `PAID`, guarda pagos, crea salidas de inventario, calcula comisiones y completa la cita asociada.
5. Se muestra comprobante interno/resumen.

Si total es cero, no pide medio de pago y ejecuta los demás efectos, incluida la comisión de servicio de cortesía cuando corresponda.

### CU-14 — Liquidar comisiones

**Precondiciones:** dueño autenticado; barbero contratado; comisiones `AVAILABLE`.

1. Dueño selecciona barbero y fecha de corte.
2. El sistema lista comisiones no liquidadas.
3. Dueño revisa operaciones y añade ajustes si hacen falta.
4. El sistema calcula total.
5. Dueño cierra la liquidación.
6. Registra pago completo, fecha y medio.
7. Comisiones pasan a `PAID` y la liquidación queda inmutable.

### CU-18 — Revertir operación

**Precondiciones:** dueño autenticado; operación `PAID`; motivo obligatorio.

1. El sistema muestra impactos originales.
2. Dueño confirma reverso.
3. Se repone inventario cuando corresponda.
4. Comisiones disponibles se anulan; si ya fueron liquidadas, se crea ajuste negativo futuro.
5. La operación queda `REVERSED` y la cita no cambia automáticamente.
6. Se registra auditoría completa.

## 4. Requisitos no funcionales

- **RNF-01 Usabilidad:** tareas frecuentes optimizadas para teléfono; controles táctiles y sin tablas horizontales críticas.
- **RNF-02 Rendimiento:** vistas operativas habituales responden en menos de 2 segundos en condiciones normales; consulta de disponibilidad en menos de 3 segundos.
- **RNF-03 Integridad:** cierres económicos usan transacciones de base de datos.
- **RNF-04 Concurrencia:** dos personas no pueden confirmar el mismo espacio ni vender la última unidad simultáneamente.
- **RNF-05 Disponibilidad:** objetivo inicial de 99,5 % mensual, excluyendo mantenimiento anunciado.
- **RNF-06 Respaldo:** copia automática diaria y restauración probada periódicamente.
- **RNF-07 Seguridad:** TLS, contraseñas robustamente derivadas, sesiones seguras y autorización del lado servidor.
- **RNF-08 Privacidad:** minimización de datos y acceso solo según responsabilidad.
- **RNF-09 Auditoría:** cambios sensibles conservan actor, fecha, acción y valores relevantes.
- **RNF-10 Accesibilidad:** objetivo WCAG 2.1 AA para flujos principales.
- **RNF-11 Mantenibilidad:** monolito modular con pruebas y migraciones versionadas.
- **RNF-12 Observabilidad:** errores con identificador de seguimiento, logs estructurados y alertas básicas.
- **RNF-13 Compatibilidad:** últimas dos versiones estables de navegadores móviles principales y tablet moderna.
- **RNF-14 PWA:** la interfaz debe ser instalable, tener manifest/service worker válidos y gestionar actualización de versión.
- **RNF-15 Offline seguro:** puede mostrar shell y lecturas recientes marcadas como desactualizadas; ninguna reserva, cobro, gasto, inventario, comisión o liquidación se confirma offline.
- **RNF-16 Independencia:** Domain y Application no pueden referenciar frameworks web, ORM, persistencia, UI ni observabilidad.
- **RNF-17 Arquitectura:** las restricciones de dependencia se verifican automáticamente en CI y se aplican principios SOLID.
- **RNF-18 Contenedores:** aplicación y dependencias deben arrancar de forma reproducible con Docker Compose; imágenes de runtime ejecutan sin privilegios.
