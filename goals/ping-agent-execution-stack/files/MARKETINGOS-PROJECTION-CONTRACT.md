# MarketingOS Projection Contract v1

**Status:** DRAFT SPEC (MarketingOS lane deliverable; reader/falsifier until the existing Mission Control writer hands off or requests implementation)
**Date:** 2026-09-30
**Authority:** Nolan's MarketingOS wiring order, 2026-09-30 ~11:52 MDT (APPROVED as priority/constraint order; writer topology rejected; merge into existing lanes)
**Lane:** MarketingOS projection contract/specification. This lane does NOT implement UI, does NOT touch acquisition code, does NOT create stores or authorities.

## 0. Provenance of this spec

Grounded in the 2026-09-30 PING intelligence-convergence forensics (`~/workspace/forensics/ping-intelligence-convergence-2026-09-30/`, esp. `04-object-equivalence.md`) and the forensics-fix landings:

- Mission labels: `forensics/mission-labels-20260930 @ c01e301ec` (INTELLIGENCE_RESEARCH / EXPERIMENT_RUN / DISTRIBUTION_RUN)
- Verdict vocabularies: `@ ae4b6843f` (CONFIRMED/REFUTED/UNCLEAR, SUPPORTED/FALSIFIED/INCONCLUSIVE, evidence grades, VERIFIED/INFERRED/UNKNOWN tags)
- Approval events: `forensics/approval-events-20260930 @ 217294506` (PROPOSED_ACTION / ACTION_APPROVED / ACTION_REJECTED via `emit()`, registry 235->239; `unified_event_runtime.js` untouched)
- /ingest producer: `forensics/ingest-producer-20260930 @ 5ab16aba` (11 real observations HTTP 201 into `ping_events`; idempotency proven)
- Behaviors: chaining 5/5 PASS, contradiction detection 6/6 PASS (identity stitching + transcript-accuracy designed, not landed)

Existing projection discipline it composes with: `~/workspace/mission-control/project.py::project(events, as_of)` — deterministic projection over canonical events at an as-of time. The MarketingOS projection is a domain-specific projection of the same kind, over the same canonical truth.

## 1. What this contract is

A deterministic function:

```text
projectMarketingOS(objective_text, mission_id | null, canonical_state, as_of) -> MarketingOSProjection
```

- **Canonical state** = `ping_missions` rows, `ping_events` (OBSERVATION_CREATED, CLAIM_CREATED, PROPOSED_ACTION, ACTION_APPROVED, ACTION_REJECTED, MISSION_* transitions), kernel `Artifact`/`Evidence`/`Fact`/`Knowledge` objects, `knowledge_nodes`/`knowledge_edges`, `Assessment` records.
- **Mission Control UI** (owned by the existing MC writer) renders this structure. The UI is comparatively cheap; this structure is the product contract.
- The projection is **read-only**. It never writes, never invents, never completes missing state.

## 2. Law

1. **PROJECT, DON'T INVENT.** Every KNOWN field cites its source event/row. A KNOWN field without a source is a contract violation.
2. **UNKNOWN, DON'T FAKE.** Missing state renders as an explicit epistemic state with a reason, never as null hand-waving and never as fabricated domain content.
3. **No new stores, no new authorities.** Every field below maps to an existing PING primitive and names its semantic owner. The REACHED?/SMALLEST-DELTA table is in section 4.
4. **Stage honesty.** The canonical projector understands PROJECT/PLAN/VERIFY; the driver emits OBJECT_GRAPH/SITE_SPEC. Until a semantic mapping is proven and owned, the projection renders 3/7 with UNKNOWN + `STAGE_VOCABULARY_UNMAPPED`. No translation table to fake green.
5. **HOST != OWNER.** The page may physically render inside any web shell; PING remains the semantic owner of the projected state.

## 3. Epistemic state vocabulary

Every field carries `{ state, reason?, data? }` where state is one of:

