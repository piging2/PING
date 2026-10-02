# PROPOSED PATCH — NOT APPLIED (live runtime /home/nolan/ping is propose-only)

**Target:** `/home/nolan/ping/gateway/routes/events.js` (deployment gateway, POST /events canonical-spine branch, lines ~113-126)
**Status:** PROPOSED ONLY. No file was modified. No commit. No process touched.
**Date:** 2026-09-24
**Domain:** transition (forensic investigator, Agent lane TRANSITION)

---

## WHY

The gateway's `POST /events` handler has two lanes. The BFF-envelope lane
(lines 72-110) authenticates callers via Ed25519 signature verification in
`social_ingest_adapter` plus vocabulary gating. The canonical-spine lane
(lines 113-126) accepts `{event_type, aggregate_id, aggregate_type,
event_data}` and emits directly through `UnifiedEventRuntime.emit` with **no
caller authentication, no signature check, and no capability check**.

Consequence: any client that can reach the gateway (bound `*:8080`, verified
healthy 2026-09-24) can append events of any *registered* type. `FYD_SITE_OVERLAY`
is registered (`gateway/generated/event_registry.json:2334`, owner
`FydSiteAuthority`, class `business`), and the governance namespace check
passes for it (`event_governance.js:196-203` only requires the derived
namespace to have a registered owner; `fyd` → `FYD`). The core projection
tool `tools/fyd-site-projection/dump.py` folds accepted overlay ops
(`set_field`, `add_object`, `add_relationship`, `deactivate_object`,
`set_presentation_intent`) into the public site projection JSON on the next
regen. This bypasses:

1. the social ingest adapter's signature + vocabulary gates,
2. the adapter customize lane's digest-bound demo-owner approval,
3. any capability authorization (none exists on this lane), and
4. signer accountability (the lane records no caller identity).

The operator tool `emit-overlay.py` already sends an `Authorization: Bearer`
token (resolved from the container env at runtime), but **no gateway code
validates it** (zero hits for the token name across `/home/nolan/ping/gateway`).
The token is currently theater.

## EVIDENCE

- `gateway/routes/events.js:71` — `router.post('/')`, mounted at
  `bootstrap/gateway_runtime.js:682` with **no auth middleware**.
- `gateway/routes/events.js:113-126` — canonical-spine branch: destructure,
  required-field check, direct `eventRuntime.emit(event_type, 'api',
  event_data, {metadata: {aggregate_id, aggregate_type}})`. No auth.
- `gateway/bootstrap/gateway_runtime.js:115-128` — `_setupMiddleware` is only
  `express.json()` + open CORS (`Access-Control-Allow-Origin: *`).
- `gateway/route_middleware.js` (79 lines) — logging/error wrappers only.
- `ping-runtime/events/unified_event_runtime.js:73-140` — `emit` runs
  `EventValidator` type-registration + `EventGovernance` namespace checks;
  no identity/signature/capability step.
- `ping-runtime/events/event_governance.js:196-203` — `_validateNamespace`
  returns valid if the derived namespace merely has a registered owner.
- `gateway/generated/event_registry.json:2334-2338` — `FYD_SITE_OVERLAY`
  registered, `authority_owner: FydSiteAuthority`, `event_class: business`.
- `tools/fyd-site-projection/dump.py:95-113,270-391` — ordered fold of overlay
  ops into `var/fyd-projections/<site>.json`; op validation is structural.
- Live check 2026-09-24: `*:8080` listening; `GET /health` → healthy
  (uptime ~33h). `127.0.0.1:18199` (demo gateway) NOT listening.
- Read-only: no POST was ever sent. No secret values printed.

## MINIMUM CHANGE (proposed diff)

Gate the canonical-spine branch on a bearer token configured server-side.
Fail closed when the token is not configured. The BFF-envelope lane is
untouched (its auth is the Ed25519 proof). In-process emitters (workers,
kernel) are untouched (they do not go through HTTP).

```diff
--- a/gateway/routes/events.js
+++ b/gateway/routes/events.js
@@ -110,6 +110,18 @@
       };
     }
 
+    // Canonical spine: authenticated callers only. The BFF-envelope lane
+    // above authenticates via Ed25519 proof; this lane carries no
+    // per-envelope proof, so it requires the gateway write token.
+    // Configure via GATEWAY_WRITE_TOKEN on the gateway deployment.
+    // Operators already send a bearer token (see
+    // tools/fyd-site-projection/emit-overlay.py); nothing validated it
+    // until now.
+    const expectedToken = process.env.GATEWAY_WRITE_TOKEN || '';
+    const presented = String(req.headers.authorization || '');
+    if (!expectedToken || presented !== `Bearer ${expectedToken}`) {
+      res.status(401).json({
+        error: 'UNAUTHORIZED',
+        message: 'canonical event lane requires a valid bearer token'
+      });
+      return;
+    }
+
     const { event_type, aggregate_id, aggregate_type, event_data } = req.body;
     if (!event_type || !aggregate_id || !aggregate_type || !event_data) {
       throw new Error('event_type, aggregate_id, aggregate_type, and event_data are required');
```

Alternative (narrower blast radius, weaker): bind the canonical-spine branch
to loopback callers only (`req.ip` / socket remote address check). Rejected
as primary because the deployment may legitimately call it from the Pig
bridge network; the token approach matches existing operator behavior.

Deployment note: after applying, set `GATEWAY_WRITE_TOKEN` in the gateway
container env and distribute to `emit-overlay.py` operators. Any other
HTTP client of the canonical lane must be issued the token or migrated to
the BFF-envelope lane.

## TEST (proposed, not run — runtime is propose-only)

1. `POST /events` canonical shape, no `Authorization` header → expect 401.
2. Wrong token → 401. Correct token + registered type → 200 with `event_id`.
3. Correct token + unregistered type → rejected by `EventValidator`
   (unchanged behavior).
4. BFF-envelope lane (`{type, payload, proof}`) with valid signature and NO
   bearer token → still accepted (its auth is the signature, not the token).
5. Regression: in-process `eventRuntime.emit` callers (workers) unaffected;
   `GET /events/*` read routes unaffected.
6. Operator check: `emit-overlay.py --journal main` with the token set
   emits; without it gets 401.

## RESULT

NOT APPLIED. Awaiting Nolan's decision. This file is the proposal record.
No second canonical authority is created by this change (it adds an
authentication gate to an existing lane; authority stays with the gateway).
