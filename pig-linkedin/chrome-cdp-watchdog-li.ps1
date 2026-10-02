# chrome-cdp-watchdog-li.ps1  (DRAFT - staged, NOT installed)
# Keeps the Pig's dedicated LinkedIn headed Chrome (li-profile + CDP :9224) alive.
# Intended caller: a "PigiLILogin" scheduled task (at nolan logon and every 5 min),
# created during Nolan's one-time LinkedIn setup. Mirrors chrome-cdp-watchdog.ps1.
# Behavior: probe CDP; if down, stop ONLY chrome processes whose command line
# references the li-profile (never Nolan's personal Chrome, never fb-profile),
# then relaunch.
$ErrorActionPreference = 'SilentlyContinue'
$profileDir = 'C:/Users/nolan/.local/share/pigi/li-profile'
$chromeExe  = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
$logFile    = 'C:/Users/nolan/.local/share/pigi/chrome-cdp-watchdog-li.log'

function Probe-Cdp {
  try {
    $r = Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:9224/json/version' -TimeoutSec 5
    return ($r.StatusCode -eq 200)
  } catch { return $false }
}

function Write-WatchLog($msg) {
  $stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  Add-Content -Path $logFile -Value "$stamp $msg"
  $lines = (Get-Content $logFile).Count
  if ($lines -gt 5000) {
    (Get-Content $logFile | Select-Object -Last 500) | Set-Content $logFile
  }
}

if (Probe-Cdp) { exit 0 }

$liProcs = Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" |
  Where-Object { $_.CommandLine -like "*$profileDir*" }

if ($liProcs) {
  $pids = ($liProcs | Select-Object -ExpandProperty ProcessId) -join ','
  Write-WatchLog "CDP down; stopping li-profile chrome PIDs $pids"
  $liProcs | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
  Start-Sleep -Seconds 3
} else {
  Write-WatchLog "CDP down; no li-profile chrome process running"
}

Start-Process -FilePath $chromeExe -ArgumentList @(
  "--user-data-dir=$profileDir",
  '--remote-debugging-port=9224',
  '--start-maximized',
  'https://www.linkedin.com/login'
)
Start-Sleep -Seconds 10

if (Probe-Cdp) { Write-WatchLog "relaunch OK; CDP :9224 up" }
else           { Write-WatchLog "relaunch attempted; CDP :9224 STILL DOWN" }
