$ErrorActionPreference = 'Stop'
# Run after seed-acceptance.ps1, against the disposable image-based environment only.
$acceptanceUrl = 'http://127.0.0.1:8091'
$token = Invoke-RestMethod "$acceptanceUrl/api/v1/auth/antiforgery" -SessionVariable acceptanceSession
Invoke-RestMethod "$acceptanceUrl/api/v1/auth/login" -Method Post -WebSession $acceptanceSession -Headers @{ 'X-CSRF-TOKEN' = $token.token } -ContentType 'application/json' -Body (@{ userName = 'acceptance-admin'; password = 'Acceptance-admin!8426' } | ConvertTo-Json) | Out-Null
# Regression: the production Alpine runtime must resolve America/La_Paz (not just the SDK test image).
$date = [TimeZoneInfo]::ConvertTimeBySystemTimeZoneId([DateTimeOffset]::UtcNow, 'America/La_Paz').ToString('yyyy-MM-dd')
$agenda = Invoke-RestMethod "$acceptanceUrl/api/v1/appointments?dateFrom=$date&dateTo=$date" -WebSession $acceptanceSession
Write-Output "PASS: authenticated agenda in production runtime; business date $date; $(@($agenda).Count) appointments."
