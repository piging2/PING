# CORE INTERROGATION — Investigator A (structural): Q1, Q2, Q21, Q22, Q24, Q25-spine

Date: 2026-09-30 ~14:30 MDT. Role: reader/falsifier. Nothing built, nothing proposed.

## Method note

Every question follows QUESTION → CURRENT CLAIM → REACHED PATH → EVIDENCE → COUNTEREVIDENCE → VERDICT → SMALLEST CONSEQUENCE, with a falsifying observation stated after each answer. Verdicts restricted to PROVEN / FALSIFIED / PARTIAL / UNKNOWN / NOT-REACHED.

**Reached-path anchor for the whole investigation.** The served PING deployment is NOT the repo tree and NOT the old Oracle Cloud VM. It is the Pig docker plane:
- `ping-gateway` container, image `ping-gateway:repair-cert-20260924`, CMD `node gateway/server.js`, port 8080 (up 7h at probe time).
- `brain-postgres` container, database `ping_runtime` (the journal host).
- `ping-qdrant`, `ping-redis`, `ollama` containers alongside.
- Mission Control: Next.js `next start -p 3100` on the Pig host, cwd `/home/nolan/projects/ping-fyd-converged`, health 200.
- Two `node server.mjs` processes are the FYD journal gateways (separate demo journal, JSONL), not PING.

All container claims below were read from the live image via `docker exec` (read-only). All journal claims are `SELECT` against `brain-postgres/ping_runtime` (read-only). No state was changed.

---

## Q1 — What is PING with every UI, agent name, and aspirational doc deleted?

**CURRENT CLAIM** (forensic starting point): one canonical `ping_events` writer, centralized spine identity, live mission machinery, ClaimWorker, KnowledgePromoter.

**REACHED PATH**: `ping-gateway` container `/app` = `gateway/` + `ping-runtime/` + `runtime/` + `database/`; bootstrap `gateway/bootstrap/gateway_runtime.js`; journal `brain-postgres/ping_runtime.ping_events`.

**EVIDENCE**
- Single production `INSERT INTO ping_events` in the served image: `ping-runtime/events/unified_event_runtime.js:246`, with `ON CONFLICT (event_id) DO NOTHING` + semantic-collision fail-closed check. Zero other production writers found in the image (test files excluded).
- Journal is live: 2580 rows; latest write 2026-09-30 18:14:51 UTC (12:14:51 MDT today). Live event flow today: OBSERVATION_CREATED → CLAIM_CREATED → MISSION_CREATED → MISSION_ASSIGNED → MISSION_STARTED → MISSION_COMPLETED, all within the same second at 18:14:50–51.
- Mission authority: single `INSERT INTO ping_missions` at `ping-runtime/orchestration/mission_runtime.js:79`. 515 missions total; 484 completed, 28 created, 3 retry_pending.
- Execution routing: `MissionScheduler` polls `ping_missions` → `WorkerRuntime.dispatch(event)` → registered in-process workers. `ClaimWorker` at `ping-runtime/workers/canonical_workers.js:138`. 71 CLAIM_CREATED events, live today.
- Knowledge: `knowledge_promoter.js` present; `knowledge_nodes` = 241 rows, all `node_type='event'`, every `source_event_id` verified to reference a real `ping_events` row, latest write today 17:46:33 UTC. It is a live journal mirror.
- Acquisition seam: `POST /ingest` route (`gateway/routes/ingest.js`) → `CanonicalizationService.canonicalizeAndEmit` → UER → journal. Live callers in the journal: `api:muse` (41 observations), `api` (18), `observation` (18), `metric-ingest-producer` (11), `mission-worker` (3). The "zero live production callers" forensic claim is STALE; the seam is manned today.
- Identity behavior: UER mints `event_id = sha256(JSON({eventType, source, [namespace], [logical_id|payload]}))` inline at `unified_event_runtime.js:167`. Deterministic, content-based, no clock. (Note: this is the pre-AUTH-CONV-06-fix scheme — the lane branch delegates to `IdentityAuthority.generateSpineEventId()`, but the served image does NOT.)

