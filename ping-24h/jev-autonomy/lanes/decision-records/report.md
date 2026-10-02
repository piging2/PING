# LANE 8 REPORT: Decision Records + Task Loop + FYD Ingestion Classification

**Lane:** 8 (DECISION RECORDS + TASK LOOP + FYD INGESTION).
**Session date:** 2026-09-28. **Mode:** read-only harvest + design. No production wiring, no canonical-tree writes, no Phase 1 approval-door contact.
**Transport note:** Pig WSL SSH down (commute). All evidence below is local-history first: lane reports, the convergence matrix, the jev namespace candidate report, the Typesafe jev-decisions log, the mission-control repo, and the file journal. Canonical-tree paths are cited from lane reports, not re-verified live.

**One-line verdicts:**
- Existing PING event primitives **CAN** carry Jev decision records. **YES.** No new record type, store, bus, or authority is needed; what is honestly needed is additive vocabulary (a `JEV_DECISION_EVALUATED` event_data schema), exactly the way `MC_*` events already extended the file journal.
- 3 sharpest D1 candidates: (1) FYD entity-kind classification, (2) evidence-relevance ranking per object field, (3) canonical-schema-candidate selection.
- Single riskiest task-loop boundary: **SYSTEM 1 triage -> loop continuation** (the autonomy seam where "easy continuation" can silently become plan authorship).

---

## PART 1. DECISION RECORDS

### 1.1 What already exists (do not rebuild)

| Required field (task) | Existing PING primitive | Where |
|---|---|---|
| decision type / domain | `DecisionRequest.domain` + `CLAIM_DECISIONS` typed vocabulary; `decision_type` in the Typesafe log | `ping-runtime/jev/typed_decision.js`; `~/workspace/fyd-intel/jev-decisions.jsonl` |
| candidate choices | PARTIAL: Typesafe log carries `probabilities` over choices but no explicit candidate set; `TypedDecision` vocabulary is global, not per-request | log has the data shape; needs an explicit `candidates` array |
| selected choice | `TypedDecision.decision`; log `answer.choice` | same as above |
| confidence / probability | `TypedDecision.probability` in [0,1], **null allowed and explicitly abstention-safe**; log `answer.confidence` + per-choice `probabilities` | same as above |
| model / version | `requested_model`, `response_model`, `provider`, `logical_profile` (e.g. `TYPESAFE_JEV`, `typesafe/jev-1.13-20260917`) | jev-decisions.jsonl |
| input digest | `state_sha256` (log); `inputs_hash` + `inputs_digest` discipline (Batch 6: audit metadata vs erasable payload, digests not raw) | log; `mission-control/mission_intent.py` |
| timestamp | `ts`; journal envelope `timestamp` | log; journal |
| escalated? | **MISSING** (nothing in either record) | add |
| event / result reference | PARTIAL: `question_id`, `request_id`, `subjectRef`, `evidenceRefs`, `correlationId`, `causationId` exist; no binding to the downstream event the recommendation produced | add explicit `result_ref` |
| event envelope | `{event_id, timestamp, event_type, aggregate_id, aggregate_type, event_data}`, append-only, content-derived IDs, duplicate-refusal | `~/workspace/fyd-journal-gateway/events.jsonl`; `mission-control/emit.py` (MC_* additive precedent) |
| registered decision event | `JEV_DECISION_EVALUATED`: 1 of 235 registry events, `event_class: inference`, `authority_owner: JevShadowWorker`, namespace `jev` -> PING | gateway `generated/event_registry.json`; `~/workspace/ping-decision-fabric/jev-namespace-candidate-report-2026-09-28.md` |
| zero-authority execution policy | `MayExecutePolicy.mayExecute()` hardcodes `{allowed:false, mode:'shadow', reason:'JEV_SHADOW_ONLY'}` | `ping-runtime/jev/typed_decision.js` |
| fail-closed decision precedent | `RuleClaimDecisionProvider`: missing/unknown input -> `NEEDS_MORE_EVIDENCE`, never arbitrary action | same file; test at `~/workspace/jev-stage/test_jev_shadow.js` |
| evidence discipline | digests only, never raw prompts (`prompt_digest`/`output_digest`); artifact `sha256` + present flags; claim-badge law UI CLAIM <= BACKEND PROOF | lane A report; `src/fyd/social/transition-id.ts` |
| typed mission events | `MC_LANE_STARTED/FAILED/UNKNOWN/HOLD_RAISED/ESCALATION/...` vocabulary, journal idempotency ledger | `mission-control/emit.py`, `mission_intent.py` |

