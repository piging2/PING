# Pig Run-Scoped Wake Lock — Evidence 2026-09-23

## Decision (Nolan, 2026-09-23)

Keep normal sleep behavior on the Pig. Active automation acquires an
OS-supported wake lock during a run and releases it in finally/on crash
recovery. "Never sleep on AC" is rejected as a machine-wide workaround;
run-scoped wake inhibition is the primitive.

## Primitive

`~/workspace/pig/pigwsl-wakelock.sh` (4.1 KB, executable) — wrapper pattern:

```
pigwsl-wakelock.sh -- command [args...]   # run command under the lock
pigwsl-wakelock.sh status                 # show holders + power requests
pigwsl-wakelock.sh sweep                  # kill holders older than 12h
```

Mechanism (discovered on this machine, not assumed): a tagged
`powershell.exe` holder on the Pig calls
`SetThreadExecutionState(ES_CONTINUOUS | ES_SYSTEM_REQUIRED)` via P/Invoke,
then sleeps. Windows surfaces this as a SYSTEM power request, verified via
`powercfg /requests`. Release is a remote `pkill -f <tag>`; the request
clears immediately. Release runs in traps on EXIT/INT/TERM and is
idempotent. If the lock cannot be verified after 30s, the workload is NOT
run (fail closed). Exit status is the workload's status.

## What did NOT work (recorded so nobody retries it)

- Detached holder (`setsid nohup powershell.exe ... &` inside the bridge):
  the holder does not survive the launching ssh/WSL session closing.
  Quoting trap found along the way: a `# tag` PowerShell comment placed
  before `Start-Sleep` comments out the sleep, so the holder exits instantly;
  the tag comment must be last.
- Killing the local ssh alone does NOT release the lock: the interop
  powershell.exe outlives the ssh channel. Release must be the explicit
  remote tagged pkill (which the wrapper does).

## Proof (2026-09-23, all against the live Pig)

1. Normal run: `pigwsl-wakelock.sh -- pigwsl-run.sh '...sleep 10...'`.
   Mid-run `status` showed the tagged holder process AND a SYSTEM
   `[PROCESS] powershell.exe` request. Workload completed, wrapper exit 0.
   Post-run `status`: no holders, `powercfg /requests` all None.
2. Simulated crash: workload `exit 3` mid-run. Wrapper exited 3
   (status propagated), post-crash `status`: no holders, requests all None.
   Release on crash is structural (EXIT trap), not aspirational.
3. SIGINT during a 60s workload: trap deferred while the workload was still
   alive (correct: the run had not ended, so the lock stayed held); after
   the workload finished, the trap fired, wrapper exited, lock released,
   requests all None.
4. `sweep`: reports sweep-done; no stale holders existed.

## Invariants

- System-wide sleep policy was NOT changed (no `powercfg -change`, no
  "never sleep on AC", no reboot). `powercfg /requests` returns to the
  all-None baseline after every run.
- Bridge hygiene honored: every Windows .exe call carries `< /dev/null`;
  the wrapper script is ~4 KB (well under the 6,000-char guideline);
  no base64 chunking was needed (no file transfer; the holder is launched
  inline via the existing pigwsl-run.sh bridge).
- Tags are `PIG-RUN-WAKELOCK-<epoch>-<pid>`; concurrent runs each hold
  their own lock; orphans (local machine death) are cleaned with `sweep`.
