# TRACK C: Falsified Claims and Unknowns
## PING 12-Hour Harvest Sprint Continuation, 2026-09-18

**Track:** C (falsified claims and unknowns)
**Investigator:** TRACK C specialist (subagent)
**Window:** 2026-09-18 ~05:15 to ~06:00 MDT
**Sources:** final report `~/workspace/ping-harvest-12h-final-report-2026-09-18.md` sections 13 and 14; worktree `/home/nolan/worktrees/ping-harvest-12h` (branch `sprint/harvest-12h`, HEAD `8fe3b8060`); live read-only inspection of the running `ping-postgres` stack via `docker exec` (peer socket auth, SELECT-only, no credential material touched).
**Starting counts:** 6 falsified claims, 8 unknowns.

All code and test assertions below were verified against the actual worktree and the live database, not against prior reports. No patches applied (read-only per task).

---

## TASK 8: The Six Falsified Claims

Each claim is classified as one of: documentation defect / test defect / implementation defect / stale architecture / unreachable feature / real runtime failure.

### Claim 1. "The test blesses the dormancy."

**Verdict on the claim:** FALSE (confirmed). The test condemns the missing wiring.

**Classification:** Documentation defect. The falsified statement was a prior wave's misreading of what `test_patch_001` asserts. The underlying reality (GatewayRuntime never calls `kernelAdapter.executeEvent`) is a deliberate, documented boundary since H67 (calling it would persist new canonical events), not an accident the test endorses.

**OWNER:** H66 investigation; `test_patch_001.js` contract (GatewayToKernelAdapter boundary).
**SEVERITY:** Low. The misreading was corrected in H66; the failing test is now correctly understood as a contract pin.
**AUTHORITY:** GatewayToKernelAdapter (kernel adapter boundary).
**EVIDENCE:**
- `test_patch_001.js` run on the Pig just now: exit code 1. Tests 1-3 pass (adapter loads, syntax valid, interface methods present). Test 4 fails: "GatewayRuntime does not call adapter.executeEvent" while asserting it imports and uses `kernelAdapter`.
- `git log --oneline -1 -- test_patch_001.js` = `d596aa596` (predates the sprint; the test pins original wiring intent).
- Final report section 6.1 (H66/H67): the trigger script `scripts/project-social-drafts.js` drives the projector directly precisely because `executeEvent` would inject source truth.
**NEXT ACTION:** Nolan decision: either wire `executeEvent` (not recommended during the freeze) or retitle/repurpose `test_patch_001` so the deliberate non-wiring is documented rather than left as a red test. Do not silently delete the pin.

### Claim 2. "ContextCompiler has no consumer."

**Verdict on the claim:** FALSE as of H65 (confirmed). ObservationWorker is the first downstream reader.

**Classification:** Stale architecture. The statement was true in the H63 era and was falsified by H65's feature commit. It is an outdated characterization, not a bug in code or docs at the time it was written.

**OWNER:** ContextCompiler (mission-context authority); consumer is ObservationWorker in `ping-runtime/workers/canonical_workers.js`.
**SEVERITY:** Low. Superseded within the sprint; no lingering false statement in current code.
**AUTHORITY:** ContextCompiler (sole mission-context authority per final report section 1).
**EVIDENCE:**
- `ping-runtime/workers/canonical_workers.js:101-136` (H65, commit `04204c528`): ObservationWorker fail-soft extracts `context_pack_id`, `context_evidence_refs` from `event.context_pack` (line 103: `const pack = event.context_pack`) and propagates them to the observation and the `OBSERVATION_CREATED` payload.
- H74/H76 extended the same pattern (`context_knowledge_refs`, ClaimWorker propagation, lines 164-199).
- Final report section 13 notes this supersedes H63.
**NEXT ACTION:** None required. Optionally add a one-line consumer note in the ContextCompiler header comment so the H63-era "no consumer" framing cannot resurface.

### Claim 3. "The KnowledgeGraph has no reader."

**Verdict on the claim:** FALSE as of H69 (confirmed). ContextCompiler queries it.

**Classification:** Stale architecture. True pre-H69 ("zero consumer" framing in H68), falsified by H69's feature commit.

