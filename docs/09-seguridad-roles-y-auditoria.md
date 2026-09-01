# Seguridad, roles y auditoría

## 1. Modelo de acceso

Se usa control por roles en el servidor y reglas de propiedad. Una misma cuenta puede tener varios roles; el dueño tendrá `OWNER` y `BARBER`. La interfaz puede ocultar acciones, pero la seguridad real siempre se aplica en backend.

## 2. Matriz de permisos

| Acción | Dueño | Administración | Barbero |
|---|:---:|:---:|:---:|
| Ver agenda completa | Sí | Sí | No |
| Ver agenda propia | Sí | Sí | Sí |
| Crear cita | Sí | Sí | Sí, propia si se habilita |
| Reprogramar/cancelar cita | Sí | Sí | No |
| Informar indisponibilidad | Sí | Sí | Sí, sin cancelar citas |
| Configurar horarios | Sí | Sí | No |
| Configurar servicios/precios | Sí | No | No |
| Configurar productos | Sí | Sí | No |
| Abrir atención propia | Sí | Sí | Sí |
| Modificar atención ajena | Sí | Sí | No |
| Cobrar operación | Sí | Sí | Sí, propia |
| Aplicar descuento | Sí | Sí | No |
| Aplicar cortesía | Sí | Sí con autorización operativa | No |
| Revertir operación pagada | Sí | No | No |
| Registrar entrada/ajuste de inventario | Sí | Sí | No |
| Registrar gasto | Sí | Sí | No |
| Ver gastos | Sí | Sí | No |
| Configurar comisiones | Sí | No | No |
| Ver comisión propia | Sí | No aplica | Sí |
| Ver comisión de otros | Sí | No | No |
| Crear/pagar liquidación | Sí | No | No |
| Ver reportes globales | Sí | Panel operativo limitado | No |
| Ver auditoría | Sí | No | No |
| Gestionar usuarios y roles | Sí | No | No |

La posibilidad de que un barbero cree citas propias puede activarse después de observar la operación; no es necesaria para el primer corte interno.

## 3. Autenticación

- Usuario/contraseña para personal interno.
- Contraseñas derivadas con algoritmo resistente y parámetros recomendados por la biblioteca vigente.
- Cookie de sesión `HttpOnly`, `Secure`, `SameSite=Lax` o más estricta según flujo.
- Rotación de sesión al iniciar y al cambiar privilegios.
- Cierre de todas las sesiones al desactivar usuario o cambiar contraseña por seguridad.
- Bloqueo progresivo o limitación por intentos; no revelar si existe la cuenta.
- Recuperación inicialmente administrada por el dueño; correo automatizado solo si se configura un canal fiable.
- Autenticación multifactor recomendada para el dueño cuando el producto esté estable.

## 4. Autorización

Cada caso de aplicación recibe `actor` y verifica:

1. usuario activo;
2. rol requerido;
3. propiedad cuando el barbero actúa sobre agenda/operación propia;
4. estado del recurso;
5. reglas de negocio específicas.

No se confía en `barberId`, precios, tasas, totales ni permisos enviados por el navegador.

## 5. Reserva pública

- Token aleatorio de al menos 128 bits de entropía.
- Solo se almacena el hash del token.
- Caduca después de un período corto posterior a la cita.
- Permite consultar/cambiar únicamente esa cita.
- Se rota después de una acción sensible si es conveniente.
- Los logs nunca registran el token completo.
- Limitación de solicitudes y protección contra automatización basada en evidencia de abuso.

## 6. Protección de datos

- Recoger solo nombre, teléfono y notas necesarias.
- Evitar documentos de identidad, fecha de nacimiento, fotografías o datos médicos.
- Ocultar teléfono completo en vistas donde no sea necesario.
- No incluir datos del cliente en logs de aplicación.
- Exportaciones solo para dueño y con trazabilidad.
- Definir antes de producción política de conservación y respuesta ante solicitud de corrección/eliminación, preservando obligaciones económicas anonimizables.
- Mantener secretos en gestor de variables/secretos, nunca en repositorio.

## 7. Auditoría

### Acciones obligatorias

- cambios de roles/usuarios;
- cambio de precio, oferta o comisión;
- reprogramación, reasignación, cancelación e inasistencia;
- descuentos y cortesías;
- cierre y reverso de operación;
- entrada/ajuste de inventario;
- creación/anulación de gasto;
- creación, ajuste, cierre y pago de liquidación;
- exportación de información.

### Contenido

Actor, fecha, acción, entidad, identificador, valores relevantes antes/después, motivo y `request_id`. La auditoría es de solo adición para usuarios normales. Retención mínima propuesta: mientras exista historial económico asociado; la política exacta se fija antes de producción.

## 8. Amenazas principales y controles

| Riesgo | Control principal |
|---|---|
| Barbero ve datos de otro | Filtro/permiso de servidor y pruebas de autorización |
| Doble reserva | Restricción transaccional y revalidación |
| Doble cobro por reintento | Clave de idempotencia y estado bloqueado |
| Manipulación de precio/tasa | Cálculo exclusivo del servidor |
| Robo de enlace público | Token fuerte, hash, caducidad y no exposición en logs |
| Alteración silenciosa de dinero | Auditoría, estados inmutables y reversos |
| Inyección | ORM parametrizado/consultas preparadas y validación |
| XSS/CSRF | Escape por defecto, CSP, cookies seguras y token/origen |
| Pérdida de base | Copias automáticas y restauración probada |
| Fuga en exportaciones/logs | permisos, minimización y revisión de contenido |

## 9. Lista previa a producción

- Revisar permisos ruta por ruta.
- Ejecutar pruebas de acceso cruzado entre barberos.
- Rotar secretos y deshabilitar datos de demostración.
- Confirmar HTTPS y cabeceras de seguridad.
- Configurar backups, alertas y restauración.
- Verificar que logs no contengan contraseñas, tokens o teléfonos completos.
- Crear usuario dueño mediante procedimiento seguro.
- Documentar revocación de acceso cuando alguien deja de trabajar.

