# TRACK A — STUCK-MISSION PROOF (proving slice, 2026-10-01)

Greenlight: Nolan, 2026-10-01 ~11:14 MDT. Scope: ONE stuck mission end to end.
The six-item phase-2 package was NOT built. No new authority, scheduler,
registry, or orchestrator was created. No runtime code was modified.

## 1. Selected mission (real, not synthetic)

- **mission_id:** `67d994a00e844226`
- **mission_type:** PROJECTION_CREATE
- **tenant_id:** ping
- **created_by:** integrate-run-driver
- **created:** 2026-09-30 15:02:56 UTC
- **Objective (recoverable from payload):** FYD_GENERATION_REQUESTED for
  site_id `coppersmith-plumbing`, run_id `integrate-coppersmith-20260930`,
  event_id `integrate-coppersmith-20260930-take2`. Capability grant:
  `media.placement:placeAsset`, principal `integrate-run-20260930`,
  expiry `2026-09-30T16:02:56.205Z`.
- **Creating event:** MISSION_CREATED `7fd58eaf19d1680e331dd9b0e70bdac73903dc15a98d1a447200e5d3d5231cda`
  (deterministic mission ID from tenant:type:event).
- **Scheduler state:** NO MissionScheduler is running anywhere (verified:
  no WSL process, no cron entry, ping-gateway container does not wire
  MissionScheduler into server.js). The mission was dispatched through the
  driver's own dispatch path.
- **Worker selection:** `projection` (MISSION_ASSIGNED event
  `6e36b83b5417cf176cb47b661c8e1e4d804488334c90ef72f3c82f091c60a58f`).
- **Capability requirements:** grant was VALID at dispatch
  (dispatched 15:02:56, grant expiry 16:02:56Z).
- **Execution history:** MISSION_CREATED → MISSION_ASSIGNED(projection) →
  MISSION_STARTED (claimed 15:02:56.365Z, lease_until 15:03:56.365Z) →
  MISSION_RECONCILE_HOLD (15:02:56.856Z). All within one second.
- **Evidence:** MISSION_RECONCILE_HOLD event
  `29ecefa690462ea465015a2a26d8986f2a0bccf02b13de24d89192563c476fa2`:
  failure_id `fl-4fd6353869d6`, classification UNKNOWN_EXECUTION,
  outcome `unknown_hold`, payload_digest
  `56259137cf7470770b20152931c9fc68740df64d46a3bcd95ec7fe27a45afacd`,
  self_heal "none: held for reconciliation; no automatic retry
  (retry safety unproven for unknown effects)".
- **Failure/stuck reason (machine-grounded):** worker `projection` threw
  after possible effect
  (effectState=UNKNOWN_AFTER_POSSIBLE_EFFECT):
  "asset coppersmith-hero-001 is not a published public asset - effect may
  have occurred, reconciling". Outcome genuinely UNKNOWN. The mission was
  correctly placed in HOLD — no blind retry. It then sat in HOLD for ~20h
  because the hold was never resolved.

Database: `ping-postgres` / `integrate_run` (the live runtime DB
`brain-postgres`/`ping_runtime` has zero non-terminal missions: 642
completed, 34 failed; the `integrate_run` DB held the only 5 non-terminal
missions in the estate, all PROJECTION_CREATE in HOLD).

## 2. Trace and the exact first broken edge

```
MISSION              ✓ exists (row + MISSION_CREATED, deterministic ID)
  ↓
SCHEDULER            ✓ dispatch occurred (driver path; assigned+started)
  ↓
WORKER SELECTION     ✓ 'projection' (MISSION_ASSIGNED)
  ↓
EXECUTION AUTHORITY  ✓ grant valid at dispatch
  ↓
EXECUTION ADAPTER    ✓ worker ran; threw UNKNOWN_AFTER_POSSIBLE_EFFECT
  ↓
RESULT               ✓ unknown outcome correctly classified, routed to HOLD
                       (no blind retry — the safety property WORKED)
  ↓
EVIDENCE             ✓ MISSION_RECONCILE_HOLD with full evidence digest
  ↓
MISSION STATE        ✗ BROKEN — FIRST BROKEN EDGE
```