**OWNER:** KnowledgeGraph (`ping-runtime/knowledge/`); reader is ContextCompiler `_retrieveKnowledgeRefs`.
**SEVERITY:** Low. Superseded within the sprint.
**AUTHORITY:** KnowledgeGraph (sole knowledge-store authority).
**EVIDENCE:**
- `ping-runtime/context/context_compiler.js:117-160` (H69, commit `e4df146ca`): `_retrieveKnowledgeRefs(namespace)` calls `graph.queryNodes({ namespace, status: 'approved', ... })` and `graph.queryNodes({ namespace, status: 'candidate', ... })`, projects deterministic refs, sorts, caps at 25, fail-soft `[]` on any failure. Injected at pack assembly (lines 95-106; `pack.knowledge_refs` set only when non-empty, keeping the pack byte-identical otherwise).
- Live check (see U3/U4 below): 68 candidate nodes exist, so the read path has real data to operate on.
**NEXT ACTION:** None required. Consider annotating the H68 audit doc ("zero consumer") as superseded by H69.

### Claim 4. "MissionCards is a real widget with a backend gap."

**Verdict on the claim:** FALSE (confirmed). It is the 12th phantom; the route exists on neither tier.

**Classification:** Unreachable feature. The UI component targets an API surface (`/api/v1/missions/cards`, plus `/reorder` and `/:id/:action`) that exists on no tier. It was built against a paper spec (see U6), never against a working backend.

**OWNER:** Command-center UI (`CascadeProjects/infra/ui-next`).
**SEVERITY:** Low. Unmounted in H73; honest UI now (3 widgets with real backends per final report section 7).
**AUTHORITY:** None owned it. That is the point: no backend authority ever served this surface.
**EVIDENCE:**
- `CascadeProjects/infra/ui-next/src/components/MissionCards.tsx:22,34,42` fetches `/api/v1/missions/cards`, `/api/v1/missions/cards/reorder`, `/api/v1/missions/cards/${id}/${action}`.
- `gateway/bootstrap/gateway_runtime.js:849`: missions routes mount at `/missions` (no `/api/v1` prefix). `gateway/routes/missions.js` exposes exactly four endpoints: `GET /stats`, `POST /`, `GET /pending`, `GET /active`. No `/cards` route exists anywhere in `gateway/routes/`.
- `git log`: `c889c025c` (H73) unmounted it from `command-center/page.tsx`; component preserved on disk as design reference (H57 pattern). Zero references to MissionCards remain in the command-center page (verified by H79).
- H37 forensics (commit `86e0bf7ba`): "The widget is dead on arrival, not just the buttons: the initial GET /api/v1/missions/cards 404s ... -> shows red 'Error: Failed to fetch', never renders."
**NEXT ACTION:** If a cards UI is ever wanted, spec the backend first (H37's minimal slice: `GET /missions/cards`, approve/reject semantics, producer, `decidedBy` identity, expiry). Keep the component on disk as design reference only.

### Claim 5. "Pack reuse would be an optimization."

**Verdict on the claim:** FALSE (confirmed). Reuse would falsify provenance; recompilation is correct.

**Classification:** Documentation defect. The claim was an investigated-and-rejected optimization hypothesis (H77). The design decision and its rationale are recorded; there is no code defect.

**OWNER:** ContextCompiler / MissionScheduler.
**SEVERITY:** Info. Correctly rejected; no action taken, no lingering risk beyond future re-proposal.
**AUTHORITY:** ContextCompiler (mission-context identity).
**EVIDENCE:**
- `ping-runtime/context/context_compiler.js:352-364` (`_generateContextPackId`): pack identity = hash of `{ mission_id, query, namespace, correlationId, retrieval_hash }`.
- `_buildRetrievalManifest` (lines 330-351): `retrieval_hash` itself binds `{ mission_id, query, namespace, correlation_id }` plus the selected events' `(event_id, content_hash)` pairs.
- Reusing a pack across missions would therefore produce a `context_pack_id` attesting to inputs it was not compiled from: provenance falsification by construction. H78's skip (see below) is the correct shape of this optimization (skip, don't reuse).
**NEXT ACTION:** None. Any future caching proposal must re-read this identity binding before proceeding; the H77 comment block is the standing record.

### Claim 6. "CockpitDashboard consumes the SystemAuthority knowledge count."

**Verdict on the claim:** FALSE (confirmed). It has no knowledge-field reader.

**Classification:** Documentation defect. Wrong framing from H63, corrected by the H63 correction and the H70 fix. The count flows to `/ops/*` and (now) `/system/state`; the dashboard never reads it.

