# W1: TS dispatch idempotency fix — writer summary

Branch: `p0/front-door-idempotency`
Commits: `c28e6d4` (baseline: lane-p01 tree extract + vendored shim), `f6a9302` (the fix)
No push, no merge, no deploy. Main/master untouched.

## Problem (confirmed from archaeology)
`src/app/api/mc/dispatch/route.ts` minted
`missionId = sha256('mission|agent|tenant|capability|promptDigest|nowIso')`.
The timestamp guaranteed a fresh mission on every retry/double-click/
concurrent identical POST, defeating the adapter reconcile gate (which keys
on missionId). Harvested the fix pattern from the Python front door
(`~/workspace/mission-control/mission_intent.py::submit()`, lines 1044-1132:
lookup-before-dispatch, in-flight -> hold, terminal -> duplicate-suppressed).

## What changed (file:line, post-fix)

`lane-p01/tree/src/app/api/mc/_lib/mc-dispatch.ts`
- L149-150: `IDEMPOTENCY_KEY_RE = /^[A-Za-z0-9._-]{1,128}$/`,
  `IDEMPOTENCY_KEY_DEFAULT = 'default'`.
- L159-163: `MISSION_TERMINAL_STATUSES = {SUCCEEDED, FAILED, DENIED}`.
  UNKNOWN is deliberately NOT terminal here: it means reconciliation is in
  progress, so a duplicate must HOLD, never re-dispatch blindly.
- L412-420: `findPriorMission(missionId)` — read-only lookup of aggregate
  `mc:mission:<missionId>` via the existing `loadJournalEvents` /
  `projectMissions`. Never appends, never mints.

`lane-p01/tree/src/app/api/mc/dispatch/route.ts`
- L62: `DispatchBody` gains optional `idempotency_key`.
- L248-255: fail-closed key validation with the other input checks, before
  any side effect. Absent/null -> deterministic `'default'` (byte-identical
  retries collide). Supplied-but-malformed (empty, >128 chars, outside
  `[A-Za-z0-9._-]`, non-string) -> 400 `bad_idempotency_key`, never defaulted.
- L262: `missionId = 'mc-m-' + sha256('mission|agent|tenant|capability|
  promptDigest|idempotencyKey').slice(0,12)`. No clock in the hash; the
  `mc-m-` + 12-hex format is preserved for the projector and tooling.
- L282-306: lookup-before-mint, placed BEFORE any adapter call (a duplicate
  never touches the adapter, emits nothing, publishes nothing):
  - terminal duplicate -> original projected record with
    `duplicate_suppressed: true`, ZERO new events/artifacts/adapter calls.
    DENIED duplicates mirror the original 403 (`ok: false`); SUCCEEDED/
    FAILED mirror 200.
  - in-flight duplicate (CREATED/QUEUED/RUNNING/UNKNOWN, no terminal) ->
    409, `status: 'HOLD'`, `reconciliation_state` from the projection.
    Never re-dispatched.
- Non-duplicate path is byte-for-byte the old logic, just reordered:
  fail-closed validation order, adapter authorize/issue/verify, artifact
  publishing, UNKNOWN first-class, the +1ms timestamp tie-break in
  `appendDispatchEvent`.

## Acceptance results (all against the ACTUAL compiled route.ts, 52/52 PASS)

Harness: `/tmp/idem-harness` — copies of the two touched files with ONLY
environment constants rewritten (journal/artifacts paths -> /tmp, adapter
shim -> a contract-faithful stub, ollama -> a local stub server, ollama
deadline 180s -> 3s). Driver: `/tmp/idem-harness/driver.js` and
`driver2.js`. Stub adapter/shim and stub ollama live only in the harness.

- tsc --noEmit: PASS. 297 errors before the change, 297 after — all
  pre-existing `Cannot find module 'next'`-class env errors from the
  extract's incomplete node_modules; ZERO errors in the touched files.
- SUCCEEDED path: PASS. Fresh POST -> 200 SUCCEEDED, 9 journal events incl.
  one MC_RUN_SUCCEEDED, 4 artifacts (prompt/context/work-order/result),
  projection SUCCEEDED, 4 adapter calls.
