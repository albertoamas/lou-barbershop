# Plan de rediseño visual de Lou Barbershop

**Fecha:** 3 de octubre de 2026  
**Estado:** vigente. La fase 0 está cerrada y la fase 1 (dirección visual) está pendiente.

Este documento fija las reglas que debe cumplir el rediseño completo de la aplicación. No dice qué cambiar en cada pantalla. Eso se decide cuando se trabaja cada una, con el análisis de la sección 12. Aquí está el marco común: para quién se diseña, en qué dispositivos, con qué marca, con qué reglas visuales, técnicas y de calidad, y el inventario de lo que hay que rediseñar.

## 1. Alcance

**Incluye:** presentación de todas las rutas públicas e internas: layout, color, tipografía, componentes, estados, textos de interfaz, movimiento, iconografía, espacios para fotos y activos de marca (logo, favicon e iconos PWA).

**No incluye:** reglas de negocio, permisos, contratos de API, base de datos ni flujos económicos. Si el análisis de una pantalla detecta que una mejora necesita cambiar la API o una regla, se registra aparte y se decide fuera del rediseño.

**Invariantes que el rediseño nunca rompe:**

- cita, atención, pago, comisión y liquidación siguen siendo conceptos separados en la interfaz;
- el frontend no calcula precios, totales ni comisiones con autoridad: muestra lo que devuelve el backend;
- las mutaciones económicas y las reservas siguen bloqueadas sin conexión (`canExecuteCriticalMutation`);
- los permisos por rol no cambian: una pantalla rediseñada muestra exactamente las acciones que su rol permite.

## 2. Usuarios y dispositivos

| Persona | Rol en la app | Dispositivo principal | Secundario | Contexto de uso |
|---|---|---|---|---|
| Recepcionista | Administrador | **Tablet** en el mostrador (horizontal y vertical) | **PC** | Agenda del día, llegadas, cobros y ventas; muchas consultas rápidas mientras atiende a clientes en persona y por teléfono |
| Barbero | Barbero | **Celular** (vertical, una mano) | Ninguno | Entre clientes, con poco tiempo: su día, su próxima cita, iniciar o terminar una atención y ver sus comisiones |
| Dueño | Dueño | **Celular** | **PC** | Revisar el negocio en cualquier momento; en PC hace las tareas largas: reportes, configuración y liquidaciones |
| Cliente | Público | **Celular** (llega desde Instagram o WhatsApp) | PC | Ver servicios, reservar, consultar o cambiar su cita |

**Consecuencias obligatorias:**

- **Tablet primero para las pantallas operativas** de recepción (agenda, atender y cobrar, inventario y gastos, disponibilidad): se diseñan primero para tablet horizontal y después se adaptan a vertical, celular y PC.
- **Celular primero** para el sitio público y para todo lo que usan barberos y dueño en el día a día (inicio, agenda propia, atención, comisiones).
- **PC** debe funcionar completo y cómodo, pero no define el diseño. Aprovecha el espacio extra con columnas o paneles laterales, sin inventar funciones que tablet o celular no tienen.
- Ninguna función queda exclusiva de un dispositivo.

## 3. Marca

### 3.1 Logo oficial

El logo oficial es `docs/assets/brand/lou-logo.jpg` (1080×1080): dos navajas cruzadas, "Lou" en caligrafía y "BARBERSHOP" en una sans condensada, en blanco sobre negro. Reemplaza a la versión anterior, que tenía diferencias sutiles y no debe volver a usarse.

**Reglas:**

- No se redibuja, recolorea, deforma ni recompone el logo. Tampoco se separan las navajas del texto para inventar variantes.
- Variantes permitidas: el logo completo; el logo sobre fondo claro invirtiendo blanco y negro, solo si se obtiene de una fuente vectorial fiel; y un recorte cuadrado para favicon e iconos PWA.
- Área de respeto: al menos la altura de la palabra "Lou" libre alrededor del logo.
- Tamaño mínimo del logo completo: 96 px de ancho en pantalla. Por debajo de eso se usa el recorte para iconos.
- Activo de trabajo: la app sirve `src/frontend/public/brand/lou-logo.jpg`, que hoy es la versión anterior. En la fase 2 se reemplaza por la oficial y se regeneran `public/icon.svg`, `favicon.svg` y los PNG de `public/icons` (`npm run icons:generate`). Si se consigue el logo en vector (SVG o PDF), se prefiere a cualquier conversión del JPG.
- El "Lou" en caligrafía es parte del logo y no se convierte en la tipografía de la interfaz.

