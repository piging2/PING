# ORCA-D VERDICTS — ack/effect ordering, unknown-execution residuals, retry/result classification, schema drift

Lane: ORCA-D (tranche 2 of the 4,000-mission ORCA adversarial program).
Branch under test: `feature/orca-autonomy` @ `ae55b77ff` (Pig worktree
`/home/nolan/worktrees/orca-autonomy`; state worktree `30a750f`). All TEST
evidence below is against the committed tree at `ae55b77ff`, via read-only
vendor copies (hashes in CHECKPOINT.md). The H5 wiring exists in the same
worktree as UNCOMMITTED modifications (`M orca/control-loop/orca_control_loop.js`,
`M orca/control-loop/policy/orca_status_model.js`,
`?? orca/control-loop/orca_unknown_block.js`, verified 2026-09-24); each
record notes where H5 changes the assessment.

Evidence grades: LIVE (Pig Windows timing experiment) > TEST (staged harness
against real branch modules) > STATIC (source read).

No em dashes are used in this file.

## Record D1 — retry classifier fails open on unknown failure kinds

DOMAIN: orca-d / COMPONENT: `policy/orca_policy.js` `classifyRetry()` (branch
`ae55b77ff`) / CLAIM: any failure kind the classifier does not recognize, or
any malformed kind value, is granted `AUTO_EXECUTE` while attempt budget
remains; `escalateUndecidable()` exists in the same module but
`classifyRetry()` never calls it / EVIDENCE: TEST (`probes/h-retry-classify.js`:
documented kinds classify as intended; 57 unknown/adversarial grants
including `dispatch-lost`, `DISPATCH_LOST`, `unknown`, empty strings,
mixed-case variants, objects, arrays, numbers, null-likes; the loop calls it
as `classifyRetry({ attempt, maxAttempts, failureKind })` and checks
`decisionClass !== DECISION_CLASSES.AUTO_EXECUTE`) / CALLER:
`orca_control_loop.delegate` / CALLEE: `classifyRetry` / WRITER: policy module /
READER: loop retry gate / AUTHORITY: none asserted for kind validity /
CLASSIFICATION: PING STRONGER / CONFIDENCE: high / BROKEN BOUNDARY: the
fail-open default — undecidable input must escalate, never auto-execute /
DEPENDENCIES: none / AFFECTS AGENTS: orca-d, h5-wire (H5 removed
`classifyRetry` from the timeout path in the working tree, but the module
default is unchanged and still reachable via the worker-failed path).
HARVEST (for ORCA): HD1 — close the failure-kind enum; route every
unrecognized or malformed kind through the existing `escalateUndecidable()`;
no new kind may default to `AUTO_EXECUTE`.

## Record D2 — stale rendezvous poisoning across attempts (T5/T6)

DOMAIN: orca-d / COMPONENT: `dispatchHermes` rendezvous collection +
`reconcileRunningWorkOrder` (branch `ae55b77ff`) / CLAIM: the rendezvous
result path is keyed by work order, not attempt; it is never cleared or
consumed on retry; drop metadata is never compared against the current
attempt; the envelope carries no attempt binding; verification never inspects
the dispatcher record. Therefore attempt-1 evidence is accepted as
attempt-2's result on BOTH the dispatch path (T5) and the restart-reconcile
path (T6) / EVIDENCE: TEST (`probes/h-stale-rendezvous.js`, real
objective-runtime + real adapter + verbatim loop glue: T5, attempt-2 produced
garbage stdout and no new drop, yet attempt-1's envelope was collected,
verified, and accepted as attempt-2's result; T6, restart reconciliation for
attempt-2 found no new drop, read the attempt-1 result from the
work-order-level path, and it passed verification as attempt-2, ready to emit
`WORKER_COMPLETED` keyed to attempt-2 on attempt-1 evidence. Additionally,
`resultIdentity()` includes `workOrder.attempt`, so replayed evidence mints a
NEW result id and a NEW canonical event instead of deduplicating) /
CALLER: `dispatchHermes`, `reconcileRunningWorkOrder` / CALLEE: filesystem
result path / WRITER: dispatcher (any attempt) / READER: coordinator /
AUTHORITY: none asserted for result freshness / CLASSIFICATION: PING STRONGER /
CONFIDENCE: high / BROKEN BOUNDARY: missing attempt binding on the result
path, on the drop metadata check, and in the envelope / DEPENDENCIES: none /
AFFECTS AGENTS: orca-d (H5 working tree does NOT touch this path; still open
there).
HARVEST (for ORCA): HD2 — attempt-scoped immutable result paths
(`results/<workOrderId>/attempt-<n>.json`); at collection, match the drop's
`attempt_id`, `work_order_id`, and `dispatch_started_at` against the durable
attempt record and refuse mismatches with an audit entry; consume or
quarantine the result on read; bind `verifyResultEnvelope` to the exact
attempt identity. Narrow variant: a transport error WITH a stale drop present
falls through the `disp.transportError && !disp.rendezvous` guard into the
normal accept path (STATIC), same fix applies.

