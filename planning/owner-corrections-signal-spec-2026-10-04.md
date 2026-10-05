# OWNER-CORRECTIONS SIGNAL SPEC

Date: 2026-10-04 (MDT)
Lane: replacement spec lane (action-inbox follow-up)
Status: SPEC ONLY. Nothing implemented. No code touched in any repo.

## Problem

The Mission Control "NEEDS YOUR ATTENTION" action inbox renders owner
corrections as UNKNOWN forever. Not because corrections are rare, but
because no `/system/state` counter and no projection source tracks them.

## Archaeology: where owner corrections live today

### Source 1: FYD owner event log (live, current, on the spine-neighbor FYD app)

- Repo: `/home/nolan/projects/ping-fyd-converged` (the app actually serving
  :3100; confirmed via `start-3100.sh`). Same module exists in
  `ping-wave2-ownerloop` and `ping-askfyd-gold`; converged is the live one.
- Writer: `src/fyd/object/owner-events.ts` — append-only per-object event
  log. Every owner decision is an event with actor, target fact, previous
  basis, new value/state, timestamp, content-hash event identity
  (canonicalizeJson, generator `fyd-owner@1`), evidence reference.
- Event types: `owner.confirmed-fact`, `owner.corrected-fact`,
  `owner.hid-fact`, `owner.restored-fact`, `owner.defaulted-fact`,
  `owner.added-fact`. Reducer handles every type; unknown types fail closed.
- Persistence: `data/fyd-owner/<objectId>.json` holding
  `{ version: 2, objectId, events: [...] }`. v1 mutable files migrate
  transparently on read. Reverting a correction appends
  `owner.restored-fact`; nothing is ever deleted.
- Write path: `src/app/api/fyd/objects/[objectId]/overrides/route.ts`
  (patch-loop.ts). Server-only.
- Read path: `src/fyd/object/owner-overlay.ts` — pure readers composed
  AFTER projection digest verification. Consumers: generated site pages,
  Ask FYD (`ask-composer.ts`), ObjectView, `visitor-answer.ts`,
  `field-conflicts.ts`, `context-compiler.ts`.
- Orphaned corrections exist: when a source refresh removes the business
  object (`no-business-object`) or re-derives several
  (`ambiguous-target`), the correction is retained but uncomposable. The
  overlay surfaces this explicitly. This is the only honest meaning of
  "pending" in the FYD correction model.

Verdict for Source 1:

- Canonical PING event? **NO.** Zero `emit()` calls in `owner-events.ts`
  and `owner-store.ts`. These events never touch UnifiedEventRuntime or
  `ping_events`. They are FYD-local, file-persisted, content-addressed
  event logs. Healthy as logs; invisible to the spine.
- Where it lands: per-object JSON files under `data/fyd-owner/`.
- Queryable by a projection? **Inside FYD, yes** (pure readers). **From
  the PING gateway / `/system/state`, no** — no read seam exists across
  the repo boundary (separate Next.js app, separate data dir).

### Source 2: PING approval decision vocabulary (exists, unwired; mission half partially wired tonight)

- Vocabulary: `ping-runtime/approval/approval_events.js` —
  `PROPOSED_ACTION` / `ACTION_APPROVED` / `REJECTED`, emitted through the
  single `UnifiedEventRuntime.emit()` choke point. Registered in
  `gateway/generated/event_generator.js` (authority_owner 'Operator');
  governance namespaces `proposed`/`action`/`rejected` owned by PING.
- Caller count in production: **zero.** Only the module's own test and the
  generator import it. This vocabulary is UNWIRED.
- Mission approval lane (tonight, `lane/mc-mission-card-endpoints`,
  commits `ed5153950`, `b4023cca0`, `575ab4609`, `9044b66fd`):
  `MissionRuntime.approve()/reject()` emits `MISSION_APPROVED` /
  `MISSION_REJECTED` via `this._eventRuntime.emit` and records
  `approved_by/at`, `rejected_by/at`, `rejection_reason` on
  `ping_missions`. Emission is null-safe: if `eventRuntime` was never
  injected, nothing is emitted (silent no-op).
- Registry gap: `MISSION_APPROVED` / `MISSION_REJECTED` are **not** in
  `gateway/generated/event_registry.json` (239 types; only
  `MISSION_ASSIGNED/COMPLETED/CREATED/FAILED/STARTED`). The lane emits
  types the registry does not know. EventGovernance may reject or flag
  them; untested.

Verdict for Source 2:

