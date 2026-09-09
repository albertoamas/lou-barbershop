[CmdletBinding()]
param(
    [string] $DockerExecutable = 'docker',
    [int] $OperationCount = 100000,
    [int] $MaximumYearQueryMilliseconds = 2000
)

$ErrorActionPreference = 'Stop'
if ($OperationCount -lt 1 -or $OperationCount -gt 250000) { throw 'OperationCount debe estar entre 1 y 250000.' }

$repository = Split-Path -Parent $PSScriptRoot
$runId = [Guid]::NewGuid().ToString('N').Substring(0, 12)
$container = "lou-benchmark-$runId"
$benchmarkPassword = [Guid]::NewGuid().ToString('N')
$tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
$workDirectory = Join-Path $tempRoot "lou-benchmark-$runId"
$backupPath = Join-Path $workDirectory 'source.dump'
$seedSql = @"
INSERT INTO lou.users
  (id, active, created_at, updated_at, user_name, normalized_user_name,
   email_confirmed, phone_number_confirmed, two_factor_enabled,
   lockout_enabled, access_failed_count, security_stamp, concurrency_stamp)
VALUES
  ('12000000-0000-0000-0000-000000000001', true, now(), now(),
   'phase12-benchmark', 'PHASE12-BENCHMARK', false, false, false, true, 0,
   'synthetic-security-stamp', 'synthetic-concurrency-stamp')
ON CONFLICT (id) DO NOTHING;

INSERT INTO lou.staff_profiles
  (id, user_id, display_name, phone, active, created_at, updated_at)
