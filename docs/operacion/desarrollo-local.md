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

## Datos de prueba

`deploy/seed-demo.ps1` llena la base local con cuatro semanas de actividad realista: equipo (dueño, recepción y tres barberos), catálogo, 60 clientes, citas en todos los estados, cobros en efectivo, QR y mixtos, ventas de productos, compras, gastos, un cobro revertido y liquidaciones pagadas, cerradas y en borrador. Hoy queda con citas completadas, en atención, esperando y confirmadas, y la próxima semana con reservas.

```powershell
# Primera vez o para empezar de cero (borra la base local):
.\deploy\seed-demo.ps1 -ResetDatabase
```

Requiere en `.env`: `LOCAL_OWNER_USERNAME`, `LOCAL_OWNER_PASSWORD` y `LOU_DEMO_STAFF_PASSWORD`. Las cuentas del equipo son `recepcion.lucia`, `barbero.diego`, `barbero.mateo` y `barbero.lucas`, con la contraseña `LOU_DEMO_STAFF_PASSWORD`.

El seed ejecuta la API con `--seed-demo`. Ese modo solo funciona con `ASPNETCORE_ENVIRONMENT=Development`. Simula cada día con un reloj controlado y usa los servicios de la aplicación, sin escribir en la base directamente, así que precios, comisiones, inventario y auditoría cumplen las reglas de negocio. Se niega a correr si la base ya tiene personal. Los datos son deterministas: misma fecha, mismos datos.

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

## Verificaciones de recuperación y volumen

Con el stack principal sano, estas pruebas crean entornos aislados y se limpian al terminar:

```powershell
.\deploy\verify-backup-restore.ps1
.\deploy\benchmark-100k.ps1
.\deploy\verify-application-rollback.ps1
```

Para conservar manualmente un dump local use `backup.ps1` con una ruta explícita dentro de `backups/`. Ese directorio está ignorado, pero el dump contiene datos confidenciales y nunca debe subirse al repositorio.
