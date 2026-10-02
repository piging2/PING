# F7-A Evidence Freeze (2/3): Era Census + MC-1 Bridge State

Frozen: 2026-09-18 ~14:15 MDT. DB reads were SELECT-only. No repo writes, no git ops.
Target DB: `docker exec ping-postgres`, database `crx_runtime`, user `crx_user`.

## A. Era row-count evidence [EMPR]

**A1. Total rows.** SQL: `SELECT count(*) FROM ping_events;` Result: **739**.

**A2. Identity-format breakdown.** SQL:

```sql
SELECT
  SUM(CASE WHEN length(event_id)=64 AND translate(event_id,'0123456789abcdefABCDEF','')='' THEN 1 ELSE 0 END) AS era_h_64hex,
  SUM(CASE WHEN left(event_id,6)='event_' THEN 1 ELSE 0 END) AS era_v1_event_prefix,
  SUM(CASE WHEN NOT (length(event_id)=64 AND translate(event_id,'0123456789abcdefABCDEF','')='') AND left(event_id,6)<>'event_' THEN 1 ELSE 0 END) AS other_fmt,
  count(*) AS total
FROM ping_events;
```

Result: **739 | 0 | 0 | 739**. All 739 rows are Era H (bare 64-char hex); zero Era V1
(`event_`-prefixed) rows; zero other formats. `min(length)=64, max(length)=64`.
Note: the identity column is named **`event_id`**; there is no `id` column.

**A3. Duplicates.** `SELECT event_id, count(*) FROM ping_events GROUP BY event_id HAVING
count(*)>1;` returns zero groups. `count(DISTINCT event_id)` = 739.

**A4. Samples (verbatim).**
- Era H: `e34007ddf7f7b95d8f81a3f14fb3af41ce4893b26c134e8314fe98bba5463c18`,
  `d936783e0e6a4aa2e0e96f03818a8e625cdb1ded98f01d0b7c58f983d40fbbb6`,
  `4817d198ea627130e3911f9147dc50ac3226b9c8170e444a4d425dad5333a407`
- Era V1 (`event_`): none exist.

**A5. `ping_events` columns** (information_schema, ordinal order):
`event_id varchar NOT NULL | event_type varchar NOT NULL | source varchar NOT NULL |
timestamp timestamptz NOT NULL | payload jsonb NOT NULL | metadata jsonb NOT NULL |
namespace varchar NOT NULL | processed boolean NOT NULL | created_at timestamptz NOT NULL`

Auxiliary: `SELECT processed, count(*) FROM ping_events GROUP BY processed;` ->
**f | 739** (all rows unprocessed). Source distribution: mission-runtime 576;
projection/claim/classification/lineage/witness/replay/recommendation/observation 18
each; project-authority 7; customer-authority 5; review-authority 2; email-connector 2;
health-authority 1; worker-runtime 1; sms-connector 1. **Zero rows with
`source='repository_events'` or `source='canonical_events'`.**

D4 reliance note: the counts `739` (Era H) and `0` (Era V1) are now backed by the exact
queries above against `crx_runtime` on `ping-postgres` at freeze time.

## B. `canonical_events` state (MC-1) [EMPR]

- Table exists. **Row count: 0.**
- Columns: `event_id uuid NOT NULL | event_type varchar NOT NULL | event_version varchar
  NOT NULL | tenant_id varchar NOT NULL | timestamp timestamptz NOT NULL | sequence
  bigint NOT NULL | source varchar NOT NULL | actor varchar NOT NULL | causation_id uuid
  NULL | correlation_id uuid NULL | payload jsonb NOT NULL | metadata jsonb NOT NULL |
  processed boolean NULL | processed_at timestamptz NULL | worker varchar NULL |
  retries integer NULL | last_error text NULL | created_at timestamptz NULL`.
- Processing-state primitives ALREADY EXIST: `processed` (nullable boolean),
  `processed_at`, `worker`, `retries`, `last_error`. No non-null state values exist (0 rows).
- Sibling tables also 0 rows: `event_outbox`, `event_processing`, `events`,
  `mission_events`, `repository_events`.
- `ping_bridge_cursors` EXISTS with 0 rows: the bridge `initialize()` ran against this
  DB at some point but never persisted a cursor.

## C. Bridge code [STAT] — `ping-runtime/events/event_bridge.js` (349 lines)

**C1. Cursor/ordering (verbatim), lines 149-151, 159 (repo path) and 252-255, 261
(canonical path):**

```js
    if (this._lastRepoEventId) {
      sql += ` AND event_id > $${idx++}`;
      params.push(this._lastRepoEventId);
    }
...
    sql += ` ORDER BY event_id ASC LIMIT $${idx++}`;
```

CORRECTION to the earlier "UUID-v5 cursor" phrasing: there is NO UUID-v5 generation or
comparison anywhere in this file (grep for `uuidv5|uuid.v5|v5(` across
`ping-runtime/events/` and the identity authority: zero hits). The cursor is a plain SQL
`event_id > $1` LEXICOGRAPHIC comparison with `ORDER BY event_id ASC`, persisted
per-source in `ping_bridge_cursors` (lines 51-57, 211-217), restored on init (59-77).
For `canonical_events`, `event_id` is a random UUID: lexicographic order is NOT
insertion/creation order, so an `event_id > last` cursor over random UUIDs can
permanently skip unprocessed rows whose UUID sorts below the cursor. The invariant
"NO UNPROCESSED ROW MAY BECOME PERMANENTLY INVISIBLE" is therefore not guaranteed by
this cursor. (C-035 retained with corrected mechanism: lexicographic cursor over
non-monotonic UUIDs, not UUID-v5.)