**COUNTEREVIDENCE** (what the forensic claim overstates)
- "Centralized spine identity" as an *authority* is false on the served path: the image ships **7 identity modules** (`gateway/runtime_identity_authority.js`, `runtime/authorities/identity_authority.py`, `runtime/kernel/authorities/{identity,runtime_identity,replay_identity}_authority.js`, `ping-runtime/authorities/{identity,workflow_identity}_authority.js`) and **zero non-test files in the image require any of them** (verified by grep). The behavior is centralized (one minting site: UER inline); the authority is not.
- "Live mission machinery" is narrower than claimed: the full constitutional pipeline missions (WITNESS_CREATE 68, PROJECTION_CREATE 68, REPLAY_VERIFY 68, CLASSIFICATION_CREATE 67, LINEAGE_CREATE 66, RECOMMENDATION_CREATE 66) last completed 2026-09-23–25 and are now stale. The live loop is observation→claim→CLAIM_GENERATE missions (+2 INTELLIGENCE_RESEARCH in 48h).
- REPLAY_COMPLETED: 68 events, all `source='replay'`, latest 2026-09-25 07:30 UTC — stale. No live emitter exists in the image outside test files.

**VERDICT: PROVEN** (for the spine as re-scoped below; the forensic claim needs the corrections above).

**Smallest defensible irreducible spine** (delete anything else and PING-as-a-system still stands):
1. `ping_events` table + append-only discipline (the journal; 2580 rows of truth).
2. The UER emit path: validate → deterministic ID → `INSERT … ON CONFLICT DO NOTHING` → semantic-collision fail-closed. This is the only writer.
3. The event-ID byte scheme (sha256 over `{eventType, source, namespace?, logical_id|payload}`) — load-bearing for idempotent retries and dedup.
4. The `/ingest` boundary (validate → authorizeNamespace → canonicalize → emit) — the one door in.
5. `ping_missions` table + `MissionRuntime` lifecycle (created→assigned→started→completed/failed) — durable work.
6. `MissionScheduler` → `WorkerRuntime.dispatch` — the poll-and-route loop.
7. One closing worker (`ClaimWorker`) proving observation→claim→mission→completion closes without a human.

**Classification of the rest:**
- *Projection*: Mission Control :3100 (proven SELECT-only, see Q21), Qdrant collections, `knowledge_nodes` mirror, `projection_executor.js`.
- *Worker*: MissionScheduler, WorkerRuntime, ClaimWorker, KnowledgePromoter, MissionRuntime.
- *Replaceable infrastructure*: Qdrant, ollama/model provider, Cloud VM (cloud-subagent fleet host), browser/social ingest adapters, redis, vault.
- *Historical naming*: ORCA (no orca code in the image; only a stale comment at `worker_runtime.js:10` "Workers register as WorkerPorts in the Orca scheduler"), CRX (survives only as default DB name `'crx'` at `gateway_runtime.js:140–142`), Hermes/Copilot/Ollama (worker-family names in the undeployed work-order contract, not on the served path), the `constitutional_*` module/doc sprawl, the 8 replay-named modules.

**SMALLEST CONSEQUENCE**: any future convergence work must treat items 1–7 as the untouchable kernel and everything else as negotiable. The 7 dead identity modules in the served image are the clearest evidence that "declared authority" and "served truth" diverge.

**What observation would prove this answer wrong?** A served PING behavior (a mission completion, a claim, a knowledge node) whose bytes cannot be derived from {`ping_events` rows + UER emit code + `ping_missions` rows + scheduler/worker code} — e.g., a decision that required Qdrant state or an in-memory registry with no journal residue. One such row falsifies the spine boundary.

---

## Q2 — What owns truth? (18 concepts, served-path ownership only)

**CURRENT CLAIM**: each concept has exactly one semantic owner; class/table/event names are not ownership.

**REACHED PATH**: same served image + journal as Q1.

