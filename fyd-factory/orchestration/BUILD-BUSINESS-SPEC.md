# BuildBusiness(sourceManifest) Orchestration Contract

Version: 1.0 (DRAFT, pending Phase 17 golden-path plan)
Date: 2026-09-23
Lane: LANE-ORCH-SPEC
Authority note: This document defines the orchestration contract only. It references the constitutional sprint Phase 17 golden-path plan and the convergence wave substrate as dependencies and does NOT duplicate their work (see section 6).

## 1. Purpose

`BuildBusiness(sourceManifest)` is the single entry point of the FYD factory. It takes a sourceManifest describing a business and the sources allowed to describe it, runs 12 ordered stages, and returns one typed BuildBusiness result with a terminal state. The contract is deterministic: the same manifest plus the same source bytes produce the same result, byte-identical where the QA-DET lane proved equivalence.

FYD laws bind every stage: Ask FYD is real or hidden; motion never gates content; private objects never cross the public boundary; no All Objects explorer; MOBILE IS NOT FYD-LITE; no customer-specific JSX; evidence over assertion; no em dashes in user-facing copy.

## 2. sourceManifest schema

The manifest is the ONLY authorized input surface. A stage may read only what the manifest declares plus artifacts produced by earlier stages.

### 2.1 Top-level fields

| Field | Required | Type | Meaning |
|---|---|---|---|
| manifest_version | yes | string, enum `fyd-manifest@1` | Schema version of this manifest. Unknown versions are rejected in stage 1. |
| business_id | yes | string, slug `[a-z0-9-]{1,64}` | Stable tenant identity. Threaded through data, metadata, hero media, Ask FYD (DEHPP R1: thread one tenant id; the value is tenant data). |
| business_name | optional | string | Declared display name. If absent, stage 4 must derive it from evidence or the build degrades to NEEDS_OWNER_INPUT. Never invented. |
| sources | yes | array of SourceDecl, 1..32 entries | Every source the pipeline may ingest. A source not listed here is never fetched, even if a URL is discovered inside another source. |
| required_facts | optional | array of FactRef | Facts the owner (or caller) declares must be present for the build to reach READY. Example: `["contact.phone", "location.address"]`. Unmet required facts push terminal state to NEEDS_OWNER_INPUT. |
| conflict_policy | optional | enum `owner_wins` \| `newest_wins` \| `manual` (default `manual`) | Default resolution for source conflicts (stage 5). `manual` means unresolved identity/contact conflicts block READY. |
| owner_identity | optional | OwnerIdentityRef | Binds an authenticated owner for stage 12 corrections. Unset means demo/unverified: owner-mode fail-closed applies (LANE-OWNER: default provider is explicitly unverified). |
| presentation_intent | optional | PresentationIntent | Owner voice layered OVER the compiled spec, facts untouched (DEHPP R5 KEEP). Applied in stage 8 after generation. |
| design_tokens | optional | DesignTokens | Tenant theme tokens. Values flow to React style props only; never executable content (LANE-SEC residual 4). |
| visibility_overrides | optional | array of VisibilityRule | Per-fact public/hidden decisions. Conservative defaults hold; business name cannot be hidden (LANE-OWNER visibility-policy). |
| regeneration_of | optional | string (build_id) | When set, stage 12 replays the prior build's owner correction journal instead of rebuilding from zero (LANE-OWNER replay semantics). |
| budget | optional | Budget | Caps: max_sources_bytes, max_stages_minutes, max_media_assets. Stage 1 enforces byte caps before fetch. |

### 2.2 SourceDecl

| Field | Required | Type | Meaning |
|---|---|---|---|
| source_id | yes | string, unique within manifest | Referenced by observations, evidence, conflicts. |
| kind | yes | enum `website` \| `directory_profile` \| `review_feed` \| `owner_assertion` \| `fixture` \| `sos_filing` | Acquisition channel. |
| url | yes for website/directory_profile/review_feed/sos_filing | string (https only) | Fetch target. resolveSafeLink allowlist applies at acquisition: http/https only, control characters rejected (LANE-SEC choke point). |
| fixture_ref | yes for fixture | path or digest | Redacted fixture, e.g. `corpus/fixtures/clearwater-plumbing-demo.json`. |
| fetched_at | no | ISO-8601 | When the caller pre-fetched the bytes. If absent, stage 1 fetches and pins the digest. |
| sha256 | no | hex64 | Pinned source digest. If present, stage 1 verifies fetched bytes against it and fails closed on mismatch (GOLDEN-REFERENCE lineage: pinned digest 76766d18.. over 139,618 bytes). |
| trust | no | enum `owner` \| `first_party` \| `directory` \| `third_party` (default `third_party`) | Feeds conflict resolution priority in stage 5. Never presented as verification; "observed" never renders as "Verified" (QA-TRUTH F-003). |
| rights_basis | no | string | Legal basis for media reuse. Absent means media from this source is not eligible for hero/gallery selection (QA-TRUTH F-002: no policy inference presented as observed fact). |

