# Wake lease test evidence — 2026-09-27

Workstream 2: Pig job-scoped wake lease implementation (Nolan's 2026-09-27 binding call).
All timestamps below are real tool output. Pig = 100.79.154.43 (MDT, UTC-6).

## What was proven

| # | Check | Result |
|---|-------|--------|
| A | Wrapper acquire → worker runs → release (success path) | PASS (mechanism); reason-format bug found and fixed, re-proven in A2 |
| A2 | Wrapper success via exact `run_pass.sh` WMI line shape, incl. `-Reason` with spaces | PASS (state file perfect; count assertion confounded by a concurrent production lease — see notes) |
| B | Crash: `Stop-Process -Force` on wrapper mid-run → kernel teardown | PASS — `powercfg /requests` returned to pre-launch count; state file `acquired:true` with NO `released`/`lease_end` flags |
| C | Library bracket with failing worker (exit 1) → `finally` still releases | PASS — exit code 1 propagated, full lease record written |
| P | Parse: all 11 generated remote PowerShell blocks + patched `wake-wrap.ps1` | 0 errors under the Pig's real PowerShell parser |
| S | `bash -n` on all 14 touched bash scripts | OK |
| Prod | Concurrent agent's `prompt-hermes.sh` run used the new code live: acquire → run → release, no intervention | PASS (`released: True` observed) |

## Notes on test conditions

- The Pig was LIVE during testing: a production FB engagement pass
  (`fb-20260927-132904`, wrapper PID 11116) and production Hermes runs were
  active. Count-based assertions used return-to-pre-launch baselines rather
  than absolute counts.
- Test A's reason came out as `'wake-lease` (truncated at the first space):
  `powershell.exe -File` does NOT group single-quoted arguments. Fixed by
  passing `-Reason` in backtick-escaped double quotes
  (`` -Reason `"FB engagement pass`" ``); verified with a dedicated quoting
  probe (`reason` recorded as `quote test reason`) and re-proven in A2.
- No power plan was changed, no `powercfg` policy write was issued anywhere,
  the Pig was not rebooted. Only read-only `powercfg /requests` was used.

## Raw logs

### Test A — wrapper success path (2026-09-27 14:30:42Z → 14:31:29Z)

```
=== TEST A: wrapper success path ===
start: 2026-09-27 14:30:42 UTC
run_id: waketest-A-20260927-143042
wrapper pid: 37984 (launched at 2026-09-27 14:30:44 UTC)
--- mid-run powercfg /requests at 2026-09-27 14:30:52 UTC ---
SYSTEM [PROCESS] lines mid-run: 2 (baseline 1, expect 2)
--- mid-run state file at 2026-09-27 14:30:54 UTC ---
{
    "run_id":  "waketest-A-20260927-143042",
    "reason":  "\u0027wake-lease",          <-- single-quote truncation bug (fixed after this run)
    "holder_pid":  37984,
    "mechanism":  "SetThreadExecutionState(ES_CONTINUOUS|ES_SYSTEM_REQUIRED)",
    "acquired":  true,
    "acquired_at":  "2026-09-27T08:30:46.5162186-06:00",
    "lease_start":  "2026-09-27T08:30:46.5162186-06:00",
    "prev_state":  "0x80000000"
}
waiting for worker completion...
--- post-run powercfg /requests at 2026-09-27 14:31:25 UTC ---
SYSTEM [PROCESS] lines post-run: 1 (expect 1)
--- post-run state file at 2026-09-27 14:31:27 UTC ---
{
    "run_id":  "waketest-A-20260927-143042",
    "reason":  "\u0027wake-lease",
    "holder_pid":  37984,
    "mechanism":  "SetThreadExecutionState(ES_CONTINUOUS|ES_SYSTEM_REQUIRED)",
    "acquired":  true,
    "acquired_at":  "2026-09-27T08:30:46.5162186-06:00",
    "lease_start":  "2026-09-27T08:30:46.5162186-06:00",
    "prev_state":  "0x80000000",
    "released":  true,
    "released_at":  "2026-09-27T08:31:11.3470229-06:00",
    "lease_end":  "2026-09-27T08:31:11.3470229-06:00"
}
```

### Test A2 — wrapper success, production WMI line shape (2026-09-27 14:32:02Z → 14:32:43Z)

