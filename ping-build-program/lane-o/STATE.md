# LANE O — Dependency Index for Targeted Regeneration

Status: PROVEN at spike level (2026-09-23 ~21:30 MDT; 46/46 assertions in
spike/prove.mjs, pure JS, zero deps). Prior design (DEPENDENCY-INDEX-DESIGN.md)
and factory contract (INTEGRATION-NOTE-FACTORY.md) stand unchanged.

## Ledger
- RESEARCHED: 2026-09-23 — charter (OWNERSHIP.md); fyd-factory/orchestration/BUILD-BUSINESS-SPEC.md (12 stages, content-addressed stage outputs, BuildBusiness result, stage 12 certify); fyd-factory/MISSION-STATE.md (LANE-INCREMENTAL lane owns the incremental proof; this lane owns the index design + factory integration note).
- RESEARCHED: 2026-09-23 — PING ALREADY HAS (Pig, read-only): src/fyd/builder/manifest.ts (DependencyManifest, forward/reverse walk over bindings, emitted by the planner); src/fyd/builder/semantic-diff.ts (RegenerationAction kinds + ACTION_RANK, reverify-first ordering); src/fyd/refresh/dependency-index.ts (object->section seed index + pagesForSections, proof-site scoped).
- RESEARCHED: 2026-09-23 — ecosystem: rust-analyzer/salsa, Bazel/Buck2/Turborepo/Nx, CocoIndex converge on the same four mechanisms: content-addressed identity, reverse-dependency index, early cutoff on recomputation, debounced coalescing. Harvested as mechanism, not library.
- DESIGNED: 2026-09-23 — DEPENDENCY-INDEX-DESIGN.md (full chain SOURCE->...->PROJECTION, content-hash vs identity-addressed node rules, propagation algorithm with dedup rule, staleness budget, loss-rebuild procedure, MVI for the 500-site stress run).
- DESIGNED: 2026-09-23 — INTEGRATION-NOTE-FACTORY.md (record formats + regeneration-planner API the factory batch pipeline calls; plugs into stages 8/10/11/12 of BUILD-BUSINESS-SPEC).
- RED-TEAMED: 2026-09-23 — index staleness section in the design doc (stale index -> missed regeneration; over-regeneration storms; mitigation: pinned index digests, watermarked stream replay, lane-J staleness observable, incremental-vs-full equivalence hook for LANE-INCREMENTAL).
- IMPLEMENTED: 2026-09-23 — spike/dep-index.mjs (buildIndex, propagate with dedup rule + early cutoff + fanout tripwire + detectCycles, planRegeneration with ACTION_RANK + deterministic job ids + spill backpressure, applyTickResults atomic pin+watermark, rebuildIndex, verifyEquivalence, serveCheck; ~19KB, zero deps).
- TESTED: 2026-09-23 — spike/prove.mjs, 46/46 assertions green on the Coppersmith fixture with REAL LANE-LIN tracer ids: description change -> exact 2 sections + 2 pages, unaffected sections byte-identical, second identical change -> empty set, byte-identical re-ingest -> one hash comparison, volatile stamps never edges, R1-R7 red team green (missed-invalidation typed gap, storm tripwire, cycle detection, crash rebuild verified, mid-tick crash idempotent replay, pin-tamper detection, staleness serve gate).
- HARVESTED: 2026-09-23 — HARVEST-REPORT.md (full format: PROBLEM / PING ALREADY HAS verified against live Pig code / EXTERNAL CANDIDATES rejected as mechanism-only / LICENSES none / WINNER hand-rolled / ADOPT-ADAPT-REJECT / FAILURE TEST / BYTES-DEPENDENCY COST).
- INTEGRATED: 2026-09-23 — INTEGRATION-NOTE-LANE-N-O.md answers lane N request #2: shared derivation, lane N = query plane, lane O = scheduler plane, no duplicate reverse indexes.
- QUEUED: lane-O propagation spike (business-hours change -> exact invalidation set; early-cutoff on no-op re-ingest; fan-out storm test) — next after coordinator confirms INTEGRATION-NOTE-FACTORY.md adoption by LANE-INCREMENTAL.

## Current position
Lane O owns the dependency INDEX (data structure + propagation + planner API), not the incremental proof (factory's LANE-INCREMENTAL owns INCREMENTAL-SPEC/PROOF). The index is disposable by design: rebuildable from canonical state (graphs + specs + planner manifests), never a second source of truth. The planner's DependencyManifest is the authoritative edge source for the section layer; lane O extends the chain to Ask FYD contexts, feeds, and protocol projections without touching the manifest's ownership.

## NEXT
1. Factory coordination: LANE-INCREMENTAL adopts INTEGRATION-NOTE-FACTORY.md
   record formats (O-INTEGRATION-1); confirm stage-12 certifier pins the index
   digest. Lane O does not unilaterally change the API after adoption.
2. Port spike/dep-index.mjs to the factory's TypeScript behind the planner API
   (semantics normative, language not); run the MVI against the cohort-0
   synthetic batch and record the measured invalidation/full-regen ratio,
   early-cutoff rate, tick latency.
3. Full-chain edges (Ask FYD contexts via lane G's context compiler, feeds,
   protocol projections via lane PROTO) once those producers exist; until then
   the MVI ships with section+page edges + coarse fallbacks (O-INTEGRATION-3/4).
4. Staleness budget defaults need the factory coordinator's sign-off
   (O-INTEGRATION-2); until then they are proposals.
