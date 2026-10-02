# ce001-explore2.ps1 - find the completion/lease machinery
$ErrorActionPreference = 'Continue'
Set-Location C:\Users\nolan\ping-convergence-worktree

Write-Host "=== identity_authority.js head ==="
Get-Content gateway/identity_authority.js | Select-Object -First 80

Write-Host ""
Write-Host "=== files mentioning lease ==="
git grep -l 'lease' -- '*.js' '*.ts' | Where-Object { $_ -notmatch 'node_modules|dist/|vendor' } | Select-Object -First 25

Write-Host ""
Write-Host "=== files mentioning completion as domain concept ==="
git grep -il 'completion' -- '*.js' '*.ts' | Where-Object { $_ -notmatch 'node_modules|dist/|vendor|\.d\.ts' } | Select-Object -First 25