### 2.3 Examples

Minimal owner-declared build:
```json
{
  "manifest_version": "fyd-manifest@1",
  "business_id": "clearwater-plumbing-demo",
  "sources": [
    { "source_id": "site", "kind": "fixture", "fixture_ref": "corpus/fixtures/clearwater-plumbing-demo.json", "trust": "owner" }
  ],
  "required_facts": ["identity.name", "contact.phone"],
  "conflict_policy": "manual"
}
```

Website ingestion build:
```json
{
  "manifest_version": "fyd-manifest@1",
  "business_id": "desert-bloom-landscaping",
  "business_name": "Desert Bloom Landscaping",
  "sources": [
    { "source_id": "homepage", "kind": "website", "url": "https://desert-bloom.example.com/", "trust": "first_party", "rights_basis": "owner-authorized" },
    { "source_id": "gbp", "kind": "directory_profile", "url": "https://maps.example.com/place/desert-bloom", "trust": "directory" }
  ],
  "required_facts": ["identity.name", "contact.phone", "location.city"],
  "conflict_policy": "owner_wins"
}
```

## 3. The 12 factory stages

Each stage lists: name, input, output, failure modes, terminal contribution (how it moves the build toward a terminal state). Stages run in order; a stage starts only after its predecessor's output is persisted. All stage outputs are content-addressed (sha256 over canonical JSON) so reruns are resumable and idempotent.

### Stage 1. ACQUIRE

- Input: `sourceManifest.sources`, `budget`.
- Output: `SourceArtifact[]`: { source_id, bytes_digest (sha256), byte_count, fetched_at, fetch_proof, rights_basis }.
- Failure modes: source unreachable (network, DNS, timeout); robots/ToS block; paywall/login wall; pinned sha256 mismatch (fetch does not match manifest digest); budget exceeded. Each failure is recorded per source, not silently dropped.
- Terminal contribution: if zero sources yield bytes, terminal state becomes ACQUISITION_BLOCKED. Partial acquisition continues with a warning per failed source.

Lane ground: corpus acquisition fixtures (`corpus/gen_acq_fixtures.py`, `corpus/validate-acq.mts`, manifest `corpus/manifests/acquisition.json`) define the supported source shapes (nested @graph, minimal JSON-LD, OG-heavy, metadata-poor, multi-location, person-heavy, service-heavy, conflicting-source) and the 6 schema gaps (GAP-1..GAP-6) that are stage-4/stage-5 inputs, never papered over.

### Stage 2. EXTRACT_OBSERVATIONS

- Input: `SourceArtifact[]`.
- Output: `Observation[]`: { observation_id, source_id, fact_ref, value, evidence_span, claim_grade_hint }. One observation per extracted fact, never merged across sources here.
- Failure modes: body-text facts produce zero observations with no leftovers signal (ACQ GAP-4: must emit a leftovers signal, not silence); entity with no name vanishes (ACQ GAP-5: the nameless Dispatcher case; emit a dropped-entity record, never a silent vanish).
- Terminal contribution: if total observations equal zero across all sources, terminal state becomes ACQUISITION_BLOCKED (nothing to build from). The leftovers signal and dropped-entity ledger feed `missing_information` and `warnings`.

### Stage 3. GRADE_CLAIMS

- Input: `Observation[]`.
- Output: `GradedClaim[]`: every claim carries exactly one grade: SUPPORTED (restates evidence, cites >= 1 evidence item; the grader refuses to emit a SUPPORTED claim without a citation), DERIVED (computed from evidence, cites every input), INFERRED (labeled inference, cites its basis), UNKNOWN (no evidence; stated explicitly, cites nothing). UNKNOWN is an honest output, not a failure.
- Failure modes: unbound claims (claim text with no evidence path); evidence laundering (third-party claim presented with first-party weight); overclaim (renderer wording stronger than the grade, e.g. "observed" rendered as "Verified").
- Terminal contribution: claims graded UNKNOWN on a `required_facts` entry push toward NEEDS_OWNER_INPUT. Overclaim or unbound-claim findings on identity/contact facts block READY.

Lane ground: LANE-ASK concierge (`src/fyd/ask/concierge.ts`, `LANE-ASK-SUMMARY.md`) defines the four grades and the throw-on-uncited-SUPPORTED rule; LANE-CLAIM gauntlet (claim-integrity attacks: overclaim, evidence laundering, unbound claims) defines the failure battery; QA-TRUTH (`qa/truth/failures.json`, 38 claims traced, 4 failure records F-001..F-004) defines the verifier-gap classes the grader must catch, including renderer-injected strings outside the binding model.

