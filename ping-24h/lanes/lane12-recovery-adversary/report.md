# LANE 12: Recovery Adversary — Torture Lab Test Plan

**Status: HYPOTHESIS until replayed from a clean checkout.** Built from read-only
code inspection of the PING canonical tree at HEAD `0264d517` (Pig WSL
`/home/nolan/projects/ping`) plus the wave-1 donor corpus and the lane 3, 7, 8
donor reports. No production process was touched, no coordinator was killed, no
live dispatch was run, no file in any canonical tree was modified. All
lane-3/7/8 claims consumed here are themselves hypotheses until clean-checkout
replay.

**Constraints honored:** read-only on every canonical tree (Pig access via
`pigwsl-exec.sh` only, light batch reads); `src/app/api/mc/dispatch/route.ts`
read but never modified (locked by the authorized patch lane); no em dashes;
UNKNOWN kept distinct from FAILED throughout; no secrets printed, persisted, or
placed in commands. All scripts and notes live under this lane directory only.

**Governing invariants applied:** DRAIN / RECONCILE OLD WORK BEFORE DRIVING NEW
WORK. UNKNOWN EFFECT -> HOLD/PARK -> RECONCILE; never lease-expired ->
probably-failed -> redispatch.

---

## 1. Donor mechanisms consumed (what the torture lab is benchmarked against)

- **N1 (MECHANISM BENCHMARKED):** Nerve single-winner CAS terminal transitions;
  restart fail-closed for paid work; spend recomputed from ledger, never trusted
  from cached columns. Benchmark for PING's reconciler: terminal transitions
  should be WON, not set.
- **N2 (NEW INVARIANT FOUND):** Nerve drain-before-drive resume queue (delete the
  intent before driving), QUIESCENCE GATE before replacement dispatch (prove the
  old executor dead, or bounded wait with logged timeout), kill-TOCTOU re-read
  after dispatch. The quiescence gate is the mechanical piece PING's design does
  not yet name; scenario 19 is the dedicated quiescence row.
- **N3 (MECHANISM BENCHMARKED):** Nerve crash-window convergence by dispatching
  on the run row's ACTUAL status; outbox with pre-generated IDs so re-issue is
  identity-safe.
- **N4 (ASSUMPTION FALSIFIED):** Nerve cron catchup watermarks only successful
  runs, so a mid-run crash re-fires on restart. Harvested as a NEGATIVE test
  shape for PING (a success-only watermark must never gate re-fire).
