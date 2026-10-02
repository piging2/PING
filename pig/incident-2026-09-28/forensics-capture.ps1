# Pig incident forensics capture — 2026-09-28 P0 HOST_ASLEEP incident
# Read-only. Captures evidence for tonight's 03:41 MDT and 05:21 MDT reachability losses.
# Output: single text log in the same directory as this script, plus two HTML reports.
# No credentials are touched, read, or written by this script.

$ErrorActionPreference = "Continue"
$capDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$log = Join-Path $capDir "forensics-$stamp.log"
$since = (Get-Date).AddHours(-8)

function Sec($name) { Add-Content $log ""; Add-Content $log "===== $name =====" }

function Evt($logName, $provider, $ids, $max) {
  try {
    $evts = Get-WinEvent -FilterHashtable @{LogName=$logName; ProviderName=$provider; ID=$ids; StartTime=$since} -MaxEvents $max -ErrorAction Stop
    foreach ($e in $evts) {
      $ts = $e.TimeCreated.ToString("yyyy-MM-dd HH:mm:ss")
      $msg = ($e.Message -replace "`r`n"," " -replace "\s+"," ").Trim()
      if ($msg.Length -gt 300) { $msg = $msg.Substring(0,300) }
      Add-Content $log "$ts [$provider $($e.Id)] $msg"
    }
    if (-not $evts) { Add-Content $log "(no events)" }
  } catch { Add-Content $log "(query failed: $($_.Exception.Message))" }
}

Add-Content $log "PIG FORENSICS CAPTURE $stamp (local time)"
Add-Content $log "Window: since $($since.ToString('yyyy-MM-dd HH:mm:ss'))"

Sec "UPTIME AND LAST BOOT"
try {
  $os = Get-CimInstance Win32_OperatingSystem
  $boot = $os.LastBootUpTime
  $up = (Get-Date) - $boot
  Add-Content $log "LastBootUpTime: $($boot.ToString('yyyy-MM-dd HH:mm:ss'))"
  Add-Content $log "Uptime: $($up.Days)d $($up.Hours)h $($up.Minutes)m $($up.Seconds)s"
} catch { Add-Content $log "(failed: $($_.Exception.Message))" }

Sec "POWERCFG /A (available sleep states)"
try { powercfg /a 2>&1 | Add-Content $log } catch { Add-Content $log "(failed)" }

Sec "POWERCFG /QUERY effective policy (full)"
try { powercfg /query 2>&1 | Add-Content $log } catch { Add-Content $log "(failed)" }

Sec "POWERCFG /REQUESTS"
try { powercfg /requests 2>&1 | Add-Content $log } catch { Add-Content $log "(failed)" }

Sec "POWERCFG /WAKETIMERS"
try { powercfg /waketimers 2>&1 | Add-Content $log } catch { Add-Content $log "(failed)" }

Sec "POWERCFG /LASTWAKE"
try { powercfg /lastwake 2>&1 | Add-Content $log } catch { Add-Content $log "(failed)" }

Sec "KERNEL-POWER 506/507 (Modern Standby enter/exit + reason)"
Evt "System" "Microsoft-Windows-Kernel-Power" @(506,507) 40

Sec "KERNEL-POWER 42/107 (sleep enter / resume)"
Evt "System" "Microsoft-Windows-Kernel-Power" @(42,107) 20

Sec "KERNEL-POWER 41 (unexpected shutdown) + 1/105/172 (power state/source/connectivity)"
Evt "System" "Microsoft-Windows-Kernel-Power" @(41,1,105,172) 20

Sec "POWER-TROUBLESHOOTER 1 (wake source)"
Evt "System" "Microsoft-Windows-Power-Troubleshooter" @(1) 10

Sec "KERNEL-GENERAL 12/13 (boot/shutdown) + KERNEL-BOOT 18/20/25/27/29/32"
Evt "System" "Microsoft-Windows-Kernel-General" @(12,13) 10
Evt "System" "Microsoft-Windows-Kernel-Boot" @(18,20,25,27,29,32) 20

Sec "WHEA-LOGGER (hardware errors)"
Evt "System" "Microsoft-Windows-WHEA-Logger" @(1,17,18,19,20,46,47) 20

Sec "BUGCHECK 1001"
Evt "System" "BugCheck" @(1001) 10

Sec "WLAN-AUTOCONFIG (WiFi connect/disconnect)"
Evt "System" "Microsoft-Windows-WLAN-AutoConfig" @(8000,8001,8003,11001,11004,11010) 30

Sec "DISPLAY DRIVER (Display 4101, DxgKrnl 141/142/147)"
Evt "System" "Display" @(4101) 10
Evt "System" "Microsoft-Windows-DxgKrnl" @(141,142,147) 10

Sec "DISK/STORAGE (Disk 7/11/51/52/153, Ntfs 55/98/140, StorPort 504/505)"
Evt "System" "Disk" @(7,11,51,52,153) 15
Evt "System" "Ntfs" @(55,98,140) 15
Evt "System" "Microsoft-Windows-StorPort" @(504,505) 15

