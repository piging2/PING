# INTELLIGENCE_RESEARCH training example zero: engagement eligibility incident
2026-10-01. Small parallel lane. Read-only w.r.t. all production state.

Binding order: `~/workspace/goals/ping-agent-execution-stack/files/CEO-ORDER-MARKETINGOS-EXECUTION-MODE-2026-10-01.md`
(2026-10-01 ~06:23 MDT, Nolan). This turn executes ONLY the first step of the
EXECUTION ORDER: encode the smallest bounded INTELLIGENCE_RESEARCH mission on
the EXISTING MissionRuntime and run the engagement eligibility incident
(pass 173, 2026-09-30 23:26 MDT) through it as training example zero.

No new database. No ResearchAuthority/ContentAuthority/GrowthAuthority/
SignalAuthority/ExperimentAuthority. No parallel agent runtime. No artifact
built, nothing published, nothing distributed. The FYD proof chain, the Pig
server, engagement dispatch, and all live systems were untouched.

## Method note (honest execution record)

The INTELLIGENCE_RESEARCH label is a bounded convention on the existing
MissionRuntime, not a new authority. Per the 2026-09-30 intelligence-convergence
forensic (PROVEN against `/home/nolan/ping` @ `lane-b/tenant-dispatch-threading` @
`546b62d76`), the label had **zero hits in live code** as of 2026-09-30: no
worker declares it in `eventTypes`, so `WorkerRuntime.dispatch()` has no
consumer for it today. The existing mission row format is fully specified
(`ping_missions` table; `mission_id` = deterministic hash of
`(missionType, event_id)`; `INSERT ... ON CONFLICT (mission_id) DO NOTHING`;
payload JSONB; result JSONB; lifecycle created -> assigned -> running ->
completed/failed; `MissionRuntime.create(missionType, payload)`).

Because this lane is read-only w.r.t. production, the mission was NOT
inserted into the live `ping_missions` table and NOT dispatched. What follows
is (a) the exact mission envelope, byte-ready for `MissionRuntime.create`,
and (b) the research execution performed by the model against the incident
evidence files, producing structured findings per the order's output schema.
The gap between "encoded" and "live-dispatched" is classified in Part E
as UNWIRED (label without a registered consumer).

Evidence read (all local, all 2026-10-01):
- `~/workspace/outreach/eligibility-audit-2026-10-01.md` (read-only audit)
- `~/workspace/outreach/eligibility-replay-173-2026-10-01.md` (offline replay)
- `~/workspace/outreach/eligibility-adversarial-2026-10-01.md` (12/12 suite)
- `~/workspace/outreach/eligibility-escaped-likes-2026-10-01.md` (2 escapes)
- `~/workspace/outreach/eligibility-validation-batch-2026-10-01.md` (4-batch prep)
- Parent-verified ledger state for pass `fb-20261001-053221` (4 intents, 4
  executions, 4 observations, all terminal EXECUTED)

---

## Part A — The encoded mission (smallest bounded INTELLIGENCE_RESEARCH)

Mission envelope in the existing `ping_missions` row format. Field layout
follows `MissionRuntime.create(missionType, payload)` as documented in the
2026-09-30 forensic (`ping-runtime/orchestration/mission_runtime.js`).