**First broken edge: HOLD → RESOLUTION.** The mission entered HOLD at
2026-09-30 15:02:56Z and nothing ever exited it. `resolveHold` is the ONLY
way a mission leaves HOLD (per HOLD_OPERATOR_RUNBOOK.md and the
mission_runtime.js guards). The two designed exits were both unexercised:
(a) the scheduler's held-resolution sweep — no scheduler is running;
(b) the operator CLI (`resolve-hold-cli.js`, the E3 liveness repair path)
— never invoked. The mission was invisible to every dispatch path
(reaper, reclaim, pending, claim, stuck watchdog all exclude held rows),
so it sat terminally-invisible for ~20h.

**Machine-grounded stuck reason:** UNKNOWN — unknown external effect
(UNKNOWN_AFTER_POSSIBLE_EFFECT, classification UNKNOWN_EXECUTION) held for
reconciliation; hold-resolution edge never exercised. This is the
directive's UNKNOWN category with the precise mechanism attached, not an
LLM-invented status. (Sibling evidence: 33 CLASSIFICATION_CREATE failures
in the live DB fail on "jev-shadow: emit JEV_DECISION_EVALUATED failed —
No owner defined for namespace 'jev'" — a separate real defect in the Jev
seam, not touched in this slice.)

## 3. OBSERVE → FIX → ADVANCE (one cycle)

- **OBSERVE:** mission held ~20h, result NULL, lease long expired,
  reconcile record complete, no scheduler, CLI never used.
- **FIRST BROKEN EDGE:** HOLD → RESOLUTION (above).
- **SMALLEST FIX:** invoke the EXISTING operator machinery —
  `orchestration/resolve-hold-cli.js` (E3 liveness repair, documented in
  HOLD_OPERATOR_RUNBOOK.md). No code written, no code modified.
  Resolution choice, per the runbook's truthfulness rules:
  - PROVEN_OCCURRED: rejected — no proof the effect happened.
  - PROVEN_NOT_OCCURRED: rejected — no positive proof of non-occurrence
    (absence of evidence is not evidence of absence), and it would re-arm
    a concluded fault-injection test mission for one new attempt that no
    scheduler or projection worker exists to execute, on an expired grant.
  - MANUAL_RESOLUTION: selected — operator determination. The mission
    belongs to a concluded 2026-09-30 fault-injection integration run;
    its purpose (proving the HOLD safety mechanism catches
    UNKNOWN_AFTER_POSSIBLE_EFFECT) was fulfilled; the driver is gone;
    the grant expired 2026-09-30T16:02:56Z. The work is moot. Terminal,
    never re-dispatched.
- **ADVANCE:** `resolve-hold-cli.js resolve --mission 67d994a00e844226
  --resolution MANUAL_RESOLUTION` → exit 0,
  `{mission_id, resolution: MANUAL_RESOLUTION, status: completed,
  hold_at: null}`.
- **OBSERVE:** row re-read: status=`completed`, hold_at=NULL,
  hold_reason=NULL, completed_at=`2026-10-01 17:24:54` (UTC; 11:24 MDT),
  result=`{hold_resolution: MANUAL_RESOLUTION, manual: true,
  provenance: stuck-mission-proof-track-A, decided_by: operator, note:
  <truthful operator note>}`. The other 4 held missions are untouched
  (still held). Status summary: 5 completed / 4 failed / 4 running(held).

Exactly one OBSERVE→FIX→ADVANCE cycle was needed. STOP after one mission,
per the directive.

## 4. Replay proof (deterministic reconstruction from durable records)

1. `2026-09-30T15:02:56.350Z` — MISSION_CREATED (tenant `ping`,
   deterministic ID `67d994a00e844226`).
2. `2026-09-30T15:02:56` — MISSION_ASSIGNED `{assignedTo: projection}`.
3. `2026-09-30T15:02:56.371Z` — MISSION_STARTED (claimed 15:02:56.365Z,
   lease 60s → 15:03:56.365Z).