### 3.2 Identidad visual

- La base es el **blanco y negro del logo**. Cualquier color adicional se decide en la fase 1 y debe justificarse desde el oficio (navaja, acero, sillón, poste) y no por moda.
- Los colores de estado (éxito, aviso, error, información) son semánticos y nunca se usan como decoración.
- La personalidad se concentra en un solo recurso gráfico memorable, decidido en la fase 1 (por ejemplo, el rayado grabado de los mangos de las navajas). El resto se mantiene sobrio.

### 3.3 Fotos

No hay fotos de la barbería todavía. El diseño deja **espacios reservados** que funcionan bien vacíos y se completan después sin tocar código de layout:

- cada espacio tiene proporción fija (`aspect-ratio`), tamaño máximo y propósito documentado: local, cortes, equipo o barbero individual;
- mientras no haya foto se muestra un relleno de marca digno (color de fondo y el recurso gráfico), nunca una imagen genérica de stock ni un ícono de "imagen rota";
- las fotos se cargan desde una ubicación única (`public/media/` o configuración) para reemplazarlas sin tocar componentes;
- formato AVIF o WebP con respaldo JPG, `loading="lazy"` salvo en la portada, `width` y `height` declarados para evitar saltos de layout, y texto alternativo descriptivo;
- la foto de cada barbero en la reserva pública y en la agenda es opcional; sin foto se muestran sus iniciales.

## 4. Proceso de trabajo

### 4.1 Fases

| Fase | Contenido | Cierre |
|---|---|---|
| **0. Plan** | Este documento | ✔ Aprobado |
| **1. Dirección visual** | Dos o tres direcciones aplicadas a contenido real de Lou: portada en celular, agenda en tablet horizontal y cobro en celular. Se presentan como página navegable antes de tocar la app | El dueño elige una dirección |
| **2. Fundaciones** | Tokens (color, tipo, espaciado, radios, sombras, movimiento), logo oficial, iconos PWA, shell y navegación por dispositivo, y los componentes base de la sección 11.1 con sus historias de Storybook | Aprobación del sistema en Storybook y en el shell real |
| **3. Operación diaria** | Inicio por rol, Agenda, Atender y cobrar | Aprobación por pantalla |
| **4. Sitio público** | Portada, Reservar, Mi cita, Privacidad | Aprobación por pantalla |
| **5. Gestión** | Comisiones, Inventario y gastos, Disponibilidad, Reportes, Configuración, Seguridad, Login y estados del sistema | Aprobación por pantalla |
| **6. Cierre** | Revisión global con `web-design-guidelines`, accesibilidad, rendimiento, pruebas E2E de flujos críticos con Playwright y decisión final sobre Storybook | Listo para despliegue |

Se respeta el orden. Una pantalla no empieza hasta que las fundaciones están aprobadas, porque los componentes base cambian todas las pantallas a la vez.

### 4.2 Ciclo por pantalla

1. **Análisis:** se completa la plantilla de la sección 12 con capturas actuales en celular, tablet vertical, tablet horizontal y PC.
2. **Propuesta:** qué cambia y por qué, en lenguaje simple, y si hace falta un boceto o captura del resultado esperado.
3. **Aprobación** del dueño antes de implementar.
4. **Implementación** en una rama propia (`feat/redesign-<pantalla>`), con commits Conventional (`feat(<scope>): …`).
5. **Verificación:** se cumple la definición de terminado de la sección 10.
6. **Cierre:** capturas antes y después en los cuatro tamaños, merge a `main` y CI en verde.

