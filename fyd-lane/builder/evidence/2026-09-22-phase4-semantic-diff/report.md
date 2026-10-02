# Phase-4 Builder-3: Semantic Diff + Source Refresh

Date: 2026-09-22. Repo: `/home/nolan/projects/ping`, branch `fyd/builder-composition`, base `1539b28c`.
Scope: NEW MODULES ONLY. No existing repo file was modified.

## Files added

- `src/fyd/builder/semantic-diff.ts` (approx 710 lines): the twin diff engine.
  `diffTwin(input)` is pure and deterministic: same inputs produce the same
  diff, byte for byte. No LLM inside.
- `src/fyd/builder/source-refresh.ts` (154 lines): the source-refresh
  operation with the owner-layer survival proof.
- `src/fyd/builder/__tests__/semantic-diff.test.ts` (10 tests)
- `src/fyd/builder/__tests__/source-refresh.test.ts` (6 tests)

Test result: 9 suites, 69/69 green. The 53 pre-existing tests are untouched
and still pass. Raw log: `jest.log` in this directory.

## Design

`diffTwin` takes old vs new SOURCE-layer object graphs, the current
dependency manifest, the OwnerIntent, and the OWNER-layer field corrections.
It computes, in order:

1. Object changes: added, removed, visibility-changed, provenance-changed
   (the claim ref moved), fields-changed (title, description, field keys;
   sorted). One entry per object; highest-priority kind wins, so the output
   is stable when several aspects change at once. Volatile stamps
   (createdAt/updatedAt/derivedAt) are not semantic and never produce an entry.
2. Relationship changes: added, removed, status-changed, endpoints-changed
   (subject/object/predicate/evidenceRef).
3. Affected bindings: the manifest reverse walk, at two granularities.
   Object-field impact walks each changed object id; claim-ref impact walks
   the before/after provenance refs (and relationship evidenceRefs), so a
   binding bound to the evidence is flagged even when the object id does not
   match. Reasons are recorded per binding.
4. Owner conflicts (surfaced, never silently applied):
   - prohibited-positioning: new/changed source text contains an OwnerIntent
     predicate. Matching mirrors `generated-presentation.ts` exactly:
     case-insensitive, word-boundary, escaped needles (so "best" does not
     fire inside "bestiality", multi-word phrases match as substrings).
     Scoped to the change; pre-existing text on untouched objects is the
     planner/verifier business, not this diff.
   - owner-override-collision: the source moved under an OWNER-layer
     correction (field value drifted from `sourceValue`, field removed, or
     whole object removed). The owner value still wins; the drift is
     recorded, mirroring the `sourceDrifted` read-seam semantics.
   - operating-constraint-collision: the change touches a binding whose
     component an honored operating constraint removed (via
     `resolveOperatingConstraints`). Unknown constraints never collide:
     they are recorded, not applied.
5. Proposed regeneration actions, typed and sorted in execution order:
   `reverify-graph` (the object builder must re-attest before anything
   consumes the new source), then `review-owner-conflict` (owner decision
   required; always sorts before regeneration of the surface it touches),
   then `record-source-drift` (owner wins automatically; the drift is made
   visible), then `regenerate-binding`. Bindings on constraint-removed
   components are NOT proposed for regeneration; their review action is the
   gate. Empty diff: a single `no-op`.

`refreshSource` replaces the SOURCE layer wholesale with the re-derived
graph (re-derivation of raw observations happens upstream at the intake
seam) and carries the OWNER layer through as a canonical deep copy: equal
content, no shared references, never merged with source data, never
mutated. The machine-checkable survival proof is the digest pair:
`ownerLayerDigestBefore` / `ownerLayerDigestAfter` (sha256 over the
canonicalized owner layer: sorted keys, assertions in (objectId, field)
order). Equality means OwnerIntent and every correction survived.

## Conflict semantics

- The action vocabulary has no overwrite/apply-owner action. Owner state
  can only be read by this lane.
- Prohibited positioning and operating-constraint collisions propose
  `review-owner-conflict`: a human decision gates the touched surface.
- Owner-override collisions propose `record-source-drift`: the owner value
  keeps winning by law; the movement is surfaced instead of silent.
- When the refreshed source drops a fact the owner overrode, the correction
  is RETAINED in the owner layer (digest proves it) and the collision is
  flagged. The owner layer is never pruned to match the source.

## OwnerIntent survival proof (test scenario)

`source-refresh.test.ts` covers the mission scenario directly:

- Clean refresh (description change + added service, asserted phone field
  untouched): `ownerLayerIntact === true`, digests equal, intent fields
  (goals, prohibitedPositioning, operatingConstraints) intact, diff has
  changes and no conflicts, actions start with `reverify-graph`.
- Refresh introduces prohibited positioning ("cheapest" in a service
  description): conflict `prohibited-positioning/svc-drains` surfaced with a
  `review-owner-conflict` action; intent still lists the predicate;
  `ownerLayerIntact === true`.
