# Oracle matrix regeneration note (v2 -> v3, 2026-09-24)

## Why
One defect class survived the v2 regen: mission subjects that do not exist in
the real Oracle host inventory, making their pass criteria unevaluable
(systematic N-A verdicts in the fleet ledger). The v2 note flagged
image-provenance for this; this pass audited all 12 non-synthetic v1 families
carried into v2 and proved 10 of them defective with the same evidence
standard: generator source (fleet/gen_matrices.py subject lists) + read-only
inventory cross-check (lane-oracle/ORACLE-DEPLOYMENT-CLOSURE.md,
EVIDENCE-LOG.md, fleet-ora-1/fleet-ora-2 investigation files, ledger notes).

## Audit result: 10 of 12 non-synthetic families defective

Real inventory (closure doc sections 1, 6; EVIDENCE-LOG.md batches 2-3):
8 images (ping-gateway:candidate-3c5d280dd, candidate-84486f056,
postgres:17-alpine, qdrant/qdrant:v1.7.0, node:24/20/18-alpine,
ollama/ollama:latest), 3 live containers (ping-gateway, ping-postgres,
ping-qdrant), named volumes oracle_pgdata (69 MB) and oracle_qdrant_storage
(2.3 MB), backup artifacts in /opt/ping/backups and releases/.

| family | v2 range | subjects (gen_matrices.py) | inventory overlap | verdict |
|---|---|---|---|---|
| image-provenance | ORA-0201..0350 | 15 ORA_IMGS | 0/15 (fleet-ora-2: zero matches) | DEFECTIVE |
| dependency-completeness | ORA-0351..0500 | 15 ORA_SVCS | 4/15 (postgres, qdrant, gateway, ollama-as-image; 11 nonexistent, N-A x38/range) | DEFECTIVE |
| arch-compat | ORA-0501..0650 | 15 ORA_SVCS | 4/15 (11 nonexistent, N-A x34) | DEFECTIVE |
| cold-boot | ORA-0651..0800 | 15 ORA_SVCS | 4/15 (11 nonexistent, N-A x38) | DEFECTIVE |
| restart-semantics | ORA-0801..1000 | ORA_SVCS + 5 warm variants | ~7/20 (N-A x41) | DEFECTIVE |
| network-interruption | ORA-1001..1150 | 15 ORA_SVCS | 4/15 (N-A x41) | DEFECTIVE |
| partial-dep-loss | ORA-1151..1300 | 15 ORA_SVCS | 4/15 (N-A x38/41) | DEFECTIVE |
| health-semantics | ORA-2351..2500 | 15 ORA_SVCS | 4/15 (N-A x38/41) | DEFECTIVE |
| secret-leakage | ORA-2501..2650 | 15 ORA_SVCS | 4/15 (N-A x38/41) | DEFECTIVE |
| resource-exhaustion | ORA-2651..2850 | ORA_SVCS + 5 abstract | 9/20 (N-A x41) | DEFECTIVE |
| store-loss | ORA-1301..1500 | qdrant, postgres | 2/2 (live containers; ledger NEEDS-FOLLOWUP is a live-host safety issue, not subject nonexistence) | NOT DEFECTIVE |
| event-ingress-chaos | ORA-1501..1750 | 5 event-type labels | subjects are test-input labels; the mission subject (gateway) is real | NOT DEFECTIVE |

The 11 nonexistent ORA_SVCS subjects, confirmed in the closure doc
(only 3 live containers; hand-started docker run topology) and EVIDENCE-LOG.md
batch 2 (docker ps -a: 6 containers, 3 live): js-worker-a, js-worker-b,
python-adapter, event-ingest, witness, scheduler, backup-agent, health-monitor,
log-shipper, reverse-proxy, cert-renewer. None exists as a container, image,
systemd unit, or compose service on the host.

## What was regenerated
Generator: fleet/gen_matrices_v3.py (reads matrix-oracle-v2.tsv, replaces the
10 families in place, keeps all mission IDs and family order). Output:
fleet/matrix-oracle-v3.tsv (3750 rows).

New subject pools per family (all grounded in the closure doc / evidence log;
design-spec subjects carry an explicit annotation):

- image-provenance: the 8 pinned images (incl. the documented ollama :latest
  exception), digest-pin lockfile creation, compose.proposed.yaml pin review,
  3 live container-to-image linkage checks, reclaimable-image attribution,
  gateway multi-stage rebuild base pin. 15 subjects x 10 angles.
- dependency-completeness: the 3 live services + ollama image + 5 design-spec
  workers + python-adapter + real dependency edges (/health integrations,
  trust-auth path, journald log driver, backup timer design, proposed compose
  graph). 15 x 10.