Two live-state caveats, recorded honestly:
- The gateway-side `jev` namespace ownership fix is **built but not deployed**; the live gateway still rejects `JEV_DECISION_EVALUATED` with `NAMESPACE_VIOLATION`, and three scheduler missions hammer it on a fixed ~5s cadence (~1,080 failures/30 min, open retry defect). Therefore the **file journal** (`fyd-journal-gateway/events.jsonl`), not the gateway, is the viable immediate write path for decision records, using `emit.py`'s additive-vocabulary pattern. The gateway route stays the long-term production path after the namespace fix deploys and the retry defect is fixed.
- The file journal today holds only `FYD_SITE_OVERLAY` events (7). `MC_*` events ride the same envelope via `emit.py`; the pattern is proven in code even where the file is currently quiet.

### 1.2 Verdict: ride the envelope, add vocabulary, do not invent a record type

**YES, the existing event envelope carries decision records.** The envelope already carries arbitrary typed evidence (`event_data` is the extension point; `MC_*` is the precedent). A Jev decision record is an inference-class evidence event explaining why a scheduler/controller chose a path. It needs:

1. No new store (journal stays the one append-only record).
2. No new authority (Jev is a provider; PING stays the authority; `MayExecutePolicy` shadow-only holds).
3. No new identity scheme (content-derived event IDs + IdentityAuthority; per the per-stream ownership declaration rule).
4. **New additive vocabulary**: a pinned `JEV_DECISION_EVALUATED` `event_data` schema (section 1.3) plus a per-domain decision vocabulary, registered the way `MC_EVENT_TYPES` was extended additively. This is new *vocabulary*, not a new *record type*: the same envelope, the same journal, the same duplicate-refusal discipline.

### 1.3 Proposed `JEV_DECISION_EVALUATED` event_data schema

Envelope (unchanged): `{event_id, timestamp, event_type: "JEV_DECISION_EVALUATED", aggregate_id, aggregate_type: "jev_decision", event_data}`.

`aggregate_id`: `jev-decision:<decision_unit>/<correlation_id>` (e.g. `jev-decision:task-prioritize/mc-mission-9f31`). The `<decision_unit>` names the System-1 integration (task-prioritize, task-triage, ingestion-classify, ...). The consuming authority's own decision (dispatch, route) is a separate event that may cite this record; the record never authorizes.

`event_id`: content-derived, `jev-dec-<12 hex of sha256(decision_unit|correlation_id|selection|input_digest|ts)>` (idempotent re-emission; matches the `mc-pass-` pattern in `emit.py`).

`event_data` (all fields required unless marked optional):

```json
{
  "record_version": "jev.decision-record@1",
  "decision_unit": "task-prioritize",
  "outcome": "DECIDED",
  "selection": "frontend-worker",
  "candidates": ["frontend-worker", "backend-worker", "design-worker"],
  "domain": "worker-routing",
  "confidence": 0.62,
  "probabilities": {"frontend-worker": 0.62, "backend-worker": 0.28, "design-worker": 0.10},
  "calibration_state": "uncalibrated-shadow",
  "threshold": 0.5,
  "model": {"provider": "TypeSafe", "logical_profile": "TYPESAFE_JEV",
             "requested": "typesafe/jev-1.13", "responded": "typesafe/jev-1.13-20260917"},
  "input_digest": "sha256:3a7bd3e2360a3d29eea436fcfb7e44c735d117c42d1c1835420b6b9942dd4f1b",
  "prompt_digest": "sha256:...",
  "evidence_refs": ["evt-upstream-1", "evt-upstream-2"],
  "why": ["UI + React capability match", "FYD capability match"],
  "escalated": false,
  "escalated_to": null,
  "result_ref": null,
  "cost": {"latency_ms": 301, "input_tokens": 316, "output_tokens": 32, "cost_usd": 1.33e-05},
  "shadow": true,
  "mode": "shadow"
}
```

