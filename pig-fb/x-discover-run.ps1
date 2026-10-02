# x-discover-run.ps1: Windows-side wrapper for the X read-only discovery probe.
#
# Runs the portable node.exe probe (C:/Windows/Temp/x-discover-run.js) inside a
# PowerShell background job guarded by a REMOTE-SIDE watchdog
# (Wait-Job -Timeout). The launcher (x-probe-discover.sh) is the PRIMARY bound:
# it kills the ssh client with timeout(1) and passes the remote bound as the
# 3rd arg (launcher bound + 60s margin). This watchdog is the backstop: when the
# launcher kills the local ssh client, the remote powershell/node can be
# orphaned while still holding a CDP page. If the bound elapses with the probe
# still alive, the wrapper kills the recorded node PID (verified by command
# line), sweeps any remaining node.exe running the probe js, and exits 7.
#
# Stdout contract (unchanged): on success the wrapper emits the probe's single
# JSON line byte-for-byte as UTF-8. The Pig's console encoding is IBM437, so the
# output is NEVER round-tripped through PowerShell string emission: the job
# decodes node stdout with an explicit UTF-8 reader, and the wrapper writes
# explicit UTF-8 bytes to the raw stdout stream.
#
# Args: <handles-comma-separated> [hours] [watchdog-seconds]
# Exit codes: 0 = probe ran (launcher greps stdout for the JSON line);
#   2 = usage error; 7 = REMOTE WATCHDOG fired (probe killed, no JSON).
# Any nonzero exit => the pass performs zero X actions (fail closed).
#
# Assumption: the launcher is the only caller (one worker per account), so the
# backstop sweep of node.exe processes running x-discover-run.js cannot hit a
# legitimate concurrent probe.

param(
  [string]$handles = '',
  [string]$hours = '48',
  [int]$watchdogSeconds = 0
)

$nodeExe  = 'C:/Users/nolan/.local/share/pigi/node-v22.23.2-win-x64/node.exe'
$jsFile   = 'C:/Windows/Temp/x-discover-run.js'
$nodePath = 'C:/Users/nolan/.local/share/pigi/fb-engage/node_modules'

if ([string]::IsNullOrWhiteSpace($handles)) {
  Write-Error 'usage: x-discover-run.ps1 <h1,h2,...> [hours] [watchdog-seconds]'
  exit 2
}

if ($watchdogSeconds -le 0) {
  $n = @($handles -split ',').Count
  $watchdogSeconds = 120 + ($n * 600) + 60
}

$pidFile = 'C:/Windows/Temp/x-discover-run.pid'

$job = Start-Job -ScriptBlock {
  param($exe, $js, $h, $hrs, $np, $pf)
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = $exe
  $psi.Arguments = '"' + $js + '" ' + $h + ' ' + $hrs
  $psi.RedirectStandardOutput = $true
  $psi.StandardOutputEncoding = [System.Text.Encoding]::UTF8
  $psi.UseShellExecute = $false
  $psi.EnvironmentVariables['NODE_PATH'] = $np
  $p = [System.Diagnostics.Process]::Start($psi)
  Set-Content -Path $pf -Value $p.Id
  $out = $p.StandardOutput.ReadToEnd()
  $p.WaitForExit()
  $out
} -ArgumentList $nodeExe, $jsFile, $handles, $hours, $nodePath, $pidFile

$completedJob = Wait-Job -Job $job -Timeout $watchdogSeconds
if ($completedJob) {
  $text = (Receive-Job -Job $job) -join "`n"
  Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
  Remove-Item -Path $pidFile -ErrorAction SilentlyContinue
  $utf8 = New-Object System.Text.UTF8Encoding $false
  $bytes = $utf8.GetBytes([string]$text)
  $stdout = [Console]::OpenStandardOutput()
  $stdout.Write($bytes, 0, $bytes.Length)
  $stdout.Flush()
  exit 0
}

# --- REMOTE WATCHDOG FIRED: bound elapsed with the probe still alive. ---
$targetPid = $null
if (Test-Path $pidFile) { $targetPid = ((Get-Content -Path $pidFile -Raw).Trim()) }
if ($targetPid -match '^\d+$') {
  $cand = Get-CimInstance Win32_Process -Filter "ProcessId = $targetPid" -ErrorAction SilentlyContinue
  if ($cand -and ($cand.CommandLine -like '*x-discover-run.js*')) {
    Stop-Process -Id ([int]$targetPid) -Force -ErrorAction SilentlyContinue
  }
}
Stop-Job -Job $job -ErrorAction SilentlyContinue
Wait-Job -Job $job -Timeout 10 | Out-Null
Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
# Backstop sweep (covers: PID file never written, job killed mid-launch).
Start-Sleep -Seconds 2
Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -like '*x-discover-run.js*' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Remove-Item -Path $pidFile -ErrorAction SilentlyContinue
Write-Error "x-discover-run: REMOTE WATCHDOG fired after ${watchdogSeconds}s; probe killed, zero engagement"
exit 7
