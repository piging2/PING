# pop-browser.ps1
# On-demand: pop the Pig's fb-profile headed Chrome window to the foreground.
# Runs via the PigiPopBrowser scheduled task as nolan (InteractiveToken),
# because a cross-session SSH caller cannot foreground interactive windows.
$ErrorActionPreference = 'SilentlyContinue'
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class W32 {
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);
}
"@
$logFile    = 'C:/Users/nolan/.local/share/pigi/pop-browser.log'
$profileDir = 'C:/Users/nolan/.local/share/pigi/fb-profile'
$n = 0
$procs = Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" |
  Where-Object { $_.CommandLine -like "*$profileDir*" }
foreach ($p in $procs) {
  try {
    $h = (Get-Process -Id $p.ProcessId -ErrorAction Stop).MainWindowHandle
    if ($h -ne [IntPtr]::Zero) {
      if ([W32]::IsIconic($h)) { [W32]::ShowWindow($h, 9) | Out-Null }
      else                     { [W32]::ShowWindow($h, 1) | Out-Null }
      [W32]::SetForegroundWindow($h) | Out-Null
      $n++
    }
  } catch {}
}
$stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
Add-Content -Path $logFile -Value "$stamp foregrounded=$n"
