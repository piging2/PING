# Watchdog payload: re-enable the Wi-Fi adapter. Runs as a scheduled task
# (SYSTEM) so it fires even if the SSH session that disabled the adapter dies.
$ErrorActionPreference = "Continue"
Enable-NetAdapter -Name "Wi-Fi" -Confirm:$false
Start-Sleep -Seconds 5
$a = Get-NetAdapter -Name "Wi-Fi" -ErrorAction SilentlyContinue
"watchdog: Wi-Fi Status=" + $a.Status | Out-File C:/Users/nolan/pig-power-lane/watchdog-result.txt
