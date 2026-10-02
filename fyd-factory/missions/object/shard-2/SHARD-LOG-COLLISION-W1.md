# OBJECT-SHARD-2 log (missions 1000-1499)

## Claim
- Claimed 2026-09-23 ~21:25 MDT. OBJECT missions 1000-1499 (of 3500).
- Rationale for next-highest-value gap: all WORLD shards 0-8 occupied; OBJECT
  shard-2 unclaimed and directly adjacent to the WORLD shard-2 render-pipeline
  work (same renderer, same verify asserts), so it validates the claim-badge
  patch blast radius on the OBJECT mission class.

## Corpus
- Fixtures: ~/workspace/fyd-factory/corpus/fixtures (62 JSON files, 1.2 MB),
  transferred to the Pig at /home/nolan/fyd-factory-shard2/corpus/fixtures.
- Rotation: all graph-bearing JSONs sorted by path (batch-a, batch-b,
  clearwater, hostile/*, professional, ...); mission i uses fixtures[i % N].
- Deterministic mutations per mission: drop 0-2 non-business objects (i%3),
  privatize one object (i%7==0), reobservation tweak (i%5==0),
  owner phone correction (i%11==0).

## Pipeline per mission
- load+mutate -> generateSiteSpec (generatedAt pinned) -> validateSiteSpec ->
  buildRenderContext -> render HTML per page -> determinism check (spec twice,
  full render twice, digest compare) -> verify (same 6 asserts as WORLD) +
  hostile fail-closed check (phone-conflict fixtures must not render tel:).

## Falsification of other shards' classifications
- WORLD shards 3/5/7 report "no generic defect" / 423 GENERATED: their
  harnesses never measured section-level claim-badge coverage (shard-3's
  unbound_claim_count tracks evidence conflicts only). No contradiction with
  the WORLD shard-2 badge-gap finding; the finding stands on its own evidence.
- OBJECT shards 0/1 ran hostile-phonec fixtures (11 rows each) and classified
  them GENERATED: they never checked tel: dial actions against the fixture's
  expected fail-closed mode. The phonec dial-action violation found here is
  NEW and unmeasured elsewhere.

## Generic class found: phonec dial-action fail-closed violation
- Signature: explicit phone-conflict markers present, but the Contact section
  renders a tel: dial action for one side of the conflicted pair.
- Affected fixtures: hostile-phonec-{food,personal,retail,trade},
  batch-b/f2b-canyon-view-dental ("phone conflict preserved" variant).
- Minimized: section=home:Contact component=Contact renders
  <a href="tel:(970)555-0137"> despite the fixture contract "no canonical
  phone asserted. Compiler must not dial either."
- Fixture: ~/workspace/fyd-factory/missions/fixtures/object2-phonec-dial-gap.json
- Patch: ~/workspace/fyd-factory/missions/patches/0002-object2-phonec-dial-gating.patch
  (one path: src/fyd/components/renderer.tsx, contactMethod gate +
  fieldConflictMarker/contactFieldConflicted helpers).
- Markers honored: fields.<kind>_conflicts_with, and fields.conflicts[]
  entries naming both the kind and a conflict. Object's own fields plus
  one-hop active public relationships. Explicit owner corrections (human
  resolution) outrank markers and still render.
- git apply --check: PASS (hunk at 769, offset +3 on the live dirty tree).
- Patch tests (in-memory, 4/4 pass):
  1. hostile-phonec-trade renders no tel: dial action.
  2. f2b-canyon-view-dental renders no tel: dial action.
  3. clearwater-plumbing-demo still renders tel: (no regression).
  4. owner-corrected phone on a conflict-marked object still renders tel:.
- Repo not modified; integration writer + Nolan decide.

## Repo observations (not patched, other lanes)
- src/fyd/components/registry.ts on the dirty tree imports nonexistent
  ./schema-roles (HEAD: ../sitespec/schemas). Worked around in-memory via an
  esbuild onResolve redirect; repo untouched.
- React warning on renders: unsupported style key view-transition-name
  (likely should be viewTransitionName). Cosmetic.

## Collision with OBJECT-SHARD-1 (resolved 2026-09-24 ~03:55 UTC)

- OBJECT-SHARD-1 ran object/shard-2 first (~03:15-03:33 UTC) with the shard-1
  harness; I started work there at ~03:30 without verifying shard-2 was
  unclaimed, and at 03:47:54 UTC my results download overwrote their
  results.jsonl.
- Recovery: re-ran their exact deterministic harness (their file, fixtures,
  shims; FYD_START=1000 FYD_END=1499). Reproduction matched their SUMMARY.md
  exactly (493 GENERATED / 7 NEEDS_REVIEW, same rail-leak class, 4 trades-a +
  3 hostile). Restored as results.jsonl; their SUMMARY.md untouched.
- My duplicate run preserved as results-collision-w1.jsonl,
  results-collision-w1-patched.jsonl, SUMMARY-COLLISION-W1.md; see
  COLLISION-NOTE-OBJECT-SHARD-2.md.
- Transfer-dir copies cleaned up. Moving mainline work to object/shard-4
  (missions 2000-2499), verified unclaimed.