## Record D3 — T2 race: successful drop discarded, false FAILED, auto-retry (LIVE)

DOMAIN: orca-d / COMPONENT: `dispatchHermes` timeout branch (branch
`ae55b77ff`) / CLAIM: when the worker finishes and the dispatcher writes the
rendezvous drop but exits slowly, the coordinator's timeout fires first; the
collected drop is DISCARDED (`if (disp.timedOut)` replaces it with a timeout
envelope); the attempt is recorded `WORKER_FAILED`; `classifyRetry('timeout')`
grants `AUTO_EXECUTE`; the already-succeeded work is re-executed / EVIDENCE:
LIVE (Pig experiment E2, `probes/u1/`: worker slept 1s, drop written with
`returncode: 0` and a valid completed envelope, dispatcher slept 8s,
coordinator kill at 8s landed in the sleep window: `timedOut: true` +
`dropPresentAfterKill: true`; the drop on disk was a fully successful result
the loop would discard) + TEST (`probes/h-timeout-effect.js` V1: 2
non-idempotent effects for 1 task; canonical history reads WORKER_FAILED then
WORKER_COMPLETED, where the FAILED verdict is false) / CALLER: `delegate` /
CALLEE: `timeoutEnvelope`, `classifyRetry` / WRITER: loop / READER: auditors,
retry gate / AUTHORITY: coordinator (timeout) / CLASSIFICATION: PING STRONGER /
CONFIDENCE: high / BROKEN BOUNDARY: the timeout branch asserts failure it did
not observe, then acts on the assertion (retry) / DEPENDENCIES: HD1 /
AFFECTS AGENTS: orca-d, h5-wire (the H5 working tree closes this exact path:
timeout now yields OUTCOME_UNKNOWN + blocked, no failed envelope, no
classifyRetry, no auto-retry; this record is the pre-H5 baseline and the
proof the wiring was needed).
HARVEST (for ORCA): HD3 — already specified by H5 (OUTCOME_UNKNOWN +
blocked-set + operator decision); this record adds the live proof that the
discarded drop was a SUCCESS, so the honest classification must preserve the
drop as evidence, not just refuse the failure claim.

## Record D4 — U1 orphaned Windows Hermes child (LIVE; CLOSED)