### 4.3 Uso de skills

| Momento | Skill |
|---|---|
| Dirección visual, fundaciones y propuesta de cada pantalla | `frontend-design` |
| Componentes reutilizables y sus APIs | `vercel-composition-patterns` |
| Rendimiento de componentes y listas largas (agenda, inventario, reportes) | `vercel-react-best-practices`; las reglas de Next.js y Server Components no aplican a esta SPA |
| Revisión al cerrar cada pantalla y en la fase 6 | `web-design-guidelines` |

Las reglas de este documento, `AGENTS.md` y los ADR prevalecen sobre cualquier sugerencia de una skill.

## 5. Reglas de diseño

### 5.1 Principios

1. **Dos personalidades, una marca.** El sitio público es la vitrina: ahí va la audacia visual. La app interna es una herramienta de trabajo: sobria, rápida y legible a un brazo de distancia.
2. **Una acción primaria por contexto.** Cada pantalla, panel o modal tiene como máximo un botón principal.
3. **La estructura es información.** Bordes, divisores, números, etiquetas y tarjetas existen solo si comunican algo: agrupación, secuencia real o estado. Nunca como relleno.
4. **El estado se ve en un vistazo.** Citas, atenciones, cobros y liquidaciones muestran su estado con forma, texto e ícono; nunca solo con color.
5. **Dinero alineado y legible.** Importes en cifras tabulares, alineados a la derecha en listas y tablas, siempre con su moneda (`Bs 1.250,00`).
6. **Movimiento con motivo.** Se anima lo que responde a una acción (abrir, confirmar, cambiar de estado). Un solo momento orquestado por página como máximo; nada de entradas animadas en cada sección.
7. **Quitar un accesorio.** Antes de cerrar una pantalla se revisa qué decoración sobra y se quita.

### 5.2 Patrones prohibidos

Hacen que la interfaz parezca plantilla y no aportan información:

- etiquetas en mayúsculas espaciadas sobre los títulos (`RESUMEN DEL NEGOCIO`);
- textos unidos con puntos medios (`Estilo · Detalle · Oficio`);
- resaltar una sola palabra de un titular con otro color, cursiva o peso;
- flechas `→` añadidas al texto de botones y enlaces;
- numeración `01 / 02 / 03` en contenido que no es una secuencia;
- todo en tarjetas idénticas con el mismo radio y la misma sombra, sin jerarquía;
- degradados decorativos, fondos con patrones sin significado y sombras grises genéricas en todo;
- fuente monoespaciada para datos pequeños sin necesidad;
- negros "teñidos" (`#0B0B0B`, `#111`) en lugar de una decisión explícita de color;
- textos que describen el sistema en lugar de ayudar al usuario (zonas horarias técnicas, "los cobros continúan separados", etc.).

### 5.2.1 Símbolos prohibidos en textos de la interfaz

Ningún texto visible de la app (títulos, botones, etiquetas, mensajes, ayudas) usa estos símbolos, que delatan texto generado y no aportan nada:

| Prohibido | En su lugar |
|---|---|
| Flechas como texto: `→ ← ↑ ↓ ⇒ ➜ ›  »` | La palabra de la acción ("Ver reportes"). Si hace falta dirección, un ícono de `AppIcon` con nombre accesible, nunca un carácter |
| Raya larga `—` y guion medio `–` | Punto, coma, dos puntos o paréntesis. Rangos con palabras: "08:00 a 13:00", "lunes a sábado" |
| Punto medio `·` y viñetas sueltas `•` como separador | Frases separadas, una lista real o espacio |
| Emojis y adornos (`✓ ✨ ★ ✦ ⚡`) | Ícono de `AppIcon` cuando comunica un estado; nada si es decoración |
| Comillas tipográficas decorativas o texto en cursiva para "dar estilo" | Texto normal |

Se permite el guion corto normal (`-`) solo donde la gramática lo pide, y los puntos suspensivos solo en estados en curso ("Guardando..."). Esta regla se verifica en cada pantalla como parte de la definición de terminado.

