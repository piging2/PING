# wake-wrap.ps1 -- scoped wake inhibition for Pig automation workers.
#
# (2026-09-25, Nolan's order: prefer a scoped wake/inhibit mechanism tied to
# worker lifetime over globally disabling sleep. Worker starts -> acquire;
# worker exits/crashes -> release. This script NEVER touches OS power policy:
# no powercfg writes, no sleep-timer changes, no hibernate changes.)
#
# Mechanism: SetThreadExecutionState(ES_CONTINUOUS | ES_SYSTEM_REQUIRED),
# called on the calling thread. Windows clears the request automatically
# when the thread/process terminates, so a killed or crashed holder CANNOT
# leak the inhibition -- release-on-crash is structural, not a code path.
# ES_AWAYMODE_REQUIRED is deliberately NOT used (see wake-lock-design.md:
# add it only if Pig behavior plus the Windows docs justify it).
#
# Two usage modes, one file:
#
#   1. WRAPPER MODE -- detached workers (e.g. run_pass.sh via WMI
#      Win32_Process.Create, which spawns outside the SSH job object):
#        powershell -NoProfile -ExecutionPolicy Bypass -File wake-wrap.ps1 `
#          -RunId <run_id> -WorkerExe <exe> -WorkerArgsCsv <arg1,arg2,...> `
#          [-Reason '<why this lease exists>'] [-MaxWaitMinutes 240]
#      Acquires the inhibition, launches the worker as a CHILD process,
#      waits (bounded by MaxWaitMinutes), releases, and exits with the
#      worker's exit code (124 if the wrapper's own bound fires first).
#      The worker shares the wrapper's lifetime: any death of the wrapper
#      releases the inhibition via kernel thread teardown.
#
#   2. LIBRARY MODE -- synchronous remote blocks (dot-source, then bracket
#      the existing launch/wait logic; the run's own timeout/kill behavior
#      is unchanged):
#        . 'C:/Users/nolan/.local/share/pigi/wake-wrap.ps1'
#        $wakeOk = Wake-Acquire -RunId 'ig-20260925-120000' -Reason 'IG engagement pass (ig-engage.js)'
#        try { <existing worker launch + wait> } finally { Wake-Release -RunId 'ig-20260925-120000' }
#      Wake-Acquire returns $false when the API call fails; the caller
#      should proceed WITHOUT the inhibition (today's behavior) and record
#      the failure, never abort the run over it.
#
# Per-lease record (2026-09-27, Nolan): every acquire writes
#   C:/Users/nolan/.local/share/pigi/run-state/wake-<run_id>.json
# with run_id (= job), reason, lease_start (= acquired_at), and release adds
# lease_end (= released_at). A record with acquired=true and NO released flag
# means the holder died mid-run and the kernel released the inhibition
# (structural crash-safety); it is NOT a leaked lease.
#
# Observability: each acquire/release writes
#   C:/Users/nolan/.local/share/pigi/run-state/wake-<run_id>.json
# with run_id, reason, holder PID, lease_start/lease_end. While held,
# `powercfg /requests` shows the SYSTEM request under this powershell.exe
# instance, attributable per run via the state file's holder_pid.
# Canonical copy of this file lives at ~/workspace/pig-fb/wake-wrap.ps1 and
# is scp'd per dispatch (pinned to the dispatch, like the worker .js files).

param(
  [string]$RunId = '',
  [string]$WorkerExe = '',
  [string]$WorkerArgsCsv = '',
  [int]$MaxWaitMinutes = 240,
  [string]$Reason = ''
)

# NOTE (2026-09-25, learned the hard way): PowerShell parses 0x80000000 as
# Int32 (-2147483648), NOT Int64. Passing the uncast -bor result to the
# uint P/Invoke parameter throws a MethodException, and the failed call
# leaves $prev as $null -- while ($null -ne 0) is $true, which would record
# a BOGUS acquired=true. Hence the [uint32] casts AND the explicit $null
# check in Wake-Acquire. Keep them.
$WakeES_CONTINUOUS = [uint32]2147483648
$WakeES_SYSTEM_REQUIRED = [uint32]1
$WakeStateDir = 'C:/Users/nolan/.local/share/pigi/run-state'

