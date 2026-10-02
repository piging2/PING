# Range 0401-0450 investigation (fleet-ora-2, 2026-09-24 UTC)

## Mission family
ORA-0401..0450: family dependency-completeness.
Each service must start with zero undeclared or missing runtime dependencies on ARM64.
Pass criterion: starts in an isolated container with only declared deps; missing-dep failure is FAIL, not a skip.

## Method
Read-only SSH probes via oracle-ssh.sh stdin pipe against 129.146.60.17. Baseline untouched; no containers started.

## Finding 1: most named services do not exist on the Oracle host
docker ps -a shows only: ping-gateway, ping-postgres, ping-qdrant (running), plus exited candidates/scratch.
systemd running: only unified-monitoring-agent matches infra keywords.
The mission names js-worker-a, js-worker-b, python-adapter, event-ingest, witness, scheduler,
backup-agent, health-monitor, log-shipper, reverse-proxy, cert-renewer -- NONE of these exist as
containers, systemd units, or compose services on the host.
Verdict for these 10: N-A with justification (no deployed artifact to isolate-start).

## Finding 2: four services exist but the isolation test is not safe on the live host
postgres (ping-postgres, Up/healthy), qdrant (ping-qdrant, Up/healthy), gateway (ping-gateway, Up),
ollama (image ollama/ollama:latest present; no running container).
The criterion requires STARTING each in an isolated container with only declared deps. That is host state
change on the live production Oracle host (2 CPUs, live baseline): port conflicts, memory pressure, and
volume-mount risk against live data. Per the oracle rule (baseline sacred, no destructive remote ops),
this belongs on a staging host, not here. Verdict: NEEDS-FOLLOWUP with exact commands below.

## Exact followup harness (staging arm64 host with docker, never the live baseline)
For each of postgres:17-alpine, qdrant/qdrant:v1.7.0, ping-gateway:<candidate digest>, ollama/ollama:latest:
  1. Extract declared deps from the service compose/Dockerfile or /opt/ping/config (env.schema, placements.json).
  2. docker run --rm --network none --name depcheck-<svc> <image> <start-cmd>
  3. Then re-add each declared dep exactly once on a dedicated network; no host network.
  4. PASS: service reaches ready/health with declared deps present and nothing else.
     FAIL: crash on missing dep (record dep name), or starts with an undeclared dep pulled in (record it).
  5. Never mount live volumes; use fresh throwaway volumes; remove containers after.
Gateway note: declared deps include postgres+qdrant endpoints; wire those as the ONLY network peers.

## Verdicts
N-A for the 10 nonexistent services; NEEDS-FOLLOWUP for postgres, qdrant, ollama, gateway with the harness above.
