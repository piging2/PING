# Partial dependency loss contract (fleet-ora-2, 2026-09-24)
Owner: Nolan (PING Social). The worker never induces dep failures on live; live
drills are owner-executed. /health showed 3/3 healthy on 2026-09-24 (mechanism live).

## Rules
1. One dep down -> a typed FAILURE_CLASS surfaces (ECONNREFUSED/timeout/DEADLINE),
   never a silent empty result.
2. No hang without a deadline: every dep call carries a bounded timeout
   (postgres 5s connect, qdrant 10s, HTTP integrations 15s).
3. /health flips to unhealthy when a critical dep is down (postgres, qdrant are
   critical; posthog/email are degraded-but-healthy).
4. Dep restored -> the service heals without a restart (connection pools retry
   with backoff; /health flips back on the next check).

## Per-subject notes
- gateway loses postgres/qdrant: typed 503/500 FAILURE_CLASS, /health unhealthy.
- gateway loses one /health integration (posthog/email): DEGRADED (not unhealthy).
- postgres/qdrant lose volume (disk full): typed "database or disk is full"
  (proven in the disk-pressure drill); service refuses writes, stays queryable.
- worker-digestion loses postgres / worker-projection loses qdrant: typed
  failure, bounded retries, no silent skip (design-spec).
- backup design loses the off-host scp target: typed failure, local artifact
  retained, retry scheduled (design-spec).
- gateway loses .env: fails closed at startup with a typed error (startup contract).
- qdrant loses journald: container fails to start with a typed driver error.
- postgres healthcheck failing: /health -> unhealthy (design).
- gateway OOM under load: no memory limits today (risk); the design adds limits
  so OOM is a loud exit-137 (documented in restart-semantics.md).
- containerd/docker daemon loss: running containers keep running; management
  commands fail typed. Owner drill.
- DNS loss in the bridge: typed resolution failures; deadlines prevent hangs.
