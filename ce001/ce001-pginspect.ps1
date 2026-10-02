# ce001-pginspect.ps1 - inspect the pg module dir
$ErrorActionPreference = 'Continue'
$nm = 'C:\Users\nolan\ping-convergence-worktree\gateway\node_modules'
Write-Host ("node_modules exists: " + (Test-Path $nm))
Write-Host ("attributes: " + (Get-Item $nm).Attributes)
$pg = Join-Path $nm 'pg'
Write-Host ("pg exists: " + (Test-Path $pg))
if (Test-Path $pg) {
  Write-Host ("pg attributes: " + (Get-Item $pg).Attributes)
  Write-Host ("pg target (if link): " + (Get-Item $pg).Target)
  Get-ChildItem $pg | Select-Object -ExpandProperty Name | Select-Object -First 10
  $pj = Join-Path $pg 'package.json'
  Write-Host ("package.json: " + (Test-Path $pj))
}
Write-Host ""
Write-Host "=== other node_modules with pg on disk ==="
Get-ChildItem -Path C:\Users\nolan\PING\gateway\node_modules\pg -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name | Select-Object -First 5
Write-Host ("PING gateway pg package.json: " + (Test-Path 'C:\Users\nolan\PING\gateway\node_modules\pg\package.json'))
