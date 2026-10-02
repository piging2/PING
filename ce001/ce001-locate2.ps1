# ce001-locate2.ps1 - determine which checkout owns the convergence completion code
$ErrorActionPreference = 'Continue'

Write-Host "=== C:\Users\nolan\PING: is ping-runtime tracked? branch? ==="
Set-Location C:\Users\nolan\PING
git rev-parse --abbrev-ref HEAD
git ls-files ping-runtime/orchestration/mission_runtime.js ping-runtime/events/unified_event_runtime.js
Write-Host "--- full status (untracked summary) ---"
git status --porcelain | Select-Object -First 8
$untracked = git status --porcelain | Where-Object { $_ -match '^\?\?' }
Write-Host ("untracked entries: " + $untracked.Count)
$untracked | Select-Object -First 10

Write-Host ""
Write-Host "=== C:\Users\nolan\PING-promotion: branch + status ==="
Set-Location C:\Users\nolan\PING-promotion
git rev-parse --abbrev-ref HEAD
git rev-parse --short HEAD
git status --porcelain | Select-Object -First 8
git ls-files ping-runtime/orchestration/mission_runtime.js ping-runtime/events/unified_event_runtime.js

Write-Host ""
Write-Host "=== convergence worktree: does ANY branch have ping-runtime tracked? ==="
Set-Location C:\Users\nolan\ping-convergence-worktree
foreach ($b in @('constitutional-convergence','constitutional-convergence-v2','main')) {
  $r = git ls-tree -r $b --name-only 2>$null | Select-String -Pattern 'ping-runtime/orchestration/mission_runtime\.js' | Select-Object -First 1
  Write-Host ("branch " + $b + ": " + ($(if ($r) { "HAS mission_runtime.js" } else { "absent" })))
}
