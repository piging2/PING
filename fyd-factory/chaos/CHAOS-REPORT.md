# LANE-CHAOS: Factory Chaos Report

Date: 2026-09-24 (MDT)
Lane: LANE-CHAOS, FYD 500-SITE FACTORY STRESS PROGRAM
Mode: real Pig factory machinery wherever the task allowed it; controlled
simulations only where the task forbade real fault injection (Pig sleep,
browser target drops). Every simulated experiment is labeled SIMULATED.

## Constraints honored

- Pig repo: /home/nolan/projects/ping, branch fyd-factory, HEAD e48ef710.
  Verified after all experiments: no task-owned file exists in the repo;
  108 dirty entries belong to other lanes (93 at assignment). No repo file
  was read-for-write, edited, or committed by this lane.
- All Pig-side work ran out-of-tree at /home/nolan/fyd-chaos-lane/
  (stage.ts, fixtures, per-experiment artifacts). Nothing was written to the
  repository.
- The real Pig was never slept. Nolan's browser targets were never
  dropped. Those two chaos types are SIMULATED and labeled as such.
- All experiments bounded: Pig call timeout 180s, local timeouts, artifact
  caps (small JSON fixtures only). No destructive actions.

## Method

A small chaos library (~/workspace/fyd-factory/chaos/chaos_lib.py) implements
the durability mechanisms the batch spec requires, driven against the REAL
Pig stage modules (generator, validator, facts, corrections, provenance)
through an out-of-tree stage script:

- deterministic work ids: sha256(batch_id, item_id, stage, input_digests)
- content-addressed artifact store with digest verification on every read
- atomic committed index (tmp file + rename)
- leases: atomic mkdir acquire, TTL, heartbeat, steal-after-expiry, fencing
  tokens; stale-fencing writes rejected
- canonical side-effect journal gated on fencing tokens
- bounded retries: max 3 attempts, typed failures

Real Pig stage calls: extract, generate, verify, draft-journal, replay.
Fixture: clearwater-plumbing-demo.json, sha256
1bef189ee1376d2c45d1cb3de2b36fdb89961d09f42e30ae1231dbf775a978b6
(25 objects, 24 relationships). Both the workspace original and the Pig
staging copy verified intact after all runs.

## Experiment matrix

| ID | Chaos type | Mode | Verdict |
|----|------------|------|---------|
| C1 | Duplicated jobs (3 sequential, 10 concurrent) | real | PASS |
| C2 | Worker restart mid-run (SIGKILL inside GENERATE) | real | PASS |
| C3 | Source change mid-run | real | PASS |
| C4 | Cache-entry corruption (bit flip) | real | PASS |
| C5 | Reobservation during generation | real | PASS |
| C5b | Stale-code cache proof (live finding) | real | GAP-CONFIRMED |
| C6 | Two workers on the same entity | real stages + harness publication API | PASS |
| S1 | Pig sleep (heartbeat pause, lease expiry) | SIMULATED | PASS |
| S2 | Browser target drop (typed target-lost) | SIMULATED | PASS |
| S3 | HTTP 500 / 429 / DNS timeout | SIMULATED | PASS |

Evidence: ~/workspace/fyd-factory/chaos/work/<id>/result.json plus the
per-experiment checkpoint stores, journals, and attempt logs in the same
directories.

## Per-experiment results

### C1. Duplicated jobs (real) - PASS

Setup: same GENERATE work (identical batch/item/stage/input digests)
submitted 3x sequentially, then 10x concurrently behind a thread barrier.
Result: exactly 1 real Pig execution in both scenarios; 9 of 10 concurrent
submissions joined as cache hits; all submissions returned the identical
output digest; exactly 1 journal line. The spec digest produced at run time
matched the LANE-REG digest1 (bb2aed0356cd60b578e2f7148543bcba76266e424ac62b1f0e28d33a5d091866),
proving the deduped result was the genuine factory output, not a stub.
Verdict: idempotency dedup holds; no duplicate canonical side effects.

### C2. Worker restart mid-run (real) - PASS

Setup: 3-stage pipeline (EXTRACT -> GENERATE -> VERIFY) with digest chaining.
Supervisor SIGKILLed worker-1's process group inside the GENERATE stage
(kill landed after lease acquisition, before commit). Worker-2 resumed.
Result: resumed digests equal the uninterrupted control digests for all
three stages (extract 76da80e5045f981c, generate cdc3435006b0fc10, verify
4f6d990731902158). EXTRACT was a cache hit on resume (no recomputation);
GENERATE re-executed exactly once (attempt 2, bounded); exactly 3 journal
lines, one per stage. The killed attempt left no committed record and no
journal line: no partial output was treated as complete.
Verdict: crash recovery works; resume is exact; retries bounded.

