# Acta de avance — rediseño Tailwind y movimiento

**Fecha:** 19 de septiembre de 2026  
**Estado:** `PLAN VISUAL 00–14 CERRADO`  
**Plan:** [48-plan-rediseño-tailwind-y-movimiento.md](../../diseno/48-plan-rediseño-tailwind-y-movimiento.md)

## Situación actual y próxima decisión

La fundación visual y la landing fueron aprobadas individualmente por el dueño el 10 de septiembre de 2026. La reserva pública fue aprobada el 11 de septiembre y la gestión pública de cita el 12 de septiembre, después de completar sus correcciones funcionales y visuales. Las demás pantallas mantienen implementación provisional hasta que sean presentadas en su checkpoint correspondiente.

El trabajo quedó ordenado por los checkpoints 00–14 definidos en el plan. El dueño aprobó el checkpoint `14 — Pulido final` el 19 de septiembre de 2026 al confirmar la conclusión de la parte visual. Con esta decisión todos los checkpoints están aprobados y la secuencia visual 00–14 queda formalmente cerrada.

### Cierre formal del checkpoint 14

El cierre comprende la auditoría responsive a 320, 390, 768 y 1440 px, navegación por teclado, foco al cambiar de ruta, nombres accesibles, respeto a movimiento reducido, menú móvil, axe-core, Storybook, división de pantallas y eliminación del CSS heredado de páginas. La validación integral posterior quedó registrada en [52-validacion-integral-seguridad-y-operacion-2026-09-19.md](../../operacion/52-validacion-integral-seguridad-y-operacion-2026-09-19.md).

**Decisión registrada:** `APROBADO` por el dueño el 19 de septiembre de 2026. Esta aprobación cierra el rediseño visual; no equivale a autorizar el despliegue productivo.

### Checkpoints aprobados

**`00 — Base visual y navegación`** fue marcado `APROBADO` por el dueño el 10 de septiembre de 2026 después de aplicar y presentar las cuatro correcciones solicitadas.

**`01 — Landing`** fue marcado `APROBADO` por el dueño el 10 de septiembre de 2026 después de completar las revisiones de contenido, tarjetas, ubicación, avisos PWA, CSP, precarga y movimiento.

**`02 — Reserva pública`** fue marcado `APROBADO` por el dueño el 11 de septiembre de 2026. La aprobación comprende el wizard de cinco pasos, las vistas móvil y escritorio, la disponibilidad compatible con la duración del servicio, el selector de fecha y período, el resumen con hora consistente, la animación `Mañana / Tarde` y la confirmación con saludo centrado.

**`03 — Gestión de cita`** fue marcado `APROBADO` el 12 de septiembre de 2026 cuando el dueño indicó continuar con la siguiente fase. La aprobación comprende el acceso mediante enlace/código privado, detalle, reprogramación, cancelación diferenciada y adaptación móvil/escritorio. Se dejó explícito que el enlace se presenta al confirmar la reserva y que su envío automático por WhatsApp, SMS o correo no forma parte del flujo actual.

**`04 — Acceso interno`** fue marcado `APROBADO` el 13 de septiembre de 2026 cuando el dueño indicó avanzar al checkpoint 05. La aprobación comprende el shell interno independiente, login responsive, visibilidad de contraseña, estados de error, sesión protegida y consola limpia antes de autenticar.

**`05 — Inicio por rol`** fue marcado `APROBADO` el 15 de septiembre de 2026 cuando el dueño indicó avanzar al siguiente checkpoint. La aprobación comprende los paneles diferenciados para dueño, administrador y barbero, sus fuentes de datos reales, accesos directos, estados de carga/error y adaptación responsive.

**`06 — Agenda y citas`** fue marcado `APROBADO` el 16 de septiembre de 2026 cuando el dueño indicó continuar con la siguiente fase. La aprobación comprende la agenda diaria y semanal, columnas por barbero, vista personal, creación, detalle, historial y reprogramación segura.

### Registro de aprobación del checkpoint 01

**`01 — Landing`** (`/`)

Revisión solicitada al dueño:

- navbar transparente sobre el hero y sólida al desplazarse;
- mensaje principal, composición del logo y llamadas a reservar o gestionar una cita;
- catálogo real con duración y precio, incluidos carga y error;
- secuencia `Elige`, `Reserva`, `Llega`;
- sección de ubicación con el Google Maps proporcionado por el dueño;
- llamada final `Tu próximo corte empieza aquí` y footer público aprobado;
- comportamiento y jerarquía en móvil y escritorio.

**Decisión registrada en ese momento:** `APROBADO`. Esta aprobación habilitó el checkpoint `02 — Reserva pública`, que posteriormente fue presentado, corregido y aprobado.

### Registro de aprobación del checkpoint 04

**`04 — Acceso interno`** (`/app/login`)

La revisión inicial detectó que el login estaba envuelto por el navbar y footer públicos, aunque el plan requiere una entrada interna breve y sin promoción. El shell ahora excluye correctamente todo el chrome público en las rutas `/app/*`; el login ocupa el viewport completo, mantiene la composición dividida en escritorio y se convierte en una sola columna con marca Lou en móvil.

El formulario incorpora usuario, contraseña, control gráfico y accesible para mostrar u ocultar la contraseña, estado `Verificando…` con indicador de actividad y errores estables. Las credenciales inválidas conservan una respuesta genérica, el límite de intentos tiene mensaje propio y los fallos de conexión ya no se presentan erróneamente como contraseña incorrecta. Las pantallas de sesión terminada y acceso restringido también fueron llevadas al sistema visual Tailwind.

Durante el QA se añadió inicialmente una consulta anónima a `/api/v1/auth/me` para evitar mostrar el formulario cuando ya existía sesión. El navegador registra correctamente el `401` anónimo como recurso fallido y React Query lo repetía al recuperar el foco; aunque no impedía ingresar, ensuciaba F12. Se retiró esa consulta anticipada. La validación de sesión permanece en el límite protegido `SessionBoundary`, después del login o al visitar una ruta interna, donde el `401` sí representa la redirección esperada.

La comprobación del 12 de septiembre de 2026 incluyó:

- acceso real con `owner.demo` y redirección al panel autorizado;
- retorno a la ruta interna originalmente solicitada cubierto por prueba de componente;
- mostrar/ocultar contraseña sin perder su valor;
- estado de rate limiting sin limpiar los campos;
- render responsive en 390 × 844 y escritorio;
- apertura y recuperación de foco en una pestaña nueva sin solicitudes a `/auth/me`, errores ni advertencias de consola;
- 21 archivos y 51 pruebas frontend aprobadas, lint sin advertencias y build PWA correcto;
- reconstrucción Docker y servicios `db`, `api` y `web` saludables.

