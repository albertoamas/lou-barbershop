param(
    [string]$BaseUrl = 'http://127.0.0.1:8088'
)

$ErrorActionPreference = 'Stop'

# Development-only fixtures. Passwords must be supplied by the local shell and are never stored here.
$ownerPassword = $env:LOU_DEMO_OWNER_PASSWORD
$staffPassword = $env:LOU_DEMO_STAFF_PASSWORD
if ([string]::IsNullOrWhiteSpace($ownerPassword) -or [string]::IsNullOrWhiteSpace($staffPassword)) {
    throw 'Define LOU_DEMO_OWNER_PASSWORD y LOU_DEMO_STAFF_PASSWORD antes de ejecutar el seed local.'
}

$baseApiUrl = "$($BaseUrl.TrimEnd('/'))/api/v1"
$token = Invoke-RestMethod "$baseApiUrl/auth/antiforgery" -SessionVariable demoSession
Invoke-RestMethod "$baseApiUrl/auth/login" -Method Post -WebSession $demoSession `
    -Headers @{ 'X-CSRF-TOKEN' = $token.token } -ContentType 'application/json' `
    -Body (@{ userName = 'owner.demo'; password = $ownerPassword } | ConvertTo-Json) | Out-Null

function Invoke-DemoApi {
    param(
        [Parameter(Mandatory)][ValidateSet('GET', 'POST', 'PUT', 'PATCH')][string]$Method,
        [Parameter(Mandatory)][string]$Path,
        [object]$Body
    )

    $arguments = @{
        Uri = "$baseApiUrl/$Path"
        Method = $Method
        WebSession = $demoSession
    }
    if ($Method -ne 'GET') {
        $csrf = Invoke-RestMethod "$baseApiUrl/auth/antiforgery" -WebSession $demoSession
        $arguments.Headers = @{ 'X-CSRF-TOKEN' = $csrf.token }
        $arguments.ContentType = 'application/json'
        $arguments.Body = $Body | ConvertTo-Json -Depth 8
    }
    Invoke-RestMethod @arguments
}

function Ensure-DemoUser {
    param([string]$UserName, [string[]]$Roles)

    $users = Invoke-DemoApi GET 'users'
    $user = $users.Where({ $_.userName -eq $UserName }, 'First')
    if ($null -eq $user) {
        return Invoke-DemoApi POST 'users' @{ userName = $UserName; password = $staffPassword; roles = $Roles }
    }

    return $user
}

function Ensure-Staff {
    param([object]$User, [string]$DisplayName)

    $staffMembers = Invoke-DemoApi GET 'staff'
    $staff = $staffMembers.Where({ $_.userId -eq $User.id }, 'First')
    if ($null -eq $staff) {
        return Invoke-DemoApi POST 'staff' @{ userId = $User.id; displayName = $DisplayName; phone = $null }
    }
    return $staff
}

function Ensure-Barber {
    param([object]$Staff, [string]$Color)

    $barbers = Invoke-DemoApi GET 'barbers'
    $barber = $barbers.Where({ $_.staffProfileId -eq $Staff.id }, 'First')
    if ($null -eq $barber) {
        return Invoke-DemoApi POST 'barbers' @{
            staffProfileId = $Staff.id
            employmentType = 'CONTRACTOR'
            settlementFrequency = 'BIWEEKLY'
            color = $Color
        }
    }
    return $barber
}

function Ensure-Service {
    param([string]$Name, [string]$Description, [int]$DurationMinutes, [long]$PriceCents)

    $services = Invoke-DemoApi GET 'services'
    $service = $services.Where({ $_.name -eq $Name }, 'First')
    if ($null -eq $service) {
        return Invoke-DemoApi POST 'services' @{
            name = $Name
            description = $Description
            defaultDurationMinutes = $DurationMinutes
            defaultPriceCents = $PriceCents
        }
    }
    return $service
}

function Ensure-Schedule {
    param([object]$Barber, [int]$Weekday, [string]$Start, [string]$End)

    $schedules = Invoke-DemoApi GET "barbers/$($Barber.id)/schedules"
    $existing = $schedules.Where({
        $_.active -and $_.weekday -eq $Weekday -and $_.startLocalTime -eq $Start -and $_.endLocalTime -eq $End
    }, 'First')
    if ($null -eq $existing) {
        Invoke-DemoApi POST "barbers/$($Barber.id)/schedules" @{
            weekday = $Weekday
            startLocalTime = $Start
            endLocalTime = $End
            validFrom = '2026-09-01'
            validTo = $null
        } | Out-Null
    }
}

