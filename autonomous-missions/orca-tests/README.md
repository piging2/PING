# orca-tests — executable CRX invariant drafts (Lane C, Phase 3)

Seven invariants distilled from the Orca archaeology, written as runnable
test drafts against the CRX runtime's actual module paths.

## Grounding status (read this first)

`/home/nolan/ping` was **not mounted** in the authoring sandbox, so imports
were grounded against workspace snapshots instead:

- **Baseline API** (tests 01, 02, 05, 06): `convergence-zoom-2026-09-19/lane-d-execution/pig-src/ping-runtime/orchestration/mission_runtime.js`
  — matches the 2026-09-22 crx-audit's file:line evidence for the live repo.
  Canonical path: `ping-runtime/orchestration/mission_runtime.js` → `{ MissionRuntime }`.
- **Variant API** (test 07, Part A): `ce002/src/mission_runtime.js` — the
  CE-001/CE-002 experiment (deterministic completion identity, attempt
  fencing). **Not confirmed in the live repo**; Part A self-skips unless
  the variant API is detected.

Per the directive: tests whose target API **does not exist** are marked
`DRAFT-UNGROUNDED` in their headers and skip cleanly (03 dependencies,
04 worktree manager, 07 Part B effect ledger). Nothing is invented to
satisfy a test.

**Re-verify every import against repo HEAD before promoting to CI.**

## The seven files

| File | Invariant | Grounding |
|---|---|---|
| `01-worker-dies-mission-survives.test.mjs` | Dead worker → lease expires → reaper reclaims → new worker completes exactly once; stale completion is a no-op | SNAPSHOT-VERIFIED |
| `02-lease-expires-safe-reclaim.test.mjs` | Live renewals are never reclaimed; reclaim resets full claim state, is idempotent, emits one `MISSION_LEASE_EXPIRED` | SNAPSHOT-VERIFIED |
| `03-dependency-incomplete-dependent-blocked.test.mjs` | Dependent not claimable until deps complete; cycles/self-edges rejected | DRAFT-UNGROUNDED (skips) |
| `04-worktree-collision-mutation-refused.test.mjs` | Same-runId create refused with typed error; archive validates kind; move-before-unregister | DRAFT-UNGROUNDED (skips) |
| `05-coordinator-restart-graph-reconstructed.test.mjs` | Fresh scheduler recovers orphans via reaper; graph consistent; completed never resurrected | SNAPSHOT-VERIFIED |
| `06-completed-task-next-eligible-discovered.test.mjs` | Priority-ordered discovery; atomic claim race has one winner; completions advance discovery; due retries re-enter | SNAPSHOT-VERIFIED |
| `07-unknown-external-effect-reconciliation.test.mjs` | A: crash-after-accept dedup re-emit + STALE_ATTEMPT fail-closed (variant, skips if absent). B: reconcile-vs-retry classifier decision table (pure logic, runs) + ledger gap (skips) | PARTIAL |

`harness.mjs` is shared support (pool, scratch-DB guard, event recorder,
clock-travel helper) — not an invariant file.

## Running

```sh
# 1. Create a scratch database (NEVER the live DB):
createdb -h localhost -U postgres ping_test

# 2. Install pg where the drafts live:
npm install pg

# 3. Point at the CRX checkout and run:
CRX_REPO=/home/nolan/ping node --test *.test.mjs
```

The harness **refuses to run** if the `ping_events` table exists (live-DB
fingerprint) unless `CRX_TEST_ALLOW_LIVE=1` is set. Test-only clock travel
(`UPDATE ping_missions SET lease_until = ...`) is used instead of sleeping
through real 60s leases.

## What these drafts prove (and don't)

- They encode the CRX mechanisms that Orca lacks (leases, reaper,
  atomic claim, watchdog-adjacent recovery) as executable contracts.
- They pin the three invention gaps as failing-to-skip contracts: run-row
  shape is assumed by 04's interface, dependency gating by 03, the effect
  ledger by 07-B.
- They are **drafts**: written against snapshots, never executed here
  (no repo mount, no PG in the authoring sandbox). Promote to CI only
  after re-grounding imports against repo HEAD and running green.
