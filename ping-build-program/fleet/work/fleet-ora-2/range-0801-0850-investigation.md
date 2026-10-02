# Range 0801-0850 investigation (fleet-ora-2, 2026-09-24 UTC)

## Mission family
ORA-0801..0850: family restart-semantics (first 50 of 200; family spans ORA-0801..ORA-1000).
"Restart semantics: {it} — warm restart preserves in-flight guarantees"
Pass criterion: "Restart {it} mid-load: zero acknowledged-work loss, state consistent; evidence from journal diff."

## Hard boundary
Warm-restarting production postgres/qdrant/gateway MID-LOAD on the live Oracle host is a failure-injection
test against the certified baseline. Not attempted. Verdicts below are NEEDS-FOLLOWUP (harness specified)
for the 3 deployed services and N-A for everything else.

## Exact followup harness (staging arm64 host with a CLONE of the deployment, never the live baseline)
Per service (postgres, qdrant, gateway):
  1. Stand up the staging clone with production-equivalent data volumes (restore from backup; never mount live volumes).
  2. Generate steady synthetic load: for postgres, pgbench -c 8 -t 10000; for qdrant, parallel upsert/query loop;
     for gateway, a request loop with acknowledgements logged client-side (request id -> ack).
  3. Mid-load: docker restart <container> (warm restart).
  4. After ready: diff client-side ack journal against server-side applied journal.
     PASS: every acknowledged write is present; state consistent; zero acknowledged-work loss.
     FAIL: any acked write missing, duplicate application, or state corruption.
  5. Repeat 3x per service; record container restart time (stop->ready) as the restart budget datapoint.
For the gateway specifically: acknowledged work = API responses returned 2xx to the load client; verify each
has a corresponding canonical event in postgres after restart (joins the journal-diff evidence).

## Verdicts
- postgres, qdrant, gateway: NEEDS-FOLLOWUP with the harness above.
- js-worker-a/b, python-adapter, event-ingest, witness, scheduler, backup-agent, health-monitor,
  log-shipper, reverse-proxy, cert-renewer, ollama, db-warm, gateway-warm, worker-warm, adapter-warm,
  proxy-warm: N-A (not deployed on the host; nothing to restart).
