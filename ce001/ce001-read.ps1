# ce001-read.ps1 - read the completion path sources at current HEAD
$ErrorActionPreference = 'Continue'
Set-Location C:\Users\nolan\ping-convergence-worktree

Write-Host "=== locate mission_runtime.js / unified_event_runtime.js / mission_scheduler.js ==="
git ls-files | Select-String -Pattern 'mission_runtime|unified_event_runtime|mission_scheduler' | Where-Object { $_ -notmatch 'node_modules|dist/|vendor|\.d\.ts|\.next' } | Select-Object -First 12

Write-Host ""
Write-Host "=== mission_runtime.js complete() ==="
$f = git ls-files | Select-String -Pattern 'ping-runtime/orchestration/mission_runtime\.js' | Select-Object -First 1
if ($f) { $lines = Get-Content $f; for ($i=160; $i -lt 210 -and $i -lt $lines.Count; $i++) { "{0}: {1}" -f ($i+1), $lines[$i] } }

Write-Host ""
Write-Host "=== unified_event_runtime.js emit identity (lines ~130-160) ==="
$f2 = git ls-files | Select-String -Pattern 'ping-runtime/events/unified_event_runtime\.js' | Select-Object -First 1
if ($f2) { $lines = Get-Content $f2; for ($i=120; $i -lt 175 -and $i -lt $lines.Count; $i++) { "{0}: {1}" -f ($i+1), $lines[$i] } }

Write-Host ""
Write-Host "=== mission_scheduler.js complete call site (~334-360) ==="
$f3 = git ls-files | Select-String -Pattern 'ping-runtime/orchestration/mission_scheduler\.js' | Select-Object -First 1
if ($f3) { $lines = Get-Content $f3; for ($i=330; $i -lt 360 -and $i -lt $lines.Count; $i++) { "{0}: {1}" -f ($i+1), $lines[$i] } }
