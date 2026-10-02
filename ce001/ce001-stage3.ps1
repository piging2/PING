# ce001-stage3.ps1 - add runtime/kernel/authorities to the read-only scratch
$ErrorActionPreference = 'Continue'
$WT = 'C:\Users\nolan\ping-convergence-worktree'
$SCRATCH = 'C:\Users\nolan\ce001-scratch'
Set-Location $WT
$tar = Join-Path $SCRATCH 'runtime-kernel.tar'
git archive constitutional-convergence-v2 runtime/kernel/authorities -o $tar
tar -xf $tar -C $SCRATCH
Write-Host ("staged: " + (Test-Path (Join-Path $SCRATCH 'runtime\kernel\authorities\constitutional_time_authority.js')))
Write-Host "=== its requires ==="
Select-String -Pattern "require\(" -Path (Join-Path $SCRATCH 'runtime\kernel\authorities\constitutional_time_authority.js') | Select-Object -ExpandProperty Line | Select-Object -First 8
Write-Host "=== retry fail-before ==="
& C:\Users\nolan\.local\share\pigi\node-v22.23.2-win-x64\node.exe (Join-Path $SCRATCH 'failbefore-ce001-v2.js')
