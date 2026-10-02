# Security / testing / duplication (reader 4/6, completed 2026-09-27T00:20:15Z)

## Security posture (mechanisms only)
1. Hostile-URL boundary: ~/workspace/fyd-build/src/fyd/sitespec/safe-link.ts. Allowlist absolute http(s) only; rejects javascript:, data:, vbscript:, file:, blob:, relative, malformed; percent-encoded/control-char tricks decoded (bounded 3 passes) before scheme check; tel: dial-safe chars; mailto: strict email; fail-closed -> plain text. Wired into Hero/Contact/Links/CTA. Staleness note: 2026-09-21 hostile probe was PARTIAL (sink open per FL-20260921-032); safe-link rebuilt 2026-09-22 after phantom branch loss; current evidence = rebuilt test suite, not a fresh hostile probe re-run.
2. SSRF-safe fetch: ~/workspace/fyd-build/src/fyd/media/safe-fetch.ts. HTTP/HTTPS only; rejects credential URLs; DNS re-resolved per hop; rejects non-public space (loopback, RFC1918, link-local incl. 169.254.169.254, multicast, CGNAT); max 5 redirects re-validated; content-type allowlist (image/*, text/html); size limits + streaming abort; timeouts.
3. Render escaping: zero dangerouslySetInnerHTML in fyd-build/src; React escaping + safe-link; text-escaping PASS on 2026-09-21/22 probe.
4. Journal gateway tenant privacy: ~/workspace/wb-f-journal-privacy.test.ts spawns real gateway; spoofed/missing/invalid tenant_id -> 400, nothing journaled; reads without ?tenant= -> 400; tenant A sees only A; same request_id under different tenant dedupes with no bleed. Refusals typed 400s.
5. Postgres tenant isolation: ~/workspace/wb-test_tenant_postgres_isolation.js attacks CanonicalEventEnvelope both directions; unscoped reads/writes throw; throwaway wb-a/wb-b tenants, rows deleted.
6. Vector tenant isolation: ~/workspace/wb-test_tenant_vector_isolation.js attacks Qdrant adapter; unnamespaced search/upsert throw; namespace-constrained reads; temp collection deleted.
7. Credentials: Secure Vault capture page or browser takeover only; raw values never in memory/files/env/logs/code/URLs; one-time codes as [credential:<uuid>] held by authd ~10 min, consumed by credential_fill with fresh approval. Copilot identities share one credential under ~/.copilot/ with no per-identity isolation proven (2026-09-17).
8. OPEN gaps: FYD-010 field-level privacy gate for Ask FYD (falsified 2026-09-26: buildAskFydContext visitor mode returns phone/home_address intact; visibility policy object-level only; coarsenAddress zero consumers). FYD-037 wrong-journal guard (falsified 2026-09-23: emit() POSTs FYD overlay to misconfigured journal with zero marker checks).

## Testing inventory
- Canonical suite (fyd-build jest, 12 dirs): 23 test files in src (ui scope matches zero). ~170 top-level it() cases. Largest: visibility/policy 21, claims 15, safe-link 12, ask contract 11, sitespec schemas 10, generator 10, owner 9, evidence refs 9, ask services 8, proceduralizer 8, media safe-fetch 7, refresh (dep-index 7, conflict 6, observe 4, diff 4), patch 6, why-this 5, validator 5, graph 5, ask no-evidence 3, regen 2, hostile-url 2, render 1. "195/195 PASS (incl. Ask 36/36)" is a 2026-09-21 snapshot; tree changed 2026-09-22 (phantom branch loss, ask/* and safe-link.ts rebuilt) and 2026-09-26 (ask-lane recovery 8cc8291). NOT re-run on HEAD.
- Determinism/replay: ~/workspace/replay-lane/ adversarial fail-before fidelity tests (FB-A..F); persisted + production-input replay tests; ~/workspace/hostile-g2.mts cross-process G2 determinism proof; demotion-lane time authority test; forensics sequence-replay certs.
- Failure injection: ~/workspace/lane_c_failure_injection.js injects 4 faults (commit-then-crash orphan, restart without scan, orphan gains no mission, mid-derivation crash swallowed by emit try/catch). Documents real recovery gaps.
- Biggest test gaps: FYD-010 (no gate, no test), FYD-021 changed-source regeneration fixture (loop's core promise untested), FYD-037 (no guard, no test), dated 195/195 baseline (no HEAD re-run).

## Duplication suspects (verified by diff)
1. canonical_event_envelope.js: demotion-lane/ vs forensics/transfer-2026-09-19/ (differ).
2. mission_scheduler.js: f01-fix/ (739 lines) vs pig-transfer-tmp/ (701 lines, differ) + caller-adaptation-lane/capability_scheduler.js (686 lines). Three schedulers.
3. unified_event_runtime.js: convergence-lane3/ vs fyd-lane/harvest-wave1/code-evidence/ (differ).
4. fyd-journal-gateway/server.mjs: ~/workspace/fyd-journal-gateway/ vs ~/workspace/lane-d-impl/tools/fyd-journal-gateway/ (differ; tenant-boundary risk).
5. safe-fetch.ts: fyd-build/src/fyd/media/ vs fyd-build/work/new/media-module/ (differ; work/ staging). Runner-up: coarsenAddress in visibility/policy.ts (zero consumers) vs local copy in proceduralizer.ts.

## Freeze/deprecate candidates
1. ~/workspace/staging/ (untouched since Sep 19).
2. ~/workspace/h16-staging/ (Sep 18, no updates).
3. ~/workspace/phase20-builder-staging/ (superseded by fyd-build lane).
4. ~/workspace/migration_archive/ (dormant since Sep 8).
5. ~/workspace/lane-h/ (2026-09-19 decision matrix; read-only record now).

## Backlog hygiene
BACKLOG.md now index only; BACKLOG_PING.md = product; BACKLOG_NOLAN.md = outreach. No hard duplications. Renderer/boundary summary lines in BACKLOG_PING.md stale relative to 2026-09-22 rebuild and 2026-09-26 falsifications.
