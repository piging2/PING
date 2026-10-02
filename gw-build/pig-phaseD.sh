#!/usr/bin/env bash
# GW-BUILD Phase D: commit the repair on gateway/auth-repair-20260924. No push.
set -u
WT=/home/nolan/ping/worktrees/gw-repair-build
cd "$WT"
echo "=== branch ==="
git branch --show-current
echo "=== status before add ==="
git status --short
git add gateway/exterior_auth_middleware.js \
        gateway/bootstrap/gateway_runtime.js \
        gateway/routes/events.js \
        ping-runtime/workers/canonical_workers.js \
        ping-runtime/events/event_bridge.js
echo "=== staged ==="
git status --short
git diff --cached --stat
git commit -m "gateway: restore exterior auth posture + retry identity + bridge tenant-namespace

Three repairs backported and scratch-proven by Lane GW-REP against
fffe99f7a, applied here to a clean checkout on a new branch:

1. Exterior-agent auth boundary (P1): backport
   gateway/exterior_auth_middleware.js byte-identical from
   constitutional-convergence-v2, wire it in gateway_runtime, and mount its
   middleware on the 7 exterior routes (/events, /canonical-events, /ingest,
   /orchestration, /missions, /ai, /connectors). Unauthenticated and
   wrong-key requests now get 401. Also adds an optional namespace read
   filter on GET /events (core::<name> | tenant::<id> syntax enforced).

2. Worker retry identity (P2 / W-1, W-2): BaseWorker._emit defaults
   logical_id to eventType:causation_id so a retried handle() converges on
   the same event_id instead of reminting one per wall-clock attempt;
   explicit options.logical_id still overrides.

3. EventBridge tenant-namespace (P3 / Lane H): _bridgeCanonicalEvents maps
   canonical_events.tenant_id to the enforced spine namespace
   (tenant::<slug>); malformed/null tenant_ids fall back to core::system
   with metadata.tenant_unknown=true instead of silent laundering.

Provenance note: the 2026-09-24 promotion runbook shipped fffe99f7a with
the 401 posture dropped and never preserved as a regression gate; the
middleware is restored from the constitutional-convergence-v2 hardened
variant (does not log key material)."
echo "=== log ==="
git log --oneline -2
echo "=== status after (must be clean) ==="
git status --short
echo "HEAD=$(git rev-parse HEAD)"
