# WORLD-SHARD-1 LOG

## Decisions at 80%+

1. Ran against pristine `git archive e48ef710` (/home/nolan/ping-clean) instead
   of the live working tree. Reason: another lane's half-done refactor
   (registry.ts -> missing ./schema-roles) breaks every renderer import in the
   live tree; the protocol pins HEAD e48ef710 and forbids touching other
   lanes' dirty work. The archive touches neither the tree nor .git.
   Recorded as finding F-1.
2. Viewport-meta assert runs on the assembled SSR document shell
   (doctype/head/body), since SitePageView renders a fragment. The shell is
   part of the render step, not a cheat around the assert.
3. Phone uniqueness implemented within-world (protocol's 555-01XX namespace
   cannot hold 500 unique worlds; noted in SUMMARY).
4. Verify rule for correct-fact: owner phone must own a tel: href; the
   superseded source phone may appear only inside labeled owner-correction
   provenance (matches the renderer's designed SOURCE SAYS X / OWNER SAYS Y
   behavior). An earlier stricter rule (source phone must not appear at all)
   was falsified by live HTML inspection and corrected.
5. Service names deduped per world after a smoke-test false positive
   (duplicate synthetic titles made the hidden-object check misfire).

## Timeline (2026-09-23 MDT)

- 20:09 shard assigned (worlds 500-999). Read MISSION-PROTOCOL.md fully.
- 20:15 Pig load 2.03/24 cores: under saturation ceiling, proceeded.
- 20:15-20:40 explored repo pipeline (generateSiteSpec, validateSiteSpec,
  buildRenderContext, SitePageView, safe-link, schemas); wrote single tsx
  harness (world -> source -> observation -> evidence -> objects ->
  relationships -> owner intent -> projection -> site spec -> render ->
  verify).
- 20:40-21:05 fought the execution environment, all harness-side:
  sandbox/Pig filesystem split (harness must live on the Pig),
  react-dom/server bare import, .css module import under plain node,
  dirty-tree missing ./schema-roles (led to the git-archive decision),
  tsx CJS circular-import vs ESM CSS-stub tradeoffs, "React is not defined"
  (global React shim). Two verify false positives diagnosed via HTML
  inspection and fixed (service-name dedupe; owner-correction provenance
  rule).
- 21:05 smoke 495-510: 16/16 GENERATED, ~9,200/min.
- 21:13 full shard run: 500/500 in ~1.2 s compute, 24,100/min, results
  streamed incrementally. Retrieved results.jsonl + stats.json to the shard
  dir. Wrote SUMMARY.md and this log.

## After finishing shard 1

Per the no-idling rule: shard-5 ([2500,3000)) is unclaimed (existing:
shard-0, shard-1, shard-2, shard-3). Taking shard-5 next with the same harness
(only START/END change). Then falsification of sibling shards' failure
classifications, then next highest-value gap.
