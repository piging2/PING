# Scoped wake inhibition for Pig automation workers

(2026-09-25, Nolan's order: for a machine acting as an automation worker,
prevent sleep WHILE AUTOMATION IS ACTIVE. Prefer a scoped wake/inhibit
mechanism tied to worker lifetime over globally disabling sleep.)

(2026-09-27, Nolan's binding call, supersedes the 2026-09-25 scope:
KEEP THE PIG AS A PERSONAL MACHINE. No global sleep disable, ever. Every
authorized long-running Pig job gets a JOB-SCOPED WAKE LEASE: acquire before
execution, release in finally/cleanup, crash-safe expiry, and a per-lease
record of job + lease start + lease end + reason. This file + wake-wrap.ps1 +
wake-bracket.sh are that mechanism, now wired into every authorized
long-running Pig launcher.)

## What this is

`wake-wrap.ps1` (canonical copy here in `~/workspace/pig-fb/`, deployed to
`C:/Users/nolan/.local/share/pigi/wake-wrap.ps1` on the Pig) holds
`SetThreadExecutionState(ES_CONTINUOUS | ES_SYSTEM_REQUIRED)` for exactly
one worker's lifetime. Worker starts -> inhibition acquired. Worker
exits or crashes -> inhibition released.

`wake-bracket.sh` (new 2026-09-27, sourced like `browser-lock.sh`) is the
library-mode helper for synchronous runners: `wake_ps_acquire <run_id>
<reason> [quiet]` / `wake_ps_release <run_id> [quiet]` emit the PowerShell
bracket (acquire + `try {` ... `} finally { release }`), `pig_ssh_wake`
launches the remote block with `-ExecutionPolicy Bypass` (required for the
dot-source), and `wake_wrap_deploy <caller>` scps the canonical
wake-wrap.ps1 per dispatch (warn-and-proceed; the bracket degrades to
today's no-inhibition behavior if the file is absent).

It never touches OS power policy: no `powercfg` writes, no sleep-timer
changes, no hibernate changes, no Task Scheduler entries.

## Why this mechanism

- **Crash-safe by construction, not by code path.** The execution-state
  request lives on the holder's thread. When the holder process/thread
  dies for ANY reason (clean exit, worker crash, `Stop-Process -Force`,
  machine still loses power excepted), the Windows kernel tears the
  request down automatically. There is no cleanup code that a crash can
  skip. Verified by test (see below): killing the holder removed the
  `powercfg /requests` SYSTEM entry with no `released` flag ever written.
- **Attributable.** While held, `powercfg /requests` shows the SYSTEM
  request under the holder's `powershell.exe`, and
  `C:/Users/nolan/.local/share/pigi/run-state/wake-<run_id>.json`
  records run_id, holder PID, acquire/release timestamps.
- **Honest acquisition.** `Wake-Acquire` returns `$false` (and records
  `acquired: false` plus `call_error`) if the API call fails; callers
  proceed WITHOUT the inhibition rather than claim one they don't hold.
- `ES_AWAYMODE_REQUIRED` is deliberately NOT used (see
  `wake-lock-design.md`).

## Usage mode 1: wrapper (detached workers)

For workers launched detached via WMI `Win32_Process.Create` (survives
SSH session teardown). The worker runs as a CHILD of the wrapper, so
their lifetimes are identical:

```powershell
$ret = ([wmiclass]'Win32_Process').Create("$psbin -NoProfile -ExecutionPolicy Bypass -File $wrap -RunId $runId -WorkerExe $node -WorkerArgsCsv $eng,$job -MaxWaitMinutes 240")
```

- `-WorkerArgsCsv` is a comma-separated single token (paths here never
  contain commas or spaces); the wrapper splits it into the worker argv.
- `-Reason '<why>'` records the human-readable lease reason in the state
  file. GOTCHA (2026-09-27): for `-File` launches, pass the reason in
  DOUBLE quotes (`` -Reason `"FB engagement pass`" ``). `powershell.exe -File`
  does NOT group single-quoted arguments: `-Reason 'a b'` binds `'a` and
  leaves `b'` as stray tokens. Inside the WMI `Create("...")` double-quoted
  string the inner doubles are backtick-escaped (`` `" ``).
- `-MaxWaitMinutes` (default 240) bounds the wait: on expiry the worker
  is killed, the inhibition released, exit code 124.
- The wrapper exits with the worker's exit code otherwise.

Wired today (wrapper mode, WMI-detached): `run_pass.sh` (FB engagement pass),
`run_unfollow.sh` (FB unfollow batch). Each scp's `wake-wrap.ps1` per
dispatch, pinned to the dispatch like the worker `.js` files; a failed
wrapper scp fails the dispatch closed (`infra=scp_failed`), same as any
other scp failure.

Wired today (library mode via `wake-bracket.sh`, synchronous runners):
`run_ig_pass.sh`, `run_ig_unfollow.sh`, `run_tk_pass.sh`, `run_th_pass.sh`,
`run_ig_discover.sh`, `run_page_post.sh`, `run_ig_observe_post.sh`,
`meta-pass.sh` (bracket around the `meta-ask.js` invocation; exit code
propagates via `$LASTEXITCODE`), `x-engage.sh` (one quiet lease per
`x-like-run.ps1` driver call; quiet mode emits no console lines so the
driver's stdout/`tail -1`/rc=3 contract is unchanged),
`prompt-hermes.sh` (bracket around the `wsl ... hermes-run.sh` call).

## Usage mode 2: library (synchronous remote blocks)

For scripts that already hold the SSH session open and run the worker
with their own `Start-Process`/`WaitForExit`/timeout logic. Dot-source,
then bracket the existing block; the run's own timeout/kill behavior is
unchanged:

```powershell
. 'C:/Users/nolan/.local/share/pigi/wake-wrap.ps1'
$wakeOk = Wake-Acquire -RunId 'ig-20260925-120000'
try {
  <existing worker launch + wait + timeout kill>
} finally {
  Wake-Release -RunId 'ig-20260925-120000'
}
```

Notes:
- The launching `powershell` needs `-ExecutionPolicy Bypass` for the
  dot-source to load (a plain `-NoProfile -EncodedCommand` session
  silently refuses to dot-source the file). `pig_ssh_wake` adds it.
- If `Wake-Acquire` returns `$false`, proceed WITHOUT the inhibition
  (today's behavior) and record the failure; never abort the run over it.
- Wake telemetry (`WAKE_ACQUIRED`/`WAKE_ACQUIRE_FAILED`/`WAKE_RELEASED`)
  goes to the REMOTE stderr via `[Console]::Error.WriteLine`, never stdout,
  so each script's remote stdout contract (result JSON, `DISCOVER_DONE`,
  driver lines) is unchanged. `x-engage.sh` uses quiet mode (no telemetry
  at all) because its `pig()` merges stderr into stdout.

## State files (per-lease record)

`C:/Users/nolan/.local/share/pigi/run-state/wake-<run_id>.json`:
acquire writes `{run_id, reason, holder_pid, mechanism, acquired,
acquired_at, lease_start, prev_state[, call_error]}`; release adds
`{released, released_at, lease_end}`. This is the per-lease record Nolan
required 2026-09-27: job (`run_id`) + lease start (`lease_start`) + lease
end (`lease_end`) + `reason`.
A file with `acquired: true` and NO `released` flag means the holder
died mid-run and the kernel released the inhibition (structural
crash-safety, proven by the kill test below) -- it is NOT a leaked lease.

## Crash-safe expiry (no watchdog process needed)

Nolan's 2026-09-27 call allows "a watchdog OR a timestamped lease file".
This design uses the timestamped lease file (the state file above) PLUS
the structural guarantee: the `SetThreadExecutionState` request lives on
the holder's thread, and the Windows kernel tears it down on ANY holder
death (clean exit, worker crash, `Stop-Process -Force`, SSH session drop).
No cleanup code exists that a crash could skip, so no dead job can pin the
machine awake, and no watchdog process is needed (deterministic-first:
fewer moving parts). Proven by test B below.

## Test evidence

2026-09-25 (synthetic workers, no real passes fired), 11/11 checks passed --
see the original subagent report. 2026-09-27 re-verification after the
`-Reason` / `wake-bracket.sh` patch, plus the crash-expiry proof Nolan's
call requires (full logs: `~/workspace/pig-fb/wake-lease-test-2026-09-27.md`):

1. **Acquire (wrapper):** WMI-launched wrapper + 25s worker ->
   `powercfg /requests` SYSTEM `[PROCESS]` 1 -> 2; state file
   `acquired: true`, `reason` recorded, `lease_start` set.
2. **Release on worker exit (wrapper):** count 2 -> 1, state file
   `released: true`, `lease_end` set, worker exit code propagated.
3. **Release on holder crash (the crash-expiry proof):** wrapper
   `Stop-Process -Force`d mid-run -> count 3 -> 2 (back to the live
   production baseline), state file `acquired: true` with NO `released` /
   `lease_end` flags (kernel teardown, not code). Orphaned worker cleaned up.
4. **Library bracket, failing worker:** worker exits 1 -> remote exit code
   1 propagated, `Wake-Release` still ran in `finally`, state file complete
   (`acquired` + `released` + `lease_start` + `lease_end` + `reason`).
5. **Parse check:** all 11 generated remote PowerShell blocks (8 sync
   runners + meta-pass + x-engage + prompt-hermes) plus the patched
   `wake-wrap.ps1` parse with 0 errors under the Pig's real PowerShell
   parser. All 14 touched bash scripts pass `bash -n`.
6. **Production proof:** a concurrent agent's `prompt-hermes.sh` run during
   the test window acquired a lease (`reason: "Hermes headless prompt run"`)
   and released it on completion -- the first production lease under the
   new code, acquire -> run -> release with no intervention.

## Test evidence (2026-09-25, synthetic workers, no real passes fired; kept for history)

Full log in the subagent report; 11/11 checks passed:

1. **Acquire:** WMI-launched wrapper + 90s node worker ->
   `powercfg /requests` SYSTEM `[PROCESS]` count 1 -> 2; state file
   `acquired: true`, `prev_state: 0x80000000`, no `call_error`.
2. **Release on worker exit:** worker killed -> count 2 -> 1, state file
   `released: true`.
3. **Release on holder crash:** wrapper `Stop-Process -Force`d mid-run ->
   count 2 -> 1, state file has NO `released` flag (kernel teardown,
   not code). Orphaned worker cleaned up.
4. **Library mode:** dot-source + `Wake-Acquire`/`Wake-Release` ->
   `LIB_ACQUIRED=True`, state file `acquired` + `released` true.

## Relationship to the existing keep-awake holder

`/home/nolan/keep-awake-start.sh` (on the Pig's WSL) manages a separate,
longer-lived `SetThreadExecutionState` holder (Nolan's 2026-09-24 decoupled
decision). It was left completely untouched by this work. Note: Nolan's
2026-09-27 call ("keep the Pig as a personal machine; every authorized
long-running job gets a JOB-SCOPED wake lease; never turn the personal
workstation into infrastructure by accident") arguably supersedes the
standing-holder model -- but retiring it changes live machine behavior, so
it is Nolan's call, not an automation decision. Flagged to Nolan; not touched.

## Gotchas learned implementing this

- PowerShell parses `0x80000000` as **Int32 (-2147483648)**. Passing the
  uncast `-bor` result to a `uint` P/Invoke parameter throws
  `MethodException` (surfaced as a NON-terminating error record, easy to
  miss with stderr discarded). Fix: `[uint32]2147483648` /
  `[uint32]1`, exactly like `keep-awake.ps1`.
- `($null -ne 0)` is `$true` in PowerShell. A failed API call that leaves
  `$prev` as `$null` would record a BOGUS `acquired: true`. `Wake-Acquire`
  checks `($null -ne $prev) -and ($prev -ne 0)` inside try/catch.
- `powercfg /requests` DOES list `SetThreadExecutionState` SYSTEM
  requests (one `[PROCESS]` line per holding process); it was the
  acquisition-failure bug above, not coalescing, that made the first
  test show a single line.