C2 also caught a real harness defect mid-run: the first version of the join
loop waited for the dead lease-holder without ever reclaiming the expired
lease (liveness bug). Fixed by implementing steal-after-expiry per batch
spec 4.2/4.3, then re-verified by the passing run above.

### C3. Source change mid-run (real) - PASS

Setup: pipeline ran on fixture v1; source then changed (new fixture copy:
phone 0142->0143, title "Clearwater Plumbing Co." -> "Clearwater Plumbing
Company"; original never touched).
Result: EXTRACT with v2 inputs was a cache MISS (no stale v1 output served);
GENERATE on v2 facts produced a different spec digest (change propagated
end to end); re-running EXTRACT with v1 inputs was a cache HIT with a
stable digest (history preserved, not invalidated). Exactly 4 Pig
executions, 4 journal lines.
Verdict: input-digest-keyed identity prevents cross-contamination; no
silent lost work; history intelligible.

### C4. Cache-entry corruption (real) - PASS

Setup: committed a real EXTRACT artifact, then flipped one bit in place.
Result: reading through the cache API raised typed CorruptCacheError; the
corrupt bytes were moved to quarantine with a reason file (forensics
preserved, nothing live); no false cache hit was served. Bounded recovery
(one recompute, real Pig call) reproduced the exact pre-corruption digest;
post-recovery reads are clean hits.
Verdict: corruption is detected, typed, quarantined, and recoverable with a
faithful recompute.

### C5. Reobservation during generation (real) - PASS

Setup: GENERATE pinned to source A ran while source B (reobserved fixture)
was submitted concurrently.
Result: distinct work ids (24b90d0a vs 2ae5a04a); each commit labeled with
its own input facts digest; B did not join A's lease and did not reuse A's
checkpoint; spec digests differ (c09af6fbb4777da0 vs 7902f31fb7afb185), so
no cross-contamination. Owner journal replay over B facts: owner's phone
correction applied (0199 preserved), the source-value divergence explicitly
surfaced as 1 conflict, 0 orphaned. Exactly 4 journal lines.
Verdict: in-flight work stays labeled with its inputs; reobservation
becomes a distinct work identity; owner intent preserved with explicit
conflict reporting, never silent.

C5 also caught a harness concurrency defect: the Pig invocation counter was
read outside the increment lock, so two threads wrote the same pigcall
script and both executed B's arguments (identical output digests for
different inputs exposed it). Fixed with an atomic
read-increment-write; re-run passes with correct per-thread results.

### C5b. Stale-code cache proof (real) - GAP-CONFIRMED

This was not a planned experiment; the factory produced it live. Between
C1 (20:33 MDT) and C3 (02:51 MDT), another lane refactored
src/fyd/sitespec/schemas.ts (lane E: deleted the hand-written
SCHEMA_COMPONENTS table; component eligibility now derived from the
component registry). The generator's canonical output for IDENTICAL source
inputs changed (explore query schemas 5 -> 2); generator version stayed
1.0.0. Proof: re-submitting C1's exact GENERATE work today returns a cache
HIT with 0 Pig executions serving digest bb2aed03 (pre-edit code output),
while a fresh generation yields c09af6fb (post-edit code output). The cache
serves a stale-code artifact as current.
This is durability gap G1 below.

### C6. Two workers on the same entity (real stages) - PASS

Setup: two workers generated for the same item_id from different source
inputs concurrently; both stage jobs committed under their own work ids
with different outputs.
Result: the batch spec defines no entity-level publication rule, so the
publication point was modeled as a harness API. Naive last-writer-wins
publication accepted the older (seq 1) result after the newer (seq 2),
silently regressing the canonical pointer: hazard demonstrated. A
compare-and-set fence (accept only when input seq is newer) rejected the
stale publish, kept seq 2 canonical, and accepted in-order A-then-B.
This is durability gap G2 below.

### S1. Pig sleep, SIMULATED (heartbeat pause) - PASS

The real Pig was never slept. Simulation: worker A held a GENERATE lease
(TTL 5s) while its heartbeat paused 8s; worker B stole the expired lease
(fencing 1 -> 2), completed the real Pig stage, and committed; A's late
commit under fencing 1 was rejected as stale. Exactly 1 journal line (B's).
The wake-request protocol (acquire before the durability section, release
in finally) was modeled as an observable log: acquire/release both
recorded, release guaranteed on clean exit.
Verdict: sleep-equivalent lease expiry is survivable; fencin
...[truncated 4957 chars]