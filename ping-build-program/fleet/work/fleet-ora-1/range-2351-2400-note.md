# Health-semantics range note (fleet-ora-1, 2026-09-24T03:26:19Z)

Read-only health observations on ping-core-01 (no dependency taken down):
  gateway  http://127.0.0.1:8080/health  -> 200
  qdrant   http://127.0.0.1:6333/healthz -> 200 ('healthz check passed')
  postgres pg_isready (docker exec) -> accepting connections

Endpoints exist and report healthy at rest. The mission criterion (report unhealthy when a
critical dependency is down; FAIL on 200-OK-while-broken) cannot be tested against the live
baseline because it requires killing a dependency = failure injection against certified state.
Non-deployed services (ollama, js-worker-a/b, python-adapter, event-ingest, witness, scheduler,
backup-agent, health-monitor, log-shipper, reverse-proxy, cert-renewer) have no health endpoint
at all; criterion unevaluable without fabricating a deployment.
