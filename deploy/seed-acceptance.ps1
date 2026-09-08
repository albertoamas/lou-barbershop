$ErrorActionPreference = 'Stop'
# Synthetic fixtures for deploy/compose.acceptance.yaml only. No operational endpoint is accepted.
$acceptanceUrl = 'http://127.0.0.1:8091'
$token = Invoke-RestMethod "$acceptanceUrl/api/v1/auth/antiforgery" -SessionVariable acceptanceSession
Invoke-RestMethod "$acceptanceUrl/api/v1/auth/login" -Method Post -WebSession $acceptanceSession -Headers @{ 'X-CSRF-TOKEN' = $token.token } -ContentType 'application/json' -Body (@{ userName = 'acceptance-owner'; password = 'Acceptance-owner!8426' } | ConvertTo-Json) | Out-Null
function Send-Acceptance($path, $body) {
    $csrf = Invoke-RestMethod "$acceptanceUrl/api/v1/auth/antiforgery" -WebSession $acceptanceSession
    Invoke-RestMethod "$acceptanceUrl/api/v1/$path" -Method Post -WebSession $acceptanceSession -Headers @{ 'X-CSRF-TOKEN' = $csrf.token } -ContentType 'application/json' -Body ($body | ConvertTo-Json -Depth 8)
}
$admin = Send-Acceptance 'users' @{ userName = 'acceptance-admin'; password = 'Acceptance-admin!8426'; roles = @('ADMIN') }
$barbers = @()
foreach ($item in @(@{ user = 'acceptance-alex'; name = 'Alex QA' }, @{ user = 'acceptance-diego'; name = 'Diego QA' })) {
    $user = Send-Acceptance 'users' @{ userName = $item.user; password = 'Acceptance-barber!8426'; roles = @('BARBER') }
    $staff = Send-Acceptance 'staff' @{ userId = $user.id; displayName = $item.name }
    $barber = Send-Acceptance 'barbers' @{ staffProfileId = $staff.id; employmentType = 'CONTRACTOR'; settlementFrequency = 'BIWEEKLY' }
    $barbers += $barber
    foreach ($day in 1..7) {
        Send-Acceptance "barbers/$($barber.id)/schedules" @{ weekday = $day; startLocalTime = '09:00'; endLocalTime = '18:00'; validFrom = '2026-09-01' } | Out-Null
    }
}
$cut = Send-Acceptance 'services' @{ name = 'Corte QA'; defaultDurationMinutes = 45; defaultPriceCents = 6000 }
$beard = Send-Acceptance 'services' @{ name = 'Barba QA'; defaultDurationMinutes = 30; defaultPriceCents = 4000 }
$customer = Send-Acceptance 'customers' @{ displayName = 'Martín QA'; phone = '71234567'; notes = 'Nota ficticia de administración' }
@{ adminId = $admin.id; alexId = $barbers[0].id; diegoId = $barbers[1].id; cutId = $cut.id; beardId = $beard.id; customerId = $customer.customer.id } | ConvertTo-Json
