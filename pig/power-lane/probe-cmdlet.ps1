# Probe Set-NetAdapterPowerManagement parameters (read-only)
$ErrorActionPreference = "Continue"
Write-Output "=== Set-NetAdapterPowerManagement syntax ==="
Get-Command Set-NetAdapterPowerManagement -Syntax | Out-String | Write-Output
Write-Output ""
Write-Output "=== current per-setting state ==="
Get-NetAdapterPowerManagement -Name "Wi-Fi" | Format-List | Out-String | Write-Output