**Decisión registrada:** `APROBADO` por el dueño el 13 de septiembre de 2026 al indicar avanzar al checkpoint 05.

### Registro del checkpoint 05

**`05 — Inicio por rol`** (`/app`)

El inicio genérico fue sustituido por tres paneles que respetan la función operativa y los permisos reales:

- dueño: ventas cobradas del día, efectivo, QR y comisión disponible pendiente como magnitudes separadas; próxima cita, alertas de inventario y accesos a reportes y liquidaciones;
- administrador: citas activas, próximas llegadas, atenciones iniciadas, operaciones listas para cobrar, stock bajo y acción primaria `Nueva cita`, que abre directamente el formulario de agenda;
- barbero: agenda propia, producción personal cobrada, operaciones propias completadas, comisión propia disponible y acceso principal a una llegada directa.

Las cifras provienen de reportes, agenda, operaciones, inventario y comisiones existentes. El backend mantiene el filtro de alcance: el barbero no recibe datos de otros barberos y el dueño con doble rol `OWNER + BARBER` conserva el panel de dueño. La deuda de comisión permanece explícitamente separada del efectivo y QR cobrados.

Los indicadores animan su conteo sólo al aparecer por primera vez y respetan `prefers-reduced-motion`. La pantalla incluye esqueletos de carga, aviso parcial recuperable cuando falla una fuente, próxima cita o estado vacío, conexión actual y navegación responsive persistente.

Evidencia técnica del 13 de septiembre de 2026:

- 23 archivos y 57 pruebas frontend aprobadas;
- pruebas puras de prioridad del doble rol, deuda de comisión y siguiente cita;
- pruebas de componente para dueño, administrador y barbero, incluidos destinos y fuentes de datos no autorizadas;
- lint sin advertencias y build PWA de producción correcto;
- verificación real del dueño con `owner.demo` en escritorio y viewport móvil 390 × 844;
- contraseñas de `admin.demo` y `barber.diego` restauradas al valor demo documentado; la comprobación manual posterior quedó temporalmente limitada por el rate limit acumulado del entorno local, no por el panel.

**Decisión registrada:** `APROBADO` por el dueño el 15 de septiembre de 2026 al indicar avanzar al siguiente checkpoint.

### Registro del checkpoint 06

**`06 — Agenda y citas`** (`/app/agenda`)

La agenda se reorganizó como una herramienta operativa para una sola sucursal. El encabezado fijo permite ir al día anterior, hoy o al día siguiente, elegir una fecha y alternar con movimiento entre la vista diaria y siete días. Dueño y administrador conservan la vista del equipo y el filtro de barbero; el barbero recibe exclusivamente su agenda personal y no ve controles que prometan acceso a compañeros.

En escritorio, la vista diaria distribuye las citas en columnas por barbero y muestra los espacios sin citas de forma explícita. En móvil y al filtrar un barbero se usa una lista temporal compacta. Cada tarjeta diferencia su estado mediante texto, color y una barra lateral; los solapamientos, si existiera información heredada inconsistente, se señalan además con borde discontinuo y texto. La reprogramación continúa siendo una acción deliberada: no se añadió arrastrar y soltar.

El editor de creación y reprogramación conserva el cálculo del backend y presenta los horarios reales en grupos `Mañana` y `Tarde`, mediante botones táctiles con hora, barbero, duración y precio informado. El detalle incorpora fecha completa, estado, acciones autorizadas y un historial legible que ya no expone UUID internos. El panel aparece como lateral en escritorio y como hoja inferior desplazable en móvil.

Evidencia técnica del 15 de septiembre de 2026:

- 24 archivos y 62 pruebas frontend aprobadas;
- pruebas nuevas de filtrado en hora de negocio, orden cronológico, detección de solapamientos, controles de administrador, alcance visual del barbero y navegación al día anterior;
- Prettier, ESLint, Oxlint, TypeScript estricto y build Vite/PWA aprobados;
- verificación real con `owner.demo` sobre datos locales, columnas para Diego y Mateo, cita de ejemplo y apertura del editor;
- comprobación responsive a 390 × 844, sin desbordamiento horizontal, errores ni advertencias de consola;
- servidor de desarrollo disponible en `http://127.0.0.1:4173`, usando la API local de `http://localhost:8088`.

**Decisión registrada:** `APROBADO` por el dueño el 16 de septiembre de 2026 al indicar avanzar con la fase siguiente.

### Checkpoint aprobado en esta iteración

**`07 — Atención y cobro`** (`/app/atenciones`)

La pantalla dejó de ser un formulario vertical único y ahora guía la operación mediante cinco etapas visibles: `Cliente`, `Consumo`, `Ajustes`, `Pago` y `Confirmación`. Una cita iniciada entra directamente en consumo; una llegada sin reserva comienza identificando o creando al cliente. El total, el estado, el cliente y el barbero permanecen visibles en un encabezado fijo mientras avanza el trabajo.

Dueño y administrador pueden escoger el barbero efectivo y aplicar descuento o cortesía con motivo. El barbero no ve un selector del equipo: una nueva consulta autenticada resuelve su perfil y fija la atención exclusivamente a ese identificador, mientras el backend conserva la autorización definitiva. Servicios y productos se guardan sólo cuando cambian, evitando escrituras y conflictos innecesarios.

El cobro ahora solicita importes en bolivianos, ofrece accesos `Todo efectivo` y `Todo QR`, admite una combinación manual y muestra en vivo si falta dinero, el monto coincide o existe exceso. El botón permanece bloqueado hasta que la suma coincide exactamente y conserva la clave idempotente durante el intento. La confirmación persiste el resumen de consumo y pagos. El reverso continúa fuera del flujo normal, exige motivo, conserva historial y sólo se muestra al dueño.

Evidencia técnica del 16 de septiembre de 2026:

- 25 archivos y 69 pruebas frontend aprobadas;
- pruebas de diferencia de pago, etapas persistidas, alcance visual de administrador/barbero, pago exacto, consumo sin reescritura y reverso exclusivo;
- ESLint, Oxlint, TypeScript estricto y build Vite/PWA aprobados;
- prueba real con `owner.demo` sobre una cita en atención y una operación borrador local;
- etapas de consumo y ajustes verificadas con catálogo, producto y total reales;
- escritorio y móvil 390 × 844 comprobados sin desbordamiento; consola sin errores ni advertencias después de la revisión final;
- contrato `GET /operations/own-barber` e integración PostgreSQL añadidos; la revalidación del 19 de septiembre reconstruyó la API con Docker y ejecutó correctamente las 19 pruebas de integración.

