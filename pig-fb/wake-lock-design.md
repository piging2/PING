# Scoped Automation Wake Ownership — Design

- status: IMPLEMENTED 2026-09-25 (Nolan's scoped-inhibition order); EXTENDED
  2026-09-27 (Nolan's binding job-scoped wake lease call: KEEP THE PIG AS A
  PERSONAL MACHINE, no global sleep disable ever).
  Implementation: `~/workspace/pig-fb/wake-wrap.ps1` (canonical) deployed to
  `C:/Users/nolan/.local/share/pigi/wake-wrap.ps1`; wrapper mode wired into
  `run_pass.sh` and `run_unfollow.sh` (WMI-detached launches); library mode
  via new `~/workspace/pig-fb/wake-bracket.sh` wired into `run_ig_pass.sh`,
  `run_ig_unfollow.sh`, `run_tk_pass.sh`, `run_th_pass.sh`,
  `run_ig_discover.sh`, `run_page_post.sh`, `run_ig_observe_post.sh`,
  `meta-pass.sh`, `x-engage.sh` (per-like quiet leases), and
  `~/workspace/bin/prompt-hermes.sh`. Per-lease record now carries run_id
  (job) + reason + lease_start + lease_end. Crash-safe expiry is structural
  (kernel thread teardown; proven by kill test 2026-09-27) -- no watchdog
  process needed.
  Full mechanism, test evidence, and gotchas: `~/workspace/pig-fb/wake-lock-README.md`.
  OPEN OWNER QUESTION: the pre-existing long-lived keep-awake holder
  (`/home/nolan/keep-awake-start.sh` on the Pig) is untouched; retiring it
  is Nolan's call.
  Design deviations from this doc: (a) the keeper is the worker's PARENT
  (wrapper holds the request, worker is its child) rather than a sibling
  keeper process, so release-on-crash needs no kill choreography -- kernel
  thread teardown does it; (b) no heartbeat loop and no per-run local
  run-record file -- the Pig-side state file plus `powercfg /requests`
  proved sufficient; (c) acquisition failure warns-and-proceeds (today's
  behavior) rather than aborting the run.
- date: 2026-09-21 (design); implemented 2026-09-25
- decision ref: Nolan — "use a scoped wake lock for automation runs; do not globally disable sleep yet"
- failure ledger: FL-20260921-015 / FL-20260921-016 (Modern Standby killed CDP page targets mid-pass)
- invariant: **ACTIVE AUTOMATION REQUIRES EXECUTION HOST AVAILABILITY.** A job that needs the machine must declare that requirement in its own lifecycle; it must never be compensated by mutating workstation-wide power policy.

## 1. Runners in scope (where long-running automation starts/ends)

All runners live in `~/workspace/pig-fb/` and follow the same lifecycle:

```
local runner (bash, WSL)
  -> pig_ssh.sh (shared SSH helper)
  -> remote PowerShell on the Pig (C:/Users/nolan/.local/share/pigi/...)
       Start-Process node.exe <worker.js> <job.json>   (detached)
       WaitForExit(deadline up to 3h)
       emit result JSON from worker-written result file
```

Files to wire (each holds the fb- or ig-profile browser lock for the run's lifetime already):

- run_pass.sh — FB engagement pass (profile fb, :9223)
- run_unfollow.sh — FB unfollow batch (profile fb, :9223)
- run_ig_pass.sh — IG engagement pass (profile ig, :9226)
- run_ig_unfollow.sh — IG unfollow batch (profile ig, :9226)
- run_th_pass.sh — Threads pass
- run_tk_pass.sh — TikTok pass
- x-engage.sh — X pass
- meta-pass.sh — Meta AI intel pass (profile fb, :9223; has its own EXIT-trap run ledger in $OUTDIR/runs.jsonl)

Integration point is identical in all of them: the REMOTE_PS block that launches the worker. Wake ownership brackets that block: acquire before it, release after it, on every exit path.

## 2. Mechanism: SetThreadExecutionState, per-run, never OS policy

**Rejected (do NOT do):**
- `powercfg /requestsoverride PROCESS ...` — persists beyond the run; applies to every future invocation of that process name. This is a policy change wearing a request costume.
- `powercfg -setacvalueindex / -setactive`, disabling sleep timers, `powercfg /hibernate off` — global OS power-policy changes. Nolan explicitly deferred these.

**Chosen (v2, corrected 2026-09-21 per Microsoft docs):** `SetThreadExecutionState(ES_CONTINUOUS | ES_SYSTEM_REQUIRED)` called inside a dedicated short-lived **wake keeper** process on the Pig, one per run.

AwayMode correction: `ES_AWAYMODE_REQUIRED` is documented by Microsoft for media/background scenarios and to be used only when absolutely necessary; the `power-request` API also notes AwayMode requests apply to traditional S3 systems. The design's earlier claim that AwayMode is specifically the "Modern Standby-relevant flag" was too strong. Do NOT hard-code AwayMode as constitutional behavior. Before implementation: detect and record the Pig's actual supported sleep model, then test the smallest documented request that prevents idle sleep for the bounded run. Start with `ES_CONTINUOUS | ES_SYSTEM_REQUIRED`. Add `ES_AWAYMODE_REQUIRED` only if the actual Pig behavior and the Windows documentation justify it.

Why this is correctly scoped:
- The state is per-thread and cleared automatically when the thread exits (kernel teardown). Killing the keeper releases the inhibition with no cleanup code path needed.
- The keeper MUST check the return value. `SetThreadExecutionState` returning zero = acquisition failure. Do not claim wake ownership if the API call failed; the run record must reflect the failure and the run proceeds without the inhibition (with the existing suspend-detection/revalidation path as the fallback).
- The request is attributable: `powercfg /requests` shows the SYSTEM request held by the keeper's `powershell.exe` instance, so any operator can see exactly which run holds the machine awake.

**wake-keeper.ps1** (new file, synced to the Pig like other deps):

```powershell
# usage: powershell -NoProfile -File wake-keeper.ps1 -RunId <run_id>
param([string]$RunId)
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class Wake {
  [DllImport("kernel32.dll")]
  public static extern uint SetThreadExecutionState(uint esFlags);
}
"@
$ES_CONTINUOUS = 0x80000000; $ES_SYSTEM_REQUIRED = 0x1
$prev = [Wake]::SetThreadExecutionState($ES_CONTINUOUS -bor $ES_SYSTEM_REQUIRED)
if ($prev -eq 0) {
  @{ run_id=$RunId; keeper_pid=$PID; asserted_at=(Get-Date -Format o);
     acquisition_failed=$true; error='SetThreadExecutionState returned zero' } | ConvertTo-Json | Set-Content $hb
  exit 1  # runner treats this as wake ownership NOT acquired; does not claim it
}
$dir = 'C:/Users/nolan/.local/share/pigi/run-state'
New-Item -ItemType Directory $dir -Force | Out-Null
$hb = Join-Path $dir ("wake-" + $RunId + ".json")
# heartbeat so a dead keeper is observable from the runner
while ($true) {
  @{ run_id=$RunId; keeper_pid=$PID; asserted_at=(Get-Date -Format o);
     prev_state=$prev } | ConvertTo-Json | Set-Content $hb
  Start-Sleep -Seconds 30
}
```

The runner starts it detached and keeps the PID for the kill:

```powershell
$keeper = Start-Process -FilePath 'powershell' `
  -ArgumentList '-NoProfile','-File','C:/Users/nolan/.local/share/pigi/wake-keeper.ps1','-RunId', $runId `
  -NoNewWindow -PassThru
try {
  <# existing worker launch + WaitForExit #>
} finally {
  Stop-Process -Id $keeper.Id -Force -ErrorAction SilentlyContinue
}
```

**Dead-keeper semantics (fail closed):** if the keeper process dies, the thread exits and the inhibition clears automatically. The runner re-checks the heartbeat file after worker completion; a missing/stale heartbeat means wake ownership was lost mid-run, which is recorded as `wake_inhibitor_lost` in the run record and forces the suspend/revalidation path (section 4), never a silent "it probably stayed awake".

## 3. Run record (per run, durable, local)

Path: `~/workspace/pig-fb/run-records/<run_id>.json` (append-created by the runner at start; fields filled as the run proceeds; never rewritten after completion).

```json
{
  "run_id": "fb-20260921-150418",
  "host": "pig",
  "started_at_utc": "2026-09-21T15:04:18Z",
  "wake_inhibitor_acquired": { "at_utc": "2026-09-21T15:04:21Z", "keeper_pid": 51234, "mechanism": "SetThreadExecutionState(ES_CONTINUOUS|ES_SYSTEM_REQUIRED)", "acquisition_rc_nonzero": true },
  "browser_lock_acquired": { "at_utc": "2026-09-21T15:04:19Z", "profile": "fb" },
  "page_created": { "at_utc": "2026-09-21T15:05:02Z" },
  "last_checkpoint": { "at_utc": "2026-09-21T15:31:44Z", "action_index": 23, "cursor_ref": "inbox/job-....result.json (worker-side)" },
  "suspend_resume_detected": { "detected": false, "evidence": null },
  "completed_at_utc": "2026-09-21T16:12:03Z",
  "wake_inhibitor_released": { "at_utc": "2026-09-21T16:12:05Z", "keeper_pid": 51234, "heartbeat_ok": true },
  "outcome": "ok | capture_failed | infra:<code>"
}
```

Ordering inside a runner (integrates with the existing browser lock):

1. `wake_lock_acquire <run_id>` — launches keeper via pig_ssh, writes `wake_inhibitor_acquired`. On failure: record `infra=wake_lock_failed`, exit 2, never touch the browser.
2. `browser_lock_acquire <profile>` (existing) — writes `browser_lock_acquired`. On contention: release the wake keeper immediately (fail closed: no reason to hold the machine awake for a run that will not start), exit 2.
3. Worker runs; `last_checkpoint` updated from worker result/checkpoint data.
4. `wake_lock_release <run_id>` — on the local EXIT trap AND in the remote `finally`, so release happens on success, failure, cancellation (SIGINT/SIGTERM to the runner), and exception. Writes `wake_inhibitor_released`; a trap that cannot confirm the kill records `heartbeat_ok: false` and flags `wake_inhibitor_lost` instead of pretending.

New helper `wake-lock.sh` (sourced like `browser-lock.sh`) exposes `wake_lock_acquire` / `wake_lock_release` and owns the run-record file. It does NOT hold the wake state itself locally (WSL is not the execution host); it orchestrates the Pig-side keeper and the record. Release is idempotent: double-release is a no-op recorded once.

## 4. Suspend/resume detection + revalidation

The wake lock is a declaration of requirement, not a guarantee the firmware honored it. Every run ends with a suspend probe, win or lose.

**Detection (remote, after worker exit, before keeper release):**
- `powercfg /lastwake` — wake source/timestamp.
- Kernel-Power event IDs 506 (entering Modern Standby) and 507 (exiting) in the System log with timestamps inside the run window:
  `Get-WinEvent -FilterHashtable @{LogName='System'; Id=506,507; StartTime=$runStart}`.
- Cross-check: `(Get-Uptime).TotalSeconds` vs wall-clock elapsed; awake-time much smaller than elapsed implies a sleep gap (tolerant of clock skew).

If any of these place a suspend inside the run window: `suspend_resume_detected.detected = true` with the raw evidence attached. **Do not blindly continue as if nothing happened.** The run enters the revalidation path before its outcome is finalized.

**Revalidation (resume only when safe), in order; any step failing fails the run closed:**

1. **browser** — existing `cdp-health.sh` / `ensure-cdp.sh`: CDP endpoint responds, expected target count. If CDP is dead, relaunch via the established PigiFBLogin path, then re-probe.
2. **session** — read-only auth probe (existing `check_login.js` / per-profile equivalent): the profile's logged-in session survived. No new logins are attempted by automation.
3. **page** — `GET /json/list` on the CDP port; the worker's targetId must be present, otherwise `ensurePage()` recreation (already in engage.js / fb-unfollow.js) runs and its result is recorded in the run record under `page_created` (second entry, marked `recreated_after_resume`).
4. **auth state** — the page that survived/recreated must show the logged-in DOM state the worker expects; a logged-out page is an infra failure, not something to click through.
5. **cursor/checkpoint** — the worker's durable checkpoint (result file `checkpoint` field; intent ledger states) is read; the run resumes from the first action whose terminal state is not EXECUTED/FAILED/NOT_ATTEMPTED. Actions left in EXECUTION with no OBSERVATION are UNKNOWN_EXECUTION per the existing intent-ledger rules and are NOT retried blindly; they wait for deliberate reconciliation (existing `refuse` path).
6. Resume only when all five pass. Otherwise the run closes as `infra:suspend_unrecovered`, evidence attached, next scheduled run starts fresh from the durable cursor.

## 5. Architectural lesson (recorded, NOT built)

FL-20260921-016 proved: a 2,000-action campaign cannot be one opaque browser pass. A machine sleeping mid-pass must cost at most the current bounded action, not the whole campaign. The required shape, when a campaign engine is ever authorized:

```
ACTION PLAN (durable, per-action intents)
  -> bounded batches (each batch = one survivable unit of work)
  -> durable cursor (checkpoint after every batch, fsync-grade)
  -> idempotency (each action safe to re-drive; keyed on intent id)
  -> per-action receipt (EXECUTED / FAILED / NOT_ATTEMPTED, evidence attached)
  -> UNKNOWN handling (EXECUTION without OBSERVATION -> UNKNOWN_EXECUTION,
     deliberate reconciliation, never silent retry)
  -> reconciliation (final pass proves every intent reached a terminal state)
```

Most of this already exists piecemeal (action-intent-ledger, guard filter, orphan reaper, ensurePage, browser lock, and now wake ownership + suspend revalidation). The missing piece is only the durable cursor + bounded-batch worker loop. **Do NOT build the campaign engine now.** Recorded in the failure ledger as a note under FL-20260921-016; implementation waits for an explicit future authorization.

## 6. What stays unchanged

- The fb/ig browser profile locks (`browser-lock.sh`) and the fail-closed contention behavior.
- `ensurePage()` mid-pass page recovery in the workers.
- The action-intent ledger lifecycle (INTENT_DURABLE -> EXECUTION -> OBSERVATION -> terminal states) and the UNKNOWN_EXECUTION refusal rules.
- No global Pig power-policy change: no `powercfg` policy writes, no "never sleep on AC" setting, no Task Scheduler "wake the computer" additions. If the Pig later becomes a dedicated always-on execution node, that becomes an explicit infrastructure policy decision, not a side effect of this fix.

## 7. Proof bar (before FL-20260921-016 closes)

1. A real FB pass runs with the keeper: run record shows acquired -> completed -> released, `powercfg /requests` during the run shows the SYSTEM request from the keeper, heartbeat file fresh.
2. Cancellation drill: SIGINT the local runner mid-pass; keeper dies (heartbeat goes stale / pid gone), run record shows release-on-cancel, no orphan keeper left holding the machine awake.
3. The pass itself lands its actions with receipts and no duplicates (the pre-existing bar for the browser-lock/ensurePage fix).
4. A standby-during-run drill (if reproducible): suspend detected in the record, revalidation path executed, resume-from-cursor proven. If not reproducible on demand, the detection code ships with the probe results logged as `detected: false` and the ledger notes the drill as pending.
