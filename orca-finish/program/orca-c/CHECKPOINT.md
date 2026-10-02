# ORCA-C Checkpoint — reconciliation / dependency / successor / branch-movement / tool-loss / memory-poison / staleness / budget

Lane: ORCA-C, ORCA FINISH program (depth 2/2). Date: 2026-09-24 ~05:10 MDT.
Task: 8 adversarial missions on ORCA vs PING. Read-only on repos; scratch harnesses only.
Prior art consumed: orca-a VERDICTS.md (10 recs, HS-1..HS-6), orca-b VERDICTS.md
(16 recs, H1..H7, follow-on item 3 "branch movement probes — NOT STARTED"),
cmd-ops FAILURE-CLUSTERS.md (GC-1..GC-12, LA-1..LA-14, LM-1..LM-8).

Scope: /home/nolan/worktrees/orca-autonomy @ feature/orca-autonomy (Pig-side),
W2-IMPL-STATE /home/nolan/ping-orca-state @ orca-finish/state, mainline
/home/nolan/ping @ cc6856c3 (branch refactor/runtime-authority-convergence).
Scratch copies: orca-c/src/ (read-only reference); probes in orca-c/probes/.

Mission plan (all 8; harness-first where mechanisms exist):

1. RECONCILIATION SEMANTICS (crash points before/after checkpoint, before/after ack):
   harness over branch reconcileStartup + W2 orca_run_record semantics;
   classify recovered / lost / double-executed at each crash point.
   Expected overlap: orca-b rec 2/3 (LIVE) — add crash-point granularity.

2. DEPENDENCY GRAPHS (missing/blocked/cyclic): run W2 orca_ready_set against
   adversarial fixtures myself (verify the 16/16 claim); STATIC-check whether
   any loop ever calls it; A5 branch + mainline behavior on unsound graphs.
   Expected: fail-closed never-ready; no scheduler wiring.

3. SUCCESSOR WORK (kill between completion and successor creation): trace
   branch assessAndFollowUp ordering; is there a durable "successor intent"
   record? Probe the crash window. Mainline: successor generation in workers.

4. BRANCH MOVEMENT PROBES (orca-b item 3, NOT STARTED): verify branch tip vs
   ae55b77ff82a893d50c48ab299117b2f705a0f03; git log + diff stat; new
   mechanisms, changed semantics, drift vs orca-a/orca-b verdicts.

5. MCP/TOOL DISAPPEARANCE MID-RUN (tool vanishes claim->exec, exec->result):
   static trace of branch dispatchHermes/adapter paths + harness with a
   disappearing tool; classify hang / honest-fail / invent.
   Overlap: GC-4 (C5 fabricates) vs orca-b H7 honesty — keep scope distinct.

6. MEMORY POISONING (stale/contradictory memory entry in worker context):
   inventory what feeds worker context (PING memory claims, ORCA
   dispatcher inputs); test whether any mechanism detects/discounts poison.
   Risk: may be UNKNOWN; investigate honestly, do not manufacture a mechanism.

7. CONTEXT STALENESS (worker acts on pre-change snapshot; fencing/version):
   probe write paths: PING complete()/fail() WHERE clauses; ORCA run-record
   transitionRun/checkpointRun epoch checks; work-order record writes.
   Overlap: orca-a rec 6 (detect-not-prevent), orca-b rec 11 (stale drop).

8. BUDGET EXHAUSTION (durable budget hits zero mid-attempt): STATIC branch
   classifyRetry/budget paths; verify the TEST-A6 witnessed claim (budget read
   1/2 not reset; 2/2 -> escalate exit 3, no retry past budget); probe the
   mid-attempt race (budget zeroed while attempt in flight).

Evidence grades: STATIC / TEST (scratch harness or module runs) / LIVE
(witnessed real execution). No LIVE expected this lane (branch loop runs are
Pig-gauntlet territory; I will not dispatch live runs).

Verdict scale: PING STRONGER / EQUIVALENT / ORCA STRONGER->HARVEST /
PATTERN ONLY / NOT APPLICABLE / REJECT / UNKNOWN->INVESTIGATE.
Harvest specs for every ORCA STRONGER->HARVEST (concrete, implementable).

## Run log

- 05:10 MDT: lane setup; read orca-a/orca-b verdicts, FAILURE-CLUSTERS.md,
  ~/workspace/AGENTS.md (Pig SSH quoting rules).
- 05:12 MDT: began mission 4 (branch tip check) + source inventory for harness
  copies, Pig-side reads.

---

## Run log — 2026-09-24 (probe execution)

All probes run locally against byte-verified read-only source copies
(remote SHA-256 re-verified at probe time). Results:

