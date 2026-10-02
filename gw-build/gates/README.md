# Gateway regression gates

Permanent gates added 2026-09-24 on branch `gateway/auth-repair-20260924`
(Lane GW-BUILD). Provenance: the 2026-09-24 promotion runbook shipped a
gateway commit whose HTTP auth posture was dropped and never preserved as a
regression gate, and whose worker retry identity reminted verdict event_ids.
These gates make those regressions fail loudly instead of silently.

Run from the repo root (or set JEV_SURGICAL to the tree under test):

- `node gateway/regression-gates/repro-witness-remint.mjs`
  W-1: WitnessWorker.handle twice on the same trigger must converge on one
  WITNESS_CREATED event_id. Exit 0 = converged, 2 = remint reproduced.
- `node gateway/regression-gates/gate-replay-converge.mjs`
  W-2: ReplayWorker.handle twice on the same trigger must converge on one
  REPLAY_COMPLETED event_id with deduplicated:1. Exit 0 = converged.
- `GW_BASE_URL=http://127.0.0.1:8080 ./gateway/regression-gates/gate-auth-posture.sh`
  Auth posture: the 7 exterior routes (/events, /canonical-events, /ingest,
  /orchestration, /missions, /ai, /connectors) must return 401 for
  unauthenticated and wrong-key requests. Requires a running gateway built
  from the repaired tree.

Notes

- The .mjs gates use the REAL UnifiedEventRuntime and the REAL workers with a
  fake pg pool (exact ON CONFLICT DO NOTHING semantics). No network, no
  database, no credentials.
- `JEV_SURGICAL` overrides the tree root (kept for the original scratch
  harnesses); default is the enclosing repo root.
- The auth-posture gate needs a live server; point GW_BASE_URL at any scratch
  instance built from the repaired tree.
