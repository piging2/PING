# PROPOSAL core-02: authorize the POST /events direct canonical-shape branch

Status: PROPOSED ONLY. /home/nolan/ping is propose-only; nothing was applied.
Dependency: agent01 (event ingest/append path owner). Agent 20 conflict check
required; coordinator decides.

## WHY

POST /events has two write branches in the /home/nolan/ping worktree copy.
The BFF-envelope branch verifies signatures. The direct canonical-shape
branch ({event_type, aggregate_id, aggregate_type, event_data}) calls
eventRuntime.emit with no signature, capability, or namespace check in this
copy. POST /ingest, by contrast, goes through
CanonicalizationService.authorizeNamespace. Two write doors to the same spine
with different authorization is a boundary inconsistency. The sibling
deployment copies (ping-gateway-src / ping-gateway-build) add
tenant-registry validation with namespace = tenant::<id> on this branch, so
the worktree copy also diverges from its siblings.

## EVIDENCE

- /home/nolan/ping gateway/routes/events.js router.post('/') (lines ~69-122):
  BFF branch (normalizeBffEnvelope, signature verified) vs direct branch
  (lines ~108-121) calling eventRuntime.emit(event_type, 'api', event_data)
  with no auth.
- gateway/bootstrap/gateway_runtime.js constructs CanonicalizationService once
  (~line 447) and mounts POST /ingest through authorizeNamespace
  (gateway/routes/ingest.js:48,53). POST /events is mounted without it
  (bootstrap ~line 682-691).
- EVENT-FORENSICS documents the sibling-copy divergence: tenant-registry
  validation + namespace = tenant::<id> branch exists in ping-gateway-src /
  ping-gateway-build but not in the /home/nolan/ping worktree copy.
- Deployed-path caveat: exact deployed Oracle bytes are unresolved; the
  2026-09-16/17 capture describes a live-patched POST /events, so the
  deployed container may already enforce auth. Verify before applying.

## MINIMUM CHANGE

Converge the worktree copy toward the sibling behavior using the EXISTING
boundary, not a new one:

1. Thread the already-constructed CanonicalizationService instance into
   createEventRoutes (bootstrap change only; no new service, no new authority).
2. In the direct branch, before eventRuntime.emit, apply
   canonicalizationService.authorizeNamespace(body.source, body.namespace) and
   reject on authorization failure, mirroring gateway/routes/ingest.js:48.

This makes POST /events and POST /ingest share one namespace-authorization
seam. It does not create a second canonical capability authority.

## TEST

Regression test (new, gateway-side): unsigned direct POST /events with an
arbitrary event_type and a namespace the caller is not authorized for is
rejected by authorizeNamespace; the same call through POST /ingest behaves
identically. Positive case: internal loopback callers that the deployment
relies on (workers, mission generator) still succeed, or their allowlist is
made explicit in the same change.

## RESULT

Not run / not applied. Core is propose-only for Agent 06. Requires agent01
sign-off (event append path), Agent 20 conflict clearance, coordinator
decision, and verification of the deployed copy before any application.