Field notes (why each exists):
- `outcome` is the integration-level contract (section 1.4); `selection` is the domain choice. They are separate because a record can be a legitimate decision (`DECIDED`) or a legitimate non-decision (`ABSTAIN`/`UNKNOWN`/`ESCALATE`), and the consumer must never confuse the two.
- `candidates` is the explicit choice set (the honest gap in the Typesafe log, which only implied it via `probabilities`).
- `calibration_state` binds the claim-badge law to the record itself: confidence is rendered with its calibration status (`uncalibrated-shadow` today; lane 11: calibration NOT established at n=6). Mission Control must never render a bare confidence number as truth.
- `input_digest` / `prompt_digest`, never raw prompts: Batch-6 audit-metadata-vs-erasable-payload. The Typesafe log's `instructions` field carries the raw prompt; the canonical record must not.
- `escalated` / `escalated_to` fill the missing escalation field: `false` + `null`, or `true` + `system2|human|<authority>`.
- `result_ref` is filled when the consuming authority acts on the recommendation (e.g. `mc:MC_DISPATCHED/<work_order_id>`), binding recommendation to effect. A decision record with no `result_ref` is a recommendation that was never consumed; one whose `result_ref` disagrees with `selection` is a supervisor override, itself journaled.
- `shadow: true` / `mode: "shadow"` carries the zero-authority posture into the record so no future consumer mistakes it for authorization.

### 1.4 Outcome vocabulary: DECIDED / ABSTAIN / UNKNOWN / ESCALATE

Every System-1 integration emits exactly one of these as `outcome`. Mapping from existing vocabularies:

| outcome | meaning | consumer behavior | precedent |
|---|---|---|---|
| `DECIDED` | selection chosen from candidates at/above threshold, evidence complete | recommendation usable; consuming authority still runs its own gate | `ACCEPT_CLAIM` |
| `ABSTAIN` | below threshold, conflicting evidence, out-of-vocabulary input; an honest non-decision | deterministic fallback (e.g. FIFO, current heuristic) or System 2; NEVER converted to arbitrary action | `NEEDS_MORE_EVIDENCE`; null-probability abstention-safe contract |
| `UNKNOWN` | provider failure, unparseable output, missing input digest; the decision itself is unobservable | terminal-but-not-success, fail-closed; never treated as a decision | `MC_LANE_UNKNOWN` doctrine: UNKNOWN never collapses to FAILED or COMPLETED |
| `ESCALATE` | high-consequence choice, novelty flag, confidence below the consequential floor | human or System 2; the record names `escalated_to` | `MC_ESCALATION` / `MC_HOLD_RAISED` |

The fail-closed rule from the rule provider generalizes: any input the decision unit cannot type -> `ABSTAIN` (if the fallback is safe) or `UNKNOWN` (if the decision is unobservable) or `ESCALATE` (if the consequence is high). Low confidence never becomes an arbitrary `DECIDED`.

### 1.5 Mission Control rendering

A decision record renders as evidence under the mission/run that consumed it. Example for a routing decision:

```
ROUTED TO:    frontend-worker          (JEV_DECISION_EVALUATED, shadow)
WHY:          UI + React capability match; FYD capability match
CONFIDENCE:   0.62 (uncalibrated, shadow; threshold 0.50)
CANDIDATES:   frontend-worker 0.62 | backend-worker 0.28 | design-worker 0.10
ESCALATION:   none
INPUT:        sha256:3a7bd3e2... (digest only; prompt not stored)
MODEL:        typesafe/jev-1.13-20260917 via TypeSafe (TYPESAFE_JEV)
EFFECT:       consumed by MC_DISPATCHED work_order 9f31a2 (selection followed)
```

Rendering rules (claim-badge law): confidence always carries its calibration state; a shadow record is always badged SHADOW; `result_ref` renders as EFFECT followed/overridden/none; an `ABSTAIN`/`UNKNOWN`/`ESCALATE` renders as the honest non-decision it is, never as a quiet default.

### 1.6 What the schema deliberately does not do

- It does not authorize. The scheduler/controller cites the record and runs its own gate (`authorizeWorkOrder`-class); the record is evidence of the recommendation, replayable and observable.
- It does not execute, erase evidence, merge identities, or weaken deterministic safety requirements (convergence-matrix lock).
- It does not store raw prompts, PII, or secrets (Batch-6 boundary).
- It does not create a second event bus, a second journal, or a Jev authority. The namespace `jev` maps to owner PING; Jev stays a provider.

---

## PART 2. TASK MANAGEMENT LOOP

### 2.1 Target loop

