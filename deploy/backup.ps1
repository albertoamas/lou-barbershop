[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string] $OutputPath,
    [string] $DockerExecutable = 'docker',
    [switch] $Force
)

$ErrorActionPreference = 'Stop'
$outputFullPath = [IO.Path]::GetFullPath($OutputPath)
$parent = Split-Path -Parent $outputFullPath
if (-not (Test-Path -LiteralPath $parent -PathType Container)) {
    throw "La carpeta de destino no existe: $parent"
}
if ((Test-Path -LiteralPath $outputFullPath) -and -not $Force) {
    throw 'El backup ya existe. Usa -Force únicamente si decidiste reemplazar ese archivo exacto.'
}

$remotePath = "/tmp/lou-backup-$([Guid]::NewGuid().ToString('N')).dump"
$repository = Split-Path -Parent $PSScriptRoot
Push-Location $repository
try {
    & $DockerExecutable compose exec -T db sh -c "pg_dump --format=custom --compress=9 --no-owner --no-acl --username=`"`$POSTGRES_USER`" --dbname=`"`$POSTGRES_DB`" --file=$remotePath"
    if ($LASTEXITCODE -ne 0) { throw 'pg_dump no pudo crear la copia.' }

    & $DockerExecutable compose cp "db:$remotePath" $outputFullPath
    if ($LASTEXITCODE -ne 0) { throw 'Docker no pudo copiar el backup al host.' }

    $item = Get-Item -LiteralPath $outputFullPath
    if ($item.Length -le 0) { throw 'El archivo de backup quedó vacío.' }
    Write-Output "BACKUP_OK path=$outputFullPath bytes=$($item.Length)"
}
finally {
    & $DockerExecutable compose exec -T db rm -f -- $remotePath 2>$null
    Pop-Location
}