| State | Meaning |
|---|---|
| `KNOWN` | Reached state exists in canonical records; `data` carries it with source citations |
| `UNKNOWN` | Cannot be determined from reached state; `reason` (machine-readable code) is REQUIRED |
| `NOT_STARTED` | The upstream stage has not run; `reason` REQUIRED |
| `NOT_APPLICABLE` | The field cannot apply given reached state (e.g. distribution for a failed mission); `reason` REQUIRED |
| `CONFLICTING` | Reached records disagree; `data` carries both sides; `reason` REQUIRED |
| `PENDING` | Upstream ran; result not yet available; `reason` REQUIRED (e.g. window open, awaiting human) |

### Reason code catalog (stable strings; extend only with owner agreement)

- `NO_REACHED_MISSION` — no INTELLIGENCE_RESEARCH mission exists for the objective
- `MISSION_FAILED` — mission row terminal `failed`; `data.error` carried verbatim
- `ACQUISITION_NOT_STARTED` — no acquisition attempt for the mission correlation
- `NO_ARTIFACTS_REACHED` — acquisition ran; zero artifacts retained
- `CLAIMS_NOT_YET_GENERATED` — observations exist; ClaimWorker has not emitted claims
- `CONTRADICTION_ANALYSIS_NOT_RUN` — contradiction behavior not yet executed
- `NO_VERIFIED_DEMAND_OBSERVATIONS` — opportunity cannot be assessed from verified demand
- `ARTIFACT_NOT_APPROVED` — distribution gate: no ACTION_APPROVED for the artifact
- `APPROVAL_NOT_REQUESTED` — no PROPOSED_ACTION exists
- `AWAITING_HUMAN_DECISION` — PROPOSED_ACTION exists; no terminal approval event
- `DISTRIBUTION_NOT_ATTEMPTED` — no DISTRIBUTION_RUN mission
- `OBSERVATION_WINDOW_OPEN` — effect/outcome window still open; do not score
- `SOURCE_TO_SERVED_CHAIN_NOT_CERTIFIED` — deployment state cannot be projected; chain SOURCE -> BUILD -> DEPLOYMENT -> PROCESS -> SERVED BYTES -> SERVED BEHAVIOR not closed
- `STAGE_VOCABULARY_UNMAPPED` — driver stage vocabulary has no proven mapping to projector stages
- `CORRELATION_NOT_ESTABLISHED` — records exist but lack the correlation linkage to this mission
- `LEARNING_NOT_RECORDED` — outcome observed; no learning node written yet

## 4. Field specification

Each row: field | source primitive (existing) | semantic owner | reached condition | state derivation.