VALUES
  ('12000000-0000-0000-0000-000000000002',
   '12000000-0000-0000-0000-000000000001', 'Barbero sintético F12', NULL,
   true, now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO lou.barber_profiles
  (id, staff_profile_id, employment_type, settlement_frequency, color,
   active, created_at, updated_at)
VALUES
  ('12000000-0000-0000-0000-000000000003',
   '12000000-0000-0000-0000-000000000002', 'OWNER', 'MONTHLY', '#31523A',
   true, now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO lou.customers
  (id, display_name, phone_e164, notes, active, created_at, updated_at)
VALUES
  ('12000000-0000-0000-0000-000000000004', 'Cliente sintético F12',
   '+59170000001', NULL, true, now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO lou.services
  (id, name, description, default_duration_minutes, default_price_cents,
   active, created_at, updated_at)
VALUES
  ('12000000-0000-0000-0000-000000000005', 'Servicio sintético F12', NULL,
   45, 6000, true, now(), now())
ON CONFLICT (id) DO NOTHING;

WITH base AS (
  SELECT
    '12000000-0000-0000-0000-000000000001'::uuid user_id,
    '12000000-0000-0000-0000-000000000004'::uuid customer_id,
    '12000000-0000-0000-0000-000000000003'::uuid barber_id
), generated AS (
  SELECT
    g,
    md5('phase12-operation-' || g)::uuid id,
    timestamptz '2021-09-10 12:00:00+00'
      + (g % 1825) * interval '1 day'
      + (g % 480) * interval '1 minute' occurred_at
  FROM generate_series(1, $OperationCount) g
)
INSERT INTO lou.sale_operations
  (id, appointment_id, customer_id, barber_id, origin, status, subtotal_cents,
   discount_cents, courtesy_cents, total_cents, adjustment_reason, created_by,
   opened_at, paid_at, updated_at, reversal_reason, reversed_at, reversed_by)
SELECT generated.id, NULL, base.customer_id, base.barber_id, 'WalkIn', 'Paid', 6000,
       0, 0, 6000, NULL, base.user_id, generated.occurred_at,
       generated.occurred_at, generated.occurred_at, NULL, NULL, NULL
FROM generated CROSS JOIN base;

WITH base AS (
  SELECT
    '12000000-0000-0000-0000-000000000003'::uuid barber_id,
    '12000000-0000-0000-0000-000000000005'::uuid service_id
), generated AS (
  SELECT g, md5('phase12-operation-' || g)::uuid operation_id
  FROM generate_series(1, $OperationCount) g
)
INSERT INTO lou.sale_items
  (id, operation_id, service_id, description_snapshot, unit_price_cents,
   barber_id, product_id, quantity, type, unit_cost_cents)
SELECT md5('phase12-item-' || g)::uuid, operation_id, base.service_id,
       'Servicio sintético F12', 6000, base.barber_id, NULL, 1, 'Service', 0
FROM generated CROSS JOIN base;

WITH base AS (SELECT '12000000-0000-0000-0000-000000000001'::uuid user_id),
generated AS (
  SELECT g, md5('phase12-operation-' || g)::uuid operation_id,
         timestamptz '2021-09-10 12:00:00+00'
           + (g % 1825) * interval '1 day'
           + (g % 480) * interval '1 minute' occurred_at
  FROM generate_series(1, $OperationCount) g
)
INSERT INTO lou.payments (id, operation_id, method, amount_cents, recorded_by, paid_at)
SELECT md5('phase12-payment-' || g)::uuid, operation_id, 'Cash', 6000,
       base.user_id, occurred_at
FROM generated CROSS JOIN base;

ANALYZE lou.sale_operations;
ANALYZE lou.sale_items;
ANALYZE lou.payments;
"@
$yearQuery = @'
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT o.id, o.paid_at, o.total_cents,
       COALESCE(sum(i.unit_price_cents * i.quantity), 0) item_total,
       COALESCE(sum(p.amount_cents), 0) payment_total
FROM lou.sale_operations o
LEFT JOIN lou.sale_items i ON i.operation_id = o.id
LEFT JOIN lou.payments p ON p.operation_id = o.id
WHERE o.status = 'Paid'
  AND o.paid_at >= timestamptz '2025-09-10 00:00:00+00'
  AND o.paid_at < timestamptz '2026-09-10 00:00:00+00'
GROUP BY o.id, o.paid_at, o.total_cents
ORDER BY o.paid_at;
'@

New-Item -ItemType Directory -Path $workDirectory | Out-Null
Push-Location $repository
try {
    & (Join-Path $PSScriptRoot 'backup.ps1') -OutputPath $backupPath -DockerExecutable $DockerExecutable
    & $DockerExecutable run --detach --name $container `
        --env POSTGRES_DB=benchmark `
        --env POSTGRES_USER=benchmark `
        --env "POSTGRES_PASSWORD=$benchmarkPassword" `
        --tmpfs /var/lib/postgresql `
        postgres:18.6-alpine3.24 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo iniciar PostgreSQL de benchmark.' }

    $ready = $false
    foreach ($attempt in 1..30) {
        & $DockerExecutable exec $container pg_isready --username benchmark --dbname benchmark 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) { $ready = $true; break }
        Start-Sleep -Seconds 1
    }
    if (-not $ready) { throw 'PostgreSQL de benchmark no quedó listo.' }

    & $DockerExecutable cp $backupPath "${container}:/tmp/source.dump"
    & $DockerExecutable exec $container pg_restore --exit-on-error --no-owner --no-acl --username benchmark --dbname benchmark /tmp/source.dump
    if ($LASTEXITCODE -ne 0) { throw 'La restauración de benchmark falló.' }

    & $DockerExecutable exec $container psql --username benchmark --dbname benchmark --set ON_ERROR_STOP=1 --command $seedSql | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'La carga sintética falló.' }

    $planJson = (& $DockerExecutable exec $container psql --username benchmark --dbname benchmark --tuples-only --no-align --command $yearQuery) -join "`n"
    if ($LASTEXITCODE -ne 0) { throw 'La consulta de benchmark falló.' }
    $plan = $planJson | ConvertFrom-Json
    $elapsed = [double]$plan[0].'Execution Time'
    $rows = [int]$plan[0].Plan.'Actual Rows'
    if ($elapsed -gt $MaximumYearQueryMilliseconds) {
        throw "Benchmark excedido: ${elapsed}ms > ${MaximumYearQueryMilliseconds}ms."
    }

    Write-Output "BENCHMARK_OK operations=$OperationCount yearRows=$rows databaseMs=$elapsed thresholdMs=$MaximumYearQueryMilliseconds"
}
finally {
    & $DockerExecutable rm --force $container 2>$null | Out-Null
    Pop-Location
    $resolvedWork = [IO.Path]::GetFullPath($workDirectory)
    $workLeaf = Split-Path -Leaf $resolvedWork
    if (
        $resolvedWork.StartsWith($tempRoot, [StringComparison]::OrdinalIgnoreCase) -and
        $workLeaf.StartsWith('lou-benchmark-', [StringComparison]::Ordinal)
    ) {
        Remove-Item -LiteralPath $resolvedWork -Recurse -Force -ErrorAction SilentlyContinue
    }
}
