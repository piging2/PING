# TRACK D2 — Boundaries Verification Report
**Sprint:** PING 12-hour harvest, 2026-09-18
**Specialist:** TRACK D2 (approval, social drafts, UI honesty, Oracle readiness)
**Worktree:** `/home/nolan/worktrees/ping-harvest-12h` (branch `sprint/harvest-12h`, HEAD `8fe3b8060`)
**Window worked:** ~05:15–06:30 MDT 2026-09-18
**Method:** READ-ONLY verification (zero worktree files modified, nothing pushed). Code inspection + unit tests executed live on the Pig (node). No live gateway/Postgres boot was available, so runtime claims marked accordingly.

---

## TASK 13 — APPROVAL TIER: ROUTED, not ENFORCED

**Verdict: Approval is ROUTED. It is not ENFORCED at any execution gate. The approval tier remains theoretical.**

### The trace, link by link
1. **Approval event** → e.g. `SNIPPET_APPROVED`, emitted by a human action (UI/CLI) or by anything else that can emit it.
2. **Mission bridge** → `ping-runtime/orchestration/event_to_mission_bridge.js:75-81`: `SNIPPET_APPROVED: { missionType: 'KNOWLEDGE_PROMOTE', ... }`. The file's own comment is explicit: *"Emitting these events still requires the established authorized human action — this map only routes arrivals."* Routing only; no approval check.
3. **Mission** → `mission_scheduler.js` routes `KNOWLEDGE_PROMOTE` to the `knowledge-promotion` worker. Mission lifecycle (`mission_runtime.js`) has states `created → assigned → running → completed/failed`, plus `retry_pending`/`archived`. **There is no gated/held/pending-approval state anywhere in the codebase** (grep for PENDING_APPROVAL/AWAITING/HELD/GATED in `mission_runtime.js` and `mission_scheduler.js`: zero hits). A created mission is immediately claimable by the scheduler.
4. **Worker** → `KnowledgePromoter` (`ping-runtime/knowledge/knowledge_promoter.js`): consumes the event; the event itself IS the approval record. The worker trusts the event source — any producer emitting `SNIPPET_APPROVED` (test, gateway, direct PG insert) is routed and acted on. No approval-record lookup.
5. **Approval state machine** → `BusinessActionAuthority` + `EffectAuthority` (`ping-runtime/approval/`): real code, durable PG storage (`PostgresApprovalStore`), `PENDING_HUMAN → APPROVED/REJECTED/EXPIRED` with expiry, fail-closed when storage is unreachable. **But:** `new BusinessActionAuthority` and `new SocialPublishAdapter` appear in production code **zero times** — only in tests (`test/test_social_draft_projection.js`, `approval_effect.test.js`, `approval_restart_durability.test.js`). There is no HTTP route producing actions, no worker consulting action/effect status, and `capability_scheduler.js` (`runtime/kernel/authorities/`) contains zero approval references.

### Can a worker execute without approval where approval should be required?
**Today the question is moot, and that is exactly the finding.** There is no executable consequential capability behind the approval path at all:
- The only capability routed through the authority (`social.publish` via `SocialPublishAdapter`) terminates in a hard-disabled stub — so unapproved execution is impossible there, but only because **the capability does not exist**, not because approval enforces anything.
- Canonical workers perform no external sends (no `fetch(`/`axios`/SMTP/HTTP-post in `canonical_workers.js`).
- However, **nothing in code would stop a consequential capability added tomorrow from being wired to a mission and executed without any approval check.** The lock (state machine) is fully built; the door it would lock does not exist; and no gate consults it. If a capability were added and forgot to call the authority, there is no boundary that fails closed — the failure mode is silent execution.

**Evidence proving absence of enforcement:** (a) zero production instantiations of the authorities; (b) mission state machine has no gated state; (c) bridge comment admits it "only routes arrivals"; (d) no consumer of `getAction`/`getEffect` outside tests and the publish adapter. The sprint's own wave H37 reached the same conclusion ("zero live instantiations, no route, no producer"); this verification confirms it still holds post-harvest.

