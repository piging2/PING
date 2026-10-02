# ORCA-C Verdicts — reconciliation / dependency / successor / branch-movement / tool-loss / memory-poison / staleness / budget

Date: 2026-09-24. Lane: ORCA-C (ORCA FINISH, depth 2/2). Read-only on repos; scratch harnesses only.
Prior art: orca-a VERDICTS.md (10 records, HS-1..HS-6), orca-b VERDICTS.md (16 records, H1..H7),
cmd-ops FAILURE-CLUSTERS.md (GC-1..GC-12). Harvest numbering continues: orca-b ended at H7;
new harvests here are H6 (m5), H7 (m6), H8 (m7). H5 was specified in orca-b record 7 and is
now implemented in the A5 working tree; mission 4 verifies the implementation.

Evidence grades: STATIC (source read), TEST (scratch harness against real modules),
TEST-behavioral (verbatim logic, real substrate, stubbed adapter/PG), LIVE (prior runs).

Verdict scale used exactly:
PING STRONGER / EQUIVALENT / ORCA STRONGER→HARVEST / PATTERN ONLY /
NOT APPLICABLE / REJECT / UNKNOWN→INVESTIGATE.

## Verdict summary table

| # | Mission | Verdict | Confidence | Harvest |
|---|---------|---------|------------|---------|
| 1 | Reconciliation crash points | ORCA STRONGER→HARVEST | high | crash-point matrix method + emit-before-mark/dedup (H-spec §H-M1) |
| 2 | Dependency graphs | ORCA STRONGER→HARVEST | high | H4 (orca-b rec 7; re-proven 12/12; loop wiring now landing via H5) |
| 3 | Successor-work crash window | ORCA STRONGER→HARVEST | high | successor-as-pure-derivation rule (H-spec §H-M3) |
| 4 | Branch movement (H5 impl) | ORCA STRONGER→HARVEST | high | H5 verified; closes orca-b record 15 UNKNOWN |
| 5 | Tool disappearance | ORCA STRONGER→HARVEST | high | H6: absent-tool resolution (new) |
| 6 | Memory poisoning | ORCA STRONGER→HARVEST | high | H7: worker-memory provenance (new) |
| 7 | Context staleness / fencing | ORCA STRONGER→HARVEST | high | H8: epoch-gated writes (new) |
| 8 | Budget exhaustion | EQUIVALENT | high | none new (both terminate honestly; local crash-skew note) |

Counts: ORCA STRONGER→HARVEST 7, EQUIVALENT 1, others 0. New harvest specs: H6, H7, H8.
New generic classes: none (all findings are local/product defects or already-classified).
UNKNOWNs closed: orca-b record 15 (timeout-after-effect T2/T3) — closed by H5 implementation,
verified in mission 4. Open UNKNOWNs: none new.

---

## Record 1 — reconciliation crash-point matrix

DOMAIN: orca-c mission 1 / COMPONENT: A5 branch `reconcileRunningWorkOrder` +
`acceptRendezvousResult` ordering (control loop) / CLAIM: at every crash point
before/after checkpoint and before/after result/event ack, the system converges
to exactly one of recovered / lost-with-history / refused-redispatch, and never
double-executes a canonical event / EVIDENCE: TEST-behavioral (probes/m1:
6/6; verbatim reconcile decision tree, real objective-runtime substrate,
stubbed adapter with ON CONFLICT-style dedup by result_id, real pidAlive) /
CALLER: reconcileStartup (restart path) / CALLEE: objRuntime (atomic JSON),
adapter.recordVerifiedResult / WRITER: dispatcher rendezvous / READER:
reconcile path / AUTHORITY: coordinator (single, advisory-lock) / CLASSIFICATION:
ORCA STRONGER→HARVEST / CONFIDENCE: high / BROKEN BOUNDARY: none found; the
canonical-emit-before-terminal-mark ordering plus result_id dedup makes the
ack window (CP4) idempotent / DEPENDENCIES: H5 (timeout path now OUTCOME_UNKNOWN,
so the old failed-envelope retry no longer interacts with this matrix) /
AFFECTS AGENTS: orca-c, w2-impl-state.

