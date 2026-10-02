# Summary: 40 Hostile Compile Fixtures (Wave 2)

40 synthetic, testing-only hostile fixtures run through the patched compile pipeline at 6a1b500c124d6b213ec0360f134c41cff3aacb2dae8baa9771bb1ce1d2cff5d7 (harness 1.2.0).

## Artifacts

- fixtures-hostile-wave2/: 40 fixture JSON files (8 hostile classes x 5 verticals), all with synthetic:true and testing_only:true
- queue-hostile-w2/manifest.jsonl: 40 job entries
- results-hostile-w2/: 40 per-job result records
- results-hostile-w2.jsonl: aggregate results
- queue-run.log: execution log
- ADVERSARIAL-REPORT.md: full findings

## Outcome

40/40 COMPILED, 0 errors, 0 crashes, 40/40 deterministic. 40 hostile input URLs, 0 unsafe URLs in rendered output. 0 hidden-object leaks. Improve-once not triggered. Full details in ADVERSARIAL-REPORT.md.
