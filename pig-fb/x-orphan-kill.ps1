# x-orphan-kill.ps1: kill any orphaned x-discover probe node on the Pig.
$procs = Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -like '*x-discover*' }
if ($procs) {
  $procs | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  'ORPHAN_KILLED'
} else {
  'CLEAN'
}
