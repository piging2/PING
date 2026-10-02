# followup2.ps1 — raw 403 response dump (curl -i) + event-delta clamp proof.
# Keys in memory only; never printed.
$ErrorActionPreference = 'Stop'
$base = 'http://localhost:8080'
$k1 = ((docker exec ping-gateway printenv MUSE_LEVEL_1_KEY) | Out-String).Trim()
$k2 = ((docker exec ping-gateway printenv MUSE_LEVEL_2_KEY) | Out-String).Trim()

Write-Host '--- raw 403 response ---'
$env:CURL_KEY = $k1
curl.exe -s -i -X POST "$base/orchestration/missions" -H "Authorization: Bearer $env:CURL_KEY" -H 'Content-Type: application/json' -d '{"type":"SMOKE"}'
$env:CURL_KEY = $null
Write-Host ''
Write-Host '--- end raw ---'

function EventsTotal($key) {
  $r = Invoke-WebRequest -Uri "$base/orchestration/engine" -Headers @{ Authorization = "Bearer $key" } -UseBasicParsing
  return ($r.Content | ConvertFrom-Json).events.total
}
function Loop($key, $maxIt, $timeoutSec) {
  Invoke-WebRequest -Uri "$base/orchestration/engine/loop" -Method POST `
    -Headers @{ Authorization = "Bearer $key" } `
    -Body (@{ maxIterations = $maxIt; minPriority = 5; missionsPerIteration = 3 } | ConvertTo-Json) `
    -ContentType 'application/json' -UseBasicParsing -TimeoutSec $timeoutSec | Out-Null
}

$e0 = EventsTotal $k1
Write-Host "events before control loop: $e0"
Loop $k2 3 300
$e1 = EventsTotal $k1
Write-Host "events after maxIterations=3: $e1 (delta $($e1 - $e0))"

$t0 = [datetime]::UtcNow
Loop $k2 1000000 600
$elapsed = [int]([datetime]::UtcNow - $t0).TotalSeconds
$e2 = EventsTotal $k1
Write-Host "events after maxIterations=1000000: $e2 (delta $($e2 - $e1)) in ${elapsed}s"
