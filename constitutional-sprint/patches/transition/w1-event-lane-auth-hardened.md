# PROPOSED PATCH — NOT APPLIED (canonical-lane auth is propose-only by standing rule)

**Target:** `/home/nolan/ping/gateway/routes/events.js` — `POST /events` canonical-spine branch
**Supersedes:** `patches/transition/gateway-events-canonical-lane-auth.md` (kept as prior art; this file is the hardened revision)
**Status:** PROPOSED ONLY. No file modified. No commit. No process touched. No secret values handled.
**Date:** 2026-09-24. **Worker:** W1 (consumes F180/F242; see `fleet/gateway/w1-event-lane-echo.md` F250–F254).

---

## WHY

The prior proposal diffs against the wrong revision. It assumes the `[SOURCE]` tree ("no auth middleware",
"zero hits for the bearer token") and gates the canonical-spine branch on a new `GATEWAY_WRITE_TOKEN` env.
But the live `[PROD-IMAGE]` already wraps `/events` in `ExteriorAuthMiddleware`, which attaches
`req.authenticatedAgent`, and the newest captured branch reads it — then **tolerates its absence**
(`const _source = _agent ? ('api:' + _agent.agentId) : 'api';` → proceeds to emit). Three gaps survive
the prior proposal:

1. **Revision blindness (F250):** a token-only diff ignores the middleware that actually runs in production.
2. **Attribution without access control (F251):** the route never *requires* the identity the middleware attaches.
3. **Deploy fragility (F254/F244):** a gate living only in the image is dropped by the next source-tree deploy.

The hardened gate is route-level, middleware-agnostic, and fail-closed in every revision.

## EVIDENCE

- `event/gw-post-events.txt:41-47` `[NEWER-CAPTURE]` — canonical-spine branch: tenant isolation, then
  `req.authenticatedAgent` read with `'api'` fallback, then unconditional `eventRuntime.emit`.
- `execution-core/EXECUTION-CORE.md` §0, rows 230-231 `[PROD-IMAGE]` — `ExteriorAuthMiddleware` wraps
  `/events` (image `gateway_runtime.js:790,794,798,900,916-920`); absent from `[SOURCE]` and rc.
- Row 236 — generic `POST /events` unsigned ingress, confidence MEDIUM: "full middleware chain in prod
  image not re-verified for this branch."
- `fleet/security/sec4-unauth-endpoints.md:16` — 2026-09-16/17 live capture showed unauthenticated → 401,
  which neither worktree copy explains (F252 contradiction, unresolved).
- `gateway/generated/event_registry.json:2334-2338` — `FYD_SITE_OVERLAY` registered, owner `FydSiteAuthority`
  (declared-only, T13), class `business`; namespace gate passes it (`event_governance.js:196-203`).
- `tools/fyd-site-projection/dump.py:95-113,270-391` — accepted overlay ops fold into public projections.
- Tenant-isolation block validates the *claimed* `tenant_id`/`business_id` against the registry — scope
  validation, not caller authentication. It does not close the hole.

## MINIMUM CHANGE (exact diff shape)

Gate the canonical-spine branch on a verified caller identity. Primary credential: the identity the
exterior-auth middleware attaches (`req.authenticatedAgent`). Fallback credential (revisions without the
middleware — `[SOURCE]`, rc): the `GATEWAY_WRITE_TOKEN` env bearer, fail-closed when unset. The BFF-envelope
lane is untouched (Ed25519 proof is its credential). In-process `eventRuntime.emit` callers are untouched
(they do not traverse HTTP). Reads (`GET /events/*`) are untouched.

