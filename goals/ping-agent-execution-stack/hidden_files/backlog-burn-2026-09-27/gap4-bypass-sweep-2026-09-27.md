# Gap-4 bypass-discovery sweep (read-only) — 2026-09-27 ~12:50 MDT

Subagent: backlog-burn (parent: main agent). READ-ONLY: journal reads +
code reads only. No files modified, no branches, no journal writes.
Implements the queued read-only half of mc-frontier-recon Gap 4
(SWARM-QUEUE item 14, first half).

## Method

1. Ran the shipped detector: `frontdoor_adapters.detect_bypass(journal,
   'spine-observe-dry-run')` against the local journal
   (`~/workspace/fyd-journal-gateway/events.jsonl`, 42 events).
2. Traced every flagged event to its emitter by code reading
   (`pass_policy_engine.py:510`, `spine_observe.py:9`, `emit.py`).
3. Inventoried unmigrated dispatcher surfaces (the M in "N of M").

## Headline finding: the detector false-positives — prefix collision (REAL DEFECT)

`detect_bypass('spine-observe-dry-run')` reports **10 violations** on the
local journal. All 10 are FALSE POSITIVES:

- The registry entry binds `execution_event_prefix: "MC_PASS_"` with
  `bind_key: "pass_id"`.
- All 10 flagged events are the X engagement pass's OWN lifecycle events
  (`aggregate_id: "mc:pass:x:x-20260926-231400"`, event_data carries
  engagement caps / platform x / cron schedule), emitted by
  `outreach/pass_policy_engine.py:510 pass_event()` — a different
  dispatcher surface entirely.
- The adapter's own executions can NEVER match: `spine_observe.py:9`
  documents `--dry-run` emits nothing to the journal, and the reference
  adapter always runs `--dry-run --json`, folding stdout. There is no
  journal-visible execution marker for the migrated class under its
  configured prefix.
- Meanwhile `_verified_coverage` only inspects `mc:lane:` aggregates, so
  `covered` is necessarily empty for these events.

Net: on any journal containing engagement-pass events, the ONLY migrated
class's bypass detector reports violations that are not bypasses. The
"N of M" coverage statement cannot be trusted until this is fixed, and
any operator acting on these violations would chase ghosts.

Second prong (found 2026-09-27 ~13:40 MDT, proven): the tenant-scoped
mode is blind by construction. `detect_bypass(j, 'spine-observe-dry-run',
tenant='happy-place')` returns 0 violations — not from coverage, but
because all 10 MC_PASS_* events carry NO `tenant` field (verified: 0/10),
so the `ev_tenant != tenant` filter discards every execution event
before the coverage comparison. Tenant-scoped detection can never
report a violation, for any class, on this event vocabulary. Both
prongs are fixed by the same Option A (the execution marker must carry
mission_class + tenant + bind key; the detector scans the marker, not
the legacy prefix).

Smallest fix (for the MC sprint owner — `frontdoor_adapters.py` is the
sprint's surface, verdicts pending; NOT applied here):
- Option A (narrow the prefix): give the adapter's executions a
  journal-visible marker. E.g. the front door's observe() stage emits
  `MC_ADAPTER_EXECUTION {mission_class, bind_key, bind_value}` per
  adapter run; registry `execution_event_prefix` becomes
  `"MC_ADAPTER_EXECUTION"` and the scan filters on `mission_class`.
- Option B (drop the legacy-event scan): coverage for an adapter class is
  defined SOLELY by the front door's own records (`MC_WORK_ORDER_ISSUED`
  + verified terminal chaining, which `_verified_coverage` already
  implements). A "bypass" is then: a legacy-caller execution event for
  the class's bind value with no covering front-door record — but the
  legacy caller must emit a distinguishable event for this to work, which
  `spine_observe.py --dry-run` deliberately does not. So Option B
  requires the adapter to emit the marker anyway: converges to A.
- Falsification for the fix: seed a journal with engagement-pass
  MC_PASS_* events + one genuine adapter execution marker ->
  `detect_bypass` reports 0 violations and 1 covered; remove the marker
  -> exactly 1 violation naming the adapter's bind value.

## Real bypasses of the migrated class

NONE evidenced locally. No direct (non-dry-run) `spine_observe.py` journal
emissions exist in the local journal; Pig-side runs are unverifiable
(transport down). Note the detector could not have found one anyway
(see above) — absence of evidence here is a detector limitation, not
proof of compliance.

## Unmigrated dispatcher inventory (the M)

