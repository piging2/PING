# Range 0651-0700 investigation (fleet-ora-2, 2026-09-24 UTC)

## Mission family
ORA-0651..0700: family cold-boot (rounds within the 150-mission family).
"Cold boot: {it} — full host power-cycle to serving"
Pass criterion: "Cold boot of {it} completes within its budget; order dependencies respected; FAIL on any manual step."

## Hard boundary
A real power-cycle test of the production Oracle host (ping-core-01) is out of scope for a fleet worker:
irreversible-ish, P0, operator-approval-only. It was NOT attempted. The criterion was therefore ADAPTED to
the strongest read-only proxy available: docker restart policy + boot enablement + volume durability.

## Evidence (read-only SSH probes, 02:59Z)
- ping-gateway: RestartPolicy=unless-stopped
- ping-postgres: RestartPolicy=unless-stopped; named volume oracle_pgdata -> /var/lib/postgresql/data (durable)
- ping-qdrant: RestartPolicy=unless-stopped; named volume oracle_qdrant_storage -> /qdrant/storage (durable)
- systemctl is-enabled docker -> enabled; systemctl is-enabled containerd -> enabled
-> After a clean host reboot, the docker daemon will come up and all three containers will auto-restart
   with their data volumes intact, with zero manual steps. That satisfies the "completes without manual
   intervention" clause as a proxy.

## Honest gaps (why ADAPT, not PROVEN)
1. No actual power-cycle was performed; proxy evidence only.
2. "Order dependencies respected" is UNVERIFIED: restart policies do not enforce startup order
   (gateway depends on postgres+qdrant logically, but nothing orders their restarts). If gateway wins the
   race, it may fail its first connection attempts; whether it retries is unverified here.
3. No per-service cold-boot time budget exists on record, so "within its budget" cannot be checked.
4. RestartPolicy=unless-stopped does NOT restart containers that were manually stopped before the reboot.

## Verdicts
- postgres, qdrant, gateway: ADAPT (auto-restart proxy evidence above; gaps listed).
- js-worker-a/b, python-adapter, event-ingest, witness, scheduler, backup-agent, health-monitor,
  log-shipper, reverse-proxy, cert-renewer, ollama: N-A (not deployed on the host; ollama has an image
  but no service; nothing to cold-boot).

## Followup (ADAPT verdicts)
Scheduled, operator-approved maintenance window: full host reboot, measure per-service time-to-serving,
record startup order vs. dependency graph, verify gateway retries or add depends_on/restart ordering.
Exact: schedule reboot; `docker events --since <t>` on recovery; compare order; file result as PROVEN or REJECTED.