- Canonical PING event? **YES for the mission half** (when the runtime is
  injected): real `ping_events` rows via the existing spine. **NO for the
  generic approval vocabulary** (unwired).
- Where it lands: `ping_events` + `ping_missions` columns.
- Queryable by a projection? **YES.** `SystemAuthority` already reads the
  spine via `eventReadAuthority.getEventsByType()` (see `collectMissions`).
  A `getEventsByType('MISSION_APPROVED')` / `('MISSION_REJECTED')` call is
  the same machinery, same permission, same read authority. No new store.

### Source 3: feedback-contract taxonomy (red herring, excluded)

- `ping-runtime/feedback/feedback_contract.js` lists
  `learn_owner_correction` as a crossing PURPOSE for learning gates. It is
  taxonomy for minimization/aggregation, not a tracked signal. No counter
  can be derived from it.

### Source 4: `/system/state` today

- `GET /system/state` -> `SystemAuthority.getSystemState()`
  (`ping-runtime/runtime/system_authority.js`): version, generated_at,
  containers, git, repository, knowledge, missions, replay, postgres,
  qdrant, metrics. `collectMissions()` counts `MISSION_CREATED` and
  `REFLECTION_CREATED` only (with hardcoded `queued: 0` placeholders).
- No corrections section. No approval-decision counts. This is why the
  inbox renders UNKNOWN.

## Proposed minimal counter shape

Add one `corrections` section to `SystemAuthority.getSystemState()`. Two
sub-signals with different wiring status. Everything renders typed
`available`/`unavailable` with a reason; nothing renders a bare zero.

```json
"corrections": {
  "status": "available",
  "generated_at": "2026-10-04T...",
  "pending_count": 1,
  "pending_basis": "orphaned FYD corrections (retained, uncomposable: no-business-object / ambiguous-target)",
  "last_24h": 2,
  "last_correction_at": "2026-10-04T19:58:00-06:00",
  "by_source": {
    "fyd_owner_log": {
      "status": "available",
      "objects": 3,
      "events_total": 12,
      "by_type": {
        "owner.confirmed-fact": 1,
        "owner.corrected-fact": 8,
        "owner.hid-fact": 2,
        "owner.restored-fact": 1,
        "owner.added-fact": 0,
        "owner.defaulted-fact": 0
      },
      "pending_orphaned": 1,
      "last_event_at": "2026-10-04T19:58:00-06:00",
      "source": "data/fyd-owner/*.json (FYD owner event logs, same-host file scan)"
    },
    "mission_decisions": {
      "status": "available",
      "approved_total": 1,
      "rejected_total": 0,
      "last_24h": 1,
      "last_decision_at": "2026-10-04T20:17:00-06:00",
      "source": "ping_events MISSION_APPROVED / MISSION_REJECTED"
    }
  },
  "unknowns": []
}
```

Failure semantics (typed, never bare):

- If the FYD data dir is unreadable or the path is wrong:
  `fyd_owner_log.status = "unavailable"`, `reason: "no read seam to FYD
  owner logs (data/fyd-owner not reachable from gateway)"`,
  and `unknowns: ["fyd owner corrections: source exists but is not
  readable from here"]`. Top-level `pending_count`, `last_24h`,
  `last_correction_at` become `null` with the same reason, NOT zero.
- If the spine read fails: `mission_decisions.status = "unavailable"`,
  `reason` from the caught error (same pattern as `collectMissions`).
- If FYD logs exist but are empty: `events_total: 0`,
  `last_event_at: null` — that is a real zero, distinct from UNKNOWN.

Definitions:

- `pending_count` = orphaned corrections (Source 1's only honest
  "pending"): retained but uncomposable after a source refresh.
  Derived per read; never written back (matches the overlay's
  `sourceDrifted` semantics).
- `last_24h` = events (FYD) + decisions (mission) with timestamp within
  the trailing 24h. FYD event timestamps are in the log; spine timestamps
  come from `ping_events`.
- `last_correction_at` = max timestamp across both sources, null if both
  empty/unavailable.

## What renders UNKNOWN until wired

1. The entire `fyd_owner_log` sub-signal, if no read seam is implemented.
   The logs exist and are healthy; the gateway just cannot see them.
2. The registry gap for `MISSION_APPROVED` / `MISSION_REJECTED`: until
   those types are in `event_registry.json`, counts may be rejected or
   flagged by EventGovernance. The mission_decisions half is "available
   pending registry entry."

## Explicit constraints honored