```json
{
  "mission_id": "2e1a27da53b32d05e7da7c4ca10a809346ca7502aa26544411ec334c87f782cc",
  "missionType": "INTELLIGENCE_RESEARCH",
  "event_id": "evt:engagement-eligibility-pass173-20261001",
  "status": "created",
  "payload": {
    "training_example": 0,
    "incident_ref": "FB pass 173, 2026-09-30 23:26 MDT; eligibility P0 2026-10-01",
    "questions": [
      "Q1. What mechanism allowed 34 candidates containing known-ineligible items to be dispatched despite documented policy against each ineligibility class?",
      "Q2. Does the repaired eligibility authority reproduce the human corrections deterministically, with zero external actions?",
      "Q3. Does the repaired system fail safe under adversarial conditions (tampered/stale/missing evidence, mid-run state change, duplicates, empty candidates, unreadable policy data)?",
      "Q4. What is the honest boundary of the deterministic authority: which human judgments does it NOT reproduce, and why?",
      "Q5. What remains unverified or undeployed in the enforcement chain?"
    ],
    "claims_to_verify": [
      {"claim_ref": "C1", "claim_text": "A rule in a document is not a control; the control exists only when the external effect cannot occur without passing it.", "claimed_source": "CEO-ORDER-ENGAGEMENT-ELIGIBILITY-P0-2026-10-01.md"},
      {"claim_ref": "C2", "claim_text": "The pass-173 escape was caused by the manually-curated job path bypassing the builder blocked-check, combined with the guard having no corridor or blocked-business concept.", "claimed_source": "eligibility-audit-2026-10-01.md sections 1a, 1f"},
      {"claim_ref": "C3", "claim_text": "The repaired authority replays all 34 pass-173 candidates offline with zero mismatches vs the human corrections: 25 INELIGIBLE, 9 ELIGIBLE, deterministic re-run identical.", "claimed_source": "eligibility-replay-173-2026-10-01.md"},
      {"claim_ref": "C4", "claim_text": "All 12 adversarial cases fail safe by construction: missing/tampered/stale envelopes refused; state changes refused; duplicates, empty candidates and unlisted groups resolve to INELIGIBLE/UNKNOWN; unreadable policy data raises fail-closed.", "claimed_source": "eligibility-adversarial-2026-10-01.md"},
      {"claim_ref": "C5", "claim_text": "Two ineligible likes escaped (terminal EXECUTED, preserved, not reversed); 31 dispatched intents were stopped before attempt.", "claimed_source": "eligibility-escaped-likes-2026-10-01.md; intent ledger"},
      {"claim_ref": "C6", "claim_text": "The 4-like validation batch dispatched through the full chain with ELIGIBLE envelopes; all 4 recorded terminal EXECUTED.", "claimed_source": "intent ledger, pass fb-20261001-053221 (parent-verified 2026-10-01)"},
      {"claim_ref": "C7", "claim_text": "Taste is not eligibility: two items the human dropped on taste return ELIGIBLE because no deterministic rule covers them.", "claimed_source": "eligibility-replay-173-2026-10-01.md notes"},
      {"claim_ref": "C8", "claim_text": "Prose never authorizes: an agent-written recommendation inside candidate text cannot override corridor policy.", "claimed_source": "eligibility-adversarial-2026-10-01.md case 3"},
      {"claim_ref": "C9", "claim_text": "Worker-side verification (staged engage.js) is NOT deployed to the Pig; deployment is an owner call; the current worker cannot independently re-evaluate registries between dispatch and click.", "claimed_source": "AGENTS.md eligibility authority entry; parent context 2026-10-01"},
      {"claim_ref": "C10", "claim_text": "Plan-time envelope stamping plus dispatch-time live re-evaluation and evidence-check closes the curation-to-dispatch TOCTOU window.", "claimed_source": "eligibility-adversarial-2026-10-01.md (stale/state-changed cases)"},
      {"claim_ref": "C11", "claim_text": "Human review was the safety net that caught the incident; it must not be the primary enforcement mechanism.", "claimed_source": "incident record; CEO-ORDER-ENGAGEMENT-ELIGIBILITY-P0-2026-10-01.md"}
    ],
    "evidence_requirements": "Primary sources first: the intent ledger (intent/execution/observation rows), the replay verdict table, the adversarial case list, the escaped-likes record with permalinks and observation timestamps, the eligibility data files (corridor, blocked-businesses, precedent-registry, action-capability). A live ledger read beats the audit prose; the audit prose beats any summary. No reconstructed evidence: where records are thin, mark UNVERIFIED.",
    "counterevidence_requirements": "Mandatory. For C1 especially: the strongest technically credible reasons the thesis is wrong or narrower than stated (low harm, human caught it, executable policy is established practice, possible over-engineering for the stakes). Record the falsification risk verbatim; the artifact must carry it, not assume it away.",
    "audience_context": "Senior/staff engineers, infra and AI engineers, technical founders. Clusters: building agents with external effects; debugging distributed worker systems; making agent authorization trustworthy; operating autonomous software in production. Proof expectations: reproducible demonstrations, explicit limitations, falsifiability. No demographic personas.",
    "output_schema": {
      "claim_record": ["claim_id", "claim_text", "verdict", "support_set[]", "counterevidence[]", "source_quality", "verification_state", "confidence", "applicability", "freshness", "unknowns[]"],
      "verdict_enum": ["CONFIRMED", "PLAUSIBLE", "INFERRED", "UNCLEAR", "REFUTED"],
      "source_quality_enum": ["PRIMARY SOURCE", "LIVE OBSERVATION", "CONTROLLED REPRODUCTION", "INDEPENDENT CORROBORATION", "VENDOR CLAIM", "MODEL INFERENCE", "UNKNOWN"],
      "verification_state_enum": ["REPRODUCED", "OBSERVED_ONCE", "REPORTED", "INFERRED", "UNVERIFIED"]
    },
    "synthesis_rule": "Map each confirmed mechanism to the engine it belongs in (research/contradiction/novelty/audience/opportunity). Flag any vendor marketing without independent evidence (none in this incident). CONFIRMED requires primary evidence; PLAUSIBLE requires evidence with a stated gap; INFERRED marks judgments that go beyond direct evidence. Source quality and verification state are never collapsed into the verdict or into a single confidence number."
  },
  "result": null,
  "correlation_id": "marketingos-training-000",
  "causation_id": "evt:engagement-eligibility-pass173-20261001"
}
```

