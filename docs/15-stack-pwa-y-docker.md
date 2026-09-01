# Stack tecnológico, PWA y Docker

## 1. Stack definido

### Backend

- **Lenguaje:** C#.
- **Runtime:** .NET 10 LTS, con último parche soportado de la línea 10 al construir.
- **Delivery:** ASP.NET Core 10 REST API con Controllers delgados, `ProblemDetails` y OpenAPI.
- **Persistencia (adaptador):** Entity Framework Core 10 + proveedor Npgsql.
- **Identidad (adaptador):** ASP.NET Core Identity con cookies seguras para usuarios internos.
- **Base de datos:** PostgreSQL 18, fijando parche e imagen por digest en producción.
- **Validación de entrada:** validadores en el borde; reglas de dominio dentro del núcleo.
- **Pruebas:** xUnit, biblioteca de aserciones acordada, Testcontainers para PostgreSQL y pruebas de arquitectura.
- **Observabilidad:** logging estructurado, OpenTelemetry y Sentry como adaptadores.

### Frontend/PWA

- **Lenguaje:** TypeScript estricto.
- **Runtime de herramientas:** Node.js 24 LTS.
- **UI:** React 19.2.
- **Build:** Vite.
- **PWA:** Workbox mediante integración de Vite, manifest y service worker versionado.
- **Rutas:** React Router.
- **Estado del servidor:** TanStack Query.
- **Formularios/esquemas:** React Hook Form + Zod.
- **Estilos:** Tailwind CSS con componentes accesibles propios; no adoptar un kit pesado como dependencia del dominio.
- **Pruebas:** Vitest + Testing Library; Playwright para E2E.
- **Componentes/calidad visual:** Storybook y pruebas automatizadas de accesibilidad con Axe.

### Plataforma

- Docker Engine y Docker Compose v2.
- Reverse proxy TLS en producción (Caddy o proxy administrado por el proveedor).
- GitHub Actions para CI si el repositorio se aloja en GitHub.
- Monorepo para versionar frontend, backend, migraciones y contratos juntos.

## 2. Razones de elección

- .NET/C# ofrece tipos fuertes, buen soporte transaccional y límites de proyectos claros para Clean Architecture.
- PostgreSQL soporta restricciones de rangos, transacciones e informes requeridos por agenda/economía.
- React/Vite permite una PWA móvil independiente del backend y reemplazable.
- REST/OpenAPI mantiene un contrato explícito sin ligar frontend a implementación del servidor.
- Docker hace reproducibles desarrollo, CI y producción.
- El stack tiene capacidad de sobra sin requerir microservicios, Kubernetes ni infraestructura empresarial.

## 3. Versionado

La versión mayor/menor elegida queda fijada arriba. Al inicializar el código:

- `global.json` fija SDK .NET 10 y política de roll-forward de parche.
- `package.json` fija `engines.node` a la línea 24 y el lockfile fija paquetes exactos.
- las imágenes Docker se fijan por versión de parche; producción añade digest SHA.
- dependencias se actualizan con PR automatizado, pruebas y revisión, nunca flotando a `latest`.

Al 31 de agosto de 2026, .NET 10 es LTS activa, Node 24 es LTS, React 19.2 es la línea documentada y PostgreSQL 18 es la versión actual. Fuentes oficiales:

