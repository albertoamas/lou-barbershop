# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Lou Barbershop is a PWA for a single-branch barbershop: agenda, service operations, checkout, inventory, commissions and settlements. `AGENTS.md` holds the binding repo rules. Read it along with `docs/README.md` and `docs/estado-actual.md` (current status and next steps) before starting work. The MVP build phases are closed. Business docs are in Spanish. Code, identifiers, commits and API contracts are in English. UI text is in Spanish. `AGENTS.md` says to use `apply_patch`. That instruction is for Codex, so use the Edit tool here.

## Commands

The shell is PowerShell on Windows. If git reports "dubious ownership", the `.git` folder was created by another OS user. Ask the user before running `git config --global --add safe.directory`.

Full stack (Postgres + migrate job + API + Caddy/web) at `http://localhost:8088`:

```powershell
Copy-Item .env.example .env          # first time only
docker compose up -d --build
docker compose -f compose.yaml -f compose.dev.yaml up --build   # also publishes Postgres :5432, API in Development
```

Backend (solution file is `LouBarbershop.slnx`):

```powershell
dotnet tool restore                  # dotnet-ef
dotnet build LouBarbershop.slnx
dotnet test LouBarbershop.slnx
dotnet test tests/backend/LouBarbershop.Domain.Tests --filter "FullyQualifiedName~MoneyTests"   # single class/test
dotnet run --project src/backend/LouBarbershop.Api     # http://localhost:8080; /openapi/v1.json in Development only
dotnet ef migrations add <Name> --project src/backend/LouBarbershop.Infrastructure --startup-project src/backend/LouBarbershop.Api --output-dir Persistence/Migrations
```

`LouBarbershop.Integration.Tests` uses Testcontainers (real PostgreSQL) and `WebApplicationFactory`, so Docker must be running. The API also accepts `--migrate`, which applies migrations and exits. Compose's `migrate` service uses this. The app never migrates on normal startup.

Frontend (`src/frontend`, Node 24):

```powershell
npm ci
npm run dev                          # Vite on :5173, proxies /api and /health to :8080
npm run test                         # vitest run
npx vitest run src/core/mutations/canExecuteCriticalMutation.test.ts   # single file
npm run lint                         # eslint --max-warnings 0 + oxlint
npm run format:check                 # prettier
npm run build                        # tsc -b && vite build
npm run storybook
npm run icons:generate               # after changing public/icon.svg; CI fails if committed PNGs differ
```

Pre-commit gate, which mirrors CI in `.github/workflows/ci.yml`:

```powershell
dotnet format LouBarbershop.slnx --verify-no-changes
dotnet build LouBarbershop.slnx --configuration Release
dotnet test LouBarbershop.slnx --configuration Release
# then in src/frontend: npm run format:check; npm run lint; npm run test; npm run build
```

To fix formatting instead of only checking it, run `dotnet format LouBarbershop.slnx` and, in `src/frontend`, `npx prettier --write src`.

`Directory.Build.props` sets `TreatWarningsAsErrors`, `latest-recommended` analyzers and `EnforceCodeStyleInBuild`, so analyzer or style violations break the build.

Operational scripts in `deploy/` need a healthy stack. They include `verify-backup-restore.ps1`, `verify-application-rollback.ps1`, `benchmark-100k.ps1`, `seed-local-demo.ps1` and `backup.ps1`. Acceptance testing runs on a disposable stack at `http://127.0.0.1:8091` (`deploy/compose.acceptance.yaml`). Run `seed-acceptance.ps1` first, then `test-acceptance-runtime.ps1`. Demo credentials live only in the git-ignored `.env`. Migrations, demo data and troubleshooting are covered in `docs/operacion/desarrollo-local.md`.

## Architecture

**Backend** (`src/backend`, .NET 10, Clean Architecture, modular monolith):

