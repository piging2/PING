# PROPOSAL core-01: controller authorization for signed OBJECT_UPDATED

Status: PROPOSED ONLY. /home/nolan/ping is propose-only; nothing was applied.
Conflict check: Agent 20 must confirm no competing proposal touches
gateway/social_ingest_adapter.js normalizeObjectUpdated. Coordinator decides.

## WHY

The gateway's BFF envelope path verifies the Ed25519 signature and binds the
signer to a gateway-minted identity, but normalizeObjectUpdated never compares
the signer to the target object's controller. Any holder of a gateway-minted
identity key can rewrite any object's fields by calling POST /events directly
with a signed bff-envelope@1 OBJECT_UPDATED, bypassing the controller check the
adapter performs in ping-object-reader.submitProposal. Signature proves WHO
signed; nothing proves the signer MAY mutate this object.

## EVIDENCE

- /home/nolan/ping gateway/social_ingest_adapter.js, normalizeObjectUpdated
  (lines ~257-281): resolves objectId via resolveObjectId and signerId via
  resolveIdentityByPublicKey, then builds normalized changes with
  updated_by: signerId. No controller lookup, no comparison.
- The adapter-side check exists: submitProposal enforces controllerId ===
  viewerId for object updates, but it lives in the adapter
  (ping-constitutional src/lib/ping/ping-object-reader.ts), so a direct
  gateway caller skips it.
- normalizeObjectCreated always records payload.controller
  (social_ingest_adapter.js lines ~176-182), so the journal carries the
  ownership fact the check needs: SELECT payload->>'controller' FROM
  ping_events WHERE event_type='OBJECT_CREATED' AND payload->>'object_id'=$1.

## MINIMUM CHANGE

In normalizeObjectUpdated, immediately after signerId resolution, add:

```js
const controllerRow = await pool.query(
  `SELECT payload->>'controller' AS controller FROM ping_events
   WHERE event_type = 'OBJECT_CREATED' AND payload->>'object_id' = $1
   ORDER BY sequence ASC NULLS LAST LIMIT 1`,
  [objectId]
);
const controller = controllerRow.rows[0] && controllerRow.rows[0].controller;
if (controller && signerId !== controller) {
  throw new Error('SIGNER_NOT_CONTROLLER: OBJECT_UPDATED signer is not the object controller');
}
```

Notes:
- Error code uses the SIGNER_ prefix so gateway/routes/events.js classifies it
  as a 400 client error (existing regex), not a 500.
- Fail-open when the journal has no recorded controller (legacy rows): this
  avoids breaking objects created through the direct canonical branch, which
  may not record controller. Tighten to fail-closed only after a backfill is
  proven.
- No new authority is created: the check reuses the existing journal and the
  existing signer-binding; it does not invent a second capability authority.
- Same pattern should be audited for OBJECT_DELETED / RELATIONSHIP_DELETED if
  those normalizers exist; kept out of this minimum change.

## TEST

Regression test (new, gateway-side): seed journal with an OBJECT_CREATED
(controller = identity A), then submit a signed bff-envelope@1 OBJECT_UPDATED
from identity B; assert rejection with code SIGNER_NOT_CONTROLLER. Positive
case: same envelope from identity A succeeds. Both cases must also assert the
adapter practice-lane flow (viewer updates own object) still succeeds.

## RESULT

Not run / not applied. Core is propose-only for Agent 06. The diff above is the
complete proposed change; TEST is specified but unexecuted. Coordinator must
also resolve the deployed-path question (exact deployed Oracle bytes remain
unresolved per EVENT-FORENSICS) before any application.
