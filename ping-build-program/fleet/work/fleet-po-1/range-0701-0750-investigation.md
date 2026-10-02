# Range 0701-0750 investigation (fleet-po-1, 2026-09-24 UTC)

## Mission family
ORA-0701..ORA-0750: family `cold-boot` (50 of 150).
"Cold boot: {service} — full host power-cycle to serving"
Objective: service must reach serving state after a full cold boot with no manual intervention.
Pass: cold boot completes within budget; dependency order respected; FAIL on any manual step.

## Item mapping (verified from generator source)
gen_matrices.py: cold-boot family = ORA-0651..ORA-0800, items = ORA_SVCS (15 services),
mission ORA-N maps to ORA_SVCS[(N-651) % 15]. Mapping computed deterministically;
spot-checked ORA-0701 -> js-worker-b and ORA-0750 -> scheduler against the matrix titles: match.

## Host inventory (personally verified, read-only, baseline untouched)
Probe 2026-09-24T02:52Z via oracle-ssh.sh -s (read-only `docker ps -a` + `docker images`):
- Containers: p18-scratch-pg, ping-gateway, ping-gateway-candidate, ping-gateway-prev-84486f056,
  ping-postgres (Up 2d, healthy), ping-qdrant (Up 4d, healthy)
- Images: node:18-alpine, node:20-alpine, node:24-alpine, ollama/ollama:latest,
  ping-gateway:candidate-3c5d280dd, ping-gateway:candidate-84486f056,
  postgres:17-alpine, qdrant/qdrant:v1.7.0
- Corroborates fleet-ora-2's 02:33Z probe (range-0201-0250-investigation.md).

## Classification
REAL on host (4): postgres, qdrant, ollama, gateway -> 12 missions
  (ORA-0711..0714, ORA-0726..0729, ORA-0741..0744).
  The pass criterion requires a FULL HOST POWER-CYCLE. That is host state change on the
  live production Oracle host — destructive by definition. Per the oracle rule (baseline
  sacred), this belongs on a staging ARM64 host. Verdict: NEEDS-FOLLOWUP with the exact
  harness below.
NOT ON HOST (11): js-worker-a, js-worker-b, python-adapter, event-ingest, witness,
  scheduler, backup-agent, health-monitor, log-shipper, reverse-proxy, cert-renewer ->
  38 missions. No container, image, or (per fleet-ora-2's 0401-0450 probe) systemd/compose
  artifact. A cold boot of a nonexistent service is unexecutable.
  Verdict: N-A with justification (synthetic matrix subject, same defect class as the
  reproducibility component-N and image-provenance findings).

## Exact followup harness (staging ARM64 host with docker; NEVER ping-core-01)
For each of postgres:17-alpine, qdrant/qdrant:v1.7.0, ping-gateway:<candidate digest>,
ollama/ollama:latest on a staging host mirroring production compose:
  1. Record pre-boot state: `docker ps --format` + health status of each service.
  2. Power-cycle the staging host (full power off/on, not `docker restart`).
  3. From power-on, timestamp each service's transition to serving/healthy with zero
     manual commands issued.
  4. PASS: every service serving within its budget, dependency order respected
     (postgres/qdrant healthy before gateway), zero manual steps.
     FAIL: any manual intervention, any service exceeding budget, wrong start order.
  5. Record the journal/boot log diff as evidence.
No live volumes on staging; throwaway data volumes only.

## Verdicts
38 x N-A (justified above); 12 x NEEDS-FOLLOWUP (harness above). No builds, no restarts,
no state change performed on the live host.