```
MISSION (intent; owner or controller)
  |
  v  [SYSTEM 2] PLAN: System 2 generates the typed task graph. CREATES.
  |
  v  [SYSTEM 0] VALIDATE GRAPH: deterministic. DAG check, schema check,
  |   capability-surface check, receipt-contract check, budget check.
  |   Reject -> back to System 2 (typed graph-reject). Never silently repaired.
  v
  [SYSTEM 1] PRIORITIZE eligible work: Jev ranks / clusters / routes /
  dedupes / classifies dependencies / selects next eligible.
  Emits JEV_DECISION_EVALUATED (DECIDED|ABSTAIN|ESCALATE). SORTS, never creates.
  ABSTAIN -> deterministic fallback (FIFO) or System 2.
  |
  v  [AUTHORITY GATE] worker dispatch: authorizeWorkOrder-style pre-dispatch
  |   gate re-derived at issue. Jev selection has zero authority here.
  v
  WORKER EXECUTES (software + frontier agents; orca-adapter dispatch)
  |
  v  [SYSTEM 0] VALIDATE RECEIPTS: deterministic receipt contract.
  |   artifact sha256 + present; pre/post hashes; output schema.
  |   Executor honesty: failed -> MC_LANE_FAILED; unknown/crash ->
  |   MC_LANE_UNKNOWN (terminal, never success); provable no-effect ->
  |   ExecutorNoEffect. Unverifiable claims stay UNKNOWN, never promoted.
  v
  [SYSTEM 1] TRIAGE result -> JEV_DECISION_EVALUATED:
    - easy continuation (receipt valid, within expected variance,
      graph-eligible task exists) -> continue: select next eligible
    - uncertain / novel (novelty flag, outside expected variance,
      no graph-eligible task) -> System 2 (ESCALATE outcome; re-plan)
    - high consequence (external effect, irreversible, authority
      boundary) -> human (ESCALATE outcome)
  |
  v  [SYSTEM 0] CANONICAL EVIDENCE: decision + outcome events appended
  |   to the journal; artifacts to the evidence store.
  v
  REPEAT until graph terminal: all tasks terminal | budget exhausted
  (named exhaustion state) | HOLD | human decision.
```

SYSTEM 2 CREATES. SYSTEM 1 SORTS. SOFTWARE EXECUTES. The authority gates stay where PING already put them; Jev recommendations ride alongside as evidence, never as verdicts.

### 2.2 Typed task graph (minimal shape)

```json
{
  "graph_id": "sha256:<canonical graph bytes>",
  "graph_version": "ping.taskgraph@1",
  "mission_id": "mc-mission-9f31",
  "produced_by": "system2:<model/version>",
  "produced_at": "2026-09-28T...",
  "tasks": [{
    "task_id": "t-01",
    "kind": "<bounded verb from the agent catalog; never free text>",
    "inputs_digest": "sha256:...",
    "capability_required": "core::<name>",
    "depends_on": ["t-00"],
    "evidence_required": ["evt-..."],
    "receipt_contract": {"artifacts": ["sha256+present"], "output_schema": "<schema_name@version>"},
    "consequence_class": "reversible | external-effect | irreversible",
    "budget": {"max_calls": 5, "timeout_s": 600}
  }],
  "exhaustion": {"max_iterations": 50, "on_exhaustion": "HOLD"}
}
```

Minimality rules: edges are implied by `depends_on` (no separate edge list to drift); `inputs_digest` not raw inputs; `kind` is a catalog verb (json-render catalog-as-agent-contract, convergence matrix section 5); `consequence_class` is what lets System 1 triage route to human without judging the domain. The graph is content-addressed; a System-2 re-plan produces a new `graph_id`, never a silent mutation.

### 2.3 Where each System boundary sits

| Stage | System | Owner of the transition | Existing PING gate reused |
|---|---|---|---|
| Mission intake | 0 (validate) -> owner authority for consequential | MissionIntent front door (validate->authorize->dispatch->observe) | `mission-control/mission_intent.py` |
| Plan (graph generation) | **2 only** | System-2 producer; graph is content-addressed | structured job envelopes (Codex harvest) |
| Graph validation | **0 only** | deterministic validator; reject is typed, back to System 2 | schema/registry validation patterns (Lane E Zod-first) |
| Prioritize eligible | 1 (recommend) | Jev; emits decision record | `JEV_DECISION_EVALUATED` (this report) |
| Dispatch authorization | authority (PING) | capability authority; Jev has zero say | `authorizeWorkOrder` 8 fail-closed checks (orca-adapter vendor) |
| Execution | worker | worker identity; bounded by work order constraints | orca-adapter `issueWorkOrder`; per-run budget (Codex lesson 4) |
| Receipt validation | **0 only** | deterministic receipt contract | MC_LANE_* terminal honesty; `ExecutorNoEffect`; reconcile gate |
| Triage | 1 (recommend) -> 2 or human on ESCALATE | Jev; emits decision record | this report, section 1.4 |
| Evidence | **0 only** | journal append, content-derived IDs, duplicate-refusal | `mission-control/emit.py`; file journal |

