# DO-NOT-REIMPLEMENT REGISTER - Prelaunch Planning Artifact

Date: 2026-09-28 MDT. PLANNING ONLY.

Standing rule: every implementation task begins by searching this register.
If the behavior exists, HARVEST or CONVERGE it. Do not build a duplicate.

Format: DO NOT BUILD → SEARCH THESE LOCATIONS FIRST → CURRENT WINNER → OPEN QUESTION.

---

## 1. TypedDecision

DO NOT BUILD another typed-decision type.
SEARCH THESE LOCATIONS FIRST → typed_decision.js x3 byte-identical (sha fde15d42) in jev-stage, ping-observations, jev-failure-harness worktrees; orca_policy.js typed records; authorizeWorkOrder 8 checks; reconcileGate typed refusals; verifyResultEnvelope gates.
CURRENT WINNER → the byte-identical typed_decision.js (sha fde15d42); converge consumers to one copy.
OPEN QUESTION → which decision-record schema (U10) carries TypedDecision into the journal.

## 2. Identity-authority lineage

DO NOT BUILD IdentityAuthority #5 or TenantOS.framework.
SEARCH THESE LOCATIONS FIRST → identity_authority.js x3 byte-identical (sha c05060d0); FYD owner identity; claim identity; MC dispatch identity; runtime IdentityAuthority copies; cryptographic identity work; constitutional-runtime identity semantics; P-100 bootstrap substrate (549 lines, tenanos-wave, unpushed).
CURRENT WINNER → none declared; the contract must converge first (U4). The byte-identical copy is the leading candidate, not the decision.
OPEN QUESTION → one semantic identity contract with separate types for ENTITY ID / ACTOR ID / CRYPTOGRAPHIC IDENTITY / TENANT-OWNER BINDING / AGENT ID.

## 3. ContextPack implementations

DO NOT BUILD another context system.
SEARCH THESE LOCATIONS FIRST → runtime/cognitive/context_pack.py (ContextPackBuilder); ping-runtime/context/context_compiler.js; tandem/build-context-pack.py; P-098 context-pack.ts (321 lines, tenanos-wave, unpushed); ContextPack v2 context-compiler.ts; decision-fabric/contextpack-wire-2026-09-28 branch (9a555021); context_pack.py x5 byte-identical (sha 1cb71d44).
CURRENT WINNER → none declared; convergence owner to be named at GO (U7). v2 exists but is API-incompatible with the proven path; do not rewire blindly.
OPEN QUESTION → one pipeline: OBJECT GRAPH + EVIDENCE + VIEWER/TENANT + QUESTION + CAPABILITIES → CONTEXT PACK → ASK FYD.

## 4. Approval mechanisms

DO NOT BUILD another approval door.
SEARCH THESE LOCATIONS FIRST → phase1/approval-door-2026-09-28 at af7d2688 (17/17, terminal-first ratified, FROZEN, tag phase1-frozen-2026-09-28); src/fyd/approval/gate.ts; mc/approval-request branch (ApprovalRequest primitive + validator + CLI, second repo).
CURRENT WINNER → phase1 approval door (af7d2688). Harvest it as the human-authority door; do not maintain weaker duplicates.
OPEN QUESTION → how the FYD customize-path approval converges with the phase1 door (P0 in the directive).

## 5. UNKNOWN/HOLD implementations

DO NOT BUILD another reconciliation system.
SEARCH THESE LOCATIONS FIRST → ~/workspace/f01-fix/ (21/21 green, never committed); mc/lane-c-reconcile-gate branch (S5); classifyUnknownExecution + attempt-fencing.ts + recover.ts + lease.ts + claim.ts + run-state-authority.ts (integration branch); P-103 attempt-fencing (627 lines + SQL); P-095 run-state-authority; the proven lifecycle OPEN → KNOWN_PERMANENT → RESOLVED → REOPENED (13/13 tests).
CURRENT WINNER → none declared; compare all three against the proven lifecycle on the shared Wave B hostile corpus (U3).
OPEN QUESTION → complementary vs competing (f01 semantics + S5 dispatch gate + classifyUnknownExecution decision function).

## 6. Attempt fencing