| Field | Existing primitive | Owner | Reached when | States |
|---|---|---|---|---|
| `objective` | Operator input (context, not canonical) | Operator | Text supplied | KNOWN (source: operator). Never presented as reached system state |
| `mission` | `ping_missions` row (`mission_id`, `mission_type='INTELLIGENCE_RESEARCH'`, `status`, `payload`, `result`, timestamps, `error`) | MissionRuntime | Row exists | KNOWN (status + payload summary + trace via `getTrace`); NOT_STARTED `NO_REACHED_MISSION`; if `failed`: KNOWN mission + `MISSION_FAILED`, downstream NOT_APPLICABLE where gated |
| `research.sources` | `Artifact` canonical objects (`artifact_type`, `content`, `content_hash`, `size`, `format`, `source_id`) linked by mission `correlation_id`; provenance per acquisition contract (`source_uri`, `retrieved_at`, `content_hash`, `content_type`, `artifact_id`, `worker_identity`, `correlation_id`, `causation_id`, `namespace`) | Acquisition writer -> Artifact identity | >=1 artifact linked | KNOWN {count, artifacts[]}; NOT_STARTED `ACQUISITION_NOT_STARTED`; KNOWN count=0 `NO_ARTIFACTS_REACHED` |
| `research.observations` | `OBSERVATION_CREATED` events in `ping_events` (via `/ingest`, idempotent producer landed) | UnifiedEventRuntime | Events with correlation exist | KNOWN {count, event_ids}; NOT_STARTED `ACQUISITION_NOT_STARTED` |
| `research.claims` | `CLAIM_CREATED` event payloads (ClaimWorker); verdict per landed vocabulary CONFIRMED/REFUTED/UNCLEAR | ClaimWorker / evidence path | Claim events exist | KNOWN [{claim_id, verdict, source}]; PENDING `CLAIMS_NOT_YET_GENERATED` |
| `research.evidence` | Kernel `Evidence` (`evidence_type`, `artifact_id`, `content`, `location`) + `EvidenceAuthority.verify` {verified, reason, checks} + evidence grades (landed vocab) | EvidenceAuthority | Evidence linked to claims | KNOWN per-claim support sets: claim -> support set -> source/evidence -> verdict (the claim drill-down) |
| `research.contradictions` | Contradiction-detection behavior (forensics-fix 6/6 PASS) | Analysis behavior owner | Analysis executed | KNOWN {count, pairs}; NOT_STARTED `CONTRADICTION_ANALYSIS_NOT_RUN` |
| `research.unknowns` | Derived: claims with verdict UNCLEAR / synthesis tag UNKNOWN + unaddressed payload questions | Projection (derived truth, not stored) | Claims exist | KNOWN {items}; NOT_STARTED when claims NOT_STARTED |
| `audience` | `knowledge_nodes` (`node_type='audience_cluster'`, cluster fields in `data` JSONB, `overlaps` edges) | Knowledge graph | Node linked by correlation | KNOWN; NOT_STARTED (audience analysis not run). NEVER fabricated |
| `opportunity` | `knowledge_nodes` (`node_type='opportunity'`) + `Assessment` (confidence/trust/freshness/risk/priority/quality + score breakdown: demand, acceleration, audience_fit, ping_relevance, evidence_quality, freshness, novelty, information_gain) | Assessment / knowledge | Assessment exists | KNOWN {score_vector}; UNKNOWN `NO_VERIFIED_DEMAND_OBSERVATIONS`. Doctrine: Assessment never mutates Knowledge; the score is a recommendation, never an authority |
| `artifact` | `Artifact` canonical object (`artifact_type='content'`); lineage via `source_id`/content hash to thesis, claims, evidence | Content compilation (mission worker) | Artifact exists | KNOWN {artifact_id, content_hash, lineage}; NOT_STARTED |
| `approval` | `PROPOSED_ACTION` / `ACTION_APPROVED` / `ACTION_REJECTED` via `emit()` (landed @ 217294506; bindings: principal, proposal identity, artifact digest, requested capability, intended target, approval time, correlation, causation) | PING authority / event writer | Events exist | KNOWN {decision, principal, proposal_id, artifact_digest, decided_at}; NOT_STARTED `APPROVAL_NOT_REQUESTED`; PENDING `AWAITING_HUMAN_DECISION`. Terminal decisions are immutable history (proposal terminal-first law) |
| `distribution` | `mission_type='DISTRIBUTION_RUN'` in `ping_missions` + result/provider receipts | Existing execution / connectors | Mission exists | Gate: NOT_STARTED `ARTIFACT_NOT_APPROVED` until approval KNOWN-approved; then NOT_STARTED `DISTRIBUTION_NOT_ATTEMPTED`; PENDING while running; KNOWN {receipts} on completion |
| `effect` | Independent effect observations (acquisition path re-entry: real metric observations via /ingest, NOT distributor self-report) | Acquisition path | Window closed and observations exist | PENDING `OBSERVATION_WINDOW_OPEN`; KNOWN {verified_effect, independent_sources} |
| `outcome` | `EXPERIMENT_RUN` result JSONB / DISTRIBUTION_RUN result vs expected | Mission owner | Result recorded | KNOWN {measured, expected, delta}; PENDING `OBSERVATION_WINDOW_OPEN` |
| `learning` | `knowledge_nodes` (`node_type='learning'`, the eight remember-why fields in `data` JSONB, `confidence` + `confidence_provenance`) | Knowledge graph | Node exists | KNOWN; NOT_STARTED `LEARNING_NOT_RECORDED` |
| `next_question` | Derived: unresolved claims / failed assumptions from learning -> mission proposal (EventToMissionBridge; ORCA compounding: OUTCOME -> LEARNING -> UNRESOLVED CLAIM -> MISSION PROPOSAL -> authorization if required -> NEXT MISSION) | ORCA (planner, not truth authority) | Learning exists | KNOWN {proposed_question, causal_link}; NOT_STARTED. ORCA must eventually be able to answer "why is PING researching this right now" from these causal records |
| `deployment` | Runtime manifest (HOLD until actual deployment closes) | Convergence coordinator | Chain certified | UNKNOWN `SOURCE_TO_SERVED_CHAIN_NOT_CERTIFIED` until SOURCE -> BUILD -> DEPLOYMENT -> PROCESS -> SERVED BYTES -> SERVED BEHAVIOR is one known chain |

