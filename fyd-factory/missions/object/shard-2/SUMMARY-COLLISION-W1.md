# SUMMARY-COLLISION-W1 (WORLD-SHARD-2's duplicate OBJECT run, missions 1000-1499)

This is the summary of the SECOND, duplicate run of OBJECT shard-2. The
canonical results for this shard are OBJECT-SHARD-1's (results.jsonl +
SUMMARY.md). See COLLISION-NOTE-OBJECT-SHARD-2.md. This file and the
results-collision-w1*.jsonl files are preserved as falsification/comparison
data.

## Harness (mine, different from the canonical run)

- Fixture rotation across all graph-bearing corpus JSONs (sorted by path),
  deterministic mutations per mission (drop/privatize/tweak/owner-correct).
- Pipeline: generateSiteSpec (pinned generatedAt) -> validateSiteSpec ->
  buildRenderContext -> render HTML -> determinism check (spec twice + render
  twice, digest compare) -> verify (6 WORLD asserts + phone-conflict
  fail-closed check).
- Read-only vs the repo; esbuild bundle with in-memory redirect for the
  dirty tree's broken `./schema-roles` import (repo untouched).

## Canonical outcome distribution (unpatched renderer)

- GENERATED_WITH_WARNINGS: 456
- NEEDS_REVIEW: 44 (all at verify; zero crashes)
- Determinism: PASS on all 500. Unsafe URL schemes: 0.
- Throughput ~6,700-7,000 missions/min; peak RSS 236 MB.

## Generic class: phone-conflict dial-action fail-closed violation

Fixtures carrying explicit phone-conflict markers (`fields.conflicts[]`
entries like "PHONE CONFLICT: ...", `fields.phone_conflicts_with`) still get
a `tel:` dial action rendered for one side of the conflicted pair by the
Contact section, contradicting the fixture contract ("no canonical phone
asserted; must not dial either").

- hostile/hostile-phonec-{food,personal,retail,trade}.json: 9 each (36)
- batch-b/f2b-canyon-view-dental.json: 8 (the 9th had the deterministic owner
  phone correction and correctly stayed generated: owner correction is human
  resolution)

Improve-once loop: minimized to ContactSection rendering
`<a href="tel:(970)555-0137">`; fixture
missions/fixtures/object2-phonec-dial-gap.json; one-path patch
missions/patches/0002-object2-phonec-dial-gating.patch (renderer.tsx,
contactMethod gate + fieldConflictMarker/contactFieldConflicted; markers on
object + one-hop relations; owner corrections outrank); git apply --check
PASS; 4/4 patch tests pass (phonec blocked, dental blocked, clearwater still
dials, owner-corrected still dials); patched full rerun:
results-collision-w1-patched.jsonl shows EXACTLY the 44 phonec missions flip
NEEDS_REVIEW -> GENERATED_WITH_WARNINGS, zero other changes, zero crashes.
Repo not modified; patch proposed for the integration writer + Nolan.

## Corroboration of the WORLD shard-2 badge gap

Same section-level claim-badge check on fixture graphs: 1,206 unbound
sections (Links, CTA, ObjectRail binding objects but rendering no
ClaimBadge). Independent confirmation of the WORLD shard-2 generic class on
non-synthetic-world inputs. (The canonical OBJECT-SHARD-1 run found a
different unbound class: ObjectRail raw title/description reads.)

## Falsification notes

- WORLD shards 3/5/7 "no generic defect": their harnesses never measured
  section-level badge coverage. No contradiction.
- OBJECT shards 0/1 classified hostile-phonec fixtures GENERATED: they never
  checked tel: dial actions against the fail-closed contract. The violation
  found here is new and unmeasured elsewhere.
- The canonical OBJECT-SHARD-1 run's 7 rail-leak NEEDS_REVIEW missions are a
  different class from both of mine; all three classes are real and disjoint.