- [.NET support policy](https://dotnet.microsoft.com/en-us/platform/support/policy)
- [Node.js 24 LTS releases](https://nodejs.org/en/download/archive/v24)
- [React versions](https://react.dev/versions)
- [PostgreSQL current documentation](https://www.postgresql.org/docs/)

## 4. Alcance PWA

La PWA es requisito del producto, no una mejora opcional.

### Instalable

- manifest con `name`, `short_name`, iconos 192/512, `start_url`, `display: standalone`, colores y orientación flexible;
- iconos maskable y accesos directos útiles (`Nueva cita`, `Mi día`) cuando sean estables;
- service worker con actualización controlada;
- HTTPS obligatorio fuera de localhost.

### Estrategia de caché

- **Cache first:** iconos, fuentes propias y assets versionados.
- **Stale while revalidate:** catálogos no sensibles de lectura.
- **Network first con timeout:** agenda y paneles; puede mostrar última lectura marcada como desactualizada.
- **Network only:** crear/reprogramar cita, cobrar, modificar inventario, gasto, comisión, liquidación, roles y reversos.

### Offline

- La aplicación abre y explica que está sin conexión.
- Puede mostrar el shell y última agenda consultada con marca “Información guardada; puede estar desactualizada”.
- No permite confirmar reservas ni operaciones económicas offline.
- No usa background sync para cobros o liquidaciones.
- Los formularios no económicos pueden conservar borrador local; nunca tokens, contraseñas ni datos sensibles persistentes.
- Al volver la conexión, refresca datos antes de permitir una mutación crítica.

### Actualizaciones

Cuando existe nueva versión, se informa y se activa al terminar una tarea. Nunca se reemplaza el service worker en medio de un cobro. Se conserva compatibilidad de API durante el despliegue o se aplica orden de despliegue seguro.

## 5. Estructura del monorepo

```text
LouBarbershop/
  src/
    backend/
      LouBarbershop.slnx
      LouBarbershop.Domain/
      LouBarbershop.Application/
      LouBarbershop.Infrastructure/
      LouBarbershop.Api/
    frontend/
      src/core/
      src/infrastructure/
      src/presentation/
      src/composition/
  tests/
    backend/
    frontend/
    e2e/
  deploy/
    docker/
      api.Dockerfile
      web.Dockerfile
      Caddyfile
      caddy/main.go
  docs/
  compose.yaml
  compose.dev.yaml
  .env.example
  global.json
  Directory.Build.props
  package.json
  package-lock.json
```

## 6. Contenedores

### Desarrollo

| Servicio | Función | Exposición |
|---|---|---|
| `db` | PostgreSQL 18 | solo red Docker; puerto local opcional |
| `api` | ASP.NET Core con recarga | puerto interno y local de desarrollo |
| `web` | Vite dev server | navegador local |
| `mail` | no se incluye | no hay correo en MVP |

El código se monta para recarga; paquetes NuGet/npm usan volúmenes de caché. La base usa volumen nombrado. `compose.dev.yaml` contiene solo diferencias de desarrollo.

### Producción

| Servicio | Función |
|---|---|
| `proxy` | TLS, compresión, assets y enrutamiento `/api` |
| `web` | archivos estáticos PWA inmutables |
| `api` | imagen runtime no root |
| `db` | PostgreSQL o servicio administrado compatible |

Para una sola sucursal se prefiere PostgreSQL administrado si el presupuesto lo permite; Docker sigue siendo la unidad reproducible para API/web y el entorno local.

## 7. Reglas para Dockerfiles

- Builds multi-stage.
- Imágenes base oficiales con versión fija.
- Restauración de dependencias antes de copiar todo para aprovechar caché.
- Publicación de backend `Release` y frontend estático.
- Usuario no root en runtime.
- Sistema de archivos de contenedor de aplicación de solo lectura cuando sea viable.
- Sin SDK, gestores de paquetes ni secretos en imagen final.
- Caddy se compila en una etapa aislada con versión y dependencias fijadas; la imagen final contiene solo el binario, certificados y assets PWA.
- `.dockerignore` para Git, builds, secretos y dependencias locales.
- Healthcheck real: liveness no consulta DB; readiness sí verifica dependencias críticas con timeout.
- Señales y apagado ordenado.

## 8. Compose esperado

`compose.yaml` define red privada, volúmenes, healthchecks, dependencias por salud y variables sin secretos reales. La API no comienza migraciones peligrosas automáticamente en cada réplica; CI/CD ejecuta un job de migración único antes de cambiar tráfico.

Variables mínimas documentadas en `.env.example`:

```dotenv
APP_ENVIRONMENT=Development
APP_TIME_ZONE=America/La_Paz
APP_CURRENCY=BOB
DATABASE_HOST=db
DATABASE_PORT=5432
DATABASE_NAME=lou_barbershop
DATABASE_USER=lou_app
DATABASE_PASSWORD=change-me-locally
API_BASE_URL=http://localhost:8080
SENTRY_DSN=
```

`.env.example` no contiene secretos. `.env` queda ignorado.

## 9. CI/CD

1. Restauración bloqueada por lockfiles.
2. Formato, analyzers y lint.
3. Pruebas de dominio, aplicación, frontend y arquitectura.
4. Integración con PostgreSQL efímero.
5. E2E Playwright contra composición de prueba.
6. Build PWA y auditoría de manifest/service worker.
7. Build de imágenes, SBOM y escaneo de vulnerabilidades.
8. Publicar imágenes inmutables por SHA.
9. Migrar staging y ejecutar smoke tests.
10. Promoción manual a producción, backup y migración controlada.

## 10. Definition of Done adicional para PWA/Docker

- Lighthouse/validación equivalente confirma instalabilidad.
- Iconos y manifest correctos.
- Pruebas online/offline/update.
- Ninguna mutación crítica se encola offline.
- Imágenes construyen desde cero y arrancan con healthchecks.
- Aplicación ejecuta como usuario no root.
- No aparecen secretos en imagen, layers o bundle frontend.
- Restauración de base ensayada.
