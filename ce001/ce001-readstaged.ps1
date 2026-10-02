# ce001-readstaged.ps1 - read the staged v2 completion path sources
$ErrorActionPreference = 'Continue'
$SCRATCH = 'C:\Users\nolan\ce001-scratch'

Write-Host "=== mission_runtime.js: complete() ==="
$mr = Get-Content (Join-Path $SCRATCH 'ping-runtime\orchestration\mission_runtime.js')
$start = -1
for ($i = 0; $i -lt $mr.Count; $i++) { if ($mr[$i] -match 'async complete\(|complete\(missionId') { $start = $i; break } }
if ($start -ge 0) { for ($i = $start; $i -lt $start + 55 -and $i -lt $mr.Count; $i++) { "{0}: {1}" -f ($i+1), $mr[$i] } }
else { Write-Host "complete() not found by pattern; searching..."; Select-String -Pattern 'complete' -Path (Join-Path $SCRATCH 'ping-runtime\orchestration\mission_runtime.js') | Select-Object -First 10 }

Write-Host ""
Write-Host "=== unified_event_runtime.js: emit() identity ==="
$uer = Get-Content (Join-Path $SCRATCH 'ping-runtime\events\unified_event_runtime.js')
$s2 = -1
for ($i = 0; $i -lt $uer.Count; $i++) { if ($uer[$i] -match 'async emit\(|emit\(eventType|logical_id') { $s2 = $i; break } }
if ($s2 -ge 0) { for ($i = $s2; $i -lt $s2 + 70 -and $i -lt $uer.Count; $i++) { "{0}: {1}" -f ($i+1), $uer[$i] } }

Write-Host ""
Write-Host "=== reapExpiredLeases in mission_runtime ==="
Select-String -Pattern 'reapExpiredLeases|async reap' -Path (Join-Path $SCRATCH 'ping-runtime\orchestration\mission_runtime.js') | Select-Object -First 5
