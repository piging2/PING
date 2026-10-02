# Canonical read fallback contract (fleet-ora-2, 2026-09-24)
Owner: Nolan (PING Social). The worker never takes down qdrant on live; the
fallback behaviors below are design contracts, verified by reading the gateway's
/health integration status (3/3 healthy, 2026-09-24).

## Rules
1. A degraded read is labeled DERIVED, never canonical. (Source truth vs derived
   truth are never silently interchangeable.)
2. A stale read is labeled STALE with an as-of timestamp (the timestamp of the
   last successful canonical read).
3. A fallback is never served silently as fresh: the label travels with the
   response (header + body field).
4. /health reflects degraded integrations honestly (integration status flips to
   degraded/unhealthy; the mechanism is live).
5. The fallback path has its own deadline (shorter than the canonical path:
   e.g. 5s fallback vs 15s canonical) so a slow fallback cannot wedge the request.

## Example: gateway reads when qdrant is down
- Canonical path: qdrant vector search, deadline 15s.
- On failure: typed QDRANT_UNAVAILABLE; the gateway falls back to the postgres
  keyword cache (DERIVED label, as-of timestamp of the last qdrant sync).
- If the fallback also fails: typed 503, no silent empty result.
