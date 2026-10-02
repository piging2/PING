# ce001-env.ps1 - find node, pg module, and test PG credentials
$ErrorActionPreference = 'Continue'

Write-Host "=== portable node hunt ==="
$candidates = @(
  'C:\Users\nolan\node-v22-win-x64\node.exe',
  'C:\tools\node\node.exe',
  'C:\Program Files\nodejs\node.exe'
)
foreach ($c in $candidates) { if (Test-Path $c) { Write-Host ("FOUND: " + $c) } }
Get-ChildItem -Path C:\Users\nolan -Filter node.exe -Recurse -ErrorAction SilentlyContinue -Depth 4 -Force | Select-Object -ExpandProperty FullName | Select-Object -First 6

Write-Host ""
Write-Host "=== gateway/node_modules with pg? ==="
foreach ($d in @('C:\Users\nolan\ping-convergence-worktree\gateway\node_modules',
                 'C:\Users\nolan\PING\gateway\node_modules',
                 'C:\Users\nolan\ping-convergence-worktree\node_modules')) {
  $p = Join-Path $d 'pg'
  Write-Host ($d + " -> pg present: " + (Test-Path $p))
}

Write-Host ""
Write-Host "=== PG credential probe on 5432 and 15444 ==="
$env:PGPASSWORD = 'postgres'
foreach ($port in @(5432, 15444)) {
  $out = & psql -h 127.0.0.1 -p $port -U postgres -d postgres -tAc "select version();" 2>&1 | Select-Object -First 1
  Write-Host ("port " + $port + ": " + $out)
}
