# Q12 — Dead "working" paths (EFFECT SWARM, 2026-10-01, STATIC ANALYSIS)

Tree: /home/nolan/projects/ping-fyd-converged @ 4ad9a7a3 (served build is 300c9c91).
Method: static reference analysis (70 `src/app/api/**/route.ts`; callers = any
non-api src file referencing the route path; tests counted separately).
NOT runtime tracing/coverage: the served process is a production `next start`
and no instrumentation exists; invoking mutation endpoints was out of scope
for this read-only lane. Classification is reachability-from-served-code, not
execution proof.

## LIVE (called by served UI/pages; handler complete)
FYD sites product: /api/fyd/ask, /api/fyd/ask/[siteId], /api/fyd/objects/[objectId],
/api/fyd/customize, /api/fyd/like, /api/fyd/follow, /api/fyd/build,
/api/fyd/build/[jobId]/rendered (render-beacon.tsx), /api/fyd/presence,
/api/fyd/why-this, /api/fyd/projection, /api/fyd/media, /api/fyd/edge/object,
/api/fyd/circle, /api/fyd/onboarding/preview, /api/fyd/claims/identity,
/api/fyd/claims/verification-methods, /api/fyd/auth/{session,signout,unlink,
google/callback,link/google/callback} (start routes reached via links, not fetch).
Practice: /api/practice/* (like/follow/session/identities/profile/feed/bio).
Ping: /api/ping/ask, /api/ping/proposal, /api/ping/node, /api/ping/circle.
Mission Control page: /api/mc/approvals, /api/mc/agents, /api/mc/today,
/api/mc/graph, /api/mc/crm, /api/mc/object, /api/mc/search, /api/mc/trace-forward,
/api/mc/marketingos, /api/mc/marketingos/missions.
Infra/ops: /api/health, /api/healthz, /api/readyz, /api/diagnostics/sharp.
Other: /api/newsletter/subscribe.

## UNWIRED (handler complete, zero callers in served code — capability exists but nothing reaches it)
- POST /api/mc/dispatch — full mission-dispatch handler (fail-closed validation,
  x-mc-caller-key identity, idempotency-by-journal-lookup on execution_id).
  The Mission Control page does NOT call it. A consequential mutation path
  (spawn agent execution) with no served caller.
- POST /api/fyd/claims/[resourceId]/{claim,release} — claim lifecycle mutations,
  no callers.
- POST /api/fyd/social/post — takes identityId/text/visibility (social posting
  = external effect), no callers.
- GET /api/mc/missions, GET /api/mc/missions/[id] — no callers.
- GET /api/mc/technology (35KB handler) — no callers.
- /api/fyd/objects/[objectId]/overrides — only referenced by a test
  (g-route-isolation.test.ts); owner-correction write path unreachable from UI.
- /api/ping/{actions,feed,object} — no callers.
- /api/fyd/social/{feed,follow,state} — no callers; /api/fyd/social/identity
  only referenced from src/fyd/social/key-custody.ts (library, not UI).

## TEST-ONLY
- /api/fyd/claims/[resourceId]/verify — flagged STUB by static scan (501 path)
  AND only exercised via tests; also unreachable from UI. DEAD/STUB.
- /api/fyd/objects/[objectId]/overrides — handler exists; only caller is a test.

## DEAD (broken/stub in served tree)
- /api/fyd/claims/[resourceId]/verify — stub/501 (see above).
- (No other route is import-broken; all 70 export at least one handler.)

## LIVE BUT FLAG (reachable, consequential, no authority — handed to SECURITY swarm)
- POST /api/kit/webhook — inbound Kit webhook, NO signature/secret verification
  in the handler; maps external events to HPP events via `logEvent()` →
  `InMemoryEventRepository` (src/lib/events.ts:200 — process-memory store,
  "MVP - will migrate to SQLite"). Anyone who can reach :3100 can append
  HPP events; all of it evaporates on process restart (see Q13).

## Chain samples (route → handler → authority → runtime → store/effect)
- POST /api/mc/dispatch → route.ts POST → x-mc-caller-key registry (tenant derived,
  never claimed) → dry-run adapter + journal execution_id lookup → journal (UNWIRED).
- GET/POST /api/mc/approvals → route.ts → mc-approval-gate.ts (capability+tenant
  gates; DIRTY in worktree, not in served bytes) → approval store (LIVE).
- GET/POST /api/fyd/customize → route.ts → write-boundary.ts → journal gateway
  (served env: :18200 fork, stale since 9/30 16:04) (LIVE).
- POST /api/ping/proposal → ask-ping.tsx → proposal record (LIVE).
- POST /api/kit/webhook → NO authority check → logEvent → IN-MEMORY store (LIVE, unauthenticated).

## Verdict: FAIL (dead/unwired surface is material)
A consequential dispatch mutation (POST /api/mc/dispatch), a social-posting
mutation (POST /api/fyd/social/post), the claims lifecycle, and the MC missions
API exist with zero served callers; one served mutation (/api/kit/webhook)
takes unauthenticated writes into a memory-only store.

## Smallest fix
Delete or gate the unwired mutation routes (dispatch, social/post, claims
mutations) behind the same caller-key authority as /api/mc/dispatch, or wire
them to real UI with approvals. Add HMAC verification to /api/kit/webhook or
remove it; move logEvent off the in-memory repository before any consumer
depends on it.
