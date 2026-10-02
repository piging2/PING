# chrome-cdp-watchdog-x.ps1
# Keeps the Pig's dedicated X/Twitter headed Chrome (x-profile + CDP :9225) alive.
# Called by the "PigiXLogin" scheduled task: at nolan logon and every 5 minutes.
# READ-ONLY intelligence browser: never performs follows, likes, or other interactions.
# Behavior: probe CDP; if down, stop ONLY chrome processes whose command line
# references the x-profile (never Nolan's personal Chrome, fb-profile, or li-profile),
# then relaunch.
$ErrorActionPreference = 'SilentlyContinue'
$profileDir = 'C:/Users/nolan/.local/share/pigi/x-profile'
$chromeExe  = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
$logFile    = 'C:/Users/nolan/.local/share/pigi/chrome-cdp-watchdog-x.log'

function Probe-Cdp {
  try {
    $r = Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:9225/json/version' -TimeoutSec 5
    return ($r.StatusCode -eq 200)
  } catch { return $false }
}

function Write-WatchLog($msg) {
  $stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  Add-Content -Path $logFile -Value "$stamp $msg"
  # keep the log small: retain last 500 lines once it passes 5000
  $lines = (Get-Content $logFile).Count
  if ($lines -gt 5000) {
    (Get-Content $logFile | Select-Object -Last 500) | Set-Content $logFile
  }
}

if (Probe-Cdp) { exit 0 }

$xProcs = Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" |
  Where-Object { $_.CommandLine -like "*$profileDir*" }

if ($xProcs) {
  $pids = ($xProcs | Select-Object -ExpandProperty ProcessId) -join ','
  Write-WatchLog "CDP down; stopping x-profile chrome PIDs $pids"
  $xProcs | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
  Start-Sleep -Seconds 3
} else {
  Write-WatchLog "CDP down; no x-profile chrome process running"
}

Start-Process -FilePath $chromeExe -ArgumentList @(
  "--user-data-dir=$profileDir",
  '--remote-debugging-port=9225',
  '--start-maximized',
  'https://x.com/login'
)
Start-Sleep -Seconds 10

if (Probe-Cdp) { Write-WatchLog "relaunch OK; CDP :9225 up" }
else           { Write-WatchLog "relaunch attempted; CDP :9225 STILL DOWN" }