**Decisión registrada:** `APROBADO` por el dueño el 16 de septiembre de 2026 al indicar continuar con la fase siguiente.

### Checkpoint aprobado en esta iteración

**`08 — Comisiones`** (`/app/comisiones`)

La pantalla organiza la deuda de comisión en tres cifras que no se mezclan con caja: disponible para liquidar, incluida en borradores o cierres y pagada históricamente. El resumen usa una consulta sin filtro de estado para permanecer estable cuando el usuario filtra el libro; el selector de barbero sí redefine el alcance completo del resumen y del detalle para el dueño.

El libro presenta descripción, fecha, referencia abreviada de operación, base histórica, tasa, importe alineado y estado traducido. Las liquidaciones se muestran en una lista compacta; al abrir una se utiliza un panel lateral en escritorio y hoja inferior en móvil, con línea temporal `Borrador → Cerrada → Pagada`, operaciones incluidas, ajustes autorizados y conciliación del total.

El dueño dispone de un flujo explícito para crear el borrador, añadir ajustes en bolivianos con motivo, cerrar y registrar el pago completo. Cada paso explica su efecto y las mutaciones permanecen bloqueadas sin conexión. El barbero recibe el título `Mis comisiones`, no carga la configuración del equipo y nunca ve selector de compañeros ni controles de creación, ajuste, cierre o pago. El backend conserva el alcance definitivo por perfil y las políticas exclusivas del dueño.

Evidencia técnica del 16 de septiembre de 2026:

- 26 archivos y 75 pruebas frontend aprobadas;
- pruebas nuevas para saldos separados, traducción de estados, conversión firmada de bolivianos, alcance dueño/barbero, controles de pago y línea temporal;
- Prettier, ESLint, Oxlint, TypeScript estricto y build Vite/PWA aprobados;
- revisión real con `owner.demo` sobre la API local, dos barberos contratados y estados vacíos coherentes;
- panel de nueva liquidación verificado sin ejecutar la mutación; botón deshabilitado hasta elegir barbero;
- consola del navegador sin errores ni advertencias de aplicación.

**Decisión registrada:** `APROBADO` por el dueño el 17 de septiembre de 2026 al indicar continuar con la siguiente fase.

### Checkpoint aprobado en esta iteración

**`09 — Inventario y gastos`** (`/app/inventario`)

La pantalla se organiza en cuatro pestañas: `Existencias`, `Compras`, `Gastos` y `Caja de hoy`. Las alertas de stock se muestran antes de las pestañas. En escritorio las existencias forman una tabla compacta; en móvil se presentan como tarjetas. La búsqueda por nombre/SKU y el filtro de stock bajo acompañan el listado. En móvil las cuatro pestañas permanecen visibles en una cuadrícula de dos columnas, sin desplazamiento horizontal.

El historial de movimientos de cada producto se abre en un panel contextual y presenta entradas, ventas y correcciones como eventos; no permite borrar ni reescribir el pasado. Los ajustes usan cantidad firmada, tipo y motivo, con aviso antes de dejar el stock negativo. Las compras admiten varios productos, costos unitarios en bolivianos, total visible y medio de pago; una compra de reventa no vuelve a registrarse como gasto operativo. Los gastos pagados tienen panel propio con categoría, concepto, importe en bolivianos y medio; anular un gasto requiere motivo y conserva el registro original.

`Caja de hoy` separa efectivo y QR y muestra ventas cobradas, compras de reventa, gastos operativos y neto. Todas las mutaciones se bloquean sin conexión. El acceso directo del barbero a la ruta muestra `Acceso restringido` sin iniciar consultas de inventario/caja; las políticas del backend continúan siendo la autorización definitiva.

Evidencia técnica del 17 de septiembre de 2026:

- 27 archivos y 82 pruebas frontend aprobadas;
- pruebas nuevas de alertas, filtrado, historial, conversión de costos y gastos de bolivianos a centavos, ajuste sin stock negativo y denegación del barbero;
- Prettier, ESLint, Oxlint, TypeScript estricto y build Vite/PWA aprobados;
- revisión real con `owner.demo` y la API local: producto de prueba, compra histórica y movimiento de entrada visibles;
- escritorio y viewport móvil de 390 × 844 revisados; cuatro pestañas visibles y sin desbordamiento horizontal;
- consola del navegador sin errores ni advertencias;
- no se ejecutaron compras, ajustes, gastos ni anulaciones definitivas durante la revisión visual para preservar los datos de prueba.

**Decisión registrada:** `APROBADO` por el dueño el 17 de septiembre de 2026 al indicar avanzar con la siguiente pantalla.

### Checkpoint aprobado en esta iteración

**`10 — Disponibilidad`** (`/app/disponibilidad`)

La pantalla se organiza en `Semana`, `Buscar espacios` y `Excepciones`. La semana muestra siete días compactos, turnos vigentes y excepciones superpuestas en la fecha correspondiente. Un control permite avanzar o retroceder semanas sin perder el barbero seleccionado. Los turnos registrados conservan su vigencia y estado, incluidos los inactivos, fuera de una lista de siete formularios.

Dueño y administrador eligen barbero y abren un panel contextual para crear o editar turno. El panel valida que inicio y fin quepan por completo en la mañana o tarde de la sucursal y que la vigencia sea coherente; permite activar o desactivar sin borrar el registro. Otro panel registra ausencia/bloqueo u horario extraordinario con motivo y fechas; las excepciones próximas también tienen una lista explícita. Las citas afectadas se muestran como conflicto para revisión, pero no se cancelan automáticamente. La consulta de espacios mantiene servicio, rango y disponibilidad autoritativa del backend.

El barbero ve exclusivamente el horario asociado a su cuenta, sin selector de compañeros ni controles de edición. Además del límite visual, ambos `GET` privados de horarios y excepciones comprueban en el servidor que el identificador solicitado le pertenece; dueño y administrador mantienen lectura de todo el equipo. La matriz de permisos y el contrato API se alinearon con esta decisión del plan visual.

Evidencia técnica del 17 de septiembre de 2026:

- pruebas puras de vigencia semanal, inicio en lunes, zona horaria y excepciones que terminan a medianoche;
- pruebas de componente de semana, editor contextual, alcance del barbero y excepción visible en la semana y en su lista;
- prueba de integración añadida para lectura propia permitida y lectura ajena denegada en ambos endpoints;
- revisión real en escritorio y móvil 390 × 844 con `owner.demo`, sin desbordamiento horizontal ni errores de aplicación en consola;
- no se modificaron turnos ni excepciones reales durante la revisión visual; la prueba de backend requiere ejecutarse tras reconstruir la API, pues este host de herramientas no dispone del SDK .NET 10 ni del ejecutable Docker.