**OWNER:** CockpitDashboard (`CascadeProjects/infra/ui-next/src/components/CockpitDashboard.tsx`) + SystemAuthority route wiring.
**SEVERITY:** Low. Corrected in H70; `/system/state` now reports the true count.
**AUTHORITY:** SystemAuthority (sole system-state authority).
**EVIDENCE:**
- `CockpitDashboard.tsx:75` fetches `${GATEWAY_URL}/system/state`. Its readers: `s.graph.nodes`/`s.graph.edges`/`s.graph.average_degree` (lines 148-150), `s.objects.total` (line 187), `s.graph.nodes`/`s.graph.edges` again (190-191), `s.services.*`, `s.lifecycle.*`. No reference to `knowledge_objects` or `s.knowledge` anywhere in the component.
- `ping-runtime/runtime/system_authority.js:119-142` (`collectKnowledge`): returns `knowledge_objects` from `knowledgeGraph.getStats()` (H34 rule), surfaced at `state.knowledge.knowledge_objects` via `getSystemState` (lines 243-270).
- `gateway/routes/ops.js:89`: `knowledge: state.knowledge || {}` (the `/ops/*` consumer).
- H70 wiring confirmed: `gateway/bootstrap/gateway_runtime.js:498` sets `systemAuthority.knowledgeGraph = knowledgeGraph` (H34), and line 731 passes `services.systemAuthority` into `createSystemRoutes` (no local construction; `gateway/routes/system.js:14` comment pins this).
**NEXT ACTION:** None for the claim itself. **Adjacent observation (not one of the six, flagged for later triage, not patched):** CockpitDashboard's `SystemState` interface expects `objects`, `graph`, `services`, `lifecycle`, but `getSystemState()` returns `version, generated_at, containers, git, repository, knowledge, missions, replay, postgres, qdrant, metrics`. The component's expected shape does not match the actual endpoint shape. This needs verification against a live gateway before any conclusion; recorded here only.

---

## TASK 9: The Eight Unknowns

### Unknown 1. Whether `social_drafts` DDL has been applied to any live Postgres.

**QUESTION:** Has `database/social_drafts.sql` been applied to the live Postgres?
**WHY UNKNOWN:** The H67 trigger was never run against live Postgres; the DDL application step was never performed or recorded.
**EVIDENCE NEEDED:** Live database schema inspection (read-only).
**INSPECTION PERFORMED:** Read-only `docker exec` into the running `ping-postgres` container (peer socket auth as `crx_user`; no credential material read or used). Listed public-schema tables in database `crx_runtime` (the operational DB: 739 live `ping_events`, 144 `ping_missions`, gateway container up 12h against this stack). Also listed public tables in the `postgres` database (empty). Searched both for `social_drafts`.
**RESULT:** `social_drafts` exists in NEITHER database. The live operational Postgres has no `social_drafts` table.
**FINAL CLASSIFICATION:** RESOLVED. The DDL has not been applied to the live stack. The H67 trigger cannot run successfully until the DDL is applied (it is fail-closed on Postgres failure, so this is a blocked-step, not a crash risk).

### Unknown 2. Whether the live `events` table schema matches the trigger's `ORDER BY id` assumption.

**QUESTION:** Does the live `events` table have an `id` column the trigger's `ORDER BY id ASC` (scripts/project-social-drafts.js:65) can rely on?
**WHY UNKNOWN:** The trigger was written against an assumed schema; the live schema was never compared.
**EVIDENCE NEEDED:** Live `\d events` column listing.
**INSPECTION PERFORMED:** Read-only `\d events` on the live cluster. Compared against the trigger query text.
**RESULT:** The column exists: `id uuid NOT NULL DEFAULT uuid_generate_v4()`, primary key, btree. The assumption matches structurally.
**FINAL CLASSIFICATION:** RESOLVED (with caveat). The column exists, so the query is valid. Caveat: `uuid_generate_v4()` is random, so `ORDER BY id` is a stable but NON-chronological order. If the trigger's intent was temporal ordering, it should order by `timestamp` (which exists and is indexed: `idx_events_timestamp`). Also note the live `events` table currently holds 0 rows and its `valid_event_type` CHECK constraint only admits HPP-flavored types, while the canonical PING traffic lives in `ping_events` (739 rows); the trigger's allowlisted types (`CLAIM_CREATED`, `REPLAY_COMPLETED`, `PROJECTION_CREATED`) would need to exist in whichever table it targets.

### Unknown 3. Live data volumes in `knowledge_nodes`, `ping_events`, `ping_missions`.

