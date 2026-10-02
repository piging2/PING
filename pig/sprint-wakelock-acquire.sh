#!/bin/bash
# sprint-wakelock-acquire.sh — sprint-scoped Windows wake lock for the Pig.
# Holds SetThreadExecutionState(ES_CONTINUOUS | ES_SYSTEM_REQUIRED) for the
# duration of the 24h compiler sprint, INCLUDING on battery (Nolan 2026-09-25:
# "even on battery nothing goes down").
#
# This does NOT change system-wide sleep policy; it is one tagged holder
# process, killed at sprint end by sprint-wakelock-release.sh.
#
# Battery guard: the holder re-checks every 60s. If the machine is
# discharging and EstimatedChargeRemaining drops below 20%, the holder exits
# (releasing the lock) so Windows may sleep gracefully. A hard power-off at
# 0% mid-sprint would be worse than a graceful sleep at 20%.
#
# Run via: ~/workspace/pig/pigwsl-run.sh "$(cat ~/workspace/pig/sprint-wakelock-acquire.sh)"
set -u

PS1_FILE="/tmp/pig-sprint-wakelock.ps1"

# Idempotent: kill any previous sprint holder first.
pkill -f "pig-sprint-wakelock.ps1" 2>/dev/null; true
sleep 1

cat > "$PS1_FILE" << 'PSEOF'
Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public static class SWL { [DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint f); }'
# PIG-SPRINT-WAKELOCK-20260925
$log = 'C:\Windows\Temp\pig-sprint-wakelock.log'
"[$(Get-Date -Format o)] sprint wake lock holder started" | Out-File $log -Append
while ($true) {
  [void][SWL]::SetThreadExecutionState(2147483649)
  $batt = Get-CimInstance -ClassName Win32_Battery -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($batt -and $batt.BatteryStatus -ne 2 -and $batt.EstimatedChargeRemaining) {
    $pct = [int]$batt.EstimatedChargeRemaining
    if ($pct -lt 20) {
      "[$(Get-Date -Format o)] GUARD: discharging at ${pct}% (<20%), releasing lock for graceful sleep" | Out-File $log -Append
      break
    }
  }
  Start-Sleep -Seconds 60
}
"[$(Get-Date -Format o)] sprint wake lock holder exiting" | Out-File $log -Append
PSEOF

WINPS=$(wslpath -w "$PS1_FILE")
nohup powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "$WINPS" > /tmp/pig-sprint-wakelock-out.log 2>&1 &
echo "holder launched, pid $!"
sleep 6
echo "--- powercfg /requests (expect powershell.exe SYSTEM request) ---"
powercfg.exe /requests < /dev/null | grep -B1 -A3 -i "powershell.exe" | head -12
echo "--- holder process ---"
pgrep -af "pig-sprint-wakelock.ps1" || echo "NO HOLDER FOUND"