| # | Candidate mission class | Dispatcher surface | External effect | Migrated? |
|---|---|---|---|---|
| 1 | spine-observe-dry-run | outreach/spine_observe.py via adapter | none (read-only) | YES (reference) |
| 2 | engagement-pass | 5 platform passes (fb/ig/tiktok/threads/x) via cron.d + goal crons | likes/comments/follows | NO |
| 3 | outreach-send | outreach/send-batch.py (Gmail) | outbound email | NO |
| 4 | fyd-factory-claim | fyd-factory/claim.sh | repo/file claims | NO |
| 5 | hermes-prompt | hermes bridge prompts | agent dispatches | NO |

Coverage statement today: **1 of 5 migrated** (and the 1's detector is
defective per above).

Notable: the local journal already contains a full 7-event `MC_MISSION_*`
lifecycle for `mission_class: "engagement-pass"` (INTENT→AUTHORIZED→
DISPATCHED→ATTEMPT_RESULT→VERDICT(AGREE)→RECEIPT→CLOSED, event_ids
mc-msn-fe20011cfc4e…, `caused_by_observation` → the X pass's
MC_PASS_STARTED, `synthetic: false`). The emitter is NOT in
`mission-control/`, `orca-mc-convergence/`, or `tenanos-wave/`
(scoped greps, zero hits) — origin UNIDENTIFIED (Pig-side or removed
script). This is a second mission-control vocabulary (`MC_MISSION_*`)
beside the front door's (`MC_LANE_*`, `MC_WORK_ORDER_ISSUED`): a
competing-authority smell (SOUL 6) to reconcile before class 2 migrates.
ORIGIN IDENTIFIED 2026-09-27 ~13:45 MDT: the mc/pass-migration-proof lane
(branch mc/pass-migration-proof @ 28c92f4) — "Real X pass x-20260926-231400
migrated as one mission (mc:mission:x:x-20260926-231400)... 7 unique
MC_MISSION_* events in live journal, all synthetic=false"
(orca-mc-convergence/SWARM-QUEUE.md:67). This is a genuine
competing-vocabulary instance: the migration-proof lane's `MC_MISSION_*`
vs the front door's `MC_LANE_*` (+ `MC_WORK_ORDER_ISSUED`), both claiming
to be the mission-control record for the SAME logical migration (the same
X pass). Before class-2 migration, the owner must decide which vocabulary
is canonical — an `engagement-pass` adapter must emit one, not both — and
the existing MC_MISSION_* rows for x-20260926-231400 need a disposition
(superseded / adopted / fenced).

## Second-class migration spec (for the owner)

Per the recon: migrate ONE engagement pass, narrowest external-effect
scope, with a replay test. Preconditions (in order):
1. Fix the detector prefix collision (above) — otherwise the migration's
   own verification is meaningless.
2. Reconcile the `MC_MISSION_*` vs `MC_LANE_*` vocabulary question —
   the adapter must emit one vocabulary, not both.
3. The adapter wraps the pass runner the way `SpineDryRunObserverAdapter`
   wraps the observer (intent → authorize → work order → executor →
   typed observation); the executor is the existing pass driver unchanged.
4. Replay test: journal with a direct (non-adapter) pass execution →
   `detect_bypass` flags exactly that bind value; the same pass through
   the adapter → covered, zero violations.
5. Publish the updated coverage statement ("2 of 5") from the detector
   itself, not prose.

## Status

SWEEP COMPLETE (read-only half). New backlog items: GAP4-DETECTOR
(prefix-collision false positive, fix spec above, owner: MC sprint);
GAP4-VOCAB (MC_MISSION_* vs MC_LANE_* competing vocabulary, reconcile
before class-2 migration). Migration itself queued for the owner.

## Regression fixture BUILT (2026-09-27 ~14:20 MDT, backlog-burn subagent)

`gap4-bypass-fixture-2026-09-27.py` + `gap4-bypass-fixture-journal.jsonl`
(17 events: 12 legacy engagement-pass events across 3 passes with no
tenant, 5 front-door events for one genuine `spine-observe-dry-run`
execution via real `mi.submit` with the adapter's real capability).

Reproduces the defect deterministically:
- `detect_bypass(j, 'spine-observe-dry-run')` → 12 violations, ALL
  engagement-pass false positives; genuine execution covered
  (`covered=['obs-1']`).
- `detect_bypass(j, ..., tenant='happy-place')` → 0 violations,
  vacuously (legacy events carry no tenant).

The FIXED detector must return ZERO violations on this journal:
engagement passes are not adapter executions, and the genuine
execution is covered. The fixture also pins the honest journal shape
of a genuine execution (MC_LANE_STARTED → MC_WORK_ORDER_ISSUED →
MC_LANE_COMPLETED carrying mission_class, tenant, pass_id via
event_bind) for the owner to design the marker around.
