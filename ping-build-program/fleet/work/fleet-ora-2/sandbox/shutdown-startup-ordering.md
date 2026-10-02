# Shutdown/startup ordering (fleet-ora-2, 2026-09-24)
Owner: Nolan (PING Social). Design-spec; the live topology has NO ordering
guarantee today (unless-stopped restarts in arbitrary order; documented gap).

## Startup order (design)
1. postgres -> healthy (pg_isready)
2. qdrant -> healthy (/readyz; TCP today)
3. gateway -> starts only after both are healthy (depends_on, healthy condition)
4. No container serves traffic before its healthcheck passes.

## Shutdown order (design)
1. gateway stops first (drains in-flight requests, 30s deadline)
2. qdrant stops
3. postgres stops last
Reverse dependency order; the stores never go down while the gateway is serving.

## Verification
- Startup order verified in logs (scratch compose): the compose up log shows
  postgres healthy -> qdrant healthy -> gateway started.
- Zero orphaned in-flight work after the cycle: journal/log diff procedure
  (restart-semantics.md).

## Live gap (documented)
unless-stopped restart order has no ordering guarantee; the gateway may race
postgres on cold boot. The depends_on + healthcheck design closes it.