- m1-reconcile-crash-points.js: 6/6 PASS. CP2 DISPATCH_LOST->AUTHORIZED;
  CP3 RENDEZVOUS_RECOVERED->COMPLETED; CP4 re-emit dedups to SAME event_id
  (no 2nd canonical event); CP5 successor re-derived stable id; CP7 cached
  no re-dispatch; CP8 400 reads, 0 torn JSON. Grade: TEST-behavioral
  (verbatim reconcile logic, real substrate, stubbed adapter/PG).
- m2-ready-set-adversarial.js: 12/12 PASS. Missing/failed/running/unknown
  dep, self-dep, 3-cycle, 100-cycle (fast terminate), diamond, blocked ids,
  unknown own state: all fail closed; no hang. STATIC: zero callers of
  readyWorkOrders in the A5 branch; W2 test file only.
- m3-successor-window.js: 5/5 PASS. STATIC: zero "successor" mentions in
  either tree (no durable successor-intent concept). TEST: crash between t1
  COMPLETED and t2 creation loses the in-memory plan; restart recomputes
  from LIVE state; changed live state -> successor content DRIFTS (identity
  stable, content not). Unverified predecessor -> follow-up escalates, never
  fabricated.
- m4-unknown-block.js: 15/15 PASS against the uncommitted H5 wiring
  (orca_unknown_block.js). Classifier matrix, idempotent first-wins block,
  schema enforcement, cancel/retry releases, budget-exhausted refusal,
  stale-state refusal, both crash windows fail closed, corrupt file fails
  loud. Closes orca-b record 15 UNKNOWN.
- m5-tool-disappearance.js: 4/4 PASS. Branch: missing dispatcher script ->
  nonzero exit, no fabricated success, bounded retry (m8). Mainline
  scheduler: unmapped/unregistered-worker missions skip forever, stay
  pending, no escalation (silent starvation). Null dispatch -> honest
  _failMission path.
- m6-memory-poison.js: 5/5 VULN-CONFIRMED. Contradictory findings co-stored
  unflagged; fabricated finding stored; contradictory patterns co-rendered
  into prompt context; no provenance; junk shape accepted. Real
  worker_state_machine.js + stubbed registry.
- m7-staleness.js: 7/7 PASS. claimRun CAS refuses stale epoch; lease
  handover works; stale holder transitionRun/checkpointRun SUCCEED (no
  epoch gate); work-order updateWorkOrder blind overwrite. PING complete()
  WHERE status='running' re-confirmed (orca-a H12a ABA already TEST-proven).
- m8-budget.js: 14/14 PASS. Branch: exhaustion honest, idempotent reserve,
  usage durable; crash-skew window (reservation written, count not
  incremented) skews usage low (fail-open, bounded) — local defect note.
  classifyRetry bounds attempts; PING failWithRetry 3x retry_pending then
  honestly failed; 4th call past budget stays failed.

## Branch movement (mission 4 detail)

- A5 tip UNCHANGED: ae55b77ff82a893d50c48ab299117b2f705a0f03 (2026-09-18).
- A5 working tree (uncommitted): M orca/control-loop/orca_control_loop.js
  (+102/-3), M orca/control-loop/policy/orca_status_model.js (+5),
  ?? orca/control-loop/orca_unknown_block.js (264 lines). This is the H5
  harvest spec (orca-b record 7) being implemented: post-boundary timeout ->
  OUTCOME_UNKNOWN + blocked from auto-claim/auto-retry + recorded operator
  release. Verified sound (m4 15/15).
- W2 state branch UNCHANGED: 30a750fadbfc041ee0c4a83ec8f721c134f4f22d, clean.
- Mainline tip MOVED cc6856c3b -> e48ef710 (FYD Wave 1 commits; non-linear,
  rebase/reset). Probed files mission_runtime.js + mission_scheduler.js are
  byte-identical across tips. No semantic movement in probed surfaces.

## Failure pipeline (local accidents + probe bugs)

1. LOCAL ACCIDENT (prior): Pig source-copy pipeline produced 9 empty files;
   CRLF broke the base64 regex. Fix: tr -d '\r'. All hashes verified after.
2. LOCAL ACCIDENT (prior): find quoting failed through CMD/WSL layers;
   retried with documented quoting pattern.
3. LOCAL ACCIDENT (probe bug): m1 CP8 reader loop blocked the event loop so
   the setInterval writer never fired (0 reads). Fix: single-threaded
   alternate write/read hammer. 400 reads, 0 torn.
4. LOCAL ACCIDENT (probe bug): m6 checks array referenced contraBoth before
   its const declaration; fixed ordering. Also a dropped `let vulns`
   declaration in an edit; restored.
5. LOCAL ACCIDENT (probe bug): m5 called sched._pollOnce(); real method is
   _poll(); also needed reapExpiredLeases stub. Fixed.
6. LOCAL ACCIDENT (harness): m5/m6 vendored modules needed stub deps
   (registry JSON, constitutional_time_authority chain). Documented minimal
   stubs preserving the used behavior (registry states; nowAsISOString).

None of these are generic classes; all are harness-local.