DO NOT BUILD another fencing mechanism.
SEARCH THESE LOCATIONS FIRST → attempt-fencing.ts (315 lines + SQL + test, integration branch); lease.ts (fencing-token CAS); P-103 attempt-fencing (627 lines + SQL, tenanos-wave, unpushed); zombie-write semantics (zombie writes match zero rows; timeout/stale projects to unknown).
CURRENT WINNER → none declared; part of the U3 comparison.
OPEN QUESTION → whether P-103 and the integration-branch implementation are the same closure.

## 7. Recovery

DO NOT BUILD another recovery primitive.
SEARCH THESE LOCATIONS FIRST → recover.ts (new run with lineage, never resume in place); f01 _failMission (proven-failures-only); S5 P4 RETRY-AFTER-UNKNOWN closure; wake-lease design doc (pig/incident-2026-09-28/draft-wake-lease-design.md; BUILD or DROP per owner call).
CURRENT WINNER → recover.ts lineage pattern for the recovery semantic; U3 decides the HOLD/reconcile side.
OPEN QUESTION → wake lease: build or drop (owner call).

## 8. Run-state classification

DO NOT BUILD another run-state classifier.
SEARCH THESE LOCATIONS FIRST → run-state-authority.ts classifyUnknownExecution (integration branch); P-095 run-state-authority (tenanos-wave, unpushed); Mission Control RUNNING overclaim (display hardcodes RUNNING for inprogress dir; no liveness bound).
CURRENT WINNER → classifyUnknownExecution (total over the evidence cube) as the decision function candidate.
OPEN QUESTION → projection: prefer RUN STATE UNKNOWN and RECONCILIATION REQUIRED over unsupported claims.

## 9. Tenant kit

DO NOT BUILD another tenant kit.
SEARCH THESE LOCATIONS FIRST → P-092 tenant-kit (556 lines, tenanos-wave/P-20260923-092-tenant-kit, unpushed); FYD tenant-context + scoped stores (canonical HEAD, reached); FYD journal gateway tenant enforcement (400s, reached); gateway namespace binding ("requested wins iff bound"), tenant registry, hostile suites.
CURRENT WINNER → FYD journal gateway enforcement as the reached pattern; P-092 as the unintegrated cache (STATE.json marks "integrated" but it is not in the canonical tree).
OPEN QUESTION → U1/U4: entitlement and identity contract first.

## 10. Decision recorder

DO NOT BUILD another decision-record store.
SEARCH THESE LOCATIONS FIRST → jev/shadow-recorder branch (schema + tests + 3 demo records + MC event spec); JEV_DECISION_EVALUATED event_data schema v1; fyd-intel/jev-decisions.jsonl (9 records); ping-decision-seam/shadow-decisions-2026-09-28.json (6 samples); shadow spike per-record schema (finalized).
CURRENT WINNER → none declared; U10 round-trip test decides.
OPEN QUESTION → one schema, journaled as typed events through the existing journal; no new store.

## 11. WorkOrder / ResultEnvelope contracts

DO NOT BUILD another envelope.
SEARCH THESE LOCATIONS FIRST → E1 live orca-adapter (14-field work order in / 8-field result out, structural echo-binding); E2 authority doc; E3 reference copy; E4 harvested contract; E5 outcome vocabulary; E6 unit lifecycle; E7 proposed unified spec (not implemented); lane 14 worker-contract comparison report.
CURRENT WINNER → E1 live surface as the reference; U6 decides the canonical contract and the authority-posture fix.
OPEN QUESTION → per-order authority decision vs adapter-data authority.

## 12. Context compiler

Covered under 3 (ContextPack implementations). Listed separately because the directive names it: do not confuse the compiler (assembly) with the pack (schema).

## 13. SitePatch

