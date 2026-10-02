# Lane F — Integration Test Harness Design
## Mission Control → headless agent → artifact/evidence → event → projection

Status: IMPLEMENTED (2026-09-26). Harness lives at
`~/workspace/sprint-2026-09-24/orca/lane-f-harness/` (`run.js` + `lib/` + `cases/`).
Latest full run: 9/9 PASS at 2026-09-26 13:44 UTC
(`out/run-2026-09-26T1344-0309/`). Section 4 below now records the verified
interface reality (VERIFIED / CORRECTED / PARTIAL / ABSENT) instead of design-time
assumptions; section 6 is the implementation record.

### Design contracts consulted
- `~/workspace/sprint-2026-09-24/orca/WR-EFFECT-UNKNOWN-LANE.md` (fail-closed dispatch
  semantics: SUCCEEDED / NO_MATCH / UNKNOWN / FAILED; regression repro
  `wr-effect-unknown/repro-effect-then-undefined.js`)
- `~/workspace/mission-control/` (`emit.py`, `project.py`, `backfill.py`,
  `OBSERVABILITY-MISSION-CONTROL.md`, `projection-sample-2026-09-26.json`)
- `~/workspace/mission-control/STATE.md` (:3100 MC surface, `/api/mc/*` routes,
  per-operation fields: Mission, Run, Operation, Attempt, Effect, Idempotency Key,
  Current State, Last Evidence, Reconciliation State, Retry Eligibility, Criticality,
  Authority Requirement)
- `~/workspace/autonomous-missions/ORCA-ARCHAEOLOGY-2026-09-23.md` (Orca capability map;
  Orca A6 adapter port is unproven and REJECTED as an authority — see open question 1)
- `~/workspace/tandem/tenant-os-trace-2026-09-14.md` (tenant/identity/authority seams;
  key fact: tenant isolation is NOT demonstrated; agent authority boundaries ARE real)

### Standing architectural rule for this harness
UNKNOWN is a fundamental distributed-systems state, not an error code. The harness
asserts UNKNOWN is preserved end to end (dispatch -> execution -> event ->
projection -> UI state) and FAILS if any stage collapses UNKNOWN into FAILED or
NO_MATCH. After the WorkerRuntime discovery, that collapse is the primary lie under test.

### Scope boundaries
- Synthetic fixtures first. No real external effects anywhere in the harness design.
  Provider-side mutations are stand-ins (append-only counter files like the existing
  `evidence-provider-effects.jsonl`, or in-memory effect ledgers).
- Headless agent executions are bounded test doubles registered through the worker
  substrate; the harness verifies the plumbing (prompt received, artifact produced,
  evidence linked, events recorded, projection updated), not model quality.
- Lane E (FYD) is separate; untouched.
- No Copilot identities needed for a design task; none used.

---

## 1. Stage-by-stage test matrix

Each row: hop, scenario, assertion, fixture, evidence artifact produced.
All scenarios use the same harness shape: dispatch a mission through the real
dispatch code path, record every hop's observation into a per-run evidence bundle,
then assert stage-by-stage. The evidence bundle is the harness's output contract:
`<harness-out>/<case>/<mission_id>/evidence.jsonl` + `projection.json` + `verdict.json`.

Conventions used in the matrix:
- `dispatchResult` = raw value returned by the worker runtime's `dispatch()`.
- `outcome` ∈ {SUCCEEDED, NO_MATCH, UNKNOWN, FAILED} per the WR lane semantics
  (ASSUMED: lane A implements this mapping; see 4).
- An event is "recorded" only when it exists on the append-only event plane with a
  content-derived event_id and is replayable by `project.py`.
- "UI state" = the value a Mission Control consumer reads: for the MC surface,
  `GET /api/mc/agents` per-operation fields (Current State, Last Evidence,
  Reconciliation State); truth display must render UNKNOWN as
  "OUTCOME UNKNOWN — RECONCILIATION IN PROGRESS", never as FAILED.

### 1A. Happy path — full chain, all hops green