- `Domain`: entities, value objects (`Finance/Money`, `Scheduling/TimeRange`), state enums and transitions, and `DomainResult`/`DomainError`. It has no framework references.
- `Application`: one folder per module (Agenda, Sales, Inventory, Commissions, Scheduling, PublicBooking, Reporting, Configuration). Each module has a `*Service`, `*Contracts` (DTOs plus a `*Result<T>`/`*Status` result type) and store ports. Cross-cutting ports live in `Abstractions/`: `IClock`, `IIdGenerator`, `IUnitOfWork` and the current actor.
- `Infrastructure`: EF Core/Npgsql `AppDbContext`, one `Ef*Store` per module implementing the Application ports, migrations in `Persistence/Migrations`, ASP.NET Identity, audit log, `SystemClock` and `GuidIdGenerator`.
- `Api`: thin controllers. Each module has a `*ControllerBase` whose `Respond()` maps the module's result status to HTTP (`Forbidden`→403, `NotFound`→404, `Conflict`→409, else 400 `ProblemDetails` with a `code` extension). Controllers never touch `DbContext`. Auth is cookie-based and same-origin (ADR-011).
- `LouBarbershop.Architecture.Tests` inspects the compiled Domain and Application assemblies and fails if they reference ASP.NET Core, EF Core, Npgsql, Infrastructure or Api.

**Frontend** (`src/frontend/src`, React 19 + strict TS + Tailwind 4 + TanStack Query + Zod + vite-plugin-pwa). `eslint-plugin-boundaries` enforces the layers:

- `core/`: framework-free domain logic and ports per feature. It must not import React, `@tanstack/*` or other layers.
- `infrastructure/`: HTTP clients, browser and PWA adapters. It may import `core`.
- `presentation/`: pages, components, hooks and styles. It may import `core` and `infrastructure`. Components never call `fetch` directly.
- `composition/App.tsx`: wiring root.

**Runtime**: Caddy (`deploy/docker/Caddyfile`) serves the SPA and reverse-proxies `/api` and `/health` to the API on an internal network. Routes are `/` (public site), `/reservar` (public booking) and `/app/login` (staff). `/health/live` doesn't touch the DB. `/health/ready` checks PostgreSQL.

## Domain invariants (do not violate)

- Appointment (cita), operation (atención económica), payment, commission and settlement are separate concepts and tables.
- Money is `Money`/`long` cents (`BIGINT`), and rates are basis points. Never use `double`/`float`. Timestamps are `TIMESTAMPTZ`. The clinic timezone is `America/La_Paz`.
- Economic history is never deleted or edited in place. Corrections go through reversals or adjustments.
- The backend recalculates price, totals, permissions, inventory and commission. Input DTOs never carry authoritative prices, rates or totals.
- Economic mutations and bookings require connectivity. The frontend gates them with `core/mutations/canExecuteCriticalMutation`.
- Domain code never calls `DateTime.Now` or `Guid.NewGuid()`. It uses `IClock`/`IIdGenerator`.
- The API lives under `/api/v1`, uses camelCase JSON, ISO 8601 dates and amounts in cents. Errors are `ProblemDetails` with `code` and `requestId`. Never log secrets or personal data.
- SQL names are snake_case with named constraints. Use `AsNoTracking` for read-only queries.

## Conventions

- Follow `docs/convenciones.md`. C# uses file-scoped namespaces and `sealed` by default. Use records for contracts, entities with private setters, and `CancellationToken` plus the `Async` suffix on I/O.
- Use Conventional Commits with scopes `agenda|sales|inventory|commissions|auth|pwa|infra`, and one intent per commit or PR. The PR template is in `.github/PULL_REQUEST_TEMPLATE.md`.
- A behavior change needs tests. A bug fix adds a test that failed before the fix. Update ADRs (`docs/adr/`), OpenAPI, migrations and docs when they're affected.
- New infrastructure (queues, Redis, microservices, Kubernetes) needs an approved ADR first.
- Completed phase records and old plans were removed from `docs/`. Recover them from git history if needed instead of recreating them.