| # | Concept | Owner (served behavior) | Verdict | Evidence anchor |
|---|---------|------------------------|---------|-----------------|
| 1 | observation | **UnifiedEventRuntime** (sole writer via `/ingest`) | PROVEN | single INSERT at UER:246; 93 OBSERVATION_CREATED, live callers today |
| 2 | evidence | **UNRESOLVED** | UNRESOLVED | `ping-runtime/evidence/evidence_authority.js` exists in image; whether the served claim path calls it was not traced to a live emission |
| 3 | claim | **ClaimWorker** (behavior) + journal (record) | PARTIAL | 71 CLAIM_CREATED, live today; no separate claim store |
| 4 | fact | **UNRESOLVED** | UNRESOLVED | no FACT_* event type in journal; no fact table; the word appears only in docs |
| 5 | knowledge | **UNRESOLVED — competing** | UNRESOLVED | three live stores, no precedence: `knowledge_nodes` PG mirror (241, live), Qdrant `knowledge` (401 pts), Qdrant `constitutional_memory` (0 pts) |
| 6 | mission | **MissionRuntime** → `ping_missions` | PROVEN | single INSERT at mission_runtime.js:79; competing `missions`-table writer (`mission_repository.js`) is dead — the `missions` table does not exist in the served DB |
| 7 | authorization | **UNRESOLVED — fragmented** | UNRESOLVED | `exteriorAuthMiddleware` (/events routes), `authorizeNamespace` (/ingest), `authorizeWorkOrder` (repo adapter, NOT in image), AGENT_PROFILES — four checks, no single owner |
| 8 | approval | **UNRESOLVED** | UNRESOLVED | zero APPROVAL_* types in journal; `mc-approval/` exists only in the :3100 FYD app, not the PING path |
| 9 | work order | **UNRESOLVED on served path** | UNRESOLVED | `work_order_id = sha256('workorder:'+taskId)[0:16]` exists only in the undeployed repo adapter; no work-order concept in image or journal |
| 10 | attempt | **MissionScheduler/MissionRuntime** | PARTIAL | `retries` column + lease/re-dispatch logic in mission_scheduler.js; attempt identity not separately recorded |
| 11 | result | **emitting worker + MissionRuntime** | PARTIAL | WORKER_COMPLETED/WORKER_FAILED in journal vocabulary; `mission.result` column; no single result authority module reached |
| 12 | effect | **UNRESOLVED** | UNRESOLVED | zero EFFECT_* types in journal; `orca/effect_ledger.js` and effect-classes exist only in repo, not in image |
| 13 | verification | **UNRESOLVED** | UNRESOLVED | `verifyResultEnvelope` lives in the undeployed adapter; served path has scattered checks (event validator, constitutional_dispatcher), no single verifier |
| 14 | outcome | **MissionRuntime** (terminal states) / semantics unresolved | PARTIAL | MISSION_COMPLETED/FAILED owned by MissionRuntime; the `unknown`-outcome vocabulary (orca-adapter) is not deployed |
| 15 | learning | **UNRESOLVED** | UNRESOLVED | storage exists (`knowledge_nodes` live), `knowledge_edges` = 0 rows, and no served path reads learnings back into a different next decision |
| 16 | projection | **UNRESOLVED — fragmented** | UNRESOLVED | MC SELECT-projection (proven read-only), Qdrant direct clients (9 modules, no ProjectionAuthority — audit finding 7, still true in image), `knowledge_nodes` mirror, `projection_executor.js`; declared `runtime/authorities/projection_authority.py` is Python, not on the Node path |
| 17 | deployment state | **UNRESOLVED** | UNRESOLVED | `deployment_registry` table = 0 rows; ORACLE-STATUS-2026-09-22 documents an undocumented image promotion (3c5d280dd) with no journal record — provenance gap is admitted in writing |
| 18 | tenant identity | **`tenants` table** | PROVEN | 1 row: `hpp` / Happy Place Platform / active; trivially single-owner today |

**Competing implementations found** (served image): 7 identity modules (0 callers); 2 mission-table writers (1 dead); direct-Qdrant clients vs declared ProjectionAuthority; inline `canon` in UER vs declared CanonicalAuthority (served image still uses the nested-blind `JSON.stringify(o, Object.keys(o).sort())` — the AUTH-CONV-06 deep-canonical fix is lane-branch only); `worker_registry.js` `register()` vs dead "WorkerPortRegistry/Orca scheduler" comment.

**COUNTEREVIDENCE**: the repo tree contains dozens more identity/canonical/authority copies (convergence-lane3, lane-b, tenanos-wave, constitutional-sprint, ping-build-program/fleet…), but those are lane artifacts and vendored copies, not live competitors. Counting them as "competing implementations" would be name-matching, not ownership tracing. On the served path the truth is starker: most authorities are declarations with zero callers.

**VERDICT: PARTIAL** — 3 of the 18 concepts have a proven single served owner (observation, mission, tenant identity); attempt/result/claim/outcome are partially owned; the remaining 11 are unresolved or fragmented. The honest map is: **the journal owns records; UER owns acceptance; MissionRuntime owns mission lifecycle; everything else is either a worker behavior or unresolved.**

**SMALLEST CONSEQUENCE**: stop treating the 11 unresolved concepts as owned. Any lane that needs approval, effect, verification, work-order, learning, or deployment-state semantics must first prove the owner on the served path, not cite a module name.

**What observation would prove this answer wrong?** A single served code path that (a) writes APPROVAL_*/EFFECT_*/FACT_* rows to the journal, or (b) shows one of the 7 identity modules actually required by a live (non-test) module in the running container, or (c) shows `knowledge_edges` gaining rows from a live promoter. Any of those re-opens the ownership map.

---

## Q21 — Inverse architecture test

