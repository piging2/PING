# Stale-copy scan for ROTATED (dead) MUSE_LEVEL keys — 2026-09-28
# Reads old values from the pre-rotation backup container env into variables only.
# Reports FILE PATHS + counts only. Never prints values or matching lines.
$ErrorActionPreference = 'Stop'
function Get-EnvVal($envs, $name) {
  $m = $envs | Where-Object { $_ -like "$name=*" } | Select-Object -First 1
  return $m.Substring($name.Length + 1)
}
$envOld = docker inspect ping-gateway-pre-rotate-20260928 --format '{{json .Config.Env}}' | ConvertFrom-Json
$oldL1 = Get-EnvVal $envOld 'MUSE_LEVEL_1_KEY'
$oldL2 = Get-EnvVal $envOld 'MUSE_LEVEL_2_KEY'

$roots = @('C:\Users\nolan\PING', 'C:\Users\nolan\hermes-bridge')
$hits = @()
foreach ($root in $roots) {
  $files = Get-ChildItem $root -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch 'node_modules|\.git\\|venv' } |
    Where-Object { $_.Length -lt 5MB }
  foreach ($f in $files) {
    try {
      $t = [System.IO.File]::ReadAllText($f.FullName)
      $c = 0
      if ($t.Contains($oldL1)) { $c++ }
      if ($t.Contains($oldL2)) { $c++ }
      if ($c -gt 0) { $hits += ($f.FullName + ' :: key-copies=' + $c) }
    } catch { }
  }
}
Write-Output "files scanned: roots=$($roots -join ',')"
Write-Output ("stale-copy hits: " + $hits.Count)
foreach ($h in $hits) { Write-Output ("HIT: " + $h) }
Write-Output 'SCAN COMPLETE'