- **P1/R1 (UNKNOWN MADE EXPLICIT):** POLYROB three-valued claim liveness
  ALIVE / PROVABLY GONE / UNKNOWN; UNKNOWN waits one TTL, never requeues. The
  falsification for PING: the dispatch slice has no three-valued liveness probe
  anywhere; UNKNOWN is doctrine-only (weakest edge #1).
- **P2/R2 (NEW INVARIANT FOUND):** POLYROB evidence-derived verified/unverified
  completion labels; unverified completions structurally excluded from learning.
  PING analog to check: `result.json` carries `verified_at` + adapter
  `result_id`, and MC_RUN_UNKNOWN is "non-retryable, must not reach canonical
  truth" (reached-loop report), but no consumption-boundary test pins it.
- **P3/R3 (SMALLER IMPLEMENTATION FOUND):** POLYROB crash-surviving
  ReentryBudget (~150 lines) for forged self-wake turns: persisted depth cap,
  atomic try_consume, genuine-user-only reset. Relevant to PING's wake/tripwire
  economy; not directly in the 19 scenarios.
- **AgentOS (NEW INVARIANT FOUND, lane 8):** checkpointed forkable LLM-boundary
  replay: recorded responses served in order, `fork_from` any checkpoint, live
  fallback continues from the fork point. PING has no equivalent: replay is only
  from scratch (see scenario 4/14 and test assertion A7).
- **ForkScout (USEFUL TEST HARVESTED, lane 8):** one-shot restart continuation:
  read + unlinkSync before re-entry, continuation fires exactly once across
  restart. Harvested as TEST SHAPE only (assertion: not zero, not twice).
  License flag: ForkScout's README claims MIT but the pinned tree ships no
  LICENSE file; never copy its code, only the assertion shape; re-resolve the
  license before any proposal touches it. ForkScout as a system is rejected
  (prompt-text authorization, pattern kills, wrong-process smoke test).
- **Pi-1 (NEW INVARIANT FOUND, lane 7):** replay-safe tool contract with
  checkpoint-before-effect: `{phase:"started", replay:"safe"|"unsafe"}`
  checkpointed BEFORE the effect; a validator rejects in-flight transitions
  without a pre-effect commit; recovery re-executes only if BOTH the checkpoint
  and the current registration declare `replay:"safe"`; otherwise a typed
  `interrupted` error; per-phase lease revocation; no automatic retry. Benchmark
  question for PING: does PING checkpoint before effect with a replay-safety
  declaration, or discover replay-safety after the fact? Answer from code: PING
  checkpoints INTENT before effect (`MC_EXECUTION_STARTED` is emitted before
  the transport call) but carries NO replay-safety declaration; safety is
  discovered after the fact via the timeout/transport-failed classification plus
  the read-only slice constraint. Pi is mechanically stronger here.
- **ShibaClaw (lane 8, noted):** fingerprint-bound approve-once automation
  grants (grant bound to sha256 of exact schedule+payload; any drift voids it).
  Relevant shape for scenario 8 if PING ever issues durable grants.
- **ORCH (lane 8, noted):** scope-prefix leases for concurrent agents. Not
  directly exercised by the 19 scenarios; relevant if PING ever parallelizes
  executors.

Rejected donor patterns (do-not-import, recorded so the lab does not
reintroduce them): Nerve's success-only catchup watermark (N4); Nerve's
system-principal resume; POLYROB's judge-fails-open as completion authority;
ForkScout's pattern kills and wrong-process health verification; the 5s live
reconcile loop (flagged fragile by lane 3).

---

## 2. Per-scenario torture table (19 rows)

Conventions: CURRENT PING BEHAVIOR cites the canonical tree at `0264d517` with
file and line. Verdicts: PASS EXISTING (names the test), FAIL (describes the
failure precisely), UNKNOWN (names the missing evidence), UNTESTABLE-SAFELY.

### S1. Worker dies before dispatch

- SETUP: `POST /api/mc/dispatch` with a valid caller key; the worker is the
  ollama transport (`OLLAMA_URL` localhost) or a broker identity. Kill the
  worker (or remove the broker state row) before the transport call.
- KILL/FAULT POINT: between `MC_AGENT_AUTHORIZED` emission and the transport
  call (`route.ts:434-436`).
- EXPECTED INVARIANT: honest FAILED (effect provably never started), no claim
  of execution, no redispatch on retry.
- CURRENT PING BEHAVIOR: `runOllama` fetch throws -> `{kind:'transport-failed'}`
  (`route.ts:139-170`) -> `emit('MC_RUN_FAILED')` with reason
  (`route.ts:441-448`). For broker identities, `checkBrokerQuota` fails closed
  before dispatch (`route.ts:106-118`). The behavior exists in code only.
- VERDICT: **FAIL**. Zero test files reference `mc-dispatch` (verified by
  grep: no `*.test.ts` mentions it). No test proves the FAILED emission happens
  rather than an unhandled 500, or that a duplicate POST after this FAILED
  returns the original with `duplicate_suppressed:true`.

### S2. Worker dies after dispatch but before acknowledgment

- SETUP: ollama receives the prompt and begins inference; kill ollama before it
  responds. The effect may or may not have been computed.
- KILL/FAULT POINT: between transport send and response parse (`route.ts:139-170`).
- EXPECTED INVARIANT: delivered-or-maybe-delivered with no verifiable result ->
  UNKNOWN, never FAILED. "The prompt was never delivered" must be provable, not
  assumed.
- CURRENT PING BEHAVIOR: fetch throws; the catch classifies by substring:
  `msg.includes('abort')` or `AbortError` -> `timeout`, else
  `transport-failed` (`route.ts:163-168`) -> `MC_RUN_FAILED` with the comment
  "The prompt was never delivered: honest execution failure" (`route.ts:442`).
  A connection reset AFTER the server received the request is indistinguishable
  from a pre-delivery failure to this heuristic, so a possibly-delivered run is
  recorded FAILED. Against Pi-1: there is no `replay:"safe"|"unsafe"`
  declaration and no per-phase lease; the classification is post-hoc inference.
- VERDICT: **FAIL**. The abort-substring heuristic cannot distinguish "never
  delivered" from "delivered, died before responding"; misclassification lands
  in `MC_RUN_FAILED`. Current mitigation is the `FIXED_CONSTRAINTS` read-only
  slice (`mc-dispatch.ts:58-64`: `read_only`, `no_writes`, `no_network`), which
  bounds the blast radius of the misclassification to read-only effects, but
  the mitigation is policy, untested at the classification boundary.

### S3. Worker dies after external effect

- SETUP: ollama (or broker worker) completes the effect but the coordinator's
  deadline fires first, or the worker dies after computing the result.
- KILL/FAULT POINT: the `AbortController` deadline (`deadlineS`, `mc-dispatch.ts:39-45`:
  ollama 180s, identities 600s).
- EXPECTED INVARIANT: outcome UNKNOWN first-class; duplicate intent -> 409
  HOLD, never re-dispatch; the effect is not re-driven blindly.
- CURRENT PING BEHAVIOR: abort -> `{kind:'timeout'}` -> `emit('MC_RUN_UNKNOWN')`
  with `reconciliation_state: 'RECONCILIATION IN PROGRESS'` and HTTP 200
  `status:'UNKNOWN'` (`route.ts:450-460`). A duplicate POST on the same
  idempotency key finds the non-terminal aggregate and returns 409 HOLD with
  zero new events (`route.ts:327-353`). Against Pi-1: `MC_EXECUTION_STARTED` IS
  emitted before the transport call (intent checkpointed before effect,
  `route.ts:415-418` before `route.ts:434-436`), but there is no replay-safety
  declaration checked twice and no `interrupted` typed error; UNKNOWN is
  produced by classification, not by declaration.
- VERDICT: **FAIL**. Behavior is code-correct and matches the doctrine, but no
  test references the 409 HOLD path (see S1: zero tests reference
  `mc-dispatch`). Untested code is not a passing test.

### S4. Coordinator dies mid-operation (SYNTHETIC coordinator only; never :3100)

- SETUP: a synthetic coordinator drives the real journal functions against a
  scratch journal: appends `MC_MISSION_CREATED`, `MC_RUN_QUEUED`,
  `MC_EXECUTION_STARTED`, `MC_AGENT_AUTHORIZED` for mission M, then is killed
  before any terminal event.
- KILL/FAULT POINT: between `MC_EXECUTION_STARTED` and the terminal event.
- EXPECTED INVARIANT: on recovery the mission re-projects as RUNNING (never
  SUCCEEDED/FAILED, never synthesized); duplicate intent -> 409 HOLD; a
  reconciler rehydrates/observes before any re-drive; quiescence gate before any
  replacement (N2); three-valued liveness probe (P1) decides
  ALIVE/PROVABLY-GONE/UNKNOWN.
- CURRENT PING BEHAVIOR: the journal keeps the four events; `projectMissions`
  renders status RUNNING (`mc-dispatch.ts:354-362`); a duplicate POST returns
  409 HOLD (`route.ts:341-353`). Recovery ends there: `reconciliation_state` is
  a static string set at UNKNOWN emission (`mc-dispatch.ts:403`), nothing
  consumes or advances it, and `src/app/api/mc/agents/route.ts:210-219`
  declares "request reconciliation (ORCA port lane is wiring the reconciler; no
  mutation exists yet)" and "resume after reconciliation (same)". No
  three-valued liveness probe exists anywhere in the dispatch slice (R1
  falsification: UNKNOWN is doctrine-only). No fork-from-checkpoint: replay is
  whole-journal re-projection only (AgentOS comparison).