DO NOT BUILD another patch vocabulary.
SEARCH THESE LOCATIONS FIRST → builder-harvest/PATCH_VOCABULARY_INVENTORY.md (26 ops, nine columns); builder-harvest/SITEPATCH_V1.md (canonical v1: 13 ops + 1 typed refusal, sitepatch/v1, sha256-canonical-json-v1 digests); src/fyd/sitepatch/ (Track C, committed at HEAD, ZERO imports, orphaned, DEMOTE keep-unwired); proceduralize/patch.ts (the live path; name trap documented).
CURRENT WINNER → SITEPATCH_V1.md canonical v1 as the contract; proceduralize/patch.ts as the live implementation.
OPEN QUESTION → hard add/remove of sections/pages exists only in the convergence layer, not yet bound into the canonical apply-layer (Phase-2 work).

## 14. Existing FYD renderer

DO NOT BUILD another renderer.
SEARCH THESE LOCATIONS FIRST → src/fyd/components/renderer.tsx + hero-section.tsx + contact-link.tsx + object-overlay.tsx + ask-fyd-widget.tsx; design lanes (composition, media, typography, motion, public projection, render-wire, polish-f1); OpenPage / SiteSpec / Object UI ecosystem (harvest concepts: data model, component registry, validation, design tokens, variants, visual editor patterns, undo/redo, schema migration, render contract, data-source abstraction, export/publish model; classify ADOPT/ADAPT/REJECT each).
CURRENT WINNER → existing FYD renderer (proven on the two-site surface).
OPEN QUESTION → renderer stays replaceable; FYD owns evidence/objects/owner-state/outcomes, not renderer machinery.

## 15. Existing GitHub scanner

DO NOT BUILD another scanner.
SEARCH THESE LOCATIONS FIRST → GitHubTrendingScanner (990 lines); github_scanner.py vs .bak (duplicate); patch7_real_intake.py; ~/workspace/git-ingestion/ (design only).
CURRENT WINNER → GitHubTrendingScanner as acquisition machinery; nothing flows into PING's event spine today.
OPEN QUESTION → U9 binding first; Crawl4AI 0.9.4 evaluated only where current acquisition fails, retaining FYD/PING network and secret boundaries.

## 16. Existing classification engine

DO NOT BUILD another classifier.
SEARCH THESE LOCATIONS FIRST → ClassificationEngine (485 lines, deterministic, zero per-event LLM calls); DailyBriefingGenerator; the 10-category business static map (D-44).
CURRENT WINNER → existing deterministic ClassificationEngine.
OPEN QUESTION → Jev assistance only for the needs_review bucket (D-48); safe_delete stays deterministic.

## 17. Existing observation/claim pipeline

DO NOT BUILD another observation/claim pipeline.
SEARCH THESE LOCATIONS FIRST → observation_worker.py (DOCUMENT_IMPORTED → chunked OBSERVATION_CREATED); claim_worker.py (OBSERVATION_CREATED → CLAIM_GENERATED, verified: False); the drifted duplicate worker copies at repo root vs workers/ vs runtime/ (observation_worker 162 vs 96 lines; all DIFFER; running the wrong copy silently changes semantics); tandem/emit-observation.py (the only live external path; fail-closed gates verified).
CURRENT WINNER → the canonical workers/ copies; drift warning stands (deletion blocked until the reached copy is proven).
OPEN QUESTION → enforcement per-authority, not per-implementation.

## 18. Event / journal infrastructure

DO NOT BUILD another event bus, graph database, knowledge store, or orchestration framework.
SEARCH THESE LOCATIONS FIRST → UnifiedEventRuntime (Postgres ping_events); EventToMissionBridge (28-type static map); MissionRuntime (PG ping_missions); FYD journal gateway (append-only JSONL); the dormant old ORCA ExecutionEngine (mounted at /orchestration, nothing calls it; effectively ABSENT).
CURRENT WINNER → the live gateway spine (deterministic, zero LLM calls).
OPEN QUESTION → whether the FYD journal is temporary/demo infrastructure (label it) or a second permanent truth plane (do not quietly create one).

---

## Search-first procedure for every task

1. Name the semantic unit.
2. Grep this register for the unit.
3. Search the listed locations (code + tests + branches).
4. Record EXISTING IMPLEMENTATIONS SEARCHED as a machine-visible field (paths + SHAs + verdict per location).
5. Only if nothing suitable exists may a task propose new code, and then the smallest winning unit (cherry-pick small proven commit or port small primitive; never merge an entire historical branch).
