# Constitutional Sprint — Findings Log (night shift, 2026-09-23 ~19:35 MDT)

Append-only. Every entry: finding, severity, evidence (file:line), status.

## F1 — LIVE unauthenticated event injection [SECURITY] [P0] [DEPENDENCY: convergence wave]
- Evidence: src/app/api/kit/webhook/route.ts (adapter worktree @ a69bb68f) accepts POSTed Kit events with no signature/secret verification; KIT_WEBHOOK_SECRET declared but never consulted.
- Consequence: anyone can inject forged events (incl. subscriber PII) into the HPP event log.
- Status: PROVEN by security sweep. Handed to convergence wave as D1 (they own substrate security patches).

## F2 — LIVE unauthenticated tag/write + open redirect [SECURITY] [P1] [DEPENDENCY: convergence wave]
- Evidence: src/app/api/resources/download/route.ts — unauthenticated POST tags arbitrary Kit subscriber emails, logs email PII, reflects attacker-supplied resourceUrl as downloadUrl (no allowlist).
- Status: PROVEN by security sweep. Handed to convergence wave as D2.

## F3 — demo-owner-mode as sole authorization for owner mutations [SECURITY] [P2] [dormant by design]
- Evidence: src/fyd/owner-mode/gate.ts; api/fyd/customize; api/fyd/objects/[objectId]/overrides; api/fyd/claims/[resourceId]/verify. Private-host gate trusts client-controlled Host header; flag is build-time NEXT_PUBLIC_* var.
- Status: PROVEN dormant; misconfiguration risk only. Recorded, no action.

## F4 — adapter repo is NOT the constitutional core [ARCHITECTURE] [P0]
- Evidence: authority-map investigator; /home/nolan/ping confirmed on Pig with authorities/, kernel/, gateway/, constitution/, witness_worker.py, replay_worker.py, lineage_worker.py.
- Consequence: all adapter-repo verdicts must be re-verified against the core. All running investigators re-scoped to dual-base.
- Status: CONFIRMED. Reconciliation pending investigator returns.

## F5 — event-store conflict RESOLVED: UnifiedEventRuntime → ping_events is sovereign; ConstitutionalEventStore does not exist [EVENT] [P0]
- Evidence: zero hits for ConstitutionalEventStore in every branch/worktree/code dir searched (adapter + core). UnifiedEventRuntime constructed in core gateway/bootstrap/gateway_runtime.js; emit() = deterministic SHA-256 identity → validation → governance → INSERT INTO ping_events ON CONFLICT (event_id) DO NOTHING (idempotent) → in-process .on() dispatch → IntegrationManager. Table hardened by trg_ping_events_append_only. Corroborated by 2026-09-16/17 live capture.
- Core branch: refactor/runtime-authority-convergence; deployment copies /home/nolan/ping-gateway-src and /home/nolan/ping-gateway-build are identical.
- Status: PROVEN. Deliverable: event/EVENT-FORENSICS.md.

## F6 — AcquisitionManager does not exist [EVENT]
- Evidence: zero hits in all repos/branches/core; only collectEvidence is an unrelated Dispatcher method in ping-runtime/orchestration/dispatcher.js. Caller→fate map is empty.
- Status: NOT PROVEN (cannot be live).

## F7 — IEventAuthority is an abandoned contract; EventReadAuthority live but partial [EVENT]
- Evidence: zero implementations/imports of IEventAuthority anywhere. EventReadAuthority routes fall back to direct SELECT * FROM ping_events SQL. JS kernel EventRepository → repository_events is LIVE secondary (agent/memory/mission journal, hash-chained). Python EventRepository/PostgresEventRepository/EventStore (constitutional-runtime) ABANDONED — 2026-07-28 ledger claim REFUTED by current source. CanonicalizationService is the LIVE boundary (namespace auth + canonicalizeAndEmit, serves POST /ingest).
- Status: PROVEN.

## F8 — event identity uses JSON.stringify, not canonical JSON [EVENT] [P2]
- Evidence: emit()'s SHA-256 content-hash is computed over JSON.stringify output. Determinism caveat for the identity investigator.
- Status: PROVEN. Cross-ref: identity/hash investigator.

## F9 — ordering is timestamp-based, weaker than sequence [EVENT] [P2]
- Evidence: no sequence enforcement found on the live path; ordering relies on timestamps.
- Status: PROVEN (flagged). Cross-ref: replay/witness/lineage investigator.

## F10 — NATS not live in JS event path; transport is in-process [EVENT]
- Evidence: NATS exists only in dormant Python code; live JS path uses in-process dispatch + IntegrationManager. Three-table reality: ping_events (sovereign) ← EventBridge (5s poll, started in bootstrap) ← repository_events + canonical_events (live secondaries). No SQLite event storage.
- Status: PROVEN.

## F11 — replay is partial: no full-journal reconstruction consumer [EVENT/REPLAY] [P1]
- Evidence: replay = event_id-deduped re-emit/convergence only.
- Status: PROVEN (partial). Awaiting replay investigator's core verdict.

## B1 — BLOCKED: which POST /events code runs in the Oracle container [EVENT]
- Evidence: 2026-09-16/17 capture (authorizeNamespace + canonicalizeAndEmit → 403) matches NEITHER Pig-side copy: /home/nolan/ping worktree has BFF-adapter branch with no tenant check; ping-gateway-src/build do tenant-registry validation then direct emit. Spine PROVEN; HTTP ingest boundary BLOCKED pending live probe or container source export.
- Status: BLOCKED. Candidate for morning live probe (parent approval needed — touches live container).

