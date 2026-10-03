# Documentación de Lou Barbershop

La documentación vigente está organizada por propósito. Las actas antiguas se conservan en `archivo/`, pero no forman parte de la lectura cotidiana ni sustituyen el estado actual.

## Empieza aquí

1. [Estado actual de la aplicación](ESTADO-ACTUAL.md): qué está terminado, qué puede probarse y qué falta para producción.
2. [Plan maestro por fases](17-plan-maestro-fases.md): dependencias, puertas y próximos pasos.
3. [Guía de páginas y roles](diseno/53-guia-paginas-secciones-y-roles.md): rutas, secciones y acciones por usuario.
4. [Guía de desarrollo local](operacion/23-guia-desarrollo-local.md): cómo ejecutar y mantener el entorno.
5. [Convenciones de trabajo](19-convenciones-trabajo.md): reglas que debe seguir cada cambio.

Con esos cinco documentos se entiende el estado general. Los siguientes son referencias detalladas para cuando una tarea las necesite.

## Producto y negocio — `producto/`

- [Contexto, alcance y decisiones](producto/01-contexto-alcance-y-decisiones.md)
- [Reglas de negocio y estados](producto/02-reglas-negocio-y-estados.md)
- [Requisitos y casos de uso](producto/03-requisitos-y-casos-de-uso.md)
- [Historias de usuario](producto/04-historias-de-usuario.md)
- [Flujos y secuencias](producto/05-flujos-y-secuencias.md)
- [Modelo de dominio y datos](producto/06-modelo-dominio-y-datos.md)
- [UX móvil](producto/10-ux-movil.md)
- [Trazabilidad](producto/13-trazabilidad.md)
- [Backlog operativo](producto/18-backlog-operativo.md)
- [Datos ficticios](producto/20-datos-ficticios.md)
- [Wireframes](producto/21-wireframes-flujos-criticos.md)
- [Diccionario de métricas](producto/38-diccionario-metricas.md)
- [Horario de sucursal y cadencia](producto/50-correccion-horario-sucursal-y-cadencia.md)

## Ingeniería — `tecnica/`

- [Arquitectura y ADR iniciales](tecnica/07-arquitectura.md)
- [Contrato de API](tecnica/08-api.md)
- [Seguridad, roles y auditoría](tecnica/09-seguridad-roles-y-auditoria.md)
- [Estrategia de pruebas](tecnica/12-estrategia-pruebas.md)
- [Clean Architecture y SOLID](tecnica/14-clean-architecture-y-solid.md)
- [Stack, PWA y Docker](tecnica/15-stack-pwa-y-docker.md)
- [Política PWA](tecnica/40-politica-pwa-cache-actualizacion.md)
- [Hardening](tecnica/41-hardening-y-evidencia.md)
- [Privacidad y retención](tecnica/43-privacidad-retencion-y-datos.md)
- [Modelo de amenazas](tecnica/Peluqueria-threat-model.md)
- [Cierre de seguridad preproducción](tecnica/54-cierre-seguridad-preproduccion.md)
- [ADR independientes](adr/README.md)

## Diseño — `diseno/`

- [Plan visual aprobado](diseno/48-plan-rediseño-tailwind-y-movimiento.md)
- [Componentes, accesibilidad y pulido](diseno/51-guia-componentes-accesibilidad-y-pulido.md)
- [Páginas, secciones y roles](diseno/53-guia-paginas-secciones-y-roles.md)
- [Segunda ronda de mejora visual por pantalla](diseno/56-segunda-ronda-pulido-visual.md)

## Operación — `operacion/`

- [Desarrollo local](operacion/23-guia-desarrollo-local.md)
- [Transición desde Google Calendar](operacion/32-transicion-google-calendar.md)
- [Runbooks, respaldo y recuperación](operacion/42-runbooks-operacion-y-recuperacion.md)
- [Última validación integral](operacion/52-validacion-integral-seguridad-y-operacion-2026-09-19.md)
- [Checklist de entrega y piloto](operacion/55-checklist-entrega-y-piloto.md)

## Historial — `archivo/`

[Índice histórico](archivo/README.md) contiene actas de fases, decisiones visuales reemplazadas y documentos de planificación ya superados. Se conserva por trazabilidad; no debe editarse para describir el estado vigente.

## Prioridad entre documentos

Si dos documentos parecen contradecirse, prevalecen en este orden:

1. reglas e invariantes de producto vigentes;
2. ADR aceptados;
3. estado actual y validación integral más reciente;
4. plan maestro y convenciones;
5. documentos temáticos vigentes;
6. actas archivadas.

Principios que nunca cambian silenciosamente: la cita planifica, la atención registra lo ocurrido, el pago del cliente y la comisión son conceptos separados, el historial económico se corrige mediante reversos o ajustes y las mutaciones críticas requieren conexión.
