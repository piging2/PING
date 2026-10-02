# ce001-explore.ps1 - explore the convergence worktree for completion-identity code
$ErrorActionPreference = 'Continue'
Set-Location C:\Users\nolan\ping-convergence-worktree

Write-Host "=== tracked files matching identity/completion/hash/canonical ==="
git ls-files | Select-String -Pattern 'identity|completion|hash|canonical' | Select-Object -First 60

Write-Host ""
Write-Host "=== directories at repo root ==="
Get-ChildItem -Directory | Select-Object -ExpandProperty Name

Write-Host ""
Write-Host "=== grep for IdentityAuthority definitions ==="
git grep -l 'IdentityAuthority' -- '*.js' '*.ts' | Select-Object -First 20

Write-Host ""
Write-Host "=== grep for completion identity / completionId ==="
git grep -l 'completionId\|completion_identity\|completionIdentity' -- '*.js' '*.ts' | Select-Object -First 20

Write-Host ""
Write-Host "=== Date.now in likely completion paths ==="
git grep -n 'Date\.now()' -- '*completion*' '*identity*' | Select-Object -First 20

Write-Host ""
Write-Host "=== package.json test script ==="
if (Test-Path package.json) { Get-Content package.json | Select-Object -First 40 }