**CURRENT CLAIM**: each component's deletion cost is knowable from reached runtime coupling, not from diagrams.

**REACHED PATH**: served image + journal + :3100 app + Qdrant + repo (for undeployed items).

| Component | Deletion cost | Evidence anchor |
|-----------|--------------|-----------------|
| Qdrant | **Capability + performance loss. No truth loss.** | 3 collections: `knowledge` 401 pts (768-dim), `constitutional_documents`, `constitutional_memory` 0 pts. Readers: `knowledge_retrieval.js` (direct client, audit finding 7). Journal + `knowledge_nodes` mirror survive; vectors re-derivable from source docs. |
| Mission Control (:3100) | **Convenience loss only. No truth loss, no capability loss to the kernel.** | `mc-ping-journal.ts`: SELECT-only guard ("every statement is a SELECT… No INSERT/UPDATE/DELETE/DDL exists"), reads `ping_runtime.ping_events/ping_missions/knowledge_nodes` read-only, proven 2026-09-30. UI mutation cannot change truth by construction. |
| ORCA | **No meaningful loss to the served path.** | Zero orca code in the served image; no ORCA process on the Pig; only residue is a stale comment (`worker_runtime.js:10`). The orca-adapter (idempotency keys, reconcile gate, effect_state) exists only in `~/workspace/orca-adapter`, undeployed. Nolan's 2026-09-30 re-aim independently rules: ORCA is concepts to harvest, not a runtime to rebuild. |
| FYD | **Product capability loss; zero PING semantic loss.** | FYD has its own journal (`fyd-journal-gateway`, append-only JSONL `events.jsonl`, 2 server.mjs processes) and its own gateway; the :3100 app serves the FYD site from `ping-fyd-converged`. Nothing in the PING journal or UER depends on FYD. |
| CRX | **No meaningful loss.** | CEO order 2026-09-29: "CRX IS A MINE, NOT A DEPENDENCY." Served residue is only the default DB name `'crx'` at `gateway_runtime.js:140–142` (history, not function). |
| Hermes | **No served-path loss.** | Not referenced by any served worker-path file (`worker_runtime.js`, `mission_runtime.js`, `mission_scheduler.js` — zero hits). It is a transport family in the undeployed work-order contract only. |
| Copilot | **No meaningful loss to PING.** | Compute/token source for agents; nothing in the served image or journal references it. |
| Oracle (old cloud deployment) | **No meaningful loss, conditional.** | Live truth plane is the Pig (`brain-postgres`, today's writes). The Oracle VM was the 09-19–09-22 deployment plane (ORACLE-STATUS-2026-09-22); superseded. CONDITION: I did not re-verify the Oracle VM's current state — if it still runs writers, the single-writer claim needs re-checking. |
| Cloud VM | **Capability loss (execution fleet); no truth loss.** | Work-order contract v1.0.0-draft: "Cloud subagents (PRIMARY fleet)". Deleting the fleet host kills the primary headless-execution hand; missions queue (created/retry_pending) but journal and mission state survive. |
| browser worker | **Capability loss (acquisition hand); no truth loss.** | `social_ingest_adapter.js` normalizes social events toward the journal (thin; no `emit()` calls of its own). Deleting it removes the browser-mediated acquisition hand, not the journal. |
| knowledge projections | **Convenience/performance loss; regenerable.** | `knowledge_nodes` is provably re-derived (all `source_event_id`s resolve to journal rows); Qdrant vectors re-derivable from source documents. Nothing in the kernel reads them to decide. |
| model provider (ollama) | **Capability loss for model-mediated judgments; deterministic machinery unaffected.** | `ollama` container present; gateway defaults reference `OLLAMA_BASE_URL`. UER, scheduler, journal, and mission lifecycle use no model calls. |

**COUNTEREVIDENCE**: "no meaningful loss" for ORCA/Hermes/Copilot is scoped to the *served PING runtime*. They have real value as agent tooling (Hermes transport is proven live per the adapter README; Copilot tokens are the agent workforce). Deleting them would hurt *agent operations*, not PING semantics — the distinction matters.

**VERDICT: PROVEN** for the classification above (each row anchored to a reached artifact).

**SMALLEST CONSEQUENCE**: the only deletions that destroy truth are the journal DB and the UER emit path. Everything else is a hand, a projection, or a name. Backup priority follows exactly that order.

**What observation would prove this answer wrong?** For any "no truth loss" row: a journal row or mission state that cannot be reconstructed after deleting the component — e.g., a `knowledge_nodes` row whose `source_event_id` dangles, or a mission whose completion depended on Qdrant state. For ORCA: a live process or a journal write whose `source` traces to orca code in the running container.

---

## Q22 — Where have we paid twice?

**CURRENT CLAIM**: competing implementations must be found by tracing callers and reached runtime ownership, not by name-matching.

**REACHED PATH**: served image (ground truth for "paid and live") + repo tree including `.worktrees` (for "paid and stranded").

**EVIDENCE — the double-payment ledger:**

1. **Event writers**: paid ONCE live (UER:246). Repo copies (`convergence-lane3/unified_event_runtime.js`, `staging/phase9_model_b_proof.js`, `ce002/*`, `ping-build-program/lane-wire/emit-fn.js`, `fyd-lane/harvest-wave1/code-evidence/`) are lane artifacts/test copies — stranded, not competing. **No live duplication.**
2. **Identity generators**: paid ~10 times, enforced once. 7 dead modules in the served image (0 non-test callers, verified) + inline UER minting (the actual owner) + repo copies (`convergence-lane3/identity_authority.js`, `lane-b/identity_authority.js`, `constitutional-sprint/identity/ping-identity-authority.py`, `transfer/7b/.../identity-authority.ts`, tenanos-wave and fleet vendored copies). The AUTH-CONV-06 fix (delegate to `IdentityAuthority.generateSpineEventId`) exists only in lane branch `lane/ping-core-perfection-jev`, not in the served image.
3. **Canonicalizers**: paid 3+ times, enforced once (inline `canon` in UER — the nested-blind variant). Declared `CanonicalAuthority`/`CanonicalBytes` not on the served path; repo copies in fyd-lane, tenanos-wave, fleet.
4. **Approval representations**: paid ZERO times live. No journal type, no served module; representations exist only in `:3100/mc-approval` (FYD app) and repo docs. Not a duplication — an absence.
5. **Effect identities**: paid ZERO times live. `orca/effect_ledger.js` + 10 effect-class docs are repo-only. Absence, not duplication.
6. **Replay implementations**: paid MANY times, currently idle. 8 replay-named modules in the image (`replay_runtime`, `replay_scheduler`, `replay_recorder_authority`, `replay_verifier`, `replay_certificate`, `replay_rule_set`, `replay_plan_authority`, `replay_log`) + `continuous_replay_authority.js` (per audit) — and the last REPLAY_COMPLETED is 2026-09-25 (stale). Overlapping modules, no live owner.
7. **Knowledge stores**: paid 3+ times live with no precedence rule — `knowledge_nodes` PG mirror (241, live), Qdrant `knowledge` (401 pts), Qdrant `constitutional_memory` (0 pts), `constitutional_documents`. Which one a consumer should trust is undecided.
8. **Mission schedulers**: paid once live (`mission_scheduler.js`). `redteam_scheduler.md` is a doc; orca-adapter reconcile gate is repo-only. No live duplication.
9. **Capability gates**: paid 4 times, no single gate — `authorizeWorkOrder` (repo-only), `authorizeNamespace` (/ingest, live), `exteriorAuthMiddleware` (/events, live), AGENT_PROFILES (repo). Fragmented, not duplicated-live.
10. **Worker registries**: paid once live (`worker_registry.js` `register()`), plus a dead name-collision (the "WorkerPorts in the Orca scheduler" comment) and repo-only profile registries. Naming collision, not live duplication.
11. **Projection systems**: paid 4+ times live with no owner — MC SELECT projection, Qdrant direct clients, `knowledge_nodes` mirror, `projection_executor.js`. Declared `projection_authority.py` is Python, not on the Node enforced path (audit finding 7, still true).
12. **Evidence verifiers**: paid 3 times, reached owner unknown — `evidence_authority.js` (image, use untraced), `verifyResultEnvelope` (repo-only), orca-adapter `verifyResultEnvelope`/`verify-matrix.js` (repo-only).

**COUNTEREVIDENCE**: most repo-tree copies are vendored snapshots, harvest evidence, or worktree checkouts — counting every file as a "competitor" would manufacture a bigger number than the runtime supports. The honest double-payment is: **identity (7 dead modules in the live image), canonicalization (declared vs inline), knowledge stores (3 live, no precedence), replay (8 modules, idle), projection (4 systems, no owner), capability gates (4 checks, no single gate).**

**VERDICT: PROVEN** — the six live double-payments above are each anchored to reached artifacts; the rest is stranded history, not live competition.

**SMALLEST CONSEQUENCE**: convergence should target the six live items, in this order: knowledge-store precedence, projection ownership, capability-gate unification, replay module collapse-or-delete, canonicalization enforcement, identity module deletion. The repo-tree copies need no action (they are not live).

**What observation would prove this answer wrong?** A live (non-test) `require()` of any of the 7 identity modules in the running container; a `knowledge_edges` row written by a live process (collapsing the knowledge-store story); or a journal write with `source` identifying one of the "dead" replay modules after 2026-09-25.

---

## Q24 — What exists because of history rather than necessity?

**CURRENT CLAIM**: for each major subsystem — would we independently build it given today's canonical spine and today's product requirements?

**REACHED PATH**: served image + journal liveness (last-write timestamps are the arbiter: live = needed-or-used; stale = history).

| Subsystem | Rebuild? | Evidence |
|-----------|----------|----------|
| `ping_events` + UER + `/ingest` | **YES** | 2580 rows, writes today; the one door, the one writer |
| `ping_missions` + MissionRuntime + Scheduler + WorkerRuntime | **YES** | 515 missions, completions today; durable work queue is a product requirement |
| ClaimWorker + KnowledgePromoter (live subset) | **YES** | CLAIM_CREATED + knowledge_nodes writes today; closes the observation→claim→knowledge loop |
| Full 7-mission constitutional pipeline (witness/classification/lineage/recommendation/projection/replay missions) | **NO** | last completions 2026-09-23–25, stale; the live system does not use them |
| Qdrant | **MAYBE** | only if semantic retrieval is a product requirement; 401 pts live but nothing in the kernel depends on it; the 100-hour re-aim keeps it as projection, not kernel |
| Mission Control | **YES as product surface, NO as PING semantics** | SELECT-only projection; operator visibility is needed, but it owns no truth |
| ORCA as runtime | **NO** | not deployed; Nolan's 2026-09-30 re-aim: harvest concepts, no parallel sovereign runtime |
| orca-adapter's idempotency/reconcile gate | **YES as behavior** | the most valuable stranded behavior (duplicate-execution prevention); belongs in the served path, not as a separate runtime |
| FYD | **YES as product, NO as PING** | separate JSONL journal + gateway; the website-builder mission needs it, PING doesn't |
| CRX | **NO** | mine, not dependency (CEO order); served residue is a default DB name string |
| Hermes / Copilot / Ollama transports | **YES as hands, NO as semantics** | execution needs hands; none are PING truth |
| Oracle cloud deployment | **NO** | superseded by the Pig plane; the live journal is `brain-postgres` |
| `repository_events` / `canonical_events` / EventBridge feed | **NO** | both tables 0 rows; the bridge polls emptiness every 5s — a dead feed |
| Zero-row tables (`mission_events`, `mission_executions`, `canonical_events`, `event_outbox`, `knowledge_edges`) | **NO** | schema aspiration with no writer; 0 rows each |
| `constitutional_*` module/doc sprawl (generated JSON manifests, PHASE audits, ARCHITECTURAL_DISCOVERY.md, etc.) | **NO** | aspirational archaeology; the served path does not read them |
| 7 dead identity modules in the image | **NO** | 0 callers; pure declaration |
| 8 replay modules | **NO in current form** | idle since 09-25; at most one replay implementation would be rebuilt, and only if replay becomes a product requirement again |
| Default DB name `'crx'` in `gateway_runtime.js:140–142` | **NO** | string history; harmless but telling |
| `tenants` (1 row) | **YES in principle** | multi-tenancy is a standing product requirement; current single-row state is fine |

**COUNTEREVIDENCE**: "stale = history" is not automatic — the 7-mission pipeline going quiet 09-23–25 could reflect a deliberate pause (e.g., the 90-hour GO re-aimed effort at FYD/MarketingOS) rather than uselessness. Staleness proves non-use, not non-value. The rebuild question is answered "NO" only in the sense that today's live product requirements don't exercise it.

**VERDICT: PROVEN** for the table above (each row anchored to liveness evidence or a binding directive).

**SMALLEST CONSEQUENCE**: the next simplification pass has a concrete delete/keep list; the zero-row tables and dead feed are the cheapest wins (no behavior depends on them — verified by row counts, not by reading docs).

**What observation would prove this answer wrong?** A live journal write after 2026-09-25 with `event_type` in {WITNESS_CREATED, CLASSIFICATION_CREATED, LINEAGE_CREATED, RECOMMENDATION_CREATED, PROJECTION_CREATED, REPLAY_COMPLETED} from a non-test source — that would resurrect the full pipeline from "history" to "live." Or a served read path that queries `mission_events`/`event_outbox` (proving the zero-row tables have readers).

---

## Q25-spine — The smallest complete PING (contribution)

### MINIMUM SOVEREIGN SPINE
1. `ping_events` (append-only journal; the truth).
2. UER emit path: validate → deterministic ID → INSERT … ON CONFLICT DO NOTHING → semantic-collision fail-closed (the only writer; the only door is `/ingest` → CanonicalizationService → UER).
3. The event-ID byte scheme (sha256 of `{eventType, source, namespace?, logical_id|payload}`) — load-bearing for idempotency.
4. `ping_missions` + MissionRuntime lifecycle (created→assigned→started→completed/failed).
5. MissionScheduler → WorkerRuntime.dispatch (the poll-and-route loop).
6. One closing worker proving the loop (today: ClaimWorker; the role, not the name, is the requirement).

### REPLACEABLE HANDS
- Execution transports: cloud-subagent fleet (primary per contract), Hermes, Ollama, Copilot broker — none on the served path today; all are hands, none are truth.
- Acquisition adapters: `/ingest` HTTP boundary (live, with real callers), `social_ingest_adapter` (thin), browser worker.
- Model provider (ollama container): needed only for model-mediated judgments.

### PROJECTIONS (all derive from the journal; none own truth)
- Mission Control :3100 — proven SELECT-only, read-only, 200/health.
- `knowledge_nodes` PG mirror (241 rows, live, all `source_event_id`s resolve).
- Qdrant `knowledge` (401 pts) / `constitutional_documents` / `constitutional_memory` (0 pts) — direct clients, no enforced authority.
- `projection_executor.js`, FYD's PingObjectReader BFF (consumer product).

### DOMAIN VOCABULARIES (names, not runtimes — keep the words, don't build the systems)
- Mission types: CLAIM_GENERATE, INTELLIGENCE_RESEARCH, WITNESS_CREATE, PROJECTION_CREATE, REPLAY_VERIFY, CLASSIFICATION_CREATE, LINEAGE_CREATE, RECOMMENDATION_CREATE, EMAIL_PROCESS — routing labels on `ping_missions`.
- ORCA effect classes 01–10 (filesystem/git/database/deployment/connector-write/external-API/website-publish/message/campaign/financial) — a useful effect taxonomy, currently repo-only.
- orca-adapter outcome × effect_state vocabulary (`completed|failed|unknown|denied|escalated` × `effect_unknown|effect_hold|effect_none`) — the honest-execution language; undeployed.
- MarketingOS residue homes (per 2026-09-30 re-aim): observations/claims/signals→`ping_events`; research briefs/experiments/distribution→`ping_missions`; findings/audiences/opportunities/learnings→`knowledge_nodes/edges`; semantic retrieval→Qdrant. Vocabulary mapping, not new stores.

### LEGACY / COMPETING IMPLEMENTATIONS (live ones only; repo-tree copies are stranded history)
1. 7 dead identity modules in the served image (0 callers) vs inline UER minting (the real owner).
2. Inline nested-blind `canon` in served UER vs declared CanonicalAuthority/CanonicalBytes (lane-branch fix, undeployed).
3. `mission_runtime.js` → `ping_missions` (live) vs `mission_repository.js` → `missions` (dead; table absent).
4. 9 direct Qdrant clients vs declared (Python, off-path) ProjectionAuthority.
5. `worker_registry.js` `register()` vs dead "WorkerPortRegistry/Orca scheduler" comment.
6. 8 replay modules, idle since 2026-09-25, no live owner.
7. EventBridge polling two 0-row tables (`repository_events`, `canonical_events`) every 5s.

### UNRESOLVED SEMANTIC OWNERSHIP (from Q2)
evidence, fact, knowledge (3 competing stores), authorization (4 fragmented checks), approval, work order, verification, effect, learning (stored, never used), projection (4 systems), deployment state (`deployment_registry` = 0 rows; admitted provenance gap). **11 of 18.**

### REAL MISSING PRODUCT CAPABILITIES (observed gaps, not proposals)
1. **No served execution hands for headless work.** The work-order contract (authorize → issue → hermes/cloud/ollama/copilot → verify envelope → record) exists only in the repo; the served mission loop closes only for in-process workers. INTELLIGENCE_RESEARCH missions (2 in 48h) have no proven served executor — missions can be created that nothing can execute.
2. **Learning is stored but never used.** `knowledge_nodes` mirrors events live; `knowledge_edges` = 0; no served path reads a learning back into a different next decision. (The 100-hour re-aim schedules this as hours 80–100 — it is future work, correctly not present.)
3. **Approval / effect / verification have no canonical representation.** Zero APPROVAL_*/EFFECT_*/FACT_* types in the journal; the honest-execution vocabulary (unknown-outcome, effect_state) is undeployed. Any consequential external effect today cannot be represented in PING's own truth language.
4. **Deployment provenance is unwritten.** `deployment_registry` is empty and an undocumented image promotion is admitted in writing (ORACLE-STATUS-2026-09-22). "What software is running" cannot be answered from canonical state.

### STRANDED VALUABLE IMPLEMENTATION (paid for, not contributing to a reached product arrow)
1. **orca-adapter**: idempotency keys (`sha256` over canonical intent), the reconcile gate (refuses re-dispatch on uncertain prior outcome without explicit reconciliation), `verifyResultEnvelope`, effect_state vocabulary, 40/40 synthetic selftest + live smoke. The single most valuable stranded behavior: duplicate-execution prevention for the mission loop.
2. **The AUTH-CONV-06 fixes** (lane branch `lane/ping-core-perfection-jev`): `IdentityAuthority.generateSpineEventId()` delegation + deep-canonical `CanonicalBytes.serializeString` collision check, proven by 4 golden vectors + contrast test. Stranded in a branch, not in the served image.
3. **KnowledgePromoter's edge machinery**: the promoter runs (nodes live) but emits zero edges — the relationship/pattern layer is built but idle.
4. **The 7-mission constitutional pipeline** (witness/classify/lineage/recommend/project/replay): 400+ completed missions of proven machinery, idle since 09-23–25. Stranded by disuse, not by defect.
5. **Mission Control's read-only journal adapter** (`mc-ping-journal.ts`): proven today, but only wired to the newest MarketingOS projection routes — the general MC views still go through older paths.

---

### The three things preventing PING from being dramatically more useful to Nolan today

1. **The served runtime has no hands for real-world work.** Missions can be created (`INTELLIGENCE_RESEARCH` is already in the journal), but the only executor that closes the loop in production is in-process workers doing self-checks. The proven headless-execution path — authorize, issue, transport (cloud/hermes/ollama), verify the envelope, record `WORKER_COMPLETED` — sits in `~/workspace/orca-adapter` and the work-order contract, undeployed. Until a served executor exists, PING can observe and claim but cannot *act* through its own machinery; every real action still rides on ad-hoc agent tooling outside the journal. (Evidence: zero orca/authorizeWorkOrder code in the served image; today's MISSION_COMPLETED payloads are journal self-checks.)
2. **Nothing PING "learns" changes its next decision.** Knowledge is mirrored diligently (`knowledge_nodes` live, Qdrant 401 points) and edges are never written (`knowledge_edges` = 0). There is no served path from a stored learning back into a mission, a claim, or a ranking. PING is currently a write-only memory: it remembers everything and consults nothing. (Evidence: edges=0; no retrieval→decision trace on the served path; the 100-hour re-aim correctly places the learning loop in hours 80–100.)
3. **Authority is declared, not enforced, so every new consumer re-derives the rules.** Seven identity modules with zero callers; projection and embedding authorities bypassed by direct clients; authorization split across four checks; approval, effect, verification, and deployment state with no canonical representation at all. The practical cost: each lane re-implements the same capability (the double-payment ledger in Q22), because the "authorities" are documentation that happens to be written in JavaScript. The smallest complete PING above is the enforcement list — everything on it must be *reached*, not just *named*. (Evidence: AUTH-CONV-06 findings 7–8 labeled-but-unfixed; my zero-caller greps; 11-of-18 unresolved ownership.)

---

## Method compliance check

- No subsystem proposed, no authority/store/writer/coordinator/registry created or recommended as new construction. The "smallest consequence" in each answer is a keep/delete/enforce list over existing artifacts.
- Every factual claim above traces to: a `docker exec` read of the served image, a `SELECT` against `brain-postgres/ping_runtime`, a `curl` against :3100/:6333, a file read in the repo, or a cited forensic document (used as counterevidence/claim, never as proof).
- Aspirational docs (module header comments like "Architectural Recommendation", generated manifests, PHASE audits) were treated as counterevidence or history, never as evidence of runtime behavior.
- Falsifying observation stated after every answer.

## Open unknowns (honest, not gaps to fill)
- Current state of the old Oracle Cloud VM (superseded per 09-22 docs; not re-verified).
- Whether `evidence_authority.js` is called by any live claim path (module present, callers untraced).
- `constitutional_documents` Qdrant collection contents (listed but not inspected).
- The 28 `created` + 3 `retry_pending` missions: whether the scheduler will drain them or they are stuck (lease/reap behavior per the AGENTS.md reaper-vs-HOLD note).
