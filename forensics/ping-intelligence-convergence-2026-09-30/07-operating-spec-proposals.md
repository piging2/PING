# Staged OPERATING_SPEC proposals — PING Intelligence Convergence (2026-09-30)

STAGED ONLY. Nothing here has been applied to ~/workspace/goals/ping-agent-execution-stack/files/OPERATING_SPEC.md.
Each proposal is evidence-backed by the 2026-09-30 forensic lanes (reports in ~/workspace/forensics/ping-intelligence-convergence-2026-09-30/).
The convergence coordinator applies or rejects these; the forensic lanes do not edit the spec.

Branch caveat: lane findings are PROVEN against /home/nolan/ping @ lane-b/tenant-dispatch-threading @ 546b62d76.
The spec's existing records were written against earlier trees (88c9651be-era). Where a record is stale, the proposal says so.

---

## P1. EVENT AUTHORITY — identity ownership is now a class, not inline code

- ANCHOR: `### EVENT AUTHORITY` → IDENTITY line ("No separate IdentityAuthority class involved in this path" — STALE).
- CHANGE: replace with: "IDENTITY: event_id minted solely by IdentityAuthority.generateSpineEventId (runtime/kernel/authorities/identity_authority.js:294); sole production caller unified_event_runtime.js:200 (AUTH-CONV-06). Golden-vector test uer-spine-identity.test.js locks byte identity; one minting function = fixed key order, closing the old key-order caveat."
- EVIDENCE: 01-event-authority.md (L1, PROVEN, current worktree).
- STATUS: STAGED.

## P2. EVENT AUTHORITY — hash collision check ownership

- ANCHOR: `### EVENT AUTHORITY` → HASH line ("No HashAuthority class exists anywhere in code" — still true as a class; ownership clarified).
- CHANGE: append: "Collision check owned by CanonicalBytes.serializeString (canonical_authority.js:46), replacing the ad-hoc inline canon."
- EVIDENCE: 01-event-authority.md (L1, PROVEN).
- STATUS: STAGED.

## P3. EVENT AUTHORITY — single persistence choke point + tenant column

- ANCHOR: `### EVENT AUTHORITY` → PERSISTENCE line.
- CHANGE: append: "Exactly one INSERT INTO ping_events site in non-test production code (unified_event_runtime.js:289), ON CONFLICT (event_id) DO NOTHING. tenant_id column added (:139)."
- EVIDENCE: 01-event-authority.md (L1, PROVEN via repo-wide grep).
- STATUS: STAGED.

## P4. EVENT AUTHORITY — verdict-class admission gate (new)

- ANCHOR: `### EVENT AUTHORITY` → after ENTRYPOINT or BYPASSES.
- CHANGE: add line: "ADMISSION: verdict-class admission authority _assertVerdictAuthority (unified_event_runtime.js:160/226) — 5 verdict types bound to canonical producer workers, unskippable even by bridges."
- EVIDENCE: 01-event-authority.md (L1, PROVEN).
- STATUS: STAGED.

## P5. EVENT AUTHORITY — resolve the Oracle container open question

- ANCHOR: `### EVENT AUTHORITY` → EVIDENCE / DISTRIBUTION BLOCKER.
- CHANGE: add: "RESOLVED 2026-09-30: Oracle ping-gateway container (ping-gateway:candidate-3c5d280dd) runs byte-identical cc6856c event files (sha256 of events.js / unified_event_runtime.js / canonicalization_service.js match git show cc6856c: exactly). Deployed POST /events = BFF-adapter-normalized or direct → eventRuntime.emit; no tenant check, no authorizeNamespace. The 2026-09-16/17 capture's 'authorizeNamespace on POST /events' matches no surviving source — it likely described /ingest."
- EVIDENCE: 01-event-authority.md (L1, PROVEN).
- STATUS: STAGED.

## P6. EVENT AUTHORITY — three-way divergence (new, non-blocking)

- ANCHOR: `### EVENT AUTHORITY` → DISTRIBUTION BLOCKER or new note.
- CHANGE: add: "DIVERGENCE (non-blocking, recorded): worktree Lane L (007fcf44) vs ping-gateway-src/build (ad9b9c92, stale vs both) vs deployed cc6856c (4e3c66b6). HEAD moved cc6856c → 546b62d76 on lane-b/tenant-dispatch-threading (descendant, not rewrite); refactor/runtime-authority-convergence branch consumed. Lane L tenant isolation, AUTH-CONV-06, verdict-class admission, P1 tenant-spoof binder fix are NOT deployed."
- EVIDENCE: 01-event-authority.md (L1, PROVEN).
- STATUS: STAGED.

## P7. ACQUISITION — seam open but unmanned (new record or evidence-log entry)

