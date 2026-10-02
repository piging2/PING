# LANE B — UnifiedEventRuntime.emit() exact trace, timeline, per-boundary crash enumeration

Worktree: `/home/nolan/worktrees/constitutional-convergence-authority-law`
HEAD: `0d3cddd4a67238e0511ae7b58718cd75dd29d8d3` (verified, matches baseline).
Dirty state: 4 modified + 2 untracked files, NONE of them on the emit path.
`ping-runtime/events/unified_event_runtime.js`, `ping-runtime/orchestration/event_to_mission_bridge.js`,
`ping-runtime/authorities/identity_authority.js`, `runtime/kernel/authorities/identity_authority.js`,
`runtime/kernel/authorities/canonical_authority.js`, `ping-runtime/events/convergence_identity.js` are all
HEAD-clean (verified via `git diff --stat` on each). Dirty files are other lanes' work:
`gateway/bootstrap/gateway_runtime.js` (Lane G: adds WORKER_COMPLETED/WORKER_FAILED `.on()` subscriptions),
`ping-runtime/orchestration/mission_runtime.js` (Lane J: mission completion gated on MISSION_COMPLETED acceptance),
`ping-runtime/workers/canonical_workers.js` (worker fixes), `gateway/test_witness_w2_versioning.js` (+39 lines),
plus untracked `evidence/` and two test files.

Primary source: `ping-runtime/events/unified_event_runtime.js` (532 lines), method `emit()` at lines 122-303.

## 1. emit() step-by-step, with file:line evidence

**Step 1 — build identity material (in-memory, no ID minted).** :128-133
`identityData = { event_type, source, namespace }` plus `logical_id` if `options.logical_id` else `payload`.
Namespace default resolved BEFORE identity. Timestamp deliberately excluded from identity.

**Step 2 — validate event type BEFORE identity minting (F7/D1).** :139-166
Rejected event receives NO canonical event ID, NO persistence, NO acceptance claim.
Returns `{status:'error', code:'UNKNOWN_EVENT_TYPE'}` at :147-148 or :156-157. `stats.failed++`.
Capability-bound legacy-ingress exception only (object-identity comparison).

**Step 3 — governance check.** :171-190
Reject returns `{status:'error', code:'GOVERNANCE_VIOLATION'|...}` at :184-188. `stats.failed++`.
Nothing persisted, no ID minted (ID minted in step 4, after this).

**Step 4 — mint canonical event_id via IdentityAuthority (V2).** :198-214
`identityAuthority.generateId('event', identityData)` at :201 → `event_<16hex>`.
F7/D1 value-domain rejection throws BEFORE any ID exists → returns `{status:'error',
code:'IDENTITY_VALUE_REJECTED'}` at :205-213. No persistence.

**Step 5 — build canonical event object (in-memory).** :219-238
`timestamp` assigned from `constitutionalTimeAuthority.nowAsISOString()` at :227 (observation metadata,
after identity). `metadata` = schema_version, namespace, causation_id, correlation_id (= eventId default),
optional confidence, plus caller `options.metadata` spread.

**Step 6 — persist.** :240-274
Single statement at :245-246:
`INSERT INTO ping_events (event_id, event_type, source, timestamp, payload, metadata, namespace)
VALUES ($1..$7) ON CONFLICT (event_id) DO NOTHING RETURNING sequence`
via `this._pool.query(...)`. **There is no explicit transaction.** `pool.query()` with one statement
runs in PostgreSQL's implicit single-statement transaction (autocommit). No BEGIN/COMMIT exists
anywhere in the emit path (verified by full-file read). Table: `ping_events`. Sequence allocated by
column DEFAULT `nextval('ping_events_sequence_seq')`; the INSERT never supplies it.
- Insert succeeds (rowCount=1): `stats.persisted++`, `sequence` from RETURNING (:252-256).
- Conflict (rowCount=0): `stats.deduplicated++`, then a SEPARATE implicit-transaction
  `SELECT sequence FROM ping_events WHERE event_id = $1` (:263) so the caller observes the one
  persisted position. Existing content is NOT compared (see COLLISION.md). **No early return:
  execution falls through to handler dispatch.**
- INSERT throws: `stats.failed++`, return `{status:'error', error:'Persist failed: ...', eventId}` (:272-274).
  Note the minted eventId is returned to the caller even though nothing persisted; retry is safe
  because the ID is deterministic and the insert is idempotent under ON CONFLICT DO NOTHING.
- No pool (`this._pool` null): persist skipped entirely; dispatch still runs; returns ok with sequence null.