Detail: CP2 (RUNNING, pid dead, no rendezvous) -> DISPATCH_LOST -> AUTHORIZED,
history kept, attempt_count not inflated, zero canonical events. CP3 (rendezvous
present, never accepted) -> RENDEZVOUS_RECOVERED -> COMPLETED, exactly 1 event.
CP4 (canonical event emitted, terminal mark lost) -> restart re-emits, dedup
returns the SAME event_id, terminal converges, zero second events. CP5/CP7
(successor/completion windows) -> re-derived or cached, zero duplicate
dispatch. CP8 -> 400/400 reads parse, zero torn JSON (temp+rename holds).

HARVEST (H-spec §H-M1): (1) enumerate every crash point between durable writes
and assert recovered/lost/refused + no-double-execution for each — the
crash-point matrix is the test artifact; (2) canonical emission must precede
terminal state marking, keyed by a stable result_id with ON CONFLICT DO NOTHING
semantics, so any re-emit after a crash converges instead of duplicating.

## Record 2 — dependency graphs

DOMAIN: orca-c mission 2 / COMPONENT: W2 `orca_ready_set.readyWorkOrders`
(pure query) vs A5 branch scheduling vs mainline MissionScheduler / CLAIM: the
W2 ready-set query fails closed on every adversarial graph (missing, failed,
running, unknown-state, self, cyclic, 100-cycle, blocked ids) — never hangs,
never proceeds unsoundly; no production scheduler calls it / EVIDENCE: TEST
(probes/m2: 12/12, real module) + STATIC (zero callers of readyWorkOrders in
the A5 branch; W2 test file is the only other reference; branch chains are
hardcoded t1->t2 sequential awaits; mainline has no DAG concept) / CALLER:
(none in production; future loop) / CALLEE: n/a (pure) / WRITER: n/a /
READER: (future) reconcile/pre-dispatch / AUTHORITY: n/a (query) /
CLASSIFICATION: ORCA STRONGER→HARVEST / CONFIDENCE: high / BROKEN BOUNDARY:
the query is sound but unwired — production scheduling remains graph-unaware
on all three surfaces / DEPENDENCIES: H4 / AFFECTS AGENTS: orca-c, w2-missions.

Detail: missing dep / failed dep / RUNNING dep / unknown dep state / self-dep /
3-cycle / 100-cycle all -> never ready, terminate fast (no exponential blowup).
Diamond -> only deps-satisfied nodes ready. blockedWorkOrderIds (OUTCOME_UNKNOWN)
-> never ready. Unknown own state -> never claimable. The safe-starvation
property (never-ready rather than unsound) is the correct degradation; the
gap is observability (no cycle/deadlock diagnostic is returned).

HARVEST: H4 (orca-b record 7) — already specified; new evidence 12/12. The
loop wiring H4/H5 called for (blockedWorkOrderIds plumbed into reconcile and
pre-dispatch) is now landing in the A5 working tree via the H5 implementation
(mission 4). No new spec needed; do not duplicate.

## Record 3 — successor-work crash window

DOMAIN: orca-c mission 3 / COMPONENT: A5 branch `assessAndFollowUp` +
`delegate(taskKey='t2-chain-verify')` / CLAIM: killing the loop between t1
completion and successor creation loses only the in-memory plan; restart
re-derives the successor from the verified t1 terminal plus LIVE state, with a
stable identity — but the successor's CONTENT can drift if live state moved /
EVIDENCE: STATIC (zero "successor" mentions across both trees: no durable
successor-intent concept exists) + TEST (probes/m3: 5/5; faithful derivation
of the assessment's target rule `target = observation.lastCompletedMission`;
classifyFollowUp on the real policy) / CALLER: control-loop main (post-t1) /
CALLEE: orcaPolicy.classifyFollowUp, delegate / WRITER: n/a (no durable
successor writer) / READER: n/a / AUTHORITY: verified t1 terminal + live
mission state / CLASSIFICATION: ORCA STRONGER→HARVEST / CONFIDENCE: high /
BROKEN BOUNDARY: none — the drift is honest recomputation, not corruption;
the fail-closed counterpart holds (unverified predecessor -> follow-up
escalates, never fabricated) / DEPENDENCIES: H4 / AFFECTS AGENTS: orca-c.