### Stage 4. BUILD_GRAPH

- Input: `GradedClaim[]`, dropped-entity ledger.
- Output: `ObjectGraph`: { objects[], relationships[] } with stable deterministic ids, plus `object_quality_report`: { dedup_merges[], normalization_applied[], dropped_entities[] }.
- Failure modes: service name duplication with no normalization (ACQ GAP-1); locations collapsed with no dropped-entity ledger (ACQ GAP-2); reverse-direction relationships lost before expression (F5-CEILING first-loss: `works_for` person-to-business edges never entered the people group because `group()` matched only owner-as-subject `employs`/`has_member`); OG business:contact_data never projected onto fields (ACQ GAP-3).
- Terminal contribution: graph with zero public objects blocks READY (nothing to compose). Dedup/normalization defects become warnings; silent-entity-loss defects block READY because they corrupt downstream eligibility.

Lane ground: corpus fixtures define the target shape (e.g. `corpus/fixtures/clearwater-plumbing-demo.json`: 25 objects / 24 relationships, conflict pair preserved); F5-CEILING (`ceiling/ceiling-report.md`, `similarity.json`) defines the entity-driven variation test the graph must pass (fingerprint sensitivity: the identity-swap success test hash 6277c348f3a1; the coppersmith People-section failure as the canonical regression).

### Stage 5. RESOLVE_CONFLICTS

- Input: `ObjectGraph` with multi-source observations on the same fact.
- Output: `ConflictRecord[]`: { fact_ref, contenders[{source_id, value, trust, observed_at}], resolution, resolution_basis } plus the updated graph. No silent winners: SOURCE_PRIORITY-style silent picks are recorded as conflicts with an explicit basis (ACQ GAP-6 lesson).
- Failure modes: conflicting hours/phone with no conflict record; resolution contradicts `conflict_policy`; unresolvable conflict on an identity or contact fact under policy `manual`.
- Terminal contribution: unresolved conflicts on `required_facts` or on identity/contact facts push terminal state to NEEDS_OWNER_INPUT. Resolved conflicts land in the result's `conflicts` array with both contenders cited (LANE-ASK canonical question 6: "What information conflicts?").

Lane ground: acquisition conflicting-source fixture (json-ld (970) 555-0188 Mo-Fr 08-17 vs og (970) 555-0189 Mo-Sa 08-18); clearwater fixture conflict pair (Sat close 12:00 PM website-ingestion vs 2:00 PM directory:google-business-profile).

### Stage 6. ATTEST_PROVENANCE

- Input: `ObjectGraph`, `GradedClaim[]`, `SourceArtifact[]`, `ConflictRecord[]`.
- Output: `EvidenceLedger`: every object field and relationship points to >= 1 evidence item; per-field provenance refs; `provenance_coverage`: { graded_claims_total, with_evidence, coverage_ratio, by_grade{SUPPORTED, DERIVED, INFERRED, UNKNOWN} }.
- Failure modes: field with no provenance ref; provenance string hardcoded in renderer instead of emitted from the ledger (QA-TRUTH F-001: footer hardcoded "(acceptance sequences 65-83)" while the generator emitted real provenance the renderer ignored); digest mismatch between pinned source bytes and ledger claim (GOLDEN-REFERENCE lineage chain: recomputed concat digest must match the pinned header).
- Terminal contribution: coverage_ratio below the READY threshold (section 5) blocks READY. Any identity/contact field without provenance blocks READY.

Lane ground: LANE-LIN (`lineage/chain-happy-place.json`, `chain-coppersmith.json`): machine-recorded chains from raw bytes through fixture to claim, with per-file digests and timestamp pins; GOLDEN-REFERENCE section 1 pinning (source digest, pipeline commit, observed-at).

### Stage 7. PLAN_SITE

- Input: `ObjectGraph`, `presentation_intent` (facts untouched), `design_tokens`.
- Output: `SitePlan`: pages, per-page section eligibility and order, composition policy (CTA emphasis, density, media treatment, presence mode, max sections, typography, radius), archetype stamp or null.
- Failure modes: eligibility counts a team member but the planner emits no People section (F5-CEILING failure: planner was innocent, generator guilty; the stage contract pins the blame boundary: eligibility evaluation vs section emission); strategy pin overrides entity without recording owner intent (STRATEGY_PINS without provenance); production preset quantizes per-tenant vectors (F5-CEILING secondary finding: SITE_STRATEGIES[].policy has zero production consumers).
- Terminal contribution: a plan with zero pages or zero sections on the home page blocks READY. Entity-driven variation is verified by the ceiling fingerprint: the plan must express material IA differences present in the graph.

