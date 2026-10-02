# Range 1151-1200 investigation (fleet-ora-2, 2026-09-24 UTC)

## Mission family
ORA-1151..1200: family partial-dep-loss (first 50 of 150; family spans ORA-1151..ORA-1300).
"Partial dependency loss: {it} — one dependency down, service degrades loudly"
Pass criterion: "Kill one dep of {it}: typed FAILURE_CLASS surfaces; FAIL if empty success or hang without deadline."

## Hard boundary
Killing a dependency (e.g., stopping postgres while the gateway serves) on the live Oracle host is failure
injection against the certified baseline. Not attempted. NEEDS-FOLLOWUP with the staging harness below.

## Dependency map (read-only, from /opt/ping tree inspection + compose knowledge)
- gateway -> postgres (event store / canonical persistence), qdrant (projections/vectors)
- postgres -> (none internal; host filesystem via named volume)
- qdrant -> (none internal; host filesystem via named volume)
Exact failure classes are defined by lane K's taxonomy (AUTH_REQUIRED/EXPIRED, PERMISSION_DENIED,
RATE_LIMITED, SOURCE_UNAVAILABLE/CHANGED, SCHEMA_CHANGED, INVALID_PAYLOAD, CONFLICT, TIMEOUT, TRANSIENT,
PERMANENT); the gateway should surface SOURCE_UNAVAILABLE or TIMEOUT, never silent empty success.

## Exact followup harness (staging clone, never the live baseline)
  1. Staging clone of the 3-service stack with production-equivalent data.
  2. For gateway: stop postgres container (kill one dep). Send gateway requests that need the event store.
     EXPECT: typed failure (SOURCE_UNAVAILABLE/TIMEOUT per lane K) with a bounded deadline.
     FAIL: empty 2xx success with missing data, or hang past the deadline.
  3. For gateway: restart postgres, stop qdrant. Send projection/query requests. Same expectation.
  4. For postgres: fill its data volume to read-only? No -- out of scope for this family (see disk-pressure).
  5. Record the exact failure class surfaced per dep-loss case; file PROVEN (typed, bounded) or REJECTED.

## Verdicts
- postgres, qdrant, gateway: NEEDS-FOLLOWUP with the harness above.
- js-worker-a/b, python-adapter, event-ingest, witness, scheduler, backup-agent, health-monitor,
  log-shipper, reverse-proxy, cert-renewer, ollama: N-A (not deployed; no dependency graph to break).