### 5.3 Color

- Los tokens viven en `@theme` de `src/frontend/src/index.css` con nombres semánticos (`--color-surface`, `--color-text-muted`, `--color-state-danger`…), no nombres de pigmento en los componentes.
- La paleta base es de 4 a 6 colores con nombre más los cuatro de estado. Se define en la fase 1 y no se añaden colores sueltos en pantallas.
- Contraste mínimo WCAG 2.2 AA: 4,5:1 en texto normal, 3:1 en texto grande (≥ 24 px, o ≥ 18,66 px en negrita), en bordes de controles y en el indicador de foco.
- La recepción puede tener mucha luz o reflejo en la tablet: el texto secundario no baja de 4,5:1 aunque sea "suave".
- Modo oscuro: no forma parte de este rediseño. Si la dirección elegida usa fondo oscuro, se diseña como el único tema, no como alternativa.

### 5.4 Tipografía

- Máximo dos familias, claramente distintas: una de display, que puede seguir siendo una condensada coherente con "BARBERSHOP" del logo, y una de lectura y UI. Inter queda en revisión porque es la elección por defecto de demasiadas apps. La decisión es de la fase 1.
- Las fuentes se sirven localmente con `@fontsource`, sin Google Fonts en runtime, y solo con los pesos usados.
- Escala modular definida en tokens; ningún tamaño suelto fuera de la escala.
- Mínimos: cuerpo 16 px en celular y tablet; texto auxiliar 14 px; nada interactivo por debajo de 14 px. Los campos de formulario usan 16 px como mínimo, porque iOS hace zoom en campos con texto menor.
- Mayúsculas y minúsculas de frase en títulos, botones y etiquetas. Las mayúsculas sostenidas se reservan para el logo.
- Líneas de lectura de menos de 80 caracteres.
- Cifras tabulares (`font-variant-numeric: tabular-nums`) en importes, horas y cantidades.

### 5.5 Espaciado, radios y elevación

- Escala de espaciado de 4 px (4, 8, 12, 16, 24, 32, 48, 64…). Nada de valores arbitrarios.
- Radios con jerarquía: pequeño para controles, mediano para paneles y nulo o grande para superficies principales, según la dirección. No se usa el mismo radio en todo.
- Elevación en máximo tres niveles: plano, elevado (paneles) y superpuesto (modales y hojas). La sombra se usa solo cuando algo flota sobre otra cosa.

### 5.6 Iconografía

- Un solo set de iconos de trazo coherente. Se mantiene `AppIcon` como punto único y se revisa el set en la fase 2.
- Los íconos acompañan al texto; solo van sin texto en controles universalmente reconocibles (cerrar, atrás, menú), y siempre con `aria-label`.
- Los logos de redes sociales (`simple-icons`) solo se usan en el sitio público.

### 5.7 Movimiento

Se mantienen los tiempos vigentes:

| Tipo | Duración |
|---|---|
| Microinteracción (pulsar, alternar) | 100 a 160 ms |
| Pestaña, menú, acordeón | 160 a 220 ms |
| Navegación, panel, hoja inferior | 200 a 280 ms |

- Se animan opacidad y transformación, no layout.
- Ninguna persistencia (guardar, cobrar, reservar) espera a que termine una animación.
- `prefers-reduced-motion` desactiva todo movimiento no esencial.

## 6. Responsive y dispositivos

### 6.1 Tamaños de verificación

| Clase | Anchos a probar | Notas |
|---|---|---|
| Celular | 360, 390 y 430 px (vertical) | 320 px debe funcionar sin romperse ni scroll horizontal |
| Tablet vertical | 768 y 820 px | |
| Tablet horizontal | 1024 y 1180 px | Referencia principal de recepción |
| PC | 1366 y 1440 px; revisar 1920 | El contenido no se estira sin límite: ancho máximo de lectura y paneles |

Breakpoints de Tailwind: `md` (768) marca la tablet y `lg` (1024) la tablet horizontal. Un breakpoint nuevo solo se crea si los existentes no bastan, y se documenta.