Lane ground: DEHPP-ANALYZE (`dehpp/classification.md`: 54 mechanisms, KEEP 34 / PARAMETERIZE 13 / REFACTOR-REPLACE-DROP 7; `dehpp/hpp-specific-inventory.md`) defines what in the golden route is universal mechanism vs tenant data; F5-CEILING defines the variation contract and the patch proposals this stage consumes.

### Stage 8. GENERATE_SPEC

- Input: `SitePlan`, `ObjectGraph`, `presentation_intent` (applied OVER the compiled spec, facts untouched), `generatedAt`, `eventSequences`.
- Output: `SiteSpec`: declarative spec with pages, sections, bindings, provenance block; `spec_digest` (sha256 over canonical JSON).
- Failure modes: HPP-specific couplings leaking into the generic path (DEHPP 5 most dangerous: hardcoded provenance footer text, demo chrome on customer surface, golden route bypassing the composition pipeline, dead media seam, default copy baked into renderer); non-deterministic generation (QA-DET: `generateSiteSpec` deterministic across fresh processes).
- Terminal contribution: spec generation must be byte-deterministic for identical inputs (QA-DET equivalence criterion: byte-identical canonical JSON). Non-determinism is a FAILED, not a warning.

Lane ground: GOLDEN-REFERENCE (`golden/GOLDEN-REFERENCE.md` + `evidence/hpp-composed-spec.json`): the frozen golden route `getPingObjectGraph -> generateSiteSpec -> applyPresentationIntent -> heroMediaFor -> validateSiteSpec -> SiteClient -> SitePageView` at commit e48ef710; QA-DET (`qa/determinism/results.json`): semantic render equivalence HOLDS across fresh processes, module-state pollution, locales, array-order permutation.

### Stage 9. BIND_MEDIA

- Input: `SiteSpec`, media pipeline manifests, per-source `rights_basis`.
- Output: `MediaBinding`: hero selection (deterministic, owner selection outranks auto), per-section media refs, `media_manifest` with digests and rights basis per asset.
- Failure modes: zero media available (honest-empty: no Gallery without media, typographic hero fallback per DEHPP KEEP); rights basis inferred from same-origin heuristic and presented as "observed" authorization (QA-TRUTH F-002); DisplayMedia.src with no render-seam URL gate (LANE-SEC residual 2: poisoned manifest flows straight into src; defense-in-depth patch `patches/display-media-src-allowlist.patch`); media selection done inside the renderer instead of at the server seam (DEHPP R6 KEEP).
- Terminal contribution: missing media never blocks READY (honest-empty is a KEEP discipline); fabricated or misattributed rights block READY. Media assets with no rights basis are excluded from selection, not rendered with invented authorization.

Lane ground: media lane staging (`media/staging/`, `media/harvest-note.md`; note: LANE-MEDIA was closed in the headcount rebalance and needs a replacement worker on restore); LANE-SEC seam verdict residual 2.

### Stage 10. VERIFY_RENDER_MODEL

- Input: `SiteSpec`, `ObjectGraph`, `EvidenceLedger`.
- Output: `VerifiedRenderModel`: every rendered claim classified against the binding model; `validation_findings[]`; `renderable` boolean. Invalid spec never renders (DEHPP R7 KEEP: `validateSiteSpec` + `isRenderable` gate).
- Failure modes: verifier misses 100 percent of claims on a path because the path never invokes it (QA-TRUTH architectural finding: `/sites` pages call `generateSiteSpec` directly, only `planSite` builds a VerifiedRenderModel); renderer-injected strings live outside the PresentationBinding model (footer, rights steps, "Verified" wording); security seam breach (hostile URL becomes href; markup reaches output unescaped; private object crosses the public boundary).
- Terminal contribution: `renderable=false` blocks READY. A seam breach is FAILED. Verifier-coverage gaps on a render path are warnings only if the path is not used by this build; the build's own path must be fully covered.

Lane ground: QA-TRUTH (`qa/truth/failures.json`, patch proposals `patches/qa-truth-2026-09-23.md`); LANE-SEC (`security/seam-verdict.md`, 20/20 PASS, choke points: resolveSafeLink, React escaping with zero dangerouslySetInnerHTML in src/fyd, binding verifier, visibility projection); QA-HOSTILE (`qa/hostile/`, HOSTILE-VERDICT pending); LANE-CLAIM (claim-integrity attacks on the render path).

### Stage 11. RENDER_PROVE