- VERDICT: **FAIL**. A killed coordinator's RUNNING/UNKNOWN missions enter
  HOLD and nothing ever reconciles them. This is the reached-loop report's
  COORDINATOR-DEATH RECOVERY: FAIL, confirmed in code. The synthetic test that
  would prove recovery is designed in section 3; it must run against a scratch
  harness, never production.

### S5. Gateway dies

- SETUP: kill the journal gateway (or the MC dispatch journal writer)
  mid-append.
- KILL/FAULT POINT: during `appendFileSync` to the events file.
- EXPECTED INVARIANT: torn writes are never presented, never indexed, never
  leaked; the dedupe index rebuilds from disk; a retried write does not double
  commit.
- CURRENT PING BEHAVIOR: for the FYD journal gateway:
  `tools/fyd-journal-gateway/__tests__/dedupe.test.mjs` proves same
  `request_id` twice -> original `event_id` with `deduped:true`; dedupe
  survives process restart (index rebuilt from disk); 20 concurrent
  same-`request_id` POSTs -> exactly one stored event; torn last line -> reads
  keep working, dedupe intact. `src/fyd/tenant/__tests__/h-crash-window.test.ts:153`
  proves a torn write is never presented as committed, never indexed.
  For the MC dispatch journal (`mc-dispatch.ts:23`, same gateway file layout):
  `loadJournalEvents` skips malformed lines (`mc-dispatch.ts:186-205`), and
  `appendDispatchEvent` dedupes by deterministic event id (`mc-dispatch.ts:245-275`),
  but the MC journal does NOT use `request_id` dedupe and the torn-write skip
  path has no test.
- VERDICT: **PASS EXISTING** for the FYD journal gateway (cite
  `tools/fyd-journal-gateway/__tests__/dedupe.test.mjs` and
  `src/fyd/tenant/__tests__/h-crash-window.test.ts:153`). **FAIL** for the MC
  dispatch journal's torn-write path: the skip-malformed-line behavior
  (`mc-dispatch.ts:197-199`) is code-only, untested. (Suites were read, not
  executed; TESTING.md lists no known failures for them.)

### S6. Executor handle survives coordinator

- SETUP: coordinator dies while an executor (ollama request in flight, or
  broker worker holding a grant) is still alive.
- KILL/FAULT POINT: coordinator death with a live executor on the other side.
- EXPECTED INVARIANT: the surviving handle is rehydrated and observed, not
  replayed; no second dispatch under a new id; durable external-execution
  binding outranks any replay policy (Pioneer H3 shape from lane-3 first pass).
- CURRENT PING BEHAVIOR: `work_order_id` and `execution_id` are journaled
  (`route.ts:415-418`; projected at `mc-dispatch.ts:383-385`), but no code path
  reads them after coordinator death. There is no resume/reattach path, no
  executor-liveness probe, and (per S4) no reconciler to run one. The broker
  handle has lease semantics (S7), but the dispatch slice never persists a
  broker handle against the mission.
- VERDICT: **FAIL**. The handle is persisted but orphaned: a surviving executor
  is invisible to recovery, and any future re-drive would be a second dispatch
  under a new identity with no observation of the first.

### S7. Lease expires

- SETUP: (a) a secret-broker handle's TTL lapses mid-mission; (b) a mission's
  transport deadline passes.
- KILL/FAULT POINT: lease/ deadline expiry.
- EXPECTED INVARIANT: lease-expired -> HOLD/PARK, never lease-expired ->
  probably-failed -> redispatch. Renewal of an expired handle is denied; total
  lifetime is capped.