### 6.2 Reglas táctiles y de interacción

- Área táctil mínima de 44×44 px y 48 px en las acciones frecuentes de recepción y barberos. Al menos 8 px de separación entre áreas táctiles vecinas.
- **Celular:** las acciones principales quedan al alcance del pulgar, en la mitad inferior. La navegación es una barra inferior con los destinos frecuentes del rol y un menú "Más".
- **Tablet:** se aprovecha el ancho con navegación lateral y, cuando aplica, lista + detalle lado a lado. Funciona en ambas orientaciones, y al rotar no se pierde el estado (formulario a medio llenar, cita seleccionada).
- **PC:** navegación lateral persistente; teclado completo y atajos opcionales que no reemplacen botones visibles.
- Nada depende de `hover`: la información que aparece al pasar el mouse también es accesible tocando (`@media (hover: hover)` solo para mejoras).
- El teclado en pantalla no tapa el campo activo ni el botón de enviar en tablet y celular.
- Se usa `100dvh` y no `100vh`, y se respetan las áreas seguras (`env(safe-area-inset-*)`) en dispositivos con muesca o indicador de inicio.
- Sin scroll horizontal a nivel de página. Las tablas se convierten en lista en celular o usan un contenedor de scroll local con la primera columna fija.
- Los campos usan el teclado adecuado: `inputmode="numeric"` o `decimal` para importes y cantidades, `type="tel"` para teléfonos.

### 6.3 Modales y paneles por dispositivo

| Dispositivo | Detalle o edición | Confirmación |
|---|---|---|
| Celular | Hoja inferior o pantalla completa con botón de volver | Diálogo centrado y compacto |
| Tablet | Panel lateral; la lista sigue visible | Diálogo centrado |
| PC | Panel lateral o diálogo centrado | Diálogo centrado |

Todos usan la misma base accesible (`dialog` nativo o equivalente): foco retenido, `Escape` para cerrar salvo durante un proceso y foco devuelto al control que lo abrió.

## 7. Contenido y textos

- Español claro, en segunda persona y en voz activa. Se nombra lo que el usuario entiende ("Cobrar", "Mis comisiones"), no cómo está construido el sistema.
- Un botón dice exactamente lo que hace, y la misma acción conserva el mismo nombre en todo el flujo: el botón "Cobrar" produce el mensaje "Cobro registrado".
- **Errores:** dicen qué pasó y cómo resolverlo, sin disculpas ni vaguedad. Si el backend devuelve `requestId`, se muestra discreto para soporte.
- **Estados vacíos:** invitan a la acción concreta ("No hay citas hoy. Crear cita").
- **Formatos:** moneda `Bs 1.250,00`; fechas naturales (`sábado 3 de octubre`); horas en 24 h (`15:30`); siempre en la hora de La Paz, sin mostrar el nombre técnico de la zona horaria.
- Sin texto de relleno ni frases de marketing en la app interna.

## 8. Accesibilidad

Se mantienen las reglas vigentes y se amplían:

- un encabezado principal visible por ruta; "Saltar al contenido" es el primer control;
- al cambiar de ruta, el foco va al contenido principal;
- foco visible en todos los controles, con contraste de 3:1 contra el fondo;
- formularios con etiqueta visible, ayuda y error asociados (`aria-describedby`);
- el estado nunca depende solo del color;
- los mensajes de éxito o error de acciones importantes se anuncian (`aria-live`);
- el orden de lectura y de tabulación sigue al visual en los cuatro tamaños;
- el texto puede ampliarse al 200 % sin perder contenido ni funciones;
- la validación automática incluye `axe-core`, ESLint `jsx-a11y` y pruebas de teclado de los flujos principales.

## 9. Reglas técnicas

