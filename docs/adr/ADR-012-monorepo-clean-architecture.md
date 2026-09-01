# ADR-012 — Monorepo con Clean Architecture y composición explícita

- **Estado:** Accepted
- **Fecha:** 2026-08-31
- **Fase:** 0

## Contexto

La aplicación combina API .NET, PWA React, contratos, migraciones, pruebas y Docker. Se quiere conservar reglas ante cambios tecnológicos sin añadir microservicios.

## Decisión

Mantener todo en un monorepo con estos límites principales:

```text
src/backend/
  LouBarbershop.Domain
  LouBarbershop.Application
  LouBarbershop.Infrastructure
  LouBarbershop.Api
src/frontend/
  core
  infrastructure
  presentation
  composition
tests/
deploy/
docs/
```

Dirección backend:

```text
Api ───────→ Application ───────→ Domain
Infrastructure ────────────────→ Application/Domain
```

React, ASP.NET Core, EF Core, PostgreSQL, Workbox y observabilidad son adaptadores. El composition root conecta puertos con implementaciones.

## Razones

- Versionar contrato, frontend y backend de forma atómica.
- Facilitar un entorno Docker y CI único.
- Refactorizar reglas sin red ni framework.
- Evitar complejidad de repositorios/microservicios para una sucursal.

## Reglas obligatorias

- Domain no referencia Application/Infrastructure/Api ni paquetes tecnológicos.
- Application solo referencia Domain y define puertos específicos.
- Infrastructure implementa puertos; no contiene casos de uso.
- Api no accede directamente a persistencia.
- `core` frontend no importa React, Workbox ni cliente HTTP concreto.
- No se comparte el modelo de dominio C# con TypeScript mediante generación opaca; se comparte el contrato OpenAPI y conceptos documentados.

## Alternativas rechazadas

- **Microservicios:** transacciones y operación innecesariamente complejas.
- **Repositorios separados:** aumenta coordinación sin equipos independientes.
- **Arquitectura por capas técnicas genéricas sin módulos:** dificulta rastrear slices.

## Consecuencias

- CI debe entender dos toolchains.
- Se necesitan pruebas de arquitectura y reglas de imports.
- Algunas clases de mapeo/DTO son duplicación deliberada para proteger fronteras.

## Verificación

- Tests de referencias .NET.
- ESLint boundaries frontend.
- PR falla por ciclos o imports prohibidos.
- Casos de uso se prueban sin host web/base real.

