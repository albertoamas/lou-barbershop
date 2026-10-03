# Documentación de Lou Barbershop

La documentación vigente está organizada por propósito. Las actas de fases y la planificación ya cumplida se retiraron; siguen disponibles en el historial de git.

## Empieza aquí

1. [Estado actual de la aplicación](ESTADO-ACTUAL.md): qué está terminado, qué falta y próximos pasos.
2. [Guía de páginas y roles](diseno/53-guia-paginas-secciones-y-roles.md): rutas, secciones y acciones por usuario.
3. [Guía de desarrollo local](operacion/23-guia-desarrollo-local.md): cómo ejecutar y mantener el entorno.
4. [Convenciones de trabajo](19-convenciones-trabajo.md): reglas que debe seguir cada cambio.

## Producto y negocio — `producto/`

- [Análisis del negocio](producto/00-analisis-negocio.md)
- [Contexto, alcance y decisiones](producto/01-contexto-alcance-y-decisiones.md)
- [Reglas de negocio y estados](producto/02-reglas-negocio-y-estados.md)
- [Flujos y secuencias](producto/05-flujos-y-secuencias.md)
- [Modelo de dominio y datos](producto/06-modelo-dominio-y-datos.md)
- [UX móvil](producto/10-ux-movil.md)
- [Diccionario de métricas](producto/38-diccionario-metricas.md)
- [Horario de sucursal y cadencia](producto/50-correccion-horario-sucursal-y-cadencia.md)

## Ingeniería — `tecnica/`

- [Arquitectura](tecnica/07-arquitectura.md)
- [Contrato de API](tecnica/08-api.md)
- [Seguridad, roles y auditoría](tecnica/09-seguridad-roles-y-auditoria.md)
- [Stack, PWA y Docker](tecnica/15-stack-pwa-y-docker.md)
- [Política PWA](tecnica/40-politica-pwa-cache-actualizacion.md)
- [Privacidad y retención](tecnica/43-privacidad-retencion-y-datos.md)
- [Modelo de amenazas](tecnica/Peluqueria-threat-model.md)
- [ADR](adr/README.md)

## Diseño — `diseno/`

- [Plan visual aprobado (primera ronda)](diseno/48-plan-rediseño-tailwind-y-movimiento.md)
- [Componentes, accesibilidad y pulido](diseno/51-guia-componentes-accesibilidad-y-pulido.md)
- [Páginas, secciones y roles](diseno/53-guia-paginas-secciones-y-roles.md)
- [Segunda ronda de mejora visual por pantalla](diseno/56-segunda-ronda-pulido-visual.md)

## Operación — `operacion/`

- [Desarrollo local](operacion/23-guia-desarrollo-local.md)
- [Transición desde Google Calendar](operacion/32-transicion-google-calendar.md)
- [Runbooks, respaldo y recuperación](operacion/42-runbooks-operacion-y-recuperacion.md)
- [Checklist de entrega y piloto](operacion/55-checklist-entrega-y-piloto.md)

## Prioridad entre documentos

Si dos documentos parecen contradecirse, prevalecen en este orden:

1. reglas e invariantes de producto vigentes;
2. ADR aceptados;
3. estado actual;
4. convenciones;
5. documentos temáticos.

Principios que nunca cambian silenciosamente: la cita planifica, la atención registra lo ocurrido, el pago del cliente y la comisión son conceptos separados, el historial económico se corrige mediante reversos o ajustes y las mutaciones críticas requieren conexión.