Hard separations: System 2 never executes; System 1 never authorizes; System 0 never judges; the human owns consequential decisions. A System-1 output that is not a `JEV_DECISION_EVALUATED` with a valid outcome is not a decision; a dispatch without the authority gate is not a dispatch.

### 2.4 System 1's allowed verb set (closed)

**May:** rank eligible tasks, cluster, route, dedupe, classify dependencies, select next eligible, triage-continue, propose-escalation.
**May never:** generate novel subtasks or edges, authorize, execute, erase evidence, merge identities, weaken gates, re-time or re-scope budgets, or promote an unverified receipt.

The closed verb set is the enforcement of "generating novel subtasks is System 2 work": if triage finds no graph-eligible continuation, that is not a gap for Jev to fill; it is an `ESCALATE` to System 2, which produces a new content-addressed graph.

### 2.5 Triage contract (the System-1 judgment that matters most)

Input: the System-0-validated receipt + the current graph state + the task's `consequence_class`.
Output: one `JEV_DECISION_EVALUATED` with:

- `DECIDED` + `selection: <next eligible task_id>` when: receipt valid, result within expected variance, `consequence_class: reversible`, graph has an eligible task. This is "easy continuation".
- `ESCALATE` + `escalated_to: system2` when: novelty flag, result outside expected variance, no graph-eligible task, or receipt valid but the result suggests the plan is wrong. System 2 re-plans; the old graph is superseded, not edited.
- `ESCALATE` + `escalated_to: human` when: `consequence_class` is `external-effect` or `irreversible`, or the task touches an authority boundary (identity, money, canonical truth). No confidence threshold overrides this; consequence class is declared at plan time by System 2, not judged at triage time by System 1.
- `ABSTAIN` when: the receipt is valid but the triage input is ambiguous and the fallback is safe (deterministic FIFO continuation).
- `UNKNOWN` when: the result itself is unobservable (receipt failed validation in a way that leaves effect unknown). Maps to `MC_LANE_UNKNOWN`: terminal, never success, never a quiet continue.

Every triage emits its record before the loop continues. A loop iteration without a triage record is a broken loop.

### 2.6 The single riskiest boundary: SYSTEM 1 triage -> loop continuation

**Why this one.** Three reasons it outranks the other seams:

1. **It is the autonomy seam.** "Easy continuation" is a judgment call, and each continuation compounds. Without the graph-membership invariant, System 1 can silently extend into plan authorship: choosing a plausible next step that was never in the System-2 graph. That is exactly the line the task draws ("generating novel subtasks is System 2 work"), and unlike execution, there is no existing PING gate between Jev's triage output and the next dispatch cycle the way `authorizeWorkOrder` sits between intent and execution.
2. **It inherits receipt honesty.** Triage quality is bounded above by receipt validation. A fabricated-but-plausible worker result that passes weak receipts becomes the evidence base for the next ten decisions. (Lane 11 O5: worker self-reports never promote effect state; lane 2 T2 gap: no redeem-time re-decide at the issue->invoke boundary. This boundary is where those weaknesses would compound.)
3. **Drift is silent.** A biased ranker misfires once and visibly; a biased triager misfires a little every iteration and the mission still "completes". Only the decision-record trail makes it auditable.

**Mitigations (all enforced, not advised):**
- Graph-membership invariant: continuation may select only from graph-eligible tasks. Anything else is `ESCALATE` to System 2, which emits a new content-addressed graph. Enforced by the System-0 graph validator on every iteration, not by Jev's good behavior.
- Consequence-class routing is declared at plan time: `external-effect`/`irreversible` results route to human regardless of triage confidence. System 1 does not judge consequence.
- Per-run budget with a named exhaustion state (Codex lesson 4): the loop cannot run forever on "easy continuations". Exhaustion is `HOLD`, not failure, not retry.
- Every triage emits `JEV_DECISION_EVALUATED` before continuation; drift is then a query over the journal, not a suspicion.
- System 1 never promotes a result past receipt validation: `UNKNOWN` stays terminal. (The `MC_LANE_UNKNOWN` doctrine, applied to the loop.)
- Typed interrupt/steer (Codex lesson 3): the owner can halt or redirect the loop mid-flight; interrupts are typed state transitions, journaled like everything else.

