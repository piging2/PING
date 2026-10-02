# smoke-test.ps1 — live smoke tests for the phase4-eventauth8 gateway.
# Bearer keys are read via docker exec printenv into memory only: never printed,
# logged, or written to disk. Output is status codes and PASS/FAIL labels only.
$ErrorActionPreference = 'Stop'
$base = 'http://localhost:8080'

$k1 = ((docker exec ping-gateway printenv MUSE_LEVEL_1_KEY) | Out-String).Trim()
$k2 = ((docker exec ping-gateway printenv MUSE_LEVEL_2_KEY) | Out-String).Trim()
if (-not $k1 -or -not $k2) { throw 'could not read bearer keys from container' }
Write-Host 'keys loaded (in memory only)'

$script:failCount = 0
function Req($method, $path, $key, $body, $timeoutSec = 60) {
  $headers = @{}
  if ($key) { $headers['Authorization'] = "Bearer $key" }
  $params = @{ Uri = "$base$path"; Method = $method; Headers = $headers; UseBasicParsing = $true; TimeoutSec = $timeoutSec }
  if ($null -ne $body) { $params['Body'] = ($body | ConvertTo-Json -Depth 5 -Compress); $params['ContentType'] = 'application/json' }
  try {
    $r = Invoke-WebRequest @params
    return @{ status = [int]$r.StatusCode; body = "$($r.Content)" }
  } catch {
    $resp = $_.Exception.Response
    if ($resp) { return @{ status = [int]$resp.StatusCode; body = $null } }
    throw $_
  }
}
function Check($name, $actual, $expected) {
  if ($actual -eq $expected) { Write-Host "PASS $name -> $actual" }
  else { Write-Host "FAIL $name -> $actual (expected $expected)"; $script:failCount++ }
}

# 0. new code is live in the running container
$live1 = docker exec ping-gateway sh -c "grep -c MAX_LOOP_ITERATIONS /app/ping-runtime/orchestration/execution/engine.js"
$live2 = docker exec ping-gateway sh -c "grep -c requireLevel2 /app/gateway/routes/orchestration.js"
$live3 = docker exec ping-gateway sh -c "grep -c _chainHeads /app/ping-runtime/orchestration/execution/artifact_store.js"
Write-Host "live-code markers: MAX_LOOP_ITERATIONS=$live1 requireLevel2=$live2 _chainHeads=$live3"
if ($live1 -eq 0 -or $live2 -eq 0 -or $live3 -eq 0) { Write-Host 'FAIL new code not live'; $script:failCount++ }
else { Write-Host 'PASS new code live in container' }

# 1. no creds -> 401
$r = Req 'GET' '/orchestration/engine' $null $null
Check 'T1 no-creds GET /orchestration/engine' $r.status 401

# 2. L1 GET -> 200
$r = Req 'GET' '/orchestration/engine' $k1 $null
Check 'T2 L1 GET /orchestration/engine' $r.status 200

# 3. L1 POST /missions -> 403
$r = Req 'POST' '/orchestration/missions' $k1 @{ type = 'SMOKE' }
Check 'T3 L1 POST /missions' $r.status 403
if ($r.body -and $r.body.Contains('FORBIDDEN')) { Write-Host 'PASS T3 body has FORBIDDEN' } else { Write-Host 'FAIL T3 body missing FORBIDDEN'; $script:failCount++ }

# 4. L2 POST /missions -> 201
$r = Req 'POST' '/orchestration/missions' $k2 @{ type = 'SMOKE_TEST'; description = 'hardening smoke test' }
Check 'T4 L2 POST /missions' $r.status 201
$missionId = $null
if ($r.body) { $missionId = ($r.body | ConvertFrom-Json).missionId }
if ($missionId) { Write-Host "PASS T4 missionId returned" } else { Write-Host 'FAIL T4 no missionId'; $script:failCount++ }

# 5. L1 POST /engine/loop -> 403 (guard on another POST route)
$r = Req 'POST' '/orchestration/engine/loop' $k1 @{ maxIterations = 2 }
Check 'T5 L1 POST /engine/loop' $r.status 403

# 6. forged worker output -> 404
if ($missionId) {
  $r = Req 'POST' "/orchestration/missions/$missionId/output" $k2 @{ workerId = 'forged-worker-xyz'; findings = @(); confidence = 0.99; summary = 'x' }
  Check 'T6 forged workerId POST output' $r.status 404
} else { Write-Host 'SKIP T6 (no missionId)'; $script:failCount++ }

# 7. L2 POST /engine/loop with maxIterations=1000000 -> must complete (clamped to 25)
Write-Host 'T7 starting clamped loop (maxIterations=1000000)...'
$t0 = [datetime]::UtcNow
$r = Req 'POST' '/orchestration/engine/loop' $k2 @{ maxIterations = 1000000; minPriority = 5; missionsPerIteration = 3 } 600
$elapsed = [int]([datetime]::UtcNow - $t0).TotalSeconds
Check 'T7 L2 POST /engine/loop status' $r.status 200
Write-Host "T7 loop call completed in ${elapsed}s (unclamped 1M iterations could not return)"
$maxIter = -1; $nResults = -1
if ($r.body) {
  $j = $r.body | ConvertFrom-Json
  $nResults = $j.results.Count
  foreach ($res in $j.results) { if ($res.iteration -gt $maxIter) { $maxIter = $res.iteration } }
}
Write-Host "T7 results=$nResults maxIterationObserved=$maxIter"
if ($maxIter -le 25) { Write-Host 'PASS T7 max observed iteration <= 25' } else { Write-Host 'FAIL T7 iteration exceeded 25'; $script:failCount++ }

# 8. GET /engine/report still 200 for L1 (reads open)
$r = Req 'GET' '/orchestration/engine/report' $k1 $null
Check 'T8 L1 GET /engine/report' $r.status 200

Write-Host "SMOKE DONE failCount=$script:failCount"
