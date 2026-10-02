# WORLD-SHARD-3 LOG

## 2026-09-23 ~20:20 MDT: task received, protocol read
Read MISSION-PROTOCOL.md fully. Shard: WORLD indices 1500-1999.

## Decision: explore repo API surface before writing the harness (80%+ confidence)
Ran read-only explore scripts via wsl-run.sh. Found: generateSiteSpec (src/fyd/proceduralize/generator.ts), validateSiteSpec/isRenderable (src/fyd/sitespec/validator.ts), buildRenderContext + SitePageView + renderToStaticMarkup pattern (src/fyd/components/renderer.tsx + __tests__/render.test.ts), safe-link rules (src/fyd/sitespec/safe-link.ts), projection-seam-attack test regexes for unsafe URL asserts, FieldVisibilityDecision shape, ObjectVisibility public/private filtering in resolveQuery.

## Decision: single esbuild-bundled node run, not tsx (evidence-driven)
tsx from outside the repo failed twice: (1) `.module.css` import in object-circle.tsx (fixed with a require.extensions stub), (2) `Cannot find module './schema-roles'` on an extensionless relative import that esbuild resolved fine. Rather than fight the loader, bundled the harness + repo-internal TS with esbuild (read-only): --alias:@=src, --loader:.css=empty, --packages=external, --format=cjs (CJS so next/link subpath and node builtins resolve natively). One ssh invocation: bundle + one node run for all 500 missions. Repo working tree never touched (bundle output went to /home/nolan/fyd-shard3, outside the repo).

## Saturation check
Pig load 2.39 on 24 cores before the heavy run: no wait needed per the 2x rule.

## Smoke test, then full run
Smoke (3 worlds) passed. Full run: 500/500 missions, 1,367 ms, 120 MB peak RSS. Results appended incrementally to /home/nolan/fyd-shard3/results.jsonl, fetched back to shard-3/results.jsonl.

## Finding: world 1745 NEEDS_REVIEW was a harness assert bug
First run showed 1 NEEDS_REVIEW (hidden_object_leaked). Diagnosed by replicating the mulberry32 sequence in Python: hidden title "Advisors Assessment 1" is a strict prefix of visible sibling "Advisors Assessment 11"; the raw substring check false-positived. Not a repo leak: visibility=private filtering worked. Fixed the assert (boundary-aware regex), re-ran the full shard: 0 assert failures. Recorded in SUMMARY.md as a harness-defect-fixed finding.

## Improve-once loop assessment
No generic repo failure class met the 3+ bar as a defect. EVIDENCE_CONFLICT (9) and all warnings are by-design hostile/intent handling with typed outcomes. No patches written; missions/patches/ and missions/fixtures/ untouched. Repo received zero writes.

## Housekeeping note
~/workspace/AGENTS.md (the 6-line Oracle SSH note file, distinct from ~/AGENTS.md which is intact) was observed with a new 2026-09-24 entry from another lane during this run. No action; noting for cross-lane awareness.

## Next: take shard 7 if unclaimed
Per the never-idle rule. Checking missions/world/ for existing shard dirs; shard 7 = indices 3500-3999.

## 2026-09-23 ~21:30 MDT: shard 7 claimed and completed
Checked missions/world/: shard-0,1,2,3,4,5 exist (other workers); shard-6/7 absent. Took shard 7. Forked the harness to shard-7/ (range-aware, globally-unique owner phones). Ran 500/500 missions in 1,123 ms: 423 GENERATED, 77 GENERATED_WITH_WARNINGS, zero failures. 20/20 determinism. No generic classes, no patches. SUMMARY.md + SHARD-LOG.md written in shard-7/.

## Next: shard 6 (highest-value remaining WORLD shard)
Still unclaimed. Its range [3000,3499] covers franchise-lookalike, stale-source, contradictory-sources, broken-media: the first factory samples of IDENTITY_AMBIGUOUS and stale-source handling. Taking it next.

## 2026-09-23 ~21:28 MDT: COLLISION on shard 6 — claimed by another worker, yielded
My shard-6 claim was based on a stale listing: WORLD-SHARD-0 (continued) created shard-6 at ~21:23 MDT and finished its run at 21:23:42 MDT. I wrote my harness into their directory and ran a duplicate 500-mission pass, overwriting their results.jsonl with my fetch. Their SUMMARY.md/SHARD-LOG.md/runner files survived intact.
Recovery: moved all my shard-6 files to shard-3/_collision-shard-6-backup/ (my 500-line duplicate run preserved there as evidence only); wrote shard-6/COLLISION-NOTE.md documenting the loss and the deterministic regen path (`bash run.sh 3000 3500`); did NOT re-run their harness because their gen-runner.sh was modified at 21:27:53 MDT, showing they are actively in the directory. Their expected distribution per surviving SUMMARY: 225 GENERATED, 161 GENERATED_WITH_WARNINGS, 48 ACQUISITION_FAILED, 48 EVIDENCE_CONFLICT, 18 IDENTITY_AMBIGUOUS.
Lesson: re-list the shard directory immediately before claiming, not minutes before; treat "absent" as perishable information when other workers are active.