```
run_id: waketest-A2-20260927-143202
wrapper pid: 39692 (launched at 2026-09-27 14:32:05 UTC)
SYSTEM [PROCESS] lines mid-run at 2026-09-27 14:32:14 UTC: 3 (baseline had shifted: a production Hermes run had started at 14:32:08Z holding its own lease)
SYSTEM [PROCESS] lines post-run at 2026-09-27 14:32:41 UTC: 2 (back to the shifted baseline)
{
    "run_id":  "waketest-A2-20260927-143202",
    "reason":  "wake-lease test A2",
    "holder_pid":  39692,
    "mechanism":  "SetThreadExecutionState(ES_CONTINUOUS|ES_SYSTEM_REQUIRED)",
    "acquired":  true,
    "acquired_at":  "2026-09-27T08:32:07.0346681-06:00",
    "lease_start":  "2026-09-27T08:32:07.0346681-06:00",
    "prev_state":  "0x80000000",
    "released":  true,
    "released_at":  "2026-09-27T08:32:27.2572183-06:00",
    "lease_end":  "2026-09-27T08:32:27.2572183-06:00"
}
```

### Test B — crash path (2026-09-27 14:33:13Z → 14:33:47Z) — THE crash-expiry proof

```
=== TEST B: crash path (kill wrapper mid-run) ===
start: 2026-09-27 14:33:13 UTC
run_id: waketest-B-20260927-143313
pre-launch SYSTEM [PROCESS] count: 2 (live production leases)
wrapper pid: 46920 (launched at 2026-09-27 14:33:17 UTC)
mid-run count at 2026-09-27 14:33:29 UTC: 3 (expect pre+1 = 3)
mid-run acquired: True
killing wrapper 46920 at 2026-09-27 14:33:30 UTC ...
post-kill count at 2026-09-27 14:33:42 UTC: 2 (expect back to pre = 2)
{
    "run_id":  "waketest-B-20260927-143313",
    "reason":  "wake-lease test B (crash)",
    "holder_pid":  46920,
    "mechanism":  "SetThreadExecutionState(ES_CONTINUOUS|ES_SYSTEM_REQUIRED)",
    "acquired":  true,
    "acquired_at":  "2026-09-27T08:33:19.3171279-06:00",
    "lease_start":  "2026-09-27T08:33:19.3171279-06:00",
    "prev_state":  "0x80000000"
}
acquired / has-released-flag / has-lease_end / reason: True False False 'wake-lease test B (crash)'
wrapper process after kill: GONE
orphaned worker cleaned at 2026-09-27 14:33:47 UTC
RESULT: PASS
```

The killed holder's SYSTEM request vanished from `powercfg /requests` with no
cleanup code running — kernel thread teardown is the crash-safe expiry. The
state file (acquired, never released) is the timestamped record of that fact.

### Test C — library bracket, failing worker (2026-09-27 14:33:52Z → 14:33:57Z)

```
remote exit code: 1 (expect 1)
remote stdout: WORKER_EXIT=1                      <-- stdout contract clean
remote stderr: WAKE_RELEASED run_id=waketest-C-20260927-143352   <-- telemetry on stderr only
{
    "run_id":  "waketest-C-20260927-143352",
    "reason":  "wake-lease test C (worker failure)",
    "holder_pid":  21740,
    "mechanism":  "SetThreadExecutionState(ES_CONTINUOUS|ES_SYSTEM_REQUIRED)",
    "acquired":  true,
    "acquired_at":  "2026-09-27T08:33:57.7674537-06:00",
    "lease_start":  "2026-09-27T08:33:57.7674537-06:00",
    "prev_state":  "0x80000000",
    "released":  true,
    "released_at":  "2026-09-27T08:33:57.8692516-06:00",
    "lease_end":  "2026-09-27T08:33:57.8692516-06:00"
}
RESULT: PASS
```

### Parse check (Pig-side PowerShell parser, 2026-09-27)

```
pscheck-hermes.ps1: errors=0
pscheck-ig_discover.ps1: errors=0
pscheck-ig_observe.ps1: errors=0
pscheck-ig_pass.ps1: errors=0
pscheck-ig_unfollow.ps1: errors=0
pscheck-meta_pass.ps1: errors=0
pscheck-page_post.ps1: errors=0
pscheck-th_pass.ps1: errors=0
pscheck-tk_pass.ps1: errors=0
pscheck-wake-wrap.ps1: errors=0
pscheck-x_engage.ps1: errors=0
```

### Production proof — live Hermes lease under the new code

A concurrent agent's `prompt-hermes.sh` invocation at 2026-09-27 14:32:08Z
acquired lease `wake-hermes-20260927-143208` (`reason: "Hermes headless prompt
run"`, `acquired: true`, `lease_start` set); after the run completed the
record showed `released: True` with `lease_end` set. Acquire → run → release
with zero intervention, on the first production use of the patched code.
