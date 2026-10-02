$procs = Get-CimInstance Win32_Process -Filter "Name='chrome.exe'"
$hits = @($procs | Where-Object { $_.CommandLine -like '*pw-win-chrome-profile*' })
Write-Output ("MATCHES=" + $hits.Count)
foreach ($p in $hits) {
  Stop-Process -Id $p.ProcessId -Force
  Write-Output ("KILLED=" + $p.ProcessId)
}
