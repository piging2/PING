$procs = Get-WmiObject Win32_Process -Filter "Name = 'chrome.exe'" | Where-Object { $_.CommandLine -like "*chrome-trackc*" }
foreach ($p in $procs) { Write-Output ("killing " + $p.ProcessId); Stop-Process -Id $p.ProcessId -Force }
if (-not $procs) { Write-Output "no trackc chrome found" }
