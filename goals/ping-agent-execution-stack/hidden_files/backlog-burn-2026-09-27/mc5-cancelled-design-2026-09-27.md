# MC-5 design: persisted CANCELLED state + cancellation API (2026-09-27 ~12:35 MDT)

Subagent: backlog-burn (parent: main agent). DESIGN ONLY — no code changed,
no branches, no commits. Both target surfaces are sibling-owned
(TS exemplar `lane-p01/tree/` untracked; python spine on the MC sprint branch).

## Problem (from mc-frontier-recon Gap 5)

A mission dispatched in error (a Gap-1/MC-1 duplicate, a wrong-tenant
dispatch, a bad prompt) cannot be stopped through the control plane.
Operators kill processes by hand or wait out the ollama/identity deadlines.
A control plane that cannot stop work does not control it. Verified this
turn: the string `cancel` (any case) occurs ZERO times in
`~/workspace/mission-control/*.py` and zero times in
`~/workspace/lane-p01/tree/src/app/api/mc/`.

## Design

### 1. New terminal event: `MC_MISSION_CANCELLED`

- Added to BOTH vocabularies: python `emit.py` `MC_EVENT_TYPES`
  (alongside `MC_LANE_UNKNOWN`, `MC_REVOKED`, `REVOKED_AFTER_DISPATCH`)
  and the TS exemplar's event-kind list (`mc-dispatch.ts:132-139`
  `MC_RUN_*` family — the cancelled terminal is mission-scoped, so the
  kind is `MC_MISSION_CANCELLED`, distinct from the run-scoped kinds).
- Event data (required): `{ mission_id, tenant, cancelled_by, reason,
  observed_at_stage }`. `cancelled_by` is the actor/operator identity that
  requested it; `observed_at_stage` names the stage boundary where the
  executor honored it (or `"cancel-route"` if the mission was still QUEUED
  and never started).
- CANCELLED is terminal: once projected, no further lifecycle events for
  that mission id are legal except audit reads. The projector must treat a
  post-CANCELLED lifecycle event as a violation (same class as the
  existing post-terminal discipline).

### 2. Cancel API: `POST /api/mc/missions/[id]/cancel`

Request: `{ tenant, reason }` (reason required, non-empty; bounded length,
same discipline as prompt bounds). Response contracts:
- `200 { ok: true, status: 'CANCELLED' | 'CANCEL_REQUESTED', mission_id }` —
  CANCELLED if the mission was still QUEUED (never started; the route
  records the terminal immediately); CANCEL_REQUESTED if the mission is
  in-flight (the terminal lands when the executor observes the flag).
- `404` — no such mission id in the journal.
- `409 { code: 'ALREADY_TERMINAL', terminal: '<state>' }` — the mission
  already reached SUCCEEDED / FAILED / UNKNOWN / CANCELLED. No new event.