- CURRENT PING BEHAVIOR: broker handles: `src/lib/secrets/__tests__/secret-broker.redteam.test.ts`
  `describe("renewal")` proves renewal of an expired handle is denied with
  EXPIRED, renewal beyond the 24h `MAX_TOTAL_LEASE_SECONDS` cap is denied with
  PERMISSION_DENIED, renewal re-checks full scope binding including tenant
  (`secret-broker.ts:319-352`). Mission layer in the canonical Next.js tree:
  there is NO mission-lease primitive; `DEADLINES` are transport timeouts only
  (`mc-dispatch.ts:39-45`); after a timeout the mission sits UNKNOWN forever.
  CORRECTION (late evidence, 2026-09-28 ~14:35 MDT): a reaper DOES exist, but
  in the Pig-side gateway-adjacent `ping-runtime`, not in the canonical
  Next.js tree: `reapExpiredLeases()` at
  `/home/nolan/wr-integrate/ping-runtime/orchestration/mission_runtime.js:331`
  runs `UPDATE ping_missions SET status='created', ... retry_at = NOW() WHERE
  status IN ('running','assigned') AND lease_until < NOW()`. That is
  lease-expired -> `created` -> redispatch, which is EXACTLY the pattern the
  governing invariant forbids ("never lease-expired to probably-failed to
  redispatch") and matches the `~/AGENTS.md` 2026-09-24 Reaper-vs-HOLD design
  gap note ("open, needs Nolan"): after a HOLD record, an expired lease resets
  the mission to `created` and the scheduler re-dispatches it, i.e. an
  automatic retry of an unknown-outcome mission. The sibling runtime's
  lifecycle transitions are conditional SQL (`WHERE status='created'`,
  doc-reported in `~/workspace/orca-dispatch-test/SPINE-TRACE.md`), i.e. the
  N1 CAS shape exists there, but the reaper's reset-to-created bypasses it
  for expired leases.
- VERDICT: **PASS EXISTING** at the broker-handle layer (cite the renewal
  describe block). **FAIL** at the mission layer, now with a concrete
  mechanism, not just an absence: the governing invariant
  (lease-expired -> HOLD/PARK, never probably-failed -> redispatch) is
  violated by `reapExpiredLeases` in the Pig-side ping-runtime, whose
  expired-lease -> `created` + `retry_at = NOW()` semantics re-dispatch
  unknown-outcome missions. When a reconciler is built, N2's quiescence gate
  must pair with lease expiry (authority fencing decides WHO may own
  recovery; quiescence decides WHEN the replacement may start).

### S8. Approval expires

- SETUP: an approval with `expires_at` lapses before use; a stale approval is
  presented after a state transition.
- KILL/FAULT POINT: approval TTL expiry; TOCTOU between approval and use.
- EXPECTED INVARIANT: silence is never approval; expiry maps to
  EXPIRED/DENIED/CANCELLED/SAFE_NOOP per mission-class policy, never to
  APPROVED; a stale approval on a changed transition is refused with zero
  writes.
- CURRENT PING BEHAVIOR: `mc-approval/approval_request.py:25-28`: "SILENCE IS
  NEVER APPROVAL. No timer, retry, or expiry path transitions to APPROVED...
  There is NO EXPIRE_APPROVE type, constant, or branch anywhere in this file";
  `EXPIRY_POLICY_OUTCOMES` maps default HOLD -> EXPIRED (`approval_request.py:73-85`).
  Reached-loop attack #6 cites `src/fyd/customize/__tests__/stale-guard.test.ts`
  (stale-guard H2 TOCTOU recheck: STALE_APPROVAL/PRECONDITION_CHANGED, zero
  writes). The dispatch slice itself does not consume approvals
  (authority is the adapter's `authorize`/`issue`); FIXED_CONSTRAINTS keeps the
  slice read-only.
- VERDICT: **PASS EXISTING** for the approval subsystem (cite
  `mc-approval/approval_request.py:25-28` and
  `src/fyd/customize/__tests__/stale-guard.test.ts`). Donor shape to consider
  if PING ever issues durable grants: ShibaClaw fingerprint-bound approve-once
  grants (grant bound to sha256 of exact schedule+payload; any drift voids it).

### S9. Credential rotates

- SETUP: the broker credential rotates while a mission is in flight (between
  `authorize` and `execute`).
- KILL/FAULT POINT: rotation landing mid-flight.
- EXPECTED INVARIANT: revocation fences before replacement is published
  (Pioneer H1 shape); unexecuted handles resolve the new value; executed handles
  are sealed; exactly one refresh cycle, no retry storm; the audit trail never
  carries secret material.
- CURRENT PING BEHAVIOR: `src/lib/secrets/__tests__/secret-broker.redteam.test.ts`
  `describe("rotation")` proves unexecuted handles resolve the NEW value,
  executed handles are sealed, and the audit trail contains neither the old nor
  the new value. The reached-loop report records a real rotation incident as
  CLOSED with matching DB/gateway fingerprints. For the dispatch slice: `runBroker`
  reads broker state at call time; no test covers a rotation landing between
  adapter `authorize` and transport `execute`.
- VERDICT: **PASS EXISTING** at the broker layer (cite the rotation describe
  block). **UNKNOWN** for the authorize->execute window in the dispatch slice:
  missing evidence is a test that rotates the credential between `authorize`
  and `execute` and asserts the in-flight mission fails closed (EXPIRED handle)
  rather than proceeding on stale authority.

### S10. Tenant context changes mid-mission

- SETUP: the caller registry changes (tenant entitlement revoked) while a
  mission is in flight; or a second POST arrives with the same idempotency key
  under a different caller key.
- KILL/FAULT POINT: registry change mid-flight.
- EXPECTED INVARIANT: tenant is re-derived server-side from the caller key on
  every request; body tenant claims are refused on mismatch; in-flight
  execution is never silently re-scoped.
- CURRENT PING BEHAVIOR: `src/app/api/mc/_lib/mc-dispatch-identity.ts:60-80`:
  `resolveCaller` maps `x-mc-caller-key` to the server-side registry context;
  missing/unknown key -> refuse (never falls back to body tenant). `missionId`
  binds the tenant (`route.ts:306`: tenant is in the id hash), so the same
  idempotency key under a different caller key derives a DIFFERENT mission id:
  no cross-tenant dedupe collision is possible by construction.
  `src/fyd/tenant/__tests__/f-journal-privacy.test.ts:113` covers journal
  tenant privacy hostile in both directions.
- VERDICT: **PASS EXISTING** (cite `mc-dispatch-identity.ts:60-80` and the
  privacy test). Caveat: mid-mission change is moot by design today (the
  request is synchronous; there is no resume path where a stale tenant could be
  inherited from a persisted row, unlike Nerve's system-principal resume which
  lane 3 flags as a transferable warning).

### S11. Capability revoked mid-mission

- SETUP: the adapter registry flips an agent profile to non-LIVE or removes a
  capability after `MC_EXECUTION_STARTED` but before the terminal event.
- KILL/FAULT POINT: revocation landing mid-flight.
- EXPECTED INVARIANT: eligibility is re-verified at the effect boundary;
  revocation halts the effect or marks the outcome untrusted.
- CURRENT PING BEHAVIOR: profile liveness and capability allowlisting are
  checked exactly once, before `authorize` (`route.ts:359-368`). Nothing
  re-checks after `MC_EXECUTION_STARTED`. The execution is a single synchronous
  transport call, so the window is small, but structurally there is no
  re-verification: revocation mid-flight is invisible.
- VERDICT: **FAIL**. Capability eligibility is a pre-dispatch gate only; no
  re-verification exists at or after the effect boundary. (Talos donor
  invariant not adopted: mint re-decides at issuance and the runner re-verifies
  at redeem; PING checks once at the front door.)

### S12. Network partition

- SETUP: partition between the coordinator and ollama (localhost) or the
  broker worker mid-run; the far side may still be computing.
- KILL/FAULT POINT: partition onset during the transport await.
- EXPECTED INVARIANT: bounded detection; partition -> UNKNOWN (not FAILED); no
  blind retry into the partition; the far side's possible completion is treated
  as unknown, not as never-delivered.
- CURRENT PING BEHAVIOR: a dropped in-flight response surfaces as a fetch
  throw without 'abort' -> `transport-failed` -> `MC_RUN_FAILED`
  (`route.ts:160-170`, `route.ts:441-448`). There is no partition detection, no
  heartbeat, no distinction between "slow executor" and "partitioned
  executor". Same heuristic flaw as S2.
- VERDICT: **FAIL**. Partition is indistinguishable from a slow executor and
  from a never-delivered request; the classification heuristic renders
  partitions as FAILED ("never delivered"), which is unprovable and violates
  UNKNOWN-first semantics for the partitioned case.

### S13. Duplicate result arrives

- SETUP: the same verified result is delivered twice (adapter `verify` called
  twice; or `MC_RUN_SUCCEEDED` emitted twice for one mission).
- KILL/FAULT POINT: second terminal emission.
- EXPECTED INVARIANT: exactly-once terminal; the second terminal is a no-op
  (or a typed conflict), never a silent overwrite.
- CURRENT PING BEHAVIOR: `appendDispatchEvent` dedupes by deterministic event
  id `mc-d-` + sha256(kind|missionId|eventType|summary) (`mc-dispatch.ts:182-185`,
  `245-275`): a byte-identical re-emission returns `duplicate-skipped`. But a
  second emission with ANY differing byte in the summary (different
  output_digest, different evidence) mints a different event id and is appended;
  `projectMissions` applies events in timestamp order with last-write-wins and
  no conflict marker (`mc-dispatch.ts:390-396`). Only `route.ts` writes these
  events and the duplicate-POST path is guarded, so the trigger today requires
  code-level misuse, but the write boundary itself does not enforce single
  terminal.
- VERDICT: **FAIL**. Dedupe is summary-identical only; a divergent duplicate
  result creates a second terminal event that the projector silently accepts as
  last-write-wins. Against N1: terminal transitions are set, not WON; there is
  no CAS single-winner guard on the terminal transition.

### S14. Late result arrives

- SETUP: a result arrives after a terminal event (e.g., an executor response
  lands after the mission was marked UNKNOWN by deadline).
- KILL/FAULT POINT: post-terminal result delivery.
- EXPECTED INVARIANT: a late result may advance UNKNOWN -> terminal only
  through reconciliation (with evidence and verification), never by direct
  write; it must never overwrite SUCCEEDED/FAILED.
- CURRENT PING BEHAVIOR: no late-result ingestion path exists. The route awaits
  the transport synchronously; there is no callback endpoint; only `route.ts`
  writes `MC_*` events. PING has no fork-from-checkpoint equivalent (AgentOS):
  replay is whole-journal re-projection from scratch, so there is no checkpoint
  for a late result to attach to.
- VERDICT: **FAIL** (latent). The failure is precise: the day a reconciler
  adds a late-result path, it will write into `projectMissions`, whose
  last-write-wins application (`mc-dispatch.ts:390-396`) cannot distinguish a
  reconciled late result from a conflicting write. The required invariant
  (UNKNOWN -> terminal only via reconciliation; terminal states immutable) has
  no code home today.

### S15. Event write succeeds but projection fails

- SETUP: the journal holds a valid `MC_RUN_UNKNOWN`; `projectMissions` throws
  on an unexpected `event_data` shape.
- KILL/FAULT POINT: projection (read path).
- EXPECTED INVARIANT: projection failure never corrupts the journal; reads fail
  safe; projection is replay-safe and pinned by tests.
- CURRENT PING BEHAVIOR: `projectMissions` is pure and re-run per read
  (`mc-dispatch.ts:296-417`); a throw surfaces as a read-path 500 with the
  journal untouched. The Lane D ordering fix (`mc-dispatch.ts:212-244`:
  strictly increasing per-mission acceptance timestamps, proven by synthetic
  probe `mc-m-test-unknown-01`) shows projection-order bugs were real and were
  fixed, but the fix is pinned by a probe comment, not a committed test.
- VERDICT: **FAIL**. Replay-safety of the projection is code-review-only; zero
  tests pin it. The one ordering bug caught was caught by a synthetic probe,
  not a committed regression test, so the class is unguarded going forward.

### S16. Effect succeeds but event write fails

- SETUP: ollama returns output; `appendFileSync` throws (disk full,
  permission, torn filesystem) before `MC_RUN_SUCCEEDED` is appended.
- KILL/FAULT POINT: between transport return and terminal event commit
  (`route.ts:464-508`).
- EXPECTED INVARIANT: the effect is real; the mission must enter UNKNOWN/HOLD
  with the result evidence preserved; the result must be recoverable by
  reconciliation, never silently dropped.
- CURRENT PING BEHAVIOR: `emit()` calls `appendDispatchEvent` with no
  try/catch (`route.ts:371-373`); a throw propagates and Next.js returns 500.
  The journal holds CREATED/QUEUED/STARTED/RUNNING with no terminal; the result
  envelope (output, output_digest, verification) existed only in memory and is
  lost. A duplicate POST then returns 409 HOLD on a mission that will never
  leave RUNNING. Against Pi-1: Pi checkpoints `{phase:"started"}` before the
  effect and would surface a typed `interrupted` result; PING checkpoints
  intent (`MC_EXECUTION_STARTED`) but checkpoints NOTHING after the effect
  returns and before the terminal commit, so the crash window
  effect-returned-but-not-recorded loses the evidence entirely.
- VERDICT: **FAIL**. Result evidence is lost on event-write failure; the
  mission degrades to RUNNING-with-no-terminal (not even UNKNOWN); nothing
  marks it for reconciliation; the output is unrecoverable. This is the
  effect-recovery scenario Pi-1 benchmarks, and PING fails the benchmark.

### S17. Reconciliation itself crashes

- SETUP: a future reconciler begins a reconcile pass over UNKNOWN missions and
  is killed mid-pass (after emitting `MC_RUN_UNKNOWN` for one mission, before
  finishing the pass).
- KILL/FAULT POINT: mid-reconcile-pass.
- EXPECTED INVARIANT: the reconcile pass is idempotent and resumable; a crash
  re-enters at the same state; no partial advancement; re-drive intents are
  consumed exactly once (Nerve delete-then-drive; ForkScout single-consumption
  token as the TEST shape: continuation fires exactly once, not zero, not
  twice).
- CURRENT PING BEHAVIOR: no reconciler exists (`src/app/api/mc/agents/route.ts:210-219`).
- VERDICT: **UNTESTABLE-SAFELY** as a mechanism test (there is no reconciler
  to crash). Design requirement recorded for the reconciler lane: the pass
  must be idempotent; re-drive intents must be single-consumption
  (ForkScout test shape, not its implementation); crash must re-enter at the
  same state, never re-enroll (N2 delete-then-drive). Do NOT copy the 5s live
  reconcile loop (flagged fragile by lane 3).

### S18. Restart occurs repeatedly

- SETUP: the coordinator restarts N times with UNKNOWN/RUNNING missions
  pending and no reconciler running.
- KILL/FAULT POINT: repeated restarts.
- EXPECTED INVARIANT: restart is non-amplifying: no re-drive per restart,
  stuck work is bounded (aged out or escalated), journal replay stays safe.
- CURRENT PING BEHAVIOR: projection is pure per-read, so state does not
  corrupt across restarts; the gateway dedupe index rebuilds from disk
  (tested, S5). But every restart leaves UNKNOWN missions untouched; with no
  reconciler and no age-out/escalation, stuck work accumulates without bound.
  (Engineering note, not a correctness failure: `appendDispatchEvent`'s
  `maxMissionTimestamp` scan is O(journal) per emit, `mc-dispatch.ts:226-244`.)
- VERDICT: **FAIL**. Restart is non-amplifying for state but amplifying for
  stuck work: no bound, no age-out, no escalation, no reconciler. Goated's
  H4 shape (startup replay aged-out, attempt-capped, stale unknowns retired)
  is the donor benchmark PING does not meet.

### S19. Replacement dispatch while the previous executor may still be alive (quiescence gap)

- SETUP: an UNKNOWN mission is selected for re-drive by a future reconciler
  while the original executor (ollama request past deadline, broker worker)
  may still be running.
- KILL/FAULT POINT: the re-drive decision.
- EXPECTED INVARIANT (N2): a replacement executor is never started while the
  previous executor may still be alive: prove the old executor dead, or wait a
  bounded interval with a logged timeout, before the replacement dispatches.
  Authority fencing (WHO may own recovery) pairs with quiescence (WHEN the
  replacement may start).
- CURRENT PING BEHAVIOR: no quiescence gate and no executor-liveness probe
  exist anywhere under `src/app/api/mc`. The `AbortController` deadline cancels
  the client side of the transport only; it cannot prove the server stopped.
  Current mitigation is that automated resume was deliberately withheld
  (reached-loop report), so no re-drive exists to violate the gate: the
  mitigation is policy, not mechanism.
- VERDICT: **FAIL**. The mechanical piece N2 names is absent from the dispatch
  slice. The day a reconciler re-drives an UNKNOWN mission, it will do so with
  no proof the old executor is dead: a live-plus-replacement double execution
  with no gate between them.

---

## 3. Synthetic coordinator-death test design (runnable against a scratch harness, never production)

**Goal:** prove replay/recovery with no duplicate effect, no synthesized
authority, no lost decision/evidence, no fake success, and UNKNOWN staying
UNKNOWN until reconciled.

**Harness shape (hermetic, safe):** a scratch Node script (or a future jest
suite under `src/**/__tests__/`; jest `testMatch` already covers that path)
that imports the REAL `projectMissions`, `appendDispatchEvent`,
`mintEventId`, `findPriorMission`, `MISSION_TERMINAL_STATUSES` from
`src/app/api/mc/_lib/mc-dispatch.ts`. Hermeticity constraint: `mc-dispatch.ts:23`
hardcodes `JOURNAL_PATH` to the production gateway file, and `route.ts` is
locked. The harness therefore runs in one of two sanctioned forms: (a) a
jest module-registry override that rebinds the path constants to a `mkdtemp`
scratch dir before import; or (b) a scratch copy of the lib with the two path
constants parameterized (copy, never edit the original). No external sends, no
production processes, no network: the adapter/transport calls are stubbed at
the harness boundary (the test exercises journal semantics, not the adapter).

**Phases:**

- **P0 setup:** scratch journal + scratch artifact root in `mkdtemp`. Deterministic
  mission id derived exactly as `route.ts:306` (sha256 over
  agent|tenant|capability|promptDigest|idempotencyKey).
- **P1 dispatch (synthetic coordinator):** append `MC_MISSION_CREATED`,
  `MC_RUN_QUEUED`, `MC_EXECUTION_STARTED`, `MC_AGENT_AUTHORIZED` for mission M
  via the real `appendDispatchEvent` (exercises the real deterministic event-id
  dedupe and the real timestamp-bump ordering fix).
- **P2 kill:** the synthetic coordinator stops. No terminal event is written.
  Assert the projection renders M as RUNNING (A4 pre-reconcile).
- **P3 duplicate intent (recovery observation):** run the real duplicate-POST
  decision (`findPriorMission` + `MISSION_TERMINAL_STATUSES`) N times.
  Expect 409-HOLD semantics every time; assert the journal line count is
  unchanged across all N attempts (A1).
- **P4 reconciler pass (once a reconciler exists):** run the reconcile pass;
  it may emit `MC_RUN_UNKNOWN` (never a terminal). Then repeat P3: still 409
  HOLD; projection still UNKNOWN with `reconciliation_state` intact (A5).
- **P5 crash-during-reconcile injection:** kill the reconciler between the
  UNKNOWN emission and pass completion; re-run the pass; assert idempotence
  (no second `MC_RUN_UNKNOWN`, state converges, A6/A8).

**Assertions:**

- **A1 no duplicate effect:** after N duplicate attempts, exactly one
  `MC_EXECUTION_STARTED` exists for M; journal event count for the aggregate
  is unchanged by duplicates.
- **A2 no synthesized authority:** no new `MC_AGENT_AUTHORIZED` appears after
  the kill; the capabilities set is exactly the pre-kill set.
- **A3 no lost decision/evidence:** all four pre-kill events project; the
  evidence array is intact; `work_order_id`, `run_id`, `execution_id` are
  preserved byte-for-byte.
- **A4 no fake success:** status is RUNNING pre-reconciler, UNKNOWN
  post-reconciler; never SUCCEEDED/FAILED; `result.outcome` is never
  `completed`/`failed` without a verified result envelope.
- **A5 UNKNOWN stays UNKNOWN:** after `MC_RUN_UNKNOWN`, duplicates still 409
  HOLD; projection renders UNKNOWN with `reconciliation_state` preserved; the
  mission is excluded from any learning/canonical pipeline (P2 invariant).
- **A6 exactly-once continuation (ForkScout test shape):** a
  single-consumption resume token consumed by the reconciler fires exactly
  once across a simulated restart: not zero (no silent drop), not twice (no
  re-enrollment). Implement as: token file read, then atomically consumed
  before re-entry; crash between consume and completion is recorded as an
  explicit completion-pending state, never silently lost (pairs with N2
  delete-then-drive).
- **A7 fork-from-checkpoint (AgentOS test shape, documents a gap):** replay the
  journal from a checkpoint marker and assert the prefix events are
  byte-identical to the original projection; then fork a live continuation
  from the checkpoint without rewriting history. Expected outcome TODAY: the
  test cannot be written against PING because no checkpoints exist (replay is
  whole-journal only); A7 is recorded as the acceptance test for the day
  checkpoints are introduced.
- **A8 quiescence (N2):** with a synthetic old executor that reports
  alive/dead on demand, assert a replacement execution is not started until
  the old executor reports dead OR the bounded deadline fires AND the timeout
  is logged. Kill the old executor mid-wait: the replacement must still wait
  for the death signal, not proceed on the kill signal alone.
- **Negative control (N4 shape):** seed a mission whose effect completed but
  whose terminal event is missing; run the catchup/reconcile path twice with a
  restart between; assert the effect is observed exactly once and never
  re-fired on the success-only watermark pattern (assert at the dispatch
  boundary: re-fire requires a dispatch record, not a success record).

**What the test does NOT do:** it never kills :3100, the gateway, or any
production process; never touches the production journal; never mints a
caller key; never dispatches a live mission.

---

## 4. Ranked weakest recovery edges (exact first-violated invariant each)

**#1. Coordinator-death recovery terminates at HOLD with no reconciler; UNKNOWN is doctrine-only (S4).**
First-violated invariant: **UNKNOWN -> HOLD -> RECONCILE**. The RECONCILE leg
has no code home: `src/app/api/mc/agents/route.ts:210-219` withholds
reconciliation, hold, resume, and retry as mutations ("no mutation exists
yet"); `reconciliation_state` is a static string (`mc-dispatch.ts:403`) that
nothing consumes. R1 falsification: no three-valued liveness probe
(ALIVE/PROVABLY-GONE/UNKNOWN) exists anywhere in the dispatch slice, so the
reconciler, when built, will have no mechanical way to distinguish a dead
executor from an unreachable one; POLYROB's `claim_liveness.py` is the
30-line shape to adopt. Until then, every UNKNOWN mission is write-only
observability.

**#2. Effect-succeeds-but-event-write-fails loses the result (S16).**
First-violated invariant: **evidence must survive the crash window between
effect return and terminal commit**. `emit()` has no try/catch
(`route.ts:371-373`); the result envelope lives only in memory; a throw leaves
the journal at RUNNING forever and the output unrecoverable. Pi-1 is the
benchmark PING fails: Pi checkpoints `{phase:"started"}` before the effect and
surfaces a typed `interrupted` error on recovery; PING checkpoints intent
before the effect (`MC_EXECUTION_STARTED`) but checkpoints nothing after the
effect returns, so the crash window effect-returned-but-not-recorded is a
total evidence loss. A duplicate POST then 409-HOLDs on a mission that can
never advance.

**#3. No quiescence gate for any future re-drive (S19).**
First-violated invariant (N2): **a replacement executor is never started while
the previous executor may still be alive**. No executor-liveness probe exists
under `src/app/api/mc`; the `AbortController` deadline cancels the client
side only and proves nothing about the server. The current mitigation
(automated resume deliberately withheld) is policy, not mechanism; the day a
reconciler re-drives, it will do so with no gate, risking live-plus-replacement
double execution. Authority fencing (Pioneer's lease + terminal-authority
claim, WHO may own recovery) must be paired with quiescence (WHEN the
replacement may start).

Runner-up (not ranked, recorded): the transport-failed misclassification
(S2/S12): the abort-substring heuristic renders possibly-delivered and
partitioned runs as FAILED ("never delivered"), unprovably. Bounded today by
the read-only slice; the heuristic needs a declared replay-safety contract
(Pi-1) before the slice ever carries writes.

---

## 5. UNKNOWNs (missing evidence, named)

- U1: whether the FYD gateway dedupe/crash-window suites currently pass (read,
  not executed; TESTING.md lists no known failures for them).
- U2: a rotation landing between adapter `authorize` and transport `execute`
  in the dispatch slice (S9): no test; missing evidence is the test itself.
- U3: approval-expiry binding on adapter-issued work orders in this slice (S8):
  the approval subsystem is tested, the adapter's issue path is out-of-tree.
- U4: runtime behavior of any donor mechanism under real crash (all donor
  claims are code-read hypotheses until clean-checkout replay, per lanes 3, 7, 8).
- U5: whether `mc-m-test-unknown-01` (the synthetic probe behind the Lane D
  ordering fix) exists as a committed artifact or only as a comment reference
  (`mc-dispatch.ts:219`); if the latter, the ordering fix has no regression
  test at all.
- U6: the exact content of the reached-loop report's tenant-spoof "g/e/a/f
  suites": the report cites them without file paths; the hostile-direction
  coverage I could locate is `src/fyd/tenant/__tests__/f-journal-privacy.test.ts:113`.
- U7: ForkScout's license state (README claims MIT, no LICENSE file at the
  pinned SHA): unresolved; blocks any code harvest, test-shape only.

## 6. UNTESTABLE-SAFELY

- S17 (reconciliation itself crashes): no reconciler exists to crash; the
  test shape is designed (section 3, P5) and must run the day the reconciler
  lands, against a scratch harness.
- Any scenario requiring a live coordinator kill: the coordinator is the
  production `:3100` server; killing it is forbidden infrastructure change.
  The synthetic coordinator in section 3 is the sanctioned substitute.
- Any scenario requiring a live dispatch: requires a caller key from the
  server-side registry; none was minted or borrowed.

## 7. Verification ledger

- Canonical tree: `/home/nolan/projects/ping` @ `0264d517` (matches the
  reached-loop report's observed HEAD). Local modifications present (other
  lanes active); all reads were read-only.
- Code facts verified by direct read: 409 HOLD path (`route.ts:327-353`);
  terminal-status set (`mc-dispatch.ts:162-168`); deterministic event ids and
  duplicate-skip (`mc-dispatch.ts:182-185, 245-275`); projection switch incl.
  MC_RUN_UNKNOWN (`mc-dispatch.ts:354-417`); `findPriorMission` read-only
  (`mc-dispatch.ts:426-437`); transport outcome classification
  (`route.ts:139-170, 434-460`); profile/capability pre-check
  (`route.ts:359-368`); tenant derivation (`mc-dispatch-identity.ts:60-80`);
  reconciler-withheld declaration (`agents/route.ts:210-219`); broker renewal
  and rotation tests (`secret-broker.redteam.test.ts:233-294`); approval
  expiry policy (`mc-approval/approval_request.py:25-28, 73-85`); gateway
  dedupe and crash-window tests (headers + bodies read, not executed);
  DEADLINES (`mc-dispatch.ts:39-45`); FIXED_CONSTRAINTS (`mc-dispatch.ts:58-64`).
- Negative verifications: no test file references `mc-dispatch`; no
  `reap`/`_processing` under `src/app/api/mc` (canonical Next.js tree); no
  `quiesc` under `src`; only `route.ts` writes `MC_*` dispatch events.
  CORRECTION: `reapExpiredLeases` DOES exist in the Pig-side gateway-adjacent
  `ping-runtime` (`/home/nolan/wr-integrate/ping-runtime/orchestration/mission_runtime.js:331`):
  expired lease -> `status='created'` + `retry_at = NOW()`, i.e.
  lease-expired -> redispatch, the exact pattern the governing invariant
  forbids; this is the `~/AGENTS.md` 2026-09-24 Reaper-vs-HOLD open design
  gap, confirmed in code, not just a lane-tree note.
- Donor inputs consumed: wave-1 corpus
  (`~/workspace/runtime-harvest/wave1-donor-reports.md`, full read);
  lane-3 report (full read, mechanism cards N1-N4, P1-P3, cross-cutting notes,
  verification ledger); lane-7 Pi-1 card (full read); lane-8 AgentOS,
  ForkScout, ShibaClaw, ORCH cards (full read). Lane-3 raw pins not re-read
  beyond the report; lane-8 ShibaClaw/ORCH mechanisms noted, not deep-read.
- Not executed: no test suite was run (read-only lane); no donor repo was
  cloned; no synthetic harness was executed (designed only, section 3).

**Bottom line for the parent:** the torture lab is designed, not run. The
dispatch slice is honest at its boundaries (fail-closed validation, UNKNOWN
first-class, 409 HOLD, deterministic ids) and every one of those properties
is code-only: zero tests reference `mc-dispatch`. The three weakest edges are
(1) HOLD-with-no-reconciler plus doctrine-only UNKNOWN (no three-valued
liveness probe), (2) result-evidence loss when the terminal event write fails,
(3) no quiescence gate for any future re-drive. Late evidence added a fourth
concrete violation outside the dispatch slice: `reapExpiredLeases` in the
Pig-side ping-runtime resets expired-lease missions to `created` with
`retry_at = NOW()`, i.e. lease-expired -> redispatch, the exact pattern the
governing invariant forbids (the AGENTS.md Reaper-vs-HOLD open design gap,
now confirmed in code). The synthetic coordinator-death
test in section 3 is ready to run against a scratch harness the day a test
lane picks it up; A7 (fork-from-checkpoint) is intentionally specified as a
failing-today acceptance test that documents PING's missing checkpoint
primitive.