- Input: `VerifiedRenderModel`, `MediaBinding`.
- Output: `RenderProof`: rendered HTML per page and viewport (desktop + 320/360/375/390/430), `visual_qa_report` (failure list with repro), `determinism_proof` (byte-identical canonical models across fresh processes), object-augmentation plan (section anchors, inline cards, Ask FYD entries).
- Failure modes: motion gates content (VISUAL-CRITIC VQ-001 BLOCKER: service cards at opacity 0 until scrolled; full-page captures, print, crawlers see blank sections); empty cards rendered (mobile critique: five empty service cards, 600px dead space); fixed chrome occluding content (Featured object FAB over headings); no thumb-reachable primary contact CTA; illegible contrast (VQ-002); zero media with flat hero (VQ-004); margin-collapsing disturbance from augmentation anchors (OBJECTS-MARGIN caveat: needs before/after screenshots at 375/768/1024/1440).
- Terminal contribution: visual-QA BLOCKER findings block READY. Major findings become warnings under READY_WITH_WARNINGS only if they do not touch identity, contact, or claim honesty. Determinism proof is required for READY.

Lane ground: VISUAL-CRITIC desktop (`visual/desktop-critique.json`: FAIL, 9 reproducible failures) and mobile (`visual/mobile-critique.json`: 6 failures, regression_320_notes with 5 permanent assertions); QA-DET (`qa/determinism/results.json`); OBJECTS-MARGIN (`objects-margin/augmentation-design.md` + 3 patches: section anchors, layer mount desktop-only >=1024px, inline cards; exclusions: All Objects explorer, floating mobile chrome, persistent drawers, follow/like, Hero overlays).

### Stage 12. REGENERATE_AND_CERTIFY

- Input: all stage outputs, optional `regeneration_of` build_id, optional owner corrections journal.
- Output: the BuildBusiness result object (section 4) with terminal state (section 5), `missing_information`, `next_actions`.
- Behavior: if `regeneration_of` is set, replay the prior build's owner correction journal (CONFIRM/CORRECT/HIDE append-only assertions, supersession chains) over regenerated facts instead of rebuilding from zero; source-conflict detection re-runs; non-approved proposals are skipped and counted (LANE-OWNER proposal shape and replay semantics). Certification then evaluates the terminal-state conditions in section 5 against the final artifacts.
- Failure modes: journal replay divergence (replayed facts do not match regenerated facts: fail closed, emit NEEDS_OWNER_INPUT with the divergence as evidence); certification run against stale stage outputs (each stage output carries its content digest; the certifier verifies the digest chain).
- Terminal contribution: this stage SETS the terminal state. It performs no new extraction.

Lane ground: LANE-OWNER (`owner/stage/`: facts.ts, provenance.ts with OwnerProvenance {owner, assertedAt, supersedes}, corrections.ts replay, visibility-policy.ts, owner-identity.ts fail-closed unverified default, owner-command-compiler.ts, owner-proposal.ts; unwired seams recorded in `patches/owner-console-integration-2026-09-24.md`). Note: no `regen/` lane directory exists in the factory workspace as of this draft; until a regen lane delivers, stage 12's regeneration behavior is fulfilled by the LANE-OWNER replay contract above.

## 4. BuildBusiness result object

Exactly these fields, in this order. No additional top-level fields.

```json
{
  "build_id": "bld_20260923_1933_clearwater_9f3c",
  "status": "READY_WITH_WARNINGS",
  "sources": [],
  "observations": [],
  "evidence": {},
  "objects": [],
  "relationships": [],
  "media": {},
  "site_spec": {},
  "render": {},
  "warnings": [],
  "conflicts": [],
  "missing_information": [],
  "provenance_coverage": {},
  "next_actions": []
}
```

| Field | Type | Content |
|---|---|---|
| build_id | string | Unique per build: `bld_<UTC yyyymmdd>_<hhmm>_<business_id>_<8 hex>`. The 8 hex chars are the first 8 of the sha256 over the canonical manifest. Reruns with identical manifest and source bytes reproduce identical stage digests. |
| status | enum | One of READY, READY_WITH_WARNINGS, NEEDS_OWNER_INPUT, ACQUISITION_BLOCKED, FAILED. Conditions in section 5. |
| sources | array of SourceResult | Per source: { source_id, kind, bytes_digest, byte_count, fetched_at, status: ok/failed, failure_class?, rights_basis? }. |
| observations | array of Observation | Stage 2 output: { observation_id, source_id, fact_ref, value, evidence_span, grade }. |
| evidence | object | Stage 6 EvidenceLedger: { items: {evidence_id: {source_id, digest, observed_at, kind}}, field_provenance: {object_id: {field: [evidence_id]}} }. |
| objects | array | Public object graph objects with stable ids, schema, fields, visibility. Private objects are listed by id only with `withheld: true`; their fields never cross into this result's public sections. |
| relationships | array | { relationship_id, subject, predicate, object, provenance_refs[], status }. |
| media | object | Stage 9 MediaBinding: { hero: {asset_id, rights_basis, selection_basis} or null, assets: [], excluded_no_rights: [] }. Honest-empty allowed. |
| site_spec | object | Stage 8 SiteSpec or null if generation failed: { spec_digest, pages, provenance, renderable }. Null with status FAILED or ACQUISITION_BLOCKED. |
| render | object | Stage 10+11 outputs: { renderable, validation_findings[], visual_qa: {verdict, failures[]}, determinism_proof: {equivalent, evidence}, augmented: bool }. |
| warnings | array | Non-blocking findings: { stage, code, message, evidence_refs[] }. Any warning on identity, contact, or claim-honesty facts is blocking instead. |
| conflicts | array | Stage 5 ConflictRecords, resolved and unresolved, both contenders cited. |
| missing_information | array | { fact_ref, why_needed, grade: UNKNOWN, suggested_source_kind }. Populated from UNKNOWN claims on useful (not only required) facts. |
| provenance_coverage | object | Stage 6: { graded_claims_total, with_evidence, coverage_ratio, by_grade: {SUPPORTED, DERIVED, INFERRED, UNKNOWN} }. |
| next_actions | array | Ordered remediation: { action, owner: "factory" \| "owner" \| "sprint" \| "convergence", detail }. Factory-owned actions are retryable reruns; owner actions name the exact decision needed; sprint/convergence actions name the dependency gap (section 6). |