- arch-compat: the 8 pinned images + node 18.20.8 runtime + engines 24.x drift
  + sharp prebuilt arm64 + binfmt_misc/qemu scan + docker top evidence. 15 x 10.
- cold-boot: the 3 live services + daemon enablement + volume durability +
  the proven 2026-09-20 00:05 reboot (qdrant up in 59 s) + depends_on ordering
  gap + no-healthcheck boot risk + .env presence + systemd-timer design. 15 x 10.
- restart-semantics: the 3 live services + ollama N/A-by-design + 5
  design-spec workers + python-adapter + warm-restart variants + exit-137
  replay + OOM suspicion + restart storm + mid-write backup/snapshot. 20 x 10.
- network-interruption: real partitions (gateway to stores), loopback-only
  bindings (ss -tlnp evidence), sshd as sole external listener, both bridge
  networks, hand-run topology drift, cold-boot race retry design. 15 x 10.
- partial-dep-loss: 15 real dep-loss pairs (stores down, volume full, .env
  missing, journald loss, OOM as dep-loss, daemon loss, DNS loss). 15 x 10.
- health-semantics: real health signals (gateway /health gap, pg_isready,
  qdrant TCP-only gap, exit-137 history, host RAM/disk/pressure evidence,
  worker/timer health designs). 15 x 10.
- secret-leakage: real secret surfaces (.env 0600, POSTGRES_PASSWORD
  redaction precedent, log-driver canary scans, inspect env, compose
  artifacts, .pgpass 0600, backup scoping, trust-auth wire, /health and
  error payloads, scp/rotation designs). 15 x 10.
- resource-exhaustion: real resources (no-limit containers, zero swap,
  5903 MB RAM, 1 vCPU, disk, /var/log, journald, docker root, reclaimable
  images, ollama 6.99 GB, conn pool, fd/mem/cpu/disk-io, proposed limits,
  degradation order, exit-137 history). 20 x 10.

Every mission carries the rule: sandbox-local execution only; the live Oracle
host (129.146.60.17) is never touched. Image digests sourced from the
fleet-ora-2 range-0201-0250 investigation (read-only `docker images` digest
probe, 2026-09-24T02:33Z), cross-checked against the 8-image lists in
EVIDENCE-LOG.md batch 2 and ORACLE-DEPLOYMENT-CLOSURE.md.

All other families (reproducibility, schema-drift, rollback, forward-recovery,
disk-pressure, slow-queries, txn-retry, read-fallback, retention,
poison-events, backpressure, ordering, crash-ack, store-loss,
event-ingress-chaos) are carried over from v2 VERBATIM with identical IDs.

## Claims
New claims under fleet/claims/oracle-v3/, category-qualified filenames
(oracle-NNNN-NNNN.claim) per the fleet-po-1 hygiene finding. 3 files:
oracle-2701-2750.claim, oracle-2751-2800.claim, oracle-2801-2850.claim
(resource-exhaustion; the only regenerated-family ranges not already
ledgered or in inprogress). Range list: fleet/claims/oracle-v3.txt.

NOT re-issued: all other regenerated-family ranges. 29 of the 32 ranges are
already ledgered (verdicts N-A / NEEDS-FOLLOWUP / ADAPT on the synthetic
subjects) or sit in inprogress claims. Their v3 rows exist with real subjects;
re-draining them is a coordinator decision. No inprogress claim and no
ledgered range was touched.

Superseded: 3 UNCLAIMED v1 claim files (2701-2750, 2751-2800, 2801-2850;
resource-exhaustion, synthetic ORA_SVCS subjects) moved to
fleet/claims/oracle-superseded/ with the v3 note appended to SUPERSEDED-NOTE.md.
No inprogress claim and no ledgered range was touched.

## Integrity checks run (in the generator)
- 3750 rows, 6 tab-separated fields each, IDs ORA-0001..ORA-3750 continuous
- 1600 rows changed, all in the 10 regen families; 2150 non-regen rows byte-identical to v2
- zero residual f-string placeholder patterns (component-N ... ack-N)
- none of the 15 ORA_IMGS names appear in regen-family text
- no regen row title is identical to any old v2 row title in its family

## Open items for the coordinator
1. Decide whether to re-drain the 29 ledgered regenerated-family ranges with
   the real v3 subjects (same decision shape as the v2 note's item 1).
2. store-loss and event-ingress-chaos missions are ledgered NEEDS-FOLLOWUP on
   live-host safety grounds; their subjects are real, and the missions are
   executable sandbox-locally. Consider a worker pass that executes them in
   the sandbox rather than deferring.
