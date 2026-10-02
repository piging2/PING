# PROPOSAL — CP-1: single HTTP ingest authority (CanonicalizationService)
**Agent:** 01 (event authority). **Status:** PROPOSAL ONLY. Nothing applied, no commits.
**Applies to (sprint worktree only):** `/home/nolan/projects/ping-constitutional` event ingest paths
(adapter `src/lib/events*`, `src/app/api/**/event*` if the adapter gains a local ingest shim; core
`gateway/event*`, `ping-runtime/events/*` via propose-only to `/home/nolan/ping`).
**Never applies to:** `/home/nolan/ping` (live runtime — propose-only always).

## WHY
Two Pig-side copies of `POST /events` make different authorization decisions (worktree: BFF-adapter
normalization, no tenant check; src/build: tenant-registry validation, no canonicalization), and the
2026-09-16/17 live capture showed a third behavior (authorizeNamespace → 403). B1 is now closed:
the Oracle container runs the worktree copy byte-identically (sha256 `4e3c66b6…`), so the
convergence target is a known diff. One route must have one decider.

## EVIDENCE
- `agent01-event-authority/AGENT01-EVENT.md` §1 (B1 closure: deployed bytes = worktree copy;
  capture behavior superseded by the 2026-09-21 image rebuild).
- `agent01-event-authority/deployed-events.js:71-128` (deployed POST /events branches).
- `gateway/routes/ingest.js` (deployed, sha256 `f1c1abda…`): POST /ingest already routes through
  `authorizeNamespace` + `canonicalizeAndEmit` (`canonicalization_service.js:109-176`).
- `gateway/bootstrap/gateway_runtime.js:447` (CanonicalizationService constructed once, wraps
  UnifiedEventRuntime), `:691` (`/ingest` mounted), `:682` (`/events` mounted).

## MINIMUM CHANGE
1. In `gateway/routes/events.js`, replace both POST / branches' direct `eventRuntime.emit(...)`
   calls with `canonicalizationService.canonicalizeAndEmit({ source, eventType, payload,
   namespace, ... })`, passing the already-normalized envelope (BFF adapters become a
   pre-canonicalization normalization stage, unchanged logic).
2. Move the src/build copy's tenant-registry validation into
   `CanonicalizationService.authorizeNamespace/resolveNamespace` as a namespace-resolution rule
   (`tenant::<id>`), deleting the route-level fork.
3. Keep `UnifiedEventRuntime.emit` as the single durable-append primitive (unchanged);
   no new authority, no EventAuthorityV2, no second store (write-gate rule 5).
4. The legacy direct-emit branch is retired only after (1)+(2) cover its callers.

## TEST
- Replay the 2026-09-16/17 probe matrix against a staging gateway: malformed namespace → 403;
  unauthenticated → 401; valid BFF envelope → 200 + row in `ping_events`; valid legacy envelope →
  200; tenant-scoped source → `tenant::<id>` namespace in the stored row.
- `INSERT … ON CONFLICT (event_id) DO NOTHING` idempotency re-verified (duplicate POST → same
  `event_id`, no duplicate row, no handler re-fire).
- Existing `gateway/test_events_routes.js` ("POST /events routes through eventRuntime.emit")
  updated to assert the canonicalization-service path instead.

## RESULT
- POST /events and POST /ingest share one decider (CanonicalizationService); the copy-divergence
  fork is eliminated; CP-1 closes.
- Open question for coordinator: whether the BFF normalization adapters stay as separate
  modules (kept: they are normalization, not authority) — this proposal keeps them.
