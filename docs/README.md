# Documentación de Lou Barbershop

Solo se conserva documentación vigente. Las actas de fases, planes cumplidos y evidencias antiguas se retiraron; siguen disponibles en el historial de git.

## Empieza aquí

1. [Estado actual](estado-actual.md): qué está terminado, qué falta y próximos pasos.
2. [Páginas y roles](diseno/paginas-y-roles.md): rutas, secciones y acciones por usuario.
3. [Desarrollo local](operacion/desarrollo-local.md): cómo ejecutar y mantener el entorno.
4. [Convenciones](convenciones.md): reglas que debe seguir cada cambio.

## Producto — `producto/`

- [Alcance y decisiones](producto/alcance-y-decisiones.md): visión, alcance del MVP, actores y glosario.
- [Reglas de negocio](producto/reglas-de-negocio.md): reglas RN-* y ciclos de estado.
- [Flujos](producto/flujos.md): diagramas de secuencia de los procesos clave.
- [Modelo de datos](producto/modelo-de-datos.md): entidades, tablas y restricciones.
- [Métricas de reportes](producto/metricas-de-reportes.md): cómo se calcula cada cifra.

## Técnica — `tecnica/`

- [Arquitectura](tecnica/arquitectura.md)
- [API](tecnica/api.md)
- [Seguridad y roles](tecnica/seguridad-y-roles.md)
- [Stack y Docker](tecnica/stack-y-docker.md)
- [PWA: caché y offline](tecnica/pwa-cache-y-offline.md)
- [Privacidad](tecnica/privacidad.md)
- [Modelo de amenazas](tecnica/modelo-de-amenazas.md)
- [ADR](adr/README.md): decisiones de arquitectura.

## Diseño — `diseno/`

- [Componentes](diseno/componentes.md): identidad, componentes y accesibilidad.
- [Páginas y roles](diseno/paginas-y-roles.md)
- [Plan de mejora visual](diseno/plan-mejora-visual.md): ronda en curso, pantalla por pantalla.

## Operación — `operacion/`

- [Desarrollo local](operacion/desarrollo-local.md)
- [Runbooks](operacion/runbooks.md): respaldo, restauración y recuperación.
- [Entrega y piloto](operacion/entrega-y-piloto.md): checklist de puesta en marcha.
- [Migración desde Google Calendar](operacion/migracion-google-calendar.md)

## Prioridad entre documentos

Si dos documentos se contradicen, prevalecen en este orden: reglas de negocio, ADR aceptados, estado actual, convenciones y documentos temáticos.

Principios que nunca cambian silenciosamente: la cita planifica, la atención registra lo ocurrido, el pago del cliente y la comisión son conceptos separados, el historial económico se corrige mediante reversos o ajustes y las mutaciones críticas requieren conexión.