**C2. Emit rejection advances the cursor anyway — CONFIRMED (C-037), both paths [STAT].**

Repo path, lines 196-207, verbatim:

```js
        if (emitResult.status === 'ok') {
          bridged++;
        }
      } catch (err) {
        console.error(`[EventBridge] Failed to bridge repo event ${row.event_id}: ${err.message}`);
        this._stats.errors++;
      }
    }

    // Advance cursor
    this._lastRepoEventId = rows[rows.length - 1].event_id;
```

No `else` branch: a rejected emit is swallowed, the cursor advances past the failed row,
the row is never retried and never appears in `ping_events`. Canonical path, lines
296-314: on `ok` marks `processed=TRUE` (298-303); on rejection only logs DEBUG
(304-306); on throw logs + increments errors (307-310); then UNCONDITIONALLY
`this._lastCanonicalEventId = rows[rows.length - 1].event_id;` (line 314).
Persist failures in `unified_event_runtime.js` RETURN `{ status: 'error', ... }` rather
than throwing (lines 164-167), so they flow into exactly these swallowed branches.

STATUS: latent, not live (both source tables are empty; no bridge-source rows in
`ping_events`; cursor table empty). If rows appear with the gateway running, any emit
rejection/throw permanently skips those rows.

**C3. Dedup predicate compares incompatible identity spaces — CONFIRMED [STAT].**

Repo, lines 154-157:

```js
    // Skip events we already bridged (check ping_events for source='repository_events' + event_id)
    sql += ` AND event_id NOT IN (
      SELECT event_id FROM ping_events WHERE source = 'repository_events'
    )`;
```

Canonical, lines 257-259:

```js
    sql += ` AND event_id::text NOT IN (
      SELECT event_id FROM ping_events WHERE source = 'canonical_events'
    )`;
```

`emit()` never reuses the source row's ID; it remints via
`identityAuthority.generateId('event', identityData)` (`unified_event_runtime.js`
line 89) producing `event_<16hex>`. The subqueries compare source-table IDs (UUID text)
against reminted IDs that can never be equal: the dedup is vacuous. Live corroboration
[EMPR]: zero `ping_events` rows carry either bridge source value.

**C4. Convergence losses — CONFIRMED [STAT]** (repo emit lines 179-194; canonical emit
lines 278-294; same shape):

- Identity: REMINTED. Original `event_id` never passed; stashed only as
  `payload._repository_event_id` / `payload._canonical_event_id` (lines 182, 274) and
  `metadata.original_event_id` (lines 189, 288).
- Timestamp: REPLACED. Neither call passes a timestamp; `emit()` sets
  `timestamp: constitutionalTimeAuthority.nowAsISOString()` (unified line 135). Both
  queries SELECT the original timestamp (lines 141, 245) and discard it.
- Source: OVERWRITTEN to literals `'repository_events'` (line 181) / `'canonical_events'`
  (line 280). The canonical row's own `source` column is selected (line 243) but discarded.
- Metadata: REBUILT. Bridge passes only `{bridged_from, original_event_id, authority,
  runtime_id}` (187-192) or `{bridged_from, original_event_id, tenant_id, actor,
  event_version}` (286-291); `emit()` wraps into `{schema_version:'1.0.0', namespace,
  causation_id, correlation_id, ...}` (unified 137-146). Original row metadata discarded
  (repo path does not even select it; canonical selects at line 244, never passes it).
- Namespace: COLLAPSED to `core::system`. Neither call passes `options.namespace`;
  `emit()` defaults `options.namespace || 'core::system'` (unified line 86).
- Governance: SKIPPED. Both calls pass `_skipGovernance: true` (lines 184, 283), honored
  at unified line 112.
- Payload is carried through (copied) with `_`-prefixed provenance keys injected
  (lines 181-187 repo; 273-276 canonical).

**C5. Watchdog/lag/divergence observability: NONE [STAT].**
`grep -rniE "watchdog|bridge_lag|lag_ms|divergence|stale_cursor|cursor_lag|bridge_health|unbridged"`
over `ping-runtime/` returns zero hits. Only `console.log` DEBUG lines and in-memory
`getStats()` (lines 337-347). The bridge IS wired in production:
`gateway/bootstrap/gateway_runtime.js` line 71 requires it; lines 461-468 instantiate
with `pollIntervalMs: 5000, batchSize: 50`, then `await eventBridge.initialize();
eventBridge.start();`.

## Uncertainties

1. DB auth used the container's own env (password never exposed); socket trust not verified.
2. Whether `crx_runtime` on `ping-postgres` is the production vs dev/convergence database
   was not verified; the freeze describes exactly this container/DB.
3. `unified_event_runtime.js` line numbers above are from `grep -n` on the file at freeze time.