---

## TASK 14 — SOCIAL DRAFT PATH: VERIFIED, publishing hard-disabled at three REAL levels

**Verdict: The operator-triggered draft-only path is verified end-to-end. All three hard-disable levels are real code, not comments. Publishing cannot be reached. Tests pass.**

### The new path (Wave H67, commit `f52c1dd23`)
`scripts/project-social-drafts.js` — operator-invoked (`node scripts/project-social-drafts.js [--limit N]`, nothing invokes it automatically). Flow verified in source:
- Connects via `PostgresApprovalStore.fromEnv()` (pool only; `initializeSchema` **never called**).
- SELECT-only reads: already-drafted IDs from `social_drafts`, then allowlisted event types from `events` (`CLAIM_CREATED`, `REPLAY_COMPLETED`, `PROJECTION_CREATED`).
- Per event: dedicated tx client (`BEGIN`), `socialDraftProjector(event, null, {client})`, `COMMIT`; any failure → `ROLLBACK`, exit code 1 (fail closed).
- **Never calls `executeEvent()`** (which would commit new canonical events), never emits events, never references the publish adapter. Confirmed by grep: the only INSERT in the whole script path is `INSERT INTO social_drafts ... ON CONFLICT (draft_id) DO NOTHING`.

### The three hard-disable levels (all real)
1. **DDL:** `database/social_drafts.sql` line 24: `status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status = 'DRAFT')`. Database-enforced; no UPDATE path can move a draft out of DRAFT (and no migration exists).
2. **Publish adapter:** `runtime/kernel/projections/social_publish_adapter.js`: `execute()` unconditionally returns `{ published: false, reason: 'draft-only' }`. There is no platform connector anywhere in the tree — the `provider: 'stub'` in `recordAuthorizedEffect` is the only provider string. Nothing to un-stub.
3. **Review surface:** `runtime/kernel/projections/social_draft_review.js` wraps every query in a fail-closed SELECT-only guard (`asReadOnlyClient` rejects any non-SELECT before it reaches the DB); no status mutation, no external sends.

### Evidence and namespace
- Evidence provenance: projector writes `source_event_id`, `context_pack_id`, `evidence_refs` (incl. `upstreamEventId`) per row — deterministic, byte-identical across runs (test-verified).
- Namespace/principal: `rowToEvent()` maps `row.namespace`/`row.stream`, defaulting to `tenant::social`; the projector re-derives namespace from the event (never from ambient context).
- Contract tests: `test/test_social_draft_trigger.js` **8/8 pass** (executed live on the Pig: allowlist, status=DRAFT, no canonical emit, non-allowlist zero rows, idempotent re-run, fail-closed, defensive mapping, structural pins). `test/test_social_draft_projection.js` **23/23 pass** (incl. "execute is a hard-disabled stub" via `deepStrictEqual({published:false, reason:'draft-only'})`).

**Publishing stays hard-disabled; no posting was tested or enabled. No changes needed; moving on.**

---

## TASK 15 — UI HONESTY: per-widget verdicts

### Widget 1 — KnowledgeGalaxy: PASS (honest)
- Fetches real `GET /knowledge/nodes?limit=` + depth-1 `/knowledge/nodes/:id/neighborhood` from the gateway (`src/lib/gateway.ts:fetchKnowledgeGraph`); backend is `KnowledgeGraph.queryNodes()`/`getNeighborhood()` over live PG.
- Failure → error state with Retry button; `fetchKnowledgeGraph` throws on `status !== 'ok'` and **never fabricates nodes**.
- No claims of healthy/synced/persisted/verified/ready.
- Minor blemish (non-blocking): the "Replay Verified" color mode can never render green — neither the backend (`queryNodes`) nor `mapKnowledgeNode` supplies `replay_verified`, so all nodes render gray in that mode. Gray reads as "unverified," which happens to be accurate, but unknown-vs-false is not distinguished. Suggest propagating or removing the mode; not a phantom success claim.

