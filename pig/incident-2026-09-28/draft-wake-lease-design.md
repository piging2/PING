# DRAFT — Wake lease design (runtime infrastructure, NOT a new authority)
# Harvests existing machinery: keep-awake.ps1 (central holder), pigwsl-wakelock.sh
# (run-scoped tagged holders, traps, 12h sweep, fail-closed acquire),
# sprint-wakelock-acquire.sh (sprint scope, 20% battery guard).

## Principle
Windows execution-state requests (SetThreadExecutionState ES_CONTINUOUS |
ES_SYSTEM_REQUIRED) are the supported mechanism — no mouse jigglers, no fake
input. A wake lease is a DURABLE RECORD of who holds such a request and why.
It is runtime infrastructure: the coordinator owns the lease file the way it
owns lock files. No new authority, no new service, no new scheduler.

## Lease record
Append-only JSONL: C:\Users\nolan\pig-wake-leases.jsonl (machine-local),
mirrored to ~/workspace/pig/wake-leases.jsonl (observability copy).
One line per lifecycle event: ACQUIRED, HEARTBEAT (folded into holder status,
not the JSONL — see below), RELEASED, EXPIRED, SWEPT.

Fields:
  lease_id    string, e.g. wl-20260928-031500-<short>
  owner       string, e.g. "cron:facebook-engagement-pass" / "lane:fyd-p0" / "manual:nolan"
  reason      string, human-readable bounded purpose
  started_at  UTC ISO-8601
  heartbeat   UTC ISO-8601 (updated by the holder, see below)
  expiry      UTC ISO-8601 (failsafe; max 12h from acquire)
  released_at UTC ISO-8601 (set on RELEASED)

## Acquire (fail closed)
1. Writer appends ACQUIRED record.
2. Starts a tagged holder reusing the pigwsl-wakelock.sh pattern:
   PowerShell loop calling SetThreadExecutionState(ES_CONTINUOUS|ES_SYSTEM_REQUIRED)
   every 55s, tag comment `# WAKE-LEASE <lease_id>` in the command line.
3. Verifies via `powercfg /requests` that a SYSTEM request from the holder is
   present. If not present within 30s: append RELEASED (reason=acquire_failed),
   kill the holder, and the job DOES NOT START.
4. Holder writes heartbeat every 60s to C:\Users\nolan\wake-lease-<lease_id>.status
   (UTC timestamp + onAc + esResult), mirroring the keep-awake.status pattern.

## Release
JOB FINISH / FAIL / CANCEL -> kill the tagged holder -> append RELEASED with
released_at. Release runs in traps (EXIT/INT/TERM) so a crashing worker still
releases — same as pigwsl-wakelock.sh.

## No stale wake lock
- Bounded leases: expiry max 12h from acquire (failsafe even if the sweeper dies).
- Heartbeat: a sweeper (pigwsl-wakelock.sh sweep pattern) runs on the existing
  15-min heartbeat cadence and kills holders whose heartbeat is stale >10 min
  or past expiry, appending SWEPT with the evidence.
- Battery guard (from sprint-wakelock): if discharging and charge <20%, the
  holder exits on its own so Windows may sleep gracefully. Nolan's directive:
  do not disable critical battery behavior.
- A crashed worker cannot leave the laptop awake forever: heartbeat stops ->
  sweep releases -> execution state clears.

## Coordinator answers
WHO is keeping the Pig awake?  -> lease_id + owner of every unexpired, heartbeat-fresh lease
WHY?                            -> reason field
SINCE WHEN?                     -> started_at field
Command: read C:\Users\nolan\pig-wake-leases.jsonl (or the workspace mirror)
and join with live holder PIDs (tasklist match on WAKE-LEASE tag).

## Relationship to keep-awake.ps1
keep-awake.ps1 is the ALWAYS-ON baseline holder (Nolan 2026-09-25 policy).
Wake leases are ADDITIVE and job-scoped: they exist so that even if the
baseline holder dies or the mode flips to NORMAL, an active consequential job
still holds the machine awake for its bounded duration. The sweeper must never
kill the baseline keep-awake holder (different tag).

## Explicitly deferred
Per-job lease integration into every cron wrapper is deferred until the
baseline holder's 03:41 failure is root-caused: if the platform ignored an
active ES_SYSTEM_REQUIRED request, per-job leases would have failed the same
way. Fix the class first, then wire leases.