`mission_id` = sha256("INTELLIGENCE_RESEARCH:evt:engagement-eligibility-pass173-20261001"),
matching the deterministic identity scheme (hash of missionType:event_id).

Dispatch path when live: `MissionRuntime.create('INTELLIGENCE_RESEARCH', payload)`
-> `ping_missions` row -> `MissionScheduler` poll -> `WorkerRuntime.dispatch()`
matching a worker declaring the label in `eventTypes`. No such worker is
registered today (Part E, edge E1).

---

## Part B — Research execution record

Executed 2026-10-01 by the model (this lane) against the evidence files
listed above. Zero external actions. Zero live-system reads beyond the
parent-verified ledger state already in context. No evidence reconstructed:
every support item below names its file. Findings follow in Part C.

Synthesis per the mission's synthesis_rule:
- C1, C11 -> thesis/novelty engine (the invariant and its surprise structure).
- C2 -> mechanism (root cause), feeds the contradiction engine's "what would falsify it".
- C3, C4, C10 -> reproducibility engine (the proof the story stands on).
- C5, C6 -> outcome/verification (what actually executed).
- C7 -> the honest boundary (counterevidence carried inside the thesis).
- C8 -> the "prose never authorizes" sub-invariant.
- C9 -> the known limitation (worker-side gap), feeds "what is unknown".

---

## Part C — Structured findings (training example zero output)

Verdict vocabulary: CONFIRMED / PLAUSIBLE / INFERRED / UNCLEAR / REFUTED.
Source quality and verification state are kept separate from the verdict.

### C1 — the core invariant

- **claim_id:** C1
- **claim_text:** A rule in a document is not a control; a rule in an agent prompt is not a control; a human remembering the rule is not a control. The control exists only when the external effect cannot occur without passing it.
- **verdict:** CONFIRMED
- **support_set:**
  - Documented policy existed against every ineligibility class in the batch (out-of-corridor, blocked businesses, already-engaged pages); 34 candidates containing all three classes were still dispatched in pass 173 (`eligibility-audit-2026-10-01.md`).
  - The manual curation path bypassed the builder's `candidate_blocked()` check entirely; the guard had no corridor or blocked-business concept at all (`eligibility-audit-2026-10-01.md` sections 1a, 1f).
  - Post-repair, the same 34 candidates replay 25 INELIGIBLE / 9 ELIGIBLE with 0 mismatches vs the human corrections, deterministically (`eligibility-replay-173-2026-10-01.md`).
- **counterevidence:**
  - The escape was low-harm: two ordinary likes on real public business posts, not spam or harmful contact (`eligibility-escaped-likes-2026-10-01.md`).
  - A human WAS in the loop and caught the incident; one can argue the process worked as designed (human as safety net) rather than failed.
  - "Executable policy" is established practice (OPA, Cedar); the incident can be read as trivially preventable process failure ("someone skipped a step") rather than deep architecture.
  - The envelope machinery (per-action SHA-256 envelopes, 6h TTL, three enforcement points) can be read as over-engineering for the stakes (Facebook likes).
- **source_quality:** LIVE OBSERVATION (the escape, the kill) + CONTROLLED REPRODUCTION (the replay)
- **verification_state:** REPRODUCED
- **confidence:** high
- **applicability:** Any agent system with external effects: authorization/policy enforcement, tool-use gating, deployment pipelines. Not Facebook-specific.
- **freshness:** 2026-10-01 (incident 2026-09-30 23:26 MDT; repair and proofs 2026-10-01)
- **unknowns:** Whether the invariant holds at higher stakes without the human safety net present at all (the incident still had a human watching); long-term maintenance burden of the precedent registry.

### C2 — root cause

