# x-orphan-check.ps1: count node.exe processes currently running the X probe.
# Used to verify the remote watchdog leaves no orphaned probe behind.
# Prints a single integer. Exit 0 always.
$procs = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -like '*x-discover-run.js*' }
@($procs).Count
