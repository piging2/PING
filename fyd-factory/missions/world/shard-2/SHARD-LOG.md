# SHARD-2 log (WORLD missions 1000-1499)
- harness start: 2026-09-24T03:13:50.752Z
- repo: /home/nolan/projects/ping (read-only; no repo writes, no commits)
- decision (80%+): protocol lists projection before sitespec, but the repo seam buildRenderContext(spec, graph) requires the spec first; running sitespec -> projection to follow the real authority order.
- progress: 50/500 worlds, 18612.2 missions/min, peak RSS 98 MB
- progress: 100/500 worlds, 20684.2 missions/min, peak RSS 116 MB
- progress: 150/500 worlds, 21983.9 missions/min, peak RSS 117 MB
- progress: 200/500 worlds, 21568.9 missions/min, peak RSS 120 MB
- progress: 250/500 worlds, 21574.8 missions/min, peak RSS 121 MB
- progress: 300/500 worlds, 22004.5 missions/min, peak RSS 122 MB
- progress: 350/500 worlds, 22083.4 missions/min, peak RSS 123 MB
- progress: 400/500 worlds, 22714.8 missions/min, peak RSS 124 MB
- progress: 450/500 worlds, 22935.0 missions/min, peak RSS 124 MB
- progress: 500/500 worlds, 23429.1 missions/min, peak RSS 124 MB
- harness end: 2026-09-24T03:13:52.033Z
- total: 500 worlds in 0.02 min = 23427.1 missions/min, peak RSS 124 MB

## Post-run: improve-once loop (generic class 1, ClaimBadge coverage gap)
- 80%+ decision: the badge gap (407 missions, same signature) is a genuine generic defect, not mission semantics; the hostile outcomes (IDENTITY_AMBIGUOUS/EVIDENCE_CONFLICT/ACQUISITION_FAILED) are by-design fail-closed classifications and were NOT "improved".
- Fixture written: missions/fixtures/shard2-claim-badge-gap.json.
- Patch written: missions/patches/0001-shard2-claim-badge-coverage.patch (one file, one mechanism, 3 insertions). git apply --check on the live dirty tree: OK.
- Tested via in-memory patched bundle (edits verified byte-identical to the patch file): full shard rerun -> results-patched.jsonl, unbound 1221->0, 225 missions -> GENERATED, zero count diffs.
- Falsified with 9 edge assertions (CTA zero-objects guard, Links null-render, unsafe-scheme absence): all pass.
- Canonical results.jsonl left as unpatched repo behavior; patch is PROPOSED for the integration writer.
## Observation (other lane, read-only)
- src/fyd/components/registry.ts dirty-tree import of nonexistent ./schema-roles breaks the fyd module graph (HEAD is fine). Worked around in-harness with an esbuild onResolve redirect to ../sitespec/schemas. Not my lane, not patched. Recorded as a finding in SUMMARY.md.
- React warning "Unsupported style property view-transition-name" from SectionShell on every render: cosmetic, logged in SUMMARY.md.
## Next (factory never idles)
- Shard 2 complete. Claiming WORLD shard 6 (indices 3000-3499) next.

## Post-run amendments (2026-09-24 ~04:00 UTC)

- Added compliance caveats to SUMMARY.md: phone-format deviation, marker
  propagation gap, bundled-Node (not literal tsx) runtime, and the unproven
  claim-badge premise. Patch 0001 downgraded to experimental pending product
  confirmation of section claim semantics.
- After WORLD shard-2: WORLD shard-6 was not unclaimed (all WORLD shards
  0-8 had results), so moved to OBJECT continuation instead. Collided with
  OBJECT-SHARD-1 in object/shard-2; collision resolved per
  object/shard-2/COLLISION-NOTE-OBJECT-SHARD-2.md. Mainline OBJECT work
  continued in object/shard-4 (missions 2000-2499).