**Decisión registrada:** `APROBADO` por el dueño el 18 de septiembre de 2026 al indicar continuar con la siguiente pantalla.

### Checkpoint aprobado en esta iteración

**`11 — Reportes`** (`/app/reportes`)

Sólo el dueño accede a esta ruta. Un período global con campos `Desde` y `Hasta` se conserva en la URL junto con la pestaña activa, de modo que cambiar de vista o recargar no altera el contexto. El rango se limita a 367 días y cada consulta se realiza sólo al abrir la vista correspondiente. La carga presenta una estructura estable y los errores ofrecen reintento.

Las cinco vistas distinguen cifras que no deben confundirse:

- `Operación` muestra atenciones, ventas, cortesías y el origen de cada operación; las citas del último día del rango se etiquetan como una fotografía diaria, no como un total del período.
- `Caja` separa efectivo, QR, compras, gastos y pagos de liquidaciones, con sus respectivas fuentes.
- `Comisiones` diferencia importe generado, disponible, liquidado y pagado; el pago no se presenta como dinero cobrado por el servicio.
- `Equipo` muestra producción y ocupación por barbero, incluido el dueño cuando atiende, sin atribuirle deuda de comisión.
- `Auditoría` permite filtrar por tipo de entidad y paginar el historial.

Cada vista empieza con 2–4 métricas y continúa con el detalle necesario para reconciliarlas. No se añadieron gráficos sin una tendencia real. El CSV conserva las fechas seleccionadas y se ofrece sólo en las vistas con exportación existente: operaciones y producción del equipo. Las otras pestañas explican el límite para evitar una descarga que no represente sus datos.

Evidencia técnica del 18 de septiembre de 2026:

- pruebas de componentes para persistencia del período y la vista, descarga correcta, separación de fuentes de Caja, filtro de Auditoría y denegación a roles ajenos al dueño;
- prueba de las funciones de presentación de estados y medios de pago;
- revisión de Operación y Caja con datos locales del dueño, complementada por pruebas de Comisiones, Equipo, Auditoría, acceso y adaptación responsive; el dueño aprobó el checkpoint con esta evidencia;
- Prettier, ESLint, Oxlint, TypeScript estricto, build Vite/PWA y suite Vitest completa aprobados (29 archivos, 93 pruebas); `git diff --check` sin errores;
- no se modificó el backend ni el contrato de exportación: se reutilizaron las consultas y los dos CSV ya existentes.

**Decisión registrada:** `APROBADO` por el dueño el 18 de septiembre de 2026 al indicar avanzar a la siguiente fase del rediseño.

### Checkpoint aprobado en esta iteración

**`12 — Configuración`** (`/app/configuracion`)

La página exclusiva del dueño sustituyó cuatro bloques de formularios siempre visibles por navegación secundaria, lista a la izquierda y detalle a la derecha. En móvil la navegación se desplaza horizontalmente sin desbordar la página, y la lista y el detalle se apilan. La sección activa permanece en la URL. Un único panel contextual aloja cada creación o edición; activar/desactivar se ofrece por separado y requiere confirmación.

Se muestran `Equipo`, `Servicios`, `Ofertas`, `Productos`, `Comisiones` y `Usuarios` como requiere el plan. Se añadió `Gastos` a la navegación para conservar la administración de categorías que la pantalla anterior ya ofrecía. Equipo distingue persona/cuenta de perfil de barbero; el dueño barbero no recibe tasa de comisión. Servicios y productos permiten modificar sus referencias futuras, mientras ofertas y reglas de comisión conservan vigencias existentes: para cambiar una condición se desactiva y se crea otra. Los avisos explican que ninguna de estas acciones reescribe citas, operaciones ni importes históricos.

La sección Usuarios expone las capacidades ya disponibles en la API: crear cuenta con roles, activar/desactivar, cambiar roles y renovar contraseña. No se almacenan contraseñas en el estado de React ni se imprimen en la interfaz. La consulta de configuración se habilita sólo tras confirmar el rol `OWNER`; el servidor mantiene la autorización real. Las mutaciones exigen conexión, invalidan los datos afectados y muestran error o confirmación sin cerrar el panel ante un fallo.

Evidencia técnica del 18 de septiembre de 2026:

- pruebas de dueño/no dueño, persistencia de sección, lista/detalle, panel único, confirmación de desactivación, restricción de comisión para el dueño y alta de usuario;
- conversión pura de porcentaje a puntos base sin redondeo de coma flotante y validación de fechas de vigencia;
- revisión autenticada con datos locales en escritorio y móvil 390 × 844 de Equipo, Servicios, Ofertas, Comisiones y Usuarios, sin desbordamiento horizontal ni errores de consola;
- Prettier, ESLint, Oxlint, TypeScript estricto, build Vite/PWA y suite Vitest completa aprobados (30 archivos, 100 pruebas); `git diff --check` sin errores;
- no se ejecutaron altas, desactivaciones ni cambios de precios sobre datos reales durante la revisión visual;
- se reutilizaron los contratos de configuración/usuarios existentes; no se modificó el backend ni las reglas económicas.

**Decisión registrada:** `APROBADO` por el dueño el 18 de septiembre de 2026 al indicar continuar.

### Checkpoint aprobado en esta iteración

**`13 — Estados transversales`** (`/app/sesion-expirada`, `/app/acceso-denegado`, rutas inexistentes, error global y avisos PWA/conexión)

La sesión expirada ahora explica el motivo y ofrece volver a ingresar; conserva el destino interno, incluida su consulta y fragmento, y lo restaura al iniciar sesión. El destino se valida antes de navegar: no admite URLs externas, rutas públicas ni bucles entre login y estados de autenticación. Un fallo de red al verificar la sesión presenta reintento, sin afirmar erróneamente que la sesión caducó. El acceso restringido explica el límite de rol y ofrece regresar al inicio interno o al sitio público.

Las rutas inexistentes usan una tarjeta de estado compartida: la versión pública permanece en el shell público y la interna conserva el shell del equipo y sus enlaces operativos. El error inesperado ofrece recuperación y muestra un identificador de solicitud cuando está disponible. La notificación de actualización PWA puede aplicarse o posponerse durante la sesión de página; un error al actualizar deja visible el reintento. El aviso sin conexión identifica que el contenido visible puede estar desactualizado y recuerda que reservas, cobros y demás cambios requieren conectividad.

Evidencia técnica del 18 de septiembre de 2026:

- pruebas de retorno seguro al destino tras login, 403, 404, sesión expirada, error global, actualización pospuesta y aviso offline;
- revisión en navegador de acceso restringido, sesión expirada y 404 público/interno; versión móvil de 390 × 844 sin desbordamiento horizontal y consola sin errores ni advertencias;
- Prettier, ESLint, Oxlint, TypeScript estricto, build Vite/PWA y suite Vitest completa aprobados (34 archivos, 111 pruebas);
- no se modificaron reglas de dominio, autorización de backend, contratos API ni datos económicos.