---

## PART 3. FYD INGESTION CLASSIFICATION (PHASE 2)

**Scope note:** per the task, this is phase 2, after the top-3 experiments complete. Nothing here touches canonical entity resolution or the identity authority until measured. Jev stays shadow; nothing writes to canonical objects.

### 3.1 Current pipeline (from Lane F, read-only)

`URL -> fetch -> extract facts -> evidence -> objects -> ObjectGraph -> SiteSpec -> renderer -> Ask FYD -> owner correction -> regeneration.`

Verified pieces: `ObjectGraph` via `src/fyd/data/fyd-tenant-graph.ts` (PingObjectReader seam; fixture base + journal overlays; digest verification at both layers; no raw journal envelopes); SiteSpec planner consumes only verified graphs with `presentationConfidence <= factConfidence` enforced; owner overlays (`owner.confirmed-fact/corrected-fact/hid-fact` journal events) replay over freshly extracted facts; Ask FYD is evidence-bound with a 5-class response contract and honest abstention. The extraction layer itself lives in the canonical tree (not re-verified here; the design below assumes "freshly extracted facts" as its input).

### 3.2 D0 / D1 / D2 layering

**D0: deterministic structured extraction (System 0).** schema.org / JSON-LD / microdata / meta-tag parsing, deterministic DOM parsers (hours tables, contact blocks, service lists), fetch metadata (status, redirects, content hash). Output: typed fact candidates with provenance (source URL, content hash, extraction-rule id). **Hard rule: where JSON-LD already provides truth, Jev is not used.** A JSON-LD `LocalBusiness` node IS the extraction; Jev never re-derives it, never "improves" it, never second-guesses a deterministic parse. D0 is the floor Jev stands on, not a decision surface.

**D1: System-1 classification (Jev, shadow, bounded enums).** Judgments over D0 facts only, never over raw HTML, never over canonical objects:
1. **Entity-kind classification:** given an extracted block, which kind does it bind to (BUSINESS / SERVICE / POST / HOURS / CONTACT / REVIEW / ...)? Closed enum; the current alternative is heuristics plus System-2 calls.
2. **Evidence-relevance ranking:** for object field F, rank the candidate evidence snippets by relevance. This mirrors the already-authorized first experiment (Ask FYD evidence reranking, shadow mode): same measurement pattern, same fail-closed posture, applied at ingestion instead of answer time.
3. **Schema-candidate selection:** given an extracted entity, which canonical schema (`schema_name@schema_version`) does it bind to? Proposal only; the schema registry authority decides (convergence matrix item 8: FYD schema registry reconciliation).

Each D1 judgment emits a `JEV_DECISION_EVALUATED` with the Part-1 outcome vocabulary. Low-confidence classification -> `ABSTAIN` (keep the current heuristic/System-2 path); ambiguous identity -> `ESCALATE` (never merge).

