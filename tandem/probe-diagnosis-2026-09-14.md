# PING probe PSQL_FAILED diagnosis, 2026-09-14

## Symptom
During the 2026-09-14 business-agent sync run (RD-20260914-04, 20:07:42 UTC),
`business-context.py` reported `RETRIEVAL STATUS: UNCHECKABLE` with probe
error `PSQL_FAILED` for "Captain Ron Handyman L.L.C.". The fresh audit
re-ran the brief at ~20:09 UTC and reproduced the failure ("deterministic
on re-run"). Routing correctly carried the uncertainty forward as
UNCHECKABLE rather than PASS.

## Root cause
Not the egress proxy, not Postgres readiness, not credentials, not the
gateway container. It was a result-classification bug in `pg_probe.py`.

`_query_once` treated any empty stdout (with ssh rc==0) as `PSQL_FAILED`:

```python
if not out or "PSQL_FAILED" in out:
    raise ProbeError("PSQL_FAILED")
```

A SELECT that matches zero rows produces zero psql output lines, so the
base64 payload is the empty string, so stdout is empty. The probe therefore
reported "psql failed" for the perfectly healthy case "no rows match".

The sync query was an ILIKE substring lookup for "Captain Ron Handyman
L.L.C." in `ping_events.payload->>'observation'`. That business has no
accepted PING events, so the query legitimately returns zero rows, and the
probe misclassified it as a failure. Reproduced directly:

- `query_events("SELECT count(*) FROM ping_events")` -> OK, 1983 rows
- `query_events("... WHERE event_id = 'no-such-event-xyz'")` -> PSQL_FAILED
  (pre-fix; zero rows misclassified)

This also explains "deterministic on re-run": for a fixed query key and a
fixed store, zero rows is deterministic, not flaky.

## Ruled out
- Proxy drops: containers reachable, ssh rc==0 on the failing runs; the
  known proxy failure mode (dropped connections) surfaces as rc!=0, which
  takes the separate "probe execution failed" path.
- Postgres / gateway health: at failure time `ping-postgres` was
  `Up 6 hours (healthy)` (6 weeks uptime) and `ping-gateway` was `Up 4 hours`;
  the PG log shows the server actively rejecting bad statements at
  19:58:13-39 UTC and 20:11:53 UTC, i.e. it was up and serving.
- Credentials: resolved from the container env at runtime; count(*) queries
  through the identical credential path succeeded throughout.

## Fix (pg_probe.py, small and evidence-backed)
1. The remote PowerShell script now emits an explicit plain-text sentinel
   `EMPTY_RESULT` when the result set is empty (`_` cannot appear in base64
   output, so it cannot collide with real rows). The client maps it to `[]`.
2. Added `-v ON_ERROR_STOP=1` to the psql invocation. Without it, a genuine
   SQL error exits 0 under `psql -f`, which after fix (1) would have been
   masked as "zero rows" (verified live: a bad-column query returned `[]`
   before this part of the fix). Now SQL errors exit nonzero and are typed
   `PSQL_FAILED`, fail-fast per the module contract ("SQL-layer failures
   fail immediately"; `query_events` skips retry on PSQL_FAILED).
3. On psql failure the remote script writes the `PSQL_FAILED` sentinel and no
   longer `exit 1`, so the sentinel reaches the client's stdout check with
   ssh rc==0 and is raised immediately instead of being retried as a generic
   transport error. Transport failures (ssh rc!=0, decode failures) keep the
   existing retry-with-backoff path.
4. An unexplained empty stdout with rc==0 still raises PSQL_FAILED
   (fail-closed; a truly empty stream is never read as "no rows").

No new schedulers, databases, or authorities. No credentials stored; the
runtime env resolution path is unchanged. Both consumers
(`business-context.py`, `entity-dossier.py`) treat `[]` as a normal empty
result.

## Verification
- Zero-row query -> `[]` (was PSQL_FAILED).
- `SELECT count(*) FROM ping_events` -> 1983, unchanged.
- ILIKE query with matching rows -> rows returned, unchanged.
- Bad-column query -> `ProbeError: PSQL_FAILED` in 2.5s, fail-fast, no
  wasted retries (SQL-layer failure still typed as failure).
- End to end: `business-context.py "Captain Ron Handyman L.L.C."` now
  reports `RETRIEVAL STATUS: OK` with "(no ping_events rows mention this
  business)"; consumed fields still fail closed (no accepted event), which
  is the correct honest state.
- Consistency: 5 consecutive probe runs (count(*) + the exact Captain Ron
  ILIKE, 15s spacing): identical results every run, 1983 and [].

## Residual notes
- PG log shows unrelated bad statements from other clients around the
  window: double-backslash `ESCAPE '\\\\'` queries at 19:58:13-39 UTC
  (invalid escape string; from an older business-context build, since the
  current code emits single-backslash `ESCAPE '\'` which works), a
  `FATAL: role "\" does not exist` at 19:58:59 UTC (mangled auth from an
  older probe build), and `column "id" does not exist` at 20:11:53 UTC
  (wrong-column query from another caller). None of these involved the
  current pg_probe path; noted here so they are not re-investigated.
- `business-context.py` still retries the whole `query_events` call 3x with
  10s sleeps on ProbeError, so a genuinely transient PG blip is still
  absorbed at the caller layer.

## Conclusion
PING_CHECK can be relied on as a live check again. The failure was a
client-side classification bug, now fixed and proven: zero rows is `[]`,
real SQL errors are `PSQL_FAILED` (fail-fast), transport errors keep
retry-with-backoff, and an anomalous empty stream stays fail-closed.
