# Check for Kernel-Power 506/507 during the observation window (read-only)
$ErrorActionPreference = "Continue"
$start = (Get-Date "2026-10-01 13:25")
$evts = Get-WinEvent -FilterHashtable @{LogName="System"; Id=506,507; StartTime=$start} -ErrorAction SilentlyContinue
if ($evts) { $evts | ForEach-Object { Write-Output ($_.TimeCreated.ToString("HH:mm:ss") + " id=" + $_.Id + " " + $_.Message.Split("`n")[0]) } }
else { Write-Output "no 506/507 since 13:25" }
$b = Get-CimInstance -ClassName Win32_Battery
Write-Output ("power now: BatteryStatus=" + $b.BatteryStatus + " charge=" + $b.EstimatedChargeRemaining)
