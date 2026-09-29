# Lou Barbershop

PWA para una barbería de una sola sucursal. Integra agenda, atención, cobro, inventario y comisiones sin mezclar sus responsabilidades contables.

## Estado

- aplicación funcional y validada localmente;
- rediseño visual 00–14 aprobado;
- 102/102 pruebas backend y 116/116 frontend; formato, lint y build limpios;
- MFA, sesión acotada, reserva antiabuso, privacidad y CI/CodeQL endurecidos;
- Docker, 17 migraciones y restauración de backup verificados;
- despliegue productivo, dominio, TLS, secretos y backups externos todavía pendientes.

El resumen vigente está en [docs/ESTADO-ACTUAL.md](docs/ESTADO-ACTUAL.md). La documentación completa comienza en [docs/README.md](docs/README.md).

## Ejecutar localmente

```powershell
docker compose up -d --build
```

Abrir:

- sitio público: `http://localhost:8088/`;
- reserva: `http://localhost:8088/reservar`;
- acceso del equipo: `http://localhost:8088/app/login`.

Las credenciales de demostración permanecen sólo en el `.env` local ignorado. Consulta la [guía de desarrollo local](docs/operacion/23-guia-desarrollo-local.md) para migraciones, datos ficticios y diagnóstico.

## Estructura

```text
src/backend/     Clean Architecture en .NET 10
src/frontend/    React 19 + TypeScript + Tailwind 4 + Vite PWA
tests/backend/   pruebas de dominio, aplicación, arquitectura e integración
deploy/          Docker, Compose, Caddy, backups y verificaciones
docs/            documentación vigente organizada por tema e historial archivado
```