## 5. Terminal states

Precise conditions. Evaluated in order: FAILED first, then ACQUISITION_BLOCKED, then NEEDS_OWNER_INPUT, then READY vs READY_WITH_WARNINGS.

### FAILED

Any one of:
- F-SEC: the security seam is breached on the build's render path (executable source content reaches public output: hostile URL becomes href, unescaped markup, event-handler attribute, private object or owner-hidden field in public output). Evidence preserved; build halted. (LANE-SEC invariant.)
- F-SPEC: `renderable=false` after `validateSiteSpec`, and the findings are structural (schema violations), not data-missing.
- F-DET: stage 8 or 11 determinism proof fails (non-identical canonical models for identical inputs). Non-determinism is never a warning.
- F-PIPE: an unrecoverable pipeline exception with no partial stage output persisted. The failure evidence (stack, input digests, stage) is recorded; the build is not retried silently.

### ACQUISITION_BLOCKED

- Stage 1 yields zero SourceArtifacts with status ok, OR stage 2 yields zero observations across all sources. Per-source failures are recorded in `sources[]` with failure classes (unreachable, robots_block, paywall, digest_mismatch, budget_exceeded). The build stops; `site_spec` and `render` are null. This is distinct from FAILED: nothing was proven wrong, there was nothing to build from.

### NEEDS_OWNER_INPUT

Any one of:
- A `required_facts` entry grades UNKNOWN after stages 1-6, and no source in the manifest can supply it.
- An unresolved conflict on an identity fact (business name) or contact fact (phone, email, primary URL, address) under conflict_policy `manual`.
- Stage 12 journal replay diverges from regenerated facts (owner must reconcile).
- Owner identity is unverified and a stage requires an authenticated assertion (LANE-OWNER fail-closed default).
- The build is resumable: `next_actions` names the exact missing decision, and a later call with `regeneration_of` set to this build_id plus owner corrections continues from stage 12 replay, not from zero.

### READY

All of:
- All 12 stages completed; every stage output persisted with content digests; the digest chain verifies in stage 12.
- `renderable=true`, zero validation findings, zero visual-QA BLOCKER findings, determinism proof EQUIVALENT, seam verdict clean on the build's render path.
- `provenance_coverage.coverage_ratio` >= 0.95 for SUPPORTED+DERIVED claims; every identity and contact field carries >= 1 provenance ref; zero unresolved conflicts on identity/contact facts.
- `warnings` is empty, `conflicts` contains only resolved records, `missing_information` contains no `required_facts` entries.
- Claim-honesty gates: no renderer-injected strings outside the binding model (QA-TRUTH F-001 class); no rights-basis inference presented as observed fact (F-002 class); no "observed" rendered as "Verified" (F-003 class).

### READY_WITH_WARNINGS

- Meets every READY condition except: `warnings` is non-empty, or `conflicts` contains resolved records with contenders worth surfacing, or `missing_information` lists non-required UNKNOWN facts.
- Warnings are never on identity, contact, or claim-honesty facts; any such finding is blocking and moves the build to NEEDS_OWNER_INPUT or FAILED per the conditions above.
- Visual-QA major (non-blocker) findings land here. Zero-media honest-empty lands here with the typographic-hero fallback noted.

## 6. Dependencies (referenced, not duplicated)

### 6.1 Constitutional sprint Phase 17: UNAUTHENTICATED VISITOR -> PUBLISH golden-path plan

Status: pending. MISSION-STATE records orchestration as explicitly awaiting this plan before finalizing the contract; this draft is therefore versioned DRAFT and must be re-certified against the plan on delivery.

