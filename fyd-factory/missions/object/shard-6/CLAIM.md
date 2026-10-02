# CLAIM: OBJECT shard-6

Claimed by: GENERATION WAVE-2 worker (depth 2, session 9b2f35ec) at 2026-09-24 ~05:09 MDT.
Scope: missions 3000-3499 (within-shard indices 0-499).
Claim rule followed: re-listed missions/object/ immediately before writing; shard-6 was absent. No stale listing trust.
Method: same harness contract as OBJECT shards 0-4 (fixture graph -> generateSiteSpec -> validate -> buildRenderContext -> renderToStaticMarkup -> determinism check -> VERIFY), run against a CLEAN baseline: scratch worktree on the Pig at the frozen SHA e48ef710 (patch-integration worker is concurrently applying rail/SEC-FIX patches to the main working tree; the harness must not measure patched code).
Marker written before any mission execution.
