param(
    # Deletes the local database volume first. Required when the database already has data.
    [switch]$ResetDatabase
)

$ErrorActionPreference = 'Stop'

# Local development only. Replays four weeks of barbershop activity through the
# application services (`--seed-demo`), so every price, commission, inventory movement
# and audit event follows the business rules. Credentials are read from the git-ignored
# .env and passed to the container through the environment, never on the command line.
# Windows PowerShell turns any native stderr line into an error under 'Stop', and docker
# reports progress on stderr, so native commands are judged by their exit code only.
function Invoke-Native {
    param([Parameter(Mandatory)][scriptblock]$Command, [Parameter(Mandatory)][string]$Failure)
    $previous = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        & $Command 2>&1 | ForEach-Object { "$_" }
        $code = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previous
    }
    if ($code -ne 0) { throw $Failure }
}

$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root '.env'
if (-not (Test-Path $envFile)) {
    throw 'Falta el archivo .env en la raíz del repositorio.'
}

$values = @{}
foreach ($line in Get-Content $envFile) {
    if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$') {
        $values[$Matches[1]] = $Matches[2]
    }
}
foreach ($required in 'LOCAL_OWNER_USERNAME', 'LOCAL_OWNER_PASSWORD', 'LOU_DEMO_STAFF_PASSWORD') {
    if ([string]::IsNullOrWhiteSpace($values[$required])) {
        throw "Define $required en .env antes de sembrar datos de prueba."
    }
}

Push-Location $root
try {
    if ($ResetDatabase) {
        Invoke-Native { docker compose down --volumes } 'No se pudo detener el stack local.'
    }

    Invoke-Native { docker compose up -d --build --wait } 'El stack local no quedó saludable.'

    $env:BootstrapOwner__UserName = $values['LOCAL_OWNER_USERNAME']
    $env:BootstrapOwner__Password = $values['LOCAL_OWNER_PASSWORD']
    $env:DemoSeed__StaffPassword = $values['LOU_DEMO_STAFF_PASSWORD']
    Invoke-Native {
        docker compose run --rm --no-deps `
            -e ASPNETCORE_ENVIRONMENT=Development `
            -e BootstrapOwner__UserName `
            -e BootstrapOwner__Password `
            -e DemoSeed__StaffPassword `
            api --seed-demo
    } 'El seed de datos de prueba falló.'

    [ordered]@{
        environment = 'local-development'
        app = 'http://localhost:8088/app/login'
        owner = $values['LOCAL_OWNER_USERNAME']
        staff = @('recepcion.lucia', 'barbero.diego', 'barbero.mateo', 'barbero.lucas')
        staffPassword = 'LOU_DEMO_STAFF_PASSWORD en .env'
    } | ConvertTo-Json
}
finally {
    Remove-Item Env:BootstrapOwner__UserName, Env:BootstrapOwner__Password, Env:DemoSeed__StaffPassword -ErrorAction SilentlyContinue
    Pop-Location
}