- **Capas:** todo el rediseño vive en `presentation/`. `core/` no importa React, Tailwind ni Motion. Los componentes no llaman a `fetch`; usan los hooks y clientes existentes.
- **Estilos:** utilidades de Tailwind y variantes con `class-variance-authority`. `index.css` contiene solo Tailwind, tokens, base global, foco y movimiento reducido; no se añaden clases globales por pantalla. Los colores y tamaños se toman de tokens, sin valores arbitrarios (`[#123456]`, `[13px]`) salvo casos justificados en el código.
- **Componentes:** un componente compartido por patrón (botón, campo, diálogo, hoja, etiqueta de estado…), con API por composición antes que por acumular props booleanas. Cada componente compartido tiene historia en Storybook con sus estados.
- **Rendimiento:** se mantiene la carga diferida por ruta. Presupuesto de referencia del último cierre: CSS ~68 kB (12 kB gzip), entrada JS ~358 kB (116 kB gzip). Si el rediseño lo supera más de un 10 %, se justifica o se corrige. Las fuentes nuevas cuentan dentro del presupuesto.
- **PWA:** precache acotado; las fotos no se precachean. La app interna sigue siendo instalable en tablet y celular.
- **Pruebas:** cada pantalla conserva o mejora sus pruebas de Vitest y Testing Library. Los selectores de prueba usan roles y textos accesibles, no clases CSS. Si cambia un texto, se actualiza su prueba en el mismo commit.
- **Sin dependencias de UI nuevas** (kits de componentes, librerías de iconos o de animación) sin justificarlo en el PR. Una dependencia grande requiere decisión explícita.

## 10. Definición de terminado por pantalla

- [ ] Análisis y propuesta aprobados (sección 12).
- [ ] Verificada en 360, 390, 768, 1024 y 1440 px, sin scroll horizontal, y en 320 px sin romperse.
- [ ] Probada en tablet en ambas orientaciones, rotando con un formulario o selección activa.
- [ ] Flujo principal recorrido solo con teclado, y con lector de pantalla en sus acciones clave.
- [ ] Estados cubiertos: carga, vacío, error, sin conexión, sin permiso y éxito.
- [ ] Ningún patrón prohibido de la sección 5.2 ni símbolo prohibido de la 5.2.1.
- [ ] Revisión con `web-design-guidelines` sin hallazgos pendientes.
- [ ] `npm run format:check`, `npm run lint`, `npm run test`, `npm run build` y `npm run build-storybook` en verde. CI en verde.
- [ ] Capturas antes y después adjuntas al PR.

## 11. Inventario

Lista de lo que se rediseña. Sirve como punto de partida del análisis de cada pantalla; no define qué cambiar.

### 11.1 Fundaciones y componentes compartidos

| Elemento | Ubicación | Uso |
|---|---|---|
| Tokens y base global | `index.css` | Toda la app |
| `AppShell` | `layout/AppShell.tsx` | Estructura común, enlace "Saltar al contenido" y avisos |
| `InternalNavigation` | `layout/InternalNavigation.tsx` | Barra inferior y menú "Más" en celular; navegación lateral en tablet y PC |
| `SessionBoundary` | `components/SessionBoundary.tsx` | Contenedor de rutas internas, transición entre páginas y sesión |
| `BrandLockup` | `components/BrandLockup.tsx` | Logo en cabeceras y login |
| `Button` / `buttonStyles` | `components/` | Todas las acciones |
| `AppIcon` | `components/AppIcon.tsx` | Iconografía |
| `ConfirmDialog` | `components/ConfirmDialog.tsx` | Confirmación de acciones sensibles |
| `AgendaDialog` | `components/AgendaDialog.tsx` | Diálogo y panel base que reutilizan agenda, comisiones, inventario y disponibilidad |
| `SystemStateCard` | `components/SystemStateCard.tsx` | 404, acceso denegado, sesión expirada, error |
| `ConnectivityBanner` | `components/ConnectivityBanner.tsx` | Aviso sin conexión |
| `ServiceWorkerUpdateBanner` | `components/ServiceWorkerUpdateBanner.tsx` | Aviso de nueva versión |
| `ErrorBoundary` | `components/ErrorBoundary.tsx` | Error inesperado |
| `SocialLinks` | `components/SocialLinks.tsx` | Redes en el sitio público |
| Campos de formulario | dispersos en cada página (`input`, `select`, `textarea`, `details`) | Se consolidan en componentes compartidos en la fase 2 |
| Etiquetas de estado | dispersas | Estados de cita, atención, cobro, liquidación y stock |
| Espacio de foto | nuevo | Sección 3.3 |
| Activos de marca | `public/brand`, `public/icon.svg`, `favicon.svg`, `public/icons` | Logo oficial e iconos PWA |

