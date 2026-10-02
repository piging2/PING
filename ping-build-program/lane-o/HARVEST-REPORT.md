# LANE O — HARVEST REPORT: DEPENDENCY INDEX FOR TARGETED REGENERATION

Date: 2026-09-23. Status: PROVEN at spike level (46 assertions, pure JS, zero deps).
Spike: `~/workspace/ping-build-program/lane-o/spike/dep-index.mjs` + `spike/prove.mjs`
(run: `node ~/workspace/ping-build-program/lane-o/spike/prove.mjs`).
Design (prior run, still current): `DEPENDENCY-INDEX-DESIGN.md`.
Factory contract (prior run, still current): `INTEGRATION-NOTE-FACTORY.md`.

## PROBLEM

The factory regenerates SiteSpecs from scratch on every source refresh. The
byte-identical-output proof (LANE-REG) says nothing about changed input. At
500 businesses x 12 stages x hourly refreshes, blind full regen is the single
biggest cost lever. Current cost of one change, measured on the Coppersmith
fixture (7 sections, 4 pages): a service-description change recomputes ALL 7
sections + 4 pages + all downstream projections, because nothing records which
derived artifact depended on the changed fact. A byte-identical re-fetch costs
a full pipeline run because nothing compares input pins before recomputing.

## PING ALREADY HAS

Verified against live code on the Pig (repo /home/nolan/projects/ping, branch
fyd-factory, read-only; git log shows all three arrived in 3 commits:
`3f1c2a17`, `60b77425`, `25caf3c5`):

| Asset | Location | What we take |
|---|---|---|
| DependencyManifest + forward/reverse walk | src/fyd/builder/manifest.ts (91 lines) | THE authoritative section-layer edge source. `reverseWalk(objectFieldOrClaimRef)` is the proven change-impact primitive. We do NOT re-derive section edges; we consume the manifest. |
| RegenerationAction kinds + ACTION_RANK | src/fyd/builder/semantic-diff.ts:160-177, :635 | The regeneration vocabulary and the reverify-first ordering law (no-op < reverify-graph < review-owner-conflict < record-source-drift < regenerate-binding). Kept verbatim as the planner's rank law. |
| Seed object->section index + pagesForSections | src/fyd/refresh/dependency-index.ts (141 lines) | The register/merge/invalidate contract shape. It is OBJECT-level only, has no pins, no event-stream refresh, no planner: the gap we fill. |

PING does NOT have: field-level invalidation, content-hash early cutoff,
event-stream-driven incremental refresh, a regeneration planner, pin/watermark
integrity, or any connection from object changes to Ask FYD contexts, feeds,
or protocol projections. Those are this lane's scope.

## EXTERNAL CANDIDATES

Searched the ecosystem (2026-09-23): the convergent mechanism across
salsa (rust-analyzer), Turbopack's Turbo Engine, Turborepo, Bazel/Buck2 is
identical in all of them — content-addressed identity, reverse-dependency
index, early cutoff on recomputation, debounced coalescing. No library
implements "which object field invalidates which FYD site section": that
mapping is domain-specific to the planner's DependencyManifest. There is
nothing small and adoptable to clone; the mechanism is harvested, not a
library. This is ~500 lines of pure deterministic code we own.

## LICENSES

No third-party code vendored. Mechanism-level harvest only (ideas, not code).
Zero license surface. Zero new dependencies.

## TESTED

Spike implements DEPENDENCY-INDEX-DESIGN.md sections 4-7, 10-12 at pure-JS
level against the Coppersmith fixture with REAL ids from the LANE-LIN tracer
(object id `website-business-2f1327c09d622175-service-139408827c27`, rel id
`rel-f450fdb901a6baa3`, sections `home:Services:2`, `services:Services:0`):

- description change -> exact set: 2 sections + 2 pages invalidated; hero,
  about, contact, footer, /contact, /reviews untouched (proven by assertion,
  not by eyeball). Early cutoffs: 2 branches died at pin comparison.
- unaffected artifacts regenerate byte-identically (4 section digests compared
  before/after: equal). Changed sections differ.
- second identical change -> empty invalidation set; re-delivered events die
  at the pin pre-check.
- byte-identical re-ingest -> zero invalidations, one hash comparison.
- planner: rank law holds, deterministic job ids (idempotency keys), overflow
  spills with causes preserved under a 2-unit budget.

## WINNER

Hand-rolled minimal index (the spike), consuming PING's own
DependencyManifest as the authoritative edge source. Nothing to adopt from
outside; nothing in PING to replace.

## ADOPT-ADAPT-REJECT

- ADOPT: the mechanism (pin early cutoff + reverse walk + dedup rule +
  coalesced tick) as implemented in the spike. It slots into the factory
  contract in INTEGRATION-NOTE-FACTORY.md with no API changes.
- ADAPT: PING's ACTION_RANK vocabulary extended with `regenerate-section` /
  `regenerate-page` at rank 4 (same rank as regenerate-binding); the rank law
  itself is untouched.
