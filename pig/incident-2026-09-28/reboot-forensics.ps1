# Pig reboot forensics — 2026-09-28 05:24 MDT unexpected reboot
# Read-only. Priority: (1) was the 05:24 boot clean or a crash,
# (2) pre-reboot sleep evidence (03:41 window), (3) current power state.
# ASCII only. No credentials touched.

$ErrorActionPreference = 'Continue'
$capDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$log = Join-Path $capDir ('reboot-forensics-' + $stamp + '.log')
$since = (Get-Date).AddHours(-14)

function Sec($name) { Add-Content $log ''; Add-Content $log ('===== ' + $name + ' =====') }

Add-Content $log ('REBOOT FORENSICS ' + $stamp + ' local time')
Add-Content $log ('Window since ' + $since.ToString('yyyy-MM-dd HH:mm:ss'))

Sec 'LAST BOOT AND UPTIME'
$os = Get-CimInstance Win32_OperatingSystem
$boot = $os.LastBootUpTime
$up = (Get-Date) - $boot
Add-Content $log ('LastBootUpTime: ' + $boot.ToString('yyyy-MM-dd HH:mm:ss'))
Add-Content $log ('Uptime minutes: ' + [math]::Round($up.TotalMinutes, 1))

Sec 'BUGCHECK 1001 (crash dumps)'
$evts = Get-WinEvent -FilterHashtable @{LogName='System'; ProviderName='BugCheck'; ID=1001; StartTime=$since} -MaxEvents 10 -ErrorAction SilentlyContinue
if ($evts) { foreach ($e in $evts) { Add-Content $log ($e.TimeCreated.ToString('yyyy-MM-dd HH:mm:ss') + ' BUGCHECK ' + $e.Message.Split("`n")[0]) } }
else { Add-Content $log '(no BugCheck events in window)' }

Sec 'KERNEL-POWER 41 (unexpected shutdown)'
$evts = Get-WinEvent -FilterHashtable @{LogName='System'; ProviderName='Microsoft-Windows-Kernel-Power'; ID=41; StartTime=$since} -MaxEvents 10 -ErrorAction SilentlyContinue
if ($evts) { foreach ($e in $evts) { Add-Content $log ($e.TimeCreated.ToString('yyyy-MM-dd HH:mm:ss') + ' KERNEL-POWER 41 unexpected shutdown') } }
else { Add-Content $log '(no event 41 in window)' }

Sec 'KERNEL-GENERAL 12/13 and KERNEL-BOOT (boot/shutdown sequence)'
$evts = Get-WinEvent -FilterHashtable @{LogName='System'; ID=12,13; StartTime=$since} -MaxEvents 20 -ErrorAction SilentlyContinue
foreach ($e in $evts) { Add-Content $log ($e.TimeCreated.ToString('yyyy-MM-dd HH:mm:ss') + ' ' + $e.ProviderName + ' ' + $e.Id) }
$evts = Get-WinEvent -FilterHashtable @{LogName='System'; ProviderName='Microsoft-Windows-Kernel-Boot'; StartTime=$since} -MaxEvents 20 -ErrorAction SilentlyContinue
foreach ($e in $evts) { Add-Content $log ($e.TimeCreated.ToString('yyyy-MM-dd HH:mm:ss') + ' Kernel-Boot ' + $e.Id) }

Sec 'WINDOWS UPDATE / SERVICING around 05:24 (reboot cause candidate)'
$evts = Get-WinEvent -FilterHashtable @{LogName='System'; ProviderName='Microsoft-Windows-WindowsUpdateClient'; ID=19,20,21,43,44; StartTime=$since} -MaxEvents 15 -ErrorAction SilentlyContinue
if ($evts) { foreach ($e in $evts) { Add-Content $log ($e.TimeCreated.ToString('yyyy-MM-dd HH:mm:ss') + ' WU ' + $e.Id) } }
else { Add-Content $log '(no WU install/restart events in window)' }
$evts = Get-WinEvent -FilterHashtable @{LogName='System'; ProviderName='User32'; ID=1074; StartTime=$since} -MaxEvents 10 -ErrorAction SilentlyContinue
if ($evts) { foreach ($e in $evts) { $m = $e.Message.Split("`n")[0]; Add-Content $log ($e.TimeCreated.ToString('yyyy-MM-dd HH:mm:ss') + ' User32 1074 ' + $m) } }
else { Add-Content $log '(no User32 1074 restart/shutdown events in window)' }