- **claim_id:** C2
- **claim_text:** The pass-173 escape was caused by the manually-curated job path bypassing the builder's blocked-check, combined with the guard having no corridor or blocked-business concept, and cross-posts with new permalink IDs defeating the already-engaged index.
- **verdict:** CONFIRMED
- **support_set:**
  - Audit 1f: "the manually curated job path BYPASSES candidate_blocked entirely (pass 173's curated JSON went straight to run_pass.sh)".
  - Audit 1a: guard had "no corridor concept at all (no geography), no structured blocked-business list".
  - Audit context: cross-posts with new permalink IDs were invisible to the already-engaged index.
- **counterevidence:** None on the mechanism itself. Narrowing note: the audit is static analysis plus file reads; it did not re-execute the pass-173 dispatch chain.
- **source_quality:** PRIMARY SOURCE (source code examined statically)
- **verification_state:** OBSERVED_ONCE
- **confidence:** high
- **applicability:** Curation/override paths in any pipeline with a guard: every path to the effect must pass the control, not just the default path.
- **freshness:** 2026-10-01
- **unknowns:** None material; the repaired authority's replay (C3) independently confirms the causal story (the same candidates now block on exactly these concepts).

### C3 — deterministic replay

- **claim_id:** C3
- **claim_text:** The repaired authority replays all 34 pass-173 candidates offline with zero mismatches vs the human corrections: 25 INELIGIBLE, 9 ELIGIBLE, 0 UNKNOWN; deterministic re-run identical.
- **verdict:** CONFIRMED
- **support_set:**
  - Full 34-row verdict table with per-item reason codes and evidence pointers (`eligibility-replay-173-2026-10-01.md`).
  - "Deterministic re-run: IDENTICAL. Expected-vs-actual mismatches: 0."
  - The 7 human-corrected keeps all return ELIGIBLE; both escaped likes return INELIGIBLE (OUTSIDE_CORRIDOR).
- **counterevidence:**
  - "Zero mismatches" means agreement with the deterministic corrections, NOT with every human taste drop: items 17 (Fruita coffee beans) and 24 (Ridgway free estimate) return ELIGIBLE while the human dropped them. This is recorded honestly (see C7); papering it over would invalidate the proof.
  - The replay is offline against reconstructed pre-incident state (log cut + ledger excluding the pass); it proves the authority's verdicts, not the historical dispatch.
- **source_quality:** CONTROLLED REPRODUCTION
- **verification_state:** REPRODUCED
- **confidence:** high
- **applicability:** The replay procedure (snapshot pre-incident state, run the authority, diff against human corrections) is reusable for any eligibility/policy incident.
- **freshness:** 2026-10-01
- **unknowns:** None on the replay itself.

### C4 — adversarial fail-safe suite

- **claim_id:** C4
- **claim_text:** All 12 adversarial cases fail safe by construction: missing/tampered/stale envelopes refused at dispatch; mid-run state changes refused; within-batch duplicates, empty candidates and unlisted groups resolve to INELIGIBLE/UNKNOWN (not dispatched); unreadable policy data raises fail-closed (exit 3).
- **verdict:** CONFIRMED
- **support_set:** Case list with per-case expected/observed outcomes, 12/12 pass (`eligibility-adversarial-2026-10-01.md`), including: blocked+attractive post still INELIGIBLE; agent recommendation prose ignored; tampered envelope hash mismatch refused; stale evidence (25200s > 21600s TTL) refused; determinism (identical inputs -> identical verdicts).
- **counterevidence:**
  - 12 cases cover the designed threat model; they do not cover unknown threat classes (e.g., a compromised eligibility data file that is internally consistent but wrong).
  - "Fail safe by construction" holds for the tested envelope/guard code paths, not for the undeployed worker-side check (see C9).
- **source_quality:** CONTROLLED REPRODUCTION
- **verification_state:** REPRODUCED
- **confidence:** high (within the tested threat model)
- **applicability:** Adversarial fail-safe suites as acceptance criteria for any policy-enforcement code.
- **freshness:** 2026-10-01
- **unknowns:** Threat classes outside the 12 cases.

### C5 — escaped effects preserved

- **claim_id:** C5
- **claim_text:** Two ineligible likes escaped (terminal EXECUTED, permalinks 4090528661082571 and 4090481474420623); 31 dispatched intents were stopped before attempt; the escaped effects were preserved as actual outcomes, not reversed.
- **verdict:** CONFIRMED
- **support_set:**
  - Escaped-likes record with intents, observation timestamps (2026-10-01T05:35:51Z), and ineligibility reasons (`eligibility-escaped-likes-2026-10-01.md`).
  - 31 intents remain unattempted; closed as UNKNOWN_EXECUTION fail-closed, not re-dispatched.
  - Reversal assessment: no unlike capability in the facebook-cli skill; reversal would be a new unauthorized external effect and would rewrite the incident record the replay depends on.
