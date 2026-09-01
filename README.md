# Lou Barbershop

Monolito modular para la operación de una barbería de una sola sucursal. Une agenda, atención y economía sin mezclar reserva, operación, cobro, comisión ni liquidación.

## Estado

- Fase 0: completada y aprobada.
- Fase 1: fundación técnica en desarrollo.
- No contiene aún lógica funcional de barbería.

La fuente de verdad del producto está en [docs/README.md](docs/README.md) y el orden de implementación en [docs/17-plan-maestro-fases.md](docs/17-plan-maestro-fases.md).

## Estructura

```text
src/backend/     Clean Architecture en .NET 10
src/frontend/    React + TypeScript + Vite PWA
tests/backend/   pruebas unitarias, de arquitectura e integración
deploy/          contenedores y proxy web
docs/            requisitos, decisiones, UX y plan
```

Consulta [docs/23-guia-desarrollo-local.md](docs/23-guia-desarrollo-local.md) para ejecutar el entorno.
