# Política PWA — caché, offline y actualización

## Matriz de caché

| Recurso | Estrategia | Vigencia/límite | Motivo |
|---|---|---|---|
| Shell, JS, CSS, iconos y fuentes versionados | Precache/Cache First | por versión del build | abrir la aplicación e instalarla |
| `GET /api/v1/public/catalog` | Stale While Revalidate | 1 entrada, 24 h | contenido público y derivable |
| `GET /api/v1/public/availability` | Network First, timeout 4 s | 31 entradas, 1 h | permite lectura marcada como desactualizada |
| cualquier `/api/v1/public/appointments*` | Network Only | sin caché | contiene gestión privada o muta agenda |
| mutaciones internas/económicas | Network Only por omisión | sin cola/background sync | nunca fingir confirmación offline |

No se cachean clientes, teléfonos, tokens ni respuestas de gestión. La interfaz permite explorar catálogo/última disponibilidad, marca el dato como posiblemente desactualizado y deshabilita confirmar, reprogramar o cancelar sin conexión.

## Actualización controlada

El service worker usa `registerType: prompt`, `skipWaiting: false` y `clientsClaim: false`. Una versión nueva queda esperando y aparece el aviso **“Actualiza cuando termines”**. Sólo el botón del usuario activa y recarga; no se interrumpe un formulario, cobro o liquidación. Los cachés de builds anteriores se limpian al activar la versión aceptada.

## Instalación

El manifest declara nombre, descripción, idioma `es-BO`, colores, alcance/start URL, modo standalone, iconos 192/512 maskable y shortcuts **Reservar cita** y **Agenda interna**. Fuera de localhost requiere HTTPS.

## Verificación R7

- Build Vite genera `manifest.webmanifest`, `sw.js` y precache sin errores.
- Validación equivalente inspecciona manifest, iconos/shortcuts, estrategias y ausencia de Background Sync.
- Vitest prueba bloqueo de confirmación offline.
- La aceptación móvil debe probar instalación, reserva, enlace privado, pérdida/retorno de conexión y aviso de actualización antes de aprobar G11.