### Widget 2 — TimeMachine: PASS (honest, with documented caveats)
- Fetches real `GET /api/v1/timeline` (`gateway/routes/timeline.js`): per-day buckets computed from live PG tables (`knowledge_nodes` cumulative count, replay verified/total rate, mission throughput).
- `authority_drift` is explicitly flagged: wire value 0 + top-level `authority_drift_status: "uninstrumented"` — honest about the missing data source.
- Fail-soft design is documented in the route header: a single failed query degrades that field to 0 (widget calls `.toFixed()` unconditionally); **all-failed → HTTP 500 `{status:'error'}`** rather than a fabricated series. Caveat: a partially-failed field shows 0, indistinguishable in the UI from a genuine zero.
- Divide-by-zero fixed (replay rate guarded on `total > 0`; honest raw delta on zero baseline).
- No fake success states.

### Widget 3 — CockpitDashboard: FAIL (new finding — shape-broken from birth + hard-coded success panels)
Two independent problems, both verified against source:

**(a) Shape mismatch — the widget cannot render against the real backend.** It fetches `http://localhost:8080/system/state` and reads `s.objects.total`, `s.graph.nodes/edges/average_degree`, `s.services.postgresql.healthy`, `s.services.qdrant.healthy`, `s.lifecycle.active_lifecycles`. The actual `GET /system/state` handler (`gateway/routes/system.js` → `SystemAuthority.getSystemState()` in `ping-runtime/runtime/system_authority.js:243`) returns keys: `version, generated_at, containers, git, repository, knowledge, missions, replay, postgres, qdrant, metrics`. **None of the widget's keys exist.** `s.objects.total` throws a TypeError on render. I confirmed via `git show d596aa596` (the widget's birth commit) that the authority **never** produced those keys — broken from birth. The sprint's wave H59 only verified the route exists ("will work… is a real route") and explicitly noted "CockpitDashboard's full render path not audited" — it is now audited, and it fails.

**(b) Hard-coded success panels.** Even if the shape matched, these panels claim states from no backend:
- "Compiler Status": `value="Ready" status="healthy"`, Passes "6", all six passes listed with ✓ — hard-coded.
- "Replay Status": `"Ready"` healthy, Log Entries `"0"`, Blocks `"0"`, Genesis `"Initialized"` — hard-coded.
- "Git Snapshot": `"Immutable"` healthy, Commits/Trees/Blobs `"Stored"` — hard-coded.
- "Knowledge Growth": Growth Rate `"+0%"` — hard-coded literal.
- "Mission Queue": Queued `"0"`, Executing `"0"` — hard-coded.
- "System Health / Gateway": `"Healthy"` — hard-coded (defensible only in the weak sense that the fetch succeeded, but still an unvalidated claim; the backend has a `status` field per service it ignores).

**Recommendation (no fix applied — this is a product/scope decision, not a small surgical diff):** either unmount CockpitDashboard from its tab per the established phantom-widget precedent (12 already unmounted this sprint), or remap its panels to the real `/system/state` keys (`knowledge.knowledge_objects`, `repository.total_nodes/total_edges`, `postgres.status`, `qdrant.status`, `missions`, `replay`, `git`, `containers`). Remapping requires product calls on which panels survive; deleting hard-coded success panels is the honest minimum. Until then, the "3 honest widgets" claim is really **2 of 3**.

---

## TASK 16 — ORACLE READINESS: the 5 blockers re-evaluated

**Overall verdict: NOT READY. Do not deploy.** Nothing was deployed or changed.

