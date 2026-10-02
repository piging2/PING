# Oracle matrix regeneration note (v1 -> v2, 2026-09-24)

## Why
Two independent fleet workers (fleet-ora-1, fleet-ora-2) proved the v1 oracle
matrix's synthetic-placeholder families unexecutable: subjects like
`component-{0..19}`, `schema-v{i}`, `release-{i}`, `failure-{i}`, `volume-{i}`
have no mapping to anything on the Oracle host, so their pass criteria could
never be evaluated. Investigations:
fleet/work/fleet-ora-2/range-*-investigation.md.

## What was regenerated
All 13 f-string-placeholder families were rewritten against the real inventory
in lane-oracle/ORACLE-DEPLOYMENT-CLOSURE.md (read-only investigation; the live
host was not touched and no mission requires touching it). Generator:
fleet/gen_matrices_v2.py. Output: fleet/matrix-oracle-v2.tsv (3750 rows).

Grounding sources used (all from the closure doc, nothing invented):
- 8 real host images with pinned digests (ping-gateway:candidate-3c5d280dd,
  candidate-84486f056, postgres:17-alpine, qdrant/qdrant:v1.7.0,
  node:24/20/18-alpine, ollama/ollama:latest)
- 3 live containers and their real gaps (no healthcheck, no mem limit,
  node 18.20.8 vs repo engines 24.x, 2x exit-137 deaths)
- named volumes oracle_pgdata (69 MB) and oracle_qdrant_storage (2.3 MB)
- postgres database crx_runtime; backup artifacts (09-19 dump 368 KB,
  09-16 sql.gz 161 KB, RESTORE-2026-09-16.md procedure)
- qdrant collection knowledge (144 points, 768-dim cosine, HNSW m=16,
  on-disk payload, status green) and the 67 MB 09-17 snapshot
- JS-worker designs from the snapshot compose files (digestion, newsletter,
  projection, witness, replay; node:24-alpine, 512m-1g, depends_on healthy)
- capacity numbers (5903 MB RAM, 0 swap, 45 GB disk), journald 432 MB,
  /var/log 454 MB, reclaimable images 4.088 GB

Every mission is executable locally (sandbox docker pulls of public images,
scratch containers) or a design-spec mission with verifiable pass criteria.
Each carries the rule: sandbox-local execution only; the live host is never touched.
No table names were invented; schema-drift subjects use real artifacts
(dump/restore contracts, payload schema, env-name and compose-config evolution)
or local-scratch migration patterns.

## Old-range -> new-range mapping (mission IDs kept where the family existed in v1)

| family | v1 range | v2 range | change |
|---|---|---|---|
| reproducibility | ORA-0001..0200 | ORA-0001..0200 | subjects: 20 real images/artifacts/designs x 10 angles (was component-{0..19}) |
| schema-drift | ORA-1751..1950 | ORA-1751..1950 | subjects: 20 real migration contracts x 10 angles (was schema-v{i}) |
| rollback | ORA-1951..2150 | ORA-1951..2150 | subjects: 20 real rollback paths x 10 angles, incl. the two real gateway candidate digests (was release-{i}) |
| forward-recovery | ORA-2151..2350 | ORA-2151..2350 | subjects: 20 real failure modes from the closure doc x 10 angles (was failure-{i}) |
| disk-pressure | ORA-2851..2900 (50) | ORA-2851..2950 (100) | subjects: 10 real volumes/paths x 10 angles (was volume-{0..9}); restored to the generator's intended 100 |
| slow-queries | (trimmed from v1) | ORA-2951..3050 | NEW: 10 real slow-path subjects x 10 angles (was query-{i}) |
| txn-retry | (trimmed from v1) | ORA-3051..3150 | NEW: 10 real contention subjects x 10 angles (was txn-{i}) |
| read-fallback | (trimmed from v1) | ORA-3151..3250 | NEW: 10 real degraded-read subjects x 10 angles (was reader-{i}) |
| retention | (trimmed from v1) | ORA-3251..3350 | NEW: 10 real lifecycle subjects x 10 angles (was dataset-{i}) |
| poison-events | (trimmed from v1) | ORA-3351..3450 | NEW: 10 real poison subjects x 10 angles (was poison-{i}) |
| backpressure | (trimmed from v1) | ORA-3451..3550 | NEW: 10 real saturation subjects x 10 angles (was pipe-{i}) |
| ordering | (trimmed from v1) | ORA-3551..3650 | NEW: 10 real ordering subjects x 10 angles (was sequence-{i}) |
| crash-ack | (trimmed from v1) | ORA-3651..3750 | NEW: 10 real ack-boundary subjects x 10 angles (was ack-{i}) |

All other families (image-provenance, dependency-completeness, arch-compat,
cold-boot, restart-semantics, network-interruption, partial-dep-loss,
store-loss, event-ingress-chaos, health-semantics, secret-leakage,
resource-exhaustion) are carried over from v1 VERBATIM with identical IDs.
Note: the image-provenance family has the same defect class (hardcoded image
names with zero intersection with the host inventory, per the fleet-ora-2
range-0201-0250 investigation) but was out of scope for this repair
(task scoped to f-string-placeholder families); recommend a v3 pass.
stale-artifact (100 missions in the v1 generator, trimmed to 0 by the 2900
cap) remains absent from v2.

## Claims
New claims under fleet/claims/oracle-v2/, category-qualified filenames
(oracle-NNNN-NNNN.claim) per the fleet-po-1 hygiene finding. 22 files, 1100
missions: forward-recovery x4, disk-pressure x2, and x2 each for slow-queries,
txn-retry, read-fallback, retention, poison-events, backpressure, ordering,
crash-ack. Range list: fleet/claims/oracle-v2.txt.

NOT re-issued: reproducibility, schema-drift, rollback. All 12 of their
50-mission ranges are already ledgered (verdicts N-A / NEEDS-FOLLOWUP on the
synthetic subjects). Their v2 rows exist with real subjects; re-draining them
is a coordinator decision.

Superseded: 5 UNCLAIMED v1 claim files (synthetic families only) moved to
fleet/claims/oracle-superseded/ with SUPERSEDED-NOTE.md. No inprogress claim
and no ledgered range was touched.

## Integrity checks run
- 3750 rows, 6 tab-separated fields each, IDs ORA-0001..ORA-3750 continuous
- zero residual placeholder patterns (component-N, schema-vN, release-N,
  failure-N, volume-N, query-N, txn-N, reader-N, dataset-N, poison-N,
  pipe-N, sequence-N, ack-N)
- v2 generator skips any range already ledgered or in inprogress

## Open items for the coordinator
1. Decide whether to re-drain reproducibility / schema-drift / rollback v2
   ranges (already ledgered as N-A on synthetic subjects).
2. image-provenance family needs the same regeneration treatment (v3).
3. Three v1 claim files (2401-2450, 2451-2500, 2501-2550) were claimed by
   live workers during this repair; they are in inprogress, untouched.