**QUESTION:** What are the live row counts (no live DB had been queried)?
**WHY UNKNOWN:** Sprint policy was no live DB queries; volumes were genuinely unobserved.
**EVIDENCE NEEDED:** Read-only `SELECT count(*)`.
**INSPECTION PERFORMED:** Read-only counts on `crx_runtime` at ~05:35 MDT 2026-09-18.
**RESULT:**
- `knowledge_nodes`: 68
- `ping_events`: 739
- `ping_missions`: 144
- Bonus observations: `knowledge_edges`: 0 (confirms final report 5.3: edges never projected); `events` (HPP-style table): 0 rows; `ping_events` type mix topped by 144x each of MISSION_CREATED/ASSIGNED/STARTED/COMPLETED, 18x each of the pipeline types (OBSERVATION_CREATED, CLAIM_CREATED, CLASSIFICATION_CREATED, LINEAGE_CREATED, PROJECTION_CREATED, RECOMMENDATION_CREATED, REPLAY_COMPLETED, WITNESS_CREATED).
**FINAL CLASSIFICATION:** RESOLVED. Volumes are small; every downstream consumer (compiler caps, scheduler skip, graph reads) operates well within its bounds.

### Unknown 4. Whether human-approval events (`SNIPPET_APPROVED`, etc.) have any producer.

**QUESTION:** Does anything emit `SNIPPET_APPROVED` / `SNIPPET_REJECTED` / `AI_RESPONSE_ACCEPTED` / `AI_RESPONSE_REJECTED`? If not, nodes stay `candidate` forever.
**WHY UNKNOWN:** The approval tier was described as "theoretical"; no producer had been traced.
**EVIDENCE NEEDED:** Codebase-wide producer search plus live event-type census.
**INSPECTION PERFORMED:** (a) Grepped the worktree for `SNIPPET_APPROVED` outside tests/evals/fixtures; (b) checked live `ping_events` for all four approval types; (c) checked `gateway/routes/` for any approve endpoint; (d) checked `knowledge_nodes` status distribution.
**RESULT:** No producer exists.
- Code: consumers only. `ping-runtime/workers/canonical_workers.js:884-894` registers the `knowledge-promotion` worker FOR those types; `ping-runtime/knowledge/knowledge_promoter.js` handles them (`APPROVE_EVENTS`); `ping-runtime/orchestration/event_to_mission_bridge.js:81` maps `SNIPPET_APPROVED` to a `KNOWLEDGE_PROMOTE` mission (a routing rule for incoming events, not a producer). The only emitter found is `gateway/generated/event_generator.js:325`, a fixture generator.
- No gateway route mentions "approve".
- Live `ping_events` (739 rows, 26 types): zero rows of any of the four approval types.
- Live `knowledge_nodes`: all 68 rows are `candidate`; 0 approved. `knowledge_edges`: 0.
**FINAL CLASSIFICATION:** RESOLVED. The report's conditional is confirmed as fact: with no producer, nodes stay `candidate` forever in practice. The approval tier is theoretical until Nolan defines the approver identity and semantics (final report blocked item 1).

### Unknown 5. The correct 0.8 confidence threshold (uncalibrated, no live distribution observed).

**QUESTION:** What is the correct value for `KNOWLEDGE_CANDIDATE_CONFIDENCE_THRESHOLD`?
**WHY UNKNOWN:** No live confidence distribution had been observed; the value was chosen, not calibrated.
**EVIDENCE NEEDED:** Live confidence distribution plus a calibration decision (product judgment about what "high confidence" means for this business).
**INSPECTION PERFORMED:** Read-only `SELECT confidence, count(*) FROM knowledge_nodes GROUP BY 1` on the live cluster.
**RESULT:** All 68 candidate nodes have confidence exactly 0.5 (the writer default). The live distribution is a single spike at 0.5, so the current >=0.8 bar admits ZERO live rows: the H69 candidate fallback injects nothing today. The "correct" threshold cannot be derived from this data; it requires either real scoring variance or a product decision.
**FINAL CLASSIFICATION:** UNKNOWN (honest). The distribution is now observed (uniform 0.5), which is new evidence, but the question asks for the CORRECT threshold, and that remains a product/calibration decision for Nolan. Partial progress: we now know the fallback is currently a no-op on live data.

### Unknown 6. Whether `/api/v1/missions/cards` was ever specified or was purely a UI-side mistake.