Detail: pre-crash successor scheduled against live m-100; post-restart with
live state moved, the regenerated successor verifies m-101 — same stable task
key, different content. This is recoverable derivation, not atomic successor
creation. The drift is bounded and honest (built from verified evidence +
current live state), but any consumer assuming "the successor the crashed run
planned" will observe a different successor than "the successor the restart
planned."

HARVEST (H-spec §H-M3): successor derivation must be a pure function of
(verified predecessor terminal, live state at derivation time) with a stable
successor identity; never persist a separate "successor plan" that can go
stale; when derivation inputs are unverified, escalate instead of planning.

## Record 4 — branch movement: H5 unknown-block implementation

DOMAIN: orca-c mission 4 (orca-b follow-on item 3, was NOT STARTED) /
COMPONENT: A5 working tree, uncommitted: `orca/control-loop/orca_unknown_block.js`
(new, 264 lines) + diffs to `orca_control_loop.js` (+102/-3) and
`policy/orca_status_model.js` (+5) / CLAIM: the H5 harvest spec (orca-b record 7)
is being implemented: a post-side-effect-boundary coordinator timeout marks the
attempt OUTCOME_UNKNOWN, blocks the work order from auto-claim and auto-retry,
and only a recorded operator decision releases it; the implementation is sound
under adversarial probing / EVIDENCE: TEST (probes/m4: 15/15 against a
byte-verified read-only copy of the uncommitted file + real objective-runtime;
verbatim delegate/reconcile guard order checked against the working-tree diff) +
STATIC (branch tip still ae55b77ff82a893d50c48ab299117b2f705a0f03; W2 tip still
30a750fadbfc041ee0c4a83ec8f721c134f4f22d clean; mainline moved cc6856c3b ->
e48ef710 on FYD-only commits with probed files byte-identical) / CALLER:
delegate (timeout path, pre-dispatch guard), reconcileStartup (skip guard) /
CALLEE: objRuntime, orca_unknown_block / WRITER: timeout path (block), operator
(releaseBlockedWorkOrder — the only un-block writer) / READER: reconcile,
pre-dispatch / AUTHORITY: operator for release; the block itself is automatic /
CLASSIFICATION: ORCA STRONGER→HARVEST / CONFIDENCE: high / BROKEN BOUNDARY:
none in the wiring; note the module does not itself enforce "only block
OUTCOME_UNKNOWN work orders" (callers do) — hardening note, not a defect /
DEPENDENCIES: H5 (orca-b rec 7), H4 / AFFECTS AGENTS: orca-c, orca-b (closes
record 15), whoever owns the A5 working tree.

Detail: classifier matrix correct (timeout -> POST_BOUNDARY_UNKNOWN; transport
error with dispatcher never run -> PRE_BOUNDARY; clean -> KNOWN; transport
error WITH rendezvous collected -> KNOWN, result path decides). Block is
idempotent first-wins with entry schema enforcement. Release 'cancel' ->
BLOCKED terminal + durable decisions log; 'retry-after-reconcile' -> AUTHORIZED
with history preserved; refused when attempt budget exhausted; refused when
state already moved (stale entry is not an authorization). Crash windows: the
loop writes the blocked file BEFORE the OUTCOME_UNKNOWN state write, so a
SIGKILL between them leaves (blocked + RUNNING) — the reconcile skip-guard
and pre-dispatch guard both fire first (fail closed). Reverse window (state
OUTCOME_UNKNOWN, file missing) is closed by OUTCOME_UNKNOWN being in the
terminal set. Corrupt blocked file fails loud (consistent with substrate
readJson; the loop dispatches nothing). The timeout path no longer constructs
a failed envelope (retired, kept for evidence reference) — this removes the
T2/T3 residual from orca-b record 15.

This CLOSES orca-b record 15 UNKNOWN→INVESTIGATE (timeout-after-effect
classification): the T1/T2/T3 matrix now has an implemented, tested decision
procedure. No new UNKNOWN opened.

