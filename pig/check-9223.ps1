$procs = Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | Where-Object { $_.CommandLine -like '*9223*' }
if ($procs) {
  foreach ($p in $procs) {
    Write-Output ("PID=" + $p.ProcessId)
    Write-Output $p.CommandLine.Substring(0, [Math]::Min(300, $p.CommandLine.Length))
  }
} else {
  Write-Output "NO_CHROME_WITH_9223"
}