**Step 7 — dispatch to handlers.** :282-291
```
const handlers = this._handlers.get(eventType) || [];   // :283
for (const handler of handlers) {                        // :284, registration order
  try {
    await handler(event);                                // :286 — AWAITED, sequential
    this._stats.dispatched++;                            // :287 — success only
  } catch (err) {
    console.error(`[EventRuntime] Handler failed for ${eventType}:`, err.message);  // :289
  }
}
```
Facts: handlers are **awaited** (not fire-and-forget), run sequentially in subscription order,
`emit()` does **not** return before they complete. A throwing handler is caught per-handler:
logged to console only, loop continues with the next handler. **No retry. No durable
acknowledgement of any kind.** `stats.failed` is NOT incremented on handler failure (only
`dispatched` is skipped), so a handler failure is invisible except in stderr. `emit()` still
returns `{status:'ok', ...}` — the caller cannot distinguish "all handlers succeeded" from
"some handlers threw".

**Step 8 — route to integrations.** :294-299
`await this._integrationManager.emit(event.event_type, event.payload)` at :296, errors swallowed
with console.error at :298. Only if an integration manager was injected.

**Step 9 — return.** :302-303
`this._stats.emitted++; return { status:'ok', eventId, event, sequence };`
Identical shape for fresh inserts and deduplicated conflicts (no `deduplicated` flag in current code).

## 2. Direct answers

- **When does UER persist / which table / which transaction?** Step 6 (:240-274), table `ping_events`,
  one implicit single-statement transaction per `pool.query()` call. No explicit BEGIN/COMMIT.
- **When are handlers invoked?** Step 7 (:282-291), strictly AFTER the persist commit.
- **Awaited or fire-and-forget?** Awaited, sequential, registration order (:286).
- **Does emit() return before handlers complete?** No. :302-303 runs after the loop.
- **One handler throws?** Per-handler catch at :288-290: console.error, continue loop. Others unaffected.
  Persistence already committed, unaffected. No rollback possible (nothing to roll back to; the
  statement committed). Emit returns ok.
- **Retried?** No. No retry loop, no dead-letter, no redelivery queue anywhere in this file.
- **Handler acknowledgements durable?** There is no acknowledgement concept. Nothing is recorded
  per handler except the in-memory `dispatched` counter.
- **Subscriptions durable?** No. `on()` at :309-316 pushes into an in-memory `Map`. Lost on restart;
  re-registered by bootstrap code on every boot.
- **Does restart enumerate unconsumed ping_events?** No. Nothing at startup queries `ping_events`
  for unhandled rows. The `processed BOOLEAN DEFAULT FALSE` column exists in DDL (:~60) and there is
  an `idx_ping_events_processed` index and a `query({unprocessed:true})` filter (:341-343), but the UER
  emit path never sets `processed=TRUE` and nothing reads it on restart. (The `processed`/`retries`/
  `last_error` machinery in `ping-runtime/events/legacy_ingress_adapter.js` operates on the
  `canonical_events` table, not `ping_events` — verified :187, :287-288, :476-515.)
- **UER.replay() (the cursor reader) — used for recovery?** `replay({afterSequence, limit, consumer})`
  at :363-418 is read-only, ordered, cursor-based. Its only live caller is
  `ping-runtime/context/replay_context_pack_builder.js` (Phase 20 derived consumer, read-only context
  pack). Nothing invokes it at startup to re-drive handlers.
- **EventToMissionBridge cursor/checkpoint?** None. `event_to_mission_bridge.js`: `start()` subscribes
  via `this._eventRuntime.on(eventType, ...)` at :100 (in-memory only). `_handleEvent` at :108-143
  creates a mission via `missionRuntime.create(...)`; its own try/catch at :133-140 means a mission-creation
  failure increments a session-only `stats.failed` and is otherwise lost — no retry, no durable record.
  `getStats()` returns `{...this._stats, scope:'session'}` — explicitly non-durable.
- **Can a persisted event permanently miss a handler?** YES. Proven by boundaries B3/B4 below. The
  journal row is durable; handler delivery is memory-only with no cursor, no ack, no redelivery.

## 3. Exact timeline T0..T9

- **T0** — caller invokes `emit(eventType, source, payload, options)` (:122). Nothing durable.
- **T1** — identity material assembled in memory (:128-133).
- **T2** — registry validation (:139-166); reject → error return, no ID, no persistence.
- **T3** — governance validation (:171-190); reject → error return, no ID, no persistence.
- **T4** — `eventId = event_<16hex>` minted in memory (:201); deterministic for identical material.
  F7/D1 rejection → error return, no ID, no persistence.