HARVEST: H5 — already specified in orca-b record 7; implementation verified.
No new spec; do not duplicate.

## Record 5 — tool disappearance

DOMAIN: orca-c mission 5 / COMPONENT: A5 branch dispatchHermes/runDispatcherSpawn
(child-process tool) + mainline MissionScheduler (worker tool) / CLAIM: when
the tool disappears, the branch degrades honestly (visible nonzero exit, no
fabricated success, bounded retry, now OUTCOME_UNKNOWN block on timeout); the
mainline scheduler silently skips missions whose worker is absent — forever,
with no escalation / EVIDENCE: TEST (probes/m5: 4/4; real child_process spawn
of a nonexistent dispatcher script; REAL MissionScheduler with stub runtimes,
3 polls) + STATIC (verbatim spawn-error -> transportError path; scheduler
skip paths at mission_scheduler.js:195,201) / CALLER: delegate (branch),
_poll (mainline) / CALLEE: child_process, workerRuntime.getStats /
WRITER: n/a / READER: n/a / AUTHORITY: n/a / CLASSIFICATION:
ORCA STRONGER→HARVEST / CONFIDENCE: high / BROKEN BOUNDARY: mainline
silent-skip loop — a mission whose worker never registers is counted in
`skipped` each poll but never fails, never dead-letters, never emits an
event; the only signal is a counter. Single surface (branch does not do this:
absent dispatcher -> transportError -> bounded attempts -> FAILED) so this is
a local/product defect, not a new generic class / DEPENDENCIES: none /
AFFECTS AGENTS: orca-c, mainline scheduler owners.

Detail: branch missing-dispatcher -> child exits nonzero fast; the loop's
verbatim path yields transportError -> dispatchFailure classification ->
attempt loop -> classifyRetry bounds (m8) -> FAILED retry-budget-exhausted;
post-boundary timeout -> H5 OUTCOME_UNKNOWN block (record 4), never a blind
retry. Mainline: mission with unmapped type OR mapped-but-unregistered worker
-> skip + skipped++, stays pending across polls indefinitely. Contrast: worker
registered but dispatch() returns null -> honest _failMission -> retry path
(no phantom-complete). The gap is specifically the pre-dispatch absence check.

HARVEST (H6): absent-tool resolution. Every dispatch path must resolve a
missing tool/worker to exactly one of: (a) honest terminal failure entering
the retry budget, (b) bounded retry then terminal, or (c) OUTCOME_UNKNOWN
block. A poll loop must track consecutive skips per mission and escalate
(fail or dead-letter) after N skips; a skip counter that never escalates is a
liveness bug. Implementable: per-mission skip_count in the scheduler, threshold
-> _failMission('worker unavailable after N polls').

## Record 6 — memory poisoning

DOMAIN: orca-c mission 6 / COMPONENT: mainline
`ping-runtime/orchestration/execution/worker_state_machine.js` (the LIVE read
path `getContext` -> artifactRouter.buildPrompt) vs A5 branch (no persistent
memory fed to the worker; prompt says "use ONLY this data") / CLAIM: a
poisoned memory (stale contradictory entry, fabricated high-confidence
finding, contradictory patterns) is stored unflagged and reaches the worker's
prompt context undetected; no provenance, no TTL, no contradiction detection,
no schema validation / EVIDENCE: TEST (probes/m6: 5/5 VULN-CONFIRMED against
the real module with a stubbed registry; contradictory findings co-stored,
contradictory patterns co-rendered into getContext output, junk shape
accepted) + STATIC (collectWorkerOutput writes worker findings back into
memory: the poison feedback loop; the parallel WorkerMemory.getContextPrompt
has no callers — the live path is WorkerStateMachine.getContext) /
CALLER: artifactRouter.buildPrompt (prompt construction) / CALLEE:
WorkerStateMachine.recordFinding/recordPattern/getContext / WRITER:
collectWorkerOutput (worker output -> memory), recordPattern / READER:
getContext (every dispatch) / AUTHORITY: none (no provenance authority) /
CLASSIFICATION: ORCA STRONGER→HARVEST / CONFIDENCE: high / BROKEN BOUNDARY:
the memory->prompt boundary has no provenance/freshness gate; fabricated
outputs (GC-4) can enter memory and steer future workers. Single surface
(mainline only; the branch has no memory surface) so this is a local/product
defect, not a new generic class — adjacent to GC-4 but distinct (missing
boundary, not fabricated data) / DEPENDENCIES: GC-4 (adjacent) / AFFECTS
AGENTS: orca-c, mainline execution owners.