**Decisión registrada:** `APROBADO` por el dueño al indicar avanzar a la siguiente fase.

### Checkpoint presentado actualmente

**`14 — Pulido final`** (todas las rutas públicas e internas)

La auditoría final eliminó la hoja de estilos heredada después de comprobar que sus clases ya no tenían consumidores. `index.css` pasó de 1.921 a 69 líneas y queda limitado a Tailwind, tokens Lou, base global, foco visible y movimiento reducido. El icono compartido migró su última regla global a Tailwind. La aplicación conserva división diferida por pantalla y el CSS de producción bajó de 95,73 kB a 67,78 kB.

El shell incorpora un enlace visible al foco para saltar directamente al contenido. Al navegar a otra ruta sin fragmento, restaura el foco en el contenido principal y lleva el scroll al inicio. El menú móvil `Más` se declara como diálogo modal, lleva el foco al control de cierre, lo retiene durante la navegación por teclado, responde a `Escape` y devuelve el foco al botón que lo abrió. El movimiento reducido desactiva también las transiciones nativas de vista.

Se añadió una base automática con axe-core para impedir violaciones serias o críticas en el shell público, los estados compartidos y la navegación interna. La guía [51-guia-componentes-accesibilidad-y-pulido.md](../../diseno/51-guia-componentes-accesibilidad-y-pulido.md) documenta componentes, responsive, foco, movimiento, presupuesto y la verificación obligatoria para cambios futuros.

Evidencia técnica del 19 de septiembre de 2026:

- 35 archivos y 115 pruebas Vitest aprobadas, incluidas restauración de foco, retención del menú móvil y axe-core;
- Prettier, ESLint, Oxlint, TypeScript estricto, build Vite/PWA y build de Storybook aprobados;
- landing, reserva, gestión de cita, login y 404 comprobados a 320, 390, 768 y 1440 px, con encabezado principal, sin controles sin nombre, imágenes sin alternativa ni desbordamiento horizontal;
- CSS de producción en 67,78 kB (11,84 kB gzip), entrada principal JavaScript en 358,03 kB (115,51 kB gzip) y precache PWA en 906,16 KiB;
- no se modificaron reglas de negocio, contratos API, persistencia ni autorización del servidor.

**Decisión registrada:** `APROBADO` por el dueño el 19 de septiembre de 2026. Esta decisión cierra el plan de rediseño; la salida productiva continúa siendo una actividad posterior y separada.

### Registro de aprobación del checkpoint 03

**`03 — Gestión de cita`** (`/mi-cita` y `/mi-cita#token`)

La revisión encontró que la ruta enlazada desde la navegación no constituía un flujo utilizable: sin un token de 43 caracteres en el fragmento de la URL mostraba directamente un error, sin explicar dónde obtenerlo ni permitir pegar el enlace privado recibido al reservar. Además, cambiar sólo el fragmento mientras la pantalla ya estaba montada podía conservar el token vacío hasta recargar la página.

La pantalla ahora ofrece un acceso público seguro y comprensible. Sin token explica que el enlace privado se entrega al confirmar una reserva, permite pegar el enlace completo o el código, valida el formato y mantiene la búsqueda separada de nombre o teléfono. Con un token vigente muestra estado, servicio, barbero, fecha y hora, permite abrir el editor de horario y conserva la cancelación como acción destructiva diferenciada.

La reprogramación inicia en la fecha de la cita actual, consulta disponibilidad real y reutiliza la división animada `Mañana / Tarde`. Los horarios se deduplican visualmente por hora cuando corresponde y se muestran completos sin producir una lista innecesariamente larga en móvil. Cambiar entre `/mi-cita` y `/mi-cita#token` reacciona inmediatamente al fragmento de React Router, sin recargar toda la aplicación.

La comprobación del 11 de septiembre de 2026 incluyó:

- acceso sin token y validación de enlace/código;
- lectura de una cita pública sintética mediante token vigente;
- detalle y acciones en escritorio y en un viewport móvil de 390 × 844;
- apertura del editor, búsqueda real, cambio animado entre mañana y tarde y selección de una nueva hora;
- navegación desde una cita abierta hacia `Mi cita` sin recarga ni estado obsoleto;
- suite frontend completa: 20 archivos y 47 pruebas aprobadas;
- lint y build de producción aprobados, seguido de reconstrucción del contenedor web.

No se ejecutó una reprogramación o cancelación definitiva durante la inspección visual para conservar la cita sintética disponible para la revisión del dueño. Ambos contratos API ya cuentan con cobertura de integración; las acciones destructivas permanecen sujetas a confirmación explícita en la interfaz.

**Decisión registrada:** `APROBADO` el 12 de septiembre de 2026 cuando el dueño indicó continuar con la siguiente fase. Esta decisión habilitó el checkpoint `04 — Acceso interno`, aprobado posteriormente.

### Checkpoint aprobado anteriormente

**`02 — Reserva pública`** (`/reservar`)

La pantalla se reorganizó como un wizard real de cinco decisiones: servicio, barbero, fecha y hora,
datos y confirmación. Cada paso reemplaza únicamente el contenido de trabajo con una transición
direccional; volver conserva las selecciones. En escritorio el resumen permanece lateral y en móvil
se presenta como un control desplegable inequívoco.

Durante la revisión se confirmó una inconsistencia previa del dominio: el motor generaba inicios cada 15 minutos y no intersectaba el turno del barbero con el horario de la sucursal. La corrección del 11 de septiembre establece 08:00–13:00 y 15:00–21:00, inicios cada 30 minutos y exige que la duración completa quepa en una ventana. El detalle y evidencia están en [50-correccion-horario-sucursal-y-cadencia.md](../../producto/50-correccion-horario-sucursal-y-cadencia.md).

En la siguiente revisión del mismo checkpoint, el dueño solicitó:

1. incluir `12:00` y `12:30` en el período `Mañana`, siempre que la duración elegida permita terminar a las 13:00;
2. conservar únicamente el selector de calendario y retirar los cinco días rápidos;
3. mostrar todas las horas del período sin el control `Ver N horarios más`;
4. inicialmente se interpretó que debía simplificarse el encabezado visual para subir el formulario;
5. sustituir el porcentaje móvil por `Paso N de 5` en la misma posición.