- Refresh removes the phone field the owner overrode: the owner layer
  retains the correction (`ownerValue` "555-0199", `sourceValue`
  "555-0100"); diff records `fields-changed [phone]` plus an
  `owner-override-collision` with a `record-source-drift` action.
- Refresh removes the whole overridden object: correction retained,
  collision detail names the removal.
- Digest is insensitive to assertion input order; refresh is deterministic
  (JSON-equal across runs); refresh never mutates its inputs (snapshotted
  before/after).

## Example diff output

Scenario: description change + phone drift under an owner correction +
"cheapest" added to a service description + a new service, with intent
(prohibited "cheapest", constraint "no-online-booking") and one phone
correction. Produced by `renderSemanticDiffReport`:

```
# Semantic diff: demo-tenant

- engine: fyd-semantic-diff@1
- source changed: **YES**
- owner conflicts: **YES (3)**

## Object changes (3)
- fields-changed "biz-trade" [description, phone]
- fields-changed "svc-drains" [description]
- added "svc-sewer"

## Relationship changes (1)
- added "rel-7" biz-trade -[provides]-> svc-sewer

## Affected bindings (4)
- "home:CTA:0" (CTA, direct, source-only): object "biz-trade" fields-changed [description, phone]
- "home:Contact:0" (Contact, owner_authored, owner-wins): object "biz-trade" fields-changed [description, phone]
- "home:Hero:0" (Hero, direct, source-only): claim "website-ingestion:https://example.com/" changed (claim of object "svc-sewer" added (after))
- "home:Services:0" (Services, direct, source-only): object "svc-sewer" added

## Owner conflicts (3)
- [operating-constraint-collision] operating-constraint/home:CTA:0
  - blocked by: operating-constraint:"no-online-booking"
  - source change touches binding "home:CTA:0" (CTA), which honored operating constraints remove (no-online-booking): surfaced for owner review, component stays removed.
- [owner-override-collision] owner-override/biz-trade/phone
  - blocked by: owner-correction:"biz-trade"."phone"
  - source "phone" moved from "555-0100" to "555-0111" under an owner correction (owner value "555-0199" still wins): drift recorded, owner layer untouched.
- [prohibited-positioning] prohibited-positioning/svc-drains
  - blocked by: prohibited-positioning:"cheapest"
  - new source text on "svc-drains" contains prohibited positioning (cheapest): surfaced for owner review, never presented silently.

## Proposed actions (7)
- reverify-graph -> graph:demo-tenant: 3 object change(s), 1 relationship change(s): the object builder must re-attest before regeneration
- review-owner-conflict -> operating-constraint/home:CTA:0: source change touches content removed by an honored operating constraint: owner decision required
- review-owner-conflict -> prohibited-positioning/svc-drains: new source text collides with prohibited positioning: owner decision required before presentation
- record-source-drift -> owner-override/biz-trade/phone: source moved under an owner correction: the owner value still wins, the drift is recorded for review
- regenerate-binding -> home:Contact:0: binding affected by source change (object "biz-trade" fields-changed [description, phone])
- regenerate-binding -> home:Hero:0: binding affected by source change (claim "website-ingestion:https://example.com/" changed (claim of object "svc-sewer" added (after)))
- regenerate-binding -> home:Services:0: binding affected by source change (object "svc-sewer" added)

ownerLayerDigestBefore: 7f77b3f992fd34871c1176bbd861e85d1960e3ae254cd30df92008fb59ef7724
ownerLayerDigestAfter:  7f77b3f992fd34871c1176bbd861e85d1960e3ae254cd30df92008fb59ef7724
ownerLayerIntact: true
```

Note the CTA binding is affected but has no `regenerate-binding` action: its
review action is the gate, and the component stays removed until the owner
decides.

## Follow-ups (not done; out of scope for this worker)

1. Export wiring: `src/fyd/builder/index.ts` does not yet re-export the new
   modules. Suggested additions (another worker owns `index.ts`):
   `export { diffTwin, renderSemanticDiffReport, SEMANTIC_DIFF_VERSION } from "./semantic-diff";`
   plus the diff/conflict/action types, and
   `export { refreshSource, digestOwnerLayer, SOURCE_REFRESH_VERSION } from "./source-refresh";`
   plus `OwnerLayer`, `SourceRefreshInput`, `SourceRefreshResult`.
2. The prohibited-positioning matcher duplicates the private
   `containsProhibited` in `generated-presentation.ts` (deliberately: that
   file is frozen for this worker and the function is not exported). If a
   future worker exports it, `semantic-diff.ts` should import it instead of
   carrying its own copy, so the two semantics cannot drift.
3. `diffTwin` does not verify that `manifest.tenantId` matches
   `input.tenantId`; it treats the manifest as a lookup table. If the
   runtime route wants fail-closed tenant checking here, that is a small
   addition for the route-owning worker.
4. STATE.json was not updated, per instructions.
