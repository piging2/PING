# Batch Factory Spec: BuildBatch(batchManifest)

Version: 1.0 (DRAFT, pending Phase 17 golden-path plan and build-program coordinator harvest decision)
Date: 2026-09-23
Lane: LANE-BATCH-SPEC (Wave N1b, worker 10)
Extends: `orchestration/BUILD-BUSINESS-SPEC.md` (the single-build contract). This document extends that contract to batch operation. Where they overlap, the single-build contract wins; this spec adds only what batching requires. It does not redefine identity, evidence, authority, capabilities, transitions, or history: those remain PING's canonical substrate (see section 9).

Governing program: FYD 500-SITE FACTORY STRESS PROGRAM (MISSION-STATE.md, 2026-09-23 19:40 MDT, Nolan's directive). This spec is the machine that PROVES 500. It builds 500 source records, 500 evidence sets, 500 object graphs, 500 site specs through ONE renderer, ONE component registry, ONE design system, ONE capability model. 500 React applications means architecture failed, stop.

## 1. Batch manifest

The batch manifest is the ONLY authorized batch input surface. It declares every item, the policy defaults every item inherits, and the run's resource envelope. A batch item compiles to exactly one BuildBusiness sourceManifest; the batch layer never bypasses the single-build contract's input surface.

### 1.1 Batch-level fields

| Field | Required | Type | Meaning |
|---|---|---|---|
| batch_version | yes | string, enum `fyd-batch@1` | Schema version. Unknown versions are rejected before any item starts. |
| batch_id | yes | string, `btch_<UTC yyyymmdd>_<hhmm>_<slug>_<8 hex>` | Stable batch identity. Threaded through checkpoints, leases, metrics, and PING event correlation ids. |
| cohort | yes | string, enum `synthetic` \| `recorded` \| `real-10` \| `real-25` \| `real-50` \| `real-100` \| `real-500` | Cohort class per the program. Escalation gates in section 12. |
| items | yes | array of BatchItem, 1..5000 entries | The work. Ordering is advisory; execution order is scheduler-controlled. |
| defaults | yes | BatchDefaults | Inherited by items unless overridden per item. |
| concurrency | no | object | `{ max_items_in_flight, max_acquire_in_flight, per_host_rate_limit }`. Defaults in section 4.5. |
| budgets | no | object | `{ max_wall_minutes_per_item, max_bytes_per_item, max_model_calls_per_item, max_cost_usd_per_item }`. Defaults in section 4.5. |
| idempotency_salt | no | string | Optional caller-supplied salt mixed into work-identity hashes for controlled reruns. |

### 1.2 BatchItem

| Field | Required | Type | Meaning |
|---|---|---|---|
| business_id | yes | string, slug `[a-z0-9-]{1,64}` | Stable tenant identity. Unique within the batch. Same identity rules as the single-build contract. |
| business_name | optional | string | Declared display name, never invented. Absent means the pipeline must derive it from evidence or degrade honestly. |
| source_url | yes | string (https only) | Primary acquisition target. Additional sources may be discovered only through DISCOVER stage output and only if they pass the egress policy (section 10). |
| archetype_hint | optional | enum `trades` \| `professional` \| `technology` \| null | Planner hint, not a template selector. Null means CLASSIFY decides from evidence. The hint is advisory; a wrong hint must not corrupt the build (CLASSIFY re-derives and records the divergence as a warning). |
| authorization | yes | AuthorizationPolicy | Media/contact/claim authorization for this item (section 1.3). |
| priority | no | integer 1..5, default 3 | Scheduler priority. 1 is highest. Used for queue ordering only, never for correctness shortcuts. |
| required_facts | optional | array of FactRef | Passed through to the single-build manifest. |
| conflict_policy | optional | enum `owner_wins` \| `newest_wins` \| `manual` | Passed through; default `manual` from batch defaults. |
| discovery_ref | optional | string | For real cohorts: pointer to the research record that produced this item (no contact made). For synthetic: the generator seed id. For recorded: the fixture ref. |
| labels | optional | array of string | Free-form tags for cohort analysis (e.g. `vertical:restaurant`, `source:gbp`). Labels never drive stage behavior. |

### 1.3 AuthorizationPolicy

Authority is delegated conservatively. This policy declares what the batch is ALLOWED to do with an item's artifacts. Anything not declared is denied.

| Field | Required | Type | Meaning |
|---|---|---|---|
| basis | yes | enum `owner_authorized` \| `public_observed` \| `synthetic` \| `recorded` | Legal/consent basis for processing this item. `owner_authorized`: an authenticated owner authorized this business. `public_observed`: public web data observed without contact. `synthetic`: generated test data, never presented as a real prospect. `recorded`: redacted fixture replay. |
| media_policy | yes | enum `owner_assets` \| `authorized_reuse` \| `harvest_note_only` \| `none` | `owner_assets`: use owner-supplied media. `authorized_reuse`: reuse allowed under a recorded rights_basis. `harvest_note_only`: record what media exists, select nothing. `none`: skip media binding (honest-empty hero). |
| contact_policy | yes | enum `never` | Always `never` in this spec version. The batch factory NEVER initiates contact. Outreach candidates are a human-gated derived queue (section 8). This field exists so a future version must explicitly widen it with Nolan's approval. |
| publish_policy | yes | enum `artifact_only` | Always `artifact_only` in this spec version. A READY build is a certified artifact, not authorized to publish (single-build contract section 6.1). |
| claim_policy | optional | enum `owner_claim_flow` \| `no_claim` (default `owner_claim_flow`) | Whether the item may enter READY_FOR_OWNER_CLAIM. `no_claim` keeps synthetic/recorded items out of the owner queue. |

### 1.4 Examples

Synthetic stress item:
```json
{
  "business_id": "synth-hvac-0142",
  "source_url": "https://synthetic-corpus.local/fixtures/synth-hvac-0142.html",
  "archetype_hint": "trades",
  "authorization": { "basis": "synthetic", "media_policy": "none", "contact_policy": "never", "publish_policy": "artifact_only", "claim_policy": "no_claim" },
  "priority": 4,
  "discovery_ref": "synth-gen-seed-0142",
  "labels": ["vertical:hvac", "hostile:redirect-loop"]
}
```

Real public-observed item (no contact, research only):
```json
{
  "business_id": "mesa-county-plumbing-07",
  "business_name": "Mesa County Plumbing",
  "source_url": "https://www.example-plumber.com/",
  "archetype_hint": "trades",
  "authorization": { "basis": "public_observed", "media_policy": "harvest_note_only", "contact_policy": "never", "publish_policy": "artifact_only", "claim_policy": "owner_claim_flow" },
  "priority": 2,
  "required_facts": ["identity.name", "contact.phone"],
  "conflict_policy": "manual",
  "discovery_ref": "golden-set-candidate-07",
  "labels": ["vertical:plumbing", "cohort:real-10", "corridor:mesa"]
}
```

Recorded fixture item:
```json
{
  "business_id": "clearwater-plumbing-demo",
  "source_url": "fixture://corpus/fixtures/clearwater-plumbing-demo.json",
  "archetype_hint": "trades",
  "authorization": { "basis": "recorded", "media_policy": "harvest_note_only", "contact_policy": "never", "publish_policy": "artifact_only", "claim_policy": "no_claim" },
  "priority": 3,
  "discovery_ref": "corpus/fixtures/clearwater-plumbing-demo.json"
}
```

Batch envelope example:
```json
{
  "batch_version": "fyd-batch@1",
  "batch_id": "btch_20260923_1941_synth_cohort1_a3f9c1d2",
  "cohort": "synthetic",
  "items": [ "..." ],
  "defaults": {
    "conflict_policy": "manual",
    "archetype_hint": null,
    "authorization": { "basis": "synthetic", "media_policy": "none", "contact_policy": "never", "publish_policy": "artifact_only", "claim_policy": "no_claim" },
    "priority": 3
  },
  "concurrency": { "max_items_in_flight": 25, "max_acquire_in_flight": 8, "per_host_rate_limit": "6/min" },
  "budgets": { "max_wall_minutes_per_item": 45, "max_bytes_per_item": 268435456, "max_model_calls_per_item": 12, "max_cost_usd_per_item": 2.50 }
}
```

## 2. The 14 batch stages

Each stage is a typed interface. A stage execution is identified by its deterministic work identity (section 4.1). The batch stages map onto the 12 single-build stages as noted; batch-only stages are DISCOVER and CLASSIFY, and NORMALIZE / OBJECTS / RELATIONSHIPS are the explicit batch boundaries carved out of single-build stage 4 (BUILD_GRAPH) so that dedup, object construction, and edge construction each get independent bounds, checkpoints, and failure accounting.

### Common stage interface

Every stage implements this envelope:

```ts
interface StageInput {
  batch_id: string;
  item_id: string;            // business_id
  stage: StageName;           // one of the 14 below
  attempt: number;            // 1-based; increments on retry
  lease_id: string;           // lease under which this attempt runs
  input_digests: Record<string, string>; // content digests of consumed stage outputs
  config: StageConfig;        // bounds + policy for this attempt
}

interface StageOutput {
  batch_id: string;
  item_id: string;
  stage: StageName;
  attempt: number;
  status: "ok" | "failed" | "skipped";
  output_digest: string;      // sha256 over canonical JSON of the stage payload
  artifacts: Record<string, string>; // artifact_name -> sha256 digest (content-addressed store)
  metrics: StageMetrics;      // durations, bytes, counts, peak memory
  warnings: Warning[];        // non-blocking findings with evidence refs
  failure?: StageFailure;     // present iff status == "failed"
}

interface StageFailure {
  failure_class: string;      // typed, from the stage's failure taxonomy
  message: string;            // human-readable, no secrets
  evidence_refs: string[];    // digests of preserved evidence
  retryable: boolean;         // safe-to-retry verdict for THIS failure instance
  first_seen_at: string;      // ISO-8601
}

interface StageMetrics {
  wall_ms: number;
  cpu_ms: number;
  peak_memory_mb: number;
  input_bytes: number;
  output_bytes: number;
  cache_hit: boolean;         // true if output was reused by idempotency lookup
  model_calls: number;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
}
```

### Stage definitions

**S1. DISCOVER** (batch-only; no single-build counterpart)
- Input: BatchItem (business_id, source_url, discovery hints), batch defaults.
- Output: `DiscoveryRecord`: { item_id, declared_sources: SourceDecl[] (1..32, compiled into the single-build manifest), discovery_provenance: { method, ref, observed_at }, discovery_warnings[] }.
- Behavior: validates the source_url (scheme, egress policy), compiles the SourceDecl list for the single-build manifest, records discovery provenance. For real cohorts: research only, no contact, no form submission. Discovery never invents sources: a source not declared here is never fetched downstream.
- Failure modes: invalid URL (scheme/host policy violation); host on egress denylist; robots/ToS pre-check failure; source_url unreachable at preflight. Failures here yield ACQUISITION_FAILED without invoking hostile-input workers.
- Maps to: manifest compilation feeding BuildBusiness stage 1.

**S2. ACQUIRE** (single-build stage 1)
- Input: DiscoveryRecord.sources, item budget.
- Output: `SourceArtifact[]`: { source_id, bytes_digest, byte_count, fetched_at, fetch_proof, rights_basis, failure_class? }.
- Behavior: hostile-input processor (section 10). Bounded fetch per source; per-source failures recorded, never silently dropped; pinned sha256 verified when present.
- Failure modes: unreachable, dns_failure, tls_failure, timeout, robots_block, paywall, digest_mismatch, budget_exceeded, hostile_content_detected, redirect_policy_violation, decompression_bomb, content_type_rejected. Zero ok artifacts moves the item toward ACQUISITION_FAILED.
- Maps to: BuildBusiness stage 1 ACQUIRE.

**S3. EXTRACT** (single-build stage 2)
- Input: SourceArtifact[].
- Output: `Observation[]`: { observation_id, source_id, fact_ref, value, evidence_span, claim_grade_hint } plus `leftovers_signal` and `dropped_entity_ledger`.
- Behavior: one observation per extracted fact, never merged across sources. Body-text facts with no structured extraction must emit a leftovers signal, not silence (ACQ GAP-4). Nameless entities emit dropped-entity records, never silent vanishes (ACQ GAP-5).
- Failure modes: zero observations (terminal contribution to ACQUISITION_FAILED); parse explosion (DOM/JSON limits hit: failure, not truncation without record); hostile payload in structured data (XSS/markup: sanitize and record, escalate to UNSAFE_SOURCE if it targets the render boundary).
- Maps to: BuildBusiness stage 2 EXTRACT_OBSERVATIONS.

**S4. NORMALIZE** (batch boundary carved from single-build stage 4)
- Input: Observation[].
- Output: `NormalizedClaim[]`: { claim_id, fact_ref, normalized_value, source_id, evidence_span, normalization_applied[] } plus `dedup_report` and `normalization_overflow` records.
- Behavior: value normalization (phone formats, hour formats, URL canonicalization, whitespace, case) and cross-observation dedup WITH a merge ledger. Normalization is value-level only: it never invents values and never merges across sources (merging across sources is RESOLVE's job).
- Failure modes: normalization overflow (cap hit: recorded overflow event, stage fails if the overflow would silently lose observations, per invariant I4); contradictory normalizations of the same fact flagged for RESOLVE.
- Maps to: the normalization/dedup slice of BuildBusiness stage 4 (object_quality_report.normalization_applied, dedup_merges).

**S5. EVIDENCE** (single-build stages 3 GRADE_CLAIMS + 6 ATTEST_PROVENANCE)
- Input: NormalizedClaim[].
- Output: `GradedClaim[]` with exactly one grade each (SUPPORTED / DERIVED / INFERRED / UNKNOWN), plus `EvidenceLedger`: { items, field_provenance } and `provenance_coverage` { graded_claims_total, with_evidence, coverage_ratio, by_grade }.
- Behavior: the grader refuses to emit SUPPORTED without a citation (throw on uncited SUPPORTED). Evidence laundering, overclaim, and unbound-claim findings are recorded as findings with evidence refs; identity/contact findings are blocking downstream. Every claim maps to >= 1 evidence item; coverage is computed, not asserted.
- Failure modes: unbound claims; evidence laundering; coverage_ratio below floor (0.80 hard floor fails the stage; 0.80..0.95 yields warnings; >= 0.95 required for GENERATED, see section 7); digest mismatch between pinned bytes and ledger.
- Maps to: BuildBusiness stages 3 and 6. Ordering note: grading precedes RESOLVE so that conflict resolution operates on graded claims and cannot weaken grades (evidence monotonicity, single-build invariant I2).

**S6. RESOLVE** (single-build stage 5)
- Input: GradedClaim[] with multi-source observations on the same fact.
- Output: `ConflictRecord[]`: { fact_ref, contenders[{source_id, value, trust, observed_at}], resolution, resolution_basis } plus resolved claim set. No silent winners: every multi-source disagreement becomes a conflict record with an explicit basis (ACQ GAP-6 lesson).
- Behavior: applies conflict_policy (owner_wins / newest_wins / manual). Under `manual`, unresolved identity/contact conflicts persist as unresolved and push the item toward IDENTITY_AMBIGUOUS or EVIDENCE_CONFLICT per section 7.
- Failure modes: resolution contradicts conflict_policy; silent pick (resolution with no basis: stage fails); unresolvable conflict (recorded, not papered over).
- Maps to: BuildBusiness stage 5 RESOLVE_CONFLICTS.

**S7. OBJECTS** (batch boundary carved from single-build stage 4)
- Input: resolved claim set, dropped-entity ledger.
- Output: `objects[]` with stable deterministic ids, schema, fields, visibility flags; `object_quality_report` { merges, normalization_applied, dropped_entities }; private objects listed by id only with `withheld: true`.
- Behavior: entity to object construction. The `publicGraph()` visibility boundary is enforced at this stage's output and re-asserted at VERIFY (single-build invariant I3). Private objects and owner-hidden fields never cross into public sections.
- Failure modes: zero public objects (blocks GENERATED); silent entity loss (no ledger entry: stage fails); unstable ids across identical inputs (determinism violation: stage fails, item quarantined for investigation).
- Maps to: the object-construction slice of BuildBusiness stage 4.

**S8. RELATIONSHIPS** (batch boundary carved from single-build stage 4)
- Input: objects[].
- Output: `relationships[]`: { relationship_id, subject, predicate, object, provenance_refs[], status } plus `relationship_quality_report` { reverse_edges_preserved, dropped_relationships[] }.
- Behavior: edge construction with both directions preserved (F5-CEILING first-loss lesson: `works_for` person-to-business edges must enter the people group; reverse-direction relationships are never dropped before expression). Every relationship carries provenance refs.
- Failure modes: reverse-direction loss without a dropped_relationship record (stage fails); dangling edges referencing unknown object ids (stage fails).
- Maps to: the relationship-construction slice of BuildBusiness stage 4.

**S9. CLASSIFY** (batch-only; feeds single-build stage 7)
- Input: objects[], relationships[], archetype_hint.
- Output: `CompositionProfile`: { strategy_family: `trades` | `professional` | `technology` | `unclassified`, composition_dimensions: {dimension: value}[], hint_divergence?: { hint, derived, basis } }.
- Behavior: derives the composition profile from evidence. The three strategy families are the only families; CLASSIFY never hand-codes new templates. Dimensions (e.g. service_catalog_depth, team_prominence, booking_model, menu_like_structure, inventory_like_structure) are measured from the graph and recorded. If the derived family diverges from archetype_hint, the divergence is recorded as a warning with basis; the derived family wins (hint is advisory). `unclassified` with a meaningful graph yields UNSUPPORTED per section 7 (honest, not a template hack).
- Failure modes: hint forced over evidence (stage fails: hints never override derived profiles); dimension measurement with no graph basis (stage fails).
- Maps to: input enrichment for BuildBusiness stage 7 PLAN_SITE, implementing the program's "planner composes from dimensions, never if-plumber-template-17" rule.

**S10. PLAN** (single-build stage 7)
- Input: CompositionProfile, objects[], relationships[], presentation_intent (facts untouched), design_tokens.
- Output: `SitePlan`: { pages, per-page section eligibility and order, composition_policy, archetype_stamp or null } plus `eligibility_report` (entity-driven variation evidence: the F5-CEILING fingerprint inputs).
- Behavior: eligibility evaluation is separated from section emission (F5-CEILING blame-boundary lesson: the planner records WHY a section is eligible; emission failures are the renderer's, recorded at RENDER/VERIFY).
- Failure modes: zero pages or zero home sections with a non-empty graph and a classified family (compositional failure: UNSUPPORTED per section 7); strategy pin without recorded owner intent (stage fails).
- Maps to: BuildBusiness stage 7 PLAN_SITE.

**S11. SITE_SPEC** (single-build stages 8 GENERATE_SPEC + 9 BIND_MEDIA)
- Input: SitePlan, objects[], relationships[], presentation_intent, media policy, rights_basis per source.
- Output: `SiteSpec`: { pages, sections, bindings, provenance block, spec_digest } plus `MediaBinding`: { hero or null, assets[], excluded_no_rights[] }.
- Behavior: generation must be byte-deterministic for identical inputs (QA-DET criterion). Media binding is honest-empty when no authorized media exists (typographic hero fallback); assets without rights_basis are excluded and listed in excluded_no_rights, never rendered with invented authorization (QA-TRUTH F-002). Media selection happens at this server seam, never inside the renderer (DEHPP R6).
- Failure modes: non-deterministic generation (stage fails, item quarantined: F-DET class); fabricated or misattributed rights (stage fails: F-SEC-adjacent, item quarantined); renderer-injected strings outside the binding model (stage fails: F-001 class).
- Maps to: BuildBusiness stages 8 and 9. Folding media binding into SITE_SPEC keeps one deterministic compilation boundary: spec digest covers bound media refs.

**S12. RENDER** (single-build stage 11, render execution slice)
- Input: SiteSpec, MediaBinding.
- Output: `RenderArtifact`: { html per page per viewport (desktop + 320/360/375/390/430), augmentation_plan (section anchors, inline cards, Ask FYD entries), render_digest }.
- Behavior: renders through the single canonical renderer, component registry, and design system (program architecture law). Motion never gates content (VQ-001 class: no opacity-0-until-scroll on content). No customer-specific JSX: any per-tenant code path detected in the render is a stage failure, not a warning.
- Failure modes: empty cards rendered (stage fails with visual evidence ref); fixed chrome occluding content (stage fails); motion gating content (stage fails); per-tenant JSX detected (stage fails); render output exceeds artifact byte cap (stage fails with evidence).
- Maps to: the render-execution slice of BuildBusiness stage 11 RENDER_PROVE.

**S13. VERIFY** (single-build stage 10 + stage 11 verification slice)
- Input: RenderArtifact, SiteSpec, objects[], EvidenceLedger.
- Output: `VerificationReport`: { renderable: boolean, validation_findings[], claim_classification[] (every rendered claim vs the binding model), visual_qa: { verdict, blockers[], majors[] }, determinism_proof: { equivalent, evidence }, seam_verdict: { clean | breached, evidence } }.
- Behavior: this stage SETS renderable. The verifier must run on the build's actual render path (QA-TRUTH architectural lesson: 100 percent miss rate on unverified paths is a stage failure here). Claim-honesty gates: no "observed" rendered as "Verified" (F-003), no rights inference presented as fact (F-002), no renderer-injected provenance strings (F-001). A seam breach (executable source content in public output, unescaped markup, private object in public output) sets renderable=false AND marks the item UNSAFE_SOURCE (section 7): evidence preserved, no retry, quarantine.
- Failure modes: verifier coverage gap on the item's render path (stage fails); determinism proof not equivalent (stage fails: F-DET, quarantine); seam breach (stage fails: F-SEC, quarantine, no retry).
- Maps to: BuildBusiness stage 10 VERIFY_RENDER_MODEL plus the proof slice of stage 11. Positioned after RENDER so verification operates on the actual rendered artifact.

**S14. PACKAGE** (single-build stage 12 REGENERATE_AND_CERTIFY + batch outcome assignment)
- Input: all 13 prior stage outputs and their digests.
- Output: `BatchItemResult`: { item_id, outcome (section 7), digest_chain_verified: boolean, outcome_evidence_refs[], queue_assignment (section 8), artifact_manifest, next_actions[] }.
- Behavior: verifies the digest chain across all stage outputs (any mismatch: outcome NEEDS_REVIEW with chain-divergence evidence, never silently repaired). Evaluates outcome predicates in the fixed order of section 7. Assigns the queue state per section 8. Emits next_actions with typed owners (factory / owner / human / sprint / convergence). Performs no new extraction, no new rendering. Regeneration semantics (stage 12 replay) apply when the batch reruns an item with a prior result: owner corrections replay over regenerated facts; divergence fails closed to NEEDS_REVIEW.
- Failure modes: digest chain mismatch; predicate evaluation error (item to QUARANTINED with evidence, never defaulted to GENERATED).
- Maps to: BuildBusiness stage 12 REGENERATE_AND_CERTIFY, plus batch outcome and queue assignment.

## 3. Per-stage contract: idempotent, resumable, observable, bounded, retryable

### 3.1 Idempotent

Work identity is deterministic: `work_id = sha256(batch_id | item_id | stage | canonical(input_digests) | batch.idempotency_salt?)`. Before executing, the worker looks up work_id in the checkpoint store. On hit, the stored StageOutput is returned with `metrics.cache_hit = true` and no recomputation. Stage implementations must be pure functions of (inputs, pinned source bytes): no wall-clock reads, no randomness, no ambient config inside stage logic. Model calls inside a stage use a pinned model id and temperature 0, and the model id is part of the input digests so a model change invalidates the cache honestly instead of silently reusing stale outputs.

### 3.2 Resumable

Every stage output is persisted with its content digest before the next stage starts (single-build invariant I5, extended to batch). A crashed or killed item resumes from the last persisted stage output, never from zero: the scheduler recomputes work_ids for remaining stages from persisted input digests and skips completed ones. Partial stage outputs are never treated as complete: a stage output is complete only when its digest is recorded in the checkpoint store's committed index.

### 3.3 Observable

Every stage execution appends typed events to PING through the convergence substrate's event/evidence interface (single-build dependency S1). The batch layer defines no event store of its own: events carry the batch correlation id (`batch_id`, `item_id`, `stage`, `work_id`, `attempt`) and are projections of PING events, never a parallel ledger. Minimum event set per stage attempt: `stage_started`, `stage_heartbeat` (long stages), `stage_completed`, `stage_failed`, `stage_retried`, `stage_cache_hit`. Minimum metrics per attempt: the StageMetrics interface (section 2). Queue-level gauges (section 11) are derived from checkpoint-store state, not from a separate counter system. The morning report (program section) is computed from these events and gauges.

### 3.4 Bounded

Every stage attempt runs under hard bounds. Bounds are enforced by the worker supervisor (process cgroup/ulimit style limits), not by the stage code trusting itself. Exceeding any bound kills the attempt, records a `bound_exceeded` failure with the measured peak, and the failure is retryable only if the bound was environmental (wall-time on a slow host) rather than input-driven (memory growth proportional to a hostile input: that input goes to quarantine).

Stage boundedness table (defaults; the batch manifest budgets may tighten, never loosen):

| Stage | CPU seconds | Memory MB | Wall seconds | Max response size | Max response count | Notes |
|---|---|---|---|---|---|---|
| S1 DISCOVER | 60 | 512 | 600 | 1 MB manifest JSON | 500 candidates checked | Search-rate limited; no fetching |
| S2 ACQUIRE | 120 | 1024 | 900 | 25 MB raw per source; 200 MB decompressed total | 32 sources | Hostile-input processor; section 10 |
| S3 EXTRACT | 180 | 2048 | 1200 | 10 MB text per source; 50k observations per item | 50k observations | Parse limits enforced |
| S4 NORMALIZE | 120 | 2048 | 900 | 50k claims in; 50k claims out | 50k claims | Overflow recorded, never silent |
| S5 EVIDENCE | 180 | 2048 | 1200 | 50k graded claims; ledger 100k refs | 50k claims | Coverage floor 0.80 |
| S6 RESOLVE | 60 | 1024 | 600 | 10k conflict records | 10k conflicts | No silent winners |
| S7 OBJECTS | 120 | 2048 | 900 | 5k objects | 5k objects | Stable-id determinism check |
| S8 RELATIONSHIPS | 120 | 2048 | 900 | 10k relationships | 10k relationships | Reverse edges preserved |
| S9 CLASSIFY | 60 | 1024 | 600 | 1 composition profile | 3 families + dimensions | Hint never overrides |
| S10 PLAN | 120 | 1024 | 900 | 1 site plan, 200 sections max | 200 sections | Eligibility ledger |
| S11 SITE_SPEC | 180 | 2048 | 1200 | 5 MB canonical spec JSON | 1 spec + media manifest | Byte-determinism asserted |
| S12 RENDER | 300 | 4096 | 1800 | 200 MB total HTML | 6 viewports x pages | Single renderer only |
| S13 VERIFY | 300 | 4096 | 1800 | 500 MB incl. captures | findings unbounded but paged | Sets renderable |
| S14 PACKAGE | 60 | 512 | 600 | 250 MB package | 1 result record | No new extraction |

Response-size caps count canonical serialized bytes. A stage that would exceed its max response count fails with an `overflow` failure class and records how many items were dropped from processing (never silently).

### 3.5 Retryable where safe

Retry policy per stage attempt: max 3 attempts, exponential backoff (base 60s, factor 2, full jitter), attempt timeout = the stage wall bound. Retryable failure classes: `timeout`, `worker_death`, `transient_network`, `rate_limited`, `bound_exceeded_environmental`, `checkpoint_write_conflict`. NEVER retried: `seam_breach` (F-SEC), `hostile_content_detected` where the payload targets the render boundary, `digest_mismatch`, `determinism_mismatch`, `policy_violation` (scheme/egress/redirect), `hint_override_attempt`, `silent_winner_detected`, `per_tenant_jsx_detected`. Non-retryable failures move the item directly to its outcome (usually UNSAFE_SOURCE or QUARANTINED) with evidence preserved. Deterministic stages (S3..S12 per single-build invariant I1) are always safe to retry with identical inputs because recomputation reproduces the same output; the idempotency lookup makes most retries free. ACQUIRE retries are bounded and counted against per-host rate limits so a retry storm never becomes a self-inflicted DDoS.

## 4. Run durability

A run is durable when worker death, machine sleep, or one malformed site can never destroy it. The mechanisms:

### 4.1 Checkpointing

The checkpoint store is a content-addressed artifact store plus a committed index mapping work_id to StageOutput digest. Writes are atomic: the artifact bytes land first, then the index entry commits. Readers only see committed entries. The digest chain (S1..S14 output digests hashed in order) is verified at PACKAGE; a broken chain fails the item to NEEDS_REVIEW, never to GENERATED. Checkpoints live under `~/workspace/fyd-factory/batch/runs/<batch_id>/` (section 13). Bulk artifacts never live in /tmp (single-build invariant I7, storage law).

### 4.2 Leases and heartbeats

Every in-flight item holds a lease: `{ lease_id, item_id, stage, worker_id, issued_at, expires_at, heartbeat_interval_s: 30, ttl_s: 120 }`. The worker heartbeats every 30s; the coordinator renews the lease while heartbeats arrive. A lease that expires without heartbeat is reclaimed: the item returns to the ready queue and another worker resumes it from the last committed checkpoint. Lease expiry is the ONLY worker-death detector; there is no separate health channel to get out of sync. A worker that comes back after its lease expired must not write stage outputs under the old lease_id: writes are lease-checked, and stale-lease writes are rejected and logged (this is what makes duplicate execution safe).

### 4.3 Worker death and machine sleep

Worker death and machine sleep are the same event to the coordinator: heartbeats stop, the lease expires, the item is requeued, and a new worker resumes from the last committed checkpoint via idempotency lookup. Bounded total work per item: attempts are capped (section 3.5) and a lease may be renewed at most `max_lease_renewals` (default 40, roughly covering the longest stage plus retries) before the item is declared stalled and moved to dead-letter with evidence. On coordinator restart, it rebuilds queue state by scanning the committed index: any item with no terminal outcome and no live lease returns to ready. No in-memory-only state anywhere in the critical path.

### 4.4 Per-site isolation

Each item's stages run in an isolated worker (separate process, resource bounds from section 3.4, private scratch directory with quota). Workers share nothing writable except through the checkpoint store's atomic commits. One malformed site (pathological HTML, hostile payload, corrupt fixture) can fail its own stages but cannot corrupt another item's artifacts, cannot exhaust shared memory (per-worker caps), and cannot poison the checkpoint index (lease-checked, content-addressed writes). A stage crash (segfault, OOM-kill) is recorded as `worker_death` and retried per policy; two consecutive crashes on the same stage with the same input digest move the item to quarantine for human inspection, not into an infinite retry loop.

### 4.5 Dead-letter and quarantine

After max attempts on any stage, the item moves to the dead-letter record: `{ item_id, stage, attempts: [StageFailure...], input_digests, evidence_refs, dead_lettered_at }`. Dead-letter is a triage input, not a trash can: the coordinator classifies each dead-letter item into an outcome (section 7) or QUARANTINED (section 8) within one triage pass. Quarantine holds items that must never auto-retry: UNSAFE_SOURCE items, determinism mismatches, repeated crash loops, malformed inputs that fail input validation. Release from quarantine requires a human, a recorded rationale, and (for determinism/security items) a re-verification run.

### 4.6 Backpressure and run-level watchdog

The run never accepts unbounded work: `max_items_in_flight` (default 25), `max_acquire_in_flight` (default 8, the hostile stage is the scarcest), per-host rate limits (default 6 requests/minute/host, jittered). If the quarantine rate exceeds 20 percent of started items in any rolling hour, the coordinator pauses new DISCOVER/ACQUIRE intake (backpressure), keeps in-flight items draining, and raises an alert. The run itself is never auto-killed by the watchdog: pausing intake is the bounded response. A run reaches a terminal state (COMPLETED | COMPLETED_WITH_QUARANTINE | FAILED) only when every item has a terminal outcome or is quarantined; FAILED requires a coordinator-level fault (checkpoint store unavailable, substrate interface down), never a bad item.

## 5. Harvested semantics: what we take from Temporal/Trigger.dev and what we do not surrender

The build-program coordinator owns the Temporal/Trigger.dev harvest lanes and the engine decision. This spec consumes that decision via the state file. The table below fixes the semantic mapping so the harvest cannot silently redefine factory authority.

| Harvested concept | Batch meaning | Owned by |
|---|---|---|
| Workflow | A BatchRun: the 14-stage DAG over items, driven by checkpoint state | Factory (this spec) |
| Activity | One stage attempt under the typed interface (section 2) | Factory |
| Retry policy | Section 3.5: per-stage attempts, backoff with jitter, typed retryable classes | Factory |
| Timeout | Section 3.4: hard per-stage wall/CPU/memory/response bounds | Factory |
| Heartbeat | Section 4.2: 30s worker heartbeat renewing the 120s lease | Factory |
| Idempotency key | Section 3.1: deterministic work_id from batch/item/stage/input digests | Factory |
| Concurrency limit | Section 4.6: max in-flight items, max concurrent ACQUIRE, per-host rate limits | Factory |
| Rate limit | Per-host fetch pacing with jitter; backoff on 429 is a hard stop for that host in this run | Factory |
| Backpressure | Section 4.6: quarantine-rate watchdog pauses intake; queue depth gates DISCOVER | Factory |
| Checkpoint | Section 4.1: content-addressed stage outputs + committed index | Factory |
| Resume | Section 4.3: lease expiry plus idempotency lookup; resume from last committed stage | Factory |
| Dead-letter | Section 4.5: typed dead-letter records with failure evidence, triaged to outcomes | Factory |
| Human task / human gate | Section 8: READY_FOR_REVIEW and QUARANTINED queues; humans move items, automation never does | Factory + humans |
| Signal | Run control plane: pause/resume/cancel intake, adjust concurrency within declared maxima | Factory |
| Observability | Section 3.3: typed events and metrics; morning-report gauges derived from checkpoint state | Factory |

What is NOT surrendered to any vendor or duplicated as a second system:

- Canonical identity issuance (business ids, object ids, build ids) stays with the PING substrate (single-build dependency S3). The batch layer mints no identities; it threads the ones it is given.
- The event/evidence authority stays with PING (single-build dependency S1). Batch stage events are PING events with batch correlation ids. There is exactly one event system.
- Claim authority (grades, the throw-on-uncited-SUPPORTED rule) stays with the factory's EVIDENCE stage under LANE-ASK semantics; no external service re-grades claims.
- The capability model and visibility projection stay canonical: `publicGraph()` boundary semantics come from the convergence substrate (single-build dependency S2), enforced at S7 and re-asserted at S13.
- Transition rules (which outcome or queue state may follow which) are fixed in sections 7 and 8 of this spec. No engine may invent transitions.
- History (the owner correction journal, supersession chains) stays with LANE-OWNER replay semantics; PACKAGE replays, never rewrites.

If the coordinator's harvest decision introduces an engine, the engine is an execution substrate for the semantics above, not a redefinition of them. Any engine behavior that contradicts this section is a defect in the integration, not an update to the spec.

## 6. Acquisition workers are hostile-input processors

Crawl4AI's SSRF history makes this non-negotiable. Every S2 ACQUIRE worker (and any S1 preflight fetch) runs under these bounds. Violation of any network rule fails the source with a typed failure class and records the attempted target (redacted of credentials) as evidence.

- Resource bounds: section 3.4 row S2 (120 CPU seconds, 1024 MB, 900 wall seconds per item across its sources; plus per-fetch 120s timeout).
- Filesystem: read-only except a private scratch directory with a 512 MB quota. Fetched bytes are never executed, never passed to a shell, never used as code. Parsers run with entity-expansion limits (billion-laughs class: max 10k entity expansions, max 10 MB expanded XML).
- Network: egress policy is manifest-declared hosts only. Denied unconditionally: private ranges (10/8, 172.16/12, 192.168/16), loopback, link-local (169.254/16) including the cloud metadata address 169.254.169.254, IP literals unless the manifest declares that exact literal, and any host resolved through a DNS answer that differs from the pinned pre-resolution answer (DNS rebinding guard: resolve once before fetch, pin the IP, abort if the connection IP differs).
- Schemes: https only. http is allowed only when the manifest declares it and only after an https upgrade attempt fails; the downgrade is recorded as a warning. Denied: file, data, javascript, ftp, gopher, and any scheme with control characters (LANE-SEC choke point: resolveSafeLink allowlist at acquisition).
- Redirects: max 5 hops; every hop re-applies scheme, egress, and SSRF rules; https to http downgrade on redirect is a `redirect_policy_violation` failure, not a follow.
- Response limits: 25 MB raw per source; 200 MB decompressed total with a 40:1 decompression ratio cap (zip-bomb guard); content-type allowlist (text/html, application/json, application/ld+json, application/xml, text/xml, rss/atom types, image types with a 10 MB per-image cap); anything else is `content_type_rejected`.
- Parse limits (S3 inherits the same posture): max DOM nodes 500k, max text bytes 10 MB per source, max JSON depth 100, regex evaluations time-boxed.
- Credential hygiene: URLs containing userinfo (`user:pass@host`) are rejected at DISCOVER; any credential-like string observed in fetched content is redacted before it reaches logs, metrics, or evidence spans.
- Artifact limits: observations and evidence items are capped per section 3.4; overflow is a recorded `overflow` failure with counts, never silent truncation.

## 7. Per-presence outcomes

Exactly eight outcomes. Predicates are evaluated in the fixed order below against the 14 stage outputs. The first predicate that holds wins. Every predicate is a pure function of stage outputs and is recorded with its evidence refs in the BatchItemResult.

1. **UNSAFE_SOURCE**: S13 seam_verdict is `breached`, OR S2/S3 classified a source as hostile with a render-boundary-targeting payload. Evidence preserved, no retry, item to QUARANTINED. Predicate: `seam_breach == true OR hostile_render_targeting == true`.
2. **ACQUISITION_FAILED**: S2 produced zero SourceArtifacts with status ok, OR S3 produced zero observations across all sources. Mirrors single-build ACQUISITION_BLOCKED. Predicate: `acquire_ok_count == 0 OR observation_count == 0`.
3. **IDENTITY_AMBIGUOUS**: S6 left an unresolved conflict on an identity fact (business name; name vs URL mismatch across 2+ sources at trust directory or higher), OR S7 could not issue a stable business identity (nameless-entity case with no resolution path). Predicate: `exists unresolved conflict on identity.* OR stable_identity == false`.
4. **EVIDENCE_CONFLICT**: identity is stable, no unsafe/acquisition predicate fired, and S6 left an unresolved conflict that blocks honest claim composition (contact facts under `manual` policy; hours/phone with both contenders SUPPORTED). Predicate: `stable_identity AND exists unresolved conflict on non-identity fact AND conflict blocks honest claims`.
5. **UNSUPPORTED**: the graph is meaningful but S10 emitted zero pages/sections for compositional reasons (S9 family `unclassified` with a non-trivial graph; required structure the planner cannot express), not for data-missing reasons. Predicate: `object_count > 0 AND plan_pages == 0 AND failure_class == compositional`.
6. **NEEDS_REVIEW**: the artifact pipeline completed but a human judgment gates any owner-facing use: determinism proof inconclusive (not failed), INFERRED grades on contact-adjacent facts, visual-QA majors on identity-adjacent sections, conflicts resolved under owner_wins/newest_wins with both contenders at trust directory or higher, or PACKAGE digest-chain divergence. Predicate: `pipeline_complete AND review_gate_findings > 0 AND no higher-priority predicate holds`.
7. **GENERATED_WITH_WARNINGS**: meets every GENERATED condition except warnings are non-empty, resolved conflicts have contenders worth surfacing, non-required missing information exists, or visual-QA majors (non-blocker, non-identity-adjacent) exist. Predicate: `meets_generated_conditions AND (warnings > 0 OR surfaced_conflicts > 0 OR non_required_missing > 0 OR visual_majors > 0)`. Mirrors single-build READY_WITH_WARNINGS. Warnings on identity, contact, or claim-honesty facts are blocking and cannot land here (they route to NEEDS_REVIEW or a FAILED-class outcome per the single-build contract).
8. **GENERATED**: all 14 stages completed; digest chain verifies; renderable true; zero validation findings; zero visual-QA blockers; provenance coverage_ratio >= 0.95 for SUPPORTED+DERIVED claims; every identity and contact field carries >= 1 provenance ref; zero unresolved conflicts on identity/contact facts; claim-honesty gates clean (no F-001/F-002/F-003 class findings). Mirrors single-build READY.

Outcome to single-build status mapping: GENERATED to READY, GENERATED_WITH_WARNINGS to READY_WITH_WARNINGS, NEEDS_REVIEW to a human-gated hold (no single-build equivalent; the single-build contract's NEEDS_OWNER_INPUT covers owner decisions, NEEDS_REVIEW covers factory-internal human judgment), ACQUISITION_FAILED to ACQUISITION_BLOCKED, IDENTITY_AMBIGUOUS and EVIDENCE_CONFLICT to NEEDS_OWNER_INPUT subtypes (recorded as subtypes so the owner path knows which decision is needed), UNSAFE_SOURCE to FAILED subtype F-SEC, UNSUPPORTED to a batch-only honest terminal (no single-build equivalent; it means the composition dimensions do not cover this business yet, which is program-level signal for the planner, not a data failure).

## 8. Queue states

Four queue states. Queues are derived views over item outcomes plus human actions, computed from checkpoint state, never a separate system of record.

- **NOT_READY**: items with outcomes ACQUISITION_FAILED, IDENTITY_AMBIGUOUS, EVIDENCE_CONFLICT, UNSUPPORTED, or awaiting scheduled retry/info. Automation may requeue ACQUISITION_FAILED items for a bounded reacquire pass (max 2 reacquire passes per item, 24h apart, counted in budgets); humans may supply missing facts or resolve conflicts, which resumes the item at S6 via a new attempt with the human input recorded as an owner_assertion source. Automation never moves an item out of NOT_READY into a review or claim queue on its own.
- **READY_FOR_REVIEW**: items with outcomes GENERATED_WITH_WARNINGS or NEEDS_REVIEW. This is the human review worklist. Reviewers record one of: APPROVED (item becomes eligible for READY_FOR_OWNER_CLAIM), APPROVED_WITH_NOTES (eligible, notes attached to the result), NEEDS_REWORK (item returns to NOT_READY with a typed rework directive; the rework resumes at the named stage, never from zero), or ESCALATE (item to QUARANTINED with rationale). Review throughput and decision distribution are morning-report metrics.
- **READY_FOR_OWNER_CLAIM**: items with outcome GENERATED, or human-APPROVED GENERATED_WITH_WARNINGS / NEEDS_REVIEW. Entry requires either the GENERATED predicate or a recorded human APPROVED decision: automation cannot promote an item here. The item carries an owner-claim artifact package (preview, provenance summary, claim flow reference). The owner claim flow itself is authenticated and fail-closed (single-build LANE-OWNER: unverified owner identity means owner-mode assertions are not accepted). Items with claim_policy `no_claim` (synthetic, recorded) never enter this queue.
- **QUARANTINED**: items with outcome UNSAFE_SOURCE, determinism mismatches, repeated crash loops, malformed inputs, or human ESCALATE. Only a human may release an item from quarantine, with a recorded rationale and, for security/determinism items, a successful re-verification run. Automation never auto-requeues from quarantine. Quarantine rate is a first-class program metric (cohort gating in section 12 watches it).

### Authority discipline

Automate effort aggressively: 500 acquisitions, 500 renders, 500 evaluations run without human touch. Delegate authority conservatively: no contact is ever initiated (contact_policy is always `never` in this spec version), no publish is ever authorized (publish_policy is always `artifact_only`), no owner claim is ever made on anyone's behalf, no outreach message is ever sent by the factory. There is no AUTO_EMAIL_5000 and no quieter version of it: prepared is not contact authorized. "Safe human-reviewed outreach candidates" in the morning report is a derived, human-gated list: candidates are surfaced for Nolan's review, and any contact happens only through Nolan's explicit, separate authorization outside this spec. Queue transitions that confer authority (APPROVED to READY_FOR_OWNER_CLAIM, quarantine release, outreach candidacy) are human-only transitions, recorded with identity and rationale. The factory's job ends at a correct, certified, honestly-graded artifact sitting in the right queue.

## 9. What the batch layer does not own

Restated so no future integration can blur it: the batch layer owns work scheduling, stage execution, checkpointing, leases, retries, dead-letters, queues, and measurement. It does not own canonical identity issuance, the event/evidence authority, claim grades, the capability model, visibility projection semantics, owner history and correction journals, or publish authorization. Those live with PING and the convergence substrate per the single-build contract sections 6.2 and 8. The batch layer consumes the substrate's interfaces (S1 event/evidence append, S2 publicGraph boundary, S3 identity issuance) and records substrate gaps as typed next_actions with owner `convergence`, never as workarounds. The build-program coordinator owns the Temporal/Trigger.dev harvest lanes; this spec consumes the coordinator's decision via the state file and treats any engine as an execution substrate for section 5's semantics, not as a redefinition of them.

## 10. Cross-stage invariants (batch extensions of the single-build invariants)

- B1. Determinism end to end: the same batch manifest plus the same source bytes produce the same per-item outcomes and the same artifact digests. Byte-identical where QA-DET proved equivalence.
- B2. No silent drops at batch scope: every item that enters the batch leaves with a terminal outcome or sits in QUARANTINED with evidence. An item with no outcome after the run closes is a coordinator defect, reported as FAILED for the run, never rounded away.
- B3. One item's failure never changes another item's outcome (per-site isolation, section 4.4). Shared caches (idempotency lookups) are keyed by input digests, so a poisoned input cannot poison another item's cache entry.
- B4. Evidence monotonicity holds across retries and resume: a retry may add attempts, never remove or weaken committed stage outputs or provenance refs.
- B5. Honest empty at batch scope: cohorts report what they measured, including zeros. A cohort with 40 percent ACQUISITION_FAILED is reported as 40 percent ACQUISITION_FAILED, not as a smaller successful cohort.
- B6. Cost and measurement honesty: model calls, tokens, wall time, and cost are measured per stage attempt from the worker supervisor, not self-reported by stage code. The morning report's cost/site is computed from these measurements.
- B7. Synthetic discipline: synthetic items are labeled `synthetic` in every artifact and report. Synthetic data is for testing only and is never presented as a real prospect, never enters READY_FOR_OWNER_CLAIM, and never appears in outreach candidacy.

## 11. Observability and measurement

Per-stage events and metrics (section 3.3) feed these run-level gauges, all derived from checkpoint-store state:

- items by stage (in-flight distribution), queue depths (NOT_READY, READY_FOR_REVIEW, READY_FOR_OWNER_CLAIM, QUARANTINED), dead-letter count by stage and failure class.
- p50/p95/p99 stage latency and per-item end-to-end latency; throughput (items/hour); retry rate; idempotency cache hit rate; lease expiry count (worker-death proxy); browser escalation rate (ACQUIRE fallback to rendered fetch, counted and capped).
- failure taxonomy distribution across the 8 outcomes; quarantine rate (rolling 1h and cumulative); determinism mismatch count (must be zero; any nonzero is a program-level alert).
- model calls per site, tokens per site, estimated cost per site; memory/CPU peaks per stage (p95).
- composition coverage: S9 family distribution and dimension histograms (the program's planner signal); customer-specific code detections (must be zero); unsupported rate by vertical.
- owner-override regen survival (PACKAGE replay divergence count); Ask FYD supported/refusal counts per item (program hierarchy metric, measured at VERIFY claim classification).

These are exactly the inputs the program's morning report requires. The report is computed, not hand-written.

## 12. Cohorts and escalation gates

Cohort order is fixed: first 5,000 synthetic/recorded graph compilation jobs, then real cohorts 10, 25, 50, 100, 500. Escalation from one cohort to the next requires the previous cohort's failure distribution to be understood, which means:

- Every outcome class has named owners for its top failure classes (factory fix, sprint dependency, convergence dependency, or accepted-as-honest).
- Quarantine rate below 5 percent cumulative, or every quarantined item has a recorded root cause and a fix or accept decision.
- Zero determinism mismatches, zero customer-specific code detections, zero seam breaches (any breach pauses the program, not just the cohort).
- p95 per-item cost and latency within the batch budgets, or budgets explicitly revised with Nolan's approval.
- The golden set (25-50 manually adjudicated, LANE-GOLDEN-SET) shows no correctness regression versus the prior cohort.

Synthetic cohorts measure throughput and robustness; they prove the machine. Real cohorts measure acquisition reality; they prove the market. Neither is a website count: the program counts certified artifacts and understood failures, not published sites.

## 13. Storage layout

All batch state lives under `~/workspace/fyd-factory/batch/`. Storage law applies (single-build invariant I7).

```
batch/
  BATCH-FACTORY-SPEC.md        # this document
  runs/<batch_id>/
    batch-manifest.json        # canonical input manifest
    checkpoints/               # committed index: work_id -> StageOutput digest
    artifacts/<sha256-prefix>/ # content-addressed stage artifacts
    leases/                    # live lease records
    dead-letter/               # dead-letter records with evidence refs
    outcomes/                  # per-item BatchItemResult records
    queues/                    # derived queue views (recomputable)
    metrics/                   # aggregated gauges and morning-report inputs
```

Queue views are derived and recomputable from outcomes plus human-action records; they are cached for convenience, never the system of record. The committed checkpoint index is the system of record for stage completion; PING is the system of record for events and evidence.

## 14. Open items for the parent coordinator

- O1. Re-certify this DRAFT against the Phase 17 golden-path plan on delivery (publish gate conditions become additional conjuncts on the GENERATED predicate; publish authorization stays out of scope until then).
- O2. Confirm the S5 coverage floor (0.80) and the GENERATED threshold (0.95), matching the single-build contract's open item O2.
- O3. Confirm default concurrency and budget values in sections 1.4 and 3.4 against the first synthetic cohort's measured capacity.
- O4. The build-program coordinator's Temporal/Trigger.dev decision arrives via the state file; on arrival, verify the engine implements section 5's semantics without redefining section 9's authority boundaries, and record the verification.
- O5. Decide whether S9 CLASSIFY's composition dimensions need a lane to formalize the dimension vocabulary before the first real cohort, or whether measured dimensions from the synthetic 5,000 are sufficient input.
- O6. Human review staffing for READY_FOR_REVIEW throughput: the review queue is the authority bottleneck by design; size reviewer capacity before the real-100 cohort.
