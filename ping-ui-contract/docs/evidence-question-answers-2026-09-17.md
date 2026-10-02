# Incremental answers to Nolan's evidence questions (PING UI contract program)

Only questions the captured evidence actually supports are answered. The rest are skipped, not manufactured. All citations are files under ~/workspace (or the /tmp scratch copies of them).

## 1. Actual live gateway base URL from an authorized environment

`http://localhost:8080` on the Pig loopback. Verified 2026-09-17: `GET http://localhost:8080/health` returned 200 and `POST /events` with a live Bearer returned 200 with canonical event_id `3586f5ee8176bb708bfd4d4d4733f3e89a3ac2ab2c21d228b4db9e8cf3f80692` (PHASE0_CREDENTIAL_ROTATION_2026-09-17.md, proofs 1-4). Second authorized path: `http://100.79.154.43:8080` over Tailscale (PHASE4_PIPELINE_COMPLETION_RECORD.md sec 3). The container binds `http://0.0.0.0:8080`. From this cloud host the gateway is unreachable (egress proxy closes Pig SSH).

## 2. Which /mc/* routes are evidenced

Only two things are evidenced, and the enumeration is conflicted (contradiction R-5 in UI_HARVEST_SPEC_2026-09-17.md):
- `GET /mc/scheduler`: status-read only. No `/schedule`, `/cron`, `/jobs`, `/tasks` routes exist (interop-audit-2026-09-13.md sec Scheduling:101).
- The `/mc/*` family as a whole: interop-audit:85 describes "dashboard incl. queues/scheduler/workers reads"; census-2026-09-13.md:56 describes "unpaid invoices, inboxes, queues, follow-ups". Both agree: public, unauthenticated, GET-only, read-only-but-sensitive. Likely both true (different sub-routes), but no single authoritative route listing was found. Backend per P-02: MissionRuntime, MissionScheduler, DeadLetterAuthority, WorkerRuntime. gateway/routes/mission_control.js:242 is required by DeadLetterAuthority and the gateway bootstrap (thread-handoffs.md:247,260).

## 3. Whether the gateway exposes route metadata or routes must be classified manually

Routes must be classified manually. No route-listing or route-metadata endpoint is evidenced anywhere in the sources. The closest thing is `GET /discover` (auth), which discovers *capabilities* (the /capabilities contract), not routes (interop-audit-2026-09-13.md sec 2). Route knowledge today comes from three manual sources: code comments listing routes (orchestration.js header), live probes (401/200 behavior), and mount tables in gateway_runtime.js. This inventory is itself a manual classification and will drift unless a route-metadata endpoint is built.

## 4. Canonical mission identifier

On the live spine it is a deterministic 16-hex hash, idempotent by construction. mission_runtime.js.live-20260917 lines 63-76: `mission_id = sha256(missionType:event_id or missionType:canonical_payload)`, hex digest sliced to 16 chars, `INSERT ... ON CONFLICT (mission_id) DO NOTHING`. Same event always produces the same mission.

Competing schemes (conflict, not merged):
- ORCA route-created missions: `mission_<epochMs>_<rand6>` (ad-hoc, no identity authority involved; orchestration.js:53).
- ORCA compiler-created missions: `msn_<sha16>` deterministic on type+overrides (mission_compiler.js:180).
- Observed live from authenticated POST /missions (2026-09-12): mission `3e6a7b3b453b1d98` (16 hex, consistent with the spine hash format).

Verdict: the spine's 16-char deterministic hash is the canonical mission identifier for the production mission system; the ORCA schemes belong to the separate, orphaned engine.

## 5. Canonical approval identity

A named human recorded in the revision node's `required_approver` / `decided_by` fields. Concrete instance: playbook revision node `194a2b85bde957ed` carries `{decision:'PENDING_HUMAN', required_approver:'Nolan Geske (human)', decided_by:null}` (PLAYBOOK_SPEC.md:78-79; REPORT.md:69). The approval identity is therefore not a role or a key: it is a human name on the node, and `decided_by` stays null until that human acts.

## 6. What owns PENDING_HUMAN

The playbook knowledge lifecycle. Backend authorities: KnowledgePromoter + KnowledgeGraph (+ EvidenceAuthority) (UI_HARVEST_SPEC_2026-09-17.md P-09). The PENDING_HUMAN state lives on the knowledge node itself: node status `candidate`, decision `PENDING_HUMAN`, with a named human required approver. There is no UI surface for it (approvals are POSTed events only); the backend logic is verified but the ordinary production path to it is broken (see next answer).

## 7. What happens after SNIPPET_APPROVED today

What is *supposed* to happen: KnowledgePromoter.handle() flips the node status to `approved` with confidence 1.0 (PLAYBOOK_SPEC.md:55-56). This was verified live through an in-container harness against the real deployed promoter, real persisted approval event, and real Postgres: it returned `promoted: true, status: approved` (REPORT.md:44).

What *actually* happens through ordinary production wiring: nothing. `SNIPPET_APPROVED` is in neither `EVENT_MISSION_MAP` nor `MISSION_WORKER_MAP`, so the normal runtime cannot dispatch to the promoter (REPORT.md:105, "Proven by code inspection"). This is a proven P0 wiring gap (REPORT.md finding 2/3). So today the only proven path from SNIPPET_APPROVED to an approved node is the harness invocation, not the HTTP event or scheduler path. The gate logic is proven; the production route to it is not closed.

