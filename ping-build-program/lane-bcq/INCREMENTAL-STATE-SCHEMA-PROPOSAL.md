# PORTABLE INCREMENTAL-STATE SCHEMA — PROPOSAL (connector contract, v1.0 draft)

Lane BCQ (airbyte worker), 2026-09-23. Status: PROPOSAL, not implemented.
Consumers: lane M (registry store + commit API), lane CONN (adapters emit it),
BCQ contract test kit (assertions), lane R (fixtures), lane K (typed events).

## Design intent

Connectors must stay replaceable. The state that lets a sync resume is the stickiest
thing a connector owns, so the format is standardized at the CONTRACT level: fixed
envelope framing that the host and registry understand, with the cursor value itself
opaque and provider-shaped. Portability rule: a replacement connector for the same
`stream_id` may adopt existing state iff it declares the same `cursor_kind` and a
compatible `state_schema_version`. Anything else triggers a bounded full re-derive,
which is a typed event, never an error and never silent.

This schema is the FORMAT contract. Lane M's registry owns DURABLE STORAGE and the
commit-first advancement rule; the registry never interprets `cursor_value`.

## The envelope (JSON Schema, draft 2020-12)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://ping.fyd/schema/connector-incremental-state/1.0",
  "title": "PING Connector Incremental State",
  "description": "Portable per-stream sync state. Framing is standard and host-readable; cursor_value is opaque and provider-shaped. State is OPERATIONAL (lane M Class C): loss costs a bounded re-fetch, never truth.",
  "type": "object",
  "required": [
    "state_schema_version", "stream_id", "cursor_kind", "cursor_value",
    "cursor_value_sha256", "emitted_by", "committed_event_seq_floor",
    "committed_at", "quarantined"
  ],
  "properties": {
    "state_schema_version": {
      "type": "string", "pattern": "^[0-9]+\\.[0-9]+$",
      "description": "Envelope version. Current: '1.0'. Connectors declare the versions they write and the versions they can migrate from."
    },
    "stream_id": {
      "type": "string",
      "description": "The stream this state belongs to, e.g. 'gbp.reviews'. State is keyed (connection_id, stream_id); never connection alone."
    },
    "cursor_kind": {
      "type": "string",
      "enum": ["updated_at", "created_at", "delta_token", "page_cursor", "etag", "sequence_id", "none"],
      "description": "Declared cursor semantics. updated_at/created_at: RFC3339 timestamp watermark. delta_token: provider-owned opaque watermark (M9). page_cursor: artificial pagination cursor (resumable full refresh). etag: RFC9110 validator as cursor. sequence_id: monotonic provider sequence. none: stream is full-refresh-only; no incremental state is meaningful."
    },
    "cursor_value": {
      "description": "OPAQUE. Provider-shaped cursor (timestamp string, delta token, page token, ETag). Only the connector that wrote it (or a compatible replacement) may interpret it. The registry and host MUST NOT parse it.",
      "type": ["string", "object"]
    },
    "cursor_value_sha256": {
      "type": "string", "pattern": "^[0-9a-f]{64}$",
      "description": "Hex sha256 over the canonical JSON serialization of cursor_value. Corruption detector; mismatch on load quarantines the state."
    },
    "emitted_by": {
      "type": "object",
      "required": ["connector_id", "connector_version"],
      "properties": {
        "connector_id": { "type": "string" },
        "connector_version": { "type": "string", "pattern": "^[0-9]+\\.[0-9]+\\.[0-9]+$" },
        "migrates_from": {
          "type": "array", "items": { "type": "string" },
          "description": "State schema versions this connector version can migrate forward, e.g. ['1.0'] when writing 1.1."
        }
      },
      "additionalProperties": false
    },
    "committed_event_seq_floor": {
      "type": "integer", "minimum": 0,
      "description": "Journal sequence number: every observation at or below this seq, covered by this checkpoint, is COMMITTED. A checkpoint may only advance over committed observations (commit-first rule). Registry-managed."
    },
    "committed_at": { "type": "string", "format": "date-time" },
    "quarantined": {
      "type": "boolean",
      "description": "True after corruption detection, provider cursor rejection, or cursor regression. A quarantined state is never handed to a worker. Unquarantine only via a clean full re-derive + fresh commit."
    },
    "quarantine_reason": {
      "type": "string",
      "description": "Present when quarantined: typed reason + evidence ref, e.g. 'checksum-mismatch', 'delta-token-invalid', 'cursor-regression'."
    },
    "lookback": {
      "type": "string",
      "description": "ISO-8601 duration of trailing overlap re-read on each incremental fetch (e.g. 'PT72H'). Catches late/out-of-order provider records; dedup absorbs the overlap."
    },
    "initial_sync": {
      "type": "object",
      "required": ["policy"],
      "properties": {
        "policy": { "type": "string", "enum": ["windowed", "from_now", "full"] },
        "window": { "type": "string", "description": "Required when policy=windowed: ISO-8601 duration of history to ingest on first sync, e.g. reviews 'P90D'." },
        "completed_at": { "type": "string", "format": "date-time", "description": "Set when the initial sync finished; absent means initial sync has not completed." },
        "budget_usd": { "type": "number", "description": "Explicit budget line for the initial sync: the most expensive sync a stream will ever do." }
      },
      "additionalProperties": false
    },
    "migration_history": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["from_version", "to_version", "migrated_at", "migrated_by"],
        "properties": {
          "from_version": { "type": "string" },
          "to_version": { "type": "string" },
          "migrated_at": { "type": "string", "format": "date-time" },
          "migrated_by": { "type": "string", "description": "connector_id@version that performed the migration." }
        },
        "additionalProperties": false
      },
      "description": "Append-only record of state migrations. History is never rewritten."
    }
  },
  "additionalProperties": false
}
```

## Cursor resolution order (admission rule)

For a stream in `incremental` sync mode, the cursor is resolved:
1. `source_defined`: the connector declares it knows best (e.g. delta_token the provider issued);
2. configured override: operator/product-supplied cursor field (ConfiguredAirbyteStream analog);
3. declared default: the stream's `default_cursor_field` from the manifest.
If none of the three yields a cursor, admission REJECTS the stream config. No silent full-refresh
fallback for a stream declared incremental: that would be an unbounded cost surprise.

## Monotonicity and regression

- For ordered cursor kinds (`updated_at`, `created_at`, `sequence_id`), the registry rejects a
  checkpoint proposal that moves the cursor backwards, unless the proposal carries a typed
  `CURSOR_REGRESSION` event with evidence (provider visibly reset its watermark). Backwards
  movement beyond the lookback window quarantines the stream's state instead of chasing it.
- For opaque kinds (`delta_token`, `page_cursor`, `etag`), monotonicity is the connector's
  claim: the connector asserts "this token continues from the previous one." The registry
  checks continuity of custody (same connector_id, unbroken run lease) and checksum, not semantics.
- Clock-skew tolerance: records dated in the future beyond tolerance are quarantined with
  evidence, never trusted as the new watermark.

## Adoption by a replacement connector

```
can_adopt(existing_state, new_connector):
  if new_connector.stream_id != existing_state.stream_id: NO (different stream)
  if new_connector.cursor_kind != existing_state.cursor_kind: NO -> bounded full re-derive
  if existing_state.state_schema_version in new_connector.migrates_from: MIGRATE (record in migration_history)
  elif versions equal: ADOPT
  else: NO -> bounded full re-derive (typed event STREAM_STATE_RESET)
