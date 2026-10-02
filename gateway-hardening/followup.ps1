# followup.ps1 — (a) 403 body contains FORBIDDEN; (b) does /engine/compile yield
# pending missions (priority >= 5) so the loop clamp can be exercised live?
$ErrorActionPreference = 'Stop'
$base = 'http://localhost:8080'
$k1 = ((docker exec ping-gateway printenv MUSE_LEVEL_1_KEY) | Out-String).Trim()
$k2 = ((docker exec ping-gateway printenv MUSE_LEVEL_2_KEY) | Out-String).Trim()

# (a) capture the 403 response body
try {
  Invoke-WebRequest -Uri "$base/orchestration/missions" -Method POST `
    -Headers @{ Authorization = "Bearer $k1" } `
    -Body (@{ type = 'SMOKE' } | ConvertTo-Json) `
    -ContentType 'application/json' -UseBasicParsing | Out-Null
  Write-Host 'FOLLOWUP-A unexpected 2xx'
} catch {
  $code = [int]$_.Exception.Response.StatusCode
  $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
  $body = $sr.ReadToEnd()
  $sr.Close()
  Write-Host "FOLLOWUP-A status=$code body=$body"
}

# (b) compile missions and inspect priorities
$r = Invoke-WebRequest -Uri "$base/orchestration/engine/compile" -Method POST `
  -Headers @{ Authorization = "Bearer $k2" } `
  -Body (@{} | ConvertTo-Json) -ContentType 'application/json' -UseBasicParsing
$j = $r.Content | ConvertFrom-Json
Write-Host "FOLLOWUP-B compiled=$($j.compiled)"
$hi = @($j.missions | Where-Object { $_.priority -ge 5 })
Write-Host "FOLLOWUP-B with priority>=5: $($hi.Count)"
$j.missions | Select-Object -First 5 | ForEach-Object { Write-Host "  mission $($_.id) priority=$($_.priority) type=$($_.type)" }