- REJECT: (a) any external incremental-computation library — nothing fits the
  manifest-driven edge model; (b) making the index writable by the renderer or
  readable as lineage — the index is a scheduler cache, never evidence;
  (c) per-field pins if the 500-run shows field hashing costs more than it
  saves (object-level pins are the documented fallback); (d) a new database —
  one JSONL file per tenant, or rows in a store the factory already runs.

## CODE WE DO NOT NEED TO WRITE

- No section-edge derivation: the planner's DependencyManifest already emits
  object-field -> bindingId edges per build. The index consumes them.
- No second event authority: the index subscribes to the PING event stream
  (phase0's forensic subject); it creates no events.
- No lineage engine: lane N owns the query plane; the index is the scheduler
  plane over the same derivation (see INTEGRATION-NOTE-LANE-N-O.md).
- No LLM in the invalidation path: propagation is hash comparison + graph
  walking, byte-reproducible.

## MINIMAL PING WRAPPER

The spike's `dep-index.mjs` IS the wrapper shape: six pure functions the
factory batch scheduler calls —
`buildIndex`, `propagate`, `planRegeneration`, `applyTickResults`,
`rebuildIndex`, `verifyEquivalence` — with the exact record formats in
INTEGRATION-NOTE-FACTORY.md sections 2-3. Port to the factory's TypeScript
when LANE-INCREMENTAL adopts; semantics are normative, language is not.

## FAILURE TEST

Red team, all green in `prove.mjs` (R1-R7):

- R1 missed invalidation (worst failure): a section the manifest never bound
  (`home:Reviews:5`) is reported as a TYPED GAP (`unbound_sections`), and the
  planner emits a bounded coarse-fallback job every tick (re-verified by render
  compare). Never silently stale.
- R2 over-invalidation storm: 70 sections bound to one field -> fan-out
  tripwire fires (>64, lane-J observable); dedup rule invalidates each section
  exactly once; fan-in merges recorded.
- R3 cyclic dependencies: poisoned upstream edge detected structurally by
  `detectCycles` (load-time semantic); propagation still terminates via the
  visited set; the cycle is reported as an edge-registration defect.
- R4 index corruption after crash: index lost -> `rebuildIndex` from canonical
  state, verified byte-identical against the stage-12-pinned digest; wrong
  digest -> verified=false (no false pass).
- R5 crash mid-tick (pins moved, watermark not persisted): replay from the
  persisted watermark yields the IDENTICAL plan id and converges to the
  IDENTICAL index digest (deterministic job ids + pin comparison make
  re-application a no-op).
- R6 pin tamper/drift: the scheduled `verifyEquivalence` check names the exact
  divergent node.
- R7 staleness: `serveCheck` refuses to serve a page whose pin predates its
  invalidation (flagged, never lied about).

Plus invariants proven: build is pure (identical digest for identical
canonical, `built_at` excluded); volatile stamps are never edges (no storm
possible by construction); index survives JSONL serialization round-trip.

## PRODUCT CAPABILITY UNLOCKED

"This review changed" -> regenerate exactly the affected sections, nothing
else. This is what makes FYD cheap and safe at 500 sites: the batch scheduler
gets an ordered, bounded, idempotent regeneration plan per tick instead of a
blind full regen. It is also the execution side of lane N's blast-radius
analysis: lane N answers "what breaks if this source disappears" (query
plane); the index answers "what must be recomputed now" (scheduler plane),
over the same shared derivation, with no duplicate reverse indexes.

## BYTES-DEPENDENCY COST

- `spike/dep-index.mjs`: ~19 KB, `spike/prove.mjs`: ~18 KB. Zero runtime
  dependencies (node:crypto, node:assert only). Zero new databases, zero new
  authorities, zero new secret surfaces, zero vendor surface.
- Measured on the fixture: a real change recomputes 2/7 sections + 2/4 pages
  (vs full regen of everything); a no-op re-ingest costs one sha256 comparison
  (vs a full pipeline run). The 500-site stress run (factory cohort-0) will
  measure the true ratio: invalidation set size vs full-regen node count,
  early-cutoff rate, dedup merge rate, tick latency p50/p95/p99, watermark lag.
- Projected: at 500 tenants x hourly refreshes, if the early-cutoff rate on
  real data matches the fixture behavior (most refreshes are no-op re-fetches),
  regeneration work drops by an order of magnitude. The MVI includes the
  metrics hooks (section 5 of INTEGRATION-NOTE-FACTORY.md) to verify this
  instead of asserting it.

## PROOF STATUS

PROVEN at spike level (46/46 assertions). NEXT:
1. LANE-INCREMENTAL adopts INTEGRATION-NOTE-FACTORY.md record formats
   (O-INTEGRATION-1) — lane O does not unilaterally change the API after
   adoption.
2. Port `dep-index.mjs` to the factory's TypeScript behind the planner API;
   run the MVI against the cohort-0 synthetic batch and record the measured
   invalidation/full-regen ratio.
3. Full-chain edges (Ask FYD contexts via lane G, feeds/projections via lane
   PROTO) once those producers exist; coarse fallbacks documented and shipped
   in the MVI, not deferred silently.

BLOCKED: none (lane-internal). Coordination items O-INTEGRATION-2/3/4 remain
open with the factory coordinator / lanes G / S per the integration note.
