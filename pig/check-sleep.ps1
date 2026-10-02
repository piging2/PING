$evts = Get-WinEvent -FilterHashtable @{LogName="System"; ID=506; ProviderName="Microsoft-Windows-Kernel-Power"} -MaxEvents 8 -ErrorAction Stop
foreach ($e in $evts) {
  $x = [xml]$e.ToXml()
  $reason = ($x.Event.EventData.Data | Where-Object { $_.Name -eq "Reason" }).InnerText
  $ts = $e.TimeCreated.ToString("HH:mm:ss")
  Write-Output "$ts Reason=$reason"
}
Write-Output "--- unattended sleep timeout AC/DC ---"
powercfg /query SCHEME_CURRENT SUB_SLEEP 7bc4a2f9-d8fc-4469-b07b-33eb785aaca0 | Select-String "Setting Index"
Write-Output "--- last wake source ---"
$w = Get-WinEvent -FilterHashtable @{LogName="System"; ID=1; ProviderName="Microsoft-Windows-Power-Troubleshooter"} -MaxEvents 1 -ErrorAction SilentlyContinue
if ($w) { Write-Output $w.Message }
