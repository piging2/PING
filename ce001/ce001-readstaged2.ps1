# ce001-readstaged2.ps1 - read emit() dedup/return + initialize() schemas
$ErrorActionPreference = 'Continue'
$SCRATCH = 'C:\Users\nolan\ce001-scratch'

Write-Host "=== unified_event_runtime.js emit(): dedup + persist + return (lines 140-230) ==="
$uer = Get-Content (Join-Path $SCRATCH 'ping-runtime\events\unified_event_runtime.js')
for ($i = 140; $i -lt 230 -and $i -lt $uer.Count; $i++) { "{0}: {1}" -f ($i+1), $uer[$i] }

Write-Host ""
Write-Host "=== UER initialize() ==="
$s = -1
for ($i = 0; $i -lt $uer.Count; $i++) { if ($uer[$i] -match 'async initialize\(') { $s = $i; break } }
if ($s -ge 0) { for ($i = $s; $i -lt $s + 60 -and $i -lt $uer.Count; $i++) { "{0}: {1}" -f ($i+1), $uer[$i] } }

Write-Host ""
Write-Host "=== mission_runtime.js initialize() ==="
$mr = Get-Content (Join-Path $SCRATCH 'ping-runtime\orchestration\mission_runtime.js')
$s2 = -1
for ($i = 0; $i -lt $mr.Count; $i++) { if ($mr[$i] -match 'async initialize\(') { $s2 = $i; break } }
if ($s2 -ge 0) { for ($i = $s2; $i -lt $s2 + 60 -and $i -lt $mr.Count; $i++) { "{0}: {1}" -f ($i+1), $mr[$i] } }