What orchestration needs from Phase 17 (and does not build itself):
- D1. The gap list for the UNAUTHENTICATED VISITOR -> PUBLISH path: every step where the factory currently has no mechanism (e.g. publish authorization, deployment split between demo chrome and customer surface per DEHPP finding 2).
- D2. The authority map for that path: which component owns identity, canonicalization, evidence, and publish decisions. Orchestration will consume this map to route stage responsibilities; it will not re-derive or second-guess it.
- D3. The publish gate conditions: the exact predicates a build must satisfy before it may be published. These become additional conjuncts on the READY conditions in section 5, not replacements.
- D4. Confirmation of which render path is the production path for published sites (`/sites` direct-generate vs `/build/[siteId]` planner), resolving the QA-TRUTH architectural finding that the verifier misses 100 percent of claims on the direct path.

Until D1-D4 arrive, orchestration treats publish as out of scope: a READY build is certified as a correct site artifact, not as authorized to publish.

### 6.2 Convergence wave substrate

The convergence wave owns the shared substrate. Orchestration consumes its interfaces and records substrate gaps as dependencies, never workarounds (MISSION-STATE standing rule).

What orchestration needs from the convergence wave (and does not build itself):
- S1. The PING event/evidence authority interface: how stages append observations and evidence so lineage chains (LANE-LIN shape) remain machine-verifiable across builds. Orchestration will not create a competing event or agent store (continuity guardrail).
- S2. The object-graph query and projection surface: the canonical way stages 7-11 read the public graph (the `publicGraph()` boundary semantics), so the visibility projection is enforced by the substrate, not re-implemented per stage.
- S3. The identity authority: stable object and build identity issuance, so build_id and object ids are substrate-issued, not stage-invented.
- S4. Substrate gap reports that block orchestration stages, delivered as typed gaps (like the ACQ GAP-1..GAP-6 pattern), which orchestration records in `next_actions` with owner `convergence`.

## 7. Lane deliverable to stage mapping

Every completed lane deliverable mapped to the stage that consumes it. Paths are workspace-relative to `~/workspace/fyd-factory/`.

| Lane deliverable | Path | Stage |
|---|---|---|
| Acquisition corpus (8 fixtures, generator, validator, manifest, 6 schema gaps) | `corpus/gen_acq_fixtures.py`, `corpus/validate-acq.mts`, `corpus/manifests/acquisition.json`, `corpus/fixtures/` (8 slug dirs) | 1 ACQUIRE (source shapes), 2 (leftovers signal), 4 (GAP-1,2,3,5), 5 (GAP-6, conflicting-source fixture) |
| Second-site fixture + manifest (25 objects / 24 relationships, conflict pair) | `corpus/fixtures/clearwater-plumbing-demo.json`, `corpus/manifests/second-site.json`, `corpus/graph-features-second-site.md` | 4 BUILD_GRAPH (target graph shape), 5 (conflict pair) |
| F2 corpus fixtures (redacted trades, checkpointed batches) | `corpus/fixtures/`, `corpus/manifests/batch-a.json`, `batch-b.json` | 4 (regression graphs) |
| Professional gate fixture | `corpus/manifests/professional-gate.json` | 7 (non-trades plan variation) |
| Ask concierge (grades, 7 canonical questions, throw-on-uncited-SUPPORTED) | `ask/LANE-ASK-SUMMARY.md` (impl on Pig `src/fyd/ask/concierge.ts`) | 3 GRADE_CLAIMS, 5 (conflict surfacing = canonical question 6) |
| DEHPP classification (54 mechanisms: KEEP 34 / PARAMETERIZE 13 / DROP 7) | `dehpp/classification.md`, `dehpp/hpp-specific-inventory.md` | 7 PLAN_SITE (universal vs tenant-data split), 8 (dangerous couplings as failure modes) |
| QA-TRUTH (38 claims traced, failures.json, 4 failure records, patch proposals) | `qa/truth/failures.json`, `patches/qa-truth-2026-09-23.md` | 3 (verifier-gap classes), 6 (F-001 provenance hardcode), 9 (F-002 rights), 10 (architectural finding: verifier coverage per path) |
| QA-DET (render equivalence HOLDS, results.json) | `qa/determinism/results.json` | 8 (generation determinism), 11 (determinism proof; FAILED on non-equivalence) |
| QA-HOSTILE (seam attack harness, verdict pending) | `qa/hostile/` (HOSTILE-VERDICT.md pending re-dispatch) | 10 (seam battery; FAILED on breach) |
| LANE-SEC (20/20 PASS, seam verdict, choke points, 2 patches) | `security/seam-verdict.md`, `security/projection-seam-attack.test.ts`, `patches/boundary-jest-css-stub.patch`, `patches/display-media-src-allowlist.patch` | 10 (seam invariant, FAILED on breach), 9 (DisplayMedia.src residual) |
| LANE-CLAIM (claim-integrity attack battery, verdict pending) | `claim/` (CLAIM-VERDICT.md pending re-dispatch) | 3 (overclaim / laundering / unbound battery), 10 (render-path claim attacks) |
| LANE-LIN (machine-recorded lineage chains, verifiers) | `lineage/chain-happy-place.json`, `lineage/chain-coppersmith.json` (LINEAGE-REPORT.md pending re-dispatch) | 6 ATTEST_PROVENANCE (chain shape, digest pins) |
| GOLDEN-REFERENCE (frozen donor: commit e48ef710, route, composed spec, 500/500 tests) | `golden/GOLDEN-REFERENCE.md`, `golden/evidence/` | 8 (golden route as reference implementation), 12 (fidelity baseline for regen comparison) |
| F5-CEILING (variation report, similarity.json, works-for patch) | `ceiling/ceiling-report.md`, `ceiling/similarity.json`, `patches/f5-ceiling-works-for-people.patch` | 4 (first-loss boundary), 7 (entity-driven variation test, identity-swap success test) |
| VISUAL-CRITIC desktop + mobile (critique JSONs, harness, shots) | `visual/desktop-critique.json`, `visual/mobile-critique.json`, `visual/harness.md`, `visual/shots/` | 11 RENDER_PROVE (BLOCKER vs major taxonomy, 320px regression assertions) |
| OBJECTS-MARGIN (augmentation design + 3 patches) | `objects-margin/augmentation-design.md`, `patches/objects-margin-*.patch` | 11 (post-render augmentation layer; applied after base render certifies) |
| LANE-OWNER (owner-mode, corrections replay, proposals, visibility policy) | `owner/stage/` (12 files), `patches/owner-console-integration-2026-09-24.md` | 12 REGENERATE_AND_CERTIFY (journal replay, NEEDS_OWNER_INPUT resume) |
| Media lane staging (harvest note; worker closed, replacement pending) | `media/staging/`, `media/harvest-note.md` | 9 BIND_MEDIA (selection contract; worker gap recorded as dependency) |
| LANE-MINE (36-failure corpus, TD-001..TD-012, 9 clusters) | `failures/` | Cross-stage: failure taxonomy feeding stage failure modes; TD tournament patches integrate via `patches/` |
| TD-001 tournament (false-positive verdict, regression tests) | `tournaments/td-001/` | 10 (validator regression coverage) |
| Golden-path archaeology (wound down; superseded by Phase 17) | `golden-path/ARCHAEOLOGY-HANDOFF.md` | None: superseded. Authority-mapping work lives with Phase 17 (section 6.1); do not duplicate. |