La implementación clasifica mañana como inicios anteriores a las 13:00 y tarde como inicios desde las 15:00, elimina estados y funciones ya innecesarios y evita repetir el número de paso dentro del panel. Tras dos aclaraciones del dueño, se revirtió por completo el bloque superior a su diseño previo: ceja `Reserva en línea`, título `Tu cita, paso a paso.`, párrafo explicativo, tamaños y espaciado originales. Esta reversión no afecta el nuevo progreso `Paso N de 5`. `12:30` se presenta para servicios de 30 minutos; un servicio de 45 minutos sigue terminando su mañana en `12:00` para no cruzar el cierre.

La revisión final del selector unifica la hora de las tarjetas y del resumen mediante el mismo formateador de 24 horas en `America/La_Paz`; por ejemplo, una tarjeta `16:00` se resume como `miércoles, 23 de septiembre, 16:00`. El selector `Mañana / Tarde` incorpora un indicador que se desliza con una transición suave y respeta la preferencia de movimiento reducido configurada globalmente.

En la confirmación, el saludo y el nombre del cliente se componen como dos segmentos alineados sobre un contenedor centrado. En escritorio permanecen en una misma línea cuando caben; si un nombre largo necesita envolver, la nueva línea también queda centrada. En móvil conservan el ajuste responsive sin desbordamiento. La corrección neutraliza de forma local la regla heredada global de `h1` (`margin: 0; max-width: 14ch`) que anulaba el centrado de las utilidades; no se modifica globalmente porque otras pantallas continúan bajo revisión progresiva.

El dueño solicitó cuatro correcciones durante la primera revisión del 11 de septiembre:

1. sustituir la línea de progreso horizontal que no se adaptaba bien al teléfono;
2. presentar la fecha como calendario y hacer más cómoda la elección de hora;
3. convertir `Ver resumen` en un control que se reconozca visualmente como botón;
4. evitar una lista excesivamente larga de horas en móvil.

La segunda presentación incorpora:

- progreso móvil con nombre del paso, porcentaje y cinco segmentos sin desplazamiento horizontal;
- campo de calendario acompañado por cinco fechas rápidas;
- periodos `Mañana` y `Tarde` con cantidad disponible;
- deduplicación visual por hora cuando el cliente acepta cualquier barbero;
- ocho horarios iniciales y expansión voluntaria mediante `Ver horarios más`;
- botón blanco `Ver resumen` con indicador de apertura dentro del resumen móvil.

**Decisión registrada:** `APROBADO` por el dueño el 11 de septiembre de 2026. Esta decisión habilitó el checkpoint `03 — Gestión de cita`, aprobado posteriormente tras completar su QA con un token vigente.

### Correcciones solicitadas para el checkpoint 01

El dueño solicitó el 10 de septiembre de 2026:

1. retirar del hero la repetición `Sin cuenta`, `Disponibilidad actualizada` y `Enlace privado`;
2. retirar de la composición de imagen los textos superpuestos `Lou Barbershop` y `Una sucursal`, porque ya forman parte del logo;
3. reemplazar las filas de servicios por un diseño de tarjetas nuevo;
4. eliminar la flecha de la acción principal y acompañar `Reserva tu cita` y `Gestionar mi cita` con iconos gráficos convencionales.

Las cuatro correcciones quedaron aplicadas. Los servicios ahora usan una cuadrícula responsive de tarjetas editoriales con identificador, icono de tijeras, descripción, duración y precio en zonas separadas. Las acciones del hero usan iconos SVG de calendario y reloj; no emplean emojis ni caracteres decorativos.

En una segunda revisión del checkpoint 01, el dueño solicitó:

1. igualar la separación entre icono y texto de las dos acciones del hero;
2. suavizar la elevación de tarjetas y botones, evitando que el borde se vuelva negro durante el hover;
3. eliminar el bloque `Reserva con claridad / Lo necesario. Nada escondido` y sustituirlo por la ubicación real de Lou Barbershop.

La revisión iguala ambos espacios con el mismo token, aumenta la transición a 300 ms con una elevación de un píxel en los botones y dos píxeles en las tarjetas, conserva el borde gris y reemplaza el bloque anterior por `Estamos ubicados aquí`, un mapa responsive y un enlace al Google Maps proporcionado por el dueño. La coordenada incrustada se obtuvo resolviendo ese mismo enlace público.

Durante la revisión manual se detectó que el aviso de actualización PWA se ubicaba detrás de la cabecera fija de la landing e impedía interactuar con la navegación. Los avisos públicos ahora comparten una región apilable posicionada exactamente debajo de los 73 px de cabecera y con una capa inferior al navbar; cuando no existe ningún aviso, esa región no ocupa espacio ni altera el hero.

La prueba en el contenedor de aceptación reveló dos diferencias respecto del servidor de desarrollo: Caddy bloqueaba el iframe por no declarar `frame-src`, y los `modulepreload` generados por Vite producían advertencias al cruzarse con recursos servidos por el service worker. La CSP permite ahora exclusivamente `https://www.google.com` como origen de marcos y conserva el resto de restricciones; Vite deja de emitir esos preloads y los módulos continúan cargándose mediante los imports del bundle.

Una revisión posterior identificó dos causas de la elevación tosca: Tailwind CSS 4 representa `translate`, `scale` y `rotate` como propiedades CSS individuales, mientras varios componentes sólo declaraban transición para `transform`; además, una regla global heredada y no estratificada sobrescribía las utilidades Tailwind con 180 ms. El cambio de posición ocurría por tanto de forma instantánea. Se retiró la regla global y se corrigieron botones compartidos, CTA del navbar, tarjetas de servicios, agenda, reserva, atención, comisiones, inicio, redes sociales y acción PWA para transicionar las propiedades reales durante 300 ms con `ease-lou`; la elevación queda limitada a 1 px en botones y 2 px en tarjetas.

### Segunda presentación del checkpoint 00

Cambios solicitados por el dueño el 10 de septiembre de 2026 y aplicados:

1. el shell público cambió a una columna flexible con `min-height: 100dvh`; el contenido ocupa el espacio restante y el footer termina el documento sin dejar una franja ajena debajo;
2. el footer muestra iconos reconocibles de Facebook, WhatsApp, Instagram y TikTok obtenidos de Simple Icons; hasta recibir las cuentas oficiales se identifican como pendientes y no enlazan a perfiles inventados;
3. las rutas internas ahora comparten un único `SessionBoundary` y una navegación persistente; al cambiar entre Agenda y Atención sólo se reemplaza/anima el contenido central;
4. las flechas y el cierre decorativos de texto fueron sustituidos por iconos SVG convencionales, y los cambios históricos se describen con palabras.

Además, las pantallas se cargan por ruta mediante `React.lazy`, reduciendo el paquete inicial y evitando descargar módulos administrativos que todavía no se visitaron.