- No new canonical store: the counters are a read-time projection over
  existing logs (FYD owner event files) and existing spine rows
  (`ping_events`). `system_state` remains a cache/projection table.
- No new event bus: FYD owner events stay FYD-local files; nothing is
  re-emitted onto a second bus.
- No new authority: reads go through the existing `eventReadAuthority`
  (spine) and the filesystem (FYD logs). No approver/identity authority
  is created.

## The one missing piece

A **read seam from FYD's owner event logs to the gateway's
`SystemAuthority`**. That is the only missing piece. Existing machinery
suffices for everything else.

Two candidate seams, ranked:

1. **Same-host file scan in a new `collectCorrections()`**
   (cheapest, reversible): `SystemAuthority` globs
   `/home/nolan/projects/ping-fyd-converged/data/fyd-owner/*.json`
   (respecting `FYD_OWNER_DIR` env override), folds the append-only logs,
   computes counts/pending/24h. Same-machine, read-only, fails closed to
   typed `unavailable`. Cross-repo path coupling is the cost; the FYD
   data dir is private state of another app.
2. **Bridge emit from FYD to the spine** (more honest architecture, more
   machinery): the overrides route emits a summary event
   (`OWNER_CORRECTION_RECORDED`) through the existing gateway emit path
   at record time. Requires FYD -> gateway auth, payload contract, and
   the registry entry. Crosses the service boundary instead of the repo
   boundary. More correct long-term; needs owner approval for the new
   write path.

DEFAULT recommendation: seam (1) now, because it is read-only,
same-host, fully reversible, and sufficient for an honest inbox signal.
Seam (2) only if FYD and the gateway ever stop sharing a host.

## DECISION

- **DECISION:** Add a `corrections` section to `GET /system/state`
  (`SystemAuthority.getSystemState()`), derived from (a) a same-host
  read-only scan of FYD's owner event logs and (b) existing
  `MISSION_APPROVED` / `MISSION_REJECTED` spine rows. Wire the mission
  half first (no seam needed); the FYD half renders typed UNKNOWN until
  the file-scan seam is built.
- **DEFAULT:** Do nothing; leave the inbox's owner-corrections row at
  UNKNOWN indefinitely. (Rejects the standing principle that UNKNOWN
  must name its source and its path to resolution.)
- **WHAT CHANGES:** One new collector method `collectCorrections()` in
  `system_authority.js`; one new JSON section in `/system/state`;
  `MISSION_APPROVED` / `MISSION_REJECTED` added to
  `event_registry.json`. No schema migrations, no new tables, no new
  event types on the FYD side, no changes to the FYD app.
- **EVIDENCE:**
  - Owner logs exist and are healthy:
    `/home/nolan/projects/ping-fyd-converged/src/fyd/object/owner-events.ts`
    (802 lines), append-only, six event types, content-hash identities,
    `data/fyd-owner/<objectId>.json` persistence, zero emit calls (grep).
  - Mission decision events emit on the spine tonight:
    `ed5153950` in `/home/nolan/ping` (`MissionRuntime.approve/reject`,
    `this._eventRuntime.emit('MISSION_APPROVED'/'MISSION_REJECTED')`).
  - Spine reads already exist for this purpose:
    `collectMissions()` uses `eventReadAuthority.getEventsByType()`.
  - Registry gap verified: 239 event types, no `MISSION_APPROVED` /
    `MISSION_REJECTED`, no `owner.*` correction types.
- **RISK:** Low. Read-only collector; worst case it returns typed
  `unavailable`. Cross-repo path coupling (FYD data dir layout) is the
  main fragility; mitigated by honoring `FYD_OWNER_DIR` and failing
  closed. Registry additions are additive vocabulary, not schema.
- **REVERSIBILITY:** Fully reversible. Delete the collector and the
  section; `/system/state` returns to its current shape. No state written
  anywhere.
- **RECOMMENDATION:** Implement the mission_decisions half immediately
  (existing machinery, same commit as the registry entries). Build the
  FYD file-scan seam (1) next as a small follow-up; keep seam (2)
  deferred until FYD and the gateway diverge hosts.

## Open items for the parent

1. Approve `MISSION_APPROVED` / `MISSION_REJECTED` registry entries
   (additive vocabulary in `gateway/generated/event_generator.js` +
   governance namespace check).
2. Confirm the mission_decisions collector may count unregistered event
   types in the interim, or hold until the registry lands.
3. Approve the same-host file-scan seam (1), or direct seam (2) instead.
