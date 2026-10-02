# CHANGE: set PnPCapabilities bit 0x10 on the Intel Wi-Fi 6E AX211 (unchecks
# "Allow the computer to turn off this device to save power"), then restart
# the adapter so the PnP power policy takes effect. A SYSTEM scheduled task
# re-enables the adapter ~2 min later as a watchdog in case this session dies
# when Wi-Fi drops.
$ErrorActionPreference = "Stop"
$key = "HKLM:\SYSTEM\CurrentControlSet\Control\Class\{4d36e972-e325-11ce-bfc1-08002be10318}\0000"
$desc = (Get-ItemProperty -Path $key -Name DriverDesc -ErrorAction Stop).DriverDesc
if ($desc -ne "Intel(R) Wi-Fi 6E AX211 160MHz") { throw ("unexpected DriverDesc: " + $desc) }
$cur = (Get-ItemProperty -Path $key -Name PnPCapabilities -ErrorAction SilentlyContinue).PnPCapabilities
if ($null -eq $cur) { $cur = 0 }
$new = $cur -bor 0x10
Write-Output ("BEFORE PnPCapabilities=" + $cur + " (0x" + "{0:X}" -f $cur + ")")
Set-ItemProperty -Path $key -Name PnPCapabilities -Value $new -Type DWord
$readback = (Get-ItemProperty -Path $key -Name PnPCapabilities).PnPCapabilities
Write-Output ("AFTER PnPCapabilities=" + $readback + " (0x" + "{0:X}" -f $readback + ")")
if ($readback -ne $new) { throw "registry readback mismatch" }
$when = (Get-Date).AddMinutes(2).ToString("HH:mm")
Write-Output ("scheduling watchdog PigWifiReenable at " + $when + " Pig-local")
schtasks /create /tn PigWifiReenable /tr "powershell.exe -ExecutionPolicy Bypass -File C:/Users/nolan/pig-power-lane/reenable.ps1" /sc once /st $when /ru SYSTEM /f
schtasks /query /tn PigWifiReenable /fo LIST | Select-String "TaskName|Next Run Time"
Write-Output "disabling Wi-Fi adapter now (session will drop; watchdog re-enables)"
Disable-NetAdapter -Name "Wi-Fi" -Confirm:$false
Write-Output "disabled"