4. `2026-09-30T15:02:56.856Z` — worker threw
   UNKNOWN_AFTER_POSSIBLE_EFFECT → markHold (conditional on
   `hold_at IS NULL`) → MISSION_RECONCILE_HOLD (failure_id
   `fl-4fd6353869d6`, UNKNOWN_EXECUTION, evidence digest recorded).
5. `2026-09-30T15:02:56Z → 2026-10-01T17:24:54Z` — ~20h in HOLD. No retry,
   no re-dispatch, no expiry. The fail-safe held.
6. `2026-10-01T17:24:54Z` — operator MANUAL_RESOLUTION via
   `resolveHold` (conditional `UPDATE ... WHERE hold_at IS NOT NULL`;
   fail-closed on unknown resolutions) → status `completed`, hold
   cleared, result recorded with `hold_resolution` + `manual:true`.

Every step is re-derivable from `ping_missions` + `ping_events` in
`ping-postgres`/`integrate_run`. No step depends on memory or narrative.

## 5. Verification proof (terminal invariants)

- status=`completed`: excluded from reaper, retry reclaimer, pending
  list, conditional claim, and stuck-running watchdog (all filter on
  active statuses and/or `hold_at IS NULL`). The mission can never be
  re-dispatched.
- hold_at IS NULL and hold_reason IS NULL: the HOLD overlay is fully
  cleared; no invisible-to-dispatch residue.
- result is non-null and carries `hold_resolution: MANUAL_RESOLUTION`
  and `manual: true`: the outcome is recorded, not just the status.
- Exactly one row changed (rowCount=1 from the conditional UPDATE; the
  CLI fail-closes otherwise). The 4 sibling held missions are byte-
  identical to before.
- No runtime code was modified; no new tables, events, or authorities
  were created. The only writes were the designed `resolveHold` UPDATE
  and its operator-supplied result JSON.

## 6. Proposed diff

NONE. No runtime code was touched. The fix used the existing operator
CLI and the existing `resolveHold` path exactly as designed. There is no
diff to propose.

## 7. What the proving mission revealed is actually missing

1. **The hold-resolution edge has no live operator.** The HOLD safety
   mechanism itself works (unknown outcomes are caught, never blindly
   retried — proven by ~20h of correct inaction). But neither designed
   exit runs in practice: no scheduler performs the held-resolution
   sweep (none is running anywhere), and the operator CLI sat unused.
   A hold without a resolver is a mission that disappears silently.
   This is NOT an argument for a new authority — the machinery exists;
   it needs a live owner (a running scheduler, an operator cadence, or
   an escalation that actually reaches a human).
2. **PROVEN_NOT_OCCURRED's "one new attempt" assumes a live dispatch
   path.** Re-arming a held mission is only safe when a scheduler and
   the mission's worker exist. For this mission neither did, which made
   MANUAL_RESOLUTION the only honest choice. The runbook's resolution
   table is correct; the runtime around it is not live.
3. **The Jev seam has a real defect, separate from this proof:** 33
   CLASSIFICATION_CREATE missions in the live DB failed with
   "jev-shadow: emit JEV_DECISION_EVALUATED failed — No owner defined
   for namespace 'jev'". The verdict-class admission authority rejects
   the jev namespace. Worth a look, but out of this slice's scope.
4. **No intent representation was needed to complete this mission.**
   The mission carried everything the runtime needed in its payload.
   Nothing in this proof argues for building IntentAuthority or any of
   the six fenced items. The missing piece is operational (run the
   existing resolver), not architectural.

## 8. Explicitly NOT done (awaiting Nolan)

- Bounded subset drain: NOT run. 4 sibling held missions remain held in
  `ping-postgres`/`integrate_run`. Draining them requires Nolan's word
  (each needs its own truthful resolution determination).
- The six-item phase-2 package: NOT implemented, NOT designed further.
- No ADVISORY status for Jev; no DecisionUnit constitutionalization.
- Vercel redeploy, Wicked Wrench recovery, Goose migration: untouched,
  out of scope.
