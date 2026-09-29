# Corrección de horario de sucursal y cadencia de reservas

**Fecha:** 11 de septiembre de 2026  
**Origen:** revisión humana del checkpoint `02 — Reserva pública`  
**Estado:** implementado y verificado; pendiente de aprobación visual del checkpoint 02

## Problema confirmado

El motor trataba el turno individual del barbero como única fuente de capacidad y generaba inicios cada 15 minutos. Esto permitía mostrar demasiadas alternativas y, con turnos continuos de prueba, ofrecer citas durante el cierre de mediodía.

## Decisión de negocio

- Existe una sola sucursal y abre todos los días en `America/La_Paz` de **08:00 a 13:00** y de **15:00 a 21:00**.
- Un turno de barbero debe caber completo dentro de una sola ventana de apertura.
- Un `AVAILABLE_OVERRIDE` amplía la disponibilidad del barbero, no el horario de la sucursal.
- Los inicios reservables se alinean cada **30 minutos**: `:00` y `:30`.
- La duración efectiva del servicio no se redondea. El servicio debe terminar dentro de la misma ventana donde comenzó.
- Los registros históricos no se eliminan. Los horarios antiguos fuera de regla dejan de producir disponibilidad y deben desactivarse o corregirse explícitamente.

## Diseño técnico

La regla se implementa como política pura en Domain, sin dependencia de ASP.NET Core, EF Core o React. El motor intersecta defensivamente:

```text
horario de sucursal ∩ turno/excepción del barbero − ausencias − citas activas
```

Application rechaza nuevas configuraciones fuera de la política. La PWA comunica los límites, pero no es la autoridad. No se añade tabla ni migración: al existir una sola sucursal y un horario aprobado estable, la política queda versionada en el núcleo; hacerla editable requerirá una decisión posterior y migración propia.

## Compatibilidad y datos

- Las citas existentes se conservan, incluso si fueron creadas bajo la regla anterior.
- El cálculo nuevo no ofrece citas futuras fuera de las ventanas ni en marcas `:15`/`:45`.
- El seed local desactiva turnos demo continuos incompatibles y crea bloques válidos separados.
- No se cambia el contrato exitoso de disponibilidad; se añaden errores de validación seguros para horario y apertura extraordinaria.

## Criterios de aceptación

1. Ningún resultado comienza en `:15` o `:45`.
2. Ningún resultado intersecta `13:00–15:00`, comienza antes de `08:00` o termina después de `21:00`.
3. Un servicio de 45 minutos no puede comenzar a las `12:30` ni a las `20:30`.
4. Crear/reactivar un turno fuera de las ventanas devuelve `schedule.outside_shop_hours`.
5. Crear un `AVAILABLE_OVERRIDE` fuera de las ventanas devuelve `availability_exception.outside_shop_hours`.
6. Reservas internas y públicas continúan revalidando la alternativa en el backend.

## Evidencia de implementación

- 66 pruebas de Domain, incluidas cadencia, cierre de mediodía, duración y rechazo de turnos inválidos.
- 9 pruebas de Application y 5 pruebas de arquitectura aprobadas.
- 19 archivos y 42 pruebas Vitest, lint, formato y build PWA aprobados.
- Imágenes de API y web compiladas con el stack fijado en Docker.
- Entorno desechable de aceptación migrado, sembrado y con smoke test autenticado aprobado.
- Consulta real para un servicio de 45 minutos: 24 alternativas para dos barberos, todas en `:00`/`:30`, sin `12:30` ni cruce de 13:00–15:00.
- Intento real de crear `12:00–16:00`: HTTP 400 con `schedule.outside_shop_hours`.

La suite de integración basada en Testcontainers compila, pero no pudo ejecutar sus contenedores PostgreSQL desde el contenedor SDK aislado porque éste no recibe control del daemon Docker. La misma ruta modificada se comprobó contra el Compose de aceptación sin montar el socket privilegiado del host.
