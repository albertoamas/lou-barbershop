[CmdletBinding()]
param(
    [string] $DockerExecutable = 'docker'
)

$ErrorActionPreference = 'Stop'
$repository = Split-Path -Parent $PSScriptRoot
$runId = [Guid]::NewGuid().ToString('N').Substring(0, 12)
$container = "lou-restore-$runId"
$restorePassword = [Guid]::NewGuid().ToString('N')
$tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
$workDirectory = Join-Path $tempRoot "lou-restore-$runId"
$backupPath = Join-Path $workDirectory 'source.dump'
$integritySql = @'
SELECT jsonb_build_object(
  'migrations', (SELECT count(*) FROM lou."__EFMigrationsHistory"),
  'customers', (SELECT count(*) FROM lou.customers),
  'appointments', (SELECT count(*) FROM lou.appointments),
  'operations', (SELECT count(*) FROM lou.sale_operations),
  'payments', (SELECT count(*) FROM lou.payments),
  'commissions', (SELECT count(*) FROM lou.commission_entries),
  'settlements', (SELECT count(*) FROM lou.settlements),
  'movements', (SELECT count(*) FROM lou.inventory_movements),
  'expenses', (SELECT count(*) FROM lou.expenses),
  'audit', (SELECT count(*) FROM lou.audit_logs)
)::text;
'@

New-Item -ItemType Directory -Path $workDirectory | Out-Null
Push-Location $repository
try {
    & (Join-Path $PSScriptRoot 'backup.ps1') -OutputPath $backupPath -DockerExecutable $DockerExecutable

    & $DockerExecutable run --detach --name $container `
        --env POSTGRES_DB=restore `
        --env POSTGRES_USER=restore `
        --env "POSTGRES_PASSWORD=$restorePassword" `
        --tmpfs /var/lib/postgresql `
        postgres:18.6-alpine3.24 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo iniciar PostgreSQL aislado.' }

    $ready = $false
    foreach ($attempt in 1..30) {
        & $DockerExecutable exec $container pg_isready --username restore --dbname restore 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) { $ready = $true; break }
        Start-Sleep -Seconds 1
    }
    if (-not $ready) { throw 'PostgreSQL aislado no quedó listo.' }

    & $DockerExecutable cp $backupPath "${container}:/tmp/source.dump"
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo copiar el backup al contenedor aislado.' }
    & $DockerExecutable exec $container pg_restore --exit-on-error --no-owner --no-acl --username restore --dbname restore /tmp/source.dump
    if ($LASTEXITCODE -ne 0) { throw 'La restauración falló.' }

    $source = ($integritySql | & $DockerExecutable compose exec -T db sh -c 'psql --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" --tuples-only --no-align').Trim()
    $restored = (& $DockerExecutable exec $container psql --username restore --dbname restore --tuples-only --no-align --command $integritySql).Trim()
    if ($LASTEXITCODE -ne 0 -or $source -ne $restored) {
        throw "La huella restaurada no coincide. source=$source restored=$restored"
    }

    Write-Output "RESTORE_OK fingerprint=$restored"
}
finally {
    & $DockerExecutable rm --force $container 2>$null | Out-Null
    Pop-Location
    $resolvedWork = [IO.Path]::GetFullPath($workDirectory)
    $workLeaf = Split-Path -Leaf $resolvedWork
    if (
        $resolvedWork.StartsWith($tempRoot, [StringComparison]::OrdinalIgnoreCase) -and
        $workLeaf.StartsWith('lou-restore-', [StringComparison]::Ordinal)
    ) {
        Remove-Item -LiteralPath $resolvedWork -Recurse -Force -ErrorAction SilentlyContinue
    }
}