**QUESTION:** Was the endpoint specified anywhere, or did the UI invent it?
**WHY UNKNOWN:** H37 forensics explicitly could not determine this.
**EVIDENCE NEEDED:** Spec/doc/git-history search for the endpoint.
**INSPECTION PERFORMED:** (a) `git log -S 'missions/cards'` across all refs; (b) grep of spec/readiness docs; (c) check of gateway `/api/v1` mounts and Next.js proxies.
**RESULT:** It WAS specified, on paper, and never built. `CONSTITUTIONAL_INTEGRATION_READINESS.md` (committed 2026-07-05 in `d596aa596`) lists "Mission Cards | Live | `GET/POST /api/v1/missions/cards`" alongside a full `/api/v1/*` surface (health/organizational, mixer, reasoning, knowledge-graph, ollama, timeline, memory, repository, decisions). The "Live" marking was aspirational: on the gateway, `/api/v1` mounts exist only for ollama, repository, and timeline (`gateway_runtime.js:720,729-730,741-742`); missions mount at `/missions` with no `/api/v1` prefix and no `/cards` route. All 12 phantom widgets (DecisionEngine, NightShift, MCPOrchestration, ReasoningPuppetStrings, SemanticMemory, ConstitutionalMixer, OrganizationalHealth, LivingRepository, OllamaControlRoom, TimeMachine, plus MissionCards) fetch `/api/v1/*` URLs from that same paper spec; the Next app has no `/api/v1` proxy/rewrites. The only `git -S` hits for "missions/cards" are the sprint's own H37/H72 docs.
**FINAL CLASSIFICATION:** RESOLVED. Specified in the integration-readiness plan as an intended API; never implemented on any tier; the UI was built against the paper spec. Not purely a UI-side invention, and not a dropped backend either. The readiness doc's "Live" column should be treated as untrusted for the remaining `/api/v1/*` rows.

### Unknown 7. Compile cost savings from H78 (structural, not profiled).

**QUESTION:** How much does the H78 skip actually save?
**WHY UNKNOWN:** The claim was structural (fewer compilations); nothing was measured.
**EVIDENCE NEEDED:** (a) Fraction of missions that skip; (b) per-compile cost profile.
**INSPECTION PERFORMED:** (a) Compared the 144 live `ping_missions` by `mission_type` against `MISSION_WORKER_MAP` in `mission_scheduler.js` (verified the skip logic at lines 302-325: `workerName !== "observation"` returns caller pack or null without compiling). (b) Micro-benchmarked `ContextCompiler.compile()` on the Pig with stubbed in-memory deps (no DB), Node 22, 2 warmups: 100 events ~2.51 ms, 20 events ~0.50 ms, 5 events ~0.09 ms per compile.
**RESULT:** 126 of 144 observed missions (87.5%) map to non-observation workers (CLAIM_GENERATE, CLASSIFICATION_CREATE, LINEAGE_CREATE, PROJECTION_CREATE, RECOMMENDATION_CREATE, REPLAY_VERIFY, WITNESS_CREATE at 18 each) and now skip compilation; only the 18 observation-mapped business missions compile. Measured CPU floor per skipped compile is sub-millisecond to ~2.5 ms depending on correlation-group size. Avoided per skipped mission in production: one correlation-group DB fetch, one evidence-accumulate DB read, two `queryNodes` graph round-trips, plus that CPU. The DB round-trips were NOT wall-clock profiled against live Postgres (likely the dominant term; local PG round-trips are single-digit ms).
**FINAL CLASSIFICATION:** RESOLVED (bounded estimate). The structural claim now has measured structure: 87.5% skip rate on observed traffic, CPU floor profiled. Remaining genuinely unmeasured: production wall-clock per mission (the DB latency avoided). The savings are real but small in absolute terms at current volumes; the value is architectural (no wasted work), not a latency win anyone will feel.

### Unknown 8. Whether any UI consumer reads `event.context_pack` out-of-band.

