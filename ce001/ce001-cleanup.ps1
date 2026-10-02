# ce001-cleanup.ps1 - remove all scratch resources from the Pig
$ErrorActionPreference = 'Continue'
Write-Host "=== stopping/removing scratch PG container ==="
docker rm -f ce001-pg 2>&1 | Select-Object -First 2
Write-Host "=== removing scratch dirs and scripts ==="
foreach ($p in @('C:\Users\nolan\ce001-scratch', 'C:\Users\nolan\ce001-explore.ps1', 'C:\Users\nolan\ce001-explore2.ps1',
  'C:\Users\nolan\ce001-explore3.ps1', 'C:\Users\nolan\ce001-read.ps1', 'C:\Users\nolan\ce001-read2.ps1',
  'C:\Users\nolan\ce001-find.ps1', 'C:\Users\nolan\ce001-locate2.ps1', 'C:\Users\nolan\ce001-pgcheck.ps1',
  'C:\Users\nolan\ce001-env.ps1', 'C:\Users\nolan\ce001-pgprobe2.ps1', 'C:\Users\nolan\ce001-pginspect.ps1',
  'C:\Users\nolan\ce001-stage.ps1', 'C:\Users\nolan\ce001-stage2.ps1', 'C:\Users\nolan\ce001-stage3.ps1',
  'C:\Users\nolan\ce001-stage4.ps1', 'C:\Users\nolan\ce001-readstaged.ps1', 'C:\Users\nolan\ce001-readstaged2.ps1')) {
  if (Test-Path $p) { Remove-Item -Recurse -Force $p; Write-Host ("removed: " + $p) }
}
Write-Host "=== verify convergence worktree untouched ==="
Set-Location C:\Users\nolan\ping-convergence-worktree
git rev-parse --abbrev-ref HEAD
git status --porcelain | Select-Object -First 8
Write-Host "=== docker containers now ==="
docker ps --format "{{.Names}}" 2>&1 | Select-Object -First 6
