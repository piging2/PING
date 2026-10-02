# Adversarial Report: 200 Hostile /o Missions (Wave 2)

Date: 2026-09-24
Worker: wave2-gen-9b2f35ec
Target: patched Pig working tree, /home/nolan/projects/ping @ e48ef710cb889bf4d59b833ef9766067a9e2bbf0
Pipeline code version: 88547e687dd7eb33 (worker o-hostile-1.0)
Method: direct composeObjectView on synthetic ObjectGraphs (double-composed for digest determinism) + resolveSafeLink("navigate") exercised directly for media URLs + executable-scheme scan (javascript:|data:|vbscript:|file:|blob:) across every emitted capability href. All 200 missions carry synthetic:true and testing_only:true.

Note on version: the compile batch ran at pipeline 6a1b500c124d; between the two runs another lane edited src/fyd (ask/, sitespec/graph.ts, binding-verifier.ts, plus EMAIL_SHAPE quote/angle-bracket hardening in safe-link.ts). SEC-FIX hunks (resolveSafeLink choke point in view.ts and renderer.tsx) verified live in both runs.

## Coverage (200 missions, OADV-001..OADV-200)

- hostile-website (30): javascript:/data:/vbscript:/file:/blob: schemes, case smuggling, whitespace/control-char padding, HTML entities, credentialed URLs, malformed hosts. Expectation: no website capability.
- hostile-phone (30): script injection, newline/control chars, letters, full-width digits, empty/degenerate values. Expectation: no call capability.
- hostile-email (30): attribute-breakout quotes, angle brackets, whitespace, missing parts, control chars. Expectation: no email capability.
- smuggling (30): NUL/C0/DEL/zero-width prefixes, suffixes, and infixes across all three fields; trim-equivalence positives. Expectation per case.
- hostile-media (20): resolveSafeLink("navigate") direct on hostile media URLs; javascript:/data:/vbscript:/file:/blob:/about:/relative/bare-host values expected non_navigable; legit http/https expected safe.
- private-direct (20): composeObjectView on private objects with hostile and legitimate contact values. Expectation: observe (composeObjectView is viewer-agnostic; the /o route gates via loadObjectViewById returning null for private objects, verified by code inspection of app/o/[objectId]).
- private-relationship (20): active provides/offers relationships from public businesses into private services (15 hostile traversal) + public services (5 positive controls). Expectation: private service names absent from composed services; public services present.
- positive-control (20): legit https/http URLs, phone shapes, email shapes, trim-equivalence, and a no-contact negative control.

## Results

- PASS: 196/200
- FAIL: 4/200 (all four are worker expectation errors, not rail failures; see below)
- CRASH: 0
- Determinism: 200/200 (double-compose digest match on every mission)
- Executable-scheme hrefs emitted: 0 across all 200 missions
- Private-object leakage into composed views: 0 (all 20 private-direct missions observed only; all 15 hostile relationship-traversal missions show private service names absent; all 5 public-service controls present)
- Contact values with control characters: all fail closed (no capability emitted) except trim-equivalence cases which emit sanitized clean hrefs

## The 4 FAILs (expectation errors, verified individually)

- OADV-014: website "HtTpS://example.com" emitted website capability with href "https://example.com/". Correct rail behavior (URL parser normalizes scheme case); the mission misclassified a legitimate URL as hostile.
- OADV-015: website "https://user:pass@example.com" emitted website capability preserving userinfo. Correct rail behavior (navigable https); misclassified as hostile.
- OADV-089: email "a@b.." emitted mailto:a@b... The minimal gate is documented as "not a validator, a gate"; a degenerate non-executable address passes by design. Not a security finding.
- OADV-103: website "\u200bhttps://example.com" emitted website capability with CLEAN href "https://example.com/". The zero-width character did not survive into the output; the rail sanitized rather than rejected. Safe outcome; the mission's no_capability expectation was too strict.

## Improve-once assessment

No new generic defect class was observed. The 4 FAILs are four distinct single-mission expectation errors (two misclassifications, one by-design gate shape, one sanitize-vs-reject strictness), none occurring in 3+ missions and none representing a rail failure. Improve-once NOT triggered.

## Caveats

- Route-level private gating (loadObjectViewById -> notFound for private objects) was verified by code inspection, not executed: the synthetic graphs cannot pass through the real tenant store without writing shared state, which this worker is forbidden to do.
- Renderer media sites that use direct <img src={media.src}> (no resolveSafeLink) were exercised only through the resolveSafeLink("navigate") direct-call missions (20/20 PASS); a rendered-page-level proof for those sites remains open work for a browser-capable worker.