### 11.2 Sitio público

| Pantalla | Ruta | Dispositivo principal | Secciones y componentes | Modales y estados |
|---|---|---|---|---|
| Portada | `/` | Celular | Cabecera con logo y "Reservar"; portada principal; Servicios (catálogo con precio y duración); Cómo funciona; Ubicación con mapa de Google; pie con redes | Carga de servicios; servicios no disponibles |
| Reservar | `/reservar` | Celular | Progreso de reserva en 5 pasos (servicio, profesional, fecha y hora, datos, confirmar); resumen de reserva desplegable; lista de servicios; lista de barberos o "cualquiera"; calendario y horarios por mañana/tarde; formulario del cliente; confirmación "Te esperamos" con enlace para gestionar | Sin horarios; horario tomado por otra persona (conflicto); sin conexión; error de validación |
| Mi cita | `/mi-cita#token` | Celular | Apertura del enlace privado; tarjeta de la cita; reprogramar (nuevo horario por mañana/tarde); cancelar | `ConfirmDialog` "¿Cancelar la cita?"; enlace inválido o vencido; cita cancelada; conflicto; sin conexión |
| Privacidad | `/privacidad` | Celular | Texto legal por secciones | Ninguno |
| 404 pública | `*` | Celular | `SystemStateCard` | Ninguno |

### 11.3 Acceso y estados del sistema

| Pantalla | Ruta | Secciones y componentes | Estados |
|---|---|---|---|
| Login | `/app/login` | `BrandLockup`; usuario; contraseña con mostrar/ocultar; código de verificación en dos pasos (cuando aplica); botón "Ingresar" | Credenciales inválidas; demasiados intentos; código de verificación requerido; verificando |
| Sesión expirada | `/app/sesion-expirada` | `SystemStateCard` | Ninguno |
| Acceso denegado | `/app/acceso-denegado` | `SystemStateCard` | Ninguno |
| 404 interna | `/app/*` | `SystemStateCard` dentro del shell | Ninguno |

### 11.4 App interna

