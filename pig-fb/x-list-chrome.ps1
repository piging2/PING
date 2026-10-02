$procs = Get-CimInstance Win32_Process -Filter "Name='chrome.exe'"
foreach ($p in $procs) {
  if ($p.CommandLine -match '--user-data-dir=([^\s"]+)') {
    $dir = $Matches[1]
    $tag = 'other'
    if ($dir -like '*x-profile*') { $tag = 'X-MATCH' }
    Write-Output "$tag PID=$($p.ProcessId) DIR=$dir"
  }
}
