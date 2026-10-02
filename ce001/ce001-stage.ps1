# ce001-stage.ps1 - stage CE-001 test env READ-ONLY (git archive, no worktree touch)
$ErrorActionPreference = 'Continue'
$WT = 'C:\Users\nolan\ping-convergence-worktree'
$SCRATCH = 'C:\Users\nolan\ce001-scratch'
$NODE = 'C:\Users\nolan\.local\share\pigi\node-v22.23.2-win-x64\node.exe'

Set-Location $WT
if (Test-Path $SCRATCH) { Remove-Item -Recurse -Force $SCRATCH }
New-Item -ItemType Directory -Force $SCRATCH | Out-Null

Write-Host "=== archiving ping-runtime from constitutional-convergence-v2 (read-only) ==="
git archive constitutional-convergence-v2 ping-runtime | tar -x -C $SCRATCH
Get-ChildItem $SCRATCH\ping-runtime | Select-Object -ExpandProperty Name

Write-Host ""
Write-Host "=== require chains of the two target files ==="
$mr = Join-Path $SCRATCH 'ping-runtime\orchestration\mission_runtime.js'
$uer = Join-Path $SCRATCH 'ping-runtime\events\unified_event_runtime.js'
Write-Host ("mission_runtime exists: " + (Test-Path $mr))
Write-Host ("unified_event_runtime exists: " + (Test-Path $uer))
if (Test-Path $mr) { Select-String -Pattern "require\(" -Path $mr | Select-Object -ExpandProperty Line | Select-Object -First 12 }
Write-Host "---"
if (Test-Path $uer) { Select-String -Pattern "require\(" -Path $uer | Select-Object -ExpandProperty Line | Select-Object -First 15 }

Write-Host ""
Write-Host "=== PG connectivity probe via node+pg ==="
$probe = @"
const { Pool } = require('pg');
(async () => {
  for (const port of [5432, 15444]) {
    const p = new Pool({ host: '127.0.0.1', port, database: 'postgres', user: 'postgres', password: 'postgres', connectionTimeoutMillis: 4000 });
    try { const r = await p.query('select 1 as ok'); console.log('port ' + port + ': CONNECTED'); }
    catch (e) { console.log('port ' + port + ': ' + e.message.split('\n')[0]); }
    await p.end();
  }
})();
"@
$probe | Out-File -Encoding utf8 (Join-Path $SCRATCH 'pgprobe.js')
$env:NODE_PATH = 'C:\Users\nolan\ping-convergence-worktree\gateway\node_modules'
& $NODE (Join-Path $SCRATCH 'pgprobe.js')