- ANCHOR: new subsection under Authority records, or Evidence log entry.
- CHANGE: add: "ACQUISITION: no live mechanism turns an external observation into a durable PING event. AcquisitionManager: phantom, zero hits (third confirmation). gateway/acquisition_authority.js + continuous_acquisition.js: dead at entry (zero requirers). constitutional_acquisition_loop.js: requires nonexistent module (would throw); runner is explicit no-op. acquire-url.ts (~/workspace/acquisition-seam/): working SSRF-hardened fetcher, zero call sites. git-ingest GatewaySink.emit() raises NotImplementedError ('refusing to half-fire'). POST /ingest (routes/ingest.js:48,53 → canonicalizeAndEmit → emit → INSERT) is the live canonical door with ZERO live production callers (chain breaks at routes/ingest.js:31). Only external observations reaching ping_events are hand-carried via POST /events by agent scripts (tandem/emit-observation.py:502) and the FYD BFF. No acquisition → private-DB or marketing-owned event store exists anywhere (PROVEN by exhaustive search)."
- EVIDENCE: 02-acquisition-seam.md (L2, PROVEN).
- STATUS: STAGED.

## P8. WITNESS AUTHORITY — two live implementations, correctly not collapsed

- ANCHOR: `### WITNESS AUTHORITY` (currently says VACANT as standalone authority).
- CHANGE: retain VACANT-as-standalone-authority; add: "Two semantic-distinct live implementations, correctly not collapsed: (a) WitnessWorker.handle (ping-runtime/workers/canonical_workers.js:504-581, W7 fail-closed gate) builds WITNESS_CREATED inline (canonical_workers.js:563-578), bypassing the witnessAuthority singleton; (b) DeterministicReplayEngine → WitnessAuthority.computeWitnessRoot (gateway/replay/kernel/witness_authority.js:94, 12-leaf Merkle). The singleton serves only the ~60 gateway authorities' constitutional-result witnesses (runtime/kernel/authorities/witness_authority.js). Dormant TS 13-leaf design (runtime/kernel/replay/witness_authority.ts:26) has divergent hash-domain semantics — adopting it would fork all historical roots (phase16 W-2); must not be adopted as a replacement."
- EVIDENCE: 03-other-authorities.md (L3, PROVEN).
- STATUS: STAGED.

## P9. CLAIM — no ClaimAuthority class; pipeline label only (new record or note)

- ANCHOR: new note (no CLAIM record exists in the spec).
- CHANGE: add: "CLAIM: no ClaimAuthority class exists in live code. Writes: ClaimWorker transform (canonical_workers.js:140-167) emits CLAIM_CREATED. Live pipeline: OBSERVATION_CREATED → ClaimWorker → CLAIM_CREATED (canonical_workers.js:140-172, 723); verified truth = Fact (cir/fact.ts:8); standing = knowledge_nodes.status. Deprecated Python ClaimWorker is explicitly 'NOT DEPLOYED'. There is no claim authority to bypass."
- EVIDENCE: 03-other-authorities.md (L3, PROVEN) + 04-object-equivalence.md (L4, PROVEN).
- STATUS: STAGED.

## P10. KNOWLEDGE — KnowledgePromoter record (new)

- ANCHOR: new `### KNOWLEDGE AUTHORITY` record.
- CHANGE: add: "AUTHORITY: knowledge promotion gate. DECISION OWNED: which candidate knowledge becomes approved standing. CANONICAL IMPLEMENTATION: KnowledgePromoter (ping-runtime/knowledge/knowledge_promoter.js:28-60) — only the human promotes. PERSISTENCE: knowledge_nodes / knowledge_edges via KnowledgeGraph.addNode (ping-runtime/knowledge/knowledge_graph.js:30). Header states it already replaced 5+ dead implementations. REJECTED state exists (knowledge_nodes.status='rejected', knowledge_promoter.js:50-51)."
- EVIDENCE: 03-other-authorities.md (L3, PROVEN) + 04-object-equivalence.md (L4, PROVEN).
- STATUS: STAGED.

## P11. REPLAY — engine path precision

- ANCHOR: `### REPLAY AUTHORITY` → CANONICAL IMPLEMENTATION.
- CHANGE: append: "Live engine path: ReplayWorker (canonical_workers.js:226) + KernelReplayExecutionProvider (gateway/kernel_replay_execution_provider.js:14) → DeterministicReplayEngine.replay, wired gateway_runtime.js:515-522. Dormant: ContinuousReplayAuthority (zero requirers), gateway/replay_authority.js:31 ('single replay authority' claim, instantiated only by two unwired files), legacy Python workers."
- EVIDENCE: 03-other-authorities.md (L3, PROVEN).
- STATUS: STAGED.

## P12. CAPABILITY — dispatch does not consult the registry (bypass-by-design)