## 8. Authoritative health surface

`GET /health`. Verified 200 on 2026-09-17 after the credential recovery (PHASE0 report, proof 2). Its semantics are honest but thin:
- Boot probe: a single `SELECT 1` with `connectionTimeoutMillis: 3000`, no retry, no recovery (gateway_runtime.js:141, per thread-handoffs.md:258).
- When Postgres is down but the gateway is up: the PG-dependent mounts (/events, /context, /api/v1/repository, /system, /canonical-events, /tenants, /deployments, /runtime, /ingest) return 503 `{error:'Postgres unavailable', degraded:true}` (gateway_runtime.js:692-700).
- During startup failure (the 2026-09-17 crash loop): /health is connection-refused because the gateway never completes startup; ephemeral degraded-mode keys were generated in logs but were never usable and were destroyed with the container recreate.

Supplementary public health reads: `/ops/health` and `/ops/drift` (200, SAFE_PUBLIC). Known-broken, not regressions: `/ops/status` -> 500, `/constitution/graph` -> 503.

## 9. Gateway error taxonomy

HTTP layer (all evidenced live or in code):
- 401: anonymous request on an ExteriorAuthMiddleware route (/events, /canonical-events, /ingest, /missions). The Pig watchdog treats 401 on /events as the healthy-boundary signal.
- 403 `Invalid namespace`: malformed namespace on POST /events; must be `core::<name>` or `tenant::<id>` (PHASE0 boundary behavior).
- 422: unknown `event_type` on POST /events (PHASE0).
- 400: missing required field on orchestration POSTs (e.g. `type is required`, `workerId is required`, `diff is required`); 404 `Mission not found` on /orchestration/missions/:id reads.
- 403 `FORBIDDEN` with "requires the level-2 workspace-write principal": only in the hardening build's requireLevel2 (not proven in production).
- 500 `{error}`: emit failure thrown through asyncHandler (route_middleware); also the broken `/ops/status` (empty body) and `/constitution/graph`.
- 503 `{error:'Postgres unavailable', degraded:true}`: PG-dependent mounts when Postgres is down.

Deterministic failure envelope codes (gateway/deterministic_failure_envelope.js ~105-116): UNKNOWN, AUTHORITY_ERROR, COMPILATION_ERROR, VALIDATION_ERROR, REPLAY_ERROR, WITNESS_ERROR, STORAGE_ERROR, NETWORK_ERROR, PARSING_ERROR, HASH_ERROR.

Replay failure codes (gateway/replay/kernel/deterministic_failure.js:18-52): PARENT_NOT_FOUND, DUPLICATE_EVENT_ID, DUPLICATE_ARTIFACT_ID, INVALID_LINEAGE_*, UNKNOWN_EVENT_TYPE, DUPLICATE_LEAF_ID, EXECUTION_LIMIT_EXCEEDED, CANONICALIZATION_ERROR, INVARIANT_VIOLATION, CYCLE_DETECTED, FORBIDDEN_EDGE_DETECTED, INTERNAL_ERROR; phases STATE_TRANSITION / LINEAGE_VALIDATION / CANONICALIZATION / WITNESS_GENERATION / INVARIANT_CHECK / MERKLE_CONSTRUCTION.

## 10. What happens to /events when Postgres is unavailable

Two evidenced behaviors, depending on how far startup got:
- Gateway up, Postgres down: `POST /events` (and the other listed mounts: /context, /api/v1/repository, /system, /canonical-events, /tenants, /deployments, /runtime, /ingest) returns 503 `{error:'Postgres unavailable', degraded:true}` (thread-handoffs.md:258, gateway_runtime.js:692-700).
- Gateway mid-startup with Postgres unreachable (the 2026-09-17 crash loop): the gateway never completes startup, /health is connection-refused, and ephemeral degraded-mode API keys were generated in logs but never usable externally; the crashed container and its logs were destroyed by the recreate (PHASE0 security incident section).

Silent-durability caveat (proven in code, thread-handoffs.md crash matrix): if the pool is null, `emit()` skips the INSERT entirely and still returns `{status:'ok'}`. So `{status:'ok'}` means "accepted into the spine," not "durably delivered."

## 11. The three coexisting success shapes

Proven in thread-handoffs.md (failure vocabulary table and the note at :271): three different success shapes coexist with no mapping between them:
- `{status:'ok'}`: UnifiedEventRuntime.emit() result (canonical event emission). Also `{status:'error'}` on emit failure.
- `{success:true}`: AppendOrchestrator artifact-append result (artifacts; also the tool-router response shape via supervisor.py).
- `{status:'completed'}`: ExecutionRuntime execution report status (executions; alongside pending/processing/failed).

Nuance from the crash matrix: `{status:'ok'}` is returned even when the INSERT was skipped for lack of a pool and even when downstream handler/integration delivery failed silently. "ok" is acceptance, not durability. No unification exists; a UI must not treat these three shapes as interchangeable.
