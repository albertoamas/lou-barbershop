# Guía de desarrollo local

## Requisitos

- Git.
- .NET SDK 10.0.400 o compatible según `global.json`.
- Node.js 24 LTS.
- Docker Desktop con Compose v2 para el entorno completo.

No se versionan contraseñas reales. Copiar `.env.example` a `.env` y cambiar la contraseña local antes de usar Compose. `.env` está ignorado.

## Entorno completo

```powershell
Copy-Item .env.example .env
docker compose up --build
```

La PWA queda en `http://localhost:8088`. El proxy sirve web y reenvía `/api` y `/health` a la API por la red privada. PostgreSQL no se publica salvo al combinar el archivo de desarrollo:

```powershell
docker compose -f compose.yaml -f compose.dev.yaml up --build
```

## Backend sin contenedores

```powershell
dotnet tool restore
dotnet restore LouBarbershop.slnx
dotnet build LouBarbershop.slnx
dotnet test LouBarbershop.slnx
dotnet run --project src/backend/LouBarbershop.Api
```

La configuración local incluida solo contiene una credencial descartable de desarrollo. Para cualquier secreto local diferente usar User Secrets o `ConnectionStrings__Database`; staging/producción usan el almacén de secretos de la plataforma.

Endpoints:

- `/health/live`: comprueba que el proceso responde; no depende de PostgreSQL.
- `/health/ready`: comprueba que PostgreSQL acepta conexiones.
- `/openapi/v1.json`: contrato técnico disponible solo en Development.

## Frontend sin contenedores

```powershell
Set-Location src/frontend
npm ci
npm run dev
```

Vite abre `http://localhost:5173` y reenvía API/health a `http://localhost:8080`.

Los iconos PNG requeridos para la instalación PWA se derivan de `public/icon.svg`. Si cambia el icono fuente, regenerarlos y versionarlos:

```powershell
npm run icons:generate
```

El pipeline vuelve a generarlos y falla si el resultado no coincide con los archivos versionados.

## Migraciones

```powershell
dotnet ef migrations add NombreDescriptivo `
  --project src/backend/LouBarbershop.Infrastructure `
  --startup-project src/backend/LouBarbershop.Api `
  --output-dir Persistence/Migrations
```

En Compose, el servicio efímero `migrate` ejecuta migraciones antes de iniciar la API. La aplicación normal no altera el esquema al arrancar.

## Comprobación antes de un cambio

```powershell
dotnet format LouBarbershop.slnx --verify-no-changes
dotnet build LouBarbershop.slnx --configuration Release
dotnet test LouBarbershop.slnx --configuration Release
Set-Location src/frontend
npm run format:check
npm run lint
npm run test
npm run build
```

Los errores de negocio, cuando existan, usarán `ProblemDetails`. Cada respuesta de error incluirá `requestId`, que sirve para correlacionar el incidente sin registrar datos personales.
