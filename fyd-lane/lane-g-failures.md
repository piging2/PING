# Lane G failure log

## FL-20260921-G01 — PowerShell quoting broke detached holder launch (2026-09-21 20:00 UTC)
- What: first bounded proof run. `Start-Process` argument list used `\x27`
  escapes inside a `powershell.exe -NoProfile -Command "..."` string; PowerShell
  received literal `\x27`, threw `Missing argument in parameter list`, holder
  never started. `powercfg /requests` stayed `None.`, no log file created.
- Evidence: bridge stderr `At line:1 char:64 ... MissingArgument`; no
  `C:\ProgramData\FYD\wake-lock.log` afterwards.
- Root cause: my escaping, not the script. The bridge base64-encodes the whole
  script, so no manual escaping is needed.
- Recovery: switched to `cmd.exe /c start /min powershell.exe ...` with no
  inner quotes at all (path has no spaces).
- Safeguard: in bridge scripts, never hand-escape quotes for PowerShell;
  prefer arg forms with zero inner quoting.

## FL-20260921-G02 — Backslashes stripped from `-File` path (2026-09-21 20:02 UTC)
- What: holder still never started. `powershell.exe -File C:\ProgramData\FYD\wake-lock-run.ps1`
  failed with: `The argument 'C:ProgramDataFYDwake-lock-run.ps1' to the -File
  parameter does not exist.`
- Evidence: bridge stderr verbatim; `-File` received the path with all `\`
  removed.
- Root cause: backslash characters in my tool-call command string were
  consumed before reaching the Pig (JSON/tool-call layer strips `\` before
  non-special chars). The deployed .ps1 bytes were intact (sha256-verified);
  only the *invocation* path was mangled.
- Recovery: use forward slashes in every Windows path in bridge commands
  (`C:/ProgramData/FYD/wake-lock-run.ps1`); PowerShell accepts them.
- Safeguard: never put a literal backslash in a bridge command string.
  WSL-side paths (`/mnt/c/...`) already use forward slashes.

## FL-20260921-G03 — Lock window missed on 45 s hold (2026-09-21 20:03 UTC)
- What: 45 s detached holder ran correctly (`ACQUIRED 20:03:05Z`,
  `RELEASED 20:03:50Z` in the log), but T0->T1 took 54 s
  (`cmd /c start` launch latency), so the `powercfg /requests` observation at
  T1 landed after release and the bounded pass ran outside the lock.
- Evidence: log timestamps vs `date -u` markers in the same run.
- Root cause: fixed hold shorter than launch+observe latency; no polling.
- Recovery: 120 s hold with a poll loop that breaks on the first observed
  SYSTEM request, then runs the pass; wait past expiry, then re-check.
- Safeguard: never assume launch latency; always poll for the lock before
  doing timed work under it.

## FL-20260921-G04 — SetThreadExecutionState not observable via powercfg (2026-09-21 20:07 UTC)
- What: v1 script used `SetThreadExecutionState(ES_CONTINUOUS|ES_SYSTEM_REQUIRED)`.
  The P/Invoke call succeeded (returned prev=`0x80000000`, no exception;
  ACQUIRED/RELEASED logged with correct 45 s and 120 s spacing), but two
  `powercfg /requests` samples taken mid-hold both showed SYSTEM: `None.`
- Evidence: log lines `2026-09-21T20:05:04Z ACQUIRED ... pid=29388` /
  `2026-09-21T20:07:04Z RELEASED ...` vs `powercfg` samples at ~20:05:50 and
  ~20:05:53 showing no SYSTEM request; repeated with a 60 s hold
  (20:07:38-20:08:38), same result.
- Root cause: on this host the thread execution-state request is not
  enumerated by `powercfg /requests` (likely Modern Standby behavior), so
  acquire/release could not be independently proven.
- Recovery: rewrote `wake-lock-run.ps1` (v2) around `PowerCreateRequest` /
  `PowerSetRequest(PowerRequestSystemRequired)` with reason string
  `FYD automation wake lock (Lane G bounded pass)`; release via
  `PowerClearRequest` + `CloseHandle` in `finally`. Power-request objects are
  unambiguously listed under SYSTEM while held.
- Safeguard: a wake-lock mechanism is only acceptable if its held state is
  observable by an independent tool (`powercfg /requests`); log lines alone
  are not proof.

## FL-20260921-G05 — WSL-interop launch latency breaks external lock polling (2026-09-21 20:13 UTC)
- What: detached-holder + WSL-side `powercfg` polling repeatedly "missed" the
  hold: 20-iteration poll over a 120 s hold reported no SYSTEM request, and a
  6-sample run landed entirely post-release. The lock was actually held the
  whole time (log: ACQUIRED 20:09:26Z / RELEASED 20:11:26Z, set=True).
- Evidence: `cmd.exe /c start /min ...` issued 20:13:29, first sample printed
  20:15:09 — ~100 s later. Interop launch latency is 60-90 s on this host
  under load; external polls cannot be timed against the hold window.
- Root cause: treating WSL-interop process launch as fast. It is not.
- Recovery: in-holder capture — the bounded pass (`-Command` mode, run
  foreground) records `powercfg /requests` itself mid-pass to
  `C:\ProgramData\FYD\wake-lock-proof.txt`. Zero timing race; the proof is
  produced inside the lock by construction.
- Safeguard: never verify a Windows-side timed state from WSL-side polling;
  make the timed process capture its own evidence.

## FL-20260921-G01 recurrence (2026-09-21 20:16 UTC)
- Same `\x27` hand-escaping mistake repeated in the first in-holder proof
  command, producing `Invalid URI: The hostname could not be parsed` in the
  child. Silver lining: it accidentally proved the failure path — the log
  shows `ERROR during bounded pass` followed by `RELEASED exitCode=1`,
  i.e. the `finally` releases on child failure. Correct quoting (plain `"`
  inside bash single quotes) used for the successful run.