- **counterevidence:** None on the facts. Interpretive note: preserving the likes is a policy choice (record integrity over cleanup), not a technical necessity.
- **source_quality:** PRIMARY SOURCE (intent ledger rows) + LIVE OBSERVATION
- **verification_state:** OBSERVED_ONCE
- **confidence:** high
- **applicability:** Incident accounting discipline: preserve actual outcomes; never improvise cleanup external actions; UNKNOWN-after-effect reconciliation over blind retry.
- **freshness:** 2026-10-01
- **unknowns:** None material.

### C6 — live validation batch

- **claim_id:** C6
- **claim_text:** The 4-like validation batch (pass fb-20261001-053221) dispatched through the full chain with ELIGIBLE envelopes; all 4 recorded terminal EXECUTED: envelopes, recorded outcomes, and replay agree.
- **verdict:** CONFIRMED
- **support_set:**
  - Parent-verified ledger state 2026-10-01: 4 intent records, 4 execution records, 4 observation records, all terminal EXECUTED (intent IDs 1931026923454db08284abf52395c195, 1755b023bb2a416599be13027e3abfc6, 92abd4f057164a24a6425ba0c4cc40ce, acad59a0ec834fafa3629c7c45c1b62e).
  - Guard: 4 eligible, 0 blocked; 4 envelopes stamped and verified; unknown-execution filter: 0 refused.
  - Preparation report (`eligibility-validation-batch-2026-10-01.md`): plan-time curate 4 eligible / 0 dropped; evidence-check 4 checked / 0 refused.
- **counterevidence:**
  - n=4 is a tiny batch; it confirms the chain operates end-to-end, not that it is robust at volume.
  - The batch file itself was written pre-dispatch ("NOT dispatched"); the dispatch outcome comes from the parent's ledger verification, not from the batch file.
- **source_quality:** PRIMARY SOURCE (ledger) + LIVE OBSERVATION
- **verification_state:** OBSERVED_ONCE
- **confidence:** high (for "the chain works end-to-end"); medium (for any volume claim, which is not made)
- **applicability:** Bounded live validation as the acceptance step for enforcement machinery: small n, full chain, ledger-verified.
- **freshness:** 2026-10-01
- **unknowns:** Behavior at full pass volume; worker-side re-evaluation (C9) untested live.

### C7 — the taste boundary (mandatory counterexample)

- **claim_id:** C7
- **claim_text:** Taste is not eligibility: two items the human curator dropped on taste (Fruita coffee beans, Ridgway free estimate) honestly return ELIGIBLE because no deterministic rule covers them; the authority was not adjusted to force agreement.
- **verdict:** CONFIRMED
- **support_set:**
  - Replay notes: "Items 17 and 24 return ELIGIBLE: no rule in the data covers them. The human corrected set dropped them on tighter curation judgment, not on a deterministic rule. This is the honest boundary of the authority, and it is recorded here rather than papered over."
  - Nolan's binding order (2026-10-01): "do not encode the two taste judgments just to reach 100% agreement."
- **counterevidence:** One can argue a "thin/no-name" or "low-quality" rule could deterministically cover these; the standing decision is that such a rule would launder taste into eligibility, which the order forbids.
- **source_quality:** CONTROLLED REPRODUCTION + PRIMARY SOURCE (the binding order)
- **verification_state:** REPRODUCED
- **confidence:** high
- **applicability:** The model-to-software ratchet: do not deterministicize taste prematurely. Subjective ranking belongs in a layer above eligibility.
- **freshness:** 2026-10-01
- **unknowns:** Where the future curation layer's boundary will sit.

### C8 — prose never authorizes

- **claim_id:** C8
- **claim_text:** Prose never authorizes: an agent-written recommendation inside candidate text cannot override corridor policy; free-form notes never authorize actions.
- **verdict:** CONFIRMED
- **support_set:** Adversarial case 3: "outside-corridor + agent recommendation: prose recommendation ignored -> INELIGIBLE [OUTSIDE_CORRIDOR]".
- **counterevidence:** Single adversarial case; the general claim rests on the architectural principle (precedents become data) plus this case.
- **source_quality:** CONTROLLED REPRODUCTION
- **verification_state:** OBSERVED_ONCE
- **confidence:** high (within the tested case); the general principle is INFERRED beyond it
- **applicability:** Prompt-injection-adjacent discipline for agent pipelines: natural-language recommendations inside data payloads must not move the decision.
- **freshness:** 2026-10-01
- **unknowns:** Adversarial prose sophistication beyond the tested case.