Sec 'KERNEL-POWER 506/507 (standby enter/exit, pre-reboot window)'
$evts = Get-WinEvent -FilterHashtable @{LogName='System'; ProviderName='Microsoft-Windows-Kernel-Power'; ID=506,507; StartTime=$since} -MaxEvents 40 -ErrorAction SilentlyContinue
foreach ($e in $evts) {
  $x = [xml]$e.ToXml()
  $reason = ''
  foreach ($d in $x.Event.EventData.Data) { if ($d.Name -eq 'Reason' -or $d.Name -eq 'ExitReason') { $reason = $reason + $d.Name + '=' + $d.InnerText + ' ' } }
  Add-Content $log ($e.TimeCreated.ToString('yyyy-MM-dd HH:mm:ss') + ' KP ' + $e.Id + ' ' + $reason)
}

Sec 'KERNEL-POWER 42/107 (sleep/resume)'
$evts = Get-WinEvent -FilterHashtable @{LogName='System'; ProviderName='Microsoft-Windows-Kernel-Power'; ID=42,107; StartTime=$since} -MaxEvents 20 -ErrorAction SilentlyContinue
foreach ($e in $evts) { Add-Content $log ($e.TimeCreated.ToString('yyyy-MM-dd HH:mm:ss') + ' KP ' + $e.Id) }

Sec 'POWER-TROUBLESHOOTER wake sources'
$evts = Get-WinEvent -FilterHashtable @{LogName='System'; ProviderName='Microsoft-Windows-Power-Troubleshooter'; ID=1; StartTime=$since} -MaxEvents 10 -ErrorAction SilentlyContinue
foreach ($e in $evts) { Add-Content $log ($e.TimeCreated.ToString('yyyy-MM-dd HH:mm:ss') + ' WAKE ' + $e.Message.Split("`n")[0]) }

Sec 'WHEA hardware errors'
$evts = Get-WinEvent -FilterHashtable @{LogName='System'; ProviderName='Microsoft-Windows-WHEA-Logger'; StartTime=$since} -MaxEvents 15 -ErrorAction SilentlyContinue
if ($evts) { foreach ($e in $evts) { Add-Content $log ($e.TimeCreated.ToString('yyyy-MM-dd HH:mm:ss') + ' WHEA ' + $e.Id) } }
else { Add-Content $log '(no WHEA events in window)' }

Sec 'POWERCFG /A'
powercfg /a 2>&1 | Add-Content $log

Sec 'POWERCFG /REQUESTS (current)'
powercfg /requests 2>&1 | Add-Content $log

Sec 'POWERCFG /WAKETIMERS (current)'
powercfg /waketimers 2>&1 | Add-Content $log

Sec 'POWERCFG /LASTWAKE (current)'
powercfg /lastwake 2>&1 | Add-Content $log

Sec 'POWERCFG effective SLEEP and VIDEO settings'
powercfg /query SCHEME_CURRENT SUB_SLEEP 2>&1 | Add-Content $log
powercfg /query SCHEME_CURRENT SUB_VIDEO 2>&1 | Add-Content $log

Sec 'SLEEPSTUDY report (pre-reboot sessions persist)'
$ss = Join-Path $capDir 'sleepstudy.html'
powercfg /sleepstudy /output $ss 2>&1 | Add-Content $log
if (Test-Path $ss) { Add-Content $log 'sleepstudy html written' } else { Add-Content $log 'sleepstudy html NOT created' }

Sec 'DOCKER AND WSL STATE (post-boot)'
wsl -l -v 2>&1 | Add-Content $log
$dp = Get-Process -Name 'dockerd' -ErrorAction SilentlyContinue
if ($dp) { Add-Content $log 'dockerd running' } else { Add-Content $log 'dockerd NOT running' }

Add-Content $log ''
Add-Content $log 'CAPTURE COMPLETE'
Write-Output ('LOG=' + $log)