function Disable-OutOfHoursSchedules {
    param([object]$Barber)

    $morningStart = [TimeSpan]::Parse('08:00:00')
    $morningEnd = [TimeSpan]::Parse('13:00:00')
    $afternoonStart = [TimeSpan]::Parse('15:00:00')
    $afternoonEnd = [TimeSpan]::Parse('21:00:00')
    $schedules = Invoke-DemoApi GET "barbers/$($Barber.id)/schedules"
    foreach ($schedule in $schedules.Where({ $_.active })) {
        $start = [TimeSpan]::Parse($schedule.startLocalTime)
        $end = [TimeSpan]::Parse($schedule.endLocalTime)
        $insideMorning = $start -ge $morningStart -and $end -le $morningEnd
        $insideAfternoon = $start -ge $afternoonStart -and $end -le $afternoonEnd
        if (-not ($insideMorning -or $insideAfternoon)) {
            Invoke-DemoApi PATCH "barbers/$($Barber.id)/schedules/$($schedule.id)" @{
                weekday = $schedule.weekday
                startLocalTime = $schedule.startLocalTime
                endLocalTime = $schedule.endLocalTime
                validFrom = $schedule.validFrom
                validTo = $schedule.validTo
                active = $false
                version = $schedule.version
            } | Out-Null
        }
    }
}

function Ensure-Offering {
    param([object]$Barber, [object]$Service, [int]$DurationMinutes, [long]$PriceCents)

    $offerings = Invoke-DemoApi GET "barbers/$($Barber.id)/offerings"
    $existing = $offerings.Where({
        $_.active -and $_.serviceId -eq $Service.id
    }, 'First')
    if ($null -eq $existing) {
        Invoke-DemoApi POST "barbers/$($Barber.id)/offerings" @{
            serviceId = $Service.id
            durationMinutes = $DurationMinutes
            priceCents = $PriceCents
            validFrom = '2026-09-01'
            validTo = $null
        } | Out-Null
    }
}

function Ensure-CommissionRule {
    param([object]$Barber, [int]$RateBasisPoints)

    $rules = Invoke-DemoApi GET "barbers/$($Barber.id)/commission-rules"
    $existing = $rules.Where({
        $_.active -and $_.kind -eq 'SERVICE'
    }, 'First')
    if ($null -eq $existing) {
        Invoke-DemoApi POST "barbers/$($Barber.id)/commission-rules" @{
            kind = 'SERVICE'
            rateBasisPoints = $RateBasisPoints
            validFrom = '2026-09-01'
            validTo = $null
        } | Out-Null
    }
}

$admin = Ensure-DemoUser 'admin.demo' @('ADMIN')
$diegoUser = Ensure-DemoUser 'barber.diego' @('BARBER')
$mateoUser = Ensure-DemoUser 'barber.mateo' @('BARBER')
$diego = Ensure-Barber (Ensure-Staff $diegoUser 'Diego Demo') '#36454F'
$mateo = Ensure-Barber (Ensure-Staff $mateoUser 'Mateo Demo') '#7A1F2B'

Disable-OutOfHoursSchedules $diego
Disable-OutOfHoursSchedules $mateo
foreach ($day in 2..6) {
    Ensure-Schedule $diego $day '10:00:00' '13:00:00'
    Ensure-Schedule $diego $day '15:00:00' '19:00:00'
}
foreach ($day in @(1, 3, 5)) {
    Ensure-Schedule $mateo $day '09:00:00' '13:00:00'
    Ensure-Schedule $mateo $day '15:00:00' '17:00:00'
}

$services = @(
    Ensure-Service 'Corte clásico demo' 'Corte tradicional con terminación limpia.' 45 6000
    Ensure-Service 'Barba demo' 'Perfilado y acabado de barba.' 30 3500
    Ensure-Service 'Corte y barba demo' 'Servicio completo de corte y barba.' 75 9000
    Ensure-Service 'Diseño demo' 'Detalle y diseño con máquina.' 30 3000
)

foreach ($service in $services) {
    Ensure-Offering $diego $service $service.defaultDurationMinutes $service.defaultPriceCents
    Ensure-Offering $mateo $service $service.defaultDurationMinutes $service.defaultPriceCents
}
Ensure-CommissionRule $diego 5000
Ensure-CommissionRule $mateo 4500

$customers = Invoke-DemoApi GET 'customers?query=%2B59170000001'
$customer = $customers.Where({ $true }, 'First')
if ($null -eq $customer) {
    $customer = Invoke-DemoApi POST 'customers' @{
        displayName = 'Ana Prueba'
        phone = '+59170000001'
        notes = 'Cliente ficticio para pruebas locales.'
    }
}

[ordered]@{
    environment = 'local-development'
    baseUrl = $BaseUrl
    owner = 'owner.demo'
    admin = $admin.userName
    barbers = @($diegoUser.userName, $mateoUser.userName)
    publicServices = $services.Count
    bookingUrl = "$($BaseUrl.TrimEnd('/'))/reservar"
} | ConvertTo-Json -Depth 4