- Terminal duplicate: PASS. Identical POST -> `duplicate_suppressed: true`,
  same mission id, original record returned; journal lines, adapter calls,
  and artifact dir all unchanged (zero new side effects).
- Default key: PASS. Two identical POSTs with no key -> second is
  duplicate-suppressed (stable `'default'`).
- Key participation: PASS. Same body, different key -> distinct mission.
- In-flight HOLD: PASS. Synthetic CREATED-only mission -> duplicate POST
  returns 409 HOLD with the no-terminal reason; zero new journal lines,
  zero adapter calls.
- UNKNOWN probe: PASS. Synthetic MC_MISSION_CREATED + MC_RUN_UNKNOWN ->
  projects UNKNOWN, duplicate POST returns 409 HOLD with
  `reconciliation_state: "RECONCILIATION IN PROGRESS"`, zero new events,
  never collapsed to FAILED.
- Live timeout -> UNKNOWN: PASS. Stub ollama delayed past the 3s deadline ->
  MC_RUN_UNKNOWN emitted once, status UNKNOWN, reconciliation state set,
  never FAILED.
- DENIED duplicate: PASS. Deny-mode adapter -> first POST 403 DENIED with
  events; duplicate POST -> 403 + `duplicate_suppressed: true`, zero new
  events/adapter calls.
- Validation regressions: PASS. bad_prompt (empty and >2000), agent_denied
  (identity_5), bad_tenant, bad_capability (missing and not-allowlisted),
  bad_idempotency_key (empty, 129 chars, illegal chars, non-string), and
  null key treated as default. All fail-closed before any side effect.
- missionId determinism: PASS. `mc-m-[0-9a-f]{12}` format; two derivations
  of identical inputs are byte-identical (no clock); different key ->
  different id.

## What I did NOT change and why
- No new store, no new event type, no new authority: the journal stays the
  state; `findPriorMission` reuses `loadJournalEvents`/`projectMissions`.
- The non-duplicate dispatch path is untouched in behavior (only moved below
  the lookup so duplicates never reach the adapter).
- Did NOT add Python-style E2 key-reuse collision detection: in this
  design the missionId binds ALL canonical fields (agent/tenant/capability/
  promptDigest/key), so a reused key with different bytes derives a
  different id and cannot suppress another mission's work order. Flagging
  for the falsifier to confirm this reasoning holds.
- Did NOT reconstruct the missing `lane-d/adapter-call.js` on the Pig —
  inventing the dependency would be worse than documenting its absence.
- Did NOT test concurrent idempotency (per brief; the falsifier owns it).
- Did NOT deploy to the Pig, touch :3100/:3200, touch the HPP original,
  push, or merge. The :3100 SUCCEEDED-path live re-run was therefore NOT
  possible; the harness SUCCEEDED path above is the substitute, with the
  adapter and ollama stubbed. The falsifier should note this boundary.

## Step 1 notes (vendoring)
- Pig transport verified: `PIG_OK` via `pigwsl-exec.sh` (exit 0).
- The brief's target, `/home/nolan/workspace/mission-control/lane-d/adapter-call.js`,
  does NOT exist on the Pig (verified 2026-09-27 ~13:10 MDT: `lane-d/`
  holds only `LANE-C-NOTE-DECISION.md`; `find` across workspace and
  orca-autonomy worktrees returned nothing; the :3100 served repo
  `/home/nolan/projects/ping` has no copy either, yet its `mc-dispatch.ts`
  still points `ADAPTER_SHIM` at the missing path — a live discrepancy:
  the served dispatch route would 503 on any POST today).
- Vendored instead: the Pig's `_adapter_shim.js` (byte-identical, md5
  `a02ae803f2ea880af9384dcd458489d9`) at `lane-p01/vendor/_adapter_shim.js`
  plus `lane-p01/vendor/PROVENANCE.md` documenting the gap and warning not
  to deploy until the adapter transport is restored. It is NOT a drop-in
  substitute (different CLI convention).
- Baseline commit `c28e6d4` includes the full tree extract MINUS
  `node_modules` (172M, reproducible via package.json) and `tree.tar.gz`
  (redundant with `tree/`); both remain untracked in the working dir.
- The local extract is slightly NEWER than the served :3100 tree
  (`publishArtifact` takes a `tenant` param the served tree lacks); the
  served tree was not touched.