Sec "SERVICE CONTROL MANAGER — Tailscale state changes"
try {
  $evts = Get-WinEvent -FilterHashtable @{LogName="System"; ProviderName="Service Control Manager"; ID=7036; StartTime=$since} -MaxEvents 60 -ErrorAction Stop | Where-Object { $_.Message -match "Tailscale" }
  foreach ($e in $evts) {
    $ts = $e.TimeCreated.ToString("yyyy-MM-dd HH:mm:ss")
    $msg = ($e.Message -replace "`r`n"," " -replace "\s+"," ").Trim()
    Add-Content $log "$ts [SCM 7036] $msg"
  }
  if (-not $evts) { Add-Content $log "(no Tailscale SCM events)" }
} catch { Add-Content $log "(query failed: $($_.Exception.Message))" }

Sec "TAILSCALE SERVICE STATE + STATUS"
try {
  $svc = Get-Service -Name "Tailscale" -ErrorAction Stop
  Add-Content $log "Service Tailscale: Status=$($svc.Status) StartType=$($svc.StartType)"
} catch { Add-Content $log "(Get-Service Tailscale failed: $($_.Exception.Message))" }
try {
  $tsExe = Join-Path $env:ProgramFiles "Tailscale\tailscale.exe"
  if (Test-Path $tsExe) { & $tsExe status 2>&1 | Select-Object -First 15 | Add-Content $log }
  else { Add-Content $log "(tailscale.exe not at $tsExe)" }
} catch { Add-Content $log "(tailscale status failed)" }

Sec "WSL STATE"
try { wsl -l -v 2>&1 | Add-Content $log } catch { Add-Content $log "(failed)" }

Sec "DOCKER PROCESSES"
try {
  $procs = Get-Process -Name "dockerd","com.docker.backend","com.docker.build" -ErrorAction SilentlyContinue
  if ($procs) { $procs | ForEach-Object { Add-Content $log "$($_.ProcessName) PID=$($_.Id) started=$($_.StartTime)" } }
  else { Add-Content $log "(no docker processes found)" }
} catch { Add-Content $log "(failed)" }

Sec "MEMORY PRESSURE"
try {
  $os = Get-CimInstance Win32_OperatingSystem
  $freeGB = [math]::Round($os.FreePhysicalMemory/1MB,2)
  $totGB = [math]::Round($os.TotalVisibleMemorySize/1MB,2)
  Add-Content $log "Physical: free=${freeGB}GB total=${totGB}GB"
} catch { Add-Content $log "(failed)" }

Sec "DISK PRESSURE (C:)"
try {
  Get-PSDrive C | ForEach-Object { Add-Content $log "C: used=$([math]::Round($_.Used/1GB,1))GB free=$([math]::Round($_.Free/1GB,1))GB" }
  Get-PhysicalDisk | ForEach-Object { Add-Content $log "PhysicalDisk $($_.FriendlyName): Health=$($_.HealthStatus) Operational=$($_.OperationalStatus)" }
} catch { Add-Content $log "(failed)" }

Sec "THERMAL"
try {
  $tz = Get-CimInstance -Namespace root/wmi -Class MSAcpi_ThermalZoneTemperature -ErrorAction Stop
  $tz | ForEach-Object { Add-Content $log "ThermalZone: $([math]::Round($_.CurrentTemperature/10 - 273.15,1)) C" }
} catch { Add-Content $log "(thermal zone data unavailable: $($_.Exception.Message))" }

Sec "WIFI INTERFACE STATE"
try { netsh wlan show interfaces 2>&1 | Add-Content $log } catch { Add-Content $log "(failed)" }

Sec "GENERATING SLEEPSTUDY REPORT"
try {
  $ss = Join-Path $capDir "sleepstudy.html"
  powercfg /sleepstudy /output $ss 2>&1 | Add-Content $log
  if (Test-Path $ss) { $ssLen = (Get-Item $ss).Length; Add-Content $log "sleepstudy written: $ss ($ssLen bytes)" } else { Add-Content $log "(sleepstudy file not created)" }
} catch { Add-Content $log "(failed: $($_.Exception.Message))" }

Sec "GENERATING SYSTEM SLEEP DIAGNOSTICS REPORT"
try {
  $sd = Join-Path $capDir "systemsleepdiagnostics.html"
  powercfg /systemsleepdiagnostics /output $sd 2>&1 | Add-Content $log
  if (Test-Path $sd) { $sdLen = (Get-Item $sd).Length; Add-Content $log "systemsleepdiagnostics written: $sd ($sdLen bytes)" } else { Add-Content $log "(report file not created)" }
} catch { Add-Content $log "(failed: $($_.Exception.Message))" }

Add-Content $log ""
Add-Content $log "CAPTURE COMPLETE $stamp"
Write-Output "LOG=$log"
