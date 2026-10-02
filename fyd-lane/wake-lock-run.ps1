#Requires -Version 5.1
<#
.SYNOPSIS
  Scoped wake lock for FYD automation (Lane G, 2026-09-21).
.DESCRIPTION
  Acquires a Windows power request (PowerCreateRequest + PowerSetRequest with
  PowerRequestSystemRequired), executes a bounded pass, then releases it in a
  finally block (PowerClearRequest + CloseHandle).

  The request is observable in `powercfg /requests` under SYSTEM with the
  reason string while held, and vanishes on release. Machine sleep policy is
  never modified. The lock is bounded by construction: -Seconds self-releases
  even if the orchestrator dies mid-pass.

  Two modes:
    -Command '<powershell>'  acquire -> run command -> release (finally)
    -Seconds <N>             acquire -> hold N seconds -> release (finally)

  Log: C:\ProgramData\FYD\wake-lock.log (UTC ISO-8601, ACQUIRED before work,
  RELEASED after work, always via finally).

  NOTE (FL-20260921-G04): an earlier revision used SetThreadExecutionState.
  The call succeeded but the request never surfaced in `powercfg /requests`
  on this host, so acquire/release was not independently observable.
  PowerSetRequest is the observable OS-supported mechanism; use this.
#>
[CmdletBinding(DefaultParameterSetName = 'Hold')]
param(
  [Parameter(ParameterSetName = 'Hold', Mandatory = $true)]
  [ValidateRange(1, 7200)]
  [int]$Seconds,

  [Parameter(ParameterSetName = 'Run', Mandatory = $true)]
  [string]$Command,

  [string]$LogFile = 'C:\ProgramData\FYD\wake-lock.log',

  [string]$Reason = 'FYD automation wake lock (Lane G bounded pass)'
)

Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class PowerReqNative {
  public const int PowerRequestSystemRequired = 1;
  public const uint POWER_REQUEST_CONTEXT_VERSION = 0;
  public const uint POWER_REQUEST_CONTEXT_SIMPLE_STRING = 0x00000001;
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public struct REASON_CONTEXT {
    public uint Version;
    public uint Flags;
    public string SimpleReasonString;
  }
  [DllImport("kernel32.dll", SetLastError = true)]
  public static extern IntPtr PowerCreateRequest(ref REASON_CONTEXT Context);
  [DllImport("kernel32.dll", SetLastError = true)]
  public static extern bool PowerSetRequest(IntPtr PowerRequest, int RequestType);
  [DllImport("kernel32.dll", SetLastError = true)]
  public static extern bool PowerClearRequest(IntPtr PowerRequest, int RequestType);
  [DllImport("kernel32.dll", SetLastError = true)]
  public static extern bool CloseHandle(IntPtr hObject);
}
"@

function Write-WakeLog([string]$msg) {
  $ts = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
  "$ts $msg" | Out-File -FilePath $LogFile -Append -Encoding utf8
}

$ctx = [PowerReqNative+REASON_CONTEXT]::new()
$ctx.Version = [PowerReqNative]::POWER_REQUEST_CONTEXT_VERSION
$ctx.Flags = [PowerReqNative]::POWER_REQUEST_CONTEXT_SIMPLE_STRING
$ctx.SimpleReasonString = $Reason

$h = [PowerReqNative]::PowerCreateRequest([ref]$ctx)
if ($h -eq [IntPtr]::Zero) {
  Write-WakeLog "ACQUIRE-FAILED PowerCreateRequest pid=$PID"
  exit 2
}
$setOk = [PowerReqNative]::PowerSetRequest($h, [PowerReqNative]::PowerRequestSystemRequired)
Write-WakeLog "ACQUIRED mode=$($PSCmdlet.ParameterSetName) set=$setOk pid=$PID"
$exitCode = 0
try {
  if ($PSCmdlet.ParameterSetName -eq 'Hold') {
    Start-Sleep -Seconds $Seconds
  }
  else {
    Invoke-Expression $Command
    if ($null -ne $LASTEXITCODE) { $exitCode = $LASTEXITCODE }
  }
}
catch {
  Write-WakeLog "ERROR during bounded pass: $_"
  $exitCode = 1
}
finally {
  [void][PowerReqNative]::PowerClearRequest($h, [PowerReqNative]::PowerRequestSystemRequired)
  [void][PowerReqNative]::CloseHandle($h)
  Write-WakeLog "RELEASED exitCode=$exitCode pid=$PID"
}
exit $exitCode