Detail: injected "null check missing on user input" + stale contradiction
"null check present and correct; no action needed" both stored, no flag field.
Fabricated {"critical vuln", confidence 0.85} stored. "always retry
immediately" (pattern) + "never retry immediately" (anti-pattern) both
rendered into the prompt context with no resolution. No writer/source/origin,
no expires_at/ttl, no superseded/contradicts flag anywhere. A non-object
finding ('not-an-object') accepted without error.

HARVEST (H7): worker-memory provenance. Every memory entry must carry
{writer, source, recorded_at, ttl or version}; getContext must render
provenance with the entry; contradictory entries must be flagged (never
silently co-rendered); expired entries excluded; junk-shape writes rejected;
findings without an evidence reference must not enter memory from worker
output. The branch's discipline (no persistent memory; "use ONLY this data;
do not invent facts") is the interim bar.

## Record 7 — context staleness and fencing

DOMAIN: orca-c mission 7 / COMPONENT: W2 `orca_run_record.claimRun` (fencing
epoch CAS) + `transitionRun`/`checkpointRun` (no epoch gate) + branch
`updateWorkOrder` (no epoch/holder check) + PING `mission_runtime.complete`
/ CLAIM: fencing exists on the W2 claim path (stale epoch refused, detectable)
but no write path enforces it — a stale holder's late transition/checkpoint
succeeds; the branch work-order update is a blind overwrite; PING's complete()
still matches only status='running' (the orca-a H12a ABA hazard, unchanged) /
EVIDENCE: TEST (probes/m7: 7/7, real modules on scratch dirs: stale-epoch
claim refused; lease handover ok; stale-holder transitionRun and
checkpointRun succeed; stale work-order overwrite succeeds) + STATIC
(complete() WHERE status='running' with no holder/epoch, re-confirmed at the
current mainline tip) / CALLER: coordinator / CALLEE: run record, work-order
record, ping_missions / WRITER: any stale holder / READER: reconcile /
AUTHORITY: PG advisory lock (single coordinator; the actual fence) /
CLASSIFICATION: ORCA STRONGER→HARVEST / CONFIDENCE: high / BROKEN BOUNDARY:
the fencing token is detect-not-prevent (orca-a's classification, now
TEST-confirmed across more paths); the real fence remains the advisory lock /
DEPENDENCIES: orca-a H12a (PING ABA, PING stronger there), orca-a fencing-token
record / AFFECTS AGENTS: orca-c, w2-impl-state.

Detail: claimRun CAS works exactly as specified (epoch 0 -> ok/1; stale epoch
0 -> refused stale-epoch; current epoch -> ok/2). But after losing the lease,
holder A calls transitionRun(START) and checkpointRun(...) — both succeed with
no epoch check; the epoch is readable (detectable) but not enforced. Branch
updateWorkOrder: a stale dispatcher's late COMPLETED overwrites with no check.
PING complete()/fail()/renewLease(): no lease epoch or holder token anywhere.