**Estado de esta iteración:** aprobada por el dueño.

### Implementación del checkpoint 01

- cabecera fija transparente sobre el hero que adquiere fondo, borde y sombra después de desplazar la página;
- accesos de escritorio a `Servicios` y `Cómo funciona` con desplazamiento suave y respeto a `prefers-reduced-motion`;
- hero de altura completa con identidad Lou y dos acciones públicas inequívocas;
- catálogo servido por la API, limitado a servicios activos y con estados de carga y error;
- proceso corregido a `Elige`, `Reserva`, `Llega`;
- ubicación real en un mapa responsive de Google Maps y acceso externo al enlace aprobado;
- llamada final corregida a `Tu próximo corte empieza aquí`.

## Matriz resumida de aceptación

| Checkpoint | Implementación | Aprobación humana |
|---|---|---|
| 00 Base visual y navegación | terminada | `APROBADO` |
| 01 Landing | terminada | `APROBADO` |
| 02 Reserva pública | terminada y corregida | `APROBADO` |
| 03 Mi cita | terminada y verificada con token vigente | `APROBADO` |
| 04 Login | terminada, corregida y verificada con acceso real | `APROBADO` |
| 05 Inicio por rol | terminada, conectada a datos reales y verificada por rol | `APROBADO` |
| 06 Agenda y citas | terminada y presentada con datos reales | `APROBADO` |
| 07 Atención y cobro | terminada y presentada con datos reales | `APROBADO` |
| 08 Comisiones | terminada, verificada y presentada | `APROBADO` |
| 09 Inventario y gastos | terminada, verificada y presentada | `APROBADO` |
| 10 Disponibilidad | terminada y presentada | `APROBADO` |
| 11 Reportes | terminada y presentada | `APROBADO` |
| 12 Configuración | terminada y presentada | `APROBADO` |
| 13 Estados transversales | terminada y presentada | `APROBADO` |
| 14 Pulido final | terminado, validado y documentado | `APROBADO` |

## Resultado de la primera entrega

- Tailwind CSS 4.3.3 integrado mediante `@tailwindcss/vite`;
- tema Lou definido con colores, fuentes, sombras y curva de movimiento;
- helper de clases y variantes tipadas para componentes;
- Motion for React con preferencia de movimiento reducido y carga diferida;
- transiciones de ruta y navegación con React Router View Transitions;
- shell público con cabecera, navegación y footer nuevos;
- navegación interna responsive y adaptada a dueño, administrador y barbero;
- indicador activo animado y menú móvil como bottom sheet;
- landing, login, dashboard y reserva pública migrados a Tailwind;
- gestión pública de cita migrada, incluida confirmación destructiva propia;
- agenda interna migrada con filtros responsive, estados y panel de detalle adaptable;
- editor de citas, selector/alta de clientes y detalle/historial migrados al sistema Tailwind;
- navegación desde una cita en servicio corregida hacia la ruta canónica `/app/atenciones`, sin recarga completa;
- atención y cobro migrados de punta a punta: llegada directa, servicios, productos, ajustes, pago y resumen diario;
- reverso económico con formulario accesible propio, motivo obligatorio y explicación del historial, sin `window.prompt`;
- comisiones y liquidaciones migradas, con jerarquía distinta para deuda, borrador, cierre, pago y comprobante inmutable;
- estilos reutilizables para campos, etiquetas, paneles y estados de formulario;
- estados de conexión, actualización PWA, carga, error y selección ajustados;
- proxy de desarrollo configurable mediante `VITE_API_PROXY_TARGET` para validar contra un runtime local real.

El cambio permanece limitado a presentación y composición. No modifica reglas de dominio, contratos API, persistencia, cálculos económicos ni autorización del servidor.

## Evidencia visual

- [Landing móvil](../../assets/design/lou-tailwind-landing-mobile.png)
- [Landing escritorio](../../assets/design/lou-tailwind-landing-desktop.png)
- [Login escritorio](../../assets/design/lou-tailwind-login-desktop.png)
- [Dashboard administrador escritorio](../../assets/design/lou-tailwind-admin-dashboard-desktop.png)
- [Reserva pública móvil](../../assets/design/lou-tailwind-booking-mobile.png)
- [Agenda interna móvil](../../assets/design/lou-tailwind-agenda-mobile.png)
- [Editor de cita móvil](../../assets/design/lou-tailwind-appointment-editor-mobile.png)
- [Atención y cobro móvil](../../assets/design/lou-tailwind-operations-mobile.png)
- [Atención y cobro escritorio](../../assets/design/lou-tailwind-operations-desktop.png)
- [Estado de enlace privado inválido](../../assets/design/lou-tailwind-manage-invalid-mobile.png)
- [Footer corregido e iconos sociales](../../assets/design/lou-checkpoint-00-footer-desktop.png)
- [Checkpoint 01 — hero de landing en escritorio](../../assets/design/lou-checkpoint-01-landing-desktop.png)
- [Checkpoint 01 — servicios en escritorio](../../assets/design/lou-checkpoint-01-services-desktop.png)
- [Checkpoint 01 — hero de landing en móvil](../../assets/design/lou-checkpoint-01-landing-mobile.png)
- [Checkpoint 01 — servicios rediseñados en móvil](../../assets/design/lou-checkpoint-01-services-mobile.png)
- [Checkpoint 01 — proceso de reserva en móvil](../../assets/design/lou-checkpoint-01-process-mobile.png)
- [Checkpoint 01 — ubicación en escritorio](../../assets/design/lou-checkpoint-01-location-desktop.png)
- [Checkpoint 01 — ubicación en móvil](../../assets/design/lou-checkpoint-01-location-mobile.png)
- [Checkpoint 02 — reserva en móvil](../../assets/design/lou-checkpoint-02-booking-mobile.png)
- [Checkpoint 02 — fecha y horarios en móvil](../../assets/design/lou-checkpoint-02-booking-schedule-mobile.png)
- [Checkpoint 02 — reserva en escritorio](../../assets/design/lou-checkpoint-02-booking-desktop.png)

Las capturas anteriores usan fixtures locales. Las tres capturas nuevas de editor y atención usan respuestas ficticias aisladas mediante Playwright porque el runtime activo no conservaba los usuarios sembrados; no modifican la base ni contienen datos reales.

## Evidencia automática