### Drill-downs (required by the view, served by the projection)

- **Claim drill-down:** claim -> support set -> source/evidence -> verdict. All four links are canonical records; the projection must carry the ids, not just the text.
- **Action drill-down:** proposal -> authorization -> attempt -> result -> effect verification -> outcome. Linked by `correlation_id` / `causation_id` (cf. `mission_runtime.getTrace` -> {mission, correlation_id, events, eventCount}).

## 5. The honest empty state (normative)

When `mission_id` is null, the projection MUST equal this shape exactly. This is a truthful system state, not a placeholder.

```json
{
  "objective": {"state": "KNOWN", "source": "operator", "text": "<operator-supplied>"},
  "mission": {"state": "NOT_STARTED", "reason": "NO_REACHED_MISSION"},
  "research": {
    "sources": {"state": "NOT_STARTED", "reason": "NO_REACHED_MISSION"},
    "observations": {"state": "NOT_STARTED", "reason": "NO_REACHED_MISSION"},
    "claims": {"state": "NOT_STARTED", "reason": "NO_REACHED_MISSION"},
    "evidence": {"state": "NOT_STARTED", "reason": "NO_REACHED_MISSION"},
    "contradictions": {"state": "NOT_STARTED", "reason": "NO_REACHED_MISSION"},
    "unknowns": {"state": "NOT_STARTED", "reason": "NO_REACHED_MISSION"}
  },
  "audience": {"state": "NOT_STARTED", "reason": "NO_REACHED_MISSION"},
  "opportunity": {"state": "UNKNOWN", "reason": "NO_VERIFIED_DEMAND_OBSERVATIONS"},
  "artifact": {"state": "NOT_STARTED", "reason": "NO_REACHED_MISSION"},
  "approval": {"state": "NOT_STARTED", "reason": "APPROVAL_NOT_REQUESTED"},
  "distribution": {"state": "NOT_STARTED", "reason": "ARTIFACT_NOT_APPROVED"},
  "effect": {"state": "NOT_STARTED", "reason": "DISTRIBUTION_NOT_ATTEMPTED"},
  "outcome": {"state": "NOT_STARTED", "reason": "DISTRIBUTION_NOT_ATTEMPTED"},
  "learning": {"state": "NOT_STARTED", "reason": "LEARNING_NOT_RECORDED"},
  "next_question": {"state": "NOT_STARTED", "reason": "LEARNING_NOT_RECORDED"},
  "deployment": {"state": "UNKNOWN", "reason": "SOURCE_TO_SERVED_CHAIN_NOT_CERTIFIED"}
}
```

Human-readable equivalent (what the screen says): "No reached INTELLIGENCE_RESEARCH mission exists for this objective. Research state: NOT STARTED. Evidence: NONE. Claims: NONE. Opportunity assessment: UNKNOWN (no verified demand observations). Artifact: NONE. Approval: NOT REQUESTED. Distribution: NOT ATTEMPTED. Outcome: NOT OBSERVED. Learning: NONE."

Forbidden in the empty state: fake research missions, hardcoded audience clusters, opportunity scores, mock confidence percentages, sample social metrics, demo truth of any kind.

## 6. Determinism rules

1. Pure function of `(objective_text, mission_id, canonical_state, as_of)`. No wall-clock reads; timestamps come only from events.
2. Canonical JSON output: sorted keys, arrays sorted by id, stable reason strings.
3. Same inputs -> byte-identical output. The projection is replayable evidence, not a live query with ambient nondeterminism.
4. `as_of` bounds the event horizon (same discipline as `project(events, as_of)`).

## 7. Falsification criteria

