# AFTER probe: verify the change is in effect and the adapter recovered.
# Also cleans up the watchdog task.
$ErrorActionPreference = "Continue"
Write-Output "=== AFTER: registry ==="
$key = "HKLM:\SYSTEM\CurrentControlSet\Control\Class\{4d36e972-e325-11ce-bfc1-08002be10318}\0000"
$pnp = (Get-ItemProperty -Path $key -Name PnPCapabilities -ErrorAction SilentlyContinue).PnPCapabilities
Write-Output ("PnPCapabilities=" + $pnp + " (expect 16: OS may NOT turn off the Wi-Fi adapter)")
Write-Output ""
Write-Output "=== AFTER: adapter ==="
Get-NetAdapter -Name "Wi-Fi" | Select-Object Name, Status, InterfaceDescription | Format-List | Out-String | Write-Output
Write-Output "=== watchdog task cleanup ==="
schtasks /delete /tn PigWifiReenable /f
Write-Output ""
Write-Output "=== watchdog result (if it fired) ==="
Get-Content C:/Users/nolan/pig-power-lane/watchdog-result.txt -ErrorAction SilentlyContinue | Write-Output
Write-Output ""
Write-Output "=== POWER SOURCE ==="
$b = Get-CimInstance -ClassName Win32_Battery -ErrorAction SilentlyContinue
if ($b) { Write-Output ("BatteryStatus=" + $b.BatteryStatus + " EstimatedChargeRemaining=" + $b.EstimatedChargeRemaining) }
Write-Output ""
Write-Output "=== KERNEL-POWER 506/507 (last 2h) ==="
$start = (Get-Date).AddHours(-2)
$evts = Get-WinEvent -FilterHashtable @{LogName="System"; Id=506,507; StartTime=$start} -ErrorAction SilentlyContinue
$evts | ForEach-Object { Write-Output ($_.TimeCreated.ToString("HH:mm:ss") + " id=" + $_.Id) }
Write-Output ""
Write-Output "=== wireless adapter power-saving mode, full query, DC index ==="
powercfg /query SCHEME_CURRENT | Select-String -Pattern "Wireless|Power Saving Mode|DC power" -Context 0,6 | Out-String | Write-Output
