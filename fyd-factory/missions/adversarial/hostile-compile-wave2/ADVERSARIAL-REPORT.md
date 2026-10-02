# Adversarial Report: 40 Hostile Compile Fixtures (Wave 2)

Date: 2026-09-24
Worker: wave2-gen-9b2f35ec
Target: patched Pig working tree, /home/nolan/projects/ping @ e48ef710cb889bf4d59b833ef9766067a9e2bbf0
Harness: fyd-compile-harness v1.2.0 (graph mutation -> generateSiteSpec -> validation -> render context -> static render -> repeat digest comparison)
Pipeline code version: 6a1b500c124d6b213ec0360f134c41cff3aacb2dae8baa9771bb1ce1d2cff5d7
All 40 fixtures carry synthetic:true and testing_only:true (verified 40/40 locally).

## Corpus

40 fixtures in fixtures-hostile-wave2/, 8 hostile classes x 5 business verticals (food, trade, retail, personal, hospitality/prof):

- hostile-franchise-*: franchise/brand-confusion payloads
- hostile-hoursconf-*: conflicting-hours evidence payloads
- hostile-media-*: hostile media URL payloads
- hostile-nojsonld-*: missing-structured-data payloads
- hostile-phonec-*: phone-conflict dial-action payloads (the known class)
- hostile-rtl-*: RTL/bidi payloads
- hostile-stale-*: stale-cache payloads
- hostile-svc100-*: oversized service-list payloads
- hostile-unsafeurl-*: unsafe URL payloads (javascript:, data:, vbscript:)

Manifest: queue-hostile-w2/manifest.jsonl (40 entries). Execution log: queue-run.log.

## Results

- Jobs reaching COMPILED: 40/40
- Queue drain: {"done":40}, exit code 0
- Batches: 4 x 10, each 0 missing / 0 no-op / 0 stale-rejected
- Errors: 0 (error_count total 0, error_type null on all 40 records)
- Crashes: 0
- Determinism (repeat digest comparison): 40/40 match
- Rendered unsafe URLs: 0 across all 40 renders, against 40 hostile input URLs total (every input unsafe URL neutralized by the SEC-FIX resolveSafeLink choke point in view.ts + renderer.tsx; verified still live in the tree at report time)
- Hidden-object leaks: 0 (hidden_object_count 0 on all 40 records)
- Unbound claim sections: 205 total (informational, same known class as the OBJECT shards; no new generic defect)
- Total wall time: 61.5 ms, avg 1.54 ms per job

## SEC-FIX and rail behavior

The patched tree under test routes phone, email, and website values through resolveSafeLink in buildCapabilities (src/fyd/object/view.ts, 5 call sites live at test time), with schema role controlling capability emission; renderer social links also use resolveSafeLink (src/fyd/components/renderer.tsx, 4 call sites). The 40-fixture run exercised this rail end to end: 40 hostile input URLs entered the pipeline and 0 survived into rendered output.

## Verdict

PASS. The patched pipeline compiles every hostile fixture without error, emits zero unsafe URLs, leaks zero hidden objects, and is deterministic across repeat renders. No new generic defect class was observed, so improve-once did not trigger for this batch.