## F12 — live site is dark behind a rendering facade [REACHABILITY] [P0]
- Evidence: all three next-servers (:3100 served site, :3101, :3210) run with ZERO gateway env vars. PING_GATEWAY_BASE_URL unset → GatewayNotConfiguredError kills all 14 api/ping/* + api/practice/* routes. Canonical ping-gateway HEALTHY on :8080 with ZERO clients. Public pages render from dump JSON.
- Status: PROVEN (passive observation: ps, ss, docker inspect, config reads). Deliverable: reachability/REACHABILITY.md.
- Consequence: the served product is disconnected from the constitutional core tonight; nothing the site "does" reaches the gateway.

## F13 — social writes and Ask FYD journal path default to phantom 127.0.0.1:18199 [REACHABILITY] [P0]
- Evidence: nothing listens on 127.0.0.1:18199; fyd-tenant-graph.ts throws FydTenantGraphError with no fallback.
- Status: PROVEN. Cross-ref: FYD golden-path investigator (ask FYD arrow), seams investigator (envelope/transport seam).

## F14 — flagship tests are dead: import from empty dirs, CI references nonexistent scripts [REACHABILITY] [P1]
- Evidence: 5 of 6 core test/*.test.js crash at require('../gateway/adapter_compiler') (only _v2.js exists). 5 certification replay tests (incl. 1000x determinism) import from runtime/replay/, an EMPTY directory. CI constitutional_ci.yml references 6 test/*.js scripts that don't exist; replay-integrity.yml calls npm run replay:test, a script that doesn't exist. Last-green UNVERIFIABLE (no gh, no run records).
- Status: PROVEN. Tests ≠ proof: do not cite these as working.

## F15 — adapter has no CI and no runnable suite; social write authority has zero tests [REACHABILITY] [P1]
- Evidence: ~128 jest files, one config (src/jest.config.cjs) scoped to exactly 1 file, no root config, no node_modules, no .github/workflows. src/fyd/social/* (CANONICAL_LIVE write authority) has zero test files.
- Status: PROVEN.

## F16 — real proof exists but is narrow [REACHABILITY]
- Evidence: owner-events replay determinism, identity binding contracts, claim machine + store round-trip, grants via ask-fyd tests, tests/test_runtime_authority_boundaries.py — all verified by reading. tests/certification/replay_determinism.test.js EXECUTED tonight: PASSED (exercises a deprecated API — noted). Qdrant/vault docker "unhealthy" tags are healthcheck misconfigurations (curl missing; http-vs-https), not outages — qdrant serves 1.18.2.
- Status: PROVEN. Proof ladder (7 real vs decorative commands) in reachability/REACHABILITY.md §6.

## F17 — "EVIDENCE IS NOT CORRECTED" PASSES at the live journal [EVIDENCE] [P0]
- Evidence: UnifiedEventRuntime.emit (core ping-runtime/events/unified_event_runtime.js:74-90) uses content-based SHA-256 event IDs and INSERT ... ON CONFLICT (event_id) DO NOTHING; on conflict re-reads the stored payload and FAILS CLOSED on semantic mismatch (:161-174). No UPDATE in the emit path; processed/failed markers go to a separate operational table.
- Status: PROVEN. Deliverable: evidence/EVIDENCE-OBJECT-INTENT.md.

## F18 — replace-on-conflict upsert exists but has ZERO consumers (dead code, latent hazard) [EVIDENCE] [P2]
- Evidence: EventStorePersistence._persistEvent (core gateway/eventstore_persistence.js:358) carries the upsert; gateway-wide search found zero consumers.
- Status: PROVEN dead. Refuted as a live defect.

## F19 — adapter satellite stores are NOT correction-proof; claim release() DELETES the persisted VerificationProof [EVIDENCE] [P0]
- Evidence: snapshots/media/preview manifests overwrite; adapter src/fyd/claim/machine.ts:164 + store.ts:68 — release() deletes the persisted VerificationProof.
- Status: PROVEN mechanism. Referred to Agents 01/02 for patch consideration.

## F20 — owner-store key split: same business's intent can land in two logs [INTENT] [P1]
- Evidence: slug-keyed vs PING-object-ID-keyed owner stores (adapter view.ts:316 vs by-id.ts:36). Owner mutation is demo-only with structural disclosure (owner-context.ts:150-152); no connected owner auth.
- Status: PROVEN mechanism; production impact BLOCKED on live trace.

## F21 — dual graph read authorities; overlay op vocabulary implemented twice [PROJECTION] [P1]
- Evidence: disk projection vs fixture + live-journal replay consumed by different lanes; overlay ops implemented in Python + TypeScript.
- Status: PROVEN. Cross-ref: Agent 04, seams investigator.

## F22 — one canonical object envelope CONFIRMED in core after consolidation [OBJECT]
- Evidence: core ping-runtime/canonicalization/canonical_object.js:70; ~15 isomorphic implementations consolidated per docs. Adapter duplicate-compiler concern confined to adapter read paths.
- Status: PROVEN.

## F23 — FIRST BROKEN BOUNDARY: liveness predicate of the adapter constitutional surface [ARCHITECTURE] [P0]
- Evidence: agent20-convergence/GLOBAL-AUTHORITY-MAP.md §4 (lines 111-128). 19 mechanisms classified CANONICAL_LIVE on static import traces; reachability proved all journal-touching paths operationally dark (F12: GatewayNotConfiguredError on 14 BFF routes; F13: social writes to phantom :18199; Ask FYD journal path FydTenantGraphError) while healthy :8080 gateway has zero clients and pages render from dump JSON.
- Verdict: static-live (import-reachable) is not runtime-live. Declared authority ≠ actual capability. Silent rendering facade — no honest error reaches the user.
- Required: global map must carry TWO liveness dimensions (declared-live vs actually-reachable); nothing reports CANONICAL_LIVE without the second.
- Status: PROVEN by Agent 20 cross-pass. Runner-up: B1 (Oracle POST /events sovereignty) still BLOCKED.

## F24 — CP-1: HTTP ingest boundary authority is undecided [GOVERNANCE] [P0]
- Evidence: GLOBAL-AUTHORITY-MAP.md CP-1 (lines 63-72). Competing claims: CanonicalizationService (namespace auth + canonicalizeAndEmit) vs two divergent POST /events Pig-side copies vs 2026-09-16/17 live capture matching neither.
- Recommendation: single ingest authority after B1 closes.
- Status: OPEN DECISION. Awaiting Agent 01 re-dispatch (B1 closure).

## F25 — CP-2: two live divergent canonical-JSON serializers + digest-rebinding migration hazard [IDENTITY] [P1]
- Evidence: GLOBAL-AUTHORITY-MAP.md CP-2 (lines 73-84); event F8 (JSON.stringify hashing).
- Status: PROVEN mechanism. Decision OPEN: which serializer owns canonical bytes.

## F26 — CP-3: two dev signing custodians (signAsFydIdentity vs signAsIdentity) [SECURITY] [P1]
- Evidence: GLOBAL-AUTHORITY-MAP.md CP-3 (lines 85-90).
- Recommendation: one module, two key roots.
- Status: PROVEN mechanism. Decision OPEN.

## F27 — CP-4: two "current site graph" readers (dump projection vs journal overlay) [PROJECTION] [P1]
- Evidence: GLOBAL-AUTHORITY-MAP.md CP-4 (lines 91-98); cf. F21 dual graph read authorities.
- Recommendation: journal-derived reader as target authority, dump reader as labeled fallback.
- Status: PROVEN mechanism. Decision OPEN.

## F28 — CP-5: replay law vs live capability (frozen replay/ping-replay-law.md vs partial re-emission reality) [REPLAY] [P1]
- Evidence: GLOBAL-AUTHORITY-MAP.md CP-5 (lines 99-108); event forensics (replay = deduped re-emit only).
- Recommendation: amend the law or implement full-journal reconstruction.
- Status: PROVEN gap. Decision OPEN. Awaiting Agent 03 deliverable.

## F29 — WRITE-GATE BREACH: undisclosed behavioral patch in sprint worktree [GOVERNANCE] [P1]
- Evidence: /home/nolan/projects/ping-constitutional (worktree @ a69bb68f) has 3 uncommitted modifications: src/fyd/claim/identity.ts (disclosed docstring-only patch by the FYD golden-path worker, mtime 20:14 MDT) PLUS src/fyd/social/attestation-gate.ts and src/fyd/social/readers.ts (mtime 20:37:25 MDT, UNDISCLOSED by any handoff).
- The undisclosed changes are behavioral, not cosmetic: NetRelationship interface gains required field `created_at: string`; `winsOver()` ordering changes from (sequence, event_id) to (sequence, created_at, event_id); comments correct the false claim that a core-side projector enforces (sequence, created_at, event_id) ordering (cf. event F9: ping_events has no sequence column).
- Ownership per WRITER-OWNERSHIP.md: attestation-gate.ts = agent02-witness-evidence; readers.ts = agent04-projection-retrieval. No WHY→EVIDENCE→MINIMUM CHANGE→TEST→RESULT record exists under patches/ for either.
- Status: UNREVIEWED WIP. Change preserved (not reverted) pending owner attribution. Agents 02 and 04 asked to confirm authorship and produce the evidence record, or disclaim.

## F30 — FYD trust loop HOLDS (owner corrections survive regeneration) [FYD] [P0-verdict]
- Evidence: fyd-path/FYD-GOLDEN-PATH.md. Three independent mechanisms: append-only event log (object/owner-events.ts:622), overlay composed AFTER digest verification at the read seam (data/ping-object-source.ts:241-249), refreshSource returning sha256 ownerLayerIntact digest proof (builder/source-refresh.ts:118). Conflict resolution keeps losing claims (refresh/conflict.ts:91).
- Status: PROVEN.

## F31 — Ask FYD is deterministic and LLM-free [FYD] [P0-verdict]
- Evidence: fyd-path/FYD-GOLDEN-PATH.md. Zero LLM/AI-SDK imports in src/fyd; composeAnswer is a pure function of (bounded context, question); every factual sentence cites [n]; no-evidence → honest refusal. Three non-conflated vocabularies (render atoms / ask 3-class / FactClass).
- Status: PROVEN.

## F32 — Google OIDC auth is code-complete but INACTIVE; demo-owner mode is the only operative identity [IDENTITY] [P1]
- Evidence: fyd-path/FYD-GOLDEN-PATH.md. Auth leg is Google OIDC (PKCE, JWKS, deterministic uuidv5 binding) — NOT Facebook; no Facebook Login anywhere. Live check: 503 AUTH_NOT_CONFIGURED (session_not_configured). Demo-owner mode gated to private hosts is the only operative identity (cf. F3 Host-header trust).
- Status: PROVEN. Cross-ref: identity investigator (Agent 05), seams investigator.

## F33 — customize-with-FYD journals to a phantom demo journal; approvals fail closed [FYD] [P1]
- Evidence: fyd-path/FYD-GOLDEN-PATH.md. FYD_CUSTOMIZE_GATEWAY_URL ?? 127.0.0.1:18199; nothing listens there (cf. F13). Approvals fail closed with 502 journal_unavailable. Field corrections (read-side) unaffected. Emission gate wired: planner throws BindingVerificationError on any UNKNOWN atom (binding-verifier.ts:523, planner.ts:398).
- Status: PROVEN.

## F34 — core approval is label-bound, NOT digest-bound; approval for X can authorize Y [GOVERNANCE] [P0]
- Evidence: fleet/observability/obs4-governance-trace.md (G7). Core ApprovalAuthority._generateApprovalId hashes only {patch_id, timestamp}; approvals table never records a patch digest; approveManually approves by approval ID with no digest check. Conditions are vacuous (passed || true).
- Contrast: adapter lane enforces approval↔digest binding (submitProposal recomputes digest from canonical bytes at approval time; rejects on drift).
- Dependency: Agent 13 (Postgres) — read-only SELECT on approvals/mission_executions to check whether rubber-stamp rows accumulate in production state.
- Status: PROVEN mechanism in code. Production-state impact BLOCKED on DB read.

## F35 — approval-gated executor cannot execute: field-name mismatch makes the gate live-dead [EXECUTION] [P1]
- Evidence: obs4-governance-trace.md (G8). _commit checks approval.status but requestApproval returns approval_status → every commit throws "Cannot commit unapproved patch". Fail-closed, but the broken gate sits on a live path (activities wire into executeMission).
- Status: PROVEN mechanism.

## F36 — witness certifications are partially theater [WITNESS] [P1]
- Evidence: obs4-governance-trace.md (G9). ReplayCertificate's witness hardcodes success: true with no check; signature defaults null with no signing step; runtime/replay/ is an EMPTY directory — certificates name a replay kernel that does not exist on disk.
- Cross-ref: CP-5 (replay law vs live capability).
- Status: PROVEN.

## F37 — zero-trace authorization: CertificationAuthority.certify has no runtime callers; grantsForViewer leaves no durable trace [GOVERNANCE] [P1]
- Evidence: obs4-governance-trace.md (negative samples). certify is test-only. grantsForViewer is the best-designed authorization in the adapter but retrospective "who was allowed what, when" is UNANSWERABLE by construction.
- Status: PROVEN.

## F38 — all 9 core root workers are DORMANT; nothing starts any of them [WORKERS] [P1]
- Evidence: fleet/semantic/s4-workers.md. No cron, no systemd, no container (docker ps -a shows zero worker containers ever created), no gateway bootstrap spawn, no test imports. Core HEAD cc6856c.
- Status: PROVEN.

## F39 — fake completion hazard: worker main() harnesses report success on synthetic data against production-configured DB [WORKERS] [P1]
- Evidence: s4-workers.md. Every root worker main() runs a sample-event harness (aggregate_id "test-doc-001") printing "X worker test complete" while writing to the production-configured database.
- Status: PROVEN mechanism. (Dormant, but a trap for any future operator.)

## F40 — DOCUMENT_IMPORTED→PROJECTION_CREATED pipeline exists 4x with 3 incompatible progress trackers [PROJECTION] [P0]
- Evidence: s4-workers.md. Root Python workers, workers/ Python variants (direct psycopg2 vs gateway HTTP), runtime/projection_worker/ variant, JS canonical_workers fleet — only the JS fleet is registered by the live gateway bootstrap (gateway_runtime.js:514). Progress tracked three ways (processed_at, gateway processed flag, event_processing table).
- Status: PROVEN. (Constitutional duplication — one projection authority required.)

## F41 — compose.yaml advertises 6 worker services that can never start [WORKERS] [P2]
- Evidence: s4-workers.md. 3 reference Dockerfiles that do not exist (Dockerfile.projection/witness/replay); 6/6 never started.
- Status: PROVEN. Dormant hazard.

## F42 — DORMANT HAZARD: simple_projection_worker.py would upsert RANDOM vectors into the LIVE Qdrant collection [SECURITY] [P0]
- Evidence: s4-workers.md. Root workers target the dormant 7-col events schema (not ping_events); simple_projection_worker.py would upsert random vectors into live constitutional_memory Qdrant under deterministic field names (projection_signature); workers/witness_worker.py emits types CHECK-blocked on the live dump.
- S4 proposed 5 minimum corrections (PROPOSE ONLY): disarm fake mains, fix compose, quarantine random-embedding script, consolidate projection twins, cap projection_replay.
- Status: PROVEN mechanism, dormant. Recommended: quarantine before any worker restart.

## F43 — F1 SHARPENED: the repo's own Kit HMAC verifier is an orphan, and it is signature-optional [SECURITY] [P0]
- Evidence: fleet/semantic/s6-adapter-api.md (R1/R3). KitAdapter.handleWebhook (with verifyKitSignature) exists but has ZERO route callers; api/kit/webhook does not use it. Worse: the verifier is `if (signature)`-optional — even wired, it would pass unsigned webhooks.
- Status: PROVEN.

## F44 — diagnostics/sharp bearer token is a publicly visible fallback string; dangling auth reference [SECURITY] [P0]
- Evidence: s6-adapter-api.md (R4) + fleet/security/sec3-env-confusion.md (E1, corroborated). src/app/api/diagnostics/sharp/route.ts:141: Bearer `${DIAGNOSTIC_SECRET || 'dev-diagnostic-secret'}`; .env.example does not declare the var (unset everywhere); non-timing-safe compare. Its docstring cites /api/drive/ingest for authorization — NO SUCH ROUTE EXISTS. "Temporary" but live.
- Status: PROVEN.

## F45 — silent-fallback anti-pattern: FYD lane fails OPEN while BFF fails CLOSED [ARCHITECTURE] [P1]
- Evidence: s6-adapter-api.md (R6) + sec3-env-confusion.md (E3, corroborated). FYD lane defaults to phantom 127.0.0.1:18199 on missing env; BFF lane throws GatewayNotConfiguredError. Two misconfiguration philosophies in one codebase; 502s from ask/social routes misdirect debugging.
- Status: PROVEN.

## F46 — GET signout accepted = CSRF-logout vector [SECURITY] [P2]
- Evidence: s6-adapter-api.md (R7/P4). Auth lane otherwise sound (HMAC sessions, CSRF on unlink, 503-when-unconfigured, no-merge-on-email).
- Status: PROVEN mechanism.

## F47 — F3 ESCALATED: demo-owner-mode is one NEXT_PUBLIC_* flag + Host-header trust away from full owner-mutation exposure [SECURITY] [P0]
- Evidence: sec3-env-confusion.md (E2). Build-time NEXT_PUBLIC_* flag is public in the JS bundle; private-host gate trusts client-controlled Host header (customize:54, overrides:118, verify:46). One build misconfiguration opens the entire owner-mutation surface; Host spoofing possible on any non-Vercel bind.
- Status: PROVEN mechanism.

## F48 — dev-signing custodians disagree on unset behavior [SECURITY] [P1]
- Evidence: sec3-env-confusion.md (E5); cf. CP-3. One throws on unset, the other silently uses hardcoded /home/nolan/.fyd-dev-keys; they also differ on identity-id validation strictness.
- Status: PROVEN mechanism.

## F49 — misc env-downgrade hazards: DEV_MODE_SKIP_KV, cookie Secure on NODE_ENV, postMessage '*' non-prod [SECURITY] [P2]
- Evidence: sec3-env-confusion.md (E6/E7/E8). DEV_MODE_SKIP_KV silently downgrades to static fallback; cookie Secure flag hinges on NODE_ENV; postMessage '*' in non-prod (inherits F4).
- Core (/home/nolan/ping) is CLEAN on NODE_ENV-gated trust decisions: none found in gateway/api_controller.js, gateway/simple_server.js, ping-runtime/.
- Status: PROVEN mechanisms.

## F50 — checked-in __fixtures__ graphs shipped as prod base truth (digest-pinned, mitigated) [PROJECTION] [P2]
- Evidence: sec3-env-confusion.md (E9). Fixtures are digest-pinned so tamper-evident, but prod base truth lives in checked-in fixture files.
- Status: PROVEN, mitigated.

## F51 — identity fragmentation corroborated; recommend single resolvePrincipal() contract [IDENTITY] [P1]
- Evidence: s6-adapter-api.md (R9) + sec3 next-gap. Three unlinkable namespaces (OIDC uuidv5, gateway identity_<16hex>, demo-owner); claim lane deliberately not consuming the real auth lane. Follow/like naming collisions across lanes (R10). Route-level HTTP tests ~absent; social writes zero tests at any level.
- Recommendation: a worker mapping every route handler to its identity source, proposing one resolvePrincipal() contract — convergence must unify one namespace without silently orphaning/merging the others.
- Status: PROVEN mechanism. Action OPEN.

## F52 — core POST /events appends UNSIGNED raw canonical shape to ping_events [SECURITY] [P0]
- Evidence: fleet/security/sec1-tenant-isolation.md (SEC1-01). gateway/routes/events.js else-branch skips verifyBffProof; route_middleware is logging-only. The adapter's own emitOverlayEvent exercises this unsigned shape in-repo. Unauthenticated journal append to the sovereign table.
- Strongest single fix (proposed, not applied): authenticate all journal appends + bind envelope subject/author to the verified signer (closes F52, F53, half of F55).
- Status: PROVEN mechanism, static analysis only.

## F53 — social ingest verifies envelope signature but never binds subject/author to the signer [SECURITY] [P0]
- Evidence: sec1-tenant-isolation.md (SEC1-02). normalizeRelationshipCreated / normalizeObjectCreated never receive the signer's key; normalizeObjectUpdated resolves signerId but never compares to the object's controller. Combined with open POST /identities (no auth), anyone can forge follows/posts/updates attributed to any identity. The C4 attestation gate cannot catch this (attests re-reads of a forgeable journal).
- Status: PROVEN mechanism, static analysis only.

## F54 — FYD_SITE_OVERLAY events unsigned; cross-tenant Ask FYD answer poisoning [SECURITY] [P0]
- Evidence: sec1-tenant-isolation.md (SEC1-03, Chain A). Reader only checks p.siteId === siteId, which a forgery satisfies. Unsigned FYD_SITE_OVERLAY for siteId 'happy-place' → Ask FYD answers with attacker content.
- Caveat: :18199 overlay gateway dark tonight; :8080 serves the same events.js per checkout, but image-vs-checkout drift unverified.
- Status: PROVEN mechanism, static analysis only.

## F55 — social BFF routes sign with escrowed keys for actorId taken from the unauthenticated body [SECURITY] [P0]
- Evidence: sec1-tenant-isolation.md (SEC1-05, Chain C). follow/route.ts → relate() → signAsFydIdentity: actorId/identityId from request body, signed with server-escrowed private keys. Anyone can act as any dev identity.
- Status: PROVEN mechanism, static analysis only.

## F56 — tenant-scoped wrappers unused by live routes; un-gated customize inspect + objects read [SECURITY] [P1]
- Evidence: sec1-tenant-isolation.md (SEC1-07). scoped-* wrappers used only by builder lane and tests; live routes call unscoped stores directly. GET /api/fyd/customize?siteId=<any>&view=inspect and GET /api/fyd/objects/<any> (serves owner correction history) have no gate.
- Status: PROVEN mechanism.

## F57 — demo-owner seeded actor is controller-of-every-site [SECURITY] [P1]
- Evidence: sec1-tenant-isolation.md (SEC1-06); extends F3/F47. Demo-owner-mode's seeded actor is controller of every site; Host-header gate is client-controlled.
- Status: PROVEN mechanism.

## SEC1 disproved (held)
- Filesystem path traversal: all store paths validated before join.
- Ask FYD owner-mode: explicitly visitor-safe.
- claim-machine demo-context guard; reader visibleTo filter — both trust gateway-supplied fields that a forged journal can falsify.

## SEC1 open gap (routed)
- Mission/tenant scoping in CORE unverified: mission.activity.js / automatic_mission_generator.js show no tenant/owner/controller fields; nothing connects missions or the knowledge_ingest_adapter's subject-free relationship path to a tenant boundary. Follow-up: trace one mission end-to-end (generator → ExecutionAuthority → emitted events) and answer which principal a mission executes under. Also verify the running :8080 gateway image matches the checked-out events.js.

## F74 — knowledge graph self-certifies sourceless nodes as verified [PROJECTION] [P0] [agent04]
- Evidence: `POST /knowledge/nodes` (`gateway/routes/knowledge.js:64-72`, mounted `gateway/bootstrap/gateway_runtime.js:798`, no auth middleware observed) writes nodes with caller-supplied fields and no `sourceEventId`; `ping-runtime/search/hybrid_search.js:98` serves stored nodes as `verified: true` ("already passed the graph write path"). `addNode`'s `ON CONFLICT DO UPDATE SET data` (`knowledge_graph.js:96`) silently overwrites node data, contradicting the module's ADD-only docstring.
- Consequence: clearest silent-canonical breach found — a projection with no source link is presented as verified knowledge to `/knowledge/search` consumers.
- Status: PROVEN (code). Exploitability of the write route needs gateway-side auth confirmation (not asserted absent, only unobserved).

## F75 — two live writers to one Qdrant point id [PROJECTION] [P0] [agent04] [DEPENDENCY: Agent 20 conflict check]
- Evidence: `EmbeddingService.subscribe` (`gateway_runtime.js:502`) and `ProjectionWorker.handle` direct `projectToQdrant` (`canonical_workers.js:186-208`) both upsert `toQdrantId(event_id)`; `RECOMMENDATION_CREATED` reaches both via `EVENT_MISSION_MAP` (`event_to_mission_bridge.js:62`) → mission → `WorkerRuntime.dispatch`. Last-write-wins; vector may differ (Ollama vs deterministic fallback).
- Consequence: violates one-writer-per-mutable-semantic-unit.
- Status: PROVEN. Proposal (propose-only, core file): `patches/agent04-projection-retrieval/PROPOSAL-qdrant-single-writer.md` — remove worker's direct Qdrant block, keep its `PROJECTION_CREATED` journal emit (Writer A then projects it; coverage preserved).

## F76 — derived worker events are first-class sovereign journal rows; projection-of-projection is live [PROJECTION] [P1] [agent04]
- Evidence: `ProjectionWorker` journals `PROJECTION_CREATED` into `ping_events` (`canonical_workers.js:182-185`); `PROJECTION_CREATED` ∈ `INDEXABLE_TYPES` (`embedding_service.js:35`) so it is embedded into Qdrant — a `PROJECTION_CREATED` point sampled live in the `knowledge` collection (389 points). Retry duplicates derived rows: worker `_emit` carries wall-clock timestamp → distinct content-hash event_id, no dedup (`worker_runtime.js:88-94` P0-2 retry).
- Consequence: journal mixes source and derived events, distinguishable only by `event_type` string; replay never rebuilds Qdrant (`emit` duplicate-suppression) and no rebuild/drift/deletion mechanism exists for the projection.
- Status: PROVEN (code + live Qdrant sample).

## F77 — public site truth vs Ask-FYD truth are structurally different projections; dump has no freshness bound [PROJECTION] [P1] [agent04]
- Evidence: site renders dump JSON (`dump.py`, manual invocation only — no cron/scheduler refs); on-disk `dumpedAt: 2026-09-22T14:50:58Z` (>24h stale); read seam verifies digest but not age (`ping-object-source.ts`); Ask FYD folds the live journal instead (`fyd-tenant-graph.ts`, deliberately no cache, mutually exclusive by design). Live projections were produced by the UNCOMMITTED dirty `dump.py` v1.1.0, not HEAD.
- Consequence: structural freshness skew between "what the site shows" and "what Ask FYD reasons over", with no staleness signal to any consumer.
- Status: PROVEN.

## F78 — agent04 write-gate response: readers.ts change is NOT agent04's [WRITE-GATE] [agent04]
- Evidence: full session was read-only (greps, sed reads, passive Qdrant GETs; scratch scripts to local /tmp only). The 3 dirty worktree files (`src/fyd/claim/identity.ts`, `src/fyd/social/attestation-gate.ts`, `src/fyd/social/readers.ts`) were observed, never modified.
- Status: RECORDED. No patch applied by agent04 this session; sole proposal is the core Qdrant single-writer (propose-only).

## F58 — live-journal identity CORRECTION: canonical journal is brain-postgres/ping_runtime, NOT ping-postgres/crx_runtime [DURABILITY] [P0]
- Evidence: agent13-postgres-durability/POSTGRES-DURABILITY.md. brain-postgres → ping_runtime: ping_events = 2,429 rows, writes through 2026-09-23 23:24 UTC (gateway container's own routing env). ping-postgres → crx_runtime: ZERO rows in every table (initialized, unused schema). This corrects the recovery agent's R1.
- Durability facts attach to the named volume compose_postgres_data, not the anonymous volume in RECOVERY.md.
- Status: PROVEN.

## F59 — append-only trigger MISSING from the production journal [DURABILITY] [P0]
- Evidence: POSTGRES-DURABILITY.md. trg_ping_events_append_only exists ONLY in staging DBs (lanea_gate x2, rc_staging); defined NOWHERE in /home/nolan/ping source (0 grep hits); applied ad hoc during the 2026-09-16 incident. The live journal has ZERO triggers — anyone with app credentials can UPDATE/DELETE it silently.
- P1 proposed (patches/agent13-postgres/P1-append-only-trigger-live-journal.md): promote the staging-proven function to prod + statement-level TRUNCATE guard (current function's TRUNCATE branch is dead code — row triggers cannot fire on TRUNCATE). NOT applied.
- Status: PROVEN.

## F60 — schema divergence: staging ping_events has sequence BIGINT + index; live does not [SCHEMA] [P1]
- Evidence: POSTGRES-DURABILITY.md. Live initialize() never creates the sequence column. Cf. event F9 (no logical sequence enforcement).
- Decision required: coordinator adopt-or-drop.
- Status: PROVEN divergence.

## F61 — direct-SQL bypass: append_orchestrator raw-INSERTs repository_events, skipping the hash chain [INTEGRITY] [P0]
- Evidence: POSTGRES-DURABILITY.md. gateway/append_orchestrator.js:91 raw-INSERTs with NULL PreviousEventHash/CanonicalEventHash, breaking the per-object replay invariant. customer_authority.js:448 dual-writes (raw INSERT + envelope emit, unbound by transaction; its "No direct pool.query()" header is stale).
- P2 proposed (patches/agent13-postgres/P2-append-orchestrator-bypass.md): route through appendEvent or quarantine with a chain assertion. NOT applied.
- Status: PROVEN mechanism.

## F62 — secondary journals code-wired but data-dark [REPLAY] [P1]
- Evidence: POSTGRES-DURABILITY.md. repository_events = 0, canonical_events = 0, ping_bridge_cursors = 0 in the live DB while EventBridge polls every 5s. The three-table convergence story is code-true, data-false tonight.
- Status: PROVEN.

## F63 — durability = single-machine volume only; the one dump is not a backup of the live journal [DURABILITY] [P0]
- Evidence: POSTGRES-DURABILITY.md. archive_mode=off on all 6 containers; no crontab; no replica; no PITR. The only dump (pg_dump.sql, 2026-09-16) is June-era crx_runtime with zero ping_events rows. No RLS anywhere.
- Status: PROVEN.

## F64 — ghost tables and databases with no source references [DURABILITY] [P2]
- Evidence: POSTGRES-DURABILITY.md. tenants, capability_requests, agent_workspaces, system_metadata in the live DB have zero source references (no CREATE TABLE anywhere). exterior_agent_credentials has 2 rows and no code path (stale). The four h13_* DBs (proposed_actions/effects) have zero references in either inspected base — owner UNKNOWN, do not touch.
- Status: PROVEN. Classify, do not delete.

## F65 — event_outbox is written but never read: NATS is not on the live path [EVENTS] [P2]
- Evidence: POSTGRES-DURABILITY.md. event_outbox.js:132 writes; no consumer. Corroborates event forensics (NATS dormant).
- Status: PROVEN.

## F66 — EventBridge per-item failure = permanent silent drop [RELIABILITY] [P0]
- Evidence: fleet/observability/obs3-queue-trace.md. A failed row's emit() is caught (console.error + in-memory counter) but the cursor advances past the ENTIRE batch including failed rows; next poll's WHERE event_id > cursor skips them forever. The "secondaries converge into ping_events" guarantee is broken under failure. Currently latent (source tables empty), live on first failure.
- Status: PROVEN mechanism, latent.

## F67 — in-process handler throw in emit() = silent, uncounted; worker pipeline permanently skips the event [RELIABILITY] [P0]
- Evidence: obs3-queue-trace.md. UnifiedEventRuntime.emit step 6 catches handler errors with console.error only — no counter, no retry, no DLQ. If EventToMissionBridge fails to create a mission, the event stays durable in ping_events but the worker pipeline permanently skips it. This is the live production chain (63 scheduler dispatches this session).
- The good path is sound: MissionScheduler → failWithRetry (3 attempts, 5s backoff) → DeadLetterAuthority into repository_dead_letters, lease reaping; listable via /mc/dead-letters* (0 right now).
- Status: PROVEN mechanism.

## F68 — zero alerting on any failure path; session-scoped stats lost on restart [OBSERVABILITY] [P1]
- Evidence: obs3-queue-trace.md. No Slack/pager/SMS wiring on any failure path. Visibility = docker logs + session-scoped in-memory counters + /mc/* endpoints. No bridge backlog-depth or lag metric; no ping_missions staleness metric; WorkerRuntime.health() (60s stale) not HTTP-exposed; ping_events.processed is a dead column (2429/2429 FALSE, nothing live sets it).
- Next gap: no end-to-end chain-lag metric per correlation_id — a silently stalled chain is indistinguishable from idle in every current stat.
- Status: PROVEN.

## F69 — dead letter replay has no HTTP route; pool saturation unexposed [OBSERVABILITY] [P2]
- Evidence: obs3-queue-trace.md. replayDeadLetter() listable but not replayable via HTTP; pg pool saturation unexposed anywhere — a pool-exhaustion cascade would appear only as timeouts in logs.
- Status: PROVEN.

## F70 — FAKE COMPLETION: DurableEventStore is in-memory-only; src/lib/editor/* is dormant and unreachable [LIBRARY] [P1]
- Evidence: fleet/semantic/s8-adapter-lib.md. DurableEventStore's own constructor comment disclaims durability while the name asserts it. 8 files / ~2085 lines of constitutional-law editor stack with zero importers, zero tests, zero dynamic-import roots.
- Status: PROVEN. Classify/archive, do not delete.

## F71 — divergent canonical-JSON undefined handling across two LIVE serializers: cross-lane digest mismatch is structural [IDENTITY] [P1]
- Evidence: s8-adapter-lib.md. canonicalizeJson drops undefined keys; canonicalize serializes as null. Both live in their lanes (envelope signing + owner IDs vs graphDigest verification). Corroborates CP-2.
- Proposed (not applied): pick one undefined policy — migration-sensitive, coordinator decision.
- Status: PROVEN mechanism.

## F72 — 11 zero-reference harvest-era modules; dead attestation-gate name-collides with the live one [LIBRARY] [P2]
- Evidence: s8-adapter-lib.md. Dead abstraction pairs (kit-adapter, marketing-provider); estimate/interview/wizard modules; dead fyd/owner-mode/attestation-gate.ts name-collides with the LIVE social attestation gate (cf. F29).
- Status: PROVEN. Classify/archive, do not delete.

## F73 — "For PING and replay systems" docstring on src/lib/events.ts is the main hazard of that module [LIBRARY] [P2]
- Evidence: s8-adapter-lib.md. src/lib/events.ts is half-live (logEvent from 3 routes) but is NOT the PING event store; ReplayRepository/findAfter/existsByProvenance/setEventRepository and the entire WebsiteRepository read half have zero consumers repo-wide.
- Status: PROVEN.

## F79 — two LIVE type_<16hex> identity authorities with DIVERGENT derivation: same format, different IDs [IDENTITY] [P0]
- Evidence: identity/IDENTITY-HASH.md. TS constitutional IA (envelope hash, undefined→null) vs kernel JS IA (CanonicalBytes, undefined→"undefined" bytes). Top convergence item; extends CP-2.
- Decision required: Agent 20 must declare the winning derivation. Deliberately NOT proposed as a minimal patch (A/B unification would fork the persisted id space).
- Status: PROVEN conflict.

## F80 — UER event_id hashes UNSORTED JSON.stringify: key order changes event_id, defeating dedup [IDENTITY] [P0]
- Evidence: identity/IDENTITY-HASH.md. UnifiedEventRuntime.emit hashes raw unsorted JSON.stringify output — key order changes the event_id, so ON CONFLICT DO NOTHING dedup can miss true duplicates (cf. event F8). Deliberately NOT proposed as a minimal patch (would fork persisted id space).
- Corollary: FOUR live serializers with divergent undefined handling, not two (updates F71).
- Status: PROVEN mechanism.

## F81 — Python "single authority" docstrings REFUTED; dormant CanonicalIdentityService has a broken placeholder hash [IDENTITY] [P1]
- Evidence: identity/IDENTITY-HASH.md. 8 dormant uuid.uuid4() sites; 1 live hashlib.sha256 bypass (retriever_worker, non-identity use). CanonicalIdentityService (TS) dormant with a provably broken 32-bit placeholder "sha1" — hazard if revived.
- Two propose-only docstring diffs in patches/agent05-identity/; nothing applied.
- Status: PROVEN.

## F82 — adapter docs stale/wrong against the live core [DOCS] [P2]
- Evidence: identity/IDENTITY-HASH.md. STRUCTURED-DATA.md's "Python IA mints UUIDv7 for canonical identities" is wrong (it mints worker-internal ids; canonical identity is TS-side). Truth-matrix "POST /events routes through CanonicalizationService" is stale (direct emit in current tree).
- Status: PROVEN.

## F83 — gateway identity shim CONFIRMED genuine: the gateway mints nothing itself [IDENTITY] [P1-positive]
- Evidence: identity/IDENTITY-HASH.md. gateway/routes/identities.js:127 calls IdentityAuthority.generateId from ../constitutional-dist/identity-authority.js (gitignored build output, compiled at Docker build time from runtime/constitutional/src/identity-authority.ts), mounted at bootstrap/gateway_runtime.js:683.
- Status: CONFIRMED.

## F84 — git identity is not attestable: zero signed commits, shared identities across 12 worktrees [GIT] [P1]
- Evidence: agent08-patch-commit-git/PATCH-COMMIT-GIT.md. Adapter: Pigi/pigi@ping.local (shared gitconfig across all 12 worktrees). Core: mostly Trish Nikitha <trishnikitha@gmail.com>, one Pigi <pigi@ping.social>. git log --show-signature empty on both repos. Any Pig shell user can commit as anyone.
- Recommendation: require GPG/SSH commit signing with a Nolan-owned key before COMMITS CREATED: NONE is ever lifted.
- Status: PROVEN.

## F85 — no dirty-state protection: main worktree has 104 dirty/untracked entries sharing one .git + identity [GIT] [P0]
- Evidence: agent08-patch-commit-git/PATCH-COMMIT-GIT.md. All hooks are .sample in both repos; the only guard is procedural. fyd-factory now at 104 dirty/untracked entries sharing identity with the sprint worktree — a commit from the wrong cwd would sweep all of it in.
- Status: PROVEN hazard. Recommendation: pre-commit guard refusing commits from the main worktree (persistent state — coordinator decision).

## F86 — Phase-19/20/36I patch pipeline is dormant theater; fabrication authorities one require() from fake witnessed records [GOVERNANCE] [P1]
- Evidence: agent08-patch-commit-git/PATCH-COMMIT-GIT.md. PatchAuthority (validators auto-pass, fake diffs), PatchAuthorityV2 (merge = status flag) are DUPLICATES of each other; ApprovalAuthority defaults to auto-approve approved_by='system'; CommitAuthority fabricates git_commit_hash into postgres; git_persistence_backend fabricates SHAs. All DORMANT, zero callers — but CommitAuthority is a witness-integrity hazard if ever revived.
- Status: PROVEN. Recommendation: keep dead; pick exactly one patch authority if a mechanical gate is ever wanted.

## F87 — F29 cluster GREW: 5 dirty entries, now including untracked __tests__/ and jest.config.cjs [WRITE-GATE] [P2]
- Evidence: agent08-patch-commit-git/PATCH-COMMIT-GIT.md. Sprint worktree was CLEAN at ~20:00 MDT; now M src/fyd/claim/identity.ts, M src/fyd/social/attestation-gate.ts, M src/fyd/social/readers.ts, ?? src/fyd/social/__tests__/, ?? src/fyd/social/jest.config.cjs. Agent 08 made zero writes; another agent's in-flight patch work per WRITER-OWNERSHIP. Test scaffolding suggests the author is building tests around the undisclosed readers.ts change.
- Status: OPEN. Still awaiting Agent 02's write-gate answer.

## F88 — duplicate delivery dispatches side effects: emit() does NOT early-return after ON CONFLICT DO NOTHING [EVENTS] [P1]
- Evidence: fleet/semantic/s2-runtime-events.md. After conflict, emit() increments `deduplicated` but does not return; handlers and all three integrations (posthog/email/sms) fire again, returning status:'ok'.
- Contradicts the 09-23 forensics' early-return claim; current code at cc6856c3b controls.
- Status: PROVEN (code).

## F89 — canon() drops nested keys not coinciding with top-level names: different payloads compare equal [IDENTITY] [P0]
- Evidence: fleet/semantic/s2-runtime-events.md — proven by local node computation.
- Consequence: collision errors are silently missed by canonical equality.
- Status: PROVEN.

## F90 — the five "PROVEN live" repository_events writers are all UNWIRED; the table is producer-less [REPLAY] [P1]
- Evidence: fleet/semantic/s2-runtime-events.md. getAgentMemoryAuthority has no callers; the other four have no importers; append_orchestrator reachable only via unwired authority_registry.js. Table is DDL-initialized live (via GatewayToKernelAdapter) but producer-less. The 09-23 forensics' 403 claim on POST /events matches neither current path (/events has no namespace check; /ingest returns 400).
- Status: PROVEN. Corrects the 09-23 forensics.

## F91 — WorkerRuntime inbox poll is SHADOWED; bridge cursor strands rows; mark-then-emit loses failed rows [RELIABILITY] [P1]
- Evidence: fleet/semantic/s2-runtime-events.md. GET /events/unprocessed (line 145) is shadowed by GET /:stream (line 59) — the inbox poll always gets the wrong handler's empty result. Bridge cursor (event_id > on UUIDs) strands rows; bridge mark-then-emit loses failed canonical rows. Three incompatible `processed` flags across three tables (ping_events.processed has zero writers).
- Status: PROVEN (code).

## F92 — shutdown() never stops the bridge interval or closes the pool; _seedBusinessEvents writes synthetic customers without provenance [RELIABILITY] [P2]
- Evidence: fleet/semantic/s2-runtime-events.md.
- Status: PROVEN (code).

## F93 — dormant history classified: EventWriteAuthority, ConstitutionalRuntime, adapter's never-executed pipeline [HISTORY] [P2]
- Evidence: fleet/semantic/s2-runtime-events.md. Also a competing repository_events DDL in migration_engine.js.
- Status: CLASSIFIED, not deleted. Next gap recorded: worker consumption/ack semantics across the three journals.

## F94 — PingObject identity has no single minter; overlay add_object accepts ARBITRARY emitter strings fail-open [OBJECT] [P0]
- Evidence: fleet/object/o1-adapter-objects.md (BB-1/BB-2, highest risk). Proceduralizer (website-business-<sha16>), media ingest (fyd-media-<sha16>), overlay add_object (accepts any arbitrary emitter string, can shadow other minters' namespaces), plus core runtime at promotion. Same fork for PingRelationship (two different digest truncations + open emitter ids).
- Next gap: core-runtime promotion id scheme unverified from the adapter — does it preserve website-business-* or re-mint? Does the gateway validate overlay op payload ids at ingest?
- Status: PROVEN.

## F95 — identity drift across paths: owner logs keyed by slug vs object id per entry path [OBJECT] [P1]
- Evidence: fleet/object/o1-adapter-objects.md (BB-8/BB-12). D2 mechanism reconfirmed. ObjectView.id changes per path; fixture ids vs slug ids name the same business.
- Status: PROVEN.

## F96 — capability fork: schema law says businesses are not likeable, but buildCapabilities always emits `like` [CAPABILITY] [P2]
- Evidence: fleet/object/o1-adapter-objects.md (BB-10). Agent tool descriptions and UI disagree.
- Status: PROVEN.

## F97 — tenant/site are scope strings, not objects: no tenant minting authority; onboarding = code edit [OBJECT] [P1]
- Evidence: fleet/object/o1-adapter-objects.md (BB-4).
- Status: PROVEN.

## F98 — claim release() destroys the persisted VerificationProof; refresh lane is dormant write-only evidence [EVIDENCE] [P2]
- Evidence: fleet/object/o1-adapter-objects.md (BB-6/BB-7). O1 proposals P1-P8 are propose-only, none applied.
- Sound, correctly kept out of the core: constellation geometry (pure deterministic function), margin descriptors (presentation-only), media lifecycle, owner intent (journaled evidence), SiteSpec. Byte-level identity hazard (canonicalizeJson vs canonicalize undefined fork) corroborates F71/F80.
- Status: PROVEN.

## F99 — core OBJECT_UPDATED bypass: signer bound to an identity but never compared to the object's controller [SECURITY] [P0]
- Evidence: capability/CAPABILITY-PROJECTION.md. social_ingest_adapter.js normalizeObjectUpdated binds the signer to an identity but never compares signer to the object's controller. Any key holder can rewrite any object via direct POST /events, bypassing the adapter's controller check.
- Proposal core-01 written in patches/agent06-capability/ (propose-only; needs Agent 20 conflict clearance + coordinator decision).
- Status: PROVEN (source).

## F100 — POST /events direct branch CONFLICTING across deployment copies; deployed Oracle bytes unresolved [SECURITY] [P0]
- Evidence: capability/CAPABILITY-PROJECTION.md. Worktree copy emits with no signature/capability/namespace check; sibling deployment copies add tenant-registry validation; deployed Oracle bytes unresolved.
- Proposal core-02 written: converge to the existing CanonicalizationService.authorizeNamespace seam, no new authority (propose-only, needs deployed-path truth first — Agent 01 B1).
- Status: PROVEN conflict, deployed truth UNKNOWN.

## F101 — executor use-time capability authorization is UNOWNED [CAPABILITY] [P1]
- Evidence: capability/CAPABILITY-PROJECTION.md. Kernel TS CapabilityAuthority is DORMANT (no live composition-root import; registry.yaml marks it missing). Connector/orchestration registries are LIVE but discovery/routing only. Adapter grants.ts grants are planning hints, never authorization. REFUTED: adapter user grants imply a live executor authority.
- Needs exactly one named owner or explicit deferral.
- Status: PROVEN.

## F102 — proposal digest binding is per-path, not universal [GOVERNANCE] [P1]
- Evidence: capability/CAPABILITY-PROJECTION.md. Strong on proposal/owner-override/customize mutations; absent on follow/like/profile/bio and the core direct emit branch.
- Status: PROVEN. Corroborates F34 (label-bound approvals remain digest-absent).

## F103 — raw /api/fyd/projection route AMBIGUOUS: one private object observed [PROJECTION] [P2]
- Evidence: capability/CAPABILITY-PROJECTION.md. All other user-facing readers policy-filter to public. Dependency: agent04. No patch applied.
- Status: PROVEN ambiguity.

## Agent 06 session notes
- Agent 06: three conflicting identity namespaces (A: OIDC uuidv5 dormant; B: gateway-minted dev live; C: claim-lane demo-owner) corroborate F48/F51; two DUPLICATE dev signing custodians corroborate F48. verifyGoogleIdToken is rigorous but DORMANT until real credentials; no JWT in the core gateway (corroborates F32).
- Proposals: core-01, core-02, adapter-01, adapter-02 in patches/agent06-capability/ + 00-INDEX.md — ALL propose-only, nothing applied. COMMITS CREATED: NONE.
- Open for coordinator: (1) deployed-path truth for POST /events before core-02; (2) raw projection API intent (agent04); (3) identity bridge table (agent05).

## F104 — PHANTOM sequence column: GET /identities + resolveIdentityByPublicKey ORDER BY sequence on a column that does not exist [RELIABILITY] [P0]
- Evidence: fleet/semantic/s1-gateway.md. Both query paths ORDER BY sequence on ping_events; verified DDL + zero migrations — no sequence column exists. Both 500 on every call; the whole BFF OBJECT_UPDATED path is dead.
- Strongest fix (S1 P3, propose-only): replace phantom sequence with created_at — restores documented contracts and un-breaks two endpoints.
- Status: PROVEN. Connects to F60 (staging has sequence, live does not).

## F105 — two LIVE IdentityAuthorities, one format: independent confirmation of F79 [IDENTITY] [P0]
- Evidence: fleet/semantic/s1-gateway.md. gateway/constitutional-dist/identity-authority.js (ingest lane: identities route + both BFF adapters) vs runtime/kernel/authorities/identity_authority.js (kernel shim, ~20 gateway modules). Both emit type_<16hex> but hash different input material (double-envelope + canonicalized context vs {type,version,identity_version,…} via CanonicalBytes). Both file headers claim "the ONE IdentityAuthority."
- Status: PROVEN, corroborates F79.

## F106 — namespace default split + EventBridge owner-intent drift + silent skip on rejected rows [RELIABILITY] [P1]
- Evidence: fleet/semantic/s1-gateway.md. core::owner (service) vs core::system (spine + DDL). Bridged tenant events land as core::system (owner-intent drift). Dead NOT IN dedup guards (ID-scheme mismatch). Cursor advances past rejected rows (silent skip; corroborates F66).
- Status: PROVEN (code).

## F107 — EIGHT canonical-JSON definitions, two each claiming sole/single status [IDENTITY] [P1]
- Evidence: fleet/semantic/s1-gateway.md. The two BFF signature-verification copies are verbatim duplicates under different names. Extends F71/F80.
- Status: PROVEN.

## F108 — dormant/orphan classified: eventstore_persistence.js, provenance_authority.js, EventWriteAuthority [HISTORY] [P2]
- Evidence: fleet/semantic/s1-gateway.md. eventstore_persistence.js has dead replace-upsert + restart-amnesia in-memory shadow; EventWriteAuthority exists but is unwired (refutes forensics §2B#2; corroborates F90).
- Classified, not deleted.
- Status: PROVEN.

## F109 — misc gateway hazards: swallowed authority errors with raw-SQL fallback, BFF dual representation, request-body logging [GATEWAY] [P2]
- Evidence: fleet/semantic/s1-gateway.md. Fabricated seed rows in journal genesis (corroborates F92); broken canon() comparator (corroborates F89); emit() dedup non-return (corroborates F88); POST /events bypasses CanonicalizationService the docs call mandatory; 2026-09-16/17 live capture matches NEITHER Pig-side copy — deployed container bytes remain UNPROVEN (corroborates F100).
- Strongest fix (S1 P2, propose-only): dedup early-return.
- Next adjacent gap (one read-only probe closes container-vs-source drift): POST /events with a malformed namespace against the live container (rejected pre-emit, no journal write) distinguishes capture-version (403) from Pig versions, plus docker cp of container's gateway/routes/events.js and gateway/constitutional-dist/identity-authority.js for byte-diff against the worktree.
- Status: PROVEN / gap OPEN.

## F110 — LATENT INFINITE ECHO: RecommendationWorker and ProjectionWorker registered on their OWN output event types [RELIABILITY] [P0]
- Evidence: fleet/observability/obs3-worker-queue.md. Every downstream mission re-triggers them with fresh timestamps (fresh content-hash event_ids, so dedupe cannot catch it); the bridge converts each echo into new missions. Unbounded mission growth, throttled only by maxConcurrent=3.
- Latent because no business events are currently flowing (0 unprocessed observed). One-line fix each: remove own-output types from eventTypes (propose-only, not applied).
- Status: PROVEN mechanism, trigger condition LATENT. Corroborates F76 (derived rows journaled and re-embedded).

## F111 — dispatch() concurrency saturation is silent and misdiagnosed [OBSERVABILITY] [P1]
- Evidence: fleet/observability/obs3-worker-queue.md. No counter; the scheduler misdiagnoses saturation as "no worker matched event_type=...", burning a retry with a misleading error.
- Status: PROVEN.

## F112 — /health checks 8 components but none of MissionScheduler, WorkerRuntime, EventBridge, bridges, or DLQ [OBSERVABILITY] [P1]
- Evidence: fleet/observability/obs3-worker-queue.md. The gateway reports healthy with the whole pipeline dark. Corroborates F68.
- Status: PROVEN.

## F113 — vestigial second queue protocol fully implemented with zero producers and zero consumers [HISTORY] [P2]
- Evidence: fleet/observability/obs3-worker-queue.md. GET /events/unprocessed, POST /events/processed|/failed + the event_processing table are fully implemented; JS poll disabled, Python fleet dormant behind compose profiles: [dev], nothing running. ping_events.processed is never set on the live path.
- Status: PROVEN dormant. Corroborates F68/F91.

## F114 — dormant worker mechanisms classified: IntelligenceWorker, MissionEventBus, Python fleet, filesystem_worker [HISTORY] [P2]
- Evidence: fleet/observability/obs3-worker-queue.md. IntelligenceWorker has empty eventTypes with a KEEP-DORMANT note; MissionEventBus never constructed; the entire Python worker fleet (two generations: workers/ HTTP-based and root-level psycopg2-based); filesystem_worker.py is a manual snapshot tool, misnamed.
- Status: CLASSIFIED, not deleted.

## OBS3 worker 48/51 positive notes
- The poison path on the mission pipeline is complete: durable retries + error text in ping_missions, DLQ table with read endpoints (/dead-letters*), backlog metrics exist (/missions/pending|/stats, /queues, /workers, /scheduler, /bridge, /event-mission-bridge), retry_pending re-dispatch honors retry_at, duplicate redelivery suppressed by content-hash dedupe (except F110's fresh-timestamp echoes).
- Proposed next adjacent gap (not executed): a single synthetic end-to-end drill — one REVIEW_RECEIVED through bridge → 8 missions → workers → replay/witness/lineage, asserting the mission table returns to quiescent with a bounded mission count. Would prove F110 real-or-not, validate the poison path, and exercise every backlog endpoint at once. Flagged for coordinator scheduling (sandbox-only side effects; NO prod journal writes without explicit authorization).

## F115 — overrides mutation VULNERABLE: owner context built from caller-chosen route param [SECURITY] [P0]
- Evidence: fleet/security/sec1-tenant-isolation.md (SEC1 follow-up section). POST /api/fyd/objects/[objectId]/overrides builds the owner context from the caller-chosen route param (overrides/route.ts:122-137 → overrides/owner-context.ts:128-137, format-only validation). The only gate is the demo flag + spoofable Host header (sweep F3). The Phase-0 scoped-* wrappers exist but have ZERO live-route importers — routes call stores directly.
- Forge variant: emitOverlayEvent POSTs an UNSIGNED envelope (customize/server.ts) to the gateway's POST /events direct branch (gateway/routes/events.js:113-128, no signature/tenant check); the victim's Ask FYD accepts any event whose p.siteId string matches (ping-object-reader.ts:296-297). Corroborates F54/F99/F100.
- Status: PROVEN (code).

## F116 — memory→tenant leakage VULNERABLE at the gateway: unscoped SQL reads + unfiltered vector search [SECURITY] [P0]
- Evidence: fleet/security/sec1-tenant-isolation.md. GET /events/:stream is unscoped SQL with zero tenant/namespace references (gateway/routes/events.js:59-65). Vector retrieval has NO filter at all — EmbeddingService.search (embedding_service.js:236-239) → QdrantAdapter.search (qdrant_adapter.js:55-61, no filter param) over shared collections (conversation_memory.js:97, knowledge_retrieval.js:100, persistent_ollama_analyst.js:122, hybrid_search.js:50). AgentMemoryAuthority records carry no tenant field. BLOCKED at the adapter, VULNERABLE at the gateway.
- Status: PROVEN (code).

## F117 — live private object exposed via TWO transport points, reachable unauthenticated [SECURITY] [P0]
- Evidence: fleet/security/sec1-tenant-isolation.md. GET /api/fyd/projection?siteId= serves the digest-verified but UNFILTERED raw graph; on-disk happy-place.json contains a live private object (website-service-51de038c1defe8bd, "Pergola Design Consultations", visibility: private) — reachable unauthenticated. Additionally sites/happy-place/page.tsx passes the full raw graph to the "use client" SiteClient, so the private object ships in the RSC flight payload of EVERY page load (render-time resolveQuery filtering does not remove it from the bytes). BLOCKED at composition, VULNERABLE at transport.
- Status: PROVEN. Hardens F103.

## F118 — public→private reads BLOCKED at adapter/BFF/Ask, with one caveat [SECURITY] [P1]
- Evidence: fleet/security/sec1-tenant-isolation.md. Blocked on composed/BFF/Ask paths (by-id.ts:53-58, view.ts:305-316, ping-object-reader.ts:815-818+831-833, visitor-answer.ts:183-191+424-450, ask-pipeline.ts:233-237). Caveat: BFF viewerId for the practice lane comes from the UNSIGNED ping_practice_identity cookie (session.ts:23-33) — the controllerId check is only as strong as the identity source.
- Status: PROVEN with caveat.

## SEC1 follow-up fail-closed requirements (F-C1..F-C4, design directives, not yet designed)
- Per-tenant verified identity for mutations (routes must use the scoped wrappers; overlay events need signer-bound proofs + gateway signer→siteId authorization); visibility projection before serving raw endpoints; mandatory tenant/namespace filters on all vector searches + tenant field on memory records + namespace-scoped gateway reads; never ship raw graphs to client components.
- Next adjacent gap: the identity-namespace split means no verifiable caller→tenant binding exists — recommend a follow-up worker enumerate the exact identity→tenant→controller claims each namespace can actually attest before the tenant-auth design is drawn.

## F119 — synthetic→production VULNERABLE: demo identities write first-class journal rows [SECURITY] [P0]
- Evidence: fleet/security/sec3-env-confusion.md (SEC3 attack matrix). Demo/dev identities (createFydIdentity, actions.ts:53) mint via unauthenticated POST /identities (gateway/routes/identities.js:97-175, no dev labeling), sign envelopes with client-supplied source: "fyd-social" metadata (envelope.ts:52); the gateway routes them through social_ingest_adapter.normalizeBffEnvelope (:336-386, no synthetic flag required) into eventRuntime.emit — which defaults namespace to core::system (unified_event_runtime.js:~104). Demo events land in the sovereign ping_events journal, readable as first-class state by all production readers. Only markers are client-supplied (forgeable); one server-applied marker (_ingest.adapter) exists but nothing segregates on it. The practice lane (unsigned cookie → signAsIdentity) takes the same path.
- Status: PROVEN. Corroborates F119's next gap: no registry, revocation, or namespace-quarantine mechanism for demo-authored journal state.

## F120 — STALE DEPLOYED ADAPTER on :3100 (e48ef710, 2 commits behind): claim-verify route has NO identity/demo/403 gate [SECURITY] [P0]
- Evidence: fleet/security/sec3-env-confusion.md. Served site :3100 runs adapter HEAD e48ef710, 2 commits behind a69bb68f; the delta adds the demo-owner-mode gate to the claim-verify route — the DEPLOYED old route has no identity/demo/403 gate at all, so anyone can flip an already-CLAIMED resource to VERIFIED-CONTROLLED tonight. Digest/grant/signing files are byte-identical, so the approval chain is unaffected.
- Status: PROVEN live. Action: redeploy or hot-gate the claim-verify route.

## F121 — EventValidator.validate() has ZERO live callers: stale workers' old-schema events pass [RELIABILITY] [P1]
- Evidence: fleet/security/sec3-env-confusion.md. event_validator.js:59-98 enforces schema_version + payload_schema, but emit only checks isRegistered() (bare type lookup).
- Status: PROVEN.

## F122 — test_event_ingestion.py INSERTs synthetic events into running brain-postgres [TEST] [P2]
- Evidence: fleet/security/sec3-env-confusion.md. Target table is the dormant Python stack's events, not the live journal — but nothing scopes it to a test instance. One hostname away from writing into ping_events.
- Status: PROVEN hazard.

## F123 — approval→different digest BLOCKED on all live paths [GOVERNANCE] [P1-positive]
- Evidence: fleet/security/sec3-env-confusion.md. submitProposal (ping-object-reader.ts:1299,1337), customize handleApprove (re-derives from current spec, 409 on digest OR body mismatch), and overrides approve (recomputed baseStateDigest + patchDigest, 409/400) all re-verify before journaling; BFF Ed25519 signature binds exact payload bytes.
- Status: PROVEN. Qualifies F102 (per-path strong where it matters).

## F124 — POST /missions is UNAUTHENTICATED: unauthenticated mission injection → worker execution [SECURITY] [P0]
- Evidence: fleet/semantic/s5-missions-mcp.md. gateway/routes/missions.js:22 takes missionType/payload from the body with no auth; the scheduler auto-dispatches within 5s.
- Status: PROVEN. Next gap: identity→mission attribution — POST /missions accepts an arbitrary createdBy string stored verbatim.

## F125 — capabilities[] on workers is DISPLAY-ONLY: no authorization anywhere in the mission path [CAPABILITY] [P0]
- Evidence: fleet/semantic/s5-missions-mcp.md. Registered but never consulted in dispatch. Extends F101.
- Status: PROVEN.

## F126 — the only permission-checked tool caller is DORMANT and FAIL-OPEN [CAPABILITY] [P1]
- Evidence: fleet/semantic/s5-missions-mcp.md. gateway/tool_authority.js has zero importers AND defaults to {allowed:true} when no permissionAuthority exists; no PermissionAuthority implementation exists anywhere.
- Status: PROVEN.

## F127 — FAKE verification: missions/VerifyReplay "completed" is a commit-time stamp [REPLAY] [P2]
- Evidence: fleet/semantic/s5-missions-mcp.md. Cited proofs/replay-proof.json does not exist; no Python ReplayAuthority exists; the only test touching it is self-referential.
- Status: PROVEN fake.

## F128 — two divergent intent registries; execution intent contradicts its own implementation [SEMANTIC] [P2]
- Evidence: fleet/semantic/s5-missions-mcp.md. intent/ (8 files, read by scripts) vs intents/ (20 dirs, read by test-only generators). intent/execution.intent.yaml forbids subprocess while its implementation defaults to SubprocessExecutionAdapter.
- Status: PROVEN.

## F129 — ExecutionEngine (Orca) live despite its own "keep DISABLED" comment; 12 "replaced" dead missions still in place [EXECUTION] [P2]
- Evidence: fleet/semantic/s5-missions-mcp.md. Initialized + route-mounted. automatic_mission_generator (674 lines, zero importers) remains.
- Status: PROVEN.

## F130 — dormant MCP proxy, 4 mission-control surfaces, 2 idle supervisors; ReplayWorker verifies single events not chains [EXECUTION] [P2]
- Evidence: fleet/semantic/s5-missions-mcp.md. MCP proxy is not an MCP server (no backend on :8000); 1 of 4 control surfaces live at /mc (read-only); neither supervisor drives the live gateway. ReplayWorker verifying single events is honest in code (F7). Namespace privacy boundary is cooperative, not enforced (F11).
- Sibling corrections recorded: event_to_mission_bridge lives at ping-runtime/orchestration/ not ping-runtime/events/; runtime/replay/ does not exist (live JS engine is gateway/replay/kernel/).
- Live mission spine verified wired end-to-end: UnifiedEventRuntime.emit → EventToMissionBridge → MissionRuntime → ping_missions → MissionScheduler → WorkerRuntime.dispatch → 8 canonical workers → REPLAY_VERIFY → ReplayWorker → KernelReplayExecutionProvider → gateway/replay/kernel/deterministic_replay_engine.js.
- Status: PROVEN.

## F131 — TWO live event envelopes both claim to be THE canonical one [EVENT] [P0]
- Evidence: fleet/object/o3-envelopes.md. E1: UnifiedEventRuntime → ping_events (the live spine per gateway/routes/events.js): lowercase fields, event_id = SHA-256 over NON-canonical JSON.stringify — payload key order changes the ID, and optional namespace/logical_id inclusion means the same logical event gets different IDs BY DESIGN. Collision guard uses a shallow one-level key sort, so nested key-order variants are misclassified as semantic collisions. E2: StandardEventSchema → repository_events (header: "No authority may define custom envelopes"): uppercase fields, canonical hashing, per-object sequence, hash chain — also live (mission/replay/execution producers). The POST route explicitly bypasses it ("not through the kernel pipeline ... EventBridge adds a 5s delay for no benefit").
- Status: PROVEN competing authority. Corroborates F79/F80/F107.

## F132 — EventBridge copies repository_events→ping_events with a NEW content-derived event_id: one logical event, two identities, two journals [EVENT] [P0]
- Evidence: fleet/object/o3-envelopes.md. The original id survives only inside payload._repository_event_id / metadata.original_event_id.
- Status: PROVEN. Corroborates F106 (cursor skips) and F91.

## F133 — aggregate_id placement split; event-row reader lenient to the point of ordering skew [EVENT] [P1]
- Evidence: fleet/object/o3-envelopes.md. aggregate_id is a column in repository_events but nested in metadata JSONB in ping_events. The adapter's event-row reader accepts 4 payload keys / 3 ID keys / 5 timestamp aliases and silently defaults a missing timestamp to epoch zero (ordering skew instead of failure).
- Status: PROVEN.

## F134 — live social writes signed with the dev stand-in serializer, not the constitutional one [IDENTITY] [P1]
- Evidence: fleet/object/o3-envelopes.md. Extends F71/F80/F107.
- Status: PROVEN.

## F135 — owner intent lives in two envelopes with unrelated identities; canonical object envelope bytes not content-determined [OBJECT] [P2]
- Evidence: fleet/object/o3-envelopes.md. Adapter fyd-owner@1 content-hash events vs journal FYD_SITE_OVERLAY ops. Canonical object id is content-stable but the identity block embeds created_at: now.
- Status: PROVEN.

## F136 — O3 caveats recorded [EVENT] [P2]
- Whether FYD_SITE_OVERLAY is registered in the main deployment's event_registry.json was not tested live (dump.py cites FAILURE_LEDGER FL-20260921-231 saying it isn't — affects whether the overlay events can land on the main journal). Core mission-object envelope persistence shape NOT PROVEN. emit()'s validateEventType branch is defensive dead code (only isRegistered exists). canonical_object_authority.js's "nothing else creates constitutional objects" asserted but not exhaustively grep-verified.
- Status: OPEN caveats.

## O3 next adjacent gap
- The replay/read seam: which consumers reconstruct state from which journal and with what ordering guarantee (E1 has no sequence column; every reader orders by wall-clock (timestamp, event_id)). An inventory of read/replay authorities (event_read_authority.js, EventBridge cursors, queryFydSiteOverlays, dump.py journal selection incl. the main-vs-demo switch) would show where the envelope conflicts become live divergence.

## F137 — brain-qdrant REST is UNAUTHENTICATED: anyone on the network can upsert/delete all collections [SECURITY] [P0]
- Evidence: agent14-semantic-knowledge/SEMANTIC-KNOWLEDGE.md. Verified HTTP 200 with no key. Writers outside the canonical pipeline also include: gateway POST /knowledge/nodes and /edges (no auth middleware observed — corroborates F74), root operator scripts, direct psql INSERTs. Verified NOT writers: MCP server, mission_control_knowledge_apis.py, HybridSearch (read-only by header contract).
- Status: PROVEN. Cross-agent handoff: Agent 06 (unauthenticated write surfaces).

## F138 — 187/389 (48%) of live Qdrant knowledge points are PRNG-noise fallback vectors [SEMANTIC] [P0]
- Evidence: agent14-semantic-knowledge/SEMANTIC-KNOWLEDGE.md. Ollama unreachable at projection time; no re-embed path exists. Live writer = gateway EmbeddingService (log: initialized ×4, zero projection failures); search proven functional (self-query → 1.0000).
- Status: PROVEN. Cross-agent handoff: Agent 04 (fallback re-embed + rebuild ownership).

## F139 — canonical_hash null on 364/389 (94%): EvidenceAuthority.verify() marks every such hit verified:false [SEMANTIC] [P0]
- Evidence: agent14-semantic-knowledge/SEMANTIC-KNOWLEDGE.md. Retrieval (HybridSearch → POST /knowledge/search on :8080) works and CAN cite source event IDs, but its own verification leg fail-closes on 94% of the corpus because the projection never supplies canonical_hash.
- Status: PROVEN. Cross-agent handoff: Agent 04 (emitter-side canonical_hash).

## F140 — KnowledgeGraph is a node set, not a graph: 206 nodes, 0 edges, all stuck at candidate [SEMANTIC] [P1]
- Evidence: agent14-semantic-knowledge/SEMANTIC-KNOWLEDGE.md. 206 nodes in brain-postgres, fresh (updated today), written live by the gateway's graph-projection subscriber; promotion worker wired but approval events never fire. Node IDs are 64-bit content hashes (not event IDs); link back via source_event_id intact.
- Status: PROVEN. Cross-agent handoff: Agent 05 (64-bit node-ID identity concerns); Agent 13 (two knowledge-node generations: brain-postgres fresh vs ping-postgres stale 2026-09-16).

## F141 — projected_at hardcoded null on all points; no delete path; rebuild claimed but no job exists [SEMANTIC] [P1]
- Evidence: agent14-semantic-knowledge/SEMANTIC-KNOWLEDGE.md. Superseded events accumulate as stale points forever.
- One minimal propose-only patch for the live core: projected_at: null → new Date().toISOString() (single line, additive, no readers affected) in patches/agent14-semantic/PATCH-01-projected_at.md. Not applied (read-only scope). Deliberately NOT patched: canonical_hash propagation (Agent 01/04 verdict), missing delete lifecycle (design decision), unauthenticated write surfaces (Agent 06).
- Status: PROVEN.

## F142 — aspirational/phantom semantic mechanisms classified [SEMANTIC] [P2]
- Evidence: agent14-semantic-knowledge/SEMANTIC-KNOWLEDGE.md. constitutional_memory (0 points, intended Python writer qdrant_projection_worker.py not running and mis-targeted at unreachable ping-qdrant); constitutional_documents (26 points, fossilized TEST data from 2026-06-24, dead Python pipeline); Mem0 (docs-only evaluation table, zero code); ProjectMem (phantom — zero hits anywhere, the name has no referent); chunking (none on live path; dormant Python chunk IDs would be random UUIDs — broken by design); Neo4j adapter (constructed, never connected — the "Neo4j + Qdrant" log line overclaims); drift detection (dormant Python only, no scheduled sweep on the live path).
- Status: CLASSIFIED, not deleted.

## F143 — ping-qdrant (configured QDRANT_HOST) is isolated and unreachable; live traffic goes to brain-qdrant [SEMANTIC] [P2]
- Evidence: agent14-semantic-knowledge/SEMANTIC-KNOWLEDGE.md. No host port, not on the gateway's network; live traffic via host.docker.internal. Qdrant point IDs deterministically derive from source event IDs (toQdrantId); KG node IDs are 64-bit content hashes; both link back via source_event_id — location provenance intact, integrity provenance broken (null canonical_hash).
- Convergence recommendation: pick the live JS path as the single semantic authority — NO second canonical knowledge authority created or proposed.
- Status: PROVEN.

## F144 — CanonicalizationService sovereignty is PARTIAL: /events, /canonical-events, /identities bypass it [AUTHORITY] [P0]
- Evidence: fleet/semantic/s3-authorities.md. POST /ingest and business emitters (via the duck-typed emit()) honor it; POST /events, POST /canonical-events, POST /identities all bypass it with direct eventRuntime.emit. Its header claim "every producer crosses this boundary" is FALSE. Namespace format still enforced at the emit layer (same regex in EventGovernance), but per-source namespace binding exists only in the service — a /events caller can claim any format-valid namespace.
- Status: PROVEN. Corroborates F100/F109.

## F145 — kernel IdentityAuthority serializer has a LATENT COLLISION: ["ab","c"] ≡ ["a","bc"] [IDENTITY] [P0]
- Evidence: fleet/semantic/s3-authorities.md. Kernel IA concatenates arrays WITHOUT comma separators; compiled-dist IA uses JSON (undefined→null). Both file headers claim "ONE IdentityAuthority". Plus a live UUIDv5 scheme in CanonicalEventEnvelope and a dead TS interface. The dist files are untracked build artifacts (Dockerfile compiles them at build time).
- Status: PROVEN mechanism. Corroborates F79/F105.

## F146 — computeCanonicalHash silently drops nested content: GET /constitution platformHash is FAKE verification, LIVE [INTEGRITY] [P0]
- Evidence: fleet/semantic/s3-authorities.md (constitutional_validation.js:348). JSON.stringify(obj, Object.keys(obj).sort()) builds the replacer from top-level keys only, so nested objects are stripped to the top-level key intersection. It backs GET /constitution's platformHash ("single source of constitutional truth").
- Status: PROVEN. Corroborates F89.

## F147 — dormant hazards classified: second DI root, constitutional_runtime, approval_authority, registry.yaml, constitution laws [HISTORY] [P2]
- Evidence: fleet/semantic/s3-authorities.md. bootstrap/index.js (second DI composition root, referenced only by the removed main.js); constitutional_runtime.js (zero requirers); approval_authority.js (378 lines, zero requirers — code-patch approval has no live gate); authorities/registry.yaml (aspirational, loaded only by generators); constitution/ laws (zero code references — unenforced documentation); abandoned IEventAuthority-class interfaces; kernel/event_dispatcher.py.
- Status: CLASSIFIED, not deleted.

## F148 — corroborated, no drift: UER→ping_events sovereign; PATCH_002/003/004 are proper delegations [EVENT] [P1-positive]
- Evidence: fleet/semantic/s3-authorities.md. agent_memory_authority writers re-verified live in this branch; EventBridge convergence live; EventReadAuthority partial sovereignty with SQL fallbacks (matches forensics).
- Status: CONFIRMED.

## F149 — next adjacent gaps: /constitution as fleet trust surface; RepositoryStore verify-before-append untraced [AUTHORITY] [P2]
- Evidence: fleet/semantic/s3-authorities.md. /constitution reports "truth" computed from the dormant DI wiring module via the lossy hash (F146), while every fleet component is told to handshake against it. The VerificationAuthority.verify-before-append claim on RepositoryStore (the fourth persistence surface, with a DELETE endpoint) was not fully traced and may be route-bypassable.
- Status: OPEN gaps.

## F150 — live WITNESS_CREATED attestation DROPS the witness commitment it claims to certify [WITNESS] [P0]
- Evidence: agent02-witness-evidence/WITNESS-EVIDENCE.md. The kernel replay engine computes a real Merkle witness_root (over canonical_bytes, fingerprint, lineage, state, violations; gateway/replay/kernel/witness_authority.js:40-50,94+), carries it in REPLAY_COMPLETED.payload.replay.witness_root (canonical_workers.js:320-329), then WitnessWorker (:490-499) emits an attestation of 'witness-<16 hex of triggering event_id>' with NO hash, no root, no fingerprint. 66 such attestations exist live (corroborated: GET :8080/mc/witness/stats 66/0; worker totalProcessed: 9). They are labels, not commitments: unrecomputable, and ConstitutionalVerificationAuthority.verifyWitness would reject every one (it requires witness.canonical_hash).
- Proposal (propose-only, RESULT: NOT RUN): patches/agent02-witness-evidence/PROPOSAL-witness-root-binding.md. Caveat: diff uses placeholder field names (this._correlationId(event), replay.upstreamEventId) — coordinator must resolve exact field names against canonical_workers.js before applying. Proposed witness shape deliberately does NOT mimic artifact.witness (separate contract; needs Agent 01/03 sign-off).
- Open: whether the 66 attestations' roots are recoverable from sibling REPLAY_COMPLETED rows via correlation_id.
- Status: PROVEN.

## F151 — live write path demands a witness no live producer creates [WITNESS] [P0]
- Evidence: agent02-witness-evidence/WITNESS-EVIDENCE.md. POST /api/v1/repository/objects (mounted gateway_runtime.js:685) → RepositoryStore.append → verifyArtifact → verifyWitness requires artifact.witness.canonical_hash (constitutional_verification_authority.js:444-449) and verifyCanonicalBytes requires a Buffer. The route passes neither. Code-traced; not POSTed (that would be a write).
- Open: whether the always-failing repository route is known/intended.
- Status: PROVEN (code).

## F152 — THREE WitnessAuthority implementations already exist with source/compiled signature skew [WITNESS] [P1]
- Evidence: agent02-witness-evidence/WITNESS-EVIDENCE.md. JS kernel singleton, TS source, compiled gateway copy. The "never create a second canonical witness authority" patch rule is already violated in the current tree.
- Status: PROVEN.

## F153 — _verifyWitnessHash is a format check, never a recomputation; WitnessHash never produced [WITNESS] [P1]
- Evidence: agent02-witness-evidence/WITNESS-EVIDENCE.md. 64-hex format check only. repository_events.WitnessHash is never computed by any producer and chain_root ignores it. Certification entirely dormant (test imports from the empty runtime/replay/ dir and cannot load).
- Status: PROVEN.

## F154 — live and verified: WitnessWorker W7, kernel witness-root computation, EvidenceAuthority.verify, ConstitutionalVerificationAuthority.verifyWitness [WITNESS] [P1-positive]
- Evidence: agent02-witness-evidence/WITNESS-EVIDENCE.md. EvidenceAuthority.verify recomputes hashes with the verifier attached (retrieval path). Dark: the adapter attestation gate (no listener on :18199) and claim seam. Dormant: WitnessRecorder Ed25519, certification flows, kernel singleton WitnessAuthority, _witnessSign (placeholder, non-deterministic).
- Dependencies flagged: Agent 03 (replay/kernel), Agent 01 (event/mission), Agent 13 (repository_events schema), Agent 04 (retrieval/EvidenceAuthority consumer), Agent 20 (coordinator consolidation).
- Status: CONFIRMED.

## F155 — F29 accountability: Agent 02 explicitly did NOT author the uncommitted adapter changes [WRITE-GATE] [P2]
- Evidence: agent02-witness-evidence/WITNESS-EVIDENCE.md. Read-only session throughout. Combined with Agent 04's denial (F78), the F29 cluster's author remains UNIDENTIFIED. The cluster is 5 files (M identity.ts, M attestation-gate.ts, M readers.ts + untracked __tests__/ + jest.config.cjs).
- Status: RECORDED, OPEN.

## F156 — B1 CLOSED: Oracle ping-gateway runs the worktree POST /events copy byte-identically [EVENT] [P0]
- Evidence: passive container inspection via oracle-ssh.sh (no mutation/restart/traffic/secrets). Container `ping-gateway` image `ping-gateway:candidate-3c5d280dd` (built 2026-09-21T11:42:46Z; `3c5d280dd` is a real repo commit), PID 1 `node gateway/server.js`, LISTEN 0.0.0.0:8080, host binds 127.0.0.1:8080. `/app/gateway/routes/events.js` sha256 `4e3c66b60631b0d9213242e927470477e1da6ec54d697c5fa54157bd2daba8ac` (8497 B) = byte-identical to `/home/nolan/ping` @ `cc6856c3b` worktree copy (BFF-adapter branch; file clean in git). NOT the ping-gateway-src/build copy (`ad9b9c92…`, tenant-registry validation). Deployed file: 0 matches for authorizeNamespace/canonicalizeAndEmit, 2 for social/knowledge_ingest_adapter, 0 for tenant. Full bytes kept at agent01-event-authority/deployed-events.js. Supporting files also byte-identical: unified_event_runtime.js (`99dc95fe…`), routes/ingest.js (`f1c1abda…`), canonical_event_envelope.js (`3bbfaceb…`); both ingest adapters present in container.
- Deployed POST /events behavior: BFF-envelope branch (social/knowledge ingest adapter normalize → eventRuntime.emit; typed 400s) + legacy branch (event_type/aggregate_id/aggregate_type/event_data → eventRuntime.emit). No tenant check, no authorizeNamespace on POST /events. POST /ingest DOES route through authorizeNamespace + canonicalizeAndEmit.
- Status: CLOSED by Agent 01. CP-1 unblocked (convergence target is now a known diff).

## F157 — 2026-09-16/17 live-capture POST /events behavior (authorizeNamespace → 403) is SUPERSEDED [EVENT] [P1]
- Evidence: the capture matched neither Pig-side copy; F156 proves the current image (built 2026-09-21) runs the worktree BFF-adapter bytes. The capture described a live-patched container that the rebuild replaced.
- Status: RECORDED. Do not cite the capture's POST /events behavior as current.

## F158 — repository_events write side is UNWIRED in the current tree (reclassifies EVENT-FORENSICS.md "PROVEN live") [EVENT] [P0]
- Evidence: `grep -rln` over gateway/ping-runtime/runtime: agent_memory_authority, distributed_desktop_agents, automatic_mission_generator, continuous_replay_authority each have 0 inbound refs (never constructed on any live path); kernel EventRepository constructed only in `gateway/bootstrap/constitutional_runtime.js:16` and `runtime/kernel/gateway_adapter.js:27`, both 0 inbound refs; 12 further appendEvent-bearing files (patch_authority_v2, mission_authority_v2, trigger_authority, constitutional_execution_pipeline, constitutional_watchers, best_in_class_integration, persistent_queue_authority, local_first_execution_authority, constitutional_desktop_runtime, capability_scheduler, kernel/execution/constitutional_execution_pipeline) all 0 inbound refs. AppendOrchestrator._appendReplayEvent (gateway/append_orchestrator.js:91, direct INSERT bypassing hash chain): 0 callers; authority_registry.js never required by live code. The forensics' "PROVEN live" rested on call-site existence, not construction.
- Consequence: EventBridge's repository_events poll is live infrastructure reading an insert-silent table. Live journal reality is two tables: ping_events ← EventBridge ← canonical_events. The kernel hash-chain journal is dormant code, not a live secondary.
- Status: PROVEN by Agent 01 construction trace. Affects Agent 20 map rows 1/6/24; Agent 13 (bridge cursor for repository_events never advances).

## F159 — no UPDATE/DELETE on any journal emit path re-verified; ping_events trigger NOT re-verified tonight [EVENT] [P2]
- Evidence: only UPDATEs found are operational markers (kernel `event_processing` markProcessed/markFailed; canonical_events executeMarkProcessed/executeMarkFailed); zero DELETE matches in unified_event_runtime.js, event_bridge.js, kernel event_repository.js, canonical_event_envelope.js, routes/events.js. repository_events INSERT has no ON CONFLICT clause (duplicate → unique-violation, fail-closed). ping_events INSERT … ON CONFLICT DO NOTHING + mismatch fail-closed (unified_event_runtime.js:161-174) confirmed in current source. `trg_ping_events_append_only` not re-checked tonight (needs DB catalog query; out of passive-container scope) — standing evidence remains the 2026-09-16/17 capture; flagged for Agent 13.
- Status: PROVEN (except trigger, carried).

## F162 — served checkout :3100 claim-verify route has NO gate: self-asserted operator-attestation persists [ENDPOINT] [P0]
- Evidence: fleet/security/sec4-unauth-endpoints.md (26 rows: 21 adapter, 5 core). Served POST /api/fyd/claims/[resourceId]/verify — the audited-head demo env/Host gate is absent in the served checkout (e48ef710); self-asserted operator-attestation → writeClaim persists. LIVE.
- Status: PROVEN. Corroborates F120.

## F163 — served object-overrides approve path has no gate; seeded DemoOwnerContext stands in for a principal [ENDPOINT] [P0]
- Evidence: fleet/security/sec4-unauth-endpoints.md. Served POST /api/fyd/objects/[objectId]/overrides — approval evaluates a capability against a seeded DemoOwnerContext, not an authenticated principal. LIVE. Caveat: served overrides approve path's exact persisted-write line not yet captured (flagged ADAPTER-4).
- Status: PROVEN.

## F164 — Kit webhook and resources/download allow forged event injection and arbitrary tagging [ENDPOINT] [P1]
- Evidence: fleet/security/sec4-unauth-endpoints.md. POST /api/kit/webhook: forged event injection with subscriber PII. POST /api/resources/download: arbitrary Kit tagging, PII logging, caller-controlled downloadUrl. LIVE.
- Status: PROVEN. Corroborates F43.

## F165 — audited-head gates are spoofable: Host-header-controlled; deploying audited head is not sufficient [ENDPOINT] [P1]
- Evidence: fleet/security/sec4-unauth-endpoints.md. isPrivateHost(Host) is client-header-controlled. Six propose-only remediations (P1–P6) in the deliverable: backport gates keyed to socket info rather than Host, HMAC-closing the Kit webhook, fail closed on the diagnostic-secret fallback, resolve B1 before adding one gateway auth layer.
- Status: PROVEN.

## F166 — core has zero HTTP-layer auth; BUT live 2026-09-16/17 capture shows 401/403 the worktree cannot produce [ENDPOINT] [P1]
- Evidence: fleet/security/sec4-unauth-endpoints.md. asyncHandler is logging-only; no bootstrap middleware. Worktree POST /events (canonical-spine branch) emits directly to the journal; POST /identities is open identity minting (enables the BFF-envelope signature path). Core rows classified WORKTREE-ONLY-UNKNOWN with the contradiction recorded. B1 remains BLOCKED/open — recommends resolving it first alongside fyd/net.
- Status: PROVEN in worktree; LIVE deployment truth BLOCKED on B1.

## F167 — latent-not-dead lanes: practice identity and FYD social are transport-dark only [ENDPOINT] [P2]
- Evidence: fleet/security/sec4-unauth-endpoints.md. Practice identity lane (unsigned cookie) and FYD social lane (caller-supplied identityId, server-side key custody) are transport-dark only because PING_GATEWAY_BASE_URL is unset and :18199 is phantom. Residual gaps: fyd/net SSRF/rate-limit implementation unread (ADAPTER-17); social lane key-generation behavior unverified (ADAPTER-10); public-read payload privacy (ADAPTER-19) and wildcard CORS (ADAPTER-20) are watch items, not findings.
- Status: CLASSIFIED.

## F168 — replay does NOT reconstruct actual canonical history: live _buildReplayEvents() returns ONLY the triggering event [REPLAY] [P0]
- Evidence: replay/REPLAY-WITNESS-LINEAGE.md. Proven at the image level against the running ping-gateway:devin-boundary2 (no source bind mount): the live mission chain is real (PROJECTION_CREATED -> REPLAY_VERIFY -> replay worker -> KernelReplayExecutionProvider -> DeterministicReplayEngine), but ReplayWorker._buildReplayEvents() returns only the triggering event in production; the Postgres correlation-group query is an unimplemented comment. The fingerprint and witness_root attest to a single-event deterministic re-execution, not to full-history reconstruction. The Python worker chain that reads full history is DORMANT (no process running) and weaker (wall-clock ordering, hardcoded 3-type prefix check, no state rebuild).
- Convergence action: implement the durable-history replay read (_buildReplayEvents Postgres correlation-group query) or formally redefine replay scope to single-event re-execution.
- Status: PROVEN.

## F169 — live lineage is single-hop causation_id propagation; recursive causal-tree SQL has ZERO callers [LINEAGE] [P1]
- Evidence: replay/REPLAY-WITNESS-LINEAGE.md. Live = single-hop causation_id propagation (LineageWorker + worker _emit). The unified event runtime's full recursive causal-tree SQL (children/descendants/ancestors/correlation group) has zero callers: built, dormant. Kernel ReplayEventStream.getLineageChain() is defined twice, called never. Adapter lineage is fragmented and UNOWNED constitutionally.
- Convergence action: wire or archive the dormant causal-tree queries.
- Status: PROVEN.

## F170 — krep.js:80 artifact_hash is key-insertion-order-dependent (PROVEN by test); propose-only patch verified [REPLAY] [P0]
- Evidence: replay/REPLAY-WITNESS-LINEAGE.md; patches/agent03-replay/ (PROPOSAL.md, unified diff, regression-test.js exit 0 = pass). this._computeHash(JSON.stringify(event.payload || {})): identical payloads with different key insertion order hash differently. Fix adds recursive sorted-keys _stableStringify; key-order invariant verified, distinct payloads still differ, syntax OK. No second replay authority created. Adapter: no unambiguous correction found; nothing applied.
- Status: PROVEN mechanism, patch verified against current code, NOT APPLIED.

## F171 — nondeterminism and ordering gaps: fabricated timestamp, key-order event_id, wall-clock ordering, no sequence on ping_events [REPLAY] [P2]
- Evidence: replay/REPLAY-WITNESS-LINEAGE.md. (1) Fabricated default timestamp '2026-01-01T00:00:00.000Z' at krep.js:86 masks missing data (does not enter the fingerprint — engine is timestamp-agnostic). (2) unified_event_runtime.js event_id = sha256(JSON.stringify(identity)) with payload inside: same key-order class of issue (flagged for Agent 05). (3) Dormant Python path: ORDER BY wall-clock timestamp with no sequence tiebreaker, conflicts with TIME_LAW. (4) ping_events has no sequence column; ordering is wall-clock. The kernel repository_events table has the correct integer sequence + hash chain but is not on the live replay path.
- Convergence action: decide whether ping_events gets a durable sequence; retire wall-clock ordering. Apply/archive the dormant Python worker chain (recommend archive).
- Status: PROVEN. Open: whether any production caller supplies payload.replay_events (none found; needs a sweep by Agent 04).

## F172 — mission echo loop CONFIRMED UNBOUNDED via dispatch-on-original-event-type; OBS3's fix would NOT fix the live loop [MISSION] [P0]
- Evidence: fleet/observability/obs1-mission-trace.md (T1). At cc6856c, NO worker is registered on its own output type (OBS3-F1's cited mechanism REFUTED): recommendation worker subscribes to ['CLASSIFICATION_CREATED','RECOMMENDATION_CREATE'], projection to ['KNOWLEDGE_INDEX','PROJECTION_CREATE','RECOMMENDATION_CREATED','LINEAGE_CREATED'] (canonical_workers.js:708-709). The echo survives via the dispatch-on-original-event-type contract: every REPLAY_VERIFY mission dispatches as event_type='PROJECTION_CREATED' → matches projection AND replay → projection re-emits PROJECTION_CREATED (fresh timestamp in payload → fresh content-hash event_id defeats the ON CONFLICT dedupe) → bridge mints a new REPLAY_VERIFY mission → TRULY UNBOUNDED (throttled only by maxConcurrent 3/2). Ignitable by a single direct POST /missions {missionType:'PROJECTION_CREATE'} — composes with S5-F1's unauthenticated POST into REMOTE-TRIGGERABLE unbounded growth. Also poisons observability (inflated completed counts look like healthy throughput).
- Proposal P-T1 (dispatch only to the assigned worker) SUPERSEDES OBS3's proposed fix (remove self-subscription). Question for coordinator: P-T1 touches the [DOC-CONTRACT] convergence-ledger entry — route through Agent 20 before any test.
- WARNING: the recommended live-fire drill (one synthetic event end-to-end) WILL IGNITE this loop — needs a kill plan (or P-T1 applied first) before the morning crew runs it.
- Status: PROVEN mechanism (code). Corroborates F110.

## F173 — mission back-trace and forward-trace are code-complete on the bridge path [MISSION] [P2]
- Evidence: fleet/observability/obs1-mission-trace.md (T2/T3). correlation_id threaded bridge→mission payload→dispatch metadata→worker _emit→spine default; MissionRuntime.getTrace + GET /mc/missions/:id/trace; event-level causal endpoints (/events/:eventId/{children,descendants,ancestors}, /events/correlation/:correlationId) with intact causation links (scheduler reuses payload.event_id as dispatch event_id).
- Status: CONFIRMED (code).

## F174 — mission history NOT fully reconstructible from ping_missions; reaper bypasses retry budget [MISSION] [P2]
- Evidence: fleet/observability/obs1-mission-trace.md (T4). Per-attempt errors overwritten (last wins), no per-transition audit rows, reaper resets to created WITHOUT incrementing retries (retry budget bypass), and the docstring's archived state is unimplemented.
- Status: CONFIRMED (code).

## F175 — no verifiable identity→mission binding; created_by is write-only [MISSION] [P1]
- Evidence: fleet/observability/obs1-mission-trace.md (T5). No live reader; omitted from MISSION_CREATED and dispatch metadata. Extends S5-F1 (unauthenticated POST /missions) into unattributed action.
- Status: CONFIRMED (code).

## F176 — trace surfaces inventoried: durable vs session-wiped distinction [MISSION] [P2]
- Evidence: fleet/observability/obs1-mission-trace.md (T6). Durable lineage: /mc/missions/:id/trace, /events/* causal endpoints, /mc/replay/trace/:correlationId, /mc/dead-letters*. Point-in-time/session-wiped: /mc/{scheduler,workers,bridge,event-mission-bridge} all scope:'session'.
- Status: CLASSIFIED.

## F177 — retry→DLQ path complete and traceable, but replayDeadLetter has no live caller; bridge-path failures never reach DLQ [MISSION] [P2]
- Evidence: fleet/observability/obs1-mission-trace.md (T7). Trace-back works (DLQ.mission_id → mission → payload.event_id → correlation chain).
- Status: CONFIRMED (code).

## F178 — untraceable inventory: session counters, in-flight set, orphaned MISSION_* events, dead columns [MISSION] [P2]
- Evidence: fleet/observability/obs1-mission-trace.md (T8). Session counters, in-flight set, silent dispatch() saturation (no counter, burns a retry mislabeled as routing failure), correlation-orphan MISSION_* events, dead ping_events.processed column, phantom causation_id on direct POSTs, logged-only bridge insert failures.
- Status: CLASSIFIED.

## F179 — /mc/queues contradiction: OBS1 reads it serving live ping_events grouped by type; OBS3's row table says vestigial protocol [OBSERVABILITY] [P2]
- Evidence: fleet/observability/obs1-mission-trace.md (T8 reconciliation note). One of the two is on a different revision.
- Status: OPEN.

## F180 — deployed :8080 POST /events canonical-spine lane accepts unauthenticated mutating overlay events [TRANSITION] [P0]
- Evidence: transition/TRANSITION.md. gateway/routes/events.js:111-132; gateway_runtime.js:115-128 is json+CORS only; zero hits in gateway code for the bearer token operators send. Gates are type-registration + namespace-policy only, and FYD_SITE_OVERLAY IS registered (event_registry.json:2334). Anyone reaching :8080 (bound *:8080, verified healthy) can journal mutating overlay ops (set_field/add_object/deactivate_object) that dump.py folds into public site projections — bypassing the signed-envelope lane, the customize approval, and capability auth. REFUTES the adapter's implied "all overlay changes pass through digest-bound approval" and the stale docstring claim that :8080 hadn't registered the type. Caveat: whether :8080 has network-level access controls is unverified (security lane).
- Proposal: patches/transition/gateway-events-canonical-lane-auth.md (propose-only, core). Consistent with F156 (no authorizeNamespace on deployed POST /events).
- Status: PROVEN (code + live port check).

## F181 — adapter digest-bound paths confirmed but demo-grade; two overlay folds disagree by construction [TRANSITION] [P1]
- Evidence: transition/TRANSITION.md. Ask proposals and customize-approve are genuinely digest-bound and journaled (CONFIRMED), but every authorizer is demo-grade (demo-owner mode, unsigned practice cookie, caller-chosen actorId on social routes). Two independent overlay folds disagree by construction: adapter reads demo journal per call; dump.py defaults to main journal at regen time. Runtime 2026-09-24: :18199 (demo gateway) is DOWN → customize/social/tenant-graph paths fail closed; :8080 healthy; demo Postgres up.
- Status: CONFIRMED.

## F182 — owner overrides/claim files independently minted vs journal; FydSiteAuthority is registry-only (UNOWNED) [TRANSITION] [P2]
- Evidence: transition/TRANSITION.md. Owner overrides and claim files are internally event-sourced but independently minted vs the journal. BusinessActionAuthority/EffectAuthority are dormant second-sources. FydSiteAuthority is a registry declaration with no implementation.
- Status: CLASSIFIED.

## F183 — PATCH APPLIED (adapter worktree only): comment-only docstring correction in customize/route.ts [TRANSITION] [P2]
- Evidence: transition/TRANSITION.md. src/app/api/fyd/customize/route.ts:14-15: docstring claimed clear "removes an approved directive from the journal"; code appends a compensating op (journal is append-only). Exact-match assertion passed; diff reviewed. COMMITS CREATED: NONE. Worktree also has 3 dirty hunks from concurrent sibling agents (claim/identity.ts, social/attestation-gate.ts, social/readers.ts) — not mine, not touched.
- Status: APPLIED (comment-only).

## F184 — emitOverlayEvent POSTs unsigned envelopes that the core journals with NO signature verification [EXECUTION] [P1]
- Evidence: execution-adapter/EXECUTION-ADAPTER.md (M1). customize/server.ts:78-121 sends unsigned {event_type, aggregate_id, aggregate_type, event_data} envelopes; the core's canonical-spine branch journals them with no signature verification — the demo-owner gate is the only authorization. Dormant by design; collapses if the demo flag is ever on in production.
- Status: PROVEN (code).

## F185 — signer binding asymmetric: OBJECT_UPDATED binds signer from key; RELATIONSHIP_CREATED trusts payload.subject as-given [EXECUTION] [P1]
- Evidence: execution-adapter/EXECUTION-ADAPTER.md (M2). Combined with the unsigned practice cookie, any existing dev identity can be selected and signed for (dev lane only).
- Status: PROVEN (code).

## F186 — gate asymmetry: claim/release check only the env flag; verify/overrides/customize additionally require a private Host header [EXECUTION] [P1]
- Evidence: execution-adapter/EXECUTION-ADAPTER.md. If the flag is on in production, claim/release are remotely drivable by anyone.
- Status: PROVEN (code). Consistent with F47, F159.

## F187 — three modules claim a separate FYD demo journal but all default to 127.0.0.1:18199 — separation is config-only [EXECUTION] [P2]
- Evidence: execution-adapter/EXECUTION-ADAPTER.md (M3). Comments and defaults contradict (CONFLICTING).
- Status: CLASSIFIED.

## F188 — seam healthy on the signed path; P6/P8 are the adapter's properly-bound execution paths [EXECUTION] [P1-positive]
- Evidence: execution-adapter/EXECUTION-ADAPTER.md. Adapter's bff-envelope@1 assumptions (shape, canonicalization with undefined-dropped semantics, identity_<16hex> format, server-assigned sequence, vocabulary) all match the core's social_ingest_adapter fail-closed verification. P6 (POST /api/ping/proposal — digest + controller + grants) and P8 (digest-bound propose/approve two-step) are properly bound. No mission triggers exist adapter-side (marketing-copy hits only); ActivityPub, lib/api/client, /api/estimate client call are dormant/dead.
- Patch rule verdict: NO patches applied, NO core diffs proposed — nothing met the "unambiguously established" bar; every candidate is documented deliberate design or a cross-repo architecture decision for Nolan.
- Status: CONFIRMED.

## F189 — three unlinkable principal namespaces with no bridge [SEAM] [P1]
- Evidence: seams/SEAMS.md (F1). uuidv5 OIDC identities, gateway identity_<16hex>, demo-owner claim identity. No bridge exists; OIDC callback never touches the gateway.
- Status: PROVEN.

## F190 — POST /identities validates/echoes then DROPS handle/bio from the journal [SEAM] [P1]
- Evidence: seams/SEAMS.md (F2/F3). Shape + ID format MATCH, but handle/bio are a real persistence mismatch the adapter works around via profile fallback.
- Status: PROVEN.

## F191 — public render reads stale core FS snapshots (>24h); Ask FYD replays the live journal — not one current state [SEAM] [P1]
- Evidence: seams/SEAMS.md (F10). Gateway-mediated journal access matches (F11), with two FS bypasses documented (dump reads, dogfood builder writes into core var dir).
- Status: PROVEN.

## F192 — social writes have no timeout, no retries, no auth either side [SEAM] [P2]
- Evidence: seams/SEAMS.md (F12).
- Status: PROVEN.

## F193 — F29 cluster attribution: Agent 16 (SEAMS) authored readers.ts + attestation-gate.ts + __tests__/ + jest.config.cjs [WRITE-GATE] [P2]
- Evidence: seams/SEAMS.md patch report. Agent 16's footprint: readers.ts winsOver gained the documented created_at tie-break tier (it implemented (sequence, event_id) while the file header and attestation gate documented/used (sequence, created_at, event_id) — unambiguous in-adapter contradiction), honest comments replacing the false "mirroring the projector" claims in both files, plus a committed jest regression test + lane jest config. Regression proven: post-fix 3/3 cases pass via tsx against the real module; pre-fix (via git stash) the key case failed ([{"s":"active","e":"ffffffff"}]), confirming the test catches the old bug. COMMITS CREATED: NONE. The __tests__/ and jest.config.cjs entries (untracked) are also Agent 16's. REMAINING UNRESOLVED: src/fyd/claim/identity.ts (comment-only) — Agent 16 explicitly said it was modified by a concurrent lane and did not touch it.
- Status: PARTIALLY RESOLVED; identity.ts author still UNIDENTIFIED.

## F194 — envelope versioning is write-only provenance, not negotiation [SCHEMA] [P1]
- Evidence: schema/SCHEMA-EVOLUTION.md. bff-envelope@1 (gateway/social_ingest_adapter.js:36) and knowledge-envelope@1 (knowledge_ingest_adapter.js:51) are server-side constants stamped into journaled events. POST /events dispatches on body shape, never reads metadata.generator (fyd-social@1). Mismatch handling is cryptographic fail-closed (INVALID_SIGNATURE → 400), not version-compared; a same-shaped differently-versioned envelope that verifies would be silently mis-stamped @1.
- Status: PROVEN (code).

## F195 — no live schema registry on the boundary; MigrationEngine (001–011) is dormant [SCHEMA] [P2]
- Evidence: schema/SCHEMA-EVOLUTION.md. constitutional_schema_authority/schema_repository are bootstrap-time only (zero requires from routes/server/adapters); the live ingest path hardcodes vocabulary (UNSUPPORTED_SCHEMA). MigrationEngine is registered in AuthorityRegistry.initialize but no live boot caller was traced — marked DORMANT pending a boot-wiring trace.
- Status: PROVEN (code).

## F196 — serializer conflicts across the sound pairs: S5 sorts only top-level keys; S6 builds event_id from unsorted JSON.stringify [SCHEMA] [P1]
- Evidence: schema/SCHEMA-EVOLUTION.md. S1 (dev-signer.ts:47-60, drop-undefined) ↔ S2 (social_ingest_adapter.js:55-68) agree verbatim — the signature pair is sound. S3 (ask-composer.ts:55-66, null-undefined) ↔ S4 (hash-authority.js:82-104) agree — the digest pair is sound. The conflict is across the pairs, latent in practice (undefined never crosses the JSON wire). NEW live conflicts: S5 computeCanonicalHash (constitutional_validation.js:348-351) sorts only top-level keys — diverges from S4 for nested content, used for contract/manifest/registry hashes; S6 UnifiedEventRuntime.emit builds event_id from UNSORTED JSON.stringify (unified_event_runtime.js:80-83) — order-sensitive content hash presented as deterministic. Also: two gateway event-ID schemes (uuidv5+timestamp for canonical_events vs sha256 content-hash for ping_events). Python workers implement none of canonical JSON/hash/identity (grep: zero hits) — consistent by absence.
- Status: PROVEN (code). Corroborates F89, F107, F146.

## F197 — no journal delete exists anywhere; no tombstone type; append-style retraction only [SCHEMA] [P2]
- Evidence: schema/SCHEMA-EVOLUTION.md. ping_events has no DELETE at code or HTTP level; all observed deletes are registry/point-state (/repository/objects/:id, /tenants/:id → DELETE FROM tenant_registry) or lawful append-style retraction: unfollow = RELATIONSHIP_CREATED status inactive (PREDICATE_NOT_CANONICAL rejects unfollows); owner corrections use supersedes chains; unlink deletes the binding file but appends an audit event and never deletes the identity.
- Status: PROVEN.

## F198 — gateway re-mints event_id, created_at, object_id/relationship_id, payload_hash; proof.signature_construction stamp is write-only [SCHEMA] [P2]
- Evidence: schema/SCHEMA-EVOLUTION.md. Payload, proof, and adapter metadata survive the boundary; adapter readers/attestation assume a sequence column that is always null live (ordering silently degrades to (created_at, event_id)).
- Status: PROVEN. Corroborates F104.

## F199 — LIVE-BUT-UNTRACKED DIVERGENCE: the prod image bundles a CapabilityAuthority that does not exist in the source tree [EXECUTION] [P0]
- Evidence: execution-core/EXECUTION-CORE.md. ping-gateway (image devin-boundary2, ~7d old, up 33h) runs a gateway_runtime.js that differs materially from /home/nolan/ping. Read-only docker cp proves the image bundles gateway/capability_authority.js (889 lines), exterior_auth_middleware.js, workspace_registry.js, routes/capabilities.js. None exist in the source tree (git log empty; ls fails). The rc gateway (rc-4d522a6b) also lacks them, so the rc line matches the source tree. The live authority is real and substantive: fail-closed authorize (agent allow-list profiles muse/muse-level-2, workspace registry binding, canonical-repo write denial), capability-prefix routing to pre-existing authorities only, realpath path containment + denied secrets paths, fail-closed command execution, per-request receipts in Postgres capability_requests. Exterior-auth middleware wraps /events, /canonical-events, /ingest, /orchestration, /missions, /ai, /connectors in the image but none of the source tree's mounts.
- STRONGEST RECOMMENDATION: the next prod deploy from the source tree would silently DROP the live execution authority and route authentication. Needs a GOVERNANCE-CORE ruling on the canonical home of CapabilityAuthority before convergence.
- Status: PROVEN (container reads).

## F200 — generic POST /events branch accepts unsigned payloads straight into emit [EXECUTION] [P1]
- Evidence: execution-core/EXECUTION-CORE.md. No signature/capability gate observed in route. Canonical live path confirmed separately: signed ingest (Ed25519, vocabulary/schema, identity binding) → UnifiedEventRuntime.emit (persist-first, deterministic IDs, collisions fail closed) → EventToMissionBridge → MissionScheduler → registered canonical workers → WitnessWorker (refuses unverified replays; emits WITNESS_REJECTED) → DeadLetterAuthority on exhaustion.
- Status: PROVEN (code). Consistent with F156/F180.

## F201 — dormant-but-dangerous: ExecutionAuthority (dynamic require+execute, no auth), ApprovalAuthority (auto-approve default), Python worker layer, IntelligenceWorker [EXECUTION] [P2]
- Evidence: execution-core/EXECUTION-CORE.md. ApprovalAuthority auto-approve default is `tests_passed || true`. Open reachability: ExecutionEngine//orchestration, generated WorkflowExecutor/StateMachineExecutor.
- Status: CLASSIFIED. Corroborates F147.

## F202 — no compensation mechanism anywhere; partial fan-out invisible in receipts [EXECUTION] [P2]
- Evidence: execution-core/EXECUTION-CORE.md. Persistence-before-dispatch with handler failures swallowed; mission transitions not transactional with mission events; dead letters carry witness + replayable flag.
- Status: PROVEN (code).

## F203 — RECOVERY.md's live-journal identity contradicts F58: backup-less conclusion must be re-anchored [RECOVERY] [P1]
- Evidence: recovery/RECOVERY.md claims the live journal is ping-postgres (DB crx_runtime) in an anonymous Docker volume created 2026-09-16. F58 PROVED the live journal is brain-postgres → ping_runtime (2,429 rows, writes through 2026-09-23 23:24 UTC), with ping-postgres → crx_runtime initialized but empty. The RPO-unbounded/zero-backup conclusion below stands, but its volume/DB anchoring is wrong and must be re-verified against brain-postgres's volume.
- Status: CONTRADICTION RECORDED; re-verification assigned.

## F204 — live journal has no recovery story: zero backups, RPO unbounded since 9/16, RTO not achievable [RECOVERY] [P0]
- Evidence: recovery/RECOVERY.md. No pg_dump schedule (no crontab, no Task Scheduler entry, C:\temp\postgres_backups absent), no WAL archive, no replication, rclone never installed. Volume corruption = total permanent loss.
- Status: PROVEN (infra). Corroborates F63.

## F205 — committed pg_dump.sql is the wrong generation: restoring it over live state would CORRUPT the live DB [RECOVERY] [P0]
- Evidence: recovery/RECOVERY.md. Real data (16 events, 7181 objects, latest event 2026-06-25), committed 2026-07-05 — but its schema (artifact_registry, authority_objects, …) does NOT match the live 6-table schema. Restoring it would merge June-schema tables into the live DB — a corruption vector, not a recovery. Restore never tested.
- Status: PROVEN.

## F206 — dormant-but-dangerous: destructive_recovery_certification.py inserts test events into the LIVE DB and deletes ALL Qdrant collections [RECOVERY] [P1]
- Evidence: recovery/RECOVERY.md. No confirmation prompt; its "rebuild" step is a no-op comment. Never executed (zero TEST_OBJECT rows in the dump). projection_rebuild_playbook.md documents unauthenticated Qdrant collection DELETEs.
- Status: PROVEN (code).

## F207 — RESTORE_TEST_REPORT.md's "RESTORE_TEST_PASSED" is misleading; WAVE_3F replay audit cites files that do not exist [RECOVERY] [P2]
- Evidence: recovery/RECOVERY.md. The "restore test" was a SHA256 file-integrity sample ("No restore operation was needed"), not a restore test. WAVE_3F_OPERATIONAL_RECOVERY_REPLAY_AUDIT.md cites replay-surface files (kernel/build_witness.py, runtime/persistent_runtime.py, api/main.py) that DO NOT EXIST on disk.
- Status: PROVEN.

## F208 — no recovery authorization gate anywhere: restore/delete/rewrite = whoever holds Pig SSH/docker access [RECOVERY] [P2]
- Evidence: recovery/RECOVERY.md. The constitutional amendment process governs spec text, not operations. Only one LIVE and PROVEN recovery mechanism exists: tools/fyd-site-projection/dump.py regenerates website projections from the journal (last ran 2026-09-22 08:50, ~daily cadence; downstream digest verification fails closed). The file is dirty in git — provenance of the live writer needs confirmation. Adapter failure semantics fail closed with typed errors (verified: PingReaderError hierarchy at ping-object-reader.ts:63-119, ATTESTATION_REJECTED at attestation-gate.ts:84,99,116,123); live gateway failure semantics unverifiable (container source not on the Pig). No checkpointing in either base; ping-qdrant currently UNHEALTHY with no snapshots ever taken.
- Status: PROVEN.

## F209 — three live identity namespaces with no bridge: OIDC UUIDv5, gateway identity_<16hex>, demo-owner [IDENTITY] [P1]
- Evidence: fleet/semantic/s7-adapter-fyd.md (R1). A Google UUID cannot enter the social signing lane; neither real lane maps to the claim actor. Corroborates F189.
- Status: PROVEN.

## F210 — two POST /identities mint lanes with divergent validation; createFydIdentity is non-transactional [IDENTITY] [P1]
- Evidence: fleet/semantic/s7-adapter-fyd.md (R2/R3). Keygen → gateway commit → local key-store → profile event. A key-store failure ORPHANS a live gateway identity with an unrecoverable key; a retry mints a SECOND identity.
- Status: PROVEN.

## F211 — claim gate inconsistency: verify requires demo-owner + private host; claim and release require only the env flag [GATE] [P1]
- Evidence: fleet/semantic/s7-adapter-fyd.md (R6). Release ignores the request (_req) and its "only the holder can release" check never fires in demo mode. Claim release() sets verification: null, destroying structured proof (R5/F19). Demo claim identity stamps authenticatedAt for an identity never authenticated (R7, verified in claim-identity.txt:25).
- Status: PROVEN.

## F212 — DemoOwnerContext.evaluateCapability ignores the requested capability, always answers the seeded verdict [CAPABILITY] [P1]
- Evidence: fleet/semantic/s7-adapter-fyd.md (R8/R9). The overrides route hardcodes owner.correct-fact for every command type.
- Status: PROVEN.

## F213 — owner store has two live keys: slug path vs canonical object id; writes on one surface invisible on the other [OBJECT] [P1]
- Evidence: fleet/semantic/s7-adapter-fyd.md (R11). view.ts:316 vs by-id.ts:40. R33: TENANT_ID_PATTERN accepts canonical object ids, so the tenant seam cannot catch the confusion. Confirms F20.
- Status: PROVEN.

## F214 — appendOwnerEvent REWRITES the audit log with only the newest event: silent audit-history destruction [AUDIT] [P0]
- Evidence: fleet/semantic/s7-adapter-fyd.md (R12/R13). Owner-event and claim persistence catch-all read failures to []/null; appendOwnerEvent then rewrites the log containing only the newest event. Shared <path>.tmp / <path>.tmp-<pid> temp files race on concurrent writes.
- Status: PROVEN.

## F215 — queryFydSiteOverlays claims "tenant scoping at the authority" but fetches ALL tenants' overlay events and filters client-side [TENANT] [P1]
- Evidence: fleet/semantic/s7-adapter-fyd.md (R15).
- Status: PROVEN.

## F216 — failure-semantics disagreement + dead/unreachable pipelines in the FYD adapter [SEMANTIC] [P2]
- Evidence: fleet/semantic/s7-adapter-fyd.md. Practice BFF has 12+ .catch(()=>[])/.catch(()=>null) sites (SOUL #11 violation); the FYD social readers fail closed instead (R22). The owner attestation gate's emit path is unwired on the server (only caller is the client demo walkthrough with emit: undefined) (R23); owner.edit-visibility has no callers (R24); owner.attest-regen is evaluated only for display. Site-patch proposal pipeline fully built and tested but unreachable (grants always []); the practice lane has a separate consumer with separate grant logic (R25). Social "deterministic action ID" is computed but never submitted (decorative idempotency); submitEnvelope coerces missing event_id to "" and missing status to "ok" (R20/R21). R18: FYD journal gateway event route has no auth (admitted in the adapter's own comment at src/fyd/customize/server.ts:8-9): the adapter's demo gate is bypassed at the persistence authority. R19: Lane D keys journal writes by body-supplied siteId with no tenant seam. R34: readers tiebreak conflict closed by sibling (F193).
- Lifecycle traces: 11 mechanisms traced DEFINED → TESTED. Next adjacent gap: the gateway trust boundary — a typed gateway client with failure semantics + authenticate the event route (closes R2, R18, R21, R22, R30 at origin); then the demo-to-real auth migration plan.
- Status: PROVEN/CLASSIFIED.

## F217 — THREE canonical-object envelopes coexist despite the consolidation claim [OBJECT] [P0]
- Evidence: fleet/object/o2-core-objects.md. (1) createCanonicalObject (the real one). (2) gateway/constitutional_object_factory.js delegates then OVERWRITES identity and lineage, destroying provenance_chain/derivation_path (F1, PROVEN). (3) gateway/operational_envelope.js:166: a SECOND class with the same name ConstitutionalObjectFactory that bypasses the envelope entirely (obj-<hash> IDs, no identity block, no canonical_bytes, mints the same kind names File/Symbol/Graph) (F3, PROVEN). knowledge_objects.js hand-rolls the envelope literal (F5).
- Status: PROVEN (code).

## F218 — four relationship shapes, no edge IDs; the only graph reader is structurally incapable of returning results [GRAPH] [P1]
- Evidence: fleet/object/o2-core-objects.md (F7, PROVEN — FAKE edges). Shapes: {relation, target: name-string}, {target_id, relation_type, ...}, {parent, children, related}, legacy uuid table.
- Status: PROVEN.

## F219 — SEVEN identity schemes across objects/events; the live journal path's event-ID hash is order-sensitive [IDENTITY] [P1]
- Evidence: fleet/object/o2-core-objects.md (F2, touches the live journal path; F8: dormant EventWriteAuthority whose per-eventType ID collides by design, latent). The live UnifiedEventRuntime event-ID hash uses order-sensitive JSON.stringify, defeating the stated idempotency guarantee. Corroborates F80, F145.
- Status: PROVEN.

## F220 — "Global Object Registry" register() writes only to a 60s in-memory cache; lookups query the superseded events table [REGISTRY] [P1]
- Evidence: fleet/object/o2-core-objects.md (F4, PROVEN at mechanism level). The live journal is ping_events. DB-dependent claims are mechanism-verified in code, marked accordingly (live DB not probed per read-only mandate).
- Status: PROVEN (mechanism).

## F221 — identity lost across transforms: Symbol dual minting, span-in-hash instability, invalid field queries [OBJECT] [P2]
- Evidence: fleet/object/o2-core-objects.md (F6). symbol_<4-field hash> vs Symbol_<full-payload hash>; span-in-hash makes symbol IDs unstable across file edits, orphaning symbols rows; SymbolRepository's field queries use invalid chained ->> and silently return null/[].
- Status: PROVEN (code).

## F222 — core does NOT constitutionalize business nouns; the live minting path is the healthy one [OBJECT] [P1-positive]
- Evidence: fleet/object/o2-core-objects.md. No kind: 'Business' anywhere; FYD business objects correctly stay as journal payloads. Runtime/machine/replay identity separation is sound. Live minting path (POST /ingest → CanonicalizationService → envelope → ping_events) is the healthy one; the symbol/graph/knowledge lanes are dormant or harness-only, bounding blast radius. CORE verified at cc6856c3b on refactor/runtime-authority-convergence; pre-existing dirty files (package-lock, capability_registry.json, dump.py, deliverables/) not touched.
- Next adjacent gap: the projection/read side of ping_events — who rebuilds state from the journal (projectors, event_bridge cursors in ping_bridge_cursors, projected_to_qdrant flags, ping-projector.js), and whether the adapter's two "current graph" readers agree with the core projector's output. Secondary: event_processing (markProcessed/markFailed) vs projector cursor ownership looks like another two-owner seam.
- Status: CONFIRMED.

## F223 — two real path-traversal read seams PATCHED in the adapter: traversal primitive proven, fix applied, regression test RUN AND GREEN [FILESYSTEM] [P1]
- Evidence: agent07-workspace-filesystem/WORKSPACE-FILESYSTEM.md. getPingObjectGraph(Sync) (src/fyd/data/ping-object-source.ts) and getPipelineManifest (src/fyd/media/bundle-media.ts) joined unvalidated ids into paths, both publicly reachable (public GET /api/fyd/objects/[objectId] chain and GET /api/fyd/media?siteId=). Traversal primitive proven (../../etc/x → /etc/x.json); exfiltration was blocked downstream by digest/shape validation, leaving blind-read + readFileSync memory-DoS. Fix: new shared guard src/fyd/data/site-id-guard.ts (/^[a-z0-9-]{1,64}$/), wired into all three call sites (assertSafeSiteId BEFORE path.join at ping-object-source.ts:263/285 and bundle-media.ts:128 — verified by reading the patched files). 3 files modified + 3 new files. REGRESSION TEST EXECUTED 2026-09-24 ~05:20 UTC on the Pig: ran the worktree's own jest config against the sprint worktree using the main checkout's node_modules (jest 30.4.2 + ts-jest, NODE_PATH) — 6/6 PASS (accept legitimate ids; reject traversal/absolute/separator ids; Sync refuses traversal id before touching fs; legitimate ids resolve under configured root; getPipelineManifest returns null for traversal ids; serves committed manifests for legitimate ids). No npm install, no git mutation, worktree untouched. COMMITS CREATED: NONE. Nothing staged. Sibling mods (customize/route.ts, claim/identity.ts, social/*) are disjoint and untouched.
- Status: PATCH APPLIED (adapter worktree), TEST GREEN (2026-09-24).

## F224 — WorkspaceRegistry is PHANTOM: the name appears exactly once, in an unmerged worktree patch [REGISTRY] [P2]
- Evidence: agent07-workspace-filesystem/WORKSPACE-FILESYSTEM.md. worktrees/oracle-assembly/.../gateway_runtime.js:52,424 requires a ../workspace_registry module that exists nowhere. Do not plan against it. Live registry analogues in the core are TenantRegistry/DeploymentRegistry/RuntimeRegistry, in-memory with zero filesystem use.
- Status: CLASSIFIED.

## F225 — FilesystemAuthority is DORMANT in the live core; its _scanRepository follows symlinks (latent root escape). DECIDED: ARCHIVE (do not wire). WorkspaceRegistry: PHANTOM, no action [FILESYSTEM] [P1]
- Evidence: agent07-workspace-filesystem/WORKSPACE-FILESYSTEM.md. gateway/filesystem_authority.js: zero instantiations in the main tree; the live gateway_runtime.js (97 requires) never references it. _scanRepository follows symlinks (fs.stat; primitive behavior proven on the Pig). Patch: lstat-over-stat + skip symlinks in _scanRepository (patches/agent07-workspace/filesystem-authority-symlink-scan.md, DORMANT-priority, propose-only). DECISION 2026-09-24 ~05:30 UTC (continuation coordinator, YOLO 80%+ rule; decision record: patches/agent07-workspace/filesystem-authority-archive-decision.md, PROPOSE-ONLY, no live file modified, COMMITS CREATED: NONE): ARCHIVE the module as dormant-historical — wiring would create a fourth File-object creation mechanism competing with createCanonicalObject (Agent 20 row 16) with a known escape defect and zero live consumers; re-wire only if a named live consumer appears AND the symlink patch lands first. Phantom WorkspaceRegistry: the only reference in the tree is the untracked stale bundle worktrees/oracle-assembly/oracle-assembly-patches/gateway/bootstrap/gateway_runtime.js (git grep in tracked tree: EMPTY; module exists nowhere); GC-12 already flagged do-not-apply. No code change; do not plan against it.
- Status: PROVEN (code), patch proposed only, DECISION RECORDED.

## F226 — all adapter write paths contained; core live HTTP writers are Postgres-backed, not filesystem [FILESYSTEM] [P1-positive]
- Evidence: agent07-workspace-filesystem/WORKSPACE-FILESYSTEM.md. sha256 filenames or strict regex segments; same-dir tmp+rename everywhere. No central path-containment owner existed — now has a helper module, not a second authority.
- Status: CONFIRMED.

## F227 — .gitignore data/ was swallowing src/fyd/data/; narrowed to root-anchored /data/ [WORKSPACE] [P2]
- Evidence: agent07-workspace-filesystem/WORKSPACE-FILESYSTEM.md.
- Status: PATCH APPLIED (adapter worktree).

## F228 — /knowledge/nodes route layer is UNGATED; the served checkout contains no knowledge routes at all (it is the website, not the gateway) [SECURITY] [P0]
- Evidence: fleet/projection/p4-open-items-probe.md (W4-F1). Served checkout /home/nolan/projects/ping @ e48ef710: `find src/app/api -iname "*knowledge*"` empty; src/middleware.ts is page-routing only, zero auth. The live route /home/nolan/ping/gateway/routes/knowledge.js: no auth middleware at mount or in the route file; file UNMODIFIED since the audit (git status clean). F74/V1 breach stands: POST /knowledge/nodes writes sourceless nodes served as verified:true by hybrid_search.js:98.
- Status: PROVEN (code), UNGATED.

## F229 — derived-namespace decision: PROPOSAL — IdentityAuthority owns the source-vs-derived classification; PROJECTION_CREATED gets typed DERIVED classification (proposal only, not applied) [GOVERNANCE] [P2]
- Evidence: fleet/projection/p4-open-items-probe.md (W4-F2); patches/p4-open-items-probe/PROPOSAL-derived-namespace-ownership.md (WHY→EVIDENCE→MINIMUM CHANGE→TEST→RESULT). F76: journal mixes source and derived events, distinguishable only by event_type string. Rationale: source-vs-derived is an event-identity/classification question = IdentityAuthority's standing jurisdiction. Minimum: typed DERIVED classification on the event-type registry; PROJECTION_CREATED emitted with derivation:{kind,upstreamEventId}; consumers filter on classification. What stays: ping_events remains the ONE journal (no second derived-events table). Retry dedupe keys on (upstreamEventId, event_type).
- Status: PROPOSAL, NOT APPLIED.

## F230 — dump.py uncommitted diff (+87/-9, v1.0.0→v1.1.0) is a coherent presentation-intent layer; LIVE projections were produced by this uncommitted code; max-age bound still NONE [PROVENANCE] [P1]
- Evidence: fleet/projection/p4-open-items-probe.md (W4-F3); patches/p4-open-items-probe/PROPOSAL-dump-max-age-bound.md. New overlay ops set_presentation_intent/clear_presentation_intent with fail-closed validation (DEMO OWNER MODE marker required); intents accumulate journal-ordered, never merged into the graph; meta.presentationIntentDigest mirrors graphDigest. On-disk live projections carry dumperVersion 1.1.0 = the uncommitted code (confirms AGENT-04 §5 drift). Max-age: meta.dumpedAt exists but no constant/config/read-side age check; SITES cfg has no age bound; read seam verifies digest not age; invocation still manual. Smallest proposal: maxAgeSeconds in SITES cfg → meta.maxAgeSeconds on dump; read seam exposes stale:true (signal, not trigger; no cron). Left open: who re-runs dump.py (F77 cadence question).
- Status: PROVEN (code); proposal NOT APPLIED.

## F231 — Qdrant single-writer proposal STILL-OPEN and unapplied; no new writer appeared [PROJECTION] [P0-standing]
- Evidence: fleet/projection/p4-open-items-probe.md (W4-F4). PROPOSAL-qdrant-single-writer.md unapplied; direct-Qdrant block intact at ping-runtime/workers/canonical_workers.js:190-209; grep shows exactly the two known live writers (embedding_service.js:134 Writer A; canonical_workers.js:193 Writer B) plus test-stub and archive-doc references only; served checkout has zero projectToQdrant callers. Minor drift: worker payload timestamp now constitutionalTimeAuthority.nowAsISOString(); retry dedup still absent (F76 mechanism unchanged).
- Status: STILL-OPEN (proposal stands).

## F232 — `approvals` table ABSENT from live DB; `mission_executions` = 0 rows — the approval pipeline theater never persisted (closes OBS4's open question) [OBSERVABILITY] [P1]
- Evidence: agent12-observability-recovery/OBSERVABILITY-RECOVERY.md (W12-F1). Read-only psql on brain-postgres 2026-09-24: `relation "approvals" does not exist`; mission_executions count(*)=0. ApprovalAuthority.requestApproval INSERTs into a table that does not exist; OBS4 G7/G8 rubber-stamp conditions + status/approval_status field mismatch mean _commit always throws anyway. The theater is code-only — self-limiting, but the broken gate is still declared authority.
- Status: PROVEN (live DB).

## F233 — live `:8080/health` returns "healthy" while omitting the entire worker pipeline [OBSERVABILITY] [P1]
- Evidence: agent12-observability-recovery/OBSERVABILITY-RECOVERY.md (W12-F2). Live HTTP read 2026-09-24 + gateway/bootstrap/gateway_runtime.js:726-759 (8 registerHealthCheck calls): none cover MissionScheduler, WorkerRuntime, EventBridge, EventToMissionBridge, or DeadLetterAuthority. The gateway can report healthy while the worker pipeline is stopped or dropping work. False health certainty.
- Status: PROVEN (live HTTP + code).

## F234 — DLQ is a terminal sink: `replayDeadLetter` has zero live callers, no recovery arrow [RECOVERY] [P2]
- Evidence: agent12-observability-recovery/OBSERVABILITY-RECOVERY.md (W12-F3). Pig grep replayDeadLetter over gateway/ + ping-runtime/ → only the definition site in dead_letter_authority.js; OBS1 T7(c); F69 (no HTTP route replays a dead letter). A poisoned mission's lifecycle ends at "failed" — "recovered" is not an option. Wiring replay is a decision, not a bug fix.
- Status: PROVEN (code).

## F235 — checkpoint authority is PHANTOM: no module on disk, 0 rows ever persisted [RECOVERY] [P2]
- Evidence: agent12-observability-recovery/OBSERVABILITY-RECOVERY.md (W12-F4). MissionExecutionAuthority accepts checkpointAuthority in its constructor (mission_execution_authority.js:36-43) but no checkpoint_authority.js exists anywhere under gateway/ or ping-runtime/; the mission_executions INSERT names checkpoint_id but 0 rows exist (F232). The recovery step cannot resolve even if the gate were fixed.
- Status: PROVEN (code + live DB).

## F236 — dump.py provenance + cadence gap: dirty in git since 2026-09-21, manual-only, last ran 2026-09-22 14:50 UTC (~48h stale) [RECOVERY] [P1]
- Evidence: agent12-observability-recovery/OBSERVABILITY-RECOVERY.md (W12-F5). git status --porcelain, stat, ls -lt var/fyd-projections/, crontab (empty on Pig WSL; no Task Scheduler evidence). The one proven recovery mechanism's provenance is unconfirmed and its outputs go stale with no bound — corroborates F230's max-age finding.
- Status: PROVEN (infra).

## F237 — journal quiescent: ping_events = 2,429 rows, last write 2026-09-23 23:24 UTC; ping_missions = 471 completed only [OBSERVABILITY] [info]
- Evidence: agent12-observability-recovery/OBSERVABILITY-RECOVERY.md (W12-F6). Live DB probe. Consistent with OBS1/OBS3's "no business events flowing" — the trace is quiescent, not merely latent.
- Status: PROVEN (live DB).

## F238 — MISSION_* lifecycle events are correlation-orphans: emitted without correlation_id, so the two most important traces are mutually unjoinable [OBSERVABILITY] [P1]
- Evidence: agent12-observability-recovery/OBSERVABILITY-RECOVERY.md (W12-F7; OBS1 T8(4)). mission_runtime.js:97-100 etc. emit without correlation_id; getTrace / /mc/missions/:id/trace never include them. "What did the system do about event X" requires two independent queries with an indirect join via the shared trigger event_id.
- Status: PROVEN (code, via OBS1).

## F239 — `created_by` is write-only: no live consumer SELECTs ping_missions.created_by; "who claimed it" unanswerable on the mission lane [OBSERVABILITY] [P1]
- Evidence: agent12-observability-recovery/OBSERVABILITY-RECOVERY.md (W12-F8; OBS1 T5). Omitted from MISSION_CREATED payload and dispatch metadata. Lifecycle-answerability audit: "what happened" durably answerable; "who did it" broken/unverifiable in 5 of 6 sampled mechanisms.
- Status: PROVEN (code, via OBS1).

## F240 — projection reader verifies digest but not age: journaled-overlay staleness is invisible to the public page [OBSERVABILITY] [P2]
- Evidence: agent12-observability-recovery/OBSERVABILITY-RECOVERY.md (W12-F9; Agent 20 map row 15). getPingObjectGraph verifies graphDigest (tamper) but not age — an overlay fixed yesterday can be invisible to the public page for the whole dump cadence with no staleness signal. Corroborates F230.
- Status: PROVEN (code).

## F241 — vector recovery UNOWNED: 48% PRNG-noise fallback vectors, no re-embed path, ping-qdrant unhealthy, zero snapshots [RECOVERY] [P1]
- Evidence: agent12-observability-recovery/OBSERVABILITY-RECOVERY.md (W12-F10). docker ps 2026-09-24 (ping-qdrant Up/unhealthy); F138 (48% noise vectors, no re-embed); F208. If knowledge collections are lost, there is no re-derivation path. Recovery classification full inventory: PROVEN = dump.py regen, mission retry→DLQ, owner-log pure fold; THEATER = ApprovalAuthority records, ReplayCertificate, replay-integrity.yml on empty dir, 66 WITNESS_CREATED labels, RESTORE_TEST_PASSED, WAVE_3F, /health healthy, phantom checkpoint; DORMANT = replayDeadLetter, destructive_recovery_certification.py (never ran, no confirmation — one careless run from catastrophe), backup_postgres.ps1, MissionEventBus, Python fleet; UNOWNED = journal durability (RPO unbounded), destructive recovery authorization (possession-based), vector recovery.
- Status: PROVEN (infra + code).

## F242 — NEXT GAP: authenticate deployed :8080 POST /events canonical-spine lane (P0, live) [SECURITY] [P0]
- Evidence: agent20-convergence/CONTINUATION-REPORT.md (W20-F1); F180 (lane accepts unauthenticated mutating FYD_SITE_OVERLAY events; bearer token never validated; type registered at event_registry.json:2334). Propose-only remediation already exists: patches/transition/gateway-events-canonical-lane-auth.md. Converges S6b + S7 next gaps ("authenticate the event route"; "typed gateway client with failure semantics").
- Status: CONFIRMED GAP; remediation PROPOSED, NOT APPLIED.

## F243 — NEXT GAP: POST /missions unauthenticated + CONFIRMED UNBOUNDED echo loop; kill plan must precede any live-fire drill (P0, live) [SECURITY/EXECUTION] [P0]
- Evidence: agent20-convergence/CONTINUATION-REPORT.md (W20-F2); F124/F172: single unauthenticated POST ignites the loop; OBS3's proposed fix would NOT fix it; P-T1 (dispatch only to assigned worker) supersedes. The lane's warning stands: a live-fire drill ignites the loop without a kill plan.
- Status: CONFIRMED GAP; kill plan + P-T1 decision PENDING.

## F244 — NEXT GAP: rule on the CapabilityAuthority canonical home; freeze source-tree prod deploys (P0, live) [GOVERNANCE] [P0]
- Evidence: agent20-convergence/CONTINUATION-REPORT.md (W20-F3); F199/CP-7: prod image devin-boundary2 bundles the live 889-line CapabilityAuthority + exterior-auth middleware; the source tree has NONE of these files. The next source-tree deploy would SILENTLY DROP the live execution authority + route auth. Escalation-class.
- Status: CONFIRMED GAP; GOVERNANCE-CORE ruling + deploy freeze PENDING.

## F245 — NEXT GAP: semantic plane rebuild — canonical_hash backfill + re-embed path + rebuild job (P0/P1) [SEMANTIC] [P0]
- Evidence: agent20-convergence/CONTINUATION-REPORT.md (W20-F4); F137: brain-qdrant REST unauthenticated; F138: 48% PRNG-noise fallback vectors; F139: canonical_hash null on 94% (verify() fail-closes retrieval); F140: 206 nodes / 0 edges, all stuck at candidate. Agent 14's handoffs name the owners (Agent 04: canonical_hash + re-embed + rebuild; Agent 05: toQdrantId + node IDs; Agent 06: write surfaces; Agent 13: two node generations).
- Status: CONFIRMED GAP; owners named, work not started.

## F246 — NEXT GAP: served :3100 claim-verify + object-overrides approve paths ungated (P0, live) [SECURITY] [P0]
- Evidence: agent20-convergence/CONTINUATION-REPORT.md (W20-F5); F162: claim-verify route has NO gate — self-asserted operator-attestation persists; F163: object-overrides approve path has no gate; seeded DemoOwnerContext stands in for a principal. Runner-up: F144/CP-1 — route the CanonicalizationService-bypassed paths /events, /canonical-events, /identities through the single ingest authority.
- Status: CONFIRMED GAP; remediation NOT PROPOSED.

## F247 — F29 remainder ATTRIBUTED: the identity.ts comment-only patch was the FYD golden-path investigator's forensic subagent's disclosed docstring fix; governance concern closes [WRITE-GATE] [P2]
- Evidence: fleet/semantic/s9-open-items-probe.md (W9-F1). Worktree diff (HEAD a69bb68fc8): comment-only, docstring self-dated "corrected 2026-09-23", fixing a stale claim that the Google-ready auth adapter was "being built in parallel"; author admitted in writing at fyd-path/FYD-GOLDEN-PATH.md lines 3, 115-122 with a Nolan-authorized patch record and replay script fyd-path/patch-identity-comment.py. F193's "UNIDENTIFIED" was a cross-lane visibility gap (Agent 16 truthfully reported not touching it), not a missing admission. F29 fully closed.
- Status: ATTRIBUTED; no governance action outstanding.

## F248 — F179 RESOLVED: /mc/queues is LIVE, not vestigial — OBS1 was correct, OBS3's "vestigial" label refuted [OBSERVABILITY] [P2]
- Evidence: fleet/semantic/s9-open-items-probe.md (W9-F2). gateway/routes/mission_control.js registers GET /mc/queues and /mc/queues/:eventType; mounted at gateway_runtime.js:810; injected live UnifiedEventRuntime (:433) whose query() (unified_event_runtime.js:224) builds SELECT * FROM ping_events (:227) — the live journal, last-hour window. OBS3 conflated it with the genuinely vestigial /events/unprocessed|/processed|/failed protocol (events.js:129-150). Caveat: zero in-repo code callers — a consumerless live endpoint, not a dead one.
- Status: RESOLVED (LIVE).

## F249 — F159 TRIGGER PROVEN-absent on the live journal; independent re-verification corroborating F59 [EVENT] [P2]
- Evidence: fleet/semantic/s9-open-items-probe.md (W9-F3). Read-only pg_trigger catalog query on brain-postgres/ping_runtime 2026-09-24: zero rows on ping_events; sanity count(*) = 2429 matches F58. Append-only lives in code only (INSERT ... ON CONFLICT DO NOTHING + fail-closed), not the DB — anyone with app credentials can still UPDATE/DELETE the live journal silently. F59's P1 trigger-promotion proposal remains unapplied.
- Status: PROVEN-absent.

---

## Wave continuation merge — F250–F299 (2026-09-24 ~05:25 MDT)

Five bounded workers (W1 gateway, W2 governance, W3 served, W4 semantic, W5 recovery-decisions) against the F242–F246 frontier + Agent 12 convergence inputs. Read-only; propose-only; zero commits, zero live-runtime mutations. Fragment sources: fleet/gateway/w1-event-lane-echo.md (F250–F259), fleet/governance/w2-capability-authority-home.md (F260–F269), fleet/served/w3-claim-verify-gates.md (F270–F279), fleet/semantic/w4-semantic-rebuild.md (F280–F289), agent12-observability-recovery/w5-convergence-decisions.md (F290–F299). Dedupe-verified: no ID reused, no finding duplicates F1–F249 + B1.

## F250 — F242's auth proposal is revision-blind; it must be re-anchored before apply [SECURITY] [P0]

- WHY: The existing proposal (`patches/transition/gateway-events-canonical-lane-auth.md`) diffs against
  the `[SOURCE]` revision: "no auth middleware", "zero hits for the bearer token", gate on a new
  `GATEWAY_WRITE_TOKEN` env. But `[PROD-IMAGE]` already wraps `/events` in `ExteriorAuthMiddleware`
  (image `gateway_runtime.js:790,794,798,900,916-920`; EXECUTION-CORE.md §0) which attaches
  `req.authenticatedAgent`, and `[NEWER-CAPTURE]` reads it in the canonical-spine branch. A diff that
  ignores the middleware either double-gates (harmless but confusing) or, worse, gets evaluated against
  the wrong revision and is declared "unnecessary" because "the image already has auth" — while the
  actual gap (F251) survives. F156 closed B1 only for the route file, not the middleware chain.
- EVIDENCE: EXECUTION-CORE.md rows 230-231; `event/gw-post-events.txt` (tenant isolation + authenticatedAgent);
  `fleet/security/sec4-unauth-endpoints.md:16` (live 401/403 capture neither worktree copy explains).
- MINIMUM CHANGE: Rewrite the proposal as revision-aware: gate the route on `req.authenticatedAgent`
  presence (the middleware's attachment point) with the env-bearer as fallback where no middleware runs;
  verify-first probe matrix (F252) precedes any apply.
- TEST: (1) identify which revision serves :8080 now; (2) unauthenticated canonical POST → 401 in every revision.
- RESULT: Hardened proposal written at `patches/transition/w1-event-lane-auth-hardened.md`; NOT APPLIED.

## F251 — Attribution is not access control: the canonical-spine branch tolerates missing identity [SECURITY] [P0]

- WHY: `[NEWER-CAPTURE]` shows the branch reads the middleware's attachment but never requires it:
  `const _agent = req.authenticatedAgent; const _source = _agent ? ('api:' + _agent.agentId) : 'api';`
  then proceeds to `eventRuntime.emit(...)`. If the middleware passes a request through without attaching
  an identity (misconfig, pool failure, localhost exception), the lane journals the event anyway with
  source `'api'`. Identity attachment is attribution; only a require-identity check is access control.
  The tenant-isolation block in the same branch validates the *claimed tenant* against the registry —
  scope validation, not caller authentication.
- EVIDENCE: `event/gw-post-events.txt:41-47`; EXECUTION-CORE.md row 236 (MEDIUM confidence, "full middleware
  chain in prod image not re-verified for this branch").
- MINIMUM CHANGE: In the canonical-spine branch, reject when `req.authenticatedAgent` is absent
  (401), before tenant validation and before emit. Never fall back to source `'api'` for HTTP callers.
- TEST: Request with middleware present but no credential → 401 at the route (not silent `'api'` source).
- RESULT: Folded into the hardened proposal; NOT APPLIED.

## F252 — Unresolved contradiction: live 401 capture vs proven code acceptance [SECURITY] [P0]

- WHY: SEC4 records a 2026-09-16/17 live capture of `POST /events` returning 401 for unauthenticated calls
  and 403 for malformed namespaces (`fleet/security/sec4-unauth-endpoints.md:16`), while F180 proves the
  `[SOURCE]` code accepts unauthenticated callers. Both cannot describe the same revision. Until the
  contradiction is resolved by a read-only live probe, any apply risks "fixing" the wrong revision —
  or declaring victory on a revision that is not serving.
- EVIDENCE: sec4-unauth-endpoints.md:16,424,428,553; F180 evidence block; F156 (B1 closed for route file only).
- MINIMUM CHANGE: Run the probe matrix (read-only, no POST mutations): (a) `GET /health` + container image
  digest — which bytes serve :8080 now; (b) unauthenticated `POST /events` with a *structurally invalid*
  body (rejected before any journal write — proves the 401/accept boundary without mutating); (c) repeat
  against a `FYD_SITE_OVERLAY` shape only if (b) shows acceptance. No synthetic overlay event may be journaled.
- TEST: Probe results recorded; the hardened proposal's TEST section is gated on them.
- RESULT: Probe NOT RUN (Pig unreachable from this sandbox). Owned by whoever holds Pig access; the hardened
  proposal lists it as apply-blocker #1.

## F253 — The operator bearer token is still theater; its lifecycle is unspecified [SECURITY] [P1]

- WHY: `tools/fyd-site-projection/emit-overlay.py` sends an `Authorization: Bearer` token that zero gateway
  code validates (F180/T7). The existing proposal promotes it to the write credential via
  `GATEWAY_WRITE_TOKEN`, but specifies no issuance, rotation, revocation, or distribution list. A static
  shared secret with no lifecycle is a credential-theater upgrade: it closes the anonymous hole while
  creating an unmanageable shared secret (every operator, every script, one value, no expiry).
- EVIDENCE: transition/TRANSITION.md T7; F180; F253 is new (lifecycle gap in the existing proposal).
- MINIMUM CHANGE: (a) Prefer the middleware's verified agent identity as the primary credential on
  `[PROD-IMAGE]`; use the env bearer only where no middleware runs (`[SOURCE]`/rc). (b) Specify: token
  generated per deployment, stored in the gateway container env (never in repo), distributed to
  `emit-overlay.py` operators out of band, rotated on operator churn; revocation = env change + restart.
- TEST: Wrong token → 401; rotated token → old stops working, new works; `emit-overlay.py` documented.
- RESULT: Specified in the hardened proposal; NOT APPLIED.

## F254 — F244 interplay: the hardened gate must live in the source tree, or the next deploy drops it [SECURITY/GOVERNANCE] [P0]

- WHY: F199/CP-7: the exterior-auth middleware exists ONLY in `[PROD-IMAGE]`; the next source-tree deploy
  silently drops it (F244). If the auth gate lives only in the image, the F242 hole re-opens on the next
  deploy. The durable fix must be a route-level require-identity check committed to the source tree, so
  every future image carries it regardless of which middleware the image bundles.
- EVIDENCE: EXECUTION-CORE.md rows 230-231; F244; GLOBAL-AUTHORITY-MAP.md CP-7.
- MINIMUM CHANGE: Route-level gate in `gateway/routes/events.js` (source tree), fail-closed, middleware-
  agnostic (requires `req.authenticatedAgent`, else env-bearer, else 401). Rollout ordered after the
  F244 canonical-home ruling; deploy freeze respected.
- TEST: Build an image from source; unauthenticated canonical POST → 401 with no middleware present.
- RESULT: Proposed; NOT APPLIED. Blocked on F244 governance ruling for the deploy step only — the source
  diff itself is safe to prepare.

## F255 — Echo-loop trigger anatomy CONFIRMED (consumes F124/F172/F243) [EXECUTION/SECURITY] [P0]

- WHY: A single unauthenticated `POST /missions {missionType:'PROJECTION_CREATE'}` (F124: `gateway/routes/missions.js:22`,
  no auth; scheduler auto-dispatches within 5s) ignites a truly unbounded loop:
  1. `MissionScheduler._dispatch` builds the dispatch event with `event_type` = the ORIGINAL business type
     (`mission_scheduler.js:24-32` DOC-CONTRACT, `:219-244`), so a `REPLAY_VERIFY` mission dispatches as
     `event_type='PROJECTION_CREATED'`.
  2. `WorkerRuntime.dispatch(event)` (`worker_runtime.js:69-108`) broadcasts to EVERY worker whose
     `eventTypes` include `PROJECTION_CREATED` — projection re-runs (`canonical_workers.js:708-709`).
  3. ProjectionWorker re-emits `PROJECTION_CREATED` (`canonical_workers.js:182`) with a fresh-timestamp
     payload → fresh content-hash `event_id` (`unified_event_runtime.js:80-83`) → defeats the
     `ON CONFLICT DO NOTHING` dedupe (`:153`).
  4. `EventToMissionBridge` sees the new `PROJECTION_CREATED` → mints a new `REPLAY_VERIFY` mission
     (`mission_runtime.js:78-84`, `mission_id = sha256('REPLAY_VERIFY:' + new_event_id)`, distinct each echo).
  5. Goto 1. Each cycle also spawns the replay→witness→lineage tail and a Qdrant point. Throttled ONLY by
     scheduler `maxConcurrent=3` / per-worker `maxConcurrent=2` — rate limits, not termination.
  6. Observability poisoning: the echo inflates `/mc/missions/stats` completed counts and `ping_events` row
     counts, reading as healthy throughput; the only early signal is abnormal correlation-group growth.
- EVIDENCE: `fleet/observability/obs1-mission-trace.md` T1 (verified against byte-identical scratch pulls
  `fleet/observability/obs1-scratch/`); F172; F124/F243.
- MINIMUM CHANGE: None in this finding — mechanism record. Remediation is F256/F258.
- TEST: Not run — any live-fire drill ignites the loop (F243 warning stands).
- RESULT: Mechanism re-verified against scratch sources; kill plan written at
  `patches/transition/w1-echo-loop-kill-plan.md`. NO DRILL RUN.

## F256 — Kill-switch insertion points for the echo loop (kill plan must precede any drill) [EXECUTION] [P0]

- WHY: The loop has four independent fuel points; a kill plan must name the switch at each, in order,
  before anyone runs the live-fire drill OBS1/OBS3 proposed. Switches:
  1. **Scheduler poll pause** (`mission_scheduler.js:190-213`, 5s poll): an in-memory/env pause flag checked
     at the top of `_poll` — stops new dispatches within one poll interval. Fastest switch.
  2. **Bridge mint pause** (`event_to_mission_bridge.js`): flag or filter that stops minting `REPLAY_VERIFY`
     for `PROJECTION_CREATED` — stops new mission creation even if events flow.
  3. **P-T1 dispatch scoping** (F258): structural fix — `WorkerRuntime.dispatch(event, onlyWorker)` —
     removes the re-match that re-runs projection. The permanent kill.
  4. **POST /missions auth gate** (companion to F124): removes the remote trigger. Until applied, the loop
     is remotely ignitable by anyone reaching the gateway.
  Secondary audit (not a switch): `WorkerRuntime._poll` (`worker_runtime.js:145-159`) polls the vestigial
  `/events/unprocessed` endpoint and calls broadcast `this.dispatch(event)` — a second fan-out path if that
  endpoint ever serves rows again.
- EVIDENCE: obs1-scratch `mission_scheduler.js:190-213,250`, `worker_runtime.js:69-108,145-159`;
  obs1-mission-trace.md P-T1; s5-missions-mcp.md F1.
- MINIMUM CHANGE: Add the pause flags (1)(2) as propose-only diffs; P-T1 as the structural diff; /missions
  gate per s5-F1's minimum change.
- TEST: With (1)+(2) armed, one synthetic `PROJECTION_CREATED` → assert `ping_missions` stops growing
  within 2 poll intervals and no new `REPLAY_VERIFY` rows appear. Full chain test only after P-T1.
- RESULT: Kill plan written; switches NOT INSTALLED (propose-only). NO DRILL RUN.

## F257 — Detecting a live loop from the journal (read-only) [OBSERVABILITY] [P1]

- WHY: If the loop ignites (accidentally or hostilely), the operator needs read-only queries that distinguish
  it from healthy throughput, because `/mc/missions/stats` is poisoned by the echo itself.
- EVIDENCE: obs1-mission-trace.md T1/T6; F249 (live journal = brain-postgres/ping_runtime, 2429 rows baseline).
- MINIMUM CHANGE (detection runbook, no code):
  1. `SELECT event_type, count(*) FROM ping_events WHERE created_at > now() - interval '5 minutes' GROUP BY 1 ORDER BY 2 DESC;`
     → `PROJECTION_CREATED` dominating and growing window-over-window = loop signature.
  2. `SELECT mission_type, state, count(*) FROM ping_missions GROUP BY 1,2;`
     → `REPLAY_VERIFY` in `created`/`pending` growing unboundedly.
  3. Correlation-group growth: `SELECT correlation_id, count(*) FROM ping_events WHERE created_at > now() - interval '1 hour' GROUP BY 1 ORDER BY 2 DESC LIMIT 20;`
     → one chain absorbing the majority of new rows (the only early signal per OBS1).
  4. Chain signature: echo missions carry `mission_id = sha256('REPLAY_VERIFY:' || payload->>'event_id')`
     with `payload->>'event_id'` pointing at the parent echo's `PROJECTION_CREATED` event — walkable via
     `/events/:eventId/descendants`.
  5. Cross-check: `/mc/missions/stats` completed counts rising while (1)-(3) show a single chain = poisoned
     observability, not throughput.
- TEST: Run (1)-(5) against the live journal now (read-only) to bank a quiescent baseline; re-run on any alert.
- RESULT: Runbook written in the kill plan; baseline NOT captured (Pig unreachable from here).

## F258 — P-T1 design hardened: dispatch only to the assigned worker [EXECUTION] [P0]

- WHY: OBS3's proposed fix (remove self-subscription from worker `eventTypes`) targets registrations that do
  not exist at cc6856c — it would change nothing. The live mechanism is dispatch-time re-matching
  (F255), so the fix must be at dispatch time: `MissionScheduler._dispatch` already resolves
  `workerName = MISSION_WORKER_MAP[mission.mission_type]` (`:193`) and verifies registration (`:199-204`);
  it then throws that knowledge away and broadcasts. P-T1 keeps the knowledge.
- EVIDENCE: obs1-scratch `mission_scheduler.js:193-204,250`; `worker_runtime.js:69-108`;
  obs1-mission-trace.md P-T1; F172 (OBS3 fix refuted).
- MINIMUM CHANGE (exact diff shape):
  ```diff
  --- a/ping-runtime/workers/worker_runtime.js
  +++ b/ping-runtime/workers/worker_runtime.js
  @@
  -  async dispatch(event) {
  +  async dispatch(event, onlyWorker = null) {
       const eventType = event.event_type;
       let lastResult = null;
       for (const [name, entry] of this._workers) {
  +      // P-T1: mission dispatch targets exactly the assigned worker.
  +      // event_type on a mission dispatch event is data, not a routing broadcast.
  +      if (onlyWorker && name !== onlyWorker) continue;
         if (entry.eventTypes.length > 0 && entry.eventTypes.includes(eventType)) {
  --- a/ping-runtime/orchestration/mission_scheduler.js
  +++ b/ping-runtime/orchestration/mission_scheduler.js
  @@
  -      const dispatchResult = await this._workerRuntime.dispatch(event);
  +      // P-T1: dispatch only to the assigned worker. Broadcast dispatch re-matched
  +      // projection on every REPLAY_VERIFY mission (event_type='PROJECTION_CREATED')
  +      // and re-ignited the echo. See [DOC-CONTRACT] below.
  +      const dispatchResult = await this._workerRuntime.dispatch(event, workerName);
  ```
  Plus: update the `[DOC-CONTRACT]` comment (`mission_scheduler.js:24-32`) to record the new invariant —
  *a mission executes exactly its assigned worker; event_type on the dispatch event is data, not a routing
  broadcast.* Default `onlyWorker = null` preserves broadcast for the non-mission caller
  (`WorkerRuntime._poll`, vestigial `/events/unprocessed` path).
- FAILURE SEMANTICS (unchanged paths): unknown `mission_type` → existing skip + stats (add a journal/log
  event per s5-F1's minimum change); assigned worker unregistered → existing skip; assigned worker returns
  no match (null) → existing skip + `_failMission` (phantom-complete prevention intact); worker throws →
  existing retry → exhaustion → DLQ (`mission_scheduler.js:289-330`).
- TEST (no live-fire until kill switches armed): unit — dispatch synthetic `REPLAY_VERIFY` with
  `payload.event_type='PROJECTION_CREATED'`, assert only the replay worker ran and no `PROJECTION_CREATED`
  was emitted; chain — one `PROJECTION_CREATED` through the bridge with switches armed → assert
  `ping_missions` grows by a bounded finite chain and returns to quiescent.
- RESULT: Design written; NOT APPLIED. Dependency: touches the `[DOC-CONTRACT]` convergence-ledger entry —
  route through Agent 20 before any test (obs1 open question 3, carried).

## F259 — Recovery procedure + Nolan-gated decisions [GOVERNANCE] [P0]

- WHY: Killing the loop is half the job; recovery must not corrupt the journal, and three decisions need
  Nolan (standing rule: destructive/irreversible, production side effects, ambiguous ownership).
- EVIDENCE: F243; F204 (no backups — journal loss is permanent); F249 (append-only lives in code only).
- MINIMUM CHANGE (recovery order, operator-run):
  1. Arm kill switches (F256: pause scheduler poll, pause bridge mint).
  2. Let in-flight echo missions drain; mark stuck echo `REPLAY_VERIFY` missions failed/dead-lettered via
     the existing `_failMission` → DLQ path — never `DELETE` journal rows (append-only; F204: no backups).
  3. Verify quiescence with F257 probes (two consecutive quiet windows).
  4. Apply P-T1 (+ /missions auth gate), re-enable scheduler/bridge, run the bounded chain test.
  5. Bank the new quiescent baseline.
- NOLAN-GATED (do not proceed without his call):
  1. **401-contradiction probe** (F252): who runs the read-only live probe matrix, and is a structurally-
     invalid-body POST acceptable as the probe (no journal mutation by construction)?
  2. **Credential choice**: middleware-attached agent identity as primary credential vs the env bearer
     token (F253 lifecycle) — or both (defense in depth)?
  3. **F244 canonical-home ruling**: the deploy that carries the hardened gate needs the governance ruling
     first; until then the image/source drift persists and any source deploy re-opens the lane.
- TEST: Recovery drill is the bounded chain test in F258 — only after kill switches are installed.
- RESULT: Documented in the kill plan. NO DRILL RUN. Nothing applied.

---

## Generic failure classes (every failure becomes a class entry)

- **G-AUTH-1 — Attribution without access control.** A middleware attaches a verified identity to the request;
  the route reads it but tolerates its absence. Identity attachment is not enforcement. (F251)
- **G-AUTH-2 — Revision-blind security claims.** A finding or proposal verified against one revision
  (source tree) is evaluated as if it described another (live image). Tag every security claim with its
  revision. (F250, F252)
- **G-AUTH-3 — Theater credentials.** A credential is sent by clients but validated by nothing; promoting it
  to a real credential without specifying issuance/rotation/revocation just upgrades the theater. (F253)
- **G-EXEC-1 — Dispatch re-match echo.** Broadcast dispatch keyed on a data field (`event_type`) re-runs
  the producer of that field; content-hash IDs with fresh timestamps defeat dedupe. Fix at dispatch time,
  not at registration time. (F172/F255/F258; OBS3's registration fix was the wrong layer)
- **G-EXEC-2 — Poisoned observability.** A runaway loop inflates the very throughput counters used to judge
  health; detection must cross-check journal growth against control-plane stats. (F255/F257)
- **G-DEPLOY-1 — Silent auth drop on deploy.** Security middleware living only in an image is dropped by the
  next source-tree deploy; durable gates must live in the source tree. (F199/F244/F254)

**Deliverables:** this file; `patches/transition/w1-event-lane-auth-hardened.md`;
`patches/transition/w1-echo-loop-kill-plan.md`.
**COMMITS CREATED: NONE.**

## F260 — [FORENSIC] Byte-exact manifest: prod-image-only CapabilityAuthority + route-auth artifacts

Image `ping-gateway:devin-boundary2` (sha256 `5f018a301b3bce675f04641887005e838f957c9f6e57a1e8e91de5968f222d20`,
created 2026-09-16T12:54:22Z; container `ping-gateway` up 42h at probe time) bundles these
files, extracted read-only via `docker exec ping-gateway sha256sum/wc`:

| File in image | Size (bytes) | Lines | sha256 |
|---|---|---|---|
| `gateway/capability_authority.js` | 29886 | 889 | `ff0eaeb836ec221923a98c75f40eb4c60a0644e73b559f48f1ae87bff540bfd9` |
| `gateway/exterior_auth_middleware.js` | 7402 | 251 | `26e6761de0e21ef82f71c28119d586cbe07139c725b2ccb35997d9e7629be34e` |
| `gateway/workspace_registry.js` | 7414 | 226 | `18ce3a0d23b826164ebfc8afcea2dd8073b5ef3396d32bce3b07d7b27b97f458` |
| `gateway/routes/capabilities.js` | 15706 | 482 | `6501b51dd8dbcfef66d206f2c9bd20743b060a5e68e7a7782e08e5c9fc0d8b41` |

File mtimes inside the image: exterior_auth_middleware Sep 12 02:34-03:09; capabilities.js
Sep 12 13:58; workspace_registry Sep 12 14:27; capability_authority Sep 12 18:52. All four
confirmed ABSENT from /home/nolan/ping @ cc6856c3b (branch refactor/runtime-authority-convergence):
`ls` returns "No such file or directory" for each. Full `/app/gateway` vs source-tree diff found
TWO more image-only files beyond F199 (see F261).

## F261 — [FORENSIC] Two more image-only artifacts not named in F199: a history layer

Full `comm` diff of `/app/gateway` (image, 446 entries) vs `/home/nolan/ping/gateway`
(source, 447 entries) shows image-only:

| File | Size | sha256 |
|---|---|---|
| `gateway/capability_authority.js.before-phase2` | 28530 | `a428949d18038f1510653d755cbb08e221dd9bdeac8a233f0ca601f1a2e5928a` |
| `gateway/test_mvp_auth.js` | 4322 | `8d5b1eb5e898646d28035ce324029c079fb593f3e11ead88cb1b50f842a913d5` |

The `.before-phase2` file is a pre-refactor copy of the authority (28,530 bytes vs 29,886 live)
— a history layer baked into the image. `test_mvp_auth.js` is an auth test harness. Both are
CLASSIFY-don't-delete material per invariant #6; neither is required for the deploy guard.
Inverse diff: source-tree-only in `gateway/routes/` is `routes/identities.js` (see F262).

## F262 — [FORENSIC] Composition-root drift quantified: 892-line source vs 1012-line image, 342 diff lines

`docker cp ping-gateway:/app/gateway/bootstrap/gateway_runtime.js` vs
`/home/nolan/ping/gateway/bootstrap/gateway_runtime.js`: 892 vs 1012 lines, 342 unified-diff lines.
Substantive image-only additions (BOM/comment mojibake excluded):

- requires: `ExteriorAuthMiddleware` (img line 51), `WorkspaceRegistry` (52), `CapabilityAuthority` + `createCapabilityRoutes` (106-107)
- service locals: capabilityAuthority, exteriorAuthMiddleware, workspaceRegistry (137-138) plus prerequisite locals filesystemAuthority/commitAuthority/patchAuthority/repositoryAuthority/simpleGitAdapter (139-144)
- instantiation block (416-432): `new CapabilityAuthority(this._pool, runtimeRegistry, '/app/workspace')` + `initialize()`; `new ExteriorAuthMiddleware(this._pool)` + `initialize()`; `_initializeTenantRegistry()` (CREATE TABLE IF NOT EXISTS tenants + idempotent seed of `hpp`/`happy-place-platform`); `new WorkspaceRegistry(this._pool, '/app/workspace')` + `setWorkspaceRegistry` wiring; then FilesystemAuthority, CommitAuthority, PatchAuthority, RepositoryAuthority, SimpleGitAdapter instantiated as capability-routing prerequisites
- services map: all added (746-749)
- route mounts wrapped in `services.exteriorAuthMiddleware.middleware()`: `/events` (790), `/canonical-events` (794), `/ingest` (798), `/orchestration` (900), `/missions` (915), `/ai` (918), `/connectors` (920); `/capabilities` mounted 926-929 gated on `services.capabilityAuthority`
- CORS: wildcard `*` removed for server-to-server (img 120-121: `req.headers.origin || '*'`, `Authorization` added to allow-headers)
- REMOVED in image: `require('../routes/identities')` and the `/identities` mount (source line 20, 682-683) — the image drops the identity route the source tree serves

Three-way drift (re-verified tonight): source tree @ cc6856c3b has NONE of the four files; rc image `ping-gateway:rc-4d522a6b` carries an OLDER exterior_auth_middleware (sha256 `3d5b736d832b322709c57871fbb581b9c280902ad22481ebcd66abfe89f978b1`, required at rc gateway_runtime.js:4, instantiated line 32, used via a `requireAuth` wrapper for `/events`, `/canonical-events`, `/ingest` plus `/context`, `/api/v1/repository`, `/system`, `/tenants`, `/deployments`, `/runtime`) but LACKS capability_authority.js, workspace_registry.js, routes/capabilities.js. So the drift is three generations: source(none) / rc(old middleware, partial) / prod(new middleware + full authority).

## F263 — [BLAST RADIUS] Auth loss table: a source-tree deploy reopens 7 routes tonight

Verified live tonight: `curl http://127.0.0.1:8080/events` → `HTTP_CODE=401` (no credential).
The image's middleware (`exterior_auth_middleware.js:222-240`) denies missing/invalid API keys
401 fail-closed; unknown agents DENIED; identity comes from `exterior_agent_credentials`
(Postgres, created+indexed at gateway init), never from the request body.

A deploy built from the source tree (which mounts these bare) loses all of this:

| Route | Prod tonight | After source-tree deploy |
|---|---|---|
| `/events` | 401 fail-closed middleware | unauthenticated (F200/F52: unsigned append straight to `ping_events`) |
| `/canonical-events` | 401 fail-closed middleware | unauthenticated |
| `/ingest` | 401 fail-closed middleware | unauthenticated |
| `/orchestration` | 401 fail-closed middleware | unauthenticated |
| `/missions` | 401 fail-closed middleware | unauthenticated (W20-F2 echo loop ignitable by single unauth POST) |
| `/ai` | 401 fail-closed middleware | unauthenticated |
| `/connectors` | 401 fail-closed middleware | unauthenticated |
| `/capabilities` | mounted, auth-wrapped POST / + GET /discover; open GET /stats + /health | route does not exist (module absent) |
| `/identities` | not mounted | mounted (source-only file reappears) |

Note: the `tenants` table CREATE + `hpp` seed and the `exterior_agent_credentials` table CREATE live in
the image's startup code; rows in Postgres persist across deploys, but with no middleware code they
become an unused table with live API keys in it.

## F264 — [BLAST RADIUS] Execution-authority loss: the only authorize-first executor disappears

What drops with `capability_authority.js` + `routes/capabilities.js`:

- The `/capabilities` executor surface: POST `/capabilities` (auth-wrapped), GET `/capabilities/discover` (auth-wrapped), GET `/capabilities/stats`, GET `/capabilities/health` (both open)
- `authorize()` fail-closed: unknown agentId DENIED; allow-list agent profiles `muse` (level 1) and `muse-level-2`; workspace-registry binding (repoId + workspace_path from registry, never user-supplied); canonical-repo write denial (img capability_authority.js:230-300)
- Execution: `execute()` authorizes FIRST then routes by capability prefix to pre-existing authorities only (header non-duplication constraint, lines 10-14; 438-488); command/test/build execution throws; per-request receipts written to Postgres `capability_requests` (784-817); request IDs content-hash-derived via CanonicalAuthority (820-828)
- Filesystem sandboxing: realpath containment into the agent workspace root; denied secret paths (58-136, 526-615)
- The prerequisite-authority instantiations in the composition root (Filesystem/Commit/Patch/Repository/SimpleGit) — with F201/F86 marking ExecutionAuthority/ApprovalAuthority/PatchAuthority dormant-but-dangerous, losing the one authority that ROUTES to them also loses the only live supervised execution path

## F265 — [CORRECTION] F64's "exterior_agent_credentials has no code path (stale)" is REFUTED

F64 recorded `exterior_agent_credentials` (2 rows) as having "no code path (stale)". The code path
exists — it is the prod image's `exterior_auth_middleware.js`, read in full tonight:
`_createTables()` creates and indexes the table at gateway init; `authenticate()` looks up every
request's API key against it (is_active + expires_at checked), updates `last_used_at`; defaults
seed `muse` / `muse-level-2` from `MUSE_LEVEL_1_KEY`/`MUSE_LEVEL_2_KEY` env or random generation.
F64's "zero source references" was itself a symptom of the F199 drift (source-tree-only grep).
Re-anchor: the table is the LIVE exterior credential store; treat it as secret-bearing.
Do not delete; its custody moves with the canonical-home ruling.

## F266 — [GOVERNANCE] Name collision: TWO "CapabilityAuthority" modules for one decision

The source tree contains a DORMANT `runtime/kernel/capabilities/capability-authority.ts`
(F101: no live composition-root import; registry.yaml marks it missing). The prod image
contains the LIVE `gateway/capability_authority.js` (different module, different language
surface, different behavior). Two different modules answer to the same authority name for
the same decision ("who may execute capabilities"). Standing invariant #8: "One authority per
decision; many adapters/executors/projections. Never create EventAuthorityV2 or a second
canonical anything." The live image module is the only candidate that is actually an
authority; the dormant kernel module must be classified/archived (per invariant #6, not
deleted) once the ruling lands — never silently left as a same-named second authority.

## F267 — [MECHANISM] The drop vector is the build itself: `COPY . .` from the source tree

`gateway/Dockerfile`: `FROM node:24-alpine`, `WORKDIR /app`, `COPY . .`. The image IS the
source tree at build time. Prod image built 2026-09-16T12:54:22Z from files dated Sep 12
(none of them ever committed — see F268). The rc line (built ~3d ago) already proves the
mechanism: it lacks 3 of the 4 files (F262). Any `docker build` + redeploy from the current
source tree reproduces the drop mechanically, with no error, no warning, and no test failing
(F14: the suite cannot catch this — it references nonexistent scripts). No automatic deploy
trigger was observed in this probe's scope; the vector is a manual/ad-hoc redeploy from source.

## F268 — [GOVERNANCE] The four live files were NEVER in repo git history: provenance gap

`git log --oneline -- gateway/exterior_auth_middleware.js` and `-- gateway/capability_authority.js`
both return EMPTY in /home/nolan/ping. These files never existed in any commit of this repo's
history. They arrived in production via an image built 2026-09-16 (image tag `devin-boundary2`
suggests a Devin session workspace) and were never committed back. The mechanism is real and
load-bearing (F264: 401 live on :8080/events tonight), but its provenance is an opaque image
layer. Any canonical-home ingest must treat the image bytes as UNVERIFIED upstream input:
review-then-ingest, not blind vendoring.

## F269 — [MECHANISM] Deploy-freeze guard PROPOSED (propose-only); CP-7 stays escalation-class

Freeze mechanism designed as an unapplied proposal at
`patches/governance/w2-deploy-freeze-guard-proposal.md` (WHY → EVIDENCE → MINIMUM CHANGE →
TEST → RESULT): a standalone `deploy-guard.sh` + canonical manifest asserting (1) all four
live files exist in the source tree, (2) the composition root wires them (requires +
instantiation + middleware mounts), (3) a candidate build's image bytes match the source
bytes, failing the deploy closed otherwise. No freeze is installed tonight; the proposal is
unapplied. CP-7 remains ESCALATION-CLASS per invariant #10 (canonical corruption, P0).

---

## Recommendation: canonical home for CapabilityAuthority (for Nolan's ruling)

Grounding law: invariant #8 (one authority per decision), "refactor authority, preserve
mechanism" (keep the authorize-first routing, the fail-closed middleware, the receipts —
the mechanism works), invariant #6 (classify history, never delete), invariant #3
(WHY → EVIDENCE → MINIMUM CHANGE → TEST → RESULT on every step).

**RECOMMENDED: the source tree is the canonical home (option A).**

1. FREEZE source-tree prod deploys now (the proposed guard, F269).
2. Quarantine-review the six image files (F260+F261) in a staging area: read, attribute,
   strip nothing, record provenance as "unverified image bytes, 2026-09-16".
3. Rule the name collision (F266): the live `gateway/capability_authority.js` becomes THE
   CapabilityAuthority; the dormant kernel TS module is classified/archived, not deleted.
4. Ingest the reviewed files into the source tree; reconcile the composition-root diff
   (F262) as a reviewed patch; rebuild the image FROM the source tree; re-verify the
   401 live before any traffic moves.
5. The deploy guard becomes a standing pre-deploy gate.

Why not the alternatives:
- **Option B (image stays canonical, bytes vendored into source):** fastest, but keeps two
  truths and the provenance gap; every future drift re-creates CP-7.
- **Option C (retire the boundary; drop auth + /capabilities):** smallest code change, but
  reopens 7 live routes to unauthenticated mutation (F263) — including the `/missions`
  echo-loop vector (W20-F2). Only viable if those routes are closed by other means first.
- **Option D (indefinite freeze, no ruling):** safest tonight, but blocks every downstream
  convergence deploy (W20-F3) and leaves auth living in an opaque image.

**CP-7 question for the grilling brief** (single canonical surface: ~/workspace/GRILLING-BRIEF.md):

> **QUESTION:** Where does CapabilityAuthority live, and under what condition may source-tree
> prod deploys resume?
>
> **WHY IT MATTERS:** prod :8080 is auth-wrapped tonight (401 verified live on `/events`).
> Any source-tree rebuild silently reopens `/events`, `/canonical-events`, `/ingest`,
> `/orchestration`, `/missions`, `/ai`, `/connectors` to unauthenticated mutation and
> deletes the `/capabilities` executor endpoint. This is canonical corruption by deploy,
> and the mechanism (`COPY . .`) makes it silent.
>
> **WHAT EVIDENCE SAYS:** the live 889-line authority + 251-line middleware + 226-line
> workspace registry + 482-line capability routes exist only in image `devin-boundary2`
> (built 2026-09-16, never committed — git log empty); the mechanism is real (fail-closed
> authorize, realpath containment, per-request receipts in `capability_requests`); the rc
> line already proves the build drops 3 of 4 files.
>
> **CONTRADICTION / TRADEOFF:** one authority per decision (#8) vs two same-named modules
> (F266); preserve the working mechanism vs rebuild from scratch with clean provenance
> (expensive, high regression risk); freeze safety vs blocked deploys.
>
> **OPTIONS:** (A) source tree becomes canonical home — ingest reviewed image bytes,
> reconcile the kernel name collision, rebuild from source [recommended]; (B) image stays
> canonical, vendored bytes (fast, keeps two truths); (C) retire the exterior-agent
> boundary (accepts open routes); (D) indefinite freeze (safe, blocks everything).
>
> **DEFAULT IF NOLAN DOES NOTHING:** freeze holds; CP-7 stays open; any ad-hoc
> source-tree deploy drops live auth; all convergence deploys blocked.
>
> **RECOMMENDED NEXT EXPERIMENT:** run the proposed deploy-guard in report-only mode
> against prod image + source tree (no live change) to baseline the drift, and
> quarantine-review the six image files — so the ruling lands on reviewed bytes, not
> opaque ones.

---

Probe notes: all image reads via `docker exec ping-gateway` / `docker cp` (read-only);
`docker inspect ping-gateway:devin-boundary2`; `curl -s -o /dev/null -w %{http_code}`
against 127.0.0.1:8080. No container writes, no process touches, no secrets extracted.
Scratch copies of image files landed in /tmp only (disposable). COMMITS CREATED: NONE.

## F270 — claim-verify path map: route, handler, missing-gate seam [SECURITY] [P0]

Route: `POST /api/fyd/claims/[resourceId]/verify`.
Served handler: served `src/app/api/fyd/claims/[resourceId]/verify/route.ts:32-105`.

Call chain in the served checkout (per fleet/security/sec4-unauth-endpoints.md):

1. `POST` enters with body `{ method, basis, operatorLabel }`. **No gate of any kind** before parsing or I/O: no session check, no identity check, no CSRF, no env flag, no Host check, no capability check (sec4 rows 78-79).
2. Served `route.ts:77`: `readClaim(resourceId)` (served claim store `src/fyd/claim/store.ts:55`) — the claim must exist in CLAIMED state.
3. Served `route.ts:85-94`: `attestOperatorControl({ resourceId, operatorLabel, basis })` (`src/fyd/claim/verification-seam.ts:66-94`) — mints a `VerificationProof`.
4. Served `route.ts:95-96`: `verifyControl(current, proof)` (`src/fyd/claim/machine.ts:113-140`) → `writeClaim(next)` (`src/fyd/claim/store.ts:68`) persists the transition CLAIMED → VERIFIED-CONTROLLED.

Where the gate should sit: the audited-head copy already shows the intended seam. In the mirror (`repo-mirror/src/app/api/fyd/claims/[resourceId]/verify/route.ts`), a `demoDenied(req)` function runs as the FIRST statement of `POST`, before `ctx.params`, body parsing, or any I/O, and returns a typed 403 `{ ok:false, code:"demo_owner_mode_required" }`. The served checkout's `route.ts:32-105` has no such function — the first executable statement is body parsing, and the write path at 95-96 is unconditional on identity. The missing gate is the missing pre-parse call.

Status: PROVEN by sec4 static evidence; corroborates F162. (Served :3100 is Pig-side and unreachable from this sandbox; confirmed via the mirror diff, not a live POST.)

## F271 — what "self-asserted operator-attestation" means, concretely [SECURITY] [P0]

The minted proof is a statement the caller writes about themselves:

- `attestOperatorControl` (`src/fyd/claim/verification-seam.ts:66-94`) takes `operatorLabel` from the request body. In the served route it defaults to `body.operatorLabel.trim() || current.claimedBy?.actorLabel || "operator"` — i.e. **an arbitrary caller-supplied string**, never verified against a session, a signature, or a credential.
- The only checks are: `basis` is a string of at least 10 characters, and `operatorLabel` is non-empty. There is no check that the caller is the claimant, the operator of the resource, or any authenticated party at all.
- `verifyControl` (`src/fyd/claim/machine.ts:113-140`) then stamps state `verified-controlled`, embedding the proof's own `proofNote` ("a human operator asserts control. This is a statement, not a cryptographic proof of domain control"). Honest labeling at the data layer does NOT stop the route from presenting the claim as VERIFIED-CONTROLLED downstream, because `writeClaim` persists it with no gate before it.
- Exactly one of the six declared verification methods is implemented (`operator-attestation`, `verification-seam.ts:29-35`); the other five return 501. So the ONLY path to verified status is the self-asserted one.

Exploit chain (static): any existing CLAIMED claim + `POST { method:"operator-attestation", basis:"<10+ chars>", operatorLabel:"<anything>" }` → server mints a proof and persists VERIFIED-CONTROLLED. No human operator is involved. This is F162's "self-asserted operator-attestation persists."

Status: PROVEN by code read.

## F272 — gate-design proposal for claim-verify [SECURITY] [P0]

**Principal requirement.** The route writes claim state, so it requires a verified principal BEFORE any parsing or I/O: a real owner/operator identity (session + PING identity, with a CONTROL RELATIONSHIP to the resource's tenant). Until that lane exists, the minimum viable gate is the audited-head shape already proven: fail closed unless demo mode is explicitly opted in AND the request arrived on a localhost/private-network host. The gate must never be weaker in the served checkout than at audited head.

**Typed operations.** Split the single POST into typed, separately gated operations:
- `attest` (intent): records a proof statement — requires principal; weak-proof rejection (400) stays.
- `verify` (decision): moves CLAIMED → VERIFIED-CONTROLLED — requires principal AND an implemented verification method AND the transition guard. `operator-attestation` should never be accepted on `verify` without a principal; as a typed operation it is at most an `attest` input.

**Failure-closed semantics.** No principal → typed 403 before `readClaim`. Unknown method → 400 with the method list. Unimplemented method → 501 (already present). Transition violation → 409 (already present). Missing/weak basis → 400 (already present). All existing typed refusals are retained; the new failure mode is exactly one: 403 `principal_required`/`demo_owner_mode_required`.

**What breaks if applied.** In the served build: all unauthenticated uses of operator-attestation stop working — that is the intended breakage (F162). Legitimate demo flows continue ONLY where `NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1` is set AND the Host is localhost/private (mirror behavior). Public/self-hosted served deployments lose claim verification entirely until real owner auth ships; that is the correct failure-closed outcome for a P0. The Manage surface's demo UI must keep its DEV/DEMO banner unmissable (structural disclosure already exists in owner-context.ts:150-152).

Full patch sketch: `patches/served/w3-claim-verify-gate-proposal.md`.

Status: PROPOSED, not applied.

## F273 — object-overrides approve path + DemoOwnerContext construction map [SECURITY] [P0]

Route: `POST /api/fyd/objects/[objectId]/overrides`, stage "approve".
Served handler: served `src/app/api/fyd/objects/[objectId]/overrides/route.ts:123+` (audited-head mirror carries the gate at 116-120; served lacks it — sec4 rows 95-98).

Served approve chain:

1. No demo env/Host gate before propose/approve in the served checkout.
2. `createOwnerContext(objectId)` (`src/app/api/fyd/objects/[objectId]/overrides/owner-context.ts:99-104`) — the single owner-context seam. Today its body is `return DemoOwnerContext.forTenant(tenantId)`.
3. `DemoOwnerContext.forTenant` (`owner-context.ts:130-136`): verifies the tenant id FIRST (`requireTenantContext`, fail closed — this part is sound), then `resolveOwnerCorrectionChain(verified)` (`src/fyd/owner-mode/demo-chain.ts:56-80`), then `demoActorContext(chain.actor.id, chain.actor.label)` (`overrides/patch-loop.ts:80`).
4. The actor is `DEMO_OWNER_ACTOR = { id: "demo-owner", label: "Demo Owner (seeded, unverified)" }` (`src/fyd/owner-mode/capability.ts:59-62`) — a hardcoded constant, constructed in `resolveDemoRelationship` (`capability.ts:70-82`) which treats the seeded actor as controller of every demo site: "This mapping is the demo. It verifies nothing."
5. Approval calls `ctx.evaluateCapability(objectId, "owner.correct-fact")` (`owner-context.ts:138-153`) → verdict from the seeded demo chain → on allow, `applyOwnerCommand(...)` mutates the owner store and `buildBoundApproval({... actor ...})` binds the approval record to the SEEDED actor (served route, approve stage).

So "seeded DemoOwnerContext stands in for a principal" means: a constant actor id minted server-side, with a controller relationship assigned by a hardcoded mapping, no session, no credential, no tenant-scoped ownership registry anywhere in the chain (the session cookie is read only for audit notes — `demo-chain.ts:58-67`, "the verdict below never derives from it").

Status: PROVEN by code read; corroborates F163. (Residual: served approve path's exact persisted-write line was flagged ADAPTER-4 and remains uncaptured; the approve stage's `applyOwnerCommand` + `buildBoundApproval` are the mirror-captured writes.)

## F274 — every consumer that trusts the seeded stand-in [SECURITY] [P0]

1. `app/api/fyd/objects/[objectId]/overrides/route.ts` — calls `createOwnerContext(objectId)`; uses `ctx.evaluateCapability` on BOTH propose and approve; on approve, binds `actor` into the persisted approval and `applyOwnerCommand` mutation. The stand-in principal authorizes writes.
2. `app/api/fyd/objects/[objectId]/overrides/owner-context.ts` — defines the seam AND the only implementation (`DemoOwnerContext.forTenant`, `DemoOwnerContext.label()`); the factory body is the construction point where a real principal must attach (the file's own docstring names this).
3. `app/api/fyd/objects/[objectId]/overrides/patch-loop.ts:80` — `demoActorContext(actorId, label)` constructs the `OwnerActorContext` (demo marker + disclosure) the route stamps on every response and binds into approvals.
4. `app/api/fyd/customize/route.ts:72-74` — a SECOND independent consumer: `evaluateCapability(DEMO_OWNER_ACTOR, resolveDemoRelationship("", DEMO_OWNER_ACTOR), "owner.customize-approve")` gates customize approvals on the same seeded actor, outside the OwnerContext seam. This consumer does not even go through the seam's labeling contract.

The seam design (`owner-context.ts` header) contains the migration path: replacing `createOwnerContext`'s body with a PING identity/capability implementation changes one factory. But `customize/route.ts` bypasses that seam, so it needs its own port or a shared "require real owner context" helper.

Status: PROVEN by grep + code read.

## F275 — proposal: replace the stand-in with a real principal requirement (or explicit demo disablement in served builds) [SECURITY] [P0]

**Preferred: real principal requirement.** Change `createOwnerContext`'s factory body to construct a principal-backed context: session (practice identity cookie) → PING identity verification → CONTROL RELATIONSHIP resolved from a tenant ownership registry (not a seeded mapping) → capability evaluation of `owner.correct-fact`. `DemoOwnerContext.forTenant` stays in the tree but becomes constructible ONLY when the demo gate (env flag + private host) passes; any other construction attempt fails closed. Responses keep the seam's disclosure contract; the disclosure then reads "verified owner" instead of "seeded demo actor".

**Fallback (explicit demo labeling + disablement in served builds).** Until real owner auth exists: in served (non-demo) builds the approve stage is disabled by build config — the route returns typed 403 `owner_auth_unimplemented` for stage approve, while propose stays as a read-only preview. Demo builds keep the current DemoOwnerContext behind the demo gate, with the DEMO OWNER CONTEXT labeling retained on every response (already present). This matches FYD's own rule from the builder decisions (2026-09-22): owner correction loop runs only for authorized owners; demo mode is visibly labeled.

**What breaks if applied.** All current "approve" flows in served deployments stop working for unauthenticated callers — intended breakage. Demo UI keeps working only under the demo gate. `customize/route.ts` must be ported off the direct `DEMO_OWNER_ACTOR` call to the seam (its approvals would otherwise keep minting under the stand-in). The seeded-actor approval records already persisted are historical: they carry `demoScaffolding: true` in the audit chain (`demo-chain.ts`), so a migration script can identify them — no silent re-labeling.

Full patch sketch: `patches/served/w3-claim-verify-gate-proposal.md` (part 2).

Status: PROPOSED, not applied.

## F276 — canonical-events route bypasses the ingest authority [EVENT/GOVERNANCE] [P1]

`POST /canonical-events` (`gateway/routes/canonical_events.js:29`, mounted `bootstrap:687`) calls `executeEmitEvent` (`gateway/canonical_event_envelope.js:206-250`) which:

- mints its own receipt identity: `generateEventId` = UUID v5 over `(tenantId, eventType, timestamp, sequence)` (canonical_event_envelope.js:130-147) — ingress-era row identity, NOT the content-addressed constitutional identity;
- assigns per-tenant `MAX+1` sequence (receipt ordering, not canonical order) and a receipt timestamp;
- inserts into the `canonical_events` table directly.

No `authorizeNamespace`, no `canonicalizeAndEmit`, no namespace auth. The code itself declares this a "RECEIPT surface, not an acceptance authority" (`canonical_event_envelope.js:222-236`): constitutional identity/order/namespace are minted only IF the row later converges through `UnifiedEventRuntime.emit()` via the EventBridge 5s poll. So at the HTTP boundary, `POST /canonical-events` lets callers insert rows into a journal with a tenant CLAIM (`tenant_id` "unverified here") that only later gets namespace resolution at convergence.

**What it costs:** two identity schemes (receipt UUID vs content hash) for the same event; rows readable from `canonical_events` before namespace authorization has been decided; the EventBridge convergence becomes a second, async gate — a bypass in time. The AGENT01 writers table (C-1..C-6) confirms live in-process callers: all four business authorities, the route, and the business-profile adapter.

**Seam points for routing through the single ingest authority** (`patches/served/w3-ingest-authority-routing-proposal.md`): `canonical_event_envelope.js:206` (executeEmitEvent entry) becomes a pre-canonicalization producer stage: business authorities pass their command into `CanonicalizationService.authorizeNamespace` + `canonicalizeAndEmit` with a business-event namespace rule; the `canonical_events` receipt INSERT is retained as a durable receipt log (it is a journal, not an authority) but rows carry the canonical `event_id`/namespace returned by the authority, instead of minted receipt identities that get rebound later.

Status: PROVEN mechanism (forensics copy 2026-09-19 + AGENT01 writers table); live re-verification of `routes/canonical_events.js:29` NOT done tonight (core route files not extractable from this sandbox — no Pig/core access in this subagent scope).

## F277 — identities route bypasses the ingest authority [EVENT/GOVERNANCE] [P1]

`POST /identities` (`gateway/routes/identities.js:178`, `OBJECT_CREATED`, mounted `bootstrap:683`) emits directly via `eventRuntime.emit` — AGENT01-EVENT.md W-4. The route claims "the ONE IdentityAuthority" but its event enters the journal WITHOUT `authorizeNamespace` or `canonicalizeAndEmit`. The direct-emit branch pattern is the same shape Agent 01 already proposed to retire for `/events` (deployed-events.js:110-128).

**What it costs:** identity-creation events — the most authority-sensitive events in the system — are the least gated: they skip the boundary that decides namespace auth + canonical envelope construction. Any downstream consumer that assumes "journaled = canonicalized" gets a false guarantee for identity events.

**Seam points** (`patches/served/w3-ingest-authority-routing-proposal.md`): `gateway/routes/identities.js:178` is the single seam — replace the direct `eventRuntime.emit` call with `canonicalizationService.canonicalizeAndEmit`, with the identity domain's namespace rule folded into `authorizeNamespace`/`resolveNamespace` as configuration.

Status: PROVEN via AGENT01-EVENT.md §2.1 W-4; route-source re-read not done tonight (same sandbox limitation as F276).

## F278 — ingest-authority routing: what Agent 01 already covers vs this wave's remainder [GOVERNANCE]

Agent 01's proposal `patches/agent01-event-authority/CP-1-single-ingest-authority.md` (2026-09-24) covers `POST /events`: replace both direct-emit branches in `gateway/routes/events.js` with `canonicalizeAndEmit`, fold BFF normalization + tenant-registry validation into the authority as configuration, keep `UnifiedEventRuntime.emit` as the durable-append primitive. This wave does NOT duplicate that proposal; it is referenced and extended.

This wave's remainder (runner-up scope): `POST /canonical-events` (F276) and `POST /identities` (F277). Both bypass the boundary; both have exact single seams; both proposals keep the existing stores/tables and only move the DECISION (namespace auth + canonical envelope) into `CanonicalizationService`, preserving `UnifiedEventRuntime.emit` as the sole append primitive per the write-gate (no EventAuthorityV2).

Behavioral equivalence argument (full): `patches/served/w3-ingest-authority-routing-proposal.md`. Short form: receipt identity (UUID v5 over tenant/type/time/seq) is strictly weaker than content identity; the convergence path already re-mints canonical identity at bridge time, so routing producers through the authority at ingress removes a temporal bypass without changing the stored canonical outcome — producers get the canonical event_id synchronously instead of asynchronously.

Status: PROPOSED, not applied. Dedupe note: F144/CP-1 remains the umbrella decision; F276/F277 are its runner-up children; Agent 01 owns /events.

## F279 — generic-class entries [GOVERNANCE]

1. **CLASS: served build ships without audited-head demo gate.** Both P0 findings (F270/F271 claim-verify, F273-F275 overrides) are one pattern: the audited head carries a fail-closed demo-owner-mode gate (`demoDenied` / `isDemoOwnerModeEnabled` + `isPrivateHost`) and the served checkout `e48ef710` dropped it while keeping the write paths. Detection invariant for future passes: every route whose handler calls a persist function (`writeClaim`, `applyOwnerCommand`, `buildBoundApproval`) must have a gate function called as the first statement of its handler in the SERVED tree, not just at head. Check: `grep -L "demoDenied\|principal"` over served route files that import write-path functions.
2. **CLASS: secondary journals as temporal bypass of the ingest authority.** F276/F277/F144: a journal that accepts writes now and defers namespace authorization to convergence time (EventBridge) is a boundary bypass in time. Rule: authorization decisions must happen at ingress, synchronously, in `CanonicalizationService`; secondary tables (`canonical_events`, `repository_events`) are journals, and journals must store the authority's verdict, not mint their own identities first.
3. **CLASS: seeded demo principals trusted by multiple consumers.** F274: `DEMO_OWNER_ACTOR` is consumed by the overrides seam AND independently by `customize/route.ts`. Rule: a demo stand-in principal must be constructible through exactly one seam, and that seam must fail closed unless the demo gate passes; direct imports of the seeded actor outside the seam are findings.

---

### Numbers used
- Findings F270–F279 (new); consumed F162, F163, F144/CP-1, F246.
- Six declared verification methods, one implemented (`operator-attestation`).
- Basis minimum length 10 characters (both `attestOperatorControl` and `verifyControl`).
- Six `canonical_events` writers (C-1..C-6), four ping_events writers (W-1..W-4).
- Two claim-verdict typed codes unchanged; new 403 `principal_required`/`demo_owner_mode_required` / `owner_auth_unimplemented`.

### File paths
- New: `fleet/served/w3-claim-verify-gates.md` (this file); `patches/served/w3-claim-verify-gate-proposal.md`; `patches/served/w3-ingest-authority-routing-proposal.md`.
- Reference: `repo-mirror/src/app/api/fyd/claims/[resourceId]/verify/route.ts`; `repo-mirror/src/app/api/fyd/objects/[objectId]/overrides/{route.ts,owner-context.ts,patch-loop.ts}`; `repo-mirror/src/fyd/{claim/{machine.ts,store.ts,verification-seam.ts},owner-mode/{gate.ts,capability.ts,demo-chain.ts}}`; `repo-mirror/src/app/api/fyd/customize/route.ts:72-74`.
- Prior art: `fleet/security/sec4-unauth-endpoints.md` (rows 78-79, 95-98); `agent01-event-authority/AGENT01-EVENT.md` (§1, §2.1–2.4, §4); `patches/agent01-event-authority/CP-1-single-ingest-authority.md`; `agent20-convergence/GLOBAL-AUTHORITY-MAP.md` (CP-1); forensics copy `~/workspace/forensics/transfer-2026-09-19/canonical_event_envelope.js`.

### Needing Nolan
Nothing needs Nolan's decision tonight. For awareness only: (a) the claim-verify and overrides-approve gates in the served build `e48ef710` are proposals, NOT fixes — the served :3100 checkout still accepts self-attested claim verifications and seeded-actor owner approvals; (b) applying either gate breaks current public/self-hosted use of those flows by design; (c) the canonical-events/identities ingest routing belongs in the sprint worktree (`/home/nolan/projects/ping-constitutional`), never in `/home/nolan/ping`, per the write-gate; (d) served-side live proof (actual POST to :3100) was out of scope for this subagent (Pig-side, no core/container access).

## F280 — Semantic-plane remediation frames as exactly four owner packages, no second knowledge authority [SEMANTIC] [P2]
- Evidence: Agent 14 cross-agent handoffs (SEMANTIC-KNOWLEDGE.md); F245; W20-F4. Full work packages in fleet/semantic/w4-work-packages.md.
- Status: FRAMING FINDING (not a new defect claim). Identity (05) and write-surface (06) decisions must precede any mass backfill/rebuild write (04). Converge on the live JS path per F143.

## F281 — Noise-vector fallback without repair path: 187/389 (48%) PRNG-noise vectors, permanent index pollution [SEMANTIC] [P1]
- Evidence: embedding_service.js:69-83 seededVector; scroll counter {'ollama':202,'fallback':187}; hybrid_search.js rank() x0.5 down-rank but never repaired.
- Generic class: any embedding pipeline that falls back to synthetic vectors MUST carry a re-embed-on-recovery path, or fallback vectors are permanent data-quality rot.
- Status: PROVEN (read-only). Owner: Agent 04 package. Dedupe: generic-class form of F138.

## F282 — Verification starves: canonical_hash null on 94%, EvidenceAuthority.verify() fail-closes on the entire corpus [SEMANTIC] [P1]
- Evidence: evidence_authority.js:76-130 (checks.hash = typeof payload.canonical_hash === 'string'); projectToQdrant reads event.metadata.canonical_hash, which the emitter never sets. Result: verified:false, rejected++ on everything.
- Generic class: a verification leg is only as honest as the projection's payload discipline; fail-closed verification over starved data rejects EVERYTHING, which trains callers to ignore the flag.
- Status: PROVEN (code). Owner: Agent 04 package (emitter verdict owned by Agent 01/04 per Agent 14 handoff). Dedupe: generic-class form of F139.

## F283 — Node set with no edges; promotion starved: 206 nodes / 0 edges, all candidate [SEMANTIC] [P2]
- Evidence: brain-postgres counts; canonical_workers.js:674-686; KnowledgePromoter wired for SNIPPET_APPROVED/AI_RESPONSE_ACCEPTED but 0/206 promoted (approval events never fire); POST /knowledge/edges mounted, zero edges.
- Generic class: a candidate-to-knowledge lifecycle with no fed approval loop is a write-only sink; edges never created = graph assertions never exercised.
- Status: PROVEN (read-only). Owner: Agent 13 package. Dedupe: generic-class form of F140.

## F284 — Two live generations, no reconciliation: 206 fresh vs 68 stale nodes, stale writer UNKNOWN [SEMANTIC] [P1]
- Evidence: brain-postgres 206 nodes fresh (2026-09-23); ping-postgres crx_runtime 68 nodes all candidate, stale since 2026-09-16; stale generation's writer unidentified.
- Generic class: parallel persistence generations without a reconciliation rule are silent divergence; readers cannot know which generation is truth.
- Status: PROVEN (read-only). Owner: Agent 13 package. Dedupe: from F140's two-generations handoff.

## F285 — Identity normalization collision surface: toQdrantId lossy on non-hex IDs (theoretical, UNOBSERVED live) [SEMANTIC] [P2]
- Evidence: embedding_service.js:38-42 strips non-hex chars and zero-pads to 32 chars; all 389 live IDs are hex event IDs, so unobserved.
- Generic class: lossy ID normalization must be inventoried against live data before it is trusted; theoretical collisions become real at the first non-hex ID.
- Status: THEORETICAL (inventoried). Owner: Agent 05 package; CP-9 decided Authority A for new minting. Dedupe: from F143 identity rows + CP-9.

## F286 — 64-bit content-derived node IDs with key-order-dependent serialization [SEMANTIC] [P2]
- Evidence: knowledge_graph.js:87-91: node_id = sha256(type:label:JSON.stringify(data))[0:16]; 64-bit truncation (birthday collisions at scale); JSON.stringify key-order dependence (F8-class); silent merge via ON CONFLICT DO UPDATE; live label embeds event_id.slice(0,12) by CONVENTION, not law.
- Generic class: content-derived identity must be canonical-bytes-stable and collision-sized for its growth horizon.
- Status: PROVEN (code). Owner: Agent 05 package. Dedupe: from F143 identity rows + CP-9.

## F287 — Unauthenticated write surfaces bypassing the event journal: brain-qdrant REST + POST /knowledge/nodes|/edges [SECURITY] [P0]
- Evidence: brain-qdrant REST full read+write, no key (F137, PROVEN); gateway/routes/knowledge.js:64-89 mounted at gateway_runtime.js:797-800 with no auth middleware observed; injected nodes get candidate status with arbitrary source_event_id, bypassing the journal.
- Generic class: any store that accepts writes outside the canonical pipeline is a second write authority, regardless of intent.
- Status: PROVEN (read-only). Owner: Agent 06 package (caller audit: zero legitimate callers found so far; route removal is the recommended default). Dedupe: generic-class form of F137; corroborates F74.

## F288 — Rebuild claimed but no job exists; QdrantAdapter has NO delete method [SEMANTIC] [P1]
- Evidence: "Projection layer: Qdrant (rebuildable)" is a docstring claim; qdrant_adapter.js:8-76 has _fetch, ensureCollection, upsert, search, health only; superseded events accumulate forever (journal immutability x projection mutability mismatch); projected_at hardcoded null on 389/389 (PATCH-01 proposed, NOT applied).
- Generic class: rebuildability is a capability, not a docstring; it requires delete + recompute-from-source + a staleness signal.
- Status: PROVEN (code). Owner: Agent 04 package. Dedupe: generic-class form of F141.

## F289 — End-state invariant for "semantic plane healthy" (measurable acceptance gate) [SEMANTIC] [P1]
- Invariant: canonical_hash coverage = 100%; noise-vector share = 0%; retrieval verify() pass rate = 100% of returned hits; exactly one live knowledge_nodes generation; no unauthenticated vector writes; edge count > 0 OR explicit retired-by-decision record with rationale. Full gate in fleet/semantic/w4-work-packages.md.
- Evidence: synthesis of F137-F143 into an acceptance gate; W20-F4's "unverifiable noise with an unauthenticated write surface" is the current state.
- Status: NEW (no prior measurable end-state existed). Deliberately not re-opened: F142 aspirational inventory (already CLASSIFIED).

## F290 — RECOVERY AUTHORITY named: Nolan Geske (constitutional operator) owns all recovery decisions end-to-end [GOVERNANCE/RECOVERY] [P1]
- WHY: Recovery decisions are UNOWNED (Agent 12 U-1/U-2/U-3; Agent 20 map rows 19/20): no pg_dump schedule, archive_mode=off, RPO unbounded since 2026-09-16 (F204/F63); destructive recovery is possession-based (F208); vector recovery has no re-embed path (F138); durable checkpoints reference a phantom authority (F235); DLQ replay undecided (F234).
- DECISION (85%): Nolan Geske is the Recovery Authority. The machine keeps EXECUTION; the owner keeps DECISION (backup schedule, destructive-restore authorization, DLQ replay authorization, RPO/RTO targets, re-embed rebuild approval). Naming a new code authority would create a second governance surface needing its own rules. Moves under him: journal durability (pg_dump schedule, WAL archive, RPO/RTO for brain-postgres/ping_runtime), destructive-recovery authorization (ends possession-based access), vector recovery decision-wrapper (mechanism stays with the semantic lane), durable checkpoint policy (F235 phantom interface fate), DLQ replay policy (F292 escape hatch).
- PROOF-NEEDED: owner acknowledges RPO/RTO targets and backup schedule; first destructive-class operation runs through the named gate with an audit row; checkpointAuthority slot implemented under this authority or the interface deleted.
- Status: DECIDED (policy, 85%). No new machine authority invented.

## F291 — ADOPT OBS1 P-T1 (dispatch only to the assigned worker) as the echo-loop fix direction, kill-plan-first sequencing [MISSION/EXECUTION] [P0]
- WHY: Echo loop CONFIRMED UNBOUNDED via dispatch-on-original-event-type (F172); ignitable by a single unauthenticated POST /missions (F124/F172, F243); fresh timestamps defeat ON CONFLICT dedupe (F110). OBS3's proposed fix was REFUTED (its target registration no longer exists), so P-T1 supersedes it.
- DECISION (90%): in MissionScheduler._dispatch, dispatch ONLY to the assigned worker (workerName from MISSION_WORKER_MAP); event_type becomes data, not routing broadcast. Binding sequence: (1) Agent 20 rules on the [DOC-CONTRACT] touch first; (2) W1's kill plan STAGED before any live test; (3) apply P-T1; (4) OBS1's synthetic REPLAY_VERIFY + bounded-chain tests. Never run the drill without the kill plan staged.
- PROOF-NEEDED: both OBS1 tests pass post-application; bounded-chain assertion holds; kill plan exists as a staged artifact.
- Status: DECIDED (policy, 90%). Hardened diff in patches/transition/w1-echo-loop-kill-plan.md.

## F292 — DLQ declared TERMINAL-BY-DESIGN; authorized replay mints a NEW mission, never re-dispatches the failed one [RECOVERY] [P2]
- WHY: DLQ is a terminal sink by accident (F234: replayDeadLetter zero live callers, no HTTP route per F69). Re-injecting unchanged input is a retry-budget bypass (class violated by reaper lease-resets, F174); replaying today risks re-fueling the echo loop before P-T1.
- DECISION (82%): keep-terminal-with-explicit-policy. replayDeadLetter stays DORMANT but dormant-BY-DESIGN. The only exit is an AUTHORIZED REPLAY as a destructive-class operation under F290's Recovery Authority (per-instance authorization, audit row); it MUST mint a new mission id with replay:{deadLetterId, authorizedBy, reason} provenance and a FRESH retry budget. Rejected: replay-into-pipeline as default (budget-bypass + echo fuel); replay-as-audit-only (discards a legitimate option; the F208 possession reality means hand-runs happen anyway).
- PROOF-NEEDED: policy recorded in recovery/operations docs; DLQ list endpoint documents terminal semantics; zero unauthorized replays observable in the journal.
- Status: DECIDED (policy, 82%).

## F293 — PROPOSAL: pin dump.py provenance, schedule regen on the Pig, bound staleness at 24h [RECOVERY/PROVENANCE] [P1]
- WHY: The one PROVEN recovery mechanism is dirty in git since 2026-09-21, manual-only, last ran 2026-09-22 14:50 UTC (~48h stale at probe) (F236). Max-age bound is NONE and the reader verifies digest but not age, so staleness is invisible to the public page (F230/F240).
- DECISION (propose-only, 85%): COMMIT the +87/-9 diff (live outputs already came from it; reverting worsens provenance); every dump writes git sha into meta.dumperGitSha; Pig WSL cron every 6h with journal-head idempotency guard; adopt F230's maxAgeSeconds with bound 86400s (24h = 4x cadence, tolerates 3 missed runs, strictly under the observed 48h staleness). Read seam exposes stale:true as a signal, not a trigger.
- PROOF-NEEDED: diff committed; dumperVersion/dumperGitSha match a committed commit; one cron-fired regen with the guard; stale:true surfaces on an artificially aged projection.
- Status: PROPOSED, NOT APPLIED.

## F294 — PROPOSAL: register five pipeline checks on /health (keep the 8); "healthy" only when no check is DOWN [OBSERVABILITY] [P1]
- WHY: :8080/health returns "healthy" while covering NONE of MissionScheduler, WorkerRuntime, EventBridge, EventToMissionBridge, DeadLetterAuthority (F233) — false health certainty; session-scoped counters are the only pipeline visibility and die on restart.
- DECISION (propose-only, 85%): five registerHealthCheck entries reading DURABLE state: scheduler (pending/retry_pending, last-dispatch age, in-flight size), workers (per-worker heartbeat age, consecutive failures), bridge (cursor lag vs ping_events head), event-mission-bridge (mapping misses, last run age), dead-letters (unreviewed count). Thresholds (tunable): heartbeat >300s degraded; bridge lag >600s degraded; pending >100 degraded; unreviewed DLQ >0 degraded (never down, per F292); dispatch-stall >3600s with pending >0 down.
- PROOF-NEEDED: endpoint returns the five checks live; a synthetic stopped-scheduler flips the aggregate (test off-live only).
- Status: PROPOSED, NOT APPLIED.

## F295 — GENERIC CLASS G1: DORMANT-AS-PROVEN — recovery machinery with zero callers counted as coverage [RECOVERY] [P2]
- WHY: replayDeadLetter (F234), backup_postgres.ps1, projection_replay.py/replay_worker.py, MissionEventBus, vestigial queue protocol — each "documented as the recovery story" with zero live invocations.
- DECISION: classify, do not delete; every DORMANT item labeled dormant-BY-DESIGN (F292's replayDeadLetter) or dormant-UNWIRED; unwired items stop being cited as recovery coverage.
- Status: CLASSIFIED (95%).

## F296 — GENERIC CLASS G2: THEATER-HEALTH — health endpoints certifying surfaces they do not probe [OBSERVABILITY] [P1]
- WHY: /health "healthy" omits the pipeline (F233); MissionControlHeader hardcodes healthy + random metrics.
- DECISION: F294's proposal is the class-level fix template; no new health surface without naming the components it probes.
- Status: CLASSIFIED (95%).

## F297 — GENERIC CLASS G3: PHANTOM-AUTHORITY — constructor references an authority module that does not exist [GOVERNANCE] [P2]
- WHY: MissionExecutionAuthority accepts checkpointAuthority (mission_execution_authority.js:36-43); no checkpoint_authority.js exists anywhere (F235).
- DECISION: F290's Recovery Authority owns the resolution: implement the interface under this authority's policy, or delete the constructor parameter and the checkpoint_id column reference.
- Status: CLASSIFIED (95%).

## F298 — GENERIC CLASS G4: UNOWNED-AUTHORIZATION — destructive paths gated by possession instead of decision [SECURITY/GOVERNANCE] [P1]
- WHY: F208: Pig SSH/docker = root of recovery, no gate, no role, no audit; destructive_recovery_certification.py deletes ALL Qdrant collections with no prompt, never run — one careless run from catastrophe.
- DECISION: F290's Recovery Authority is the decision point; until the gate is built, D-2-class scripts get an explicit confirmation prompt as minimum mitigation (propose-only).
- Status: CLASSIFIED (90%).

## F299 — GENERIC CLASS G5: VOLATILE-OPERATIONS — session-scoped operational state on a system claiming durable lifecycle answerability [OBSERVABILITY] [P2]
- WHY: scheduler/worker/bridge counters, in-flight set, per-worker stats, bridge error counters — all wiped on restart (S-1..S-5); lifecycle questions spanning a restart answerable only from tables.
- DECISION: F294 reads durable state to avoid certifying volatile counters; longer-term, volatile homes get documented-volatile labels. Class rule: any operational surface that resets on restart must be labeled session-scoped at the read site.
- Status: CLASSIFIED (90%).
