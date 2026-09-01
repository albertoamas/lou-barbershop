# ADR-010 — ASP.NET Core Web API con Controllers

- **Estado:** Accepted
- **Fecha:** 2026-08-31
- **Fase:** 0

## Contexto

La PWA React necesita una API JSON versionada. Se evaluaron Minimal APIs y Controllers. El dominio no debe depender de ninguno; la elección afecta solamente el adaptador HTTP.

## Decisión

Usar ASP.NET Core 10 Web API con Controllers delgados, `ControllerBase`, `[ApiController]`, rutas por atributos, DTOs explícitos, `ProblemDetails` y OpenAPI.

Los Controllers:

1. autentican/autorizan en el borde;
2. reciben y validan forma del contrato;
3. mapean a comando/consulta Application;
4. ejecutan un caso de uso;
5. traducen el resultado a HTTP.

No calculan disponibilidad, precio, total, comisión, inventario ni liquidación y no acceden a `DbContext`.

## Razones

- Superficie API amplia y organizada por recursos/capacidades.
- Convenciones maduras de `[ApiController]`, filtros y contratos.
- Autorización y documentación visibles en el borde.
- Mayor trazabilidad para un proyecto que crecerá por slices.

## Alternativas rechazadas

- **Minimal APIs:** técnicamente válidas, pero se prefirió organización uniforme con Controllers para esta superficie. No ofrecen una ventaja que justifique dos estilos.
- **MVC con vistas/Razor:** la interfaz será una PWA React independiente.
- **GraphQL:** agrega complejidad sin una necesidad de consultas arbitrarias.

## Consecuencias

- Algo más de ceremonia que Minimal APIs.
- Controllers deben permanecer delgados y cubiertos por pruebas de API.
- Entidades EF/dominio nunca se exponen como contratos.
- No se mezclan Minimal APIs dentro de features; health checks pueden usar endpoints de infraestructura integrados.

## Verificación

- Prueba de arquitectura prohíbe `DbContext` en `Api` excepto composition/migration host autorizado.
- Revisión comprueba que cada acción delega en un caso de uso.
- OpenAPI y pruebas de integración verifican contratos y códigos.