if (-not ([System.Management.Automation.PSTypeName]'WakeNative').Type) {
  Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class WakeNative {
  [DllImport("kernel32.dll")]
  public static extern uint SetThreadExecutionState(uint esFlags);
}
'@
}

function Wake-StatePath {
  param([string]$WakeRunId)
  if (-not (Test-Path $WakeStateDir)) {
    New-Item -ItemType Directory $WakeStateDir -Force | Out-Null
  }
  return (Join-Path $WakeStateDir ("wake-" + $WakeRunId + ".json"))
}

function Wake-Acquire {
  param([string]$RunId, [string]$Reason = '')
  # try/catch: a failed P/Invoke must surface as acquired=$false, never as
  # a $null $prev slipping through ($null -ne 0) -> $true.
  $prev = $null
  $callError = $null
  $now = (Get-Date -Format o)
  try {
    $prev = [WakeNative]::SetThreadExecutionState(
      $WakeES_CONTINUOUS -bor $WakeES_SYSTEM_REQUIRED)
  } catch {
    $callError = $_.Exception.Message
  }
  $ok = ($null -ne $prev) -and ($prev -ne 0)
  if ($RunId) {
    $rec = [ordered]@{
      run_id      = $RunId
      reason      = $Reason
      holder_pid  = $PID
      mechanism   = 'SetThreadExecutionState(ES_CONTINUOUS|ES_SYSTEM_REQUIRED)'
      acquired    = $ok
      acquired_at = $now
      lease_start = $now
      prev_state  = ('0x{0:X8}' -f $prev)
    }
    if ($callError) { $rec['call_error'] = $callError }
    $rec | ConvertTo-Json | Set-Content (Wake-StatePath $RunId)
  }
  return $ok
}

function Wake-Release {
  param([string]$RunId)
  [void][WakeNative]::SetThreadExecutionState($WakeES_CONTINUOUS)
  if ($RunId) {
    $p = Wake-StatePath $RunId
    if (Test-Path $p) {
      $rec = Get-Content $p -Raw | ConvertFrom-Json
      $now = (Get-Date -Format o)
      $rec | Add-Member -NotePropertyName 'released' -NotePropertyValue $true -Force
      $rec | Add-Member -NotePropertyName 'released_at' -NotePropertyValue $now -Force
      $rec | Add-Member -NotePropertyName 'lease_end' -NotePropertyValue $now -Force
      $rec | ConvertTo-Json | Set-Content $p
    }
  }
}

# ---- wrapper-mode main (skipped when dot-sourced: $WorkerExe stays empty) ----
if ($WorkerExe) {
  if (-not $RunId) { $RunId = ('wrap-' + (Get-Date -Format 'yyyyMMdd-HHmmss')) }
  $acquired = Wake-Acquire -RunId $RunId -Reason $Reason
  if ($acquired) { 'WAKE_ACQUIRED run_id=' + $RunId }
  else { 'WAKE_ACQUIRE_FAILED run_id=' + $RunId + ' (proceeding without inhibition)' }

  $workerArgs = @()
  if ($WorkerArgsCsv) { $workerArgs = $WorkerArgsCsv -split ',' }

  $code = 124
  try {
    $proc = Start-Process -FilePath $WorkerExe -ArgumentList $workerArgs -NoNewWindow -PassThru
    'WAKE_WORKER_PID=' + $proc.Id
    if ($proc.WaitForExit($MaxWaitMinutes * 60000)) {
      $code = $proc.ExitCode
    } else {
      try { $proc.Kill() } catch {}
      'WAKE_WORKER_TIMEOUT minutes=' + $MaxWaitMinutes
    }
  } finally {
    Wake-Release -RunId $RunId
  }
  'WAKE_RELEASED run_id=' + $RunId + ' worker_exit=' + $code
  exit $code
}