DOMAIN: orca-d / COMPONENT: dispatcher/worker process topology
(`hermes_dispatch.py` `subprocess.run` + coordinator SIGKILL, branch
`ae55b77ff`) / CLAIM (orac-b U1): after the coordinator's timeout kill, an
orphaned Windows Hermes child may complete later and write a late rendezvous
drop / EVIDENCE: LIVE (Pig experiment series, `probes/u1/`, stub dispatcher
mirroring `hermes_dispatch.py` topology, WSL node driver replicating the
loop's kill mechanics): (1) coordinator-style SIGKILL at 6s, worker sleeping
30s: worker pid dead, no completion marker after 40s; (2) `taskkill /F /PID`
(no /T) of the dispatcher: worker dead 3s later; (3) dispatcher self-abort via
`os._exit(3)` after spawn: worker never completed after 45s; (4) no-kill
baseline: worker completed, `returncode: 0`, stdout captured. In all three
death modes the worker dies WITH the dispatcher; no late drop is possible
(the dispatcher is the only writer and is proven dead); no invisible orphan
completion is possible either / CALLER: n/a (topology fact) / CALLEE: Windows
process lifetime / WRITER: n/a / READER: n/a / AUTHORITY: OS /
CLASSIFICATION: REJECT / CONFIDENCE: high (three independent kill modes agree;
caveat: stub worker is a Python sleeper, not the real `hermes_cli`; a worker
that deliberately detaches itself was not tested and the real CLI is not
expected to) / BROKEN BOUNDARY: none; the hypothesized residual does not
exist in this topology / DEPENDENCIES: none / AFFECTS AGENTS: orca-d, orca-b
(U1 now CLOSED), h5-wire (their "still static-only" note is superseded).
HARVEST: none (negative result). Lesson recorded: orca-b record 15's T3
phrasing ("orphan completes later, writes late drop") was never mechanically
established; the live residual is T2 (record D3), not T3.

## Record D5 — timeout-during-effect: non-idempotent effects duplicate (TEST)

DOMAIN: orca-d / COMPONENT: retry-after-timeout vs worker external effects
(branch `ae55b77ff`, real adapter + real policy + verbatim spine identity) /
CLAIM: timeout says nothing about whether the effect happened; bounded retry
therefore duplicates non-idempotent effects, while idempotent-keyed effects
converge / EVIDENCE: TEST (`probes/h-timeout-effect.js`): V1 (T2 shape:
effect performed, completed drop written, coordinator timed out and discarded
it): 2 append-effects for 1 task, canonical WORKER_FAILED then
WORKER_COMPLETED; V2 (hung worker, no drop, genuine UNKNOWN): 2
append-effects for 1 task; V3 (same as V1 but deterministic-keyed effect
write): single effect state, last-writer-wins, no duplicate / CALLER:
`delegate` retry path / CALLEE: worker (exterior) / WRITER: worker / READER:
exterior world (unknowable to the loop) / AUTHORITY: none; the loop cannot
observe exterior effects / CLASSIFICATION: PING STRONGER / CONFIDENCE: high /
BROKEN BOUNDARY: retry is granted without an idempotency precondition /
DEPENDENCIES: HD1, HD3 / AFFECTS AGENTS: orca-d (H5 working tree closes the
automatic duplicate for the timeout path via OUTCOME_UNKNOWN + blocked; the
DISPATCH_LOST restart path still auto-redelegates, see D11).
HARVEST (for ORCA): HD5 — retry-after-unknown is safe ONLY behind
idempotent-keyed effects; make "effect keyed deterministically by
(work_order_id, attempt-independent intent)" a precondition of AUTO_EXECUTE
after timeout; otherwise route to OUTCOME_UNKNOWN / operator (H5) rather than
silent re-execution.

## Record D6 — crash between canonical emit and terminal marking converges (TEST)

DOMAIN: orca-d / COMPONENT: `recordVerifiedResult` + PING spine `emit`
(verbatim identity rule) / CLAIM: re-emitting the same verified result after
a crash converges to the same `event_id` with `deduplicated=true`; exactly one
canonical row exists; no duplicate effect at the canonical layer / EVIDENCE:
TEST (`probes/h-commit-inflight.js` A: first emit `event_fbfba130d34df563`
`dedup=false`, re-emit same id `dedup=true`, 1 canonical row; D: `result_id`
stable across re-emit) / CALLER: `recordVerifiedResult` / CALLEE:
`eventRuntime.emit` / WRITER: PING spine (sole event-identity owner) /
READER: auditors / AUTHORITY: PING spine / CLASSIFICATION: PING STRONGER /
CONFIDENCE: high / BROKEN BOUNDARY: none; authority boundary working as
designed / DEPENDENCIES: none / AFFECTS AGENTS: orca-d.
HARVEST (for PING): HD6 — keep canonical event identity as
sha256(eventType, source, namespace?, logical_id) with INSERT ON CONFLICT DO
NOTHING; always re-emit through the same path after a crash instead of
inventing a recovery event; treat `deduplicated=true` as the expected
crash-window outcome.

## Record D7 — emit throw after commit: unclassified FATAL (TEST)

DOMAIN: orca-d / COMPONENT: `recordVerifiedResult` throw path in
`orca_control_loop.delegate` (branch `ae55b77ff`) / CLAIM: if the canonical
emit throws AFTER committing (connection reset between INSERT and return),
the throw propagates past `recordVerifiedResult` (it only converts rejections
to `invalidResult`); the loop's generic catch writes `99-fatal.json` and
exits 2 with NO attempt outcome and NO Escalation; on restart the RUNNING work
order + present rendezvous re-accept, re-emit, and dedup-converge, so recovery
is sound but the crash is unclassified / EVIDENCE: TEST
(`probes/h-commit-inflight.js` B: throw after commit, 1 canonical row exists,
loop never learns the event_id, FATAL exit; restart re-accept converges) /
CALLER: `delegate` / CALLEE: `recordVerifiedResult` / WRITER: loop (fatal
record) / READER: operator (sees a fatal with no outcome) / AUTHORITY: none
asserted for the commit-unknown window / CLASSIFICATION: PING STRONGER /
CONFIDENCE: high / BROKEN BOUNDARY: the commit-unknown window has no typed
outcome (cf. SOUL section 11: failures must have typed semantics) /
DEPENDENCIES: HD6 / AFFECTS AGENTS: orca-d.
HARVEST (for ORCA): HD7 — catch emit throws at the `recordVerifiedResult`
call site and record an explicit `COMMIT_UNKNOWN` attempt outcome (event may
exist; re-accept on restart is the recovery); never let a commit-ambiguous
throw become a bare FATAL. (B2, the rejection-BEFORE-commit case, is already
sound: VERIFICATION_FAILED terminal, non-retryable, no duplicate; EQUIVALENT
to the fail-closed pattern.)

## Record D8 — envelope extraction: first-object-wins + precedence forgery (TEST)

DOMAIN: orca-d / COMPONENT: `extractEnvelope` (verbatim, branch `ae55b77ff`) +
`verifyResultEnvelope` / CLAIM: extraction takes the FIRST balanced JSON
object in stdout; a malformed decoy yields a protocol-failure terminal
(fragile but safe); a WELL-FORMED forged envelope earlier in stdout is
extracted AND passes verification, and the real envelope is ignored; a
correct envelope replayed under a new attempt is accepted (no attempt binding,
reconfirms GC-7 BR-A2) / EVIDENCE: TEST (verbatim extractor + real adapter:
decoy `{"decoy": true}` extracted then rejected `Missing field:
work_order_id`; forged full envelope with `output: 'FORGED OUTPUT'` placed
before the real one: extracted output is the forged one, `verify: true`;
`probes/h-envelope-adversarial.js`: missing required field invalid; completed
with null output invalid but with empty-string/empty-object output VALID
(worker-semantic completeness unchecked); wrong work-order id invalid; wrong
capability invalid; extra/forged fields accepted; attempt-1 envelope replayed
with `workOrder.attempt = 2` VALID) / CALLER: `delegate`, `acceptRendezvousResult` /
CALLEE: `extractEnvelope`, `verifyResultEnvelope` / WRITER: worker stdout
(untrusted channel) / READER: coordinator / AUTHORITY: field bindings only;
no authenticity, no precedence rule, no attempt binding / CLASSIFICATION: PING
STRONGER / CONFIDENCE: high / BROKEN BOUNDARY: the result channel is
unauthenticated — any untrusted bytes the worker echoes (tool output, file
contents) can precede and replace the real envelope / DEPENDENCIES: HD2 /
AFFECTS AGENTS: orca-d.
HARVEST (for ORCA): HD8 — bind the envelope to the attempt: require
`envelope.attempt_id` (or equivalent) matching the dispatcher's drop metadata
`attempt_id`/`dispatch_started_at`; prefer the LAST balanced JSON object over
the first (workers log first, conclude last) or, better, have the dispatcher
attest the envelope byte range; reject unknown envelope fields; validate
worker-semantic completeness per capability (empty output is not a result).

## Record D9 — schema drift: lenient reads fail open, corrupt records brick (TEST)

DOMAIN: orca-d / COMPONENT: `objective-runtime.js` durable record IO, no
schema version anywhere (branch `ae55b77ff`) / CLAIM: (1) an older-schema
RUNNING record missing `dispatch_pid` is misread as "dispatcher dead" and
re-authorized for re-dispatch (schema absence converted into the most
dangerous branch); (2) a newer-schema record with `attempt_count` relocated
is read as attempt 0, under-counting the durable budget and re-allowing
exhausted attempts; (3) one torn JSON work-order file makes
`listWorkOrders()` throw, and because `reconcileStartup()` runs before every
dispatch on EVERY startup, the objective is permanently bricked (exit 2 on
every restart) until a human repairs the file; (4) same throw on the delegate
path mid-run / EVIDENCE: TEST (`probes/h-schema-drift.js`, real
objective-runtime: all four behaviors observed verbatim) / CALLER:
`reconcileStartup`, `reconcileRunningWorkOrder`, `delegate` / CALLEE:
`readJson`, `listWorkOrders`, `loadWorkOrder` / WRITER: any version of the
loop / READER: the current loop / AUTHORITY: none asserted for record shape /
CLASSIFICATION: PING STRONGER / CONFIDENCE: high / BROKEN BOUNDARY: no schema
version, no per-record fault isolation, lenient defaults on safety-critical
fields / DEPENDENCIES: none / AFFECTS AGENTS: orca-d.
HARVEST (for ORCA): HD9 — stamp `schema_version` on every durable record;
refuse (with an explicit, typed error, not a crash) records whose version is
unknown; quarantine per-record parse failures in `listWorkOrders` so one torn
file cannot brick the objective; treat safety-critical missing fields
(`dispatch_pid`, `attempt_count`) as UNKNOWN, never as their most dangerous
default.

## Record D10 — ambiguity-resolution path enumeration and grading

DOMAIN: orca-d / COMPONENT: `orca_control_loop.js` + policy (branch
`ae55b77ff`; H5 working-tree state noted) / CLAIM: every current
ambiguity-resolution path is enumerated and graded sound/unsound against
evidence / EVIDENCE: STATIC (source) + TEST (records D1-D9) / paths:
1. timeout, drop collected (T2): drop DISCARDED, false WORKER_FAILED,
   auto-retry: UNSOUND (D3, V1); H5 working tree: OUTCOME_UNKNOWN + blocked.
2. timeout, no drop (genuine unknown): same handling: UNSOUND for
   non-idempotent effects (D5 V2); H5 working tree: OUTCOME_UNKNOWN + blocked.
3. dispatcher dead + no result at restart: DISPATCH_LOST -> re-authorized ->
   bounded re-dispatch: UNSOUND under unknown effects (D5 V2 shape; D11);
   additionally misfires on schema-drift records missing `dispatch_pid` (D9).
4. dispatcher alive + no result at restart: bounded wait, left RUNNING,
   redispatch refused: SOUND (the one genuinely sound ambiguity path).
5. rendezvous present at restart: verify/accept: mechanics SOUND,
   attribution UNSOUND (D2 T5/T6 stale acceptance).
6. transport error, no rendezvous: re-plan within budget: SOUND (dispatcher
   never ran); narrow hole: transport error WITH a stale drop falls through
   to the accept path (D2 variant).
7. protocol failure (extraction): VERIFICATION_FAILED + Escalation,
   non-retryable: SOUND fail-closed (no duplicate); evidence gap (worker may
   have executed).
8. verification failure (emit rejected before commit): VERIFICATION_FAILED +
   Escalation, non-retryable: SOUND (D7 B2).
9. emit throw after commit: uncaught FATAL, no outcome: classification
   UNSOUND, recovery SOUND via restart + dedup (D7).
10. unknown retry kind: AUTO_EXECUTE fail-open: UNSOUND (D1).
11. corrupt durable record: fatal every restart, objective bricked:
    fail-closed but liveness-fatal (D9).
CALLER: loop / CALLEE: as listed / WRITER: loop / READER: operator, auditors /
AUTHORITY: coordinator, policy / CLASSIFICATION: PATTERN ONLY / CONFIDENCE:
high / BROKEN BOUNDARY: none single; the table IS the finding / DEPENDENCIES:
D1-D9 / AFFECTS AGENTS: orca-d, h5-wire.
HARVEST: HD10 — adopt the enumeration as the regression checklist: every new
ambiguity path must be added here with a sound/unsound grade and a probe;
no path may default to the dangerous branch.

## Record D11 — U4: drill D2(b) vs DISPATCH_LOST re-delegation (still OPEN)

DOMAIN: orca-d / COMPONENT: `reconcileRunningWorkOrder` DISPATCH_LOST path
(branch `ae55b77ff`) vs drill D2 expectation (b) ("unknown and do not
redelegate") / CLAIM: the mismatch orca-b left for the drill owner is still
open AND now has TEST evidence of the cost: the DISPATCH_LOST path
re-delegates under genuine unknown (the dead dispatcher may have completed
exterior effects), so bounded re-dispatch can duplicate non-idempotent effects
(record D5 V2 is exactly this shape); the H5 working tree deliberately left
this path untouched / EVIDENCE: TEST (D5 V2: 2 effects under genuine unknown)
+ STATIC (reconcile source: dead pid + no result -> AUTHORIZED ->
re-dispatch; H5 CHECKPOINT: "deliberately did not change the
restart-reconcile DISPATCH_LOST path") / CALLER: `reconcileStartup` / CALLEE:
policy budget / WRITER: loop / READER: operator / AUTHORITY: coordinator /
CLASSIFICATION: UNKNOWN→INVESTIGATE / CONFIDENCE: high (the mechanism and its
cost are proven; the RESOLUTION needs the drill owner) / BROKEN BOUNDARY: the
D2(b) expectation vs the branch's re-delegation / DEPENDENCIES: D5, HD5 /
AFFECTS AGENTS: orca-d, h5-wire, w2-missions (drill owner).
HARVEST: none yet; the decision belongs to the drill owner: either wire H5
(OUTCOME_UNKNOWN + blocked) into the DISPATCH_LOST path as well, or amend
drill D2 to bless bounded re-delegation with an explicit idempotency
precondition (HD5).

## Verdict table

| Record | Axis | Classification | Evidence | Confidence |
|---|---|---|---|---|
| D1 | retry classification fail-open | PING STRONGER | TEST | high |
| D2 | stale rendezvous T5/T6 | PING STRONGER | TEST | high |
| D3 | T2 race, false FAILED + retry | PING STRONGER | LIVE + TEST | high |
| D4 | U1 orphan child | REJECT | LIVE | high |
| D5 | timeout-during-effect duplication | PING STRONGER | TEST | high |
| D6 | crash-window dedup convergence | PING STRONGER | TEST | high |
| D7 | emit-throw unclassified FATAL | PING STRONGER | TEST | high |
| D8 | envelope extraction/forgery | PING STRONGER | TEST | high |
| D9 | schema drift | PING STRONGER | TEST | high |
| D10 | ambiguity enumeration | PATTERN ONLY | STATIC + TEST | high |
| D11 | U4 drill D2(b) mismatch | UNKNOWN→INVESTIGATE | TEST + STATIC | high |

Counts: PING STRONGER 8, EQUIVALENT 0, ORCA STRONGER→HARVEST 0,
PATTERN ONLY 1, NOT APPLICABLE 0, REJECT 1, UNKNOWN→INVESTIGATE 1.
Total records: 11.

## Harvest specifications (for ORCA)

- HD1 (D1): closed failure-kind enum; unknown/malformed kinds route through
  `escalateUndecidable()`; nothing new defaults to AUTO_EXECUTE.
- HD2 (D2): attempt-scoped immutable result paths; drop metadata matched
  against the durable attempt record; consume/quarantine on read; attempt
  binding in `verifyResultEnvelope`.
- HD3 (D3): already specified by H5; add: preserve the discarded drop as
  evidence with the OUTCOME_UNKNOWN record.
- HD5 (D5): idempotent-keyed effects as precondition of AUTO_EXECUTE after
  timeout; otherwise OUTCOME_UNKNOWN + operator.
- HD6 (D6): keep spine identity + ON CONFLICT DO NOTHING; re-emit after
  crash; `deduplicated=true` is the expected outcome.
- HD7 (D7): explicit COMMIT_UNKNOWN outcome at the `recordVerifiedResult`
  call site; never bare FATAL for commit-ambiguous throws.
- HD8 (D8): attempt-bound, precedence-safe envelope extraction (attempt_id
  match against drop metadata; last-object or dispatcher-attested range;
  reject unknown fields; capability-level completeness).
- HD9 (D9): `schema_version` on all durable records; typed refusal on
  unknown versions; per-record quarantine in `listWorkOrders`; UNKNOWN (not
  dangerous defaults) for missing safety-critical fields.
- HD10 (D10): the ambiguity table as a living regression checklist.

## Open UNKNOWNs (remaining)

- U4 (D11): drill D2(b) vs DISPATCH_LOST re-delegation; needs the drill
  owner's decision; cost now TEST-proven (D5 V2).
- U1 is CLOSED (D4). U2 (pidAlive PID-reuse across WSL reboot) and U3 (stale
  drop across same-objective reruns, now partially covered by D2 T5/T6) remain
  with orca-b; D2's harvest covers the U3 mechanism.
- New residual: no live timeout has yet fired through the H5-wired path (per
  h5-wire); first live post-boundary timeout is the LIVE-grade proof of HD3.

## Failure pipeline log (this lane)

- Pig WSL service/SSH `0x8007274c`: LOCAL ACCIDENT, transient, recovered
  after bounded backoff.
- Pig session-metadata timeout: LOCAL ACCIDENT, transient, recovered.
- Initial SCP path assumption (SCP resolved against Windows, not WSL):
  LOCAL ACCIDENT; switched to the AGENTS.md scp-to-transfer + cp pattern.
- Unsafe nested quoting (Windows CMD ate grep text): LOCAL ACCIDENT;
  corrected with the documented `grep -e` pattern.
- Wrong vendor file copied into `vendor-policy_orca_status_model.js`:
  LOCAL ACCIDENT; caught by hash anomaly, repulled, reverified.
- Envelope harness missing canonicalization dependency: LOCAL ACCIDENT;
  documented shim matching the real adapter's fallback.
- U1 experiment, first runs: worker markers never appeared: LOCAL ACCIDENT
  (two harness bugs: marker dir on the WSL-only /tmp invisible to Windows;
  custom env vars do not cross the WSL node -> Windows spawn boundary, proven
  by `u1-env-probe.js`: `U1_PROBE_VAR=None`). Fixed via argv-passed
  parameters and a `C:\Windows\Temp` marker dir. Lesson added to
  ~/workspace/AGENTS.md.
- h-timeout-effect: two harness bugs, both LOCAL ACCIDENT: `updateWorkOrder`
  takes a partial object, not an updater function (updates silently dropped);
  `classifyRetry` returns `decisionClass`, not `decision`, and takes
  `failureKind`, not `kind` (retry never fired until fixed).
- No repository writes or commits were made by this lane (read-only +
  scratch harnesses only).
- No generic classes found beyond the recorded harvest specs; no deletions.
