# PING INFRASTRUCTURE ACCELERATION — Lane State

Coordinator spawned: 2026-09-23 ~19:08 MDT. Nolan order: move faster, burn more, 20x infra build-out.

## Survey findings (pre-delegation)
- TenantOS convergence wave (aa53c3fc): 18 swarms; swarm 13 (GitHub ingestion) DEFERRED. Wave owns mission engine, MCP, memory, observability, Mission Control, task claiming, recovery, gauntlet, integration. Sole write dispatcher; six-gate pipeline; frozen base tag tenanos-wave-base-20260923; diffs to ~/workspace/tenanos-wave/diffs/<id>.diff.
- FYD factory: 16 lanes, product-focused. ORCA wave: durable execution, recovery gauntlet, artifact lineage. Constitutional sprint: no-commit forensics. Autonomy challenge: MECHANISM-LIBRARY.md final.
- This sandbox CANNOT reach /home/nolan/projects/ping (no git). Read-only mirror: ~/workspace/constitutional-sprint/repo-mirror/.
- All infra-acceleration code builds standalone under ~/workspace/ping-infra/ and delivers integration-ready diffs to the wave coordinator. No canonical repo mutation from this lane.

## Domain lanes
| Lane | Scope | Deliverable | Status |
|---|---|---|---|
| git-ingest | fills deferred wave swarm 13; read-only GitHub → observation/evidence | ~/workspace/ping-infra/git-ingest/diffs/git-ingest-v1.diff + PACKET.md | running |
| connectors | connector framework (registry, capability contracts, rate-limit leases, receipts); wraps existing mechanism | ~/workspace/ping-infra/connectors/diffs/connectors-v1.diff + PACKET.md | running |
| harvest | ecosystem infra-mechanism research ONLY, no code; routes to owning lanes | ~/workspace/ping-infra/harvest/INFRA-HARVEST-LEDGER.md + PACKET.md | running |
| kill-lib | shared failure-injection / honest-recovery test library for gauntlets | ~/workspace/ping-infra/kill-lib/diffs/kill-lib-v1.diff + PACKET.md | running |

## Rules
- Gaps only; never re-litigate wave/ORCA/FYD/sprint territory.
- One writer per mutable semantic unit; massive read parallelism, bounded mutation.
- Every infra piece ships with kill tests (process death, restart, concurrent claim, stale state).
- No DB schemas, Oracle migration, event queues, secrets, deployment infra touched destructively.
- Escalate only: credentials/authorization, irreversible destruction, product intent, policy changes, production P0, canonical corruption risk, security-authority changes.
