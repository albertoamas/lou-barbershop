[CmdletBinding()]
param(
    [string] $DockerExecutable = 'docker'
)

$ErrorActionPreference = 'Stop'
$repository = Split-Path -Parent $PSScriptRoot
$composeFile = Join-Path $PSScriptRoot 'compose.acceptance.yaml'
$project = 'lou-rollback-check'
$knownApi = 'lou-barbershop-api:rollback-known-good'
$knownWeb = 'lou-barbershop-web:rollback-known-good'
$previousApiImage = $env:LOU_API_IMAGE
$previousWebImage = $env:LOU_WEB_IMAGE

function Invoke-Docker {
    param([Parameter(ValueFromRemainingArguments)] [string[]] $Arguments)

    & $DockerExecutable @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Docker falló: $($Arguments -join ' ')"
    }
}

function Wait-HttpOk {
    param([string] $Uri)

    foreach ($attempt in 1..30) {
        try {
            $response = Invoke-WebRequest -Uri $Uri -TimeoutSec 2
            if ($response.StatusCode -eq 200) { return }
        }
        catch {
            Start-Sleep -Milliseconds 500
        }
    }

    throw "El endpoint no quedó sano: $Uri"
}

Push-Location $repository
try {
    Invoke-Docker image tag lou-barbershop-api:latest $knownApi
    Invoke-Docker image tag lou-barbershop-web:latest $knownWeb
    $env:LOU_API_IMAGE = $knownApi
    $env:LOU_WEB_IMAGE = $knownWeb

    Invoke-Docker compose --project-name $project --file $composeFile up --detach
    Wait-HttpOk 'http://127.0.0.1:8091/health/ready'

    $env:LOU_WEB_IMAGE = 'alpine:3.24'
    Invoke-Docker compose --project-name $project --file $composeFile up --detach --no-deps web
    Start-Sleep -Seconds 1
    $runningCandidate = @(& $DockerExecutable compose --project-name $project --file $composeFile ps --status running --quiet web)
    if (($runningCandidate -join '').Trim()) {
        throw 'El candidato deliberadamente inválido no falló como se esperaba.'
    }

    $env:LOU_WEB_IMAGE = $knownWeb
    Invoke-Docker compose --project-name $project --file $composeFile up --detach --no-deps web
    Wait-HttpOk 'http://127.0.0.1:8091/'
    Write-Output "ROLLBACK_OK project=$project restored=$knownWeb"
}
finally {
    & $DockerExecutable compose --project-name $project --file $composeFile down --volumes --remove-orphans 2>$null | Out-Null
    & $DockerExecutable image rm $knownApi $knownWeb 2>$null | Out-Null
    if ($null -eq $previousApiImage) { Remove-Item Env:LOU_API_IMAGE -ErrorAction SilentlyContinue }
    else { $env:LOU_API_IMAGE = $previousApiImage }
    if ($null -eq $previousWebImage) { Remove-Item Env:LOU_WEB_IMAGE -ErrorAction SilentlyContinue }
    else { $env:LOU_WEB_IMAGE = $previousWebImage }
    Pop-Location
}