- **T5** — canonical event object built in memory; timestamp assigned (:219-238).
- **T6** — `INSERT ... ON CONFLICT (event_id) DO NOTHING RETURNING sequence` executes in one
  implicit PG transaction (:245-246).
  - T6a insert: row durably committed in `ping_events` with PG-allocated `sequence`; `persisted++`.
  - T6b conflict: zero rows written (a sequence value may still be consumed internally — accepted
    under the allocation-position contract, :236-239); `deduplicated++`; existing `sequence`
    re-read via separate `SELECT` (:263).
  - T6c throw: `failed++`, error return carrying the (unpersisted) minted eventId.
- **T7** — `event.sequence` attached in memory; handler loop (:283-291): each handler awaited in
  registration order; success → `dispatched++`; throw → console.error, continue. Runs for BOTH
  fresh and deduplicated emissions (fall-through, no early return on conflict → at-least-once
  handler semantics for duplicates).
- **T8** — integration manager emit awaited (:296), errors swallowed (:297-298).
- **T9** — `emitted++`; return `{status:'ok', eventId, event, sequence}` (:302-303).

## 4. Crash at EVERY boundary — what is durable, what is lost

- **B0 — crash before T0 / caller-side before invoke:** nothing exists anywhere. Durable: nothing.
  Lost: nothing (event never existed).
- **B1 — crash during T1..T5 (pre-persist):** in-memory material/ID/event object vanish. Durable:
  nothing. Lost: the emission entirely; caller got no return. Retry is safe: deterministic ID
  reproduces the same `eventId`, insert is idempotent.
- **B2 — crash during T6 (INSERT in flight):** the implicit single-statement transaction aborts.
  Durable: nothing (row absent). Lost: the emission. Same safe-retry property as B1.
- **B3 — crash after T6 commit, before/during T7 start (row committed, zero handlers ran):**
  Durable: the full `ping_events` row (with `processed=FALSE`, never flipped). Lost: EVERYTHING
  downstream — no handler ran, no mission created, no integration routed. On restart: subscriptions
  are re-registered from scratch, nothing enumerates this row, `replay()` is not invoked for
  handler redelivery. **The persisted event permanently misses all of its handlers.** This is the
  central delivery gap: commit and fanout are not atomic and fanout has no durable cursor.
- **B4 — crash mid-T7 (handler k of n completed, then crash; or handler k threw):**
  Durable: the `ping_events` row, plus whatever side effects handlers 1..k-1 produced in THEIR
  own systems (e.g., a mission row if the bridge's handler ran — that mission is durable in
  `ping_missions`, but nothing links it back as "event E was handled"). Lost: handlers k+1..n
  never ran; no record exists of which handlers ran (only the aggregate in-memory `dispatched`
  counter, itself lost on crash). A throwing handler (no crash) is worse in one way: it is
  recorded NOWHERE except stderr — `stats.failed` untouched, return value still ok. Restart:
  no redelivery. Partial, unrecorded fanout is permanent.
- **B5 — crash during T8:** Durable: row + all handler side effects. Lost: integration routing
  may not have happened; same no-redelivery consequence.
- **B6 — crash after T9 computed but return not observed by caller:** everything above completed.
  Durable: row + handler effects. Caller retries → dedup path (T6b) → **handlers run AGAIN**
  (at-least-once; current code has no dedup early-return). So a lost ack converts to duplicate
  downstream execution, not to safety.
- **BR — restart at any time (process death, then boot):** subscriptions re-registered by bootstrap;
  `ping_events` rows are NOT enumerated for handler redelivery; `processed` stays FALSE; `replay()`
  is never called for recovery. Any event in state B3/B4 stays handler-less forever. The only
  durable trace that an event existed is the journal row itself.

## 5. STOP TRUSTING CALLBACK DELIVERY — the precise defect

Callback (handler) delivery is trusted in exactly one place: the in-memory `for` loop at :284-291.
There is no durability behind it: no transaction spanning commit+dispatch, no outbox table, no
per-handler ack, no cursor, no redelivery on restart, no dead-letter. The `processed` column that
looks like a consumption marker is write-never/read-never in the UER path. Consequences proven
from the code: (a) B3 — committed event, zero handlers, permanent; (b) B4 — partial fanout,
unrecorded, permanent; (c) handler throw → silent ok; (d) duplicate emit → handlers re-fire
(at-least-once, not exactly-once). Any claim of "event accepted ⇒ handlers ran" is false; the only
true claim the code supports is "event accepted ⇒ row in ping_events".