1. **First-real-mission test.** Wiring the first real INTELLIGENCE_RESEARCH mission must light up the view by supplying previously-UNKNOWN state. If it requires rewriting this contract, the contract was wrong.
2. **Source-citation test.** Every KNOWN field resolves to a cited canonical record. A KNOWN field with no source is a contract violation, not a display bug.
3. **Stage-honesty test.** OBJECT_GRAPH/SITE_SPEC appear as UNKNOWN with `STAGE_VOCABULARY_UNMAPPED` until a proven, owned semantic mapping exists. Any screen showing 7/7 green without that mapping fails the test.
4. **Empty-state fidelity.** With `mission_id` null, output must equal section 5 exactly. Any invented field fails the test.
5. **No-synthetic-completeness.** Spot-check: pick any KNOWN claim, follow its drill-down to a source artifact with provenance. A broken link fails the test.

## 8. Forbidden

- Fake missions, metrics, confidence values, audience clusters, demo truth.
- Translation tables that cosmetically resolve semantic disagreement (the 3/7 UNKNOWN is the product working as designed).
- A second Mission Control registry, a sibling MarketingOS dashboard, or a parallel projection implementation.
- New stores, new authorities, new runtimes (no ResearchRuntime, MarketingRuntime, ContentBrain, GrowthAuthority, MarketingOS database).
- UI implementation by this lane. The existing Mission Control writer owns implementation and page registration; this lane is reader/falsifier until explicit handoff.

## 9. Storage lifecycle (acquisition is a new byte producer)

Per the wiring order: FETCH -> bounded working artifact -> hash/provenance -> canonical ingest/reference -> retain per evidence requirements -> discard regenerable temporary representation. Temporary browser state, conversion intermediates, duplicate response representations, screenshots, normalized copies, and debug traces do not earn permanent residency. Logical deletion inside VHDXs does not reclaim C: bytes; acquisition must not become an unbounded corpus. High-volume producers need explicit lifecycle from day one.

## 10. Open questions for the existing Mission Control owner (before UI work)

Return exactly: SERVED URL/PORT, SERVED PROCESS, SOURCE REPO, WORKTREE, SHA, WEB ENTRYPOINT, ROUTER/PAGE REGISTRY, CURRENT REAL-CHAIN PAGE, PROJECTION ENTRYPOINT, BUILD COMMAND, SERVE COMMAND, SERVED BUILD ID. Trace from the served screen backward; do not infer ownership from directory names. Exact payload field paths for the landed approval events (@ 217294506) and verdict vocabulary (@ ae4b6843f) to be confirmed against the landed commits at implementation time.

## 11. Falsification inputs (recorded 2026-09-30; owner decision Q13)

Contract stays v1 PROVISIONAL. No v1.1 amendment until deployment truth is certified, the three flags are resolved, and a materially different real mission projects without semantic lying. One evidence-based revision then, not serial edits.

- **F1. Approval vocabulary.** The contract specifies `PROPOSED_ACTION / ACTION_APPROVED / ACTION_REJECTED`. The MC writer's live-journal readback found `REJECTED` where the contract says `ACTION_REJECTED`, and derived approval from the landed payload shape rather than the contract's binding fields. Owner ruling: the landed journal vocabulary is canonical (`PROPOSED_ACTION / ACTION_APPROVED / ACTION_REJECTED`); `REJECTED` may be a display label while `ACTION_REJECTED` is the semantic event. Sources currently disagree (contract prose, forensics-fix record naming `REJECTED`, MC writer live readback `REJECTED`); the single revision resolves it from evidence.
- **F2. Evidence status.** The contract's evidence field currently projects from landed `claim.evidence` only; kernel Evidence verification fields are absent from the reached records. Owner ruling: render as `CLAIM-SUPPLIED SUPPORT`, never as `VERIFIED EVIDENCE`, until the Evidence verification path actually binds/verifies it. A non-empty UI backed by claim-attached support is honest; promoting it to verified status is not.
- **F3. Approval record shape.** The MC writer projected approval from the landed payload shape. The contract's binding fields assumed a different shape. Consolidated into the single evidence-based revision with F1.
