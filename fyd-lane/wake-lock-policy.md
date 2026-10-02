# FYD Wake-Lock Policy (Lane G, 2026-09-21)

## Directive

Nolan's "FYD: ONE READ MODEL, THEN BUILDER" directive (2026-09-21 ~13:58 MDT):
automation must hold a **scoped wake lock only while it actively runs**
(acquire -> execute bounded pass -> release in `finally`).
Automation must **not** depend on machine-wide never-sleep.

## Mechanism

**OS-supported Windows mechanism:** `PowerCreateRequest` + `PowerSetRequest`
with `PowerRequestSystemRequired` (Win32 power-request API), released via
`PowerClearRequest` + `CloseHandle` in a `finally` block. While held, the
request is listed by `powercfg /requests` under SYSTEM with the reason string
`FYD automation wake lock (Lane G bounded pass)`; on release it vanishes.
No registry edits, no `powercfg` scheme changes, no permanent sleep disable.

**Why this API:** an earlier revision used `SetThreadExecutionState`
(FL-20260921-G04). The call succeeded but the request never surfaced in
`powercfg /requests` on this host, so acquire/release was not independently
observable. `PowerSetRequest` creates a real power-request object that is
unambiguously visible while held and gone after release: exactly the
acquire/release proof the directive needs.

**Why Windows-side, not WSL-side:** sleep is a Windows power decision. A WSL
process cannot hold a Windows power request. The lock is therefore held by a
Windows (PowerShell) process that brackets the automation run.

## Implementation

Script: `C:\ProgramData\FYD\wake-lock-run.ps1`
(source of truth: `~/workspace/fyd-lane/wake-lock-run.ps1`, deployed via
sha256-verified chunked transfer)

Two modes, both bounded:

- `-Command '<powershell>'` — acquire -> run the command -> release in `finally`.
  Child exit code propagates; a throwing child still releases (proven).
- `-Seconds <N>` (1..7200) — acquire -> hold N seconds -> release in `finally`.
  Self-releases even if the orchestrator dies mid-pass: bounded by construction,
  no leaked lock possible.

Logging: `C:\ProgramData\FYD\wake-lock.log`, UTC ISO-8601 lines:
`ACQUIRED mode=<Hold|Run> ...` **before** work, `RELEASED exitCode=<n>` **after**
work, always via `finally`.

## Usage contract for the FYD automation loop

Any bounded pass (dev-server check, projection refresh, verification sweep)
runs as:

```powershell
# Option A: whole pass inside the lock (preferred when the pass is one command)
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File C:/ProgramData/FYD/wake-lock-run.ps1 `
  -Command "<bounded pass command>"

# Option B: lock held on Windows while the orchestrator drives WSL work
cmd.exe /c start /min powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File C:/ProgramData/FYD/wake-lock-run.ps1 -Seconds <bound>
# ... run bounded WSL pass via pigwsl-run ...
# holder exits on its own and releases in finally; bound caps the lock
```

Rules:
1. Every automated run acquires first, releases in `finally` — no exceptions.
2. The hold duration is an explicit bound, chosen per pass, never indefinite.
3. Machine sleep policy is never modified (`powercfg` scheme untouched).
4. `powercfg /requests` shows the SYSTEM request only for the duration of the
   pass; it must read `None.` before and after.

## Verification (2026-09-21, live on Pig)

Definitive proof run, `-Command` mode, foreground (20:16:15Z):

- `powercfg /requests` **captured from inside the holder mid-pass**
  (`C:\ProgramData\FYD\wake-lock-proof.txt`, copy at
  `~/workspace/fyd-lane/wake-lock-proof-2026-09-21.txt`) shows:
  ```
  SYSTEM:
  [PROCESS] \Device\HarddiskVolume3\Windows\System32\WindowsPowerShell\v1.0\powershell.exe
  FYD automation wake lock (Lane G bounded pass)
  ```
  followed by the bounded pass results: `200`, `200` (both Tailscale demo
  URLs fetched from the Windows side through the portproxy, under the lock).
- Log (`C:\ProgramData\FYD\wake-lock.log`):
  `2026-09-21T20:16:15Z ACQUIRED mode=Run set=True pid=41524` **before** work,
  `2026-09-21T20:16:16Z RELEASED exitCode=0 pid=41524` **after** work.
- Failure path (same day, 20:16:02Z): child threw
  (`Invalid URI: The hostname could not be parsed` — a quoting mistake in the
  test command, FL-20260921-G01 recurrence); the log shows
  `ERROR during bounded pass` then `RELEASED exitCode=1` — the `finally`
  releases on failure too.
- After all runs: `powercfg /requests` back to all `None.` (no leaked request).
- Sleep policy re-queried after the runs: Balanced scheme, Sleep-after
  AC=`0x0`/DC=`0x4b0`, Hibernate-after AC=`0x0`/DC=`0x7fffffff` — identical to
  the pre-run baseline. **Machine sleep policy unchanged.**

Note on method (FL-20260921-G05): observing the lock from *outside* via
detached holder + WSL-side polling kept missing the hold window because
`cmd.exe /c start` through WSL interop takes 60-90 s to return. The reliable
proof is in-holder capture: the bounded pass itself records
`powercfg /requests` while it runs. The `-Command` mode exists for exactly
this pattern.

## What this does NOT do

- Does not disable sleep machine-wide, permanently or otherwise.
- Does not change any `powercfg` scheme, timeout, or hibernate setting.
- Does not expose anything publicly; unrelated to the Tailscale forwarding.
- Does not replace the reboot-resilience forward script (`forward-3100.ps1`).