```

A full re-derive is bounded by the stream's initial-sync policy and budget. It is never
punishment; it is the honest cost of replacing the thing that understood the old cursor.

## Worked example: GBP reviews stream

```json
{
  "state_schema_version": "1.0",
  "stream_id": "gbp.reviews",
  "cursor_kind": "updated_at",
  "cursor_value": "2026-09-22T14:03:11Z",
  "cursor_value_sha256": "9f2c…(64 hex)",
  "emitted_by": { "connector_id": "google-business-profile", "connector_version": "1.4.0", "migrates_from": ["1.0"] },
  "committed_event_seq_floor": 881204,
  "committed_at": "2026-09-23T19:10:02Z",
  "quarantined": false,
  "lookback": "PT72H",
  "initial_sync": { "policy": "windowed", "window": "P90D", "completed_at": "2026-09-10T08:00:00Z", "budget_usd": 0 },
  "migration_history": []
}
```

Next fetch: ask GBP for reviews with `updated_at >= 2026-09-19T14:03:11Z` (cursor minus 72h
lookback), page through results, emit observations, wait for journal commit, then propose a new
checkpoint with the max observed `updated_at` and the new seq floor. If GBP 403s the reviews leg
(producer-restricted surface), the stream degrades to UNKNOWN per its manifest degradation
clause; the checkpoint is left untouched, not zeroed.

## Open questions for other lanes

- Lane M: does the registry API need a `proposeCheckpoint`/`commitCheckpoint` split, or is the
  lease + single commit call sufficient? (Design §5.2 implies single commit with verification.)
- Lane K: confirm typed event names `SOURCE_CURSOR_QUARANTINED`, `CURSOR_REGRESSION`,
  `STREAM_STATE_RESET` fit the taxonomy, or rename.
- Lane R: fixture set needed — corrupted state blob, version-skewed state, lying-source page
  sequence (out-of-order updated_at + future-dated record), delta-token-invalid rejection.
- Lane J: every checkpoint commit should log connection/stream/old_floor/new_floor/records/
  bytes so "WHY DID FYD CHANGE" stays answerable.
- Lane CONN: first adapter to implement this envelope end to end (GitHub issues stream is the
  natural candidate: page_cursor + updated_at both available).
