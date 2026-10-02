# Arch-D: Git History / Duplicates / Bypasses — Inventory

Worker D, read-only. 2026-09-27. Covers the HISTORY/DUPLICATE surface: every
existing mission-dispatch implementation found in git history, dormant
branches, worktrees, and the working tree, so no writer builds system #2.

Scope note: all paths below are in the workspace repo (`~/workspace/.git`).
The HPP original was not touched. Nothing was written, committed, or pushed.

## 1. Definitive existing-implementation map (do NOT duplicate)

Live on HEAD (`burn/outreach-caps-2026-09-27` @ 98f0915). A writer must treat
these as the canonical implementations.

### 1a. The one live dispatch front door: Python MissionIntent
`mission-control/mission_intent.py` — `submit()` is the narrow dispatch
contract: validate -> authorize -> dispatch -> observe. Evidence:
f7262f7 (2026-09-27, "MissionIntent front door: narrow dispatch contract") ->
537d264 (D1 idempotency-collision repair) -> ddd60eb (frontdoor-hardening:
honest executor outcomes H2a/H5b + revocation H7) -> 38c7ad0
(tenant-hardening) -> 470745b (sprint integration, merged into HEAD).
CLASSIFY: KEEP (the canonical front door).

### 1b. Idempotency/refusal on the adapter dispatch path: reconcile gate
`orca-adapter/adapter.js` (1106 lines on HEAD), RECONCILE GATE block at
lines 135-175, implementation lines 411-560. Added by 25e33e9
("lane-c S5: reconcile gate on the dispatch path (P4 RETRY-AFTER-UNKNOWN
closure)", 2026-09-26), merged into HEAD via mc/lane-c-reconcile-gate.
Refuses duplicate attempts (same key + same attempt) and refuses new
attempts when the prior attempt is UNCERTAIN, unless the caller supplies a
validated reconciliation record. Evidence: `git show HEAD:orca-adapter/adapter.js`
contains the gate; `git merge-base --is-ancestor mc/lane-c-reconcile-gate HEAD`
is true. CLASSIFY: KEEP (attempt-level guard; different scope from 1a).

### 1c. Canonical event emission
`mission-control/emit.py` — the MC_* vocabulary and the emit path every lane
rides. Extended additively by the front door (MC_LANE_*, MC_HOLD_RAISED,
MC_CHECKPOINT, MC_REVOKED). CLASSIFY: KEEP.

### 1d. Legacy-caller adapters + bypass detector
`mission-control/frontdoor_adapters.py` — wraps legacy callers as
MissionIntent submitters; `MIGRATED_CLASSES` registry plus
`detect_bypass()` (journal scan for execution events with no covering
intent record). One migrated class: `spine-observe-dry-run`.
CLASSIFY: KEEP (this is the sanctioned migration path, not a bypass).

### 1e. Journal projection for missions/passes
`mission-control/pass_queries.py` (on HEAD via mc/lane-c-reconcile-gate).
CLASSIFY: KEEP.

### 1f. Payload lifecycle / retention
`mission-control/payload_lifecycle.py`, `mission-control/RETENTION-POLICY.md`.
CLASSIFY: KEEP.

### 1g. Thin adapter transport shim
`mission-control/_adapter_shim.js` — Node transport to the existing
ExternalAgentAdapter; the front door calls authorize/issue through it.
CLASSIFY: KEEP (transport only, owns no decisions).

## 2. The Python front-door dedup mechanism, exactly

File: `mission-control/mission_intent.py`. The journal is the idempotency
ledger; a caller-supplied `idempotency_key` is the lookup key.

- Line 108: `_RE_IDEMPOTENCY_KEY = re.compile(r"^[A-Za-z0-9_.:-]{1,128}$")`
  — key format validated in `validate()` (lines 345-355).
- Line 281: `canonical_intent_hash(intent)` — sha256 over canonical JSON of
  `{intent_version, mission_class, actor, tenant, capability, event_bind,
  inputs_hash}`. Two intents hash equal exactly when their canonical bytes
  are identical.
- Line 312: `_intent_collision(record, intent)` — returns True when a reused
  key carries different canonical intent bytes (E2: same id + different
  bytes must never silently dedupe). Legacy pre-digest records are compared
  field-wise over `_LEGACY_COLLISION_FIELDS`.
- Line 761: `find_intent_record(journal_file, idempotency_key, tenant=None)`
  — scans the journal for the acceptance record + any terminal event for
  the key. Tenant-scoped.
