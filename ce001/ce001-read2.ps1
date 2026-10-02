# ce001-read2.ps1 - locate the current MissionRuntime / event runtime implementations
$ErrorActionPreference = 'Continue'
Set-Location C:\Users\nolan\ping-convergence-worktree

Write-Host "=== class MissionRuntime ==="
git grep -l 'class MissionRuntime' -- '*.js' '*.ts' | Where-Object { $_ -notmatch 'node_modules|dist/|vendor|\.d\.ts|\.next' } | Select-Object -First 10

Write-Host ""
Write-Host "=== MISSION_COMPLETED references ==="
git grep -l 'MISSION_COMPLETED' -- '*.js' '*.ts' | Where-Object { $_ -notmatch 'node_modules|dist/|vendor|\.d\.ts|\.next' } | Select-Object -First 15

Write-Host ""
Write-Host "=== ping_events / ping_missions schema references ==="
git grep -l 'ping_missions' -- '*.js' '*.ts' '*.sql' | Where-Object { $_ -notmatch 'node_modules|dist/|vendor|\.d\.ts|\.next' } | Select-Object -First 15

Write-Host ""
Write-Host "=== logical_id channel ==="
git grep -l 'logical_id\|logicalId' -- '*.js' '*.ts' | Where-Object { $_ -notmatch 'node_modules|dist/|vendor|\.d\.ts|\.next' } | Select-Object -First 15
