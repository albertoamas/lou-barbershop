# Estrategia de pruebas

## 1. Objetivo

Proteger especialmente agenda, dinero, comisiones, inventario y permisos. La prueba no se mide por porcentaje aislado de cobertura, sino por invariantes y riesgos cubiertos.

## 2. Niveles

### Unitarias

- cálculo de precio efectivo y total;
- descuento/cortesía;
- comisión normal y de cortesía;
- redondeo en puntos base;
- disponibilidad e intersección de intervalos;
- transiciones de estado;
- costo promedio de inventario;
- separación entre compra de inventario, flujo de caja y costo de venta;
- normalización de teléfono y moneda.

### Arquitectura

- Domain no importa Application, Infrastructure, Api, EF Core ni ASP.NET Core;
- Application no importa Infrastructure, Api ni frameworks de delivery/persistencia;
- endpoints no acceden a `DbContext`;
- `core` del frontend no importa React, Workbox ni adaptadores HTTP;
- módulos no forman ciclos y solo usan dependencias permitidas.

### Integración con PostgreSQL real

- restricciones y migraciones;
- doble reserva concurrente;
- cierre de operación atómico;
- venta concurrente de última unidad;
- vigencias no solapadas;
- comisión no liquidada dos veces;
- reverso antes/después de liquidación;
- consultas de reportes.

No reemplazar estas pruebas con una base en memoria porque las garantías dependen de PostgreSQL.

### API/servicio

- validación de solicitudes;
- estados HTTP/códigos de dominio;
- idempotencia;
- autorización por rol y propiedad;
- no aceptar precio/tasa/totales manipulados.

### E2E de navegador

- reserva interna;
- reprogramación;
- llegada directa;
- atención con servicio adicional;
- venta de producto;
- cortesía;
- pago mixto;
- liquidación;
- reverso;
- reserva pública cuando se implemente.
- instalación PWA, arranque offline, lectura desactualizada y actualización del service worker.

### Exploratorias y usabilidad

- teléfono Android/iOS representativo y tablet;
- conexión lenta/intermitente;
- doble toque y retorno atrás;
- interrupción entre editar y pagar;
- texto largo, nombres repetidos, día lleno y agenda vacía.

## 3. Matriz de escenarios críticos

| ID | Escenario | Resultado esperado |
|---|---|---|
| T-001 | Dos usuarios reservan mismo barbero/hora | Solo uno confirma; otro recibe `SLOT_TAKEN` |
| T-002 | Cita cancelada | Libera intervalo; no crea atención/comisión |
| T-003 | Llegada directa | Operación `WALK_IN` sin cita ficticia |
| T-004 | Servicio reservado cambia al atender | Cobro/comisión usan detalle real |
| T-005 | Pago 30 Bs efectivo + 40 Bs QR | Total 70 Bs y dos componentes |
| T-006 | Componentes suman menos/más | No cierra; sin efectos parciales |
| T-007 | Cortesía del contratado | Cliente paga 0; comisión sobre referencia |
| T-008 | Servicio del dueño | Producción sí; comisión no |
| T-009 | Venta de última unidad concurrente | Una venta; otra `OUT_OF_STOCK` |
| T-010 | Cambio de tasa a mitad de período | Cada operación conserva su tasa vigente |
| T-011 | Liquidar dos veces misma comisión | Segunda selección rechazada |
| T-012 | Reverso antes de liquidar | Comisión se anula e inventario se repone |
| T-013 | Reverso después de pagar liquidación | Ajuste negativo futuro |
| T-014 | Barbero accede a operación ajena | `FORBIDDEN`, sin fuga de datos |
| T-015 | Repetir cobro por mala conexión | Misma respuesta, un solo cierre |
| T-016 | Desactivar servicio | No reservable; historial intacto |
| T-017 | Gasto anulado | Auditoría y exclusión/reverso coherente en reporte |
| T-018 | Restaurar backup | Base recuperable y consistente |

## 4. Datos de prueba

Conjunto mínimo:

- dueño/barbero con precio 70 Bs y sin comisión;
- contratado A con precio 50 Bs, 50 % servicio y 10 % producto;
- contratado B con otra tasa y horario;
- servicio de 30 min y otro de 60 min;
- producto con cinco unidades y costo/venta distintos;
- cliente duplicado por nombre y teléfonos compartidos;
- citas adyacentes, cancelada e inasistencia;
- operación normal, mixta y cortesía;
- liquidación cerrada/pagada.

Todos los datos son ficticios; los valores de ejemplo no se cargan como tarifas reales sin confirmación del dueño.

## 5. Pruebas de seguridad

- Matriz completa de permisos positivos y negativos.
- Acceso directo por ID a recursos ajenos.
- Manipulación de cuerpos JSON y parámetros.
- Sesión expirada/desactivada.
- CSRF, XSS en nombres/notas y consultas parametrizadas.
- Fuerza bruta/rate limit en login y reserva pública.
- Entropía, caducidad y no exposición del token público.
- Archivos CSV contra inyección de fórmulas si se exporta texto iniciado con `=`, `+`, `-` o `@`.

## 6. Rendimiento

Probar con volumen superior al esperado pero realista:

- 10 barberos, aunque hoy sean menos;
- 5 años de citas/operaciones;
- 100.000 operaciones y sus detalles;
- un mes completo de disponibilidad;
- reportes de un año.

Objetivos: agenda y panel < 2 s, disponibilidad < 3 s y reportes comunes < 5 s en staging representativo.

## 6.1 PWA y contenedores

- validación de manifest, iconos y service worker;
- ninguna mutación crítica se almacena en cola offline;
- cachés se invalidan al desplegar versión nueva;
- un cobro en curso no se interrumpe por activación de service worker;
- `docker compose up --build` parte de entorno limpio;
- healthchecks, parada ordenada, usuario no root y ausencia de secretos en capas;
- escaneo de imágenes y SBOM en CI.

## 7. Migraciones y recuperación

- Aplicar todas las migraciones desde base vacía.
- Actualizar copia representativa de versión anterior.
- Verificar índices/restricciones.
- Ensayar rollback de aplicación; los datos se recuperan mediante migración compensatoria o backup, no borrando producción.
- Restaurar una copia en entorno aislado y ejecutar consultas de integridad.

## 8. Pruebas de aceptación antes del piloto

Dueño, administración y un barbero completan los seis prototipos/escenarios del documento UX sin ayuda del desarrollador. Se registran tiempo, errores y comentarios. No se libera si existe cualquier ruta capaz de cobrar sin generar inventario/comisión correspondiente o de duplicar una reserva/liquidación.