| Hop | Assertion | Fixture | Evidence artifact |
|---|---|---|---|
| MC dispatch | A bounded prompt + authorized agent selection produces a `mission_created` record with `mission_id`, `run_id`, idempotency key, and the dispatch receipt names the selected agent | Fixture mission: `{"prompt": "bounded synthetic prompt", "agent": "test-headless-agent-1", "idempotency_key": "lane-f-happy-001"}` | `dispatch-receipt.json` (mission_id, run_id, agent, idempotency_key, timestamp) |
| mission → run | `run_id` is unique, bound to exactly one `mission_id`, and records attempt 1 | Two fixtures dispatched 1s apart must yield distinct run_ids | `mission-run-binding.json` |
| run → execution | Execution record binds `mission_id`, `run_id`, `attempt` and records dispatch start | — | `execution-start.json` |
| execution → adapter/headless agent | The agent actually receives the prompt/context: the test agent echoes a canonical digest of the received prompt; harness compares digest against the dispatched prompt's digest | Test headless agent: registered worker whose `handle()` returns `{"prompt_digest": sha256(prompt), "artifact_uri": ...}` | `prompt-receipt.json` (digest match PASS/FAIL) |
| agent → artifact/evidence | Agent produces an artifact; an evidence record links `artifact_uri` → `execution_id` → `run_id` → `mission_id` with a content digest | Artifact = deterministic synthetic file (e.g. `artifact.txt` with fixed content) | `artifact.json` (path, sha256) + `evidence-link.json` |
| artifact → event | Existing event plane records the full lifecycle: dispatch started, execution completed, artifact published, effect observed; all share one correlation id | ASSUMED event types below (4) emitted through the live emit path, not a side channel | `events.jsonl` (the recorded events, content-id'd) |
| event → projection | `project.py --journal <events> --as-of <T> --out` produces a projection whose mission row shows SUCCEEDED with the artifact digest as Last Evidence | Replay via the real projector | `projection.json` + byte digest of file |
| projection → UI state | `GET /api/mc/agents` (or the MC read seam that lands) shows the operation row: Current State=SUCCEEDED, Last Evidence=artifact digest, Reconciliation State=NONE_REQUIRED | Read against the same journal the projector used | `ui-state.json` (captured route response) |
| refresh preserves state | Re-reading the projection and the MC route returns identical rows after cache clear / process restart; no state lives only in memory | Restart the read path between reads | `refresh-parity.json` (digest equality) |
| replay reconstructs state | Deleting the projection and re-running `project.py` over the same journal bytes yields byte-identical output | sha256 of both projection files | `replay-parity.json` |

Scenario verdict: `verdict.json` = PASS only if all hops PASS and both parity checks hold.

### 1B. UNKNOWN propagation — ambiguous handler result (the primary lie to test for)

Setup: the test worker performs its (synthetic) effect and returns `undefined`
— the exact WR-lane discovery. Lane A's fail-closed semantics must classify this
as UNKNOWN (matched, effect unproven), never as "no worker matched", never auto-retry.

| Hop | Assertion | Fixture | Evidence artifact |
|---|---|---|---|
| execution | `dispatchResult` is falsy AND a dispatch receipt proves a worker matched (routing evidence bound to the op key — WR lane requirement 1) | Worker registered for `event_type=LANE_F_AMBIGUOUS`; handle appends to counter file, returns `undefined` | `dispatch-receipt.json` (worker_id present, return_value null/undefined recorded honestly) |
| classification | Outcome == UNKNOWN; the recorded error text must NOT claim "no worker matched" (fabricated-prose regression) | Same | `outcome.json` (`"outcome": "UNKNOWN"`, `"retry": "not-authorized"`) |
| event | Event plane records `execution_unknown` (or the ASSUMED unknown event type) with the matched-worker receipt attached; no `execution_failed` event exists for this attempt | — | `events.jsonl`; assertion greps for absence of failed + presence of unknown |
| projection | Projector maps the unknown event to `display_status` in {UNKNOWN, HOLD, "OUTCOME UNKNOWN — RECONCILIATION IN PROGRESS"}; it must NOT be FAILED, must NOT be NO_MATCH | project.py over the case journal | `projection.json` |
| UI state | MC per-operation row: Current State=UNKNOWN, Reconciliation State=IN_PROGRESS, Retry Eligibility=NOT_AUTHORIZED (no proven non-execution) | `GET /api/mc/agents` | `ui-state.json` |
| negative: no auto-retry | Scheduler does not redispatch without operation-bound evidence of non-execution or a proven idempotency contract (WR lane requirements 1+2 or 3); counter file still shows exactly 1 effect | Poll the run for N seconds; count counter lines | `effect-count.json` (`effects: 1`) |
| refresh/replay | Same parity checks as 1A, with the UNKNOWN status preserved byte-identically | — | `refresh-parity.json`, `replay-parity.json` |

This case FAILS the whole harness if any hop renders UNKNOWN as FAILED or NO_MATCH,
or if a retry fires without evidence. This is the regression anchor for the
WR-lane repair: the harness should be runnable against the live code TODAY to
demonstrate the defect (expected: FAIL at classification + duplicate effect),
and against lane A's repaired code to demonstrate the fix (expected: PASS).

### 1C. Explicit no-match — unregistered event type

Setup: dispatch an event type with no registered worker. Expected outcome: NO_MATCH.

| Hop | Assertion | Fixture | Evidence artifact |
|---|---|---|---|
| execution | `dispatchResult` is falsy AND no dispatch receipt names a worker (genuine absence of routing evidence) | `event_type=LANE_F_UNREGISTERED` | `dispatch-receipt.json` (`matched_worker: null`) |
| classification | Outcome == NO_MATCH; this is the ONLY case where "no worker matched" prose is truthful | — | `outcome.json` |
| unknown-vs-nomatch discrimination | The harness asserts the 1B and 1C outcome records are distinguishable by a consumer reading only the event plane (different event types / different status fields), i.e. the observation gap is closed | Diff of the two cases' `events.jsonl` | `discrimination-proof.json` |
| event → projection → UI | NO_MATCH projects honestly (no retry, no failure styling); UI row shows NO_MATCH with reason | — | `projection.json`, `ui-state.json` |
| refresh/replay | Parity as 1A | — | `refresh-parity.json`, `replay-parity.json` |

### 1D. Worker failure before proven effect — FAILED

Setup: the test worker throws before touching the effect stand-in (counter file untouched).
Expected outcome: FAILED, retry MAY be authorized (nothing executed — but only via the
lane-A retry policy, not by default).

| Hop | Assertion | Fixture | Evidence artifact |
|---|---|---|---|
| execution | Worker raises; `dispatchResult` never produced; effect stand-in shows 0 effects | Worker `handle()` throws `LANE_F_BOOM` before counter write | `execution-error.json`, `effect-count.json` (`effects: 0`) |
| classification | Outcome == FAILED with the real error attached (no fabricated routing prose) | — | `outcome.json` (`"outcome": "FAILED"`, `"error": "LANE_F_BOOM"`) |
| event → projection → UI | FAILED projects as FAILED (honest — this is the one case where FAILED is correct); UI row shows FAILED with last evidence = error record; retry eligibility per lane-A policy | — | `events.jsonl`, `projection.json`, `ui-state.json` |
| refresh/replay | Parity as 1A | — | `refresh-parity.json`, `replay-parity.json` |

### 1E. Timeout → UNKNOWN (DISPATCH_TIMEOUT path)

Setup: the test worker never resolves (blocks past the dispatch timeout). Per the
WR lane doc, the live timeout path is already fixed (DISPATCH_TIMEOUT → HOLD, never
FAILED on timeout). The harness locks that behavior in.

| Hop | Assertion | Fixture | Evidence artifact |
|---|---|---|---|
| execution | Dispatch times out; worker outcome genuinely unknowable (effect may or may not have landed) | Worker `handle()` sleeps 3x the timeout, writes the counter at 2x timeout (effect lands AFTER the timeout fires — the adversarial case) | `timeout-record.json` |
| classification | Outcome == UNKNOWN with HOLD semantics; mission row stays `running`/held, never FAILED | — | `outcome.json` |
| event | HOLD event recorded with reason `DISPATCH_TIMEOUT`, effect-state explicitly `unknown` | — | `events.jsonl` |
| no reaper retry (restart-gated) | After a scheduler restart, the held/unknown mission is NOT silently redispatched (the Reaper-vs-HOLD gap, open pending Nolan — harness records the behavior, expected HOLD holds) | Restart the scheduler harness process, observe no redispatch | `restart-behavior.json` |
| projection → UI | UI shows "OUTCOME UNKNOWN — RECONCILIATION IN PROGRESS"; staleness renders if no heartbeat | — | `projection.json`, `ui-state.json` |
| refresh/replay | Parity as 1A | — | `refresh-parity.json`, `replay-parity.json` |

Note: the counter file in this fixture will show the effect eventually landing at 2x
timeout while the outcome stays UNKNOWN — this is the honest record of the race, and
the harness asserts the outcome does not get rewritten to SUCCEEDED by the late effect
unless lane A defines a reconciliation path that observes it (recorded, not asserted).

### 1F. Duplicate-effect regression — effect executes exactly once

This folds the existing `repro-effect-then-undefined.js` into the harness as a
permanent regression case rather than a one-off proof.

| Hop | Assertion | Fixture | Evidence artifact |
|---|---|---|---|
| setup | Verbatim live `WorkerRuntime.dispatch` code path (as the repro does today) or lane A's repaired dispatch; worker performs effect then returns `undefined` | Same counter-file stand-in, fresh file per run | `pre-run.json` (counter=0) |
| execution × N attempts | Run the scheduler loop for the configured max attempts; count counter lines at the end | — | `effect-count.json` |
| invariant | Exactly 1 physical effect for 1 logical mission, regardless of outcome classification | Repaired code: UNKNOWN + HOLD, no redispatch | `verdict.json` (PASS iff `effects == 1`) |
| negative control | Documented: against the pre-fix code the case FAILS with `effects == 2` (the recorded WR-lane finding); the harness must be able to run in "expect-fail" mode against known-bad code to prove it detects the defect | Same fixture, flag `--expect-fail-on-known-bad` | `negative-control.json` |
| evidence chain | The outcome record (UNKNOWN), the dispatch receipt (worker matched), and the single effect line are all linked by the same op key / idempotency key | — | `evidence.jsonl` with shared correlation id |

---

## 2. Concurrency test design

Two independent agents dispatched concurrently. Nothing may collide: identity, run,
execution, workspace, artifacts, events. This is the "TenantOS + Orca usable" bar.

### Fixtures
- Two bounded prompts, distinct content: `prompt-A`, `prompt-B` (different digests,
  so cross-delivery is detectable).
- Two authorized headless agents: `test-headless-agent-A`, `test-headless-agent-B`
  (ASSUMED: lane A/B provides an agent registry with authorized identities; only
  identities 1-4 class are usable — here synthetic test identities, not Copilot).
- One shared harness clock and one shared journal file (the contention surface);
  separate workspace roots: `<ws>/A/`, `<ws>/B/` (ASSUMED: lane B/C provides
  per-run workspace isolation; the Orca A5 worktree create/archive pattern —
  `internal/worktree` — is the reference implementation to harvest, per the
  archaeology doc).

### Dispatch
Both missions dispatch concurrently (overlapping execution windows; the harness
asserts overlap by checking execution start/end timestamps intersect, else the
"concurrency" claim is vacuous — a sequential run must FAIL the concurrency case).

### Assertions (each produces a row in `concurrency-verdict.json`)

1. **Identity non-collision.** `mission_A.agent_id != mission_B.agent_id`; both resolve
   in the agent registry; neither run's execution record names the other's agent.
   Compared IDs: `agent_id`, `mission_id`, `run_id`, `attempt_id`, `idempotency_key`.
2. **Run/execution non-collision.** All five ID families pairwise distinct across A and B.
   `run_id` uniqueness is structural (UUIDv7-style monotonic IDs per the Orca A1
   attempt-row pattern); the harness asserts no equality, not just "looks random".
3. **Workspace isolation.** Agent A's artifact lands under `<ws>/A/` only; agent B's
   under `<ws>/B/` only. Assertion: `find <ws>/A -newer <start>` contains no file
   whose content digest matches B's artifact and vice versa; neither run can list
   the other's workspace root (permission or namespace boundary, per lane B/C).
4. **Artifact non-collision.** `sha256(artifact_A) != sha256(artifact_B)` is too weak
   (prompts differ, so it proves little). Strong assertion: each artifact's evidence
   link resolves to its own `execution_id`, and the evidence graph has no edge
   crossing A↔B (bipartite check over `evidence-link.json` rows).
5. **Event non-collision.** All events for A carry `correlation_id_A`; all for B carry
   `correlation_id_B`; no event carries both; the projector's per-mission rows are
   disjoint event sets. Assertion: `events_A ∩ events_B = ∅` on `event_id`.
6. **Prompt-delivery integrity.** Agent A echoes `digest(prompt-A)`; agent B echoes
   `digest(prompt-B)`. Cross-delivery (A receiving B's prompt) fails the case.
7. **Outcome independence.** Force A into UNKNOWN (ambiguous handler) while B runs the
   happy path to SUCCEEDED. Assert B's outcome is unaffected by A's HOLD/retry
   machinery (no shared mutable scheduler state leaks: B's `effect-count == 1`,
   B's outcome == SUCCEEDED, A's outcome == UNKNOWN).
8. **Projection independence.** `project.py` over the shared journal yields two mission
   rows with correct per-mission statuses; replay is byte-identical; refresh of the
   MC read path shows both rows unchanged.

### Evidence artifacts
`concurrency/dispatch-timeline.json` (start/end per execution, overlap proof),
`concurrency/id-table.json` (all compared IDs), `concurrency/evidence-graph.json`
(bipartite check), `concurrency/effect-counts.json`, `concurrency/projection.json`,
`concurrency/verdict.json`.

### Adversarial variants (run after the base case passes)
- V1: same prompt content to both agents (digest equality must NOT cause ID or
  workspace collision — IDs must still differ).
- V2: both agents select the same underlying worker implementation with different
  agent identities (identity is per-dispatch, not per-worker-code).
- V3: kill agent A's worker mid-execution (timeout → UNKNOWN); B must complete
  unaffected.

---

## 3. Refresh / replay assertions

These are first-class cases, not afterthoughts: Mission Control is a projection over
proven backend state, so "refresh preserves state" and "replay reconstructs state"
are correctness properties of the integration, not UI polish.

### 3A. Refresh preserves state
Definition: after the read path's caches are cleared and its process restarted, every
consumer-visible value is identical because it is re-derived from durable state.

Procedure per scenario case:
1. Run the case to completion; capture `ui-state.json` (the `/api/mc/agents` response
   or the ASSUMED MC read seam) and `projection.json`.
2. Clear caches, restart the MC read path (`/home/nolan/start-3100.sh` protocol per
   `~/workspace/AGENTS.md` — ASSUMED the harness runs where :3100 is reachable; if not,
   the read seam is the projector output directly and this step is recorded N/A with reason).
3. Re-read; capture `ui-state-after-refresh.json`.
4. Assert: `sha256(ui-state.json) == sha256(ui-state-after-refresh.json)` OR a
   field-wise diff showing only `as_of`/timestamp fields changed (timestamps are
   allowed to move; statuses, evidence digests, and IDs must not).

What is re-read from the projection vs the event plane (must be explicit in the
harness config, `refresh-sources.json`):
- From the projection: Current State, Last Evidence digest, Reconciliation State,
  Retry Eligibility, lane display_status, liveness.
- From the event plane (never cached): the event rows backing Last Evidence
  (drill-down must reach source events, per "truth has layers").
- Forbidden: any status or evidence value that exists only in process memory
  (the WR lane's in-memory HOLD is the known instance — the harness asserts a HOLD
  survives the restart or is explicitly recorded as lost with a STALE/UNKNOWN render).

### 3B. Replay reconstructs state
Definition: `project.py --journal <bytes> --as-of <T> --out` is a pure function of
(journal bytes, as-of). Deleting all derived state and re-running yields
byte-identical output.

Procedure per scenario case:
1. Capture `projection-1.json` = projector output over the case's `events.jsonl`.
2. Delete the projection; re-run the projector over the same journal bytes with the
   same `--as-of`; capture `projection-2.json`.
3. Assert `sha256(projection-1.json) == sha256(projection-2.json)` (byte-identical,
   not just semantically equal — the projector already sorts keys and orders events
   by (timestamp, event_id), so this must hold).
4. Negative control: append one synthetic event to a COPY of the journal and assert
   the projection changes (proves the replay is actually sensitive to the journal,
   not returning a cached document).

Determinism preconditions the harness verifies once (not per case):
- `--as-of` is required; the projector never reads the wall clock (already true in
  `project.py` — the harness asserts it by running with a fixed `--as-of` twice).
- Event ordering is (timestamp, event_id); the harness includes a case with two
  events sharing a timestamp to prove the tiebreak is exercised.
- `emit.py`'s content-derived `event_id` + duplicate-refusal gives replay its
  idempotency: re-emitting the same events is a no-op, asserted in the harness setup.

### Evidence artifacts
Per case: `refresh-parity.json`, `replay-parity.json`, `refresh-sources.json`.
Harness-level: `determinism-preconditions.json`.

---

## 4. Interface reality (VERIFIED / CORRECTED / PARTIAL / ABSENT as of 2026-09-26)

Design-time assumptions are retired. Each item names the real interface the
harness programs against. CORRECTED means the design's invented name was wrong
and the harness uses the real one. PARTIAL means the interface exists but a
stated sub-property was not established. ABSENT means the design expected
something that does not exist; the harness degrades honestly instead of
inventing it.

### A. Dispatch / mission / run / execution (lane A: WorkerRuntime repair + scheduler)
- A1. VERIFIED: `WorkerRuntime.dispatch(event)` exists and returns the handler's
  raw return. The harness captures the scheduler's real dispatch receipt by
  wrapping `dispatch` (no second worker invocation).
- A2. CORRECTED/VERIFIED: the dispatch receipt is
  `{matched, worker, routeExists, result}`, not the design's invented
  `return_class` envelope. 1B/1C discrimination reads `matched` from this
  receipt: 1B has `matched === true` with terminal UNKNOWN/HOLD; 1C has
  `matched === false` with terminal NO_MATCH. Both terminal events carry the
  receipt in `event_data.evidence.dispatch_receipt`, so an event-plane-only
  consumer can distinguish them from the two records alone.
- A3. VERIFIED: the outcome classifier is a scheduler branch, not a standalone
  classifier function. Mapping: matched plus positive completion evidence ->
  SUCCEEDED; explicit no-match -> NO_MATCH; matched plus ambiguous/undefined ->
  UNKNOWN (no auto-retry of an external effect); error before proven effect ->
  FAILED.
- A4. VERIFIED: mission/run/execution records are Lane D journal projections
  over the existing event plane, not separate durable rows. The harness reads
  them from the journal and the `/api/mc/missions` projection.
- A5. ABSENT: no effect ledger exists. The duplicate-effect case therefore runs
  two halves: the known-bad repro `repro-effect-then-undefined.js` (confirms the
  duplicate on unfixed code) and `regression-failclosed.js` (45/45 PASS, exactly
  one physical effect). "Detects the duplicate" on bad code, "exactly once" on
  fixed code. No ledger is claimed.
- A6. VERIFIED with caveat: retry of an UNKNOWN outcome requires
  operation-bound evidence of non-execution (probe) or a proven idempotency
  contract; the harness asserts `retry_authorized` and its evidence.
  Restart/Reaper behavior is record-only pending Nolan's Reaper-vs-HOLD
  decision.
- A7. VERIFIED in code and regression; durable `parkHold` is ABSENT. Timeout ->
  HOLD is locked in by the harness. The live Lane D timeout branch is
  code-present but was not live-fired during the harness run (recorded, not
  claimed).

### B. Headless agent selection and execution (lane B: agent identity/registry)
- B1. CORRECTED: there is no new registry. Agent truth is the existing
  `AGENT_PROFILES` in the Lane C adapter; the harness dispatches through the
  real Mission Control dispatch route, which reads the profiles from the
  adapter via the lane-d shim.
- B2. VERIFIED: `ollama` and `identity_1..4` are accepted; `identity_5..10` are
  denied at all three layers. The `identity-denials` case proves it live: the
  dispatch catalog offers exactly `ollama, identity_1..4` (5-10 absent);
  POSTing as `identity_5..10` returns 403 `agent_denied` with no mission minted
  and no journal events (zero effects); the broker denies `identity_6..10`
  without invoking the runner (identity_5 denial covered by the Step-0 broker
  suite; zero spend everywhere).
- B3. VERIFIED: prompt/context/artifact/result receipt. The happy-path case
  uses the actual adapter contract: the agent receives the prompt and work
  order input, and the result envelope carries `result_id`, which proves
  verified-envelope identity.
- B4. CORRECTED: the result contract is the Lane C verified-envelope and
  outcome contract (`outcome: completed` plus envelope fields), not the
  design's invented `{status, artifact_uri, artifact_sha256, prompt_digest}`.
  The artifact envelope carries no `verified` boolean; the harness records
  `recorded: false` honestly when no event runtime is supplied.

### C. Workspace isolation (lane C: execution environment)
- C1. VERIFIED: per-mission artifact directories exist under the lane D
  mission layout; the harness reads real mission artifact dirs in the
  refresh-replay case.
- C2. PARTIAL: directory isolation is shown (distinct artifact dirs per
  mission, per-run workspace paths), but a hard permission/namespace denial
  (one run attempting to read another's workspace and being refused) is not
  established. Not claimed.
- C3. VERIFIED: artifact path plus SHA256 digest recorded at publication time.

### D. Events, projection, Mission Control read path (lane D: event plane + MC)
- D1. CORRECTED/PARTIAL: UNKNOWN and FAILED are first-class live
  (`MC_RUN_UNKNOWN`, `MC_RUN_FAILED`, `MC_AGENT_DENIED`). NO_MATCH is ABSENT
  live: Lane D has no first-class NO_MATCH event or status. `MC_RUN_NO_MATCH`
  is a harness-only corrected interface extension used so the 1B/1C
  discrimination is provable end to end; it is documented as a Lane D gap,
  never as live behavior.
- D2. CORRECTED: identity is carried through aggregate and event data, not as
  a uniform top-level correlation ID on every event. The concurrency case keys
  on mission/run/execution/work-order IDs instead.
- D3. CORRECTED: the dispatch mission projection is the Lane D TypeScript
  `projectMissions`; `mission-control/project.py` remains the observability
  projection. The harness's replay assertions run against the journal bytes
  with fixed `as_of` and against the live `/api/mc/missions` read path.
- D4. VERIFIED: the Mission read seam is `/api/mc/missions` (not
  `/api/mc/agents`). Truth display rules hold: timeouts never render as
  FAILED; UNKNOWN renders as reconciliation-in-progress, never FAILED or
  NO_MATCH.
- D5. VERIFIED/PARTIAL: artifact path/digest and mission/run/execution/
  work-order links are all present and asserted. There is no separate
  `evidence_linked` event type; the linkage rides in the lifecycle event data.

### E. Harness's own fixtures (owned by lane F, no lane dependency)
- E1. IMPLEMENTED: synthetic test agents (happy-path, undefined-returning,
  throwing, sleeping) in `cases/` plus `lib/stubs.js` and `lib/fixtures.js`.
- E2. IMPLEMENTED: counter-file effect stand-in (same technique as
  `evidence-provider-effects.jsonl`) for the duplicate-effect regression.
- E3. IMPLEMENTED: evidence-bundle writer
  (`<case>/<mission_id>/{evidence.jsonl,projection.json,verdict.json}` plus
  per-case artifacts) in `lib/evidence.js`, driven by `run.js`.
- E4. IMPLEMENTED: refresh/replay parity checkers (`lib/parity.js`) and the
  known-bad negative control (`repro-effect-then-undefined.js`).

Work-order ID minting (verified against the real adapter): Mission Control
uniquely mints op/work-order keys. Task ID is
`${executionId}:attempt-${attempt}`; the work-order ID is
`sha256('workorder:' + taskId)[0:16]`. The harness mirrors this exactly.
---

## 5. Open questions for the coordinator

1. **Adapter seam shape.** The Orca archaeology REJECTED the Orca A6 adapter port
   (`Launch`/`Handle{PID,SessionID}`/`Result`) as unproven and the wrong shape for
   CRX — canonical workers with disposable attempts, not pluggable worker types.
   Does lane B agree? The harness currently assumes a registry of authorized
   headless agents (B1) without prescribing the port. If lanes choose a different
   seam (e.g. WorkerRuntime-registered canonical workers with attempt rows), which
   names change in section 4?
2. **Where does the repaired dispatch live?** The WR lane doc is read-only against
   live Pig code (`mission_scheduler.js`, `worker_runtime.js`). Will lane A patch
   the live scheduler in place, ship a repaired variant alongside it, or build the
   fail-closed semantics in a new module? The harness's negative control (1F) needs
   to run against both known-bad and repaired code.
3. **Event type authority.** Do the new lifecycle event types (D1) go through the
   existing PING journal envelope (`MC_*` precedent in `emit.py`) or a separate
   mission stream? "No new store" is standing law; is "no new stream" also law?
4. **Reaper-vs-HOLD.** Still open pending Nolan. Until answered, what should the
   harness assert for the restart-gated path in 1E — record-only, or fail if a
   redispatch is observed?
5. **MC surface for missions.** Extend `/api/mc/agents` or add `/api/mc/missions`
   (D4)? And does the :3100 read path stay the harness's UI-state source, or
   should the harness read the projector output directly (simpler, fewer moving parts)?
6. **Idempotency key minting.** Who mints the op key / idempotency key — Mission
   Control at dispatch, or the scheduler at mission creation? The duplicate-effect
   invariant needs exactly one minter.
7. **Timeout values.** What are the harness's dispatch-timeout and observation
   windows (1E sleeps 3x timeout — what is x in the test environment)?
8. **UNKNOWN vocabulary in the projector.** `project.py` today knows lane statuses
   (UNKNOWN/HOLD/GREEN/...). Do mission outcomes reuse that vocabulary, or does
   lane D define a separate outcome enum? The 1B assertions need the exact strings.
9. **Concurrency overlap enforcement.** Is wall-clock overlap of the two executions
   sufficient to claim "concurrent," or should the harness force a rendezvous
   (both agents blocked on a barrier) to guarantee interleaving?
10. **Scope of "headless agent."** For this harness, is the headless agent a real
    agent runtime (Pig-side worker process) or a test double behind the worker
    `handle()` interface? The Nolan directive says "Agent actually receives
    prompt/context" — the harness proves receipt via digest echo either way, but
    the fixture differs.

---

## Appendix: case inventory (harness run order)

1. `happy-path` (1A) — must pass before any other case is meaningful.
2. `unknown-ambiguous` (1B) — the primary lie; expected FAIL on pre-fix code.
3. `no-match` (1C) — discrimination proof vs 1B.
4. `failed-before-effect` (1D) — honest FAILED.
5. `timeout-unknown` (1E) — HOLD, no FAILED-on-timeout, restart behavior recorded.
6. `duplicate-effect-regression` (1F) — folds in `repro-effect-then-undefined.js`;
   exactly-once invariant; negative control on known-bad code.
7. `concurrency-AB` (2) — base two-agent case + adversarial variants V1–V3.
   Two worker threads plus a shared atomic barrier prove real overlap; V3 is a
   timeout/termination simulation, not an actual OS/process kill (recorded honestly).
8. `identity-denials` — Nolan's standing authorization: identities 1–4 only.
   Live catalog offers exactly `ollama, identity_1..4`; POST as `identity_5..10`
   returns 403 `agent_denied` with zero effects; broker denies `identity_6..10`
   without invoking the runner (identity_5 covered by the Step-0 suite).
9. `refresh-replay` (3) — runs inside every case above (parity artifacts per case)
   plus the harness-level determinism preconditions. Also compares a real live
   Mission Control mission against the local projector port over SSH.

Harness exit code: 0 iff every case's `verdict.json` is PASS (with the documented
`--expect-fail-on-known-bad` exception for the negative control). Any UNKNOWN →
FAILED or UNKNOWN → NO_MATCH collapse at any hop fails the run.

---


## 6. Implementation record (2026-09-26)

### Harness location and shape
- Root: `~/workspace/sprint-2026-09-24/orca/lane-f-harness/`
- Runner: `run.js` (deterministic case order, unique run IDs with a random hex
  suffix so two runs in the same minute never share an output directory).
- Libraries: `lib/journal.js` (append-only journal), `lib/projector.js`
  (deterministic projector), `lib/evidence.js` (evidence bundles + checks +
  verdicts), `lib/stubs.js` (synthetic agents), `lib/fixtures.js`,
  `lib/parity.js` (refresh/replay), `lib/conc-worker.js` (concurrency worker
  threads).
- Cases: `cases/happy-path.js`, `cases/unknown-ambiguous.js`,
  `cases/no-match.js`, `cases/failed-before-effect.js`,
  `cases/timeout-unknown.js`, `cases/duplicate-effect-regression.js`,
  `cases/concurrency-ab.js`, `cases/identity-denials.js`,
  `cases/refresh-replay.js`.

### Latest verified run
9/9 PASS at 2026-09-26 13:44 UTC.
Evidence root: `lane-f-harness/out/run-2026-09-26T1344-0309/`
(per-case: `<case>/<mission_id>/{evidence.jsonl,projection.json,verdict.json}`).

### Per-case evidence summary
- happy-path: full chain through the real dispatch path using the actual
  adapter contract (`outcome: completed`, `result_id` proving verified-envelope
  identity, `recorded: false` recorded honestly when no event runtime is
  supplied).
- unknown-ambiguous: captures the scheduler's real dispatch receipt by wrapping
  `WorkerRuntime.dispatch`. Terminal event is `MC_RUN_UNKNOWN`; projection
  shows UNKNOWN; no FAILED, no NO_MATCH at any hop.
- no-match: terminal event is `MC_RUN_NO_MATCH` with
  `event_data.evidence.dispatch_receipt.matched === false`, vs 1B's
  `matched === true` with UNKNOWN/HOLD. Discrimination is provable from the
  two event records alone.
- failed-before-effect: effect count captured immediately after attempt 1 is
  zero; one effect after the authorized retry. Honest FAILED, never UNKNOWN.
- timeout-unknown: explicit assertions of no `MC_RUN_FAILED`, no failed
  mission state, and projected UNKNOWN. Live Lane D timeout branch is
  code-present but was not live-fired during this run.
- duplicate-effect-regression: runs both `repro-effect-then-undefined.js`
  (confirms the known-bad duplicate) and `regression-failclosed.js` (45/45
  PASS, exactly one physical effect).
- concurrency-ab: base case plus adversarial variants V1-V3, all with verified
  wall-clock overlap via two worker threads and a shared atomic barrier. V3
  exercises timeout/termination simulation; a true OS/process kill was not
  performed and is not claimed.
- identity-denials: live `:3100` catalog offers exactly
  `ollama, identity_1..4` (identity_5..10 absent). POSTing dispatch as
  `identity_5..10` returns 403 `agent_denied` with no mission minted and no
  journal events. The broker denies `identity_6..10` without invoking the
  runner (identity_5 is covered by the Step-0 broker suite). Zero spend and
  zero effects at every layer.
- refresh-replay: deterministic projection with fixed `as_of` is byte-identical
  across replays; duplicate refusal and content-derived IDs verified; an
  appended-event negative control proves the replay is sensitive to the
  journal. A real live Mission Control mission was compared against the local
  projector port over SSH.

### Corrected interfaces (design inventions replaced by real ones)
- `MC_RUN_NO_MATCH` is a harness-only corrected interface extension. Live Lane
  D has no first-class NO_MATCH event or status; this is documented as a Lane D
  gap, never as live behavior.
- Dispatch receipt is `{matched, worker, routeExists, result}`.
- Agent truth is `AGENT_PROFILES`, not a new registry.
- Result contract is the Lane C verified-envelope and outcome contract.
- Dispatch mission projection is the Lane D TypeScript `projectMissions`;
  `mission-control/project.py` remains the observability projection.
- The Mission read seam is `/api/mc/missions`.
- Identity rides in aggregate/event data, not as a uniform top-level
  correlation ID.
- There is no separate `evidence_linked` event; linkage rides in lifecycle
  event data.

### Unverified / not live-fired (recorded, not claimed)
- Live Lane D timeout branch: code-present, not live-fired during the run.
- Reaper-vs-HOLD: record-only pending Nolan's decision.
- Concurrency V3 true OS/process kill: not performed; V3 is
  timeout/termination simulation.
- C2 hard permission/namespace denial: directory isolation shown, hard denial
  not established.

### Known residual gaps (not harness failures)
- Post-effect throw rendering as FAILED remains a documented Lane A residual
  gap.
- A5: no effect ledger exists; the harness degrades honestly (detects the
  duplicate on bad code, proves exactly-once on fixed code).
- D1: NO_MATCH is absent live (see corrected interfaces above).
- A7: durable `parkHold` is absent.

### Architectural invariant status
UNKNOWN is preserved end to end in every case. No layer collapses UNKNOWN into
FAILED or NO_MATCH. The harness fails the run if any hop performs that
collapse; the 9/9 run performed none.

### Step 0 (tenant threading, prerequisite, 2026-09-26)
- Lane C commit `d5d56bc`: `event.tenant_id` threaded through the adapter into
  evidence (Lane B handoff).
- Lane F broker patch (commit `11198c7` on `lane-f/harness-2026-09-26`):
  `event.tenant_id` threaded through `broker.dispatch(task)` into evidence.
  Broker focused suite 13/13 PASS; full suite 62/62 PASS.