Important context: the sprint branch's `infrastructure/oracle/` contains **only** the two Dockerfiles (fixed by wave H9). The full deploy kit (`docker-compose.oracle.yml`, `bootstrap.sh`, `schema.sql`, `systemd/`) exists on `main` (from July, commit `6e359a268`) and is absent from this worktree. The wave-H9 notes themselves classified blockers 2–5 as NEEDS-NOLAN/OUT-OF-SCOPE (main-only files). All blocker evidence below was re-verified against `main`'s files this session.

| # | Blocker | Classification | Evidence |
|---|---------|----------------|----------|
| 1 | All three custom image builds fail on main (missing Dockerfiles and sources) | **PARTIALLY RESOLVED** | Worktree commit `88e389722` (wave H9): `infrastructure/oracle/Dockerfile.gateway` now `node:20-alpine` (was 18, violating contract §3), `apk add python3 make g++` (contract §7 ARM64 tree-sitter mitigation), exec-form `CMD ["node","server.js"]`; `Dockerfile.worker-runtime` already conformant, untouched; `Dockerfile.scheduler` deliberately **not** stubbed (sources absent tree-wide; contract says drop the service — "a stub would game the metric"). Drive: real docker builds exit 0 for gateway+worker with repo-root context, contract assertions 5/7→7/7. **Remaining half:** `main`'s `docker-compose.oracle.yml` still references the old paths (`gateway/Dockerfile`, root `Dockerfile.worker-runtime`, `infrastructure/oracle/Dockerfile.scheduler`); the compose repoint to the new Dockerfiles is unstarted, and the new Dockerfiles live only in the unpushed sprint branch. |
| 2 | Hardcoded `POSTGRES_PASSWORD` literal | **STILL BLOCKED** | Re-verified on main: `docker-compose.oracle.yml:164` worker env **and** `:46` postgres env both contain `POSTGRES_PASSWORD: <redacted>` (literal, not `${POSTGRES_PASSWORD}`). Not touched by harvest. Externalize + rotate still required. |
| 3 | `schema.sql` never applied | **STILL BLOCKED** | `schema.sql` (181 lines) exists on main but the postgres service mounts **only** `pgdata:/var/lib/postgresql/data` — no `/docker-entrypoint-initdb.d/01-schema.sql` mount anywhere in the compose. Fresh postgres boots empty. Not touched by harvest. |
| 4 | `host.docker.internal` Ollama default; GPU-assuming defaults | **STILL BLOCKED** | Re-verified on main: `docker-compose.oracle.yml:128` `OLLAMA_BASE_URL: ${OLLAMA_BASE_URL:-http://host.docker.internal:11434}` — does not resolve under Linux Docker Engine. Not touched by harvest. |
| 5 | `bootstrap.sh` stale branch default | **STILL BLOCKED** | Re-verified on main: `bootstrap.sh:12` `PING_BRANCH="${PING_BRANCH:-constitutional-trunk}"`. Not touched by harvest. |

No NEW blockers discovered beyond the contract's list (the "estimated scope" items — qdrant pin, health-check deadlock risk, CI buildx, `.env.example` — remain untouched as before; not regressions).

**Honest readiness:** Blocker 1 moved from fully-open to half-closed (Dockerfile layer proven, compose repoint pending). Blockers 2–5 are exactly as the contract left them. Deployment remains NOT READY; the missing pieces are still files and small edits, not design.

---

## Cross-cutting notes
- **No fixes were applied** in this wave: all four tasks were verification-only. The CockpitDashboard finding is reported with a concrete recommendation rather than a unilateral UI change, since the honest minimum (delete hard-coded panels / unmount) is a scope call.
- **Test evidence:** both social contract suites executed live on the Pig (node available): `test/test_social_draft_trigger.js` 8/8 pass, `test/test_social_draft_projection.js` 23/23 pass. No live gateway/Postgres boot was available, so claims about live-runtime behavior are marked accordingly.
- **Credential hygiene:** no secrets read, no credentials touched, no external sends, no publishing enabled or tested.
