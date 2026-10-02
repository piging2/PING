# WAVE B RECOVERY FALSIFIERS (read-only lane)
Lane: B (falsification/observation only). T+0 = 2026-09-28 ~19:30 MDT.
No product tree, worktree, or served directory was written. Only this report file was created.

## VERDICTS

T-07 (HOLD -> reaper -> redispatch): DIFFERENT MECHANISM. The literal sequence
(HOLD record, then lease expiry, then reapExpiredLeases resets to created) is NOT
PRESENT in any forest implementation. The underlying hazard is CONFIRMED in a broader
form: the reached reaper silently retries ALL unknown-outcome running missions on lease
expiry, not just HOLD ones. The watchdog must stay blocked until HOLD is wired with the
narrowed reaper.

T-08 (orca-run-mu6wmbzn evidence loss): MORE THAN ONE loss site. Evidence is lost at
(1) trimMission (drops the result field), (2) getTrace correlation (drops the four
MISSION_* lifecycle events), and (3) the t2 ContextPack assembly (merges nothing, runs
no sufficiency gate). The worker was honest; the failure is in evidence assembly.
Sufficiency evaluation is missing on the JS loop path. Exact reproduction below
matches the recorded run byte-for-shape.

---

## T-07: Reaper-gap verification

### Claimed gap (from ~/workspace/AGENTS.md, "Reaper-vs-HOLD design gap (open, needs Nolan)")
After a HOLD record, a mission leaves _processing, its lease expires, and
reapExpiredLeases resets it to created and re-dispatches ~60s later: an automatic
retry of an unknown-outcome mission.

### Forest search results

reapExpiredLeases implementations found:

1. ~/workspace/ce002/src/mission_runtime.js:482-490 (REACHED per the semantic asset
   register 02#11, "MissionScheduler 5s poll"). Wide predicate:
   `WHERE status IN ('running', 'assigned') AND lease_until IS NOT NULL AND lease_until < NOW()`
   -> SET status='created', lease cleared, retry_at=NOW(). No HOLD exclusion. No
   started_at narrowing.
2. Same wide predicate in: ~/workspace/tenanos-wave/swarm-18/live-mission_runtime.js:280-283;
   ~/workspace/convergence-zoom-2026-09-19/lane-d-execution/pig-src/ping-runtime/orchestration/mission_runtime.js:312-315;
   ~/workspace/tenanos-wave/swarm-09/writer-work/c3-mission_runtime.js:316-319.
3. ~/workspace/f01-fix/mission_runtime.js:361-385 (UNWIRED workspace dir, 21/21 tests,
   never committed). Narrowed: `WHERE status = 'assigned' AND started_at IS NULL AND
   lease_until < NOW()`. Comment: "A mission that reached 'running' MAY have produced
   an external effect - lease expiry NEVER turns it back into `created`".
4. ~/workspace/pig-transfer-tmp/mission_runtime.js:304 (pre-fix, superseded). Narrowed,
   same predicate as f01.

HOLD-record paths found:

1. ~/workspace/f01-fix/mission_runtime.js:410-440 parkHold(): atomically sets
   status='hold', outcome='UNKNOWN', retry_eligibility=FALSE,
   reconciliation_required=TRUE, CLEARS the lease ("clears the lease so no reaper or
   renewal ever touches the parked row again").
2. ~/workspace/pig-transfer-tmp/mission_runtime.js:369-372 parkHold(): SET
   status='hold', hold_record, lease_until = NULL. Also clears the lease.
3. ~/workspace/ce002/src: ZERO hits for "hold" (case-insensitive grep over
   ce002/src/mission_runtime.js and ce002/src/mission_scheduler.js). The reached
   implementation has NO HOLD record path at all.

Scheduler mechanics (ce002, the reached path):
- ~/workspace/ce002/src/mission_scheduler.js:93-105,142: poll every 5000ms.
- :166-177 Arrow 0: renews leases for missions in _processing.
- :180-186 Arrow 1: "Reap expired leases - turns assigned/running missions whose lease
  expired back to created, enabling re-dispatch after worker crash."
- :341-346: on dispatch timeout the mission "fails with retry through the normal path
  and the lease stops renewing".
- :385: finally block `this._processing.delete(mission.mission_id)`.
- ~/workspace/ce002/src/mission_runtime.js:117: lease TTL is 60 seconds
  (`lease_until = NOW() + INTERVAL '60 seconds'`).

### Hermetic repro (synthetic rows, pure JS, zero external effects, no DB)

Ran the exact ce002 reaper predicate (mission_runtime.js:484-489) against three
synthetic mission rows:

- m-running-effect-unknown: status='running', started_at set (worker invoked, external
  effect UNKNOWN), lease_until expired -> REAPED, reset to 'created'.
- m-hold-parked: status='hold' (f01-style HOLD, lease cleared) -> NOT reaped.
- m-assigned-never-started: status='assigned', started_at NULL, lease expired ->
  REAPED, reset to 'created' (the legitimate reclaim case).

Output: `reaped=true -> status=created` for the running row; `reaped=false ->
status=hold` for the HOLD row.

### Live test-suite observation (f01, hermetic fake pool, read-only run)

- `node --test mission_hold_reaper.invariant.test.js` -> 6/6 pass.
- `node --test mission_hold_noredispatch.invariant.test.js mission_scheduler.retry_watchdog.test.js mission_hold_static.test.js` -> 23/23 pass total.
- These suites run the exact adversarial sequence from the T-07 task (HOLD -> lease
  expiry -> reaper -> repeated polls -> restart -> second scheduler) and assert the
  HOLD row is never reaped, reclaimed, claimed, or dispatched; workerInvocations stays 1.
- ~/workspace/goals/ping-agent-execution-stack/hidden_files/backlog-burn-2026-09-27/mc-timeout-unknown-livefire.js
  (MC H5 HOLD live-fire, 2026-09-27): forced dispatch timeout -> HOLD parked
  (status='hold') -> ~8 real poll cycles -> still 'hold', zero re-dispatch.

### Verdict reasoning

NOT PRESENT (literal): no forest implementation writes a HOLD record that leaves the
row in 'running'/'assigned' with a live lease. Both HOLD writers clear the lease and
set status='hold', which no reaper predicate matches. The reached ce002 runtime has no
HOLD path at all, so the literal trigger cannot fire there either.

DIFFERENT MECHANISM (confirmed): the reached reaper resets ANY 'running' mission with
an expired lease to 'created' for re-dispatch. A mission that reached 'running'
(started_at set) may have produced an external effect; lease expiry happens whenever
the scheduler loses _processing (crash/restart: Arrow 0 renewal stops) or renewal
fails. That is an automatic retry of an unknown-outcome mission, the exact hazard
class the HOLD design exists to prevent, in strictly broader form than the claim.
Timing: 60s lease TTL + 5s poll gives redispatch within roughly a minute of expiry,
matching the "~60s later" in the claim.

Recommendation: keep the stuck-running watchdog deployment blocked. Wiring HOLD
requires the f01 narrowed reaper (or equivalent) in the reached runtime first; the
wide ce002 predicate would silently retry any unknown-outcome mission today, HOLD or
not.

---

## T-08: orca-run-mu6wmbzn exact evidence-loss reproduction

### Recorded run (ground truth)

- Run: orca-run-mu6wmbzn, 2026-09-18 ~11:57-12:01 UTC. Documented in
  ~/workspace/orca-dispatch-test/CONTROL-LOOP-DESIGN.md sections 3-4 and the 11-edge
  trace in ~/workspace/ping-24h/jev-refactor/lanes/orca-decisions.md (A4).
- Mission under verification: 70bd4b9d034b94a4 (most recent completed mission).
- t1 (text.summarize): work_order_id=59facef566e9be5d -> WORKER_COMPLETED
  event_id=bce4d7cb2bed2ba166d5fbcd4c03441cfb82456a9e95c744603d24f79c09b146.
- t2 (text.transform, causation_id=t1 event): input = live getTrace(70bd4b9d034b94a4),
  8 chain events -> work_order_id=f38d200eb01cbfc0 -> WORKER_COMPLETED
  event_id=bf88809f14fa55d426fbbf1dd46abb12905cdf7c2fbe8840464f7340b2e3605d.
- True state: MISSION_CREATED -> ASSIGNED -> STARTED -> COMPLETED all present for
  70bd4b9d034b94a4, result recorded.
- Recorded t2 worker output: chain_complete=false, all four MISSION_* events listed
  as gaps. Worker was honest relative to its lossy input.

### Implementation search (do-not-reimplement register 03#3)

Searched first, per the task:
- context_pack.py: not present in this workspace (lives in the frozen canonical
  tree / decision-fabric worktree; register: "runtime/cognitive/context_pack.py").
- context_compiler.js: not present in this workspace (same).
- build-context-pack.py: present at ~/workspace/tandem/build-context-pack.py, but
  NOT called anywhere in the mu6wmbzn t2 path (the loop references context_pack_id
  only as a work-order envelope identifier string, orca_control_loop.js:155,223,254).
- P-098 context-pack.ts: exists only as ~/workspace/tenanos-wave/diffs/P-20260923-098.diff
  (unpushed).
- ContextPack v2 context-compiler.ts: API-incompatible per register; not in path.
- Commit 9a555021 (contextpack-wire-2026-09-28 branch): worktree not present here.
- None of the above are in the mu6wmbzn evidence path. The "ContextPack" in this run
  is the t2 task-input object assembled by orca_control_loop.js itself.

### Loss sites (file:line)

LOSS 1 - trimMission drops result:
~/workspace/orca-dispatch-test/orca_control_loop.js:72-79. The buggy trimMission
returns 8 fields (mission_id, mission_type, status, priority, retries, assigned_to,
created_at, started_at, completed_at) and NO result field. The t2 input line
(:361) `mission_under_verification: trimMission(trace ? trace.mission : target)`
therefore cannot satisfy the brief's question (2) "Confirm a result payload was
recorded on the mission."

LOSS 2 - getTrace correlation drops lifecycle events:
~/workspace/ce002/src/mission_runtime.js:613-616.
`SELECT * FROM ping_events WHERE metadata->>'correlation_id' = $1 ORDER BY timestamp ASC`.
MISSION_* lifecycle events are emitted by MissionRuntime with their OWN
correlation_ids (recorded in CONTROL-LOOP-DESIGN.md section 4: "MissionRuntime emits
them without one" [shared one]), so the correlation join returns only the 8
worker-chain events and misses all four MISSION_* events.

LOSS 3 - t2 assembly merges nothing and runs no sufficiency gate:
~/workspace/orca-dispatch-test/orca_control_loop.js:340-344 builds chainEvents
solely from trace.events (the correlation trace). No lifecycle merge, no
completeness check. Grep over both loop versions finds no validate_or_raise /
_enforce_authority / sufficiency logic on the JS loop path (U7 H3 confirmed: the
sufficiency decider exists only on the cognitive path).

The fixes (already landed, not by this lane):
~/workspace/orca-finish/program/orca-a/src/orca_control_loop.js:140-153 (G1 fix part
1: trimMission preserves result_recorded) and :965-983 (G1 fix part 2: MISSION_*
queried by payload->>'missionId' and merged with the correlation trace).

### Exact repro (hermetic, node, zero external effects)

Reconstructed the recorded data shape (mission 70bd4b9d034b94a4 completed with
result recorded; 8 worker-chain events sharing correlation_id orca-run-mu6wmbzn;
4 MISSION_* events each with their own correlation_id) and ran the verbatim buggy
functions:

- Buggy trimMission (orca-dispatch-test:72): result present in row = true,
  result/result_recorded in trimmed output = false. LOSS 1 REPRODUCED.
- Buggy getTrace predicate (ce002:614): 8 events returned, 0 of the 4 true MISSION_*
  events included. LOSS 2 REPRODUCED.
- Buggy t2 assembly (orca-dispatch-test:340-344,361): chain_event_count = 8, gaps =
  MISSION_CREATED, MISSION_ASSIGNED, MISSION_STARTED, MISSION_COMPLETED. The recorded
  worker output (chain_complete:false, four gaps) is the honest consequence of this
  input. LOSS 3 REPRODUCED.
- Sanity with the fixed versions (orca-finish/program/orca-a): result_recorded =
  true, merged events = 12, all 4 MISSION_* present. Fixes close the loss.

### Verdict reasoning

MORE THAN ONE. The evidence loss is not a single bug:
1. trimMission loses the result evidence (field dropped).
2. getTrace correlation loses the lifecycle evidence (join misses MISSION_*).
3. The t2 assembly loses the opportunity to recover (no merge, no sufficiency gate),
   passing the lossy pack to the worker unflagged.
4. Sufficiency evaluation is absent on this path (confirmed by grep); the worker's
   honest chain_complete:false is correct behavior on bad input, not a loss site.

The U7 competing hypotheses map: H1 (trimMission preserves result) and H2 (getTrace
joins across correlation_id families) are both needed; H3 (sufficiency gate) is the
structural defense that would have flagged the lossy pack before dispatch to the
worker. No ContextPack v3 was built; nothing was rewired.

---

## Commands run (read-only)

- grep inventory of reapExpiredLeases / hold_record / "hold" / "SET status = 'created'"
  across ~/workspace (bounded, excluding ping-24h where noted).
- `cd ~/workspace/f01-fix && node --test mission_hold_reaper.invariant.test.js` -> 6/6 pass.
- `node --test mission_hold_noredispatch.invariant.test.js mission_scheduler.retry_watchdog.test.js mission_hold_static.test.js` -> 23/23 pass.
- Hermetic node repro of the ce002 reaper predicate on synthetic rows (T-07).
- Hermetic node repro of buggy trimMission + getTrace predicate + t2 assembly on
  reconstructed mu6wmbzn data, plus fixed-version sanity check (T-08).

## Open questions / follow-ups for the parent

1. T-07: the reached ce002 reaper still silently retries unknown-outcome running
   missions today. Wiring HOLD (f01) without narrowing that reaper first does not
   remove the hazard; it only adds a path the reaper already ignores. The narrowed
   reaper must land in the reached runtime before the watchdog deploys.
2. T-08: the mu6wmbzn run's evidence files (00-objective.json .. 99-close.json) were
   not found in this workspace (only referenced); the repro used the recorded
   description, which is complete and internally consistent across three independent
   documents (CONTROL-LOOP-DESIGN.md, jev orca-decisions.md, 00-TOP-10-UNKNOWNS.md U7).
3. context_pack.py and context_compiler.js are not reachable from this machine
   (frozen canonical tree); the T-08 verdict does not depend on them.