HARVEST (H8): epoch-gated writes. Every state-mutating write (transitionRun,
checkpointRun, updateWorkOrder, and PING complete/fail/renewLease) must present
the epoch (or holder token + lease epoch) it read; the write checks it under
the coordinator lock (or in the UPDATE's WHERE clause); mismatch -> refuse and
force re-read. The W2 claimRun CAS is the template; extend the check to the
write paths.

## Record 8 — budget exhaustion

DOMAIN: orca-c mission 8 / COMPONENT: branch `reserveWorkOrderBudget` /
`budgetUsage` + `classifyRetry` + PING `failWithRetry` / CLAIM: both systems
terminate honestly at budget exhaustion and never retry past it; the branch
budget is durable across restarts and idempotent; one narrow crash-skew window
exists in the two-file reservation write / EVIDENCE: TEST (probes/m8: 14/14;
real objective-runtime on scratch dirs; real policy; real MissionRuntime with
a stateful fake pool) / CALLER: delegate / CALLEE: budget files, ping_missions
/ WRITER: reserveWorkOrderBudget / READER: budgetUsage, delegate / AUTHORITY:
durable budget file / CLASSIFICATION: EQUIVALENT / CONFIDENCE: high /
BROKEN BOUNDARY: none systemic; local defect note: reserveWorkOrderBudget
writes budget_reservations.json then objective.json — a SIGKILL between them
leaves the reservation present but work_orders_used unincremented, so usage
skews low and a later distinct work order can exceed the intended limit
(fail-open, bounded by crash frequency; re-reserve of the crashed id is
correctly idempotent) / DEPENDENCIES: none / AFFECTS AGENTS: orca-c.

Detail: reserve 2/2 -> third refused {ok:false, reason:'budget-exhausted'};
re-reserve idempotent (no double-spend); budgetUsage durable. classifyRetry:
attempt 1/2 timeout -> AUTO_EXECUTE; 2/2 -> REQUIRES_HUMAN_APPROVAL (no retry
past budget); validation-failed -> non-retryable escalate. PING: 3 failures ->
retry_pending x2 then honestly failed; a 4th call past budget stays failed, no
retry scheduled. Fix note (local): make the reservation a single atomic write
or derive usage by counting the reservations file.

---

## New harvest specs (implementable)

H6 (absent-tool resolution, from record 5): per-mission consecutive-skip
counter in the scheduler; after N polls skipped for absent worker, route to
_failMission('worker unavailable after N polls') so the retry/DLQ machinery
sees it. Dispatch paths must resolve missing tools to terminal-with-budget,
bounded-retry, or OUTCOME_UNKNOWN — never silent skip.

H7 (worker-memory provenance, from record 6): entries carry
{writer, source, recorded_at, ttl|version}; getContext renders provenance;
contradictions flagged, never co-rendered; expired excluded; junk rejected;
worker-output findings require an evidence reference before entering memory.

H8 (epoch-gated writes, from record 7): expectedEpoch on transitionRun,
checkpointRun, updateWorkOrder (checked under the coordinator lock; mismatch
-> refuse + re-read); holder token + lease epoch in PING complete/fail/
renewLease WHERE clauses. Template: the existing claimRun CAS.

H-spec §H-M1 (from record 1): crash-point matrix as a test artifact +
canonical-emit-before-terminal-mark with result_id ON CONFLICT DO NOTHING.

H-spec §H-M3 (from record 3): successor derivation as a pure function of
(verified predecessor terminal, live state) with stable identity; escalate on
unverified inputs.

H5 (from record 4): already specified in orca-b record 7; implementation in
the A5 working tree verified sound (15/15). No new spec.

## Failure pipeline log

All LOCAL ACCIDENT (harness-local), none are generic classes:

1. Pig source-copy pipeline produced 9 empty files (CRLF broke base64
   regex). Fix: tr -d '\r'. All hashes verified after. (prior)
2. find quoting failed through CMD/WSL layers; retried with documented
   pattern. (prior)
3. m1 CP8: reader loop blocked the event loop; writer never fired. Fix:
   single-threaded alternating write/read hammer. (probe bug)
4. m6: checks array referenced contraBoth before declaration; dropped
   `let vulns` in an edit. Fixed ordering, restored declaration. (probe bug)
5. m5: called sched._pollOnce(); real method is _poll(); added
   reapExpiredLeases stub. (probe bug)
6. m5/m6 vendored modules needed stub deps (registry JSON,
   constitutional_time_authority chain). Documented minimal stubs preserving
   the used behavior. (harness)

No new generic classes found. Existing classes touched: GC-4 (adjacent to
record 6; record 6 is a distinct missing-boundary defect, single surface, so
local/product, not a new GC). orca-b record 15 UNKNOWN is now CLOSED.

## Open UNKNOWNs

None new. orca-b record 15 (timeout-after-effect T2/T3) closed by the H5
implementation, verified in record 4.
