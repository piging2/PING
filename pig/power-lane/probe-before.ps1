# BEFORE probe: WiFi adapter battery power-management state (read-only)
$ErrorActionPreference = "Continue"
Write-Output "=== POWER SOURCE ==="
$b = Get-CimInstance -ClassName Win32_Battery -ErrorAction SilentlyContinue
if ($b) {
  Write-Output ("BatteryStatus=" + $b.BatteryStatus + " (1=discharging/battery, 2=on AC) EstimatedChargeRemaining=" + $b.EstimatedChargeRemaining)
} else {
  Write-Output "No Win32_Battery instance"
}
Write-Output ""
Write-Output "=== NET ADAPTERS (802.11) ==="
$adapters = Get-NetAdapter | Where-Object { $_.InterfaceDescription -match "Wireless|Wi-Fi|802\.11|WLAN" }
$adapters | ForEach-Object {
  Write-Output ("Name=" + $_.Name + " | Desc=" + $_.InterfaceDescription + " | Status=" + $_.Status + " | ifIndex=" + $_.ifIndex)
}
Write-Output ""
Write-Output "=== Set-NetAdapterPowerManagement cmdlet available? ==="
Write-Output ((Get-Command Set-NetAdapterPowerManagement -ErrorAction SilentlyContinue) -ne $null)
Write-Output ""
$classPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Class\{4d36e972-e325-11ce-bfc1-08002be10318}"
foreach ($a in $adapters) {
  Write-Output ("--- adapter: " + $a.InterfaceDescription + " ---")
  $pm = Get-NetAdapterPowerManagement -Name $a.Name -ErrorAction SilentlyContinue
  if ($pm) { $pm | Format-List | Out-String | Write-Output }
  $key = Get-ChildItem $classPath -ErrorAction SilentlyContinue | Where-Object {
    (Get-ItemProperty -Path $_.PSPath -Name DriverDesc -ErrorAction SilentlyContinue).DriverDesc -eq $a.InterfaceDescription
  } | Select-Object -First 1
  if ($key) {
    Write-Output ("RegistryKey=" + $key.PSPath)
    $pnp = (Get-ItemProperty -Path $key.PSPath -Name PnPCapabilities -ErrorAction SilentlyContinue).PnPCapabilities
    if ($null -eq $pnp) {
      Write-Output "PnPCapabilities=<absent> (default 0 = OS MAY turn off device to save power)"
    } else {
      Write-Output ("PnPCapabilities=" + $pnp + " (0x" + "{0:X}" -f $pnp + ")")
      Write-Output ("  bit 0x10 (16) set => [ ] Allow computer to turn off this device (UNCHECKED)")
      Write-Output ("  bit 0x10 (16) clear => [x] Allow computer to turn off this device (CHECKED)")
    }
  } else {
    Write-Output "RegistryKey=<not found>"
  }
  Write-Output ""
}
Write-Output "=== POWERCFG wireless adapter power-saving mode (DC) ==="
powercfg /query SCHEME_CURRENT 19cbb8fa-5279-450e-9fac-8a3d5fedd0c1 12bbebe6-58d6-4636-95bb-3217ef8f0b0
Write-Output ""
Write-Output "=== KERNEL-POWER 506/507 baseline (last 10h) ==="
$start = (Get-Date).AddHours(-10)
$evts = Get-WinEvent -FilterHashtable @{LogName="System"; Id=506,507; StartTime=$start} -ErrorAction SilentlyContinue
Write-Output ("count=" + ($evts | Measure-Object).Count)
$evts | Select-Object -Last 5 | ForEach-Object { Write-Output ($_.TimeCreated.ToString("HH:mm:ss") + " id=" + $_.Id) }