**QUESTION:** Does anything outside the pipeline read `event.context_pack` directly?
**WHY UNKNOWN:** H77 raised it; no UI-side search had been done.
**EVIDENCE NEEDED:** Codebase-wide search for `context_pack` readers outside `ping-runtime/`.
**INSPECTION PERFORMED:** Grepped all `.js/.ts/.tsx/.jsx` under the worktree (excluding node_modules) for `context_pack`, and specifically `CascadeProjects/` (the UI tree).
**RESULT:** Zero UI consumers. The only readers outside `ping-runtime/` are all in-band to the social-draft pipeline: `runtime/kernel/projections/social_draft_projection.js` (copies `context_pack_id` from source event bytes into draft rows; also synthesizes its own `ctx_` id at line 150), `runtime/kernel/projections/social_draft_review.js` (reads the draft row's `context_pack_id`), `scripts/review-drafts.js:142` (CLI display of the draft row's pack field), plus the projection tests. No component, page, or service reads `event.context_pack` out-of-band.
**FINAL CLASSIFICATION:** RESOLVED. No out-of-band UI consumer exists. The lineage fields remain write-only provenance (final report 5.1 stands).

---

## Scoreboard

**Falsified claims (6/6 classified, all verified against code/tests):**

| # | Claim | Classification | Severity | Next action |
|---|-------|----------------|----------|-------------|
| 1 | "The test blesses the dormancy" | Documentation defect | Low | Nolan decides: wire `executeEvent` or retitle the test to document the deliberate boundary |
| 2 | "ContextCompiler has no consumer" | Stale architecture | Low | None (optionally note H65 consumer in compiler header) |
| 3 | "KnowledgeGraph has no reader" | Stale architecture | Low | None (optionally annotate H68 "zero consumer" as superseded) |
| 4 | "MissionCards is a real widget with a backend gap" | Unreachable feature | Low | Spec backend first if cards UI is ever wanted; keep component as design reference |
| 5 | "Pack reuse would be an optimization" | Documentation defect | Info | None; H77 record stands as the guard against future caching proposals |
| 6 | "CockpitDashboard consumes the SystemAuthority knowledge count" | Documentation defect | Low | None for the claim; adjacent UI shape mismatch flagged for later triage |

**Unknowns (7 resolved, 1 remains UNKNOWN):**

| # | Unknown | Final classification | One-line reason |
|---|---------|---------------------|-----------------|
| 1 | `social_drafts` DDL on live Postgres | RESOLVED | Table exists on no database in the live cluster; DDL never applied |
| 2 | `events` schema vs `ORDER BY id` | RESOLVED | `id uuid` PK exists; caveat that uuid v4 ordering is non-chronological |
| 3 | Live data volumes | RESOLVED | knowledge_nodes=68, ping_events=739, ping_missions=144 (2026-09-18 ~05:35 MDT) |
| 4 | Approval-event producers | RESOLVED | Zero producers in code (fixtures only) and zero approval events in 739 live rows; all 68 nodes candidate |
| 5 | Correct 0.8 confidence threshold | UNKNOWN | Live distribution observed (uniform 0.5, so the bar admits nothing today) but "correct" needs Nolan's product/calibration decision |
| 6 | `/api/v1/missions/cards` spec vs UI mistake | RESOLVED | Specified in CONSTITUTIONAL_INTEGRATION_READINESS.md as "Live"; never implemented; UI built against the paper spec |
| 7 | H78 compile cost savings | RESOLVED (bounded) | 87.5% skip rate on observed traffic; CPU floor 0.09-2.5 ms/mission profiled; production DB latency avoided but not wall-clock measured |
| 8 | Out-of-band `event.context_pack` UI readers | RESOLVED | None; only in-band social-draft pipeline readers exist |

**Resolved: 7 of 8 unknowns. Remaining UNKNOWN: 1 (U5, the confidence threshold, which is a product decision by nature).**

---

## Method notes and caveats

- Live DB inspection was read-only (`SELECT`, `\d`, catalog queries) via `docker exec` peer socket auth on the Pig. No passwords, tokens, or credential files were read or used; no rows were written; no schema was touched.
- "Live" throughout means the `ping-postgres` container / `crx_runtime` database on the Pig, the operational store behind the running `ping-gateway` (up 12h). The sprint's no-live-DB policy was a sprint constraint; this continuation task explicitly asked for evidence, and read-only inspection was the only way to resolve U1-U4.
- The benchmark for U7 used stubbed in-memory dependencies; it measures the CPU floor only, not production DB latency. Stated as a bound, not a production measurement.
- One adjacent observation is recorded under Claim 6 (CockpitDashboard's expected `SystemState` shape vs the actual `/system/state` shape). It was not investigated to a verdict; it is flagged for later triage with a live gateway, per the read-only rule.
- No pushes, no production mutations, no credential use. Nothing was patched; every item above is classified only, with next actions left as decisions for Nolan or the coordinator.