```diff
--- a/gateway/routes/events.js
+++ b/gateway/routes/events.js
@@
     // Canonical spine: emit directly through UnifiedEventRuntime (ping_events),
     // not through the kernel pipeline (repository_events). The kernel's reducer/projection
     // registries are empty and EventBridge adds a 5s delay for no benefit.
-    // Provenance: exterior auth middleware attaches the verified agent identity.
-    // The source carries channel + agent so every emitted event is attributable.
+    // Canonical spine: authenticated callers only.
+    // Primary credential: the verified agent identity attached by the
+    // exterior-auth middleware (present in production images). Fallback:
+    // GATEWAY_WRITE_TOKEN bearer on revisions without the middleware.
+    // Attribution alone is not access control: a missing identity MUST
+    // reject, never fall back to an anonymous source.
     const _agent = req.authenticatedAgent;
-    const _source = _agent ? ('api:' + _agent.agentId) : 'api';
+    if (!_agent || !_agent.agentId) {
+      const expectedToken = process.env.GATEWAY_WRITE_TOKEN || '';
+      const presented = String(req.headers.authorization || '');
+      if (!expectedToken || presented !== `Bearer ${expectedToken}`) {
+        res.status(401).json({
+          error: 'UNAUTHORIZED',
+          message: 'canonical event lane requires a verified caller identity'
+        });
+        return;
+      }
+    }
+    const _source = _agent ? ('api:' + _agent.agentId) : 'api:token';
     const result = await eventRuntime.emit(event_type, _source, event_data, {
       metadata,
       ...(namespace ? { namespace } : {}),
     });
```

Notes on the shape:
- The check sits **before** tenant validation and **before** emit — reject unauthenticated callers first.
- `_source` can never be bare `'api'` for an HTTP caller again: it is either `api:<agentId>` or `api:token`
  (token-authenticated, no middleware). Anonymous HTTP ingress is gone in every revision.
- Fail-closed when `GATEWAY_WRITE_TOKEN` is unset on a middleware-less revision: `!expectedToken` → 401.
- The diff is additive and branch-local; no new authority, no second event path, no change to emit semantics.

## FAILURE SEMANTICS (for unauthenticated callers)

| Caller | Result |
|---|---|
| Canonical-spine POST, no middleware identity, no/invalid bearer | **401** `{error:'UNAUTHORIZED'}` — nothing journaled |
| Canonical-spine POST, no middleware identity, `GATEWAY_WRITE_TOKEN` unset server-side | **401** — fail closed, never fail open |
| Canonical-spine POST, valid middleware identity | 200 path unchanged; `_source='api:<agentId>'` |
| Canonical-spine POST, valid bearer, no middleware | 200 path unchanged; `_source='api:token'` |
| Canonical-spine POST, unregistered `event_type` (any credential) | unchanged rejection by `EventValidator` |
| BFF-envelope lane (`{type,payload,proof}`), valid Ed25519, no bearer | **accepted** — its credential is the signature, not the token |
| `GET /events/*` reads | unchanged |
| In-process `eventRuntime.emit` (workers, kernel, bridge) | unchanged — no HTTP traversal |

## ROLLOUT ORDER

1. **Resolve F252 first (apply-blocker).** Read-only live probe matrix: which image digest serves :8080 now;
   unauthenticated canonical POST with a structurally *invalid* body (rejected pre-journal — no mutation)
   to map the real 401/accept boundary. Do not apply until the contradiction is resolved.
2. **Enumerate HTTP callers of the canonical lane** (EXECUTION-CORE open item #3): `emit-overlay.py`
   operators and any Pig bridge callers must hold the token or present middleware identity before the gate lands.
3. **Set `GATEWAY_WRITE_TOKEN`** in the gateway container env (per-deployment generated value; out-of-band
   distribution; rotation on operator churn). Never in repo.
4. **Apply the route-level diff** (propose-only → Nolan decision). Source tree first, so every future image
   carries it (F254).
5. **Verify:** no-token → 401; wrong token → 401; correct token → 200 + `event_id`; middleware identity →
   200 with `api:<agentId>` source; BFF signed envelope without bearer → accepted; reads unaffected;
   `emit-overlay.py --journal main` emits with token / 401 without.
6. **Mirror to production via governed deploy** — requires the F244 canonical-home ruling; the deploy freeze
   is respected until then.

## ROLLBACK

- Revert the route diff and redeploy the prior image (governed deploy path). The env token alone does not
  disable the gate; rollback is the code revert.
- Middleware-attached exterior agents are unaffected by rollback (their path never depended on the token).
- If the gate causes a legitimate-caller outage: the fastest mitigation is issuing the bearer to the
  affected caller (no code change), then deciding whether the caller should move to the BFF-envelope lane.

## TEST (proposed, not run — propose-only)

Per the table above, plus: build an image from the source tree (no middleware) and confirm unauthenticated
canonical POST → 401 — proving the gate survives the F244 silent-drop scenario.

## RESULT

NOT APPLIED. Awaiting (a) F252 probe results, (b) Nolan's credential-choice call (F259), (c) F244 ruling
for the deploy step. This file is the proposal record.
