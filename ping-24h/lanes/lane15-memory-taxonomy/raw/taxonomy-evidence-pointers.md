# Lane 15 raw evidence pointers (Pig WSL, /home/nolan/projects/ping @ 0264d517, read 2026-09-28 ~14:33 MDT)

All read-only via ~/workspace/pig-fb/pigwsl-exec.sh -s. No tree modified, no commits, no secrets.

## Durable stores observed (repo-root data/)
- data/fyd-journal/events.jsonl: journal records (FYD_SITE_OVERLAY; seed records fyd-seed-ovl-001/002 with provenance {kind:"overlay-authored", ref:"demo-overlay:happy-place", derivedAt})
- data/fyd-identity/audit.jsonl: sign_up identity events (identityId, provider, providerAccountId)
- data/fyd-claims/: EMPTY (claim store wired, no records yet)
- data/fyd-owner/coppersmith-plumbing.json, happy-place.json: owner event logs (owner.corrected-fact with previousBasis/newValue/evidence/sourceValue, generator "fyd-owner@1")
- data/fyd-follows/local.json, data/fyd-likes/local.json: {version, following: {<siteId>: {followedAt}}}
- data/fyd-idempotency/ledger.jsonl: {v, request_id, digest, action, siteId, status:"recorded", result:{eventId,intentId,proposalDigest,specDigest}, at}; locks/ empty at read

## Key files (owner/writer/reader/mutation)
- tools/fyd-journal-gateway/server.mjs: STORE = FYD_JOURNAL_STORE env or tools/fyd-journal-gateway/../../data/fyd-journal/events.jsonl (line 74-77); write-side bearer gate FYD_JOURNAL_WRITE_TOKEN (fail-closed 503 without token); request_id index {tenantId, eventId} rebuilt at startup; same-tenant replay returns original event with deduped:true (line 319-320); different-tenant reuse -> 400 request_id_tenant_conflict; tenant_mismatch 400s on aggregate_id / event_data.siteId
- src/fyd/customize/write-boundary.ts: contract (header): client request_id, server-computed digest (client never supplies digest); same id+digest -> replay; same id+different digest -> 409 CONFLICT; per-site lock (mutex + lockfile); UNKNOWN on journal POST timeout ("Timeout never means failed")
- src/fyd/object/owner-store.ts: APPEND-ONLY owner event log; readOverrides = projectOwnerState projection over log; owner.restored-fact reverts (correction stays); fail-closed command validation
- src/fyd/owner-mode/corrections.ts: OwnerAssertion append-only, provenance.supersedes chains, chain-head-only apply; CONFLICT algebra (CorrectionConflict when source moved under a correction; owner's value still wins, conflict explicit)
- src/fyd/object/owner-overlay.ts: read-seam composition AFTER digest verification; sourceDrifted derived per read, never written
- src/fyd/claim/store.ts: atomic tmp+rename writes; invalid/missing -> null (never invents state); states observed/claimed/verified-controlled
- src/fyd/claim/machine.ts: OBSERVED -> CLAIMED -> VERIFIED-CONTROLLED, release() back to OBSERVED; immutable transitions, audit history appended; DEMO_CONTEXT_IDS refused; claim requires authenticated identity; verifyControl requires implemented method + human-readable proof basis
- src/fyd/identity/file-store.ts: writer for data/fyd-identity
- src/fyd/object/follows.ts, likes.ts: writers for data/fyd-follows, data/fyd-likes
- src/fyd/tenant/tenant-context.ts: requireTenant REFUSE (typed TenantContextError), never empty/null fallback; tenantId in store keys/paths; worker paths carry explicit context
- src/app/api/fyd/claims/[resourceId]/{claim,verify,release}/route.ts: writeClaim callers; src/fyd/onboarding/anonymous-preview.ts also writes claims
- src/app/api/fyd/objects/[objectId]/overrides/route.ts + owner-context.ts: PROPOSE then APPROVE, digest-bound; capability chain evaluated (403 on deny); DemoOwnerContext today ("no production authentication on this route", demo actor, labeled); one-class seam for real auth
- src/fyd/data/fyd-tenant-graph.ts: fixture base graph + journal overlays via PingObjectReader.queryFydSiteOverlays, digest verification at both layers, tenant-scoped at authority, no cache
- src/lib/ping/ping-object-reader.ts: sanitized overlay ops only cross the seam (no raw envelopes, no signatures); provenance {kind:"canonical-journal", ref:"ping-event:<id>"}
- src/fyd/ask/field-conflicts.ts: AskFieldConflict {status unresolved|resolved, observations[]}; unresolved suppresses field in public projection; fixed copy "Contact information is being verified."; detection NOT in this module (builder semantic-diff, journal); honored per-request, not persisted
- src/fyd/ask/context-compiler.ts: unwired (lane 10: zero production callers); classificationFromProvenance maps provenance kinds to USER_OVERRIDE/DEMO_SYNTHETIC/DIRECT_FACT/website_statement/UNKNOWN; verifyAnswerClaims SUPPORTED/DERIVED/INFERRED/UNKNOWN with B3 epistemic rank (zero non-test callers); no CONFLICTED/STALE classifications
- src/fyd/ask/visitor-answer.ts + src/lib/ping/ask-composer.ts: live ask path; AskClaimClassification (DIRECT_FACT/DERIVED_FACT/INFERENCE/GENERATED_COPY/USER_OVERRIDE + website_statement/DEMO_SYNTHETIC/relationship_fact); conflict cites marked CONFLICTED
- src/fyd/wiring/action-verifier.ts + MC routes: MC projection vocab PROVEN/OBSERVED/DERIVED/UNKNOWN/STALE/CONFLICTING/PROTOTYPE/UNWIRED
- src/app/api/mc/approvals/route.ts + src/app/api/mc/_lib/mc-dispatch.ts: JOURNAL_PATH = '/home/nolan/workspace/fyd-journal-gateway/events.jsonl' (out-of-tree read path; convergence with in-tree sink UNKNOWN; lane 9 anomaly #3)
- src/fyd/tenant/__tests__/f-journal-privacy.test.ts: hostile tenant suite (write 400s, read fail-closed without ?tenant=, per-tenant visibility, request_id tenant conflict 400, legacy backfill in-memory)

## Searches with zero/near-zero hits
- grep 'lesson|dream|adaptive|evolve' (filenames): only visibility-policy.ts (false positive)
- grep 'skill' (filenames): zero
- grep 'StandingContext|standing-context|buildPrompt|assembleContext': zero (lane 10)
- qdrant in src/: only mc/technology/route.ts (infra inventory/health) and page.tsx (content)
- grep 'lesson' across src: no lesson store found; PING target learning loop (OUTCOME -> ... -> promotion) is DOCUMENTED as target (lane 4), no implementation found
