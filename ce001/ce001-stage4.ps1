# ce001-stage4.ps1 - add infrastructure/ to the read-only scratch, retry
$ErrorActionPreference = 'Continue'
$WT = 'C:\Users\nolan\ping-convergence-worktree'
$SCRATCH = 'C:\Users\nolan\ce001-scratch'
Set-Location $WT
$tar = Join-Path $SCRATCH 'infrastructure.tar'
git archive constitutional-convergence-v2 infrastructure -o $tar
Write-Host ("infrastructure tar bytes: " + (Get-Item $tar).Length)
tar -xf $tar -C $SCRATCH
Write-Host ("staged: " + (Test-Path (Join-Path $SCRATCH 'infrastructure\physical_clock_adapter.js')))
Write-Host "=== retry fail-before ==="
& C:\Users\nolan\.local\share\pigi\node-v22.23.2-win-x64\node.exe (Join-Path $SCRATCH 'failbefore-ce001-v2.js')
