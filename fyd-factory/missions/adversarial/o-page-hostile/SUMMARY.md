# Summary: 200 Hostile /o Missions (Wave 2)

200 synthetic, testing-only missions (OADV-001..OADV-200) run against the patched Pig tree at pipeline 88547e687dd7eb33.

## Artifacts

- gen_missions.py: mission corpus generator (deterministic, asserts 200 missions and category counts)
- missions.jsonl: 200 missions (30 hostile-website, 30 hostile-phone, 30 hostile-email, 30 smuggling, 20 hostile-media, 20 private-direct, 20 private-relationship, 20 positive-control)
- o-hostile-worker.ts: tsx worker (double-compose determinism, executable-scheme seam scan, per-category expectation checks)
- results.jsonl: 200 result records
- run.log: execution log
- ADVERSARIAL-REPORT.md: full findings, the 4 expectation-error FAILs, improve-once assessment, caveats

## Outcome

196 PASS / 4 FAIL / 0 CRASH. All 4 FAILs are worker expectation errors on legitimate or by-design behavior; zero executable-scheme hrefs emitted; 200/200 deterministic; zero private-object leaks; zero control-character smuggling survivors. Improve-once not triggered. Full details in ADVERSARIAL-REPORT.md.