- `400 bad_tenant` — the mission's tenant does not match the request
  tenant (tenant scoping is preserved; a tenant cannot cancel another
  tenant's mission).
- Authority: cancel requires AT LEAST the authority that dispatched the
  mission. The TS exemplar currently has no caller auth on dispatch; the
  cancel route must not be weaker than whatever dispatch auth exists when
  it lands. (Python side: the actor field carries this.)

### 3. Executor stop-flag discipline (the core semantic)

Cancel is a REQUEST, not a kill. The executor checks a stop flag at every
stage boundary:
- TS exemplar boundaries: before adapter authorize, before agent
  invocation, before each `publishArtifact`, before the terminal emit.
- The flag is JOURNAL-DERIVED, not in-memory: before each boundary, the
  executor reads whether an `MC_MISSION_CANCELLED` event exists for the
  mission id. (The journal is the store — consistent with the existing
  architecture; survives process restarts, unlike an in-memory flag.)
- On observing the flag mid-flight: the executor stops, publishes no
  further artifacts, and emits nothing further — the CANCELLED terminal
  was already recorded by the cancel route (for the QUEUED case) or is
  recorded by the executor at the boundary where it stopped
  (`observed_at_stage` set accordingly).

### 4. Honest interruption (the anti-pretend rule)

If the underlying transport cannot be interrupted (broker/remote agent
with no kill path — e.g. an already-issued Hermes work order), the
executor MUST NOT fake a cancellation:
- It records/keeps the mission at UNKNOWN with
  `{ cancel_requested: true, cancel_reason }`, exactly the existing
  deadline-expiry semantics (`mc-dispatch.ts:37`: deadline expiry ->
  MC_RUN_UNKNOWN).
- The operator-visible state is then "UNKNOWN — cancel requested,
  interruption not confirmed," never "CANCELLED."
- This is the same honesty rule as the staged FYD panel's
  "OUTCOME UNKNOWN — RECONCILIATION IN PROGRESS": a claimed terminal the
  system cannot prove is a lie.

### 5. Interactions (decided here, not left ambiguous)

- **Idempotency (MC-1):** a cancelled mission's idempotency key still maps
  to the original record. Same key + same bytes after cancel -> return the
  original dispatch record with `status: 'CANCELLED'` and
  `duplicate: true`. No re-execution, no new work order. Rationale: the
  E2 contract is "don't do the work twice"; a deliberate NEW dispatch
  uses a NEW key (operator intent is explicit).
- **Revocation (H7):** cancel does NOT revoke the key. Revocation is
  key-level and sticky (pre-dispatch refusal); cancel is mission-level
  (post-dispatch stop). Orthogonal by design.
- **UNKNOWN no-retry rule:** cancelled missions NEVER auto-retry. The
  lease reaper (MC-6) must skip CANCELLED missions exactly as it must skip
  HOLD-recorded ones — same bug class, recorded here so the MC-6 decision
  covers both.
- **Re-dispatch after cancel:** allowed only with a fresh idempotency key
  (or the key-less path, once MC-1 lands). The new mission is unrelated;
  the journal shows the lineage only through operator-supplied reason text.

### 6. What the TS exemplar changes (for the Lane D owner)

1. `mc-dispatch.ts`: add `MC_MISSION_CANCELLED` to the mission-scoped
   kinds; projector treats it as terminal; add `isCancelled(missionId)`
   journal reader.
2. `missions/[id]/route.ts`: add the POST cancel handler per section 2.
3. `dispatch/route.ts`: insert `isCancelled` checks at the stage
   boundaries per section 3; honor section 4 when the adapter reports
   uninterruptible.
4. Python side (`mission_intent.py` + `emit.py`): register the event type;
   the front-door `submit()` maps a cancelled key per section 5.

### Falsification test (re-runnable)

1. Dispatch via dry-run adapter -> `POST cancel` before terminal ->
   executor's next boundary observes -> projection reads CANCELLED;
   journal has exactly one `MC_MISSION_CANCELLED` with `observed_at_stage`
   set. (Today: 404, no such route.)
2. Cancel after SUCCEEDED -> 409 ALREADY_TERMINAL, zero new events.
3. Cancel unknown id -> 404.
4. Cancel with mismatched tenant -> 400 bad_tenant.
5. Stub executor that reports uninterruptible -> mission lands UNKNOWN
   with `cancel_requested: true`; the API never claims CANCELLED.
6. Same idempotency key re-POST after cancel -> 200 with the ORIGINAL
   mission id, `duplicate: true`, `status: 'CANCELLED'`; no second
   MC_MISSION_CREATED.

## Open (not decided here)

- Whether the python spine needs a symmetric cancel entry point or the TS
  route is the only writer (ownership: MC sprint).
- Rate/abuse bounds on the cancel route (same as dispatch, TBD by owner).
- UI placement in the FYD panel (sibling's SEAM-PROPOSAL territory).

## Status

DESIGN COMPLETE, doc-level. Implementation queued for the surface owners
(Lane D for the TS exemplar; MC sprint for the python spine). No code
touched by this worker.