- Line 1044: `submit()` — the contract. Dedup flow in order:
  1. Lines 1079-1082: revocation check BEFORE authorize (H7). Revoked key
     refuses with zero dispatch.
  2. Lines 1084-1085: `find_intent_record()` lookup.
  3. Lines 1086-1092: on key reuse with different canonical bytes, raise
     `IntentDispatchError` (fail closed, E2 collision safety).
  4. Lines 1093-1110: prior acceptance with NO terminal event means the
     original is in-flight/UNKNOWN: emit `MC_HOLD_RAISED`, raise
     `IntentDispatchError`, never re-dispatch (O6).
  5. Lines 1111-1132: prior acceptance WITH a terminal event: emit one
     `MC_CHECKPOINT` ("frontdoor duplicate-suppressed: returning original
     dispatch record") and return `{"outcome": "duplicate-suppressed",
     "duplicate": True, ...}` with the original work_order_id, terminal
     type, and terminal_success flag. Zero re-dispatch, zero new work order.
- Line 883: `revoke(idempotency_key, reason, ...)` — sticky revocation;
  `submit()` re-checks revocation after authorize (line 1166) before any
  dispatch.

Net: same key + same intent bytes -> original record returned, one
checkpoint event, no second work order. Same key + different bytes ->
fail-closed error. Key with in-flight original -> HOLD, no blind retry.

## 3. Dormant branches with mission-runtime/dispatcher implementations

All confirmed NOT merged into HEAD via `git merge-base --is-ancestor`
unless noted.

### 3a. mc/approval-request @ cacf7b2 (2026-09-27) — DORMANT, HARVEST
"mc/approval-request: canonical ApprovalRequest primitive."
`mission-control/approval_request.py`: `request_approval`,
`authorize_approval_transition`, `deny_approval`, `evaluate_expiry`,
`list_waiting_approvals`; `ApprovalStore`; proposal digest binding
(`proposal_digest()`, `_mint_id()`); exact-digest approval semantics.
Plus `mission-control/adapters/chat_approval.py` and
`mission-control/adapters/mc_approval.py`: two surfaces, ONE function
object (`TRANSITION = authorize_approval_transition`), explicitly not
duplicates by design. Evidence: branch tip cacf7b2; dormant per
merge-base check. CLASSIFY: HARVEST (P0 needs WAITING_APPROVAL with
exact-digest binding; this is the certified primitive. Do not rewrite it.)

### 3b. mc/mission-budgets @ f336c80 (2026-09-27) — DORMANT, HARVEST
`orca-mc-convergence/mission-budgets/budget.js`: budget as CAPABILITY
CONSTRAINT (tokens, money_cents, wallclock_ms, toolcalls, loops);
deterministic check-and-debit, no Date.now() in core; exhaustion ->
MC_BUDGET_EXHAUSTED + HOLD. Header documents the C9 duplicate problem:
"there is no single canonical mission model yet (nine mission_runtime.js
copies, C9)". Evidence: branch tip f336c80; not on HEAD (HEAD has only
orca-mc-convergence docs). CLASSIFY: HARVEST (P0.9 capability-before-tool
needs the budget primitive).

### 3c. mc/consequence-policy-input @ db78888 (2026-09-27) — DORMANT, HARVEST
`orca-adapter/consequence/consequence.js`: 8-dimension consequence
classification as POLICY INPUT (reversibility, external_effect, money,
publication, credential_access, destructive_scope, commitment) +
policyGate. Evidence: branch tip db78888; `orca-adapter/consequence/` not
on HEAD. CLASSIFY: HARVEST (P0.9).

### 3d. mc/fyd-shapeA-site-console @ 7a7a892 (2026-09-27) — DORMANT, BROKEN
"shapeA: tenant-scoped MC dispatch console (sites/[slug]/mission-control +
api/sites/[slug]/mc)". Contains TWO TypeScript dispatch paths, both live
only on this branch:
- `lane-p01/tree/src/app/api/mc/dispatch/route.ts` +
  `lane-p01/tree/src/app/api/mc/_lib/mc-dispatch.ts` (Lane D route)
- `lane-p01/tree/src/app/api/sites/[slug]/mc/dispatch/route.ts` +
  `lane-p01/tree/src/app/api/sites/[slug]/mc/_lib/site-dispatch.ts`
  (tenant-scoped route; has a selftest file)
Both mint `missionId = 'mc-m-' + sha256(['mission', agent, tenant,
capability, promptDigest, ts].join('|')).slice(0, 12)` with
`ts = nowIso()` in the hash (route.ts line 254-256; site-dispatch.ts
line 652-654) and perform NO idempotency lookup before dispatch. Every
POST mints a fresh mission id, so a retry of the same intent double
dispatches. The tests assert the id format and event shape but contain no
double-submit-same-key test. Evidence: `git ls-tree -r HEAD --name-only`
shows no `api/mc` paths; merge-base says dormant. CLASSIFY: BROKEN
(dispatch path; must not be wired as-is). The dispatch-console UI page
(`app/sites/[slug]/mission-control/`) is separately HARVEST-able as a UI
reference only, never the dispatch path.

### 3e. mc/pass-migration-proof @ 28c92f4 (2026-09-27) — DORMANT, HARVEST/DELETE-LATER
"pass migration proof: one X pass as mission, 9-condition proof cycle."
`mission-control/mission_proof.py` (661 lines), `mission_proof_worker.py`,
`run_pass_migration_proof.py`, plus `STUBS.md`: the honest-stub inventory
(FrontDoorLaneStub, ApprovalLaneStub, BudgetLaneStub, ConsequenceLaneStub
— all labeled PROOF-ONLY, with `_try_import` hooks preferring real lanes).
The stub classes were superseded by the real lanes at d7b10a8 but remain
as import fallbacks. Evidence: branch tip 28c92f4; dormant.
CLASSIFY: HARVEST the 12-condition proof design and the no-bypass rule;
the stub classes themselves are DELETE-LATER (superseded, proof-only).

### 3f. mc/pass-migration-supersession @ d7b10a8 (2026-09-27) — DORMANT, DEAD
"P3 supersession: wire STUBS.md _try_import hooks to real sibling lanes."
Its content (stub wiring to the real lanes) was consumed by the certified
lanes; nothing unique remains. CLASSIFY: DEAD.

### 3g. mc/tenant-hostile-tests @ a65846d (2026-09-27) — DORMANT, HARVEST
25 hostile tenant-isolation tests against the front door.
CLASSIFY: HARVEST (test corpus; do not rewrite).

### 3h. Already merged into HEAD — DEAD as branches
- mc/mission-intent-frontdoor @ 537d264, mc/frontdoor-hardening @ ddd60eb,
  mc/tenant-hardening @ 38c7ad0: merged via mc/sprint-integration-2026-09-27
  @ 470745b (a8cf9cc merged the frontdoor branch explicitly).
- mc/lane-c-reconcile-gate: merged into HEAD (merge-base true).
- mc/audit-payload-lifecycle @ ba653ac: payload_lifecycle.py is on HEAD.
CLASSIFY: DEAD (branches), content KEEP on HEAD.

### 3i. Related dormant lanes (no dispatchers, for completeness)
- spine/x-pass-reached-path @ df91b4e: X-pass reached-path observation ->
  event -> query -> projection; added `outreach/spine_observe.py`,
  `outreach/retry_policy.py`, and a SECOND pass-health projection at
  `orca-mc-convergence/apps/mission-control/pass-health/projection.py`.
  DORMANT. The projection.py is a DUPLICATE of `pass_queries.py` scope.
- feat/orca-unknown-outcome-port, fix/broker-failclosed-containment,
  jev/shadow-recorder, lane-c/orca-adapter-2026-09-26,
  lane-f-probe-staleness-fix, orca-engagement-pipeline-endgame,
  stream-b/*, substrate/*, track-a/*, trackc/tenant-prep-2026-09-27:
  no mission-dispatch implementations; adapter/audit/substrate work.
- stash@{0} (WIP on fyd/builder-rebuild-v1): FYD family components only,
  no dispatch code.
- 40+ worktrees exist (`.worktrees/`, `/home/nolan/worktrees/mc-*`,
  `/tmp/*falsif*`); the `/home/nolan/worktrees/mc-*` set are checkouts of
  the dormant mc/* branches above, mostly marked prunable.

## 4. Deleted implementations in history

`git log --all --diff-filter=D` over mission/dispatch/execution/
capability/event/idempotency/work-order paths: NO deleted
implementations. Nothing valuable was lost by deletion in the MC surface.
The large f980649 deletion (22,717 lines, 2026-09-27) was FYD product-code
consolidation and media assets, not MC code. The FrontDoorLaneStub was
SUPERSEDED (d7b10a8), not deleted; it survives as the import-fallback in
`mission_proof.py` on the dormant mc/pass-migration-proof branch.
The only genuine removals are scratch: see section 5 item 4.

## 5. Duplicate live implementations of the same capability

1. THREE dispatch front doors (DUPLICATE; only one live):
   (a) Python `mission-control/mission_intent.py::submit()` — HEAD, dedups
       correctly (section 2).
   (b) TS Lane D `api/mc/dispatch/route.ts` — dormant branch only, no dedup.
   (c) TS site-scoped `api/sites/[slug]/mc/dispatch/route.ts` — dormant
       branch only, no dedup.
   Rule for writers: (a) is the front door. (b) and (c) must never be
   wired without first removing `ts` from the mission-id hash and adding
   the idempotency-key lookup.

2. TWO idempotency mechanisms live on HEAD (DUPLICATE, different scopes):
   (a) front-door journal ledger (`mission_intent.py`, intent scope).
   (b) adapter reconcile gate index (`orca-adapter/adapter.js`,
       `idempotency-index.jsonl` per evidenceDir, attempt scope; key =
       sha256 over canonical {missionId, runId, executionId, input_hash,
       tenant, capability}, attempt number deliberately excluded).
   CLASSIFY: WIRE (keep both; boundary is intent-vs-attempt. A writer
   adding a third dedup store instead of using one of these is a
   violation.)

3. THREE event writers, one live (DUPLICATE):
   `mission-control/emit.py` (HEAD, canonical) vs `appendDispatchEvent`
   (TS lane-D, dormant) vs `appendSiteEvent` (TS site, dormant;
   event-level `journalHasAt` duplicate-skip by event_id, not intent
   dedup). CLASSIFY: emit.py KEEP; TS writers DELETE-LATER with their
   branches.

4. NINE+ mission_runtime.js copies (DUPLICATE, all DEAD scratch):
   untracked copies in `ping-overnight/drift-sources/` (×3),
   `convergence-zoom-2026-09-19/lane-d-execution/` (×2),
   `ce002/src/`, `tenanos-wave/` (×4), `constitutional-sprint/`,
   `orca-finish/program/` (×3), `f01-fix/`, `pig-transfer-tmp/`.
   CLASSIFY: DEAD (untracked archaeology; the budget.js C9 note confirms
   no canonical mission model exists among them).

5. TWO pass-health projections (DUPLICATE):
   `mission-control/pass_queries.py` (HEAD) vs
   `orca-mc-convergence/apps/mission-control/pass-health/projection.py`
   (dormant spine/x-pass-reached-path). CLASSIFY: pass_queries.py KEEP;
   the other DELETE-LATER.

6. lane-f harness stubs (DUPLICATE runtime, proof-only):
   `StubMissionRuntime`, `StubEventRuntime`, `StubDLQ` in
   `sprint-2026-09-24/orca/lane-f-harness/lib/stubs.js` (b7bfbcd,
   branch lane-f/harness-2026-09-26, dormant). Explicitly proof stubs.
   CLASSIFY: DEAD for production use.

7. NOT a duplicate (recorded to prevent a false merge):
   `chat_approval.py` vs `mc_approval.py` (dormant mc/approval-request)
   both expose the SAME function object
   (`TRANSITION = authorize_approval_transition`). One transition, two
   authenticated surfaces. Do not "consolidate" them into one file; the
   separation is the auth boundary.

## 6. MC-1 bug lineage: nowIso() in the mission-id hash

- BEFORE (2026-09-17 era): the ping-runtime orchestration
  `mission_runtime.js` was idempotent BY CONSTRUCTION. Evidence:
  `ce002/src/mission_runtime.js` lines 62-82 (untracked working-tree
  copy; same text in
  `ping-overnight/drift-sources/mission_runtime.js.live-20260917`):
  `mission_id = sha256(missionType:event_id or canonical payload)`,
  "Same event always produces the same mission — idempotent by
  construction", enforced by `ON CONFLICT (mission_id) DO NOTHING`.
  An idempotency key existed and was DB-enforced.
- THE BREAK (2026-09-26): Lane D rewrote dispatch as a TypeScript route.
  Evidence: `mission-control/LANE-D-DISPATCH.md` (on HEAD): "Date:
  2026-09-26 ... Repo /home/nolan/projects/ping ... src/app/api/mc/
  dispatch/route.ts (new)". The route mints
  `missionId = 'mc-m-' + sha256(['mission', agent, tenant, capability,
  promptDigest, ts].join('|'))` with `ts = nowIso()` (route.ts lines
  254-256; site-dispatch.ts lines 652-654 on dormant
  mc/fyd-shapeA-site-console; the file entered this repo as an untracked
  copy at b133d5a, 2026-09-27). The timestamp in the hash makes every
  dispatch mint a FRESH mission id: a retry of the same logical intent
  can never match a prior record, so no downstream dedup can fire.
- ORIGINAL AUTHOR INTENT: uniqueness per dispatch, not idempotency. The
  comment reads "// ---- Identity set (deterministic ids) ----"
  ("deterministic" = deterministically formatted, not deterministic
  values), and LANE-D-DISPATCH.md's "Concurrency proof" section proves
  the goal: two parallel POSTs must mint DISTINCT mission/run/execution/
  work-order ids. The author (Pigi, 2026-09-26) optimized for
  collision-avoidance under concurrency and never considered the retry
  case. No idempotency key ever existed on the TS path.
- AFTER (2026-09-26/27): idempotency was rebuilt twice, both live on HEAD:
  the adapter reconcile gate (25e33e9, key over intent fields) and the
  Python front door (f7262f7/537d264, caller key + journal ledger).
  Caveat: the adapter gate keys on missionId, so a caller using the TS
  route's fresh-per-retry mission ids still defeats it; only the Python
  front door's caller-supplied key is retry-stable end to end.

## 7. Highest-leverage broken boundary on this surface

The timestamp inside the mission-id hash on the TypeScript dispatch
paths (dormant mc/fyd-shapeA-site-console: `lane-p01/tree/src/app/api/
mc/dispatch/route.ts:256` and `lane-p01/tree/src/app/api/sites/[slug]/
mc/_lib/site-dispatch.ts:654`). One defect defeats two dedup layers:
the route has no idempotency lookup at all, and the live adapter
reconcile gate below it keys on missionId, so fresh-per-retry ids make
the gate's key fresh too. If the P0 mission is ever dispatched through a
TS route (the shapeA console is the natural owner-surface candidate),
a retried "Analyze my website and make emergency services more
prominent" dispatches twice with two mission ids and no layer can
correlate them. Fix order: (1) never wire the TS dispatch path without
removing `ts` from the hash and adding the key lookup; (2) until then,
the Python `mission_intent.py::submit()` is the only dispatch front
door; (3) HARVEST the dormant approval/budget/consequence primitives
(3a-3c) rather than re-implementing them, because the P0 chain
(WAITING_APPROVAL with exact-digest binding, capability evaluation)
needs exactly those certified shapes.

## 8. Classification summary

| Finding | Class | Evidence |
|---|---|---|
| mission_intent.py front door (HEAD) | KEEP | f7262f7 2026-09-27 -> 470745b, on HEAD |
| orca-adapter reconcile gate (HEAD) | KEEP | 25e33e9 2026-09-26, adapter.js:135-175 |
| emit.py MC vocabulary (HEAD) | KEEP | on HEAD, additive MC_* extensions |
| frontdoor_adapters.py + bypass detector | KEEP | on HEAD, sanctioned migration path |
| pass_queries.py (HEAD) | KEEP | on HEAD via lane-c-reconcile-gate merge |
| payload_lifecycle.py (HEAD) | KEEP | on HEAD |
| _adapter_shim.js (HEAD) | KEEP | transport only |
| mc/approval-request @ cacf7b2 | HARVEST | dormant; canonical ApprovalRequest + exact-digest binding |
| mc/mission-budgets @ f336c80 | HARVEST | dormant; budget.js capability-constraint primitive |
| mc/consequence-policy-input @ db78888 | HARVEST | dormant; consequence.js policy-input classifier |
| mc/tenant-hostile-tests @ a65846d | HARVEST | dormant; 25 hostile tenant-isolation tests |
| shapeA console UI pages | HARVEST | dormant 7a7a892; UI only, never the dispatch path |
| TS dispatch routes (lane-D + site) | BROKEN | dormant 7a7a892; route.ts:256, site-dispatch.ts:654 |
| pass-migration stub classes | DELETE-LATER | dormant 28c92f4; superseded by d7b10a8 |
| spine/x-pass projection.py | DELETE-LATER | dormant df91b4e; duplicates pass_queries.py |
| TS event writers (append*) | DELETE-LATER | dormant with their branches |
| mission_runtime.js x9+ copies | DEAD | untracked scratch; C9 note in budget.js |
| lane-f harness stubs | DEAD | dormant b7bfbcd; proof-only |
| merged mc/* branches (frontdoor x3, lane-c gate, audit-payload) | DEAD | content on HEAD, branches prunable |
| mc/pass-migration-supersession | DEAD | dormant d7b10a8; content consumed |
| Deleted MC implementations | NONE | --diff-filter=D clean on MC paths |
