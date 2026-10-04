# Meta Business SDK harvest — wiring notes (2026-10-04)

Source: facebook/facebook-python-business-sdk @ tag 26.0.2
(SHA efd8423a2e595ea8d4c04eb824ce113f2f1d68cd, 2026-09-17).
Full manifest: `../manifests/meta-business-sdk-2026-10-04.md`.

## What was taken

- `cursor.py` — lazy Graph API cursor pagination (stdlib only).
- `meta_errors.py` — typed Graph errors with RETRY/BACKOFF/FAIL decisions.

Both are clean-room reimplementations of SDK patterns, not SDK code.
~5.6 KB total. No SDK import, no new dependency.

## How the Meta archaeology lane should use them

The lane's first milestone (directive section 18) is an inventory, not a post:
CONNECTED BUSINESS -> AUTHORIZED API -> BUSINESS/PAGE/IG/AD ACCOUNT
INVENTORY -> OBSERVATIONS -> FYD OBJECT GRAPH -> PROPOSAL.

1. In `~/workspace/skills/facebook-graph/bin/`, wrap the existing
   authenticated request helper so it exposes `fetch(path, params) ->
   dict`, then drive `GraphCursor(fetch, ...)` over edges:
   `me/adaccounts`, `<page-id>/...`, `<business-id>/...`.
2. On any error, `parse_error(status, body)`; on BACKOFF, back off
   (never hammer); on FAIL_PERMANENT with `is_capability_gap()`, record
   the operation as BLOCKED in the capability inventory (directive
   section 5) instead of retrying.
3. Keep every Meta-specific field name in the adapter layer. The FYD
   object graph gets PING terms only (mapping below).

## Meta -> FYD object mapping (directive section 6, do not copy blindly)

| META               | FYD                          |
|--------------------|------------------------------|
| Business           | Business                     |
| Page               | ExternalIdentity / Channel   |
| Instagram account  | ExternalIdentity / Channel   |
| Campaign           | Campaign                     |
| AdSet              | Audience / DeliveryPlan      |
| Ad                 | Creative / Distribution      |
| Creative           | Creative                     |
| Lead               | Lead                         |
| Insight            | Observation / Metric         |
| Conversion         | Outcome                      |
| Custom Audience    | AudienceReference            |
| Pixel/CAPI event   | OutcomeObservation           |

Notes:
- The SDK's CAPI `Event` envelope (event_name, event_time, event_id,
  event_source_url, user_data, custom_data, action_source) is the shape
  to expect for OutcomeObservation payloads.
- SDK object classes are codegen'd (1112 files in adobjects/); do not
  mirror them. Map fields at the adapter boundary instead.
- Version pinning: the SDK pins `API_VERSION = v26.0` in config and
  validates `vN.N` format per call. Our adapter should pin the Graph
  version it was verified against the same way.

## What was deliberately NOT taken

- The 135K LOC SDK itself (dependency cost absurd for patterns).
- The 1112 generated adobject classes (codegen output; mapping > mirroring).
- Any auth/token handling (the facebook-graph skill owns credentials;
  note the SDK passes access_token as a request param — never log URLs).
- Meta's permission/app-review model as authority (it is Meta's gate,
  not PING's; PING OWNS AUTHORITY).