| Pantalla | Ruta | Roles | Dispositivo principal | Secciones y componentes | Modales y paneles |
|---|---|---|---|---|---|
| Inicio | `/app` | Dueño, Administrador, Barbero (contenido distinto por rol) | Celular (dueño, barbero) y tablet (recepción) | Resumen del día: ventas, efectivo, QR y comisión pendiente (dueño); próxima cita; alertas de stock; accesos rápidos; "Mi día" del barbero; indicador de conexión | Ninguno |
| Agenda | `/app/agenda` | Todos (barbero: solo la suya) | Tablet horizontal | Controles: día anterior/hoy/siguiente, ir a fecha, filtro por barbero, vista Día / 7 días; leyenda de estados; agenda diaria por barbero; agenda semanal; tarjetas de cita; botón "Nueva cita" | Detalle de cita (`AppointmentDetails` en `AgendaDialog`) con acciones de estado (llegó, iniciar, no asistió, cancelar, reprogramar); editor de cita (`AppointmentEditor` + `CustomerPicker`) para crear y reprogramar |
| Atender y cobrar | `/app/atenciones` | Dueño, Administrador, Barbero | Tablet (recepción) y celular (barbero) | Progreso de atención en 5 etapas; abrir llegada directa (buscar o registrar cliente, barbero); atención actual; "¿Qué se realizó y vendió?" (servicios, productos, cantidades); ajuste autorizado (descuento o cortesía); "¿Cómo pagó?" (efectivo, QR o mixto); cobro confirmado; operación revertida; resumen del día | Registro de cliente nuevo (desplegable "El cliente no está registrado"); no tiene diálogos propios |
| Comisiones | `/app/comisiones` | Dueño (todas), Barbero (las suyas) | Celular y PC (dueño) | Filtros; resumen de comisiones; saldo de comisión; preparar liquidación; lista de liquidaciones con estado | Detalle de liquidación (`AgendaDialog`): revisar borrador, operaciones incluidas, ajustes autorizados, registrar pago completo; crear liquidación |
| Inventario y gastos | `/app/inventario` | Dueño, Administrador | Tablet | Pestañas: Existencias (productos, alertas de stock), Compras (compras de reventa, productos recibidos), Gastos (gastos pagados), Caja de hoy | Panel lateral de registro (`AgendaDialog`) para compra, ajuste de stock y gasto |
| Disponibilidad | `/app/disponibilidad` | Dueño, Administrador (barbero: la suya) | Tablet y PC | Pestañas: Semana (horarios registrados, navegación semanal), Buscar espacios (espacios disponibles), Excepciones (próximas e historial) | Panel de horario; panel de nueva excepción (`AgendaDialog`) |
| Reportes | `/app/reportes` | Dueño | PC y celular | Período del reporte (selector y rango); pestañas (`ReportTabs`): Operación, Caja, Comisiones, Equipo, Auditoría; secciones (`ReportSections`) con cifras y tablas; exportar CSV | Ninguno |
| Configuración | `/app/configuracion` | Dueño (algunas secciones Administrador) | PC | Secciones: Equipo, Servicios, Ofertas (precio y duración por barbero), Productos, Comisiones (tasas y vigencia), Gastos (categorías), Usuarios (roles, activación, restablecer contraseña y MFA); lista y detalle por sección | Editor (`ConfigurationEditor`); `ConfirmDialog` para desactivar o restablecer |
| Seguridad | `/app/seguridad` | Todos | Celular y PC | Cambiar contraseña; verificación en dos pasos (activar con QR, desactivar); códigos de recuperación | Ninguno |

### 11.5 Transversales a revisar en todas las pantallas internas

Encabezado de página (título, contexto y acción principal), avisos de conexión y actualización, estados de carga (esqueletos), vacío, error y sin permiso, y mensajes de confirmación de acciones.

## 12. Plantilla de análisis por pantalla

Se completa al empezar cada pantalla, en el PR o en un comentario de la tarea; no se crean documentos nuevos por pantalla.

1. **Propósito:** qué trabajo resuelve y para qué rol, en una frase.
2. **Uso real:** quién la usa, en qué dispositivo, con qué frecuencia y en qué momento del día.
3. **Tarea principal y secundarias:** qué debe poder hacerse en menos toques.
4. **Capturas actuales** en 390, 820 (vertical), 1180 (horizontal) y 1440 px.
5. **Problemas detectados:** de jerarquía, legibilidad, táctiles, de flujo, de texto, de accesibilidad y patrones prohibidos.
6. **Contenido y datos:** qué muestra, qué viene del backend y qué estados existen.
7. **Componentes:** cuáles compartidos usa, cuáles faltan y cuáles se pueden eliminar.
8. **Propuesta:** cambios con su motivo; boceto si el cambio es estructural.
9. **Riesgos:** pruebas afectadas, textos que cambian, impacto en otros roles o pantallas.
10. **Fuera de alcance:** mejoras que requieren backend o reglas nuevas, registradas aparte.

## 13. Decisiones pendientes

| Decisión | Fase | Responsable |
|---|---|---|
| Dirección visual, color de acento y recurso gráfico | 1 | Dueño |
| Tipografías definitivas | 1 | Dueño, con propuesta |
| Logo en vector (SVG o PDF) | Antes de la fase 2 | Pedir a la barbería o a quien diseñó el logo |
| Fotos del local, cortes y equipo | Cuando estén disponibles | Barbería |
| Navegación de tablet: lateral compacta o completa | 2 | Dueño, con propuesta |
| Mantener o retirar Storybook | 6 | Equipo |
