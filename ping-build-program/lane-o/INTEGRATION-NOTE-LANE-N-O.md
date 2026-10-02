# INTEGRATION NOTE: LANE O <-> LANE N (shared derivation, no duplicate indexes)

**From:** lane O (dependency index). **To:** lane N (data lineage).
**Date:** 2026-09-23. **Re:** lane N INTEGRATION-REQUEST item 2
("the forward walk blastRadius -> regenerationSet is your dependency-index
input. Coordinate so we do not build two reverse indexes.")

## Resolution

We share the derivation; we do NOT share the index. One edge source, two
planes:

- **Edge source (shared, single owner per edge kind):** the planner's
  `DependencyManifest` (object-field -> bindingId), `spec.pages`
  (section -> page), the stage 1-6 outputs (source -> observation ->
  evidence -> object field), and lane N's journal/observation records.
  Edge kinds are registered by their producer lanes (G, PROTO, S for
  theirs); nobody invents edge kinds locally.
- **Lane N (query plane):** backward walks (whyThis, whyDidThisChange,
  whatEvidenceSupportsThisAnswer), forward blast-radius INQUIRY, typed gaps,
  supersede chains. Answers questions; never schedules work.
- **Lane O (scheduler plane):** the dependency index consumes the same
  derivation, adds content-hash pins, and runs propagation with early cutoff
  to produce ordered, bounded, idempotent regeneration JOBS for the batch
  scheduler. Schedules work; never answers lineage questions.

Lane N's `regenerationSet` (SITE-SECTION / RENDERED-CLAIM / ANSWER ids) is the
coarse input the index refines: the index's `propagate` turns "these artifacts
are in the blast radius" into "these bindings regenerate, in this rank order,
with these deterministic job ids, inside this tick budget" — with early cutoff
dropping the no-op cases the blast radius cannot see (byte-identical re-ingest,
volatile stamps, superseded-but-unchanged claims).

## Anti-duplication invariants (both lanes hold)

1. There is exactly one reverse-edge derivation per tenant. Lane N builds it
   for queries; lane O builds it for scheduling; both consume the producer
   records above. If the two ever disagree, the producer records are wrong,
   not either index — the `verifyEquivalence` pin check (lane O) and lane N's
   typed gaps are the two detectors.
2. The lane-O index never invents lineage edges for inquiry and lane N never
   invents scheduler state. The index is rebuildable from canonical state and
   dies without mourning; lineage is a derived projection (index digest +
   builtFrom) and dies without mourning.
3. Unbound sections (manifest gap) are reported by the index as
   `unbound_sections`; lane N sees the same gap as a missing BOUND edge.
   Same defect, two detectors, one fix (the generator registers the binding).

## Proven in the spike

`spike/prove.mjs` runs on lane N's Coppersmith ids (object
`website-business-2f1327c09d622175-service-139408827c27`, sections
`home:Services:2` / `services:Services:0`): the description change that lane N's
`blastRadius` flags propagates through the index to exactly the two sections
and two pages, with early cutoff, dedup, deterministic jobs, and crash-safe
replay. The two planes agree on the affected set by construction, not by
convention.