Notes:
- No `regen/` lane directory exists as of this draft. Stage 12's regeneration behavior is fulfilled by the LANE-OWNER replay contract until a regen lane delivers.
- `patches/` proposals are consumed at integration time on the Pig (branch fyd-factory); orchestration references patch existence in stage failure modes but never applies patches at build runtime.

## 8. Cross-stage invariants

- I1. Determinism: stages 2-11 are pure functions of their inputs plus pinned source bytes. Any nondeterminism detected is FAILED, never a warning.
- I2. Evidence monotonicity: a later stage may add evidence, never remove or weaken an earlier stage's provenance refs. Owner HIDE changes visibility, not source truth (LANE-OWNER).
- I3. Privacy: private objects and owner-hidden fields never appear in `objects`, `render`, or any public section of the result. The `publicGraph()` boundary is enforced at stage 4 output and re-asserted at stage 10.
- I4. No silent drops: every entity, observation, or conflict that does not survive to the next stage appears in a ledger (dropped-entity ledger, leftovers signal, conflict record, or warning).
- I5. Resume: every stage output is persisted with its content digest before the next stage starts. A crashed build resumes from the last persisted stage, never from zero.
- I6. Honest empty: a stage that lacks data emits the honest-empty representation (UNKNOWN claim, null hero, omitted section), never fabricated content. Fabricated content is FAILED under claim-honesty gates.
- I7. Storage law: bulk artifacts live under `~/workspace/fyd-factory/`; never /tmp, C:, or D:. No Pig repo writes from orchestration; read-only inspection via `~/workspace/bin/wsl-run.sh` only.

## 9. Open items for the parent coordinator

- O1. Re-certify this DRAFT against the Phase 17 golden-path plan on delivery (D1-D4, section 6.1).
- O2. Confirm the READY coverage_ratio threshold (0.95 proposed in section 5) and whether visual-QA majors may ever attach to contact-adjacent sections.
- O3. Decide whether stage 11's object-augmentation (OBJECTS-MARGIN) is part of the certified artifact or a post-certification layer; this draft treats it as post-render, pre-certification input to `render.augmented`.
- O4. A regen lane does not exist yet; either charter one or confirm LANE-OWNER replay remains the stage 12 regeneration mechanism.