- ANCHOR: `### CAPABILITY AUTHORITY` → BYPASSES ("none observed" — STALE).
- CHANGE: replace with: "WorkerRuntime.dispatch (ping-runtime/workers/worker_runtime.js:14) matches on eventTypes only — registered capabilities are never consulted (PROVEN bypass-by-design). No CapabilityAuthority class exists in live ping (exists only in dormant sibling constitutional-runtime). tenant_capability_grant.js self-declares 'NOT an authority'; its only consumer is its own test — grants are unwired in the live path. CapabilityResolver remains the registry authority (which capabilities exist), but it does not gate dispatch."
- EVIDENCE: 03-other-authorities.md (L3, PROVEN).
- STATUS: STAGED.

## P13. OBJECT EQUIVALENCE — domain views over canonical primitives (evidence, no spec change)

- ANCHOR: Evidence log entry (no authority record changes).
- CHANGE: add: "2026-09-30 L4 PROVEN: all 10 proposed Growth OS domain concepts (ResearchPackage, Signal, Claim, EvidenceRecord, KnowledgeRecord, Learning, ExperimentResult, ContentArtifact, AudienceCluster, Opportunity) reuse existing PING primitives (mission rows + payload JSONB, Observation/OBSERVATION_CREATED, ClaimWorker/CLAIM_CREATED, kernel Evidence, kernel Knowledge, knowledge_nodes, ping_missions.result, kernel Artifact, knowledge_nodes/edges, Assessment). Zero new objects justified. Genuinely missing only as enum FIELDS (not objects): SUPPORTED/FALSIFIED/INCONCLUSIVE and CONFIRMED/REFUTED/UNCLEAR verdicts. REJECTED and FAILED_EXECUTION semantics already exist. Domain vocabulary may be a VIEW over canonical primitives."
- EVIDENCE: 04-object-equivalence.md (L4, PROVEN).
- STATUS: STAGED.

## P14. ENGINE MAPPING — seven engines need no new authority (evidence, no spec change)

- ANCHOR: Evidence log entry (no authority record changes).
- CHANGE: add: "2026-09-30 L5 PROVEN: all seven Growth OS engines (Signal, Audience Graph, Opportunity, Content Memory, Experiment, Distribution, Learning) map onto existing PING primitives/authorities/mission types with NO new storage and NO new authority. Only new non-authority items: three bounded mission labels/templates (INTELLIGENCE_RESEARCH, EXPERIMENT_RUN, DISTRIBUTION_RUN) routed by existing WorkerRuntime.dispatch(); domain payload schemas; optionally durable approval event types (pre-existing gap). INTELLIGENCE_RESEARCH is a proposed mission label — NOT PROVEN in code (zero hits 2026-09-30)."
- EVIDENCE: 05-engine-mapping.md (L5, PROVEN).
- STATUS: STAGED.

## P15. CONVERGENCE MAP — the 14-capability map and the walkthrough test (L6)

- ANCHOR: Evidence log entry (no authority record changes).
- CHANGE: add: "2026-09-30 L6 PROVEN: 14-capability convergence map built (Research, Signals, Claims, Evidence, Audience learning, Opportunity analysis, Experiments, Content generation, Claim verification, Distribution preparation, Metrics ingestion, Learning, Playbooks, Next-question generation) — 8 rows have no gap or vocabulary-only gaps; the real gaps are bounded and pre-existing: (1) three mission labels absent from code (INTELLIGENCE_RESEARCH, EXPERIMENT_RUN, DISTRIBUTION_RUN — route via existing WorkerRuntime.dispatch); (2) verdict/grade vocabularies missing as literals (fields, not objects); (3) durable human-approval record (Nolan's approval law honored but not a canonical ping_events type; in-memory approval classes unwired); (4) /ingest producer (canonical door live, zero callers); (5) bounded analysis behaviors (contradiction detection, claim→mission chaining, identity stitching, transcript-accuracy pass) — behaviors, never authorities. THE TEST walkthrough ('Research Jev/Typesafe…'): 18 arrows mapped, 13 ride fully PROVEN existing primitives/authorities, 5 touch the vocabulary/label/behavior gaps above; no arrow requires a new authority or store; zero hidden MarketingOS database / ResearchAgent truth store / ContentBrain memory / GrowthAgent authority — durable state lands only in ping_events, ping_missions, knowledge_nodes/edges, Qdrant vectors, plus VM-side operator tooling. Compounding path: every mission leaves residue in four existing homes under five existing authorities (UnifiedEventRuntime, MissionRuntime, KnowledgePromoter, EvidenceAuthority, authorizeWorkOrder); research compounds via unverified-claims-become-next-mission; experiments compound via confidence updates (never policy); distribution compounds via metric observations → learning → playbook."
- EVIDENCE: 06-convergence-map.md (L6, PROVEN; load-bearing citations re-verified live on lane-b/tenant-dispatch-threading @ 546b62d76).
- STATUS: STAGED.
