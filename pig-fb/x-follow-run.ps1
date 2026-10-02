# x-follow-run.ps1: Windows-side wrapper for the X follow driver.
#
# Family pattern (mirrors x-like-run.ps1): portable node.exe on the Pig-side
# x-tools driver with NODE_PATH pinned to the fb-engage node_modules.
#
# Args: <handle> (no @)
# Exit codes: mirrors x-follow.js (0 = followed, driver-verified; 2 = usage;
#   3 = restriction/login signal). The exit code is propagated explicitly via
#   exit $LASTEXITCODE (fixes the 2026-09-15 exit-code swallowing bug: without
#   it PowerShell always exits 0 and the batch's rc=3 restriction halt never
#   fires).
# One-driver rule: waits up to 10 min for C:/Windows/Temp/x-engage.lock
# (held by x-comment.sh / x-engage.sh runs) before touching the browser.

param(
  [string]$handle = ''
)

$nodeExe  = 'C:/Users/nolan/.local/share/pigi/node-v22.23.2-win-x64/node.exe'
$jsFile   = 'C:/Users/nolan/.local/share/pigi/x-tools/x-follow.js'
$nodePath = 'C:/Users/nolan/.local/share/pigi/fb-engage/node_modules'
$lockFile = 'C:/Windows/Temp/x-engage.lock'

if ([string]::IsNullOrWhiteSpace($handle)) {
  Write-Error 'usage: x-follow-run.ps1 <handle>'
  exit 2
}

# One-driver rule: bounded wait on the shared lock before driving.
$deadline = (Get-Date).AddMinutes(10)
while ((Test-Path $lockFile) -and ((Get-Date) -lt $deadline)) {
  Start-Sleep -Seconds 15
}
if (Test-Path $lockFile) {
  Write-Error 'x-follow-run: x-engage.lock still held after 10 min; giving up'
  exit 3
}

$env:NODE_PATH = $nodePath
& $nodeExe $jsFile $handle
exit $LASTEXITCODE