### C9 — the known worker-side gap

- **claim_id:** C9
- **claim_text:** Worker-side verification (staged `~/workspace/outreach/staged/engage.js`) is NOT deployed to the Pig; deployment is an owner call; the current worker cannot independently re-evaluate registries between dispatch and click.
- **verdict:** CONFIRMED
- **support_set:** AGENTS.md eligibility authority entry (2026-10-01): staged, not deployed, owner-controlled. Parent context: the dispatch-to-click window is covered by envelope TTL + evidence-check, not by worker re-evaluation.
- **counterevidence:** None on the fact. Mitigation note: the 6h envelope TTL plus dispatch-time evidence-check bounds the window; the residual risk is a registry change inside the TTL after dispatch.
- **source_quality:** PRIMARY SOURCE (AGENTS.md, workspace file state)
- **verification_state:** REPORTED
- **confidence:** high
- **applicability:** Honest-limitation discipline: every enforcement story must name what is staged vs deployed.
- **freshness:** 2026-10-01
- **unknowns:** Whether/when the owner deploys the staged check.

### C10 — TOCTOU closure at plan+dispatch

- **claim_id:** C10
- **claim_text:** Plan-time envelope stamping (SHA-256, 6h TTL) plus dispatch-time live re-evaluation and evidence-check closes the curation-to-dispatch TOCTOU window: stale envelopes and mid-run eligibility-data changes are refused.
- **verdict:** CONFIRMED
- **support_set:**
  - Adversarial: stale evidence refused (age 25200s > TTL 21600s); "eligibility data changed since planning: re-evaluate" refused.
  - Audit confirmed the TOCTOU window existed pre-repair (plan-time vs dispatch-time state divergence).
- **counterevidence:** Covers plan->dispatch only; dispatch->click relies on TTL (see C9). A 6h TTL is a policy choice, not a proof; a shorter TTL would narrow the window at the cost of re-stamping.
- **source_quality:** CONTROLLED REPRODUCTION
- **verification_state:** REPRODUCED
- **confidence:** high
- **applicability:** Envelope-with-TTL plus live re-evaluation as the standard TOCTOU pattern for plan/dispatch splits.
- **freshness:** 2026-10-01
- **unknowns:** Optimal TTL is unstudied; currently a judgment call.

### C11 — human review is a safety net, not the control

- **claim_id:** C11
- **claim_text:** Human review was the safety net that caught the incident (operator killed the worker; 2 likes escaped before the kill); it must not be the primary enforcement mechanism.
- **verdict:** CONFIRMED
- **support_set:** Incident record: 2 escaped before the kill, 31 stopped. CEO order doctrine: "Human review was the safety net; it must not be the primary enforcement mechanism."
- **counterevidence:** The human did catch it; a defender of human-in-the-loop could claim the system worked. The rebuttal is quantitative: 2 ineligible effects escaped before the kill, and the kill depended on the operator watching at that moment.
- **source_quality:** LIVE OBSERVATION + PRIMARY SOURCE (the order)
- **verification_state:** OBSERVED_ONCE
- **confidence:** high
- **applicability:** Human-in-the-loop design: humans as exception handlers, never as the enforcement path for known rule classes.
- **freshness:** 2026-10-01
- **unknowns:** None material.

---

## Part D — Implementation classification (per the order: classify every proposed implementation)

For each component this mission uses or implies:

### D1. The INTELLIGENCE_RESEARCH mission label
- **PING EXISTING:** The mission row format, `MissionRuntime.create(missionType, payload)`, deterministic `mission_id`, lifecycle, `MissionScheduler` polling, `WorkerRuntime.dispatch()` matching on `worker.eventTypes` — all PROVEN in the 2026-09-30 forensic against `/home/nolan/ping`.
- **FYD CURRENT:** No overlap. FYD is the object-site compiler; nothing in this mission duplicates or touches it.
- **HARVESTABLE CODE:** The §6.1 template itself (`~/workspace/marketing-os/GROWTH-OS.md` §6.1) — the field list and execution description are written; they need adopting, not inventing.
- **DUPLICATION RISK:** None. Forensic live-grep 2026-09-30: zero hits for the label in `ping-runtime` + `gateway`. There is nothing to collide with.
- **SMALLEST REQUIRED DELTA:** Register the label in one worker's `eventTypes` (or the `MISSION_WORKER_MAP` labeling) and adopt the Part A payload schema as convention. No new table, no new authority, no new runtime.