**D2: System-2 ambiguous entity resolution and semantic synthesis.** Two businesses, same name, conflicting hours; contradictory sources that must become one object with the conflict surfaced (the Ask contract's `CONFLICTED`/`answerState` model applies at ingestion too); novel schema needs. D2 output is a proposal into the owner-approval door (Phase 1 machinery), never a silent merge.

**Comparison Jev vs current (heuristic / System-2):** the metric is the program metric: SYSTEM-2 CALLS AVOIDED WITHOUT REDUCING SUCCESS OR SAFETY. Measure per D1 candidate: agreement with the final-label source (deterministic rules where they exist; expert/owner review where they don't), Brier with reliability decomposition, abstention rate and honesty, latency p50/p95, cost per call (the Typesafe log already captures this; lane 11 U-01 notes Jev cost is currently UNKNOWN in the gateway path), stability (same input 10x), and evidence sensitivity (perturb one evidence element; a good judgment moves when evidence moves and holds when only noise changes). Promotion from shadow is an owner decision per contract, never on tournament numbers alone (lane 11 promotion discipline).

**No-touch rules (standing):** canonical entity resolution is not touched until measured; identity merge stays with PING IdentityAuthority (Jev never merges identities, per the matrix lock); no D1 output writes to canonical objects; owner overlays (`confirmed/corrected/hid-fact`) remain the only path by which extracted facts change.

### 3.3 The 3 sharpest D1 candidates (ranked)

1. **Entity-kind classification** (ingestion). Why sharpest: highest volume, tightest enum, clearest final-label source (the deterministic parsers that already handle the clean cases; owner review for the rest). A Jev win here removes a System-2 call from every ingested block.
2. **Evidence-relevance ranking per object field** (ingestion + Ask). Why second: the measurement pattern already exists (Ask FYD evidence reranking shadow experiment); applying it at ingestion reuses the harness and the calibration discipline instead of inventing new ones.
3. **Schema-candidate selection** (ingestion -> registry). Why third: it sits exactly on the seam the convergence matrix already scheduled (item 8, FYD schema registry reconciliation), so a measured Jev proposer lands on an owned authority instead of creating a new one. Proposal-only by construction.

---

## PART 4. EXISTING PING CODE TO REUSE

| Need | Existing code | Path |
|---|---|---|
| Decision record contract (request/decision/probability/abstention-safe) | `typed_decision.js`: `DecisionRequest`, `TypedDecision`, `RuleClaimDecisionProvider`, `MayExecutePolicy`, `JEV_DECISION_EVALUATED` | `ping-runtime/jev/typed_decision.js` (canonical tree; pig-side) |
| Decision record tests + shadow worker wiring | `test_jev_shadow.js`; `shadow_worker.js` | `~/workspace/jev-stage/` (mirror); `ping-runtime/jev/` (canonical) |
| Rich decision log shape (model/version/tokens/cost/latency/state digest) | `jev-decisions.jsonl` (9 records; note raw `instructions` must become `prompt_digest` in the canonical record) | `~/workspace/fyd-intel/jev-decisions.jsonl` |
| Event envelope + additive vocabulary + idempotent emission | `emit.py` (`MC_EVENT_TYPES`, content-derived IDs, duplicate-refusal) | `~/workspace/mission-control/emit.py` |
| Journal (write path for decision records) | `fyd-journal-gateway` (`server.mjs`, `events.jsonl`) | `~/workspace/fyd-journal-gateway/` |
| Mission lifecycle + idempotency ledger + terminal honesty | `mission_intent.py` (validate->authorize->dispatch->observe; `MC_LANE_UNKNOWN`; revocation) | `~/workspace/mission-control/` |
| Dispatch authority gate (8 fail-closed checks) | `external_agent_adapter.js` (`authorizeWorkOrder`/`issueWorkOrder`) | orca-adapter vendor (lane A report) |
| Decision surface inventory + tournament/calibration discipline | Lane 11 report + `PING_DECISION_SURFACE.md` (42 surfaces; 10-contract tournament design; promotion discipline) | `~/workspace/ping-24h/lanes/lane11-decision-fabric/` |
| FYD ingestion pipeline (evidence->objects->graph->spec->ask->correction) | Lane F report | `~/workspace/ping-24h/lanes/laneF-fyd/report.md` |
| Jev gateway precedent (registry entry, verdict gate, shadow-only) | jev namespace candidate report (built-not-deployed; live still rejects; retry defect open) | `~/workspace/ping-decision-fabric/jev-namespace-candidate-report-2026-09-28.md` |
| Run mechanics to harvest later (typed transcript, budget/exhaustion, typed interrupts, hash-bound propose/apply) | Codex lessons 1-5 | convergence matrix section 3 |

---

## OPEN QUESTIONS FOR THE PARENT / OWNER

1. The Part-1 schema pins `jev.decision-record@1`. Schema-authoring authority for `JEV_*` event_data (registry + CI BACKWARD gate per Lane E P4) is assumed to follow the MC_* precedent; confirm the owner of that registry write.
2. The gateway write path for `JEV_DECISION_EVALUATED` stays blocked until the namespace fix deploys and the retry hammer is fixed; the file journal is the interim path. Confirm that interim routing.
3. Part 3 is scoped as phase 2 (after the top-3 experiments). Confirm the experiment list and the final-label sources for the three D1 candidates before any shadow runs.

*Lane 8 complete. Read-only throughout; no commits, no canonical-tree writes, no Phase 1 contact.*
