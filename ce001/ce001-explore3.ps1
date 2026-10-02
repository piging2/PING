# ce001-explore3.ps1 - hunt for the completion/lease/accept machinery
$ErrorActionPreference = 'Continue'
Set-Location C:\Users\nolan\ping-convergence-worktree

Write-Host "=== grep: lease_reap / crash-after-accept / emit-before-check terms ==="
git grep -il 'lease_reap\|leaseReap\|crash.after.accept\|emit.before.check\|reconciler' -- '*.js' '*.ts' '*.md' | Where-Object { $_ -notmatch 'node_modules|dist/|vendor|\.d\.ts|\.next' } | Select-Object -First 25

Write-Host ""
Write-Host "=== grep: accept (mission/worker acceptance) ==="
git grep -il 'mission.*accept\|accept.*mission\|worker.*completion\|completion.*worker' -- '*.js' '*.ts' | Where-Object { $_ -notmatch 'node_modules|dist/|vendor|\.d\.ts|\.next' } | Select-Object -First 25

Write-Host ""
Write-Host "=== mission runtime files ==="
git ls-files | Select-String -Pattern 'mission' | Where-Object { $_ -notmatch 'node_modules|dist/|vendor|\.d\.ts|\.next' } | Select-Object -First 30