- Prettier: conforme;
- ESLint y Oxlint: sin hallazgos;
- Vitest: 18 archivos y 39 pruebas aprobadas;
- TypeScript estricto: aprobado;
- Vite/PWA: build aprobado, 47 entradas precacheadas por la división de pantallas;
- paquete inicial: 354,01 kB minificado; cada pantalla se entrega en un chunk diferido y Motion queda separado en 37,25 kB;
- Playwright: landing 390 × 844 y 1440 × 900, login 1440 × 900, dashboard admin 1440 × 900 y reserva 390 × 844;
- Playwright: agenda y estado inválido de `Mi cita` verificados a 390 × 844;
- Playwright: editor de cita a 390 × 844 y atención/cobro a 390 × 844 y 1440 × 900;
- consola del editor y de atención/cobro validada sin errores ni advertencias después de cargar los fixtures completos.
- Playwright: footer verificado en el final de `/reservar`, con cuatro redes y sin espacio residual bajo el footer;
- Playwright: el mismo nodo DOM del sidebar permaneció montado al navegar `Inicio → Agenda → Atención y cobro`; consola final sin errores ni advertencias con fixtures aislados completos.
- Checkpoint 01: Prettier, ESLint, Oxlint, TypeScript estricto y build Vite/PWA aprobados; 19 archivos y 41 pruebas Vitest aprobadas.
- Checkpoint 01: Playwright verificó la landing a 1440 × 900 y 390 × 844 con catálogo ficticio aislado; los accesos internos desplazan a la sección correcta, la cabecera pasa de `transparent` a `solid`, el ancho de contenido móvil coincide con el viewport y la consola termina con cero errores y cero advertencias.
- Revisión del checkpoint 01: las cuatro correcciones solicitadas se verificaron nuevamente a 1440 × 900 y 390 × 844; las tarjetas forman tres columnas en escritorio y una columna en móvil, sin desbordamiento horizontal, errores ni advertencias de consola.
- Segunda revisión del checkpoint 01: Playwright confirmó una transición de hover de 300 ms sin cambio del borde gris, iframe cargado desde Google Maps con la coordenada del enlace aprobado, adaptación a 1440 × 900 y 390 × 844, ancho móvil sin overflow y consola con cero errores y cero advertencias.
- Corrección del aviso PWA: fixture de actualización visible a 390 × 844 confirmó cabecera en `y=0..73`, aviso desde `y=73`, capas `40/30`, navegación `Reservar` interactuable y consola con cero errores y cero advertencias.
- Corrección CSP/preload validada en el contenedor principal de `localhost:8088`: `frame-src https://www.google.com`, mapa visible y cargado, cero elementos `modulepreload`, cero errores y cero advertencias de consola.
- Corrección de movimiento medida en Chromium: tarjeta `0 → -1,69 → -2 px` y botón `0 → -0,88 → -1 px` durante 300 ms; ambos declaran `translate` en `transition-property` y la consola termina sin errores ni advertencias.
- Checkpoint 02: seed local ejecutado dos veces consecutivas sin duplicados; se verificaron 5 servicios públicos, 2 barberos ficticios y 64 huecos antes de crear la cita de prueba.
- Checkpoint 02: reserva real ficticia completada de punta a punta en `localhost:8088`, incluido enlace privado de gestión; consola con cero errores y cero advertencias.
- Checkpoint 02: Playwright verificó progreso, resumen, calendario, periodos y límite inicial de horarios a 390 × 844; `scrollWidth` coincide con el viewport a 320 y 1440 px.
- Checkpoint 02: Prettier, ESLint, Oxlint, TypeScript, build PWA y 19 archivos con 42 pruebas Vitest aprobados.
- Corrección de disponibilidad: 66 pruebas Domain, 9 Application y 5 de arquitectura aprobadas; build de API/web y smoke test del Compose de aceptación aprobados.
- La API de aceptación devolvió 24 alternativas para dos barberos en marcas `:00`/`:30`, sin cruce del cierre, y rechazó `12:00–16:00` con `schedule.outside_shop_hours`.
- Tercera revisión del checkpoint 02: Playwright validó a 390 × 844 y 1440 × 900 un único calendario, ausencia de días rápidos y de `Ver N horarios más`, progreso `Paso 3 de 5`, lista completa y `12:30` dentro de `Mañana` para `Barba demo` de 30 minutos. En móvil `scrollWidth` fue igual a 390 px y la consola terminó con cero errores y cero advertencias.
- Checkpoint 08: Prettier, ESLint, Oxlint, TypeScript estricto, build PWA y 26 archivos con 75 pruebas Vitest aprobados; revisión local del alcance de dueño y panel de creación sin errores de consola.
- Checkpoint 09: Prettier, ESLint, Oxlint, TypeScript estricto, build PWA y 27 archivos con 82 pruebas Vitest aprobados; revisión local de stock, compra histórica, movimientos y cuatro pestañas responsive sin errores de consola.
- Checkpoint 10: Prettier, ESLint, Oxlint, TypeScript estricto, build PWA y 28 archivos con 88 pruebas Vitest aprobados; revisión local de semana, editor, fechas, responsive y ausencia de desbordamiento móvil. La autorización de API fue ejecutada dentro de las 19 pruebas de integración de la revalidación final.
- Checkpoint 11: Prettier, ESLint, Oxlint, TypeScript estricto, build Vite/PWA y 29 archivos con 93 pruebas Vitest aprobados; pruebas de persistencia, exportación, separación contable, acceso exclusivo del dueño y responsive.
- Checkpoint 12: Prettier, ESLint, Oxlint, TypeScript estricto, build Vite/PWA y 30 archivos con 100 pruebas Vitest aprobados; lista/detalle, panel único, usuarios y vigencias económicas cubiertos por pruebas. La revisión visual autenticada de escritorio/móvil terminó sin errores de consola ni desbordamiento horizontal.
- Checkpoint 13: Prettier, ESLint, Oxlint, TypeScript estricto, build Vite/PWA y 34 archivos con 111 pruebas Vitest aprobados; estados público/interno y retorno al destino cubiertos por pruebas, revisión móvil de 390 × 844 sin desbordamiento ni errores de consola.
- Checkpoint 14: Prettier, ESLint, Oxlint, TypeScript estricto, build Vite/PWA, Storybook y 35 archivos con 115 pruebas Vitest aprobados; axe-core, teclado, foco, cuatro anchos responsive y eliminación del CSS heredado verificados.

El único `401` observado correspondió a un primer intento manual de QA con una contraseña de fixture equivocada; el segundo acceso con la credencial correcta fue exitoso. No es un defecto de la aplicación.

## Resultado de cierre

- checkpoints visuales `00–14`: aprobados;
- API reconstruida y suite backend completa ejecutada en Docker;
- prueba de autorización propia/ajena incluida en las 19 pruebas de integración aprobadas;
- despliegue y piloto: pendientes hasta que el dueño autorice esa actividad y existan dominio, TLS, secretos, backups externos y observabilidad reales.

La entrega cierra el rediseño visual 00–14. No despliega ni inicia el piloto productivo.
