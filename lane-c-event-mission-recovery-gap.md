# LANE C — Event->Mission Recovery Gap: Forensic Report

**Verdict: PROVEN** — at HEAD `0d3cddd4a67238e0511ae7b58718cd75dd29d8d3`
(`constitutional-convergence-authority-law`), an accepted canonical event that
is committed to `ping_events` but never reaches mission derivation stays
orphaned **indefinitely**. There is no replay, reconciliation, durable
subscription receipt, cursor, or startup scan on the canonical event->mission
path. Proven by source evidence, reachability, execution, persistence, and
failure injection (see below).

Worktree was clean at test time (only pre-existing untracked `evidence/`).

## 1. Current event->mission path (traced at current HEAD)

Producer -> `ProducerEventPort` (`ping-runtime/events/producer_event_port.js`)
-> `UnifiedEventRuntime.emit()` (DIRECT seam) or receipt seam
(`CanonicalEventEnvelope.executeEmitEvent` -> `LegacyIngressAdapter` ->
`UER.emit()`) -> `ping_events` -> **in-process handler fan-out only** ->
`EventToMissionBridge` -> `MissionRuntime.create()` -> `ping_missions` ->
`MissionScheduler` polls `ping_missions` -> `WorkerRuntime.dispatch()`.

File/line evidence:

- `ping-runtime/events/unified_event_runtime.js`
  - step 6 persist, `INSERT INTO ping_events ... ON CONFLICT (event_id) DO NOTHING` (~line 250)
  - step 7 "Dispatch to handlers": `const handlers = this._handlers.get(eventType) || []`
    with per-handler try/catch that only `console.error`s (~lines 282-291)
  - `on(eventType, handler)` pushes into an in-memory `Map` (~lines 313-320).
    **No durability.** A subscriber exists only while the process lives.
- `ping-runtime/orchestration/event_to_mission_bridge.js`
  - `start()` (~line 89-103): loops `EVENT_MISSION_MAP` keys and calls
    `this._eventRuntime.on(...)`. **Subscribe-only. No scan, no cursor, no receipt.**
  - `_handleEvent` (~line 111): failures caught -> `stats.failed++` + console.error.
    **No retry, no DLQ, no redelivery.**
  - `getStats()` returns `{..., scope: 'session'}` — stats are not persisted.
- `ping-runtime/orchestration/mission_runtime.js`
  - `create()` (~line 57): `mission_id = sha256(missionType:event_id)[0:16]`,
    `INSERT INTO ping_missions ... ON CONFLICT DO NOTHING`. Idempotent by
    construction (this is what phase 13 certifies; it is the duplicate lane,
    not this one). Emits `MISSION_CREATED` only when the row is actually inserted.
- `ping-runtime/orchestration/mission_scheduler.js`
  - `_poll()` (~line 152) reads `getPending()` from `ping_missions` only
    (~line 339). **It never reads `ping_events`.** A mission that was never
    derived is invisible to the scheduler forever.
- `gateway/bootstrap/gateway_runtime.js`
  - Bridge constructed + `start()` (~line 601). The only `ping_events` read at
    startup is `SELECT COUNT(*)` to skip seeding (~line 866). **No unbridged-event scan.**
- `ping-runtime/events/event_bridge.js` — header: `CLASSIFICATION:
  PRESERVED_INACTIVE (MC-1, 2026-09-18). RETIRED and no longer wired.` Its
  `ping_bridge_cursors` table is never created at HEAD. Do not mistake it for
  a recovery path.
- `ping_events.processed` column: **never written by the canonical path.**
  `emit()` inserts with the default `FALSE`. The only `processed` writes in the
  codebase target `canonical_events` (legacy ingress adapter, a different table).
- Dead ends that look like recovery but are not:
  - `WorkerRuntime._poll()` fetches `GET /events/unprocessed`, but `start()`
    is documented "dispatch-only mode" (`ping-runtime/workers/worker_runtime.js`
    ~line 51-58: "_poll() loop is disabled to prevent dual input paths") and
    `workerRuntime.start()` is never called in bootstrap. Dead.
  - `GET /events/unprocessed` -> kernel `getUnprocessedEvents` queries
    **`repository_events`** (`runtime/kernel/event_read_authority.js` ~line 334),
    the retired derived-audit table with the old schema — not the canonical journal.
    Vestigial, and it dispatches to workers directly, never deriving missions.

**Crash windows with no recovery:**
(a) between persist (emit step 6) and dispatch (emit step 7);
(b) inside bridge `_handleEvent` (throw swallowed, `failed++`);
(c) process death any time after commit while the in-memory subscriber set is gone.

## 2. Failure-injection results (live, current HEAD code, scratch PG)

Script: `/tmp/lanec/lane_c_test.js` on the Pig (byte-exact transfer, sha256
`9c7f5a89fc78a96f4b5910d90fdf61b22269721065a29bded7bfb0ac1ab0df89`).
Scratch DB `lane_c_test` + role `lane_c_test` on `w1a-scratch-pg`
(127.0.0.1:15439). Raw output:

```
P1 committed event (no subscriber = crash window): event_a0b9a48bd2fd355d
P1 ping_events row present: true | processed flag: false
[EventToMissionBridge] Listening to 28 event types
[EventToMissionBridge] REVIEW_RECEIVED -> mission 02146dc162b41804 (REVIEW_RESPONSE)
P2 control: bridge derives mission for NEW event: true | mission: 02146dc162b41804
P3 mission for ORPHANED event after restart: ABSENT
P3 orphan event still in ping_events: true
P3 bridge stats: {"listened":1,"missionsCreated":1,"skipped":0,"failed":0,"scope":"session"}
[EventToMissionBridge] Listening to 28 event types
[EventToMissionBridge] Failed to create mission for LEAD_CREATED: SIMULATED CRASH mid-mission-create
P4 mid-derivation crash -> emit status: ok | mission ABSENT: true | bridge failed: 1
[EventToMissionBridge] Listening to 28 event types
P5 after 2nd restart: orphan1 mission: ABSENT | orphan2 mission: ABSENT
DONE
```

Reading:
- P1: event committed with zero subscribers = the observable state of a crash
  between persist and dispatch (the bridge is in-process only, so in that window
  no handler can have run).
- P2: restart (fresh UER + bridge.start(), mirroring bootstrap) derives missions
  for NEW events. The bridge is healthy; the gap is structural, not a bug in the
  bridge.
- P3: the orphaned event gained no mission on restart. `bridge.start()` performed
  no scan (stats show only the 1 new event).
- P4: a throw inside derivation is swallowed by emit's handler try/catch;
  `emit()` still returns `ok`; mission absent; `failed=1`; nothing retries.
- P5: after a second restart both orphans remain mission-less. **Orphaned
  canonical events persist indefinitely.**

Claim ladder: SOURCE EVIDENCE -> REACHABILITY -> EXECUTION -> PERSISTENCE ->
FAILURE INJECTION -> REPLAY/RECOVERY (proven absent). **PROVEN.**

## 3. Minimum repair proposal (NOT patched — operator architecture decision)

Patch discipline: defect proven (1) ✓, but (3) fails — a missing recovery
mechanism is an architecture decision needing the operator's repair design.
Producing the decision packet instead of patching.

**Repair shape: idempotent reconciliation (derivation backstop), no 2PC, no
authority merge.**

- The derivation is already idempotent: deterministic
  `mission_id = sha256(missionType:event_id)[0:16]` + `ON CONFLICT DO NOTHING`
  (phase 13). Re-derivation is safe under overlap, retry, and concurrent
  bridge delivery. This is the load-bearing property that makes reconciliation
  cheap.
- Proposed: a reconciler in the orchestration layer (sibling of
  `EventToMissionBridge`, or an extension of it) that on startup and on a
  bounded periodic cadence runs:
  ```sql
  SELECT e.event_id, e.event_type
    FROM ping_events e
   WHERE e.event_type IN (<EVENT_MISSION_MAP keys>)
     AND NOT EXISTS (
       SELECT 1 FROM ping_missions m
        WHERE m.payload->>'event_id' = e.event_id
          AND m.mission_type = <mapped type for e.event_type>
     );
  ```
  and calls `missionRuntime.create(mappedType, {...same payload shape as the
  bridge...}, {priority, createdBy: 'mission-reconciler'})` for each row.
  No cursor needed: the anti-join against `ping_missions.payload->>'event_id'`
  IS the receipt, and idempotent create makes re-scans harmless. (A `sequence`
  high-water mark is an optimization for scale later; C-035's lesson says keep
  it out of v1 — the anti-join cannot skip rows the way the retired
  lexicographic-UUID cursor did.)
- Authority check: reconciliation is DERIVATION (read journal -> derive work via
  `MissionRuntime`), which is the mission side's existing job. `UER` remains the
  sole acceptance authority; `MissionRuntime` remains the mission authority;
  the bridge remains the live trigger; the reconciler is a backstop, not a
  competing authority. No UER changes, no schema change to the canonical journal
  required for v1.

**Open operator decisions (do not proceed without Nolan's call):**
1. Component ownership: new `MissionReconciler` class vs. `reconcile()` method on
   `EventToMissionBridge` vs. scheduler-owned. (Do not merge UER and
   MissionRuntime authorities.)
2. Cadence: startup-only vs. startup + periodic (e.g. 60s). Periodic also heals
   P4-class mid-derivation failures without a restart.
3. Backfill scope: run once over all of production `ping_events` on deploy, or
   only from a cutover sequence forward.
4. Observability: `createdBy: 'mission-reconciler'` distinguishes backstop
   missions; consider reconciler stats surfaced alongside bridge stats.
5. Optional v2: a `bridged` receipt on the journal vs. keeping the journal
   append-only and the anti-join as the receipt (recommended: anti-join; keeps
   the canonical journal free of downstream write-back).
6. The P4 failure mode (throw swallowed, `emit` returns `ok`) deserves its own
   decision: fail-loud vs. DLQ vs. reconciler-as-backstop.

## 4. Contradictions / notes for the parent

- Earlier reports may imply the `processed` flag or `/events/unprocessed`
  constitutes an event-processing receipt. **Falsified at HEAD:** `processed` on
  `ping_events` is never written by any live canonical path, and
  `/events/unprocessed` reads the retired `repository_events` table through a
  poll loop that is explicitly disabled and never started.
- `EventBridge` (PRESERVED_INACTIVE) must not be cited as handling recovery;
  its cursor table is never created at HEAD.
- Phase 13's exactly-once result (duplicate delivery -> one mission) is the
  OTHER lane and does not cover this one; it is in fact the property that makes
  the proposed reconciler safe.
- Test artifacts left on the Pig: `/tmp/lanec/lane_c_test.js` (+ node_modules/pg),
  scratch DB `lane_c_test` and role `lane_c_test` on `w1a-scratch-pg`. Re-runnable
  as-is. No worktree files were modified.
