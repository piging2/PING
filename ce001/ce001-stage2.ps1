# ce001-stage2.ps1 - stage CE-001 test env READ-ONLY via archive FILE (no pipe)
$ErrorActionPreference = 'Continue'
$WT = 'C:\Users\nolan\ping-convergence-worktree'
$SCRATCH = 'C:\Users\nolan\ce001-scratch'
$NODE = 'C:\Users\nolan\.local\share\pigi\node-v22.23.2-win-x64\node.exe'

Set-Location $WT
if (Test-Path $SCRATCH) { Remove-Item -Recurse -Force $SCRATCH }
New-Item -ItemType Directory -Force $SCRATCH | Out-Null
$tar = Join-Path $SCRATCH 'ping-runtime.tar'
Write-Host "=== git archive to file (read-only) ==="
git archive constitutional-convergence-v2 ping-runtime -o $tar
Write-Host ("tar bytes: " + (Get-Item $tar).Length)
Write-Host "=== extract ==="
tar -xf $tar -C $SCRATCH
Get-ChildItem (Join-Path $SCRATCH 'ping-runtime') | Select-Object -ExpandProperty Name

Write-Host ""
Write-Host "=== require chains ==="
$mr = Join-Path $SCRATCH 'ping-runtime\orchestration\mission_runtime.js'
$uer = Join-Path $SCRATCH 'ping-runtime\events\unified_event_runtime.js'
Write-Host ("mission_runtime exists: " + (Test-Path $mr) + " | uer exists: " + (Test-Path $uer))
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
    try { await p.query('select 1'); console.log('port ' + port + ': CONNECTED'); }
    catch (e) { console.log('port ' + port + ': ' + e.message.split('\n')[0]); }
    await p.end();
  }
})();
"@
$probe | Out-File -Encoding utf8 (Join-Path $SCRATCH 'pgprobe.js')
$env:NODE_PATH = 'C:\Users\nolan\ping-convergence-worktree\gateway\node_modules'
& $NODE (Join-Path $SCRATCH 'pgprobe.js')