### D2. The research sweep execution
- **PING EXISTING:** Canonical workers (observation -> claim -> classification -> recommendation -> projection -> replay -> witness -> lineage -> knowledge-promotion) are registered in the live gateway.
- **HARVESTABLE CODE:** The VM-side `meta-ai-research-worker` sweep shape — rotating briefs plus provenance sidecars — is the exact "sweep against a brief" shape §6.1 describes, PROVEN per the 2026-09-13 worker inventory.
- **DUPLICATION RISK:** None if the sweep consumes the mission payload's `questions[]`/`claims_to_verify[]`; it would be DUPLICATE if built as a separate "research agent" with its own brief store.
- **SMALLEST REQUIRED DELTA:** Point the existing sweep shape at the mission payload instead of a prose brief. This turn's execution (model reading the evidence files) is the manual precursor that proves the payload is sufficient.

### D3. Claim records and verdicts
- **PING EXISTING:** `ClaimWorker` / `CLAIM_CREATED`, `knowledge_nodes` with `confidence_provenance` and `source_event_id`.
- **DUPLICATION RISK:** None as long as findings land in `knowledge_nodes`/mission `result`; a separate claim store would be DUPLICATE by construction.
- **SMALLEST REQUIRED DELTA:** Verdict and source-quality vocabularies as payload literals (the forensic: "genuinely missing only as enum FIELDS"). No schema migration required for the mission result; knowledge-node promotion can carry them as metadata fields when that edge is wired.

### D4. Findings persistence
- **PING EXISTING:** `ping_missions.result` JSONB (mission result), `ping_events` (canonical record), `knowledge_nodes`/`edges` (promoted findings), Qdrant (semantic projection).
- **DUPLICATION RISK:** None — this document is the only new file, and it is a working paper, not a store.
- **SMALLEST REQUIRED DELTA:** When the mission runs live, `result` = the Part C findings JSON; promotion of CONFIRMED claims to `knowledge_nodes` via the existing `KnowledgePromoter`.

### D5. Counterevidence requirement
- **PING EXISTING:** None as code; it is a *behavior* (bounded analysis over claims/evidence), correctly not an authority per the order.
- **SMALLEST REQUIRED DELTA:** A worker behavior / review checklist, not a store. This turn demonstrates the behavior manually (every C-record above carries counterevidence).

### Re-verification note
The "zero hits in code" finding for the label is 1 day old (forensic 2026-09-30, live grep of the Pig runtime). This lane did not re-grep the live runtime (read-only constraint). Before live dispatch, re-verify the label is still unregistered — if a worker has since claimed it, D1's delta shrinks to zero.

---

## Part E — Missing-edge classification for the rest of the loop

Target loop: REALITY → OBSERVATIONS → CLAIMS → EVIDENCE → CONTRADICTIONS → VERIFIED FINDINGS → AUDIENCE/PROBLEM MODEL → OPPORTUNITIES → THESIS → ARTIFACT → CLAIM CHECK → APPROVAL → DISTRIBUTION → EFFECT → OUTCOME → LEARNING → NEXT EXPERIMENT.

This turn completes through VERIFIED FINDINGS (training example zero). Every edge downstream is classified:

| # | Edge | Classification | Evidence / note |
|---|------|----------------|-----------------|
| E1 | Mission label → registered worker (a consumer declaring INTELLIGENCE_RESEARCH in `eventTypes`) | **UNWIRED** | Label has zero hits in live code (forensic 2026-09-30). The row format, scheduler, and dispatch all exist; the consumer does not. Smallest fix: one worker registration. |
| E2 | Incident reality → canonical OBSERVATION (engagement incident records into `ping_events`) | **UNWIRED** | The incident's records live in outreach-lane files and the intent ledger, not in `ping_events`. The canonical ingress (`POST /ingest`, `CanonicalizationService`) exists; the engagement lane does not emit to it. |
| E3 | Research findings → CLAIM_CREATED / knowledge_nodes (the §9.5 chaining rule: unverified claims become the next mission's input) | **UNWIRED** | `ClaimWorker` and `KnowledgePromoter` exist; nothing routes research output into them. Documented, not implemented. |
| E4 | CONTRADICTION engine (bounded analysis: what supports / contradicts / falsifies) | **MISSING** (as behavior) | Correctly not an authority. No implementation exists; this turn performed it manually. Smallest fix: a worker behavior + checklist, never a store. |
| E5 | VERIFIED FINDINGS → AUDIENCE/PROBLEM MODEL (clusters as `knowledge_nodes`) | **MISSING** (as behavior) | Schema specified (GROWTH-OS Engine 2, `entity_type='audience_cluster'`); only the v0 hand-built clusters exist. The projection behavior is not built. |
| E6 | OPPORTUNITY scoring over research findings | **UNWIRED** | `recommendation` worker and `EvidenceAuthority.rank` exist; no path feeds research findings into them. |
| E7 | THESIS → ARTIFACT (content compiler: one thesis, many projections, shared lineage) | **MISSING** (as behavior) | Explicitly out of scope this turn per constraints (no artifact built). The claim/evidence lineage schema from Part C is its required input. |
| E8 | CLAIM CHECK (claim linter before publication) | **MISSING** (as behavior) | No implementation. Part C's claim records are exactly the input format it would lint (SUPPORTED/PARTIALLY/CONFLICTED/INFERRED/UNSUPPORTED/STALE per claim). |
| E9 | Durable human-approval record (PROPOSED_ACTION / ACTION_APPROVED / REJECTED as canonical `ping_events` rows) | **MISSING** (durable) | `BusinessActionAuthority` exists in-memory with zero importers (recon 2026-09-19). The durable event types are specified (GROWTH-OS §9.3) but not implemented. Standing law "Nolan approves every post" currently rides operator procedure, not durable state. |
| E10 | APPROVAL → DISTRIBUTION for content (as distinct from engagement dispatch, which has a full authorized chain) | **UNREACHED** | The authorized execution pattern exists (`authorizeWorkOrder`, engagement `run_pass.sh` chain); it has never been exercised for a MarketingOS content artifact. |
| E11 | DISTRIBUTION → EFFECT → OUTCOME (metric observations back through canonical ingress) | **UNWIRED** | `POST /ingest` and the metric schema exist; no distribution has occurred, so nothing flows. |
| E12 | LEARNING → NEXT EXPERIMENT (outcome → candidate learning → promotion → next mission) | **UNWIRED** | `KnowledgePromoter` (ADD-only) exists; the learning-to-mission chaining is documented (§9.5) but not implemented. The order's causal-humility rule (OUTCOME → CANDIDATE LEARNING → SUPPORT SET → APPLICABILITY → CONFIDENCE → PROPOSAL → HUMAN/POLICY PROMOTION) is the promotion gate when wired. |
| E13 | Mission Control epistemic cockpit (per-idea drill: why investigating / believed / supporting / contradicting / unknown / falsifiable / authorized / executed / observed / learned) | **MISSING** (as view) | Mission Control exists as a projection; the per-idea drill-down view does not. Projection only, never authority. |

### DUPLICATE / COMPETING / UNSAFE sweep
- **DUPLICATE:** None created and none proposed. The forensic's object-equivalence finding holds for this mission: every durable residue lands in `ping_events`, `ping_missions`, `knowledge_nodes`/`edges`, or Qdrant.
- **COMPETING:** None. No competing claim, evidence, or mission store was introduced.
- **UNSAFE (standing boundary):** Any future wiring that lets a mission reach DISTRIBUTION without passing the durable human-approval edge (E9) would violate the standing law "Nolan approves every post." The E9→E10 edge must remain human-gated; auto-publish is not a missing edge, it is a forbidden one.

---

## Part F — Explicit non-scope (what this turn did NOT do)

- No artifact compiled from the verified thesis (E7 remains MISSING by decision).
- No claim lint run beyond the manual counterevidence discipline in Part C (E8 remains MISSING).
- No distribution, no outcome ingestion, no learning promotion (E10–E12 untouched).
- No live mission inserted, no worker registered, no runtime code changed.
- No FYD, Pig, engagement, or live-system state touched.

## Suggested next wire (for the parent's prioritization, not this lane)
The smallest next step that advances the loop without building new machinery:
wire E1 (register one worker for the INTELLIGENCE_RESEARCH label, consuming the
Part A payload schema) and E3 (route the Part C findings into `ping_missions.result`
+ `CLAIM_CREATED` for the CONFIRMED claims). Everything downstream of that
remains classified above and stays parked until the FYD proof chain is green.
