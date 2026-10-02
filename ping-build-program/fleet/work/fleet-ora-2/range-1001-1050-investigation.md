# Range 1001-1050 investigation (fleet-ora-2, 2026-09-24 UTC)

## Mission family
ORA-1001..1050: family network-interruption (first 50 of 150; family spans ORA-1001..ORA-1150).
"Network interruption: {it} — partition and heal without split-brain"
Pass criterion: "Partition {it} for 60s: no split-brain, heal converges; FAIL on silent divergence."

## Hard boundary
Deliberately partitioning production network for 60s on the live Oracle host is failure injection against the
certified baseline. Not attempted. NEEDS-FOLLOWUP with the staging harness below for the 3 deployed services.

## Read-only observations (relevant to the mission design)
- postgres, qdrant, gateway are SINGLE-NODE deployments (one container each, verified via docker ps).
  Single-node stores cannot split-brain in the classic sense: during a partition the service is either
  unreachable (availability loss, no divergence) or keeps serving its single copy (no divergence possible).
  The meaningful pass/fail for them is: (a) during partition, errors are typed/time-bounded, never silent
  empty success; (b) after heal, clients reconnect and no divergence exists between pre/post-partition state.
- No cluster membership (no postgres patroni/repmgr, no qdrant cluster mode observed) — no fencing logic to test.

## Exact followup harness (staging clone, never the live baseline)
  1. Staging clone of each service with production-equivalent data.
  2. Start a steady write workload with per-write ids and a client ack journal.
  3. Partition: `docker network disconnect <net> <container>` (or iptables DROP on the container veth) for 60s.
     Record client-visible errors during the window (expect: connection refused/timeout; FAIL if: silent empty
     success or hang past the client deadline).
  4. Heal: reconnect; continue workload; then compare the client ack journal against server state.
     PASS: zero divergence (every acked write present, no phantom writes), clients reconnected with no manual step.
     FAIL: silent divergence of any kind.
  5. Repeat for: gateway<->postgres link, gateway<->qdrant link, and client->gateway link.

## Verdicts
- postgres, qdrant, gateway: NEEDS-FOLLOWUP with the harness above.
- js-worker-a/b, python-adapter, event-ingest, witness, scheduler, backup-agent, health-monitor,
  log-shipper, reverse-proxy, cert-renewer, ollama: N-A (not deployed; nothing to partition).
