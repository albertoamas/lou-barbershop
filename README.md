# Lou Barbershop

Monolito modular para la operación de una barbería de una sola sucursal. Une agenda, atención y economía sin mezclar reserva, operación, cobro, comisión ni liquidación.

## Estado

- Fases 0 y 2–5: aprobadas; Fase 1 conserva la excepción de trabajo local sin staging.
- Fase 6: clientes y agenda interna implementados, en aceptación operativa ([acta G6](docs/31-acta-fase-6-g6.md)).
- Disponible en local: identidad/roles, maestros, horarios/disponibilidad, clientes y citas. Cobro, inventario operativo y liquidaciones todavía pertenecen a fases posteriores.
- Con Docker activo: `docker compose up --build -d`; abrir `http://localhost:8088/agenda` e ingresar con una cuenta interna. No se incluyen credenciales reales en el repositorio.

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
