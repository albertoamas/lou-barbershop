# Documentación de producto y desarrollo — Lou Barbershop

Este directorio contiene la especificación de arranque para construir la aplicación web de Lou Barbershop. Está pensada para una barbería de **una sola sucursal**, con un equipo pequeño y uso principalmente móvil.

La documentación convierte el [análisis integral del negocio](../ANALISIS_NEGOCIO_LOU_BARBERSHOP.md) en decisiones funcionales y técnicas implementables. Cuando el contexto original no daba una respuesta, se eligió la alternativa más simple y coherente para el negocio; esas decisiones están registradas en [01-contexto-alcance-y-decisiones.md](01-contexto-alcance-y-decisiones.md).

## Orden recomendado de lectura

1. [Contexto, alcance y decisiones](01-contexto-alcance-y-decisiones.md)
2. [Reglas de negocio y estados](02-reglas-negocio-y-estados.md)
3. [Requisitos y casos de uso](03-requisitos-y-casos-de-uso.md)
4. [Historias de usuario y criterios de aceptación](04-historias-de-usuario.md)
5. [Flujos y diagramas de secuencia](05-flujos-y-secuencias.md)
6. [Modelo de dominio y datos](06-modelo-dominio-y-datos.md)
7. [Arquitectura y decisiones técnicas](07-arquitectura.md)
8. [Contrato inicial de API](08-api.md)
9. [Seguridad, roles y auditoría](09-seguridad-roles-y-auditoria.md)
10. [UX móvil y diseño de interacción](10-ux-movil.md)
11. [Plan de desarrollo y backlog](11-plan-desarrollo.md)
12. [Estrategia de pruebas](12-estrategia-pruebas.md)
13. [Matriz de trazabilidad](13-trazabilidad.md)
14. [Clean Architecture y SOLID](14-clean-architecture-y-solid.md)
15. [Stack tecnológico, PWA y Docker](15-stack-pwa-y-docker.md)
16. [Skills oficiales instaladas](16-skills-instaladas.md)
17. [Plan maestro detallado por fases](17-plan-maestro-fases.md)
18. [Backlog operativo](18-backlog-operativo.md)
19. [Convenciones de trabajo](19-convenciones-trabajo.md)
20. [Datos ficticios](20-datos-ficticios.md)
21. [Wireframes de flujos críticos](21-wireframes-flujos-criticos.md)
22. [Acta de Fase 0 y puerta G0](22-acta-fase-0-g0.md)
23. [Guía de desarrollo local](23-guia-desarrollo-local.md)
24. [Evidencia de Fase 1 y puerta G1](24-evidencia-fase-1-g1.md)

## Convenciones

- **MVP:** alcance necesario para operar el negocio de punta a punta.
- **Posterior:** mejora válida que no bloquea el primer lanzamiento.
- Los importes se almacenan y procesan en **centavos de boliviano** para evitar errores de coma flotante.
- Las fechas y horas operativas se interpretan en `America/La_Paz`.
- Los diagramas Mermaid son documentación conceptual, no código ejecutable.
- Los identificadores `RN`, `RF`, `CU`, `HU`, `RNF` y `ADR` permiten rastrear reglas, requisitos y decisiones.

## Definición de “listo para desarrollar”

Una historia puede entrar en desarrollo cuando tiene criterios de aceptación, reglas relacionadas, permisos definidos, estados afectados y casos de prueba identificables. Una historia está terminada cuando pasa pruebas automáticas y exploratorias, respeta auditoría y permisos, y no rompe los invariantes económicos.

## Principios rectores

1. La cita planifica; la atención registra lo que realmente ocurrió.
2. El cobro del cliente y la deuda de comisión son movimientos diferentes.
3. El dueño es una sola persona con roles de propietario y barbero.
4. El historial económico no se reescribe: se corrige mediante ajustes.
5. La operación cotidiana debe requerir pocos pasos y funcionar bien en teléfono o tablet.
6. La solución será un monolito modular; una sola sucursal no justifica microservicios.
7. La aplicación será PWA y las mutaciones económicas requerirán conexión.
8. Las dependencias apuntan hacia el dominio; frameworks y tecnologías permanecen en adaptadores reemplazables.
