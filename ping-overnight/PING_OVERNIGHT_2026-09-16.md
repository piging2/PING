# PING Overnight Convergence Sprint 2026-09-16/17

Date: 2026-09-16/17 | Sprint window: ~19:55 to ~05:00 MDT | All 5 tracks finished by ~20:05 MDT
Coordinator: overnight coordinator | Workers: 5 parallel tracks, all completed
Standing rules: no commits, no pushes, no history rewrite, no secret exfiltration, no volume destruction, no publishing, no new accounts or cost. All held.

---

# Executive Result

PING became demonstrably more real tonight, not more documented. The morning target was "one persistent constitutional PING on Oracle, multiple execution runtimes communicating through one authority boundary, and the website constrained so every major claim is either proven or visibly labeled." Every one of those moved:

1. Oracle triage: both broken healthchecks repaired (one broken test, one real app-level 503 from a missing env var), all three containers healthy with failing streaks reset from 7387/7361 to 0.
2. Persistence proof VERIFIED on live Oracle: authenticated event (precomputed deterministic id) -> persisted -> deterministic mission -> JS replay worker -> result/evidence captured -> container restart without volume destruction -> identical identifiers/payloads/timestamps survive -> scheduler resumes -> new work executes -> replay and witness attestation verified pre and post restart.
3. Event Authority resolved from source: UnifiedEventRuntime is the sole canonical authority; ping_events is the canonical store. Two mandate-era ghosts falsified (AcquisitionManager, ConstitutionalEventStore do not exist).
4. Multi-runtime proof VERIFIED: real JS + Python cross-runtime execution, 34/34 traceability assertions, rerun reproduced byte-identical event IDs, Python executed without ever emitting a canonical event. "One authority, many runtimes" is now demonstrated property, not copy.
5. Website rebuilt onto the harvest hierarchy with maturity labels (Live/Built/Experimental/Direction/Unproven) on every claim, real receipts wired in with captured/as-of labels, one false Codex/Hermes claim removed.
6. Competitive drafts (8 pieces, DRAFT ONLY) and cloud placement matrix (portability design, zero accounts/cost/deployments) filed.

Known defects were found and deliberately left unpatched where the read-only rule applied; they are listed as P0 remaining with owning units.

---

# What Became True Tonight

- ping-gateway healthcheck: broken test (dash `/dev/tcp` under sh) repaired. VERIFIED
- ping-qdrant healthcheck: repaired; real root cause was gateway-side, not qdrant. VERIFIED
- Real root cause of gateway 503 found and fixed: `QDRANT_URL` was never set, adapter defaulted to localhost:6333. VERIFIED
- Side benefit: embedding component went from `not_initialized` to healthy (nomic-embed-text). VERIFIED
- Authenticated event -> mission -> JS worker -> evidence -> restart -> survival -> resume chain on live Oracle. VERIFIED (identifiers below)
- Deterministic mission IDs: sha256(`missionType:event_id`)[0:16], idempotent via ON CONFLICT DO NOTHING. VERIFIED
- Replay with kernel_verified=true and witness attestation, pre and post restart. VERIFIED
- No runaway mission cascade: bridge missions (WITNESS_CREATE, LINEAGE_CREATE) settled cleanly. VERIFIED
- Qdrant `knowledge` collection and vectors survived the qdrant container restart. VERIFIED
- Event Authority resolved: one authority, one store, five doors converging on one choke. VERIFIED
- JS + Python cross-runtime execution with full identifier traceability. VERIFIED
- Byte-identical event IDs across rerun (determinism demonstrated). VERIFIED
- Cross-runtime canonicalization agreement: Python sha256 over canonical JSON independently recomputed in JS, byte-identical. VERIFIED
- Python preserved as execution-only, zero Python-emitted events. VERIFIED
- Shared execution contract defined by reuse (WorkerRuntime, UnifiedEventRuntime, MissionRuntime/Scheduler, envelope.py, Task), not invention. VERIFIED
- ExternalAgentAdapter contract and boundary defined for Codex/Hermes/OpenCode. VERIFIED
- Homepage rebuilt into 5 signature moments with maturity labels and purpose clauses. VERIFIED
- 23-claim website truth matrix built and mirrored into the repo (uncommitted). VERIFIED
- False "Codex and Hermes operate under capability grants" site card removed and relabeled as exterior agents. VERIFIED (was FALSIFIED)
- 8 competitive draft pieces, evidence-graded, DRAFT ONLY. VERIFIED (drafted, not published)
- Cloud execution placement matrix plus 10-item portability checklist, no split-brain PG by construction. VERIFIED (design)

---

# What Was Falsified Tonight

- FALSIFIED: `AcquisitionManager` exists. Zero hits anywhere in the repo, code or docs, at c5f7808b2. It does not exist.
- FALSIFIED: `ConstitutionalEventStore` exists. Same. It does not exist.
- FALSIFIED: `CapabilityAuthority` is implemented. `authorities/registry.yaml` lists it as `missing_implementation`. Drafts were written without claiming it.
- FALSIFIED: the false site claim that Codex and Hermes "operate under capability grants." Removed and relabeled; they are exterior agents.
- FALSIFIED: "Oracle needs Track B prerequisites installed." Docker 29.1.3, compose plugin 2.40.3, and git were already installed; passwordless sudo already worked.
- FALSIFIED: "the healthchecks reflect service health." Both failing streaks were broken tests/config, not broken services.
- FALSIFIED: "the ping_events `processed` flag drives anything." Write-only; all 985 baseline rows false, nothing consumes it. PARTIAL status as a mechanism.
- FALSIFIED: "append-only on ping_events is enforced." It is convention only (no triggers, no updated_at). PARTIAL.
- FALSIFIED (source defect, read-only, not patched): `emitWithDefaults` generates `evt_${Date.now()}_${random}`, which is non-deterministic and breaks the content-addressed identity guarantee on that path.
- FALSIFIED (source defect, read-only, not patched): PascalCase vs SCREAMING_SNAKE event-type registries diverge.
- PARTIAL, known gap: POST /events bypasses the CanonicalizationService namespace authorization (live bypass B2). Business emitters and /ingest go through the choke; /events does not.
- UNKNOWN: whether the 1GB snapshot tarball is a restorable disaster-recovery path (not tested; out of scope).

---

# Canonical Authority Map

(All from read-only source forensics at c5f7808b2, verified byte-identical after the mid-investigation docs commit 099927152.)

- Event: `UnifiedEventRuntime` (ping-runtime/events/unified_event_runtime.js) is the sole authority for emission, identity, hashing, persistence, dispatch, traversal. Store: Postgres `ping_events`. Identity: inline SHA-256 of {type, source, namespace?, logical_id|payload}. Dedup: ON CONFLICT DO NOTHING on the content-addressed id.
- Ingest boundary: `CanonicalizationService` + `EventGovernance` is the governed door (POST /ingest). POST /events door bypasses the service (known gap B2).
- Feeders (not authorities): `canonical_events` (legacy table, live-written by HPP authorities, bridged into ping_events); `repository_events` (dormant, bridge polls it empty); legacy `events` table (Python writers only, dormant).
- Mission: `EventToMissionBridge` -> `MissionRuntime` (ping_missions, deterministic ids, ON CONFLICT DO NOTHING) -> `MissionScheduler` (5s poll, lease renew/reap, maxConcurrent 3, DLQ on exhaustion) -> `WorkerRuntime.dispatch`. The /missions API also creates missions.
- Execution: `WorkerRuntime` is dispatch-only. 8 canonical workers live (observation, claim, classification, recommendation, projection, replay, witness, lineage) plus knowledge-promotion. `IntelligenceWorker` structurally dormant (empty eventTypes, skipped by registration loop).
- Replay: ReplayWorker -> KernelReplayExecutionProvider -> DeterministicReplayEngine (gateway/replay/kernel/, Merkle witness root via WitnessAuthority, invariants, deepFreeze). Currently replays single events; chain query commented out.
- Witness: WitnessWorker (failure-honesty gate: refuses unverified replays, emits WITNESS_REJECTED) + kernel WitnessAuthority (Merkle root inside replay). Attestations live as ping_events rows; no dedicated witness table.
- Lineage: in-band causation_id/correlation_id on every event; LineageWorker terminal step; indexed traversal (children/descendants/ancestors/correlation group) over HTTP.
- Evidence: EvidenceAuthority (accumulate/verify/rank, ADD-only reads, hash recompute via gateway/canonical_object.js).
- Knowledge: KnowledgeGraph (PG knowledge_nodes, candidate status) + KnowledgePromoter (human approval gate to 1.0).
- Capability: CapabilityResolver <- gateway/generated/capability_registry.json <- capabilities/registry.yaml (build-time source only; CapabilityAuthority missing_implementation).
- Dormant but initialized: GatewayToKernelAdapter + kernel execution pipeline (never invoked); IEventAuthority (unimplemented interface); Python worker plane; gateway witness/artifact/provenance shims.
- Nonexistent: AcquisitionManager, ConstitutionalEventStore.

---

# Event Authority Resolution

VERIFIED. All nine questions answered with file and line evidence in the full forensics report.

1. Who creates an event? Five live doors (business emitters via CanonicalizationService, POST /events direct, POST /ingest governed, CanonicalEventEnvelope legacy append, EventBridge, workers via BaseWorker._emit), all converging on UnifiedEventRuntime.emit(). One choke, five doors.
2. Who assigns event identity? UnifiedEventRuntime.emit() itself (unified_event_runtime.js:86-91). Inline, not delegated. Known defect on one path: emitWithDefaults uses non-deterministic evt_ ids.
3. Who hashes it? Inline SHA-256 on the hot path; IdentityAuthority declared but not consulted there.
4. Who sequences it? No global sequencer; ordering is by content identity plus created_at; mission scheduling uses deterministic mission IDs.
5. Who persists it? UnifiedEventRuntime.emit to ping_events (ON CONFLICT DO NOTHING).
6. Who publishes/notifies consumers? In-process subscribers plus EventBridge polling.
7. Who reads it? HTTP routes (/events/*), EventBridge, traversal endpoints.
8. Who replays it? ReplayWorker -> DeterministicReplayEngine.
9. Which stores are reachable? ping_events is canonical; canonical_events is a live legacy feeder; repository_events and legacy events tables are dormant.

Six bypass paths found, ordered by actionability: B2 (POST /events skips CanonicalizationService namespace authorization, live) is the P0 fix; B4 (in-process subscriber exceptions swallowed post-persist, no redelivery); B5 (no DB-level constraints on ping_events); B1 (pool-null emit returns ok without persisting, latent); B3 (EventBridge _skipGovernance, by design); B6 (dead GatewayToKernelAdapter branch, not a bypass).

---

# Persistent Oracle State

- VERIFIED: ping_events is the durable canonical store. 1013 rows at end of run (985 at start; all growth was inserts). event_id is the primary key; GROUP BY found 0 duplicate event_ids. Append-only by convention, not DB-enforced (PARTIAL).
- VERIFIED: namespaces present: core::system, tenant::hpp, core::owner.
- VERIFIED: ping_missions holds 198 rows with full lifecycle columns; mission_id deterministic (sha256 of `missionType:event_id`, 16 hex), idempotent via ON CONFLICT DO NOTHING.
- VERIFIED: Qdrant `knowledge` collection and vectors survived the qdrant container restart (qdrant_storage volume intact).
- PARTIAL: the `processed` boolean on ping_events is write-only; nothing consumes it (EventBridge polls the empty canonical_events table).
- UNKNOWN: the 1GB snapshot tarball restores correctly as a DR path; not tested.

---

# Oracle Services

- VERIFIED: ping-postgres (postgres:17-alpine) healthy for the full 31h, never restarted, all queries served.
- VERIFIED: ping-qdrant healthcheck repaired and green. Root cause: the test used the bashism /dev/tcp under dash sh, failing every probe while qdrant served 200s. Fix: `sh -c` to `bash -c`, one word. Streak 7387 to 0.
- VERIFIED: ping-gateway healthcheck repaired and green. Root cause: real app-level 503. Compose set QDRANT_HOST/QDRANT_PORT but the live adapter only reads QDRANT_URL, defaulting to http://localhost:6333 with nothing listening (fetch failed on /health). Fix: added `QDRANT_URL: http://qdrant:6333`. Embedding went from not_initialized to healthy (nomic-embed-text, collection knowledge). The healthcheck now logs non-200 statuses to stderr. Streak 7361 to 0.
- VERIFIED: gateway /health returns 200 overall with all components healthy after fix and after restart.
- PARTIAL: compose hygiene. The live config is the snapshot copy; the older /opt/ping/infrastructure/oracle/docker-compose.oracle.yml lacks both healthchecks and is divergent; reconciliation is open. The `scheduler` service is defined but not running; starting it is a morning-crew decision.

---

# Persistence / Restart Proof

All VERIFIED, identifier-captured (full log in the Oracle triage report):

- Authenticated input: POST /events with Bearer (muse-level-2) returned 200; source stamped api:muse-level-2; event_id matched a precomputed deterministic sha256.
- Canonical event persisted: E1 `c2a902a87642210f44880a81809580d1b77eea350d63e32f5907e53bed2176b8c5`... (ENTITY_CREATED, 2026-09-17 01:59:53.949795+00 UTC) in ping_events. Full id: c2a902a87642210f44880a81809580d1b77eea350d63e32f5907c1a8c6f7f9a2.
- Deterministic mission: M1 `7b026dfacf31c414` (REPLAY_VERIFY) matched precomputed sha256(`REPLAY_VERIFY:`+E1)[0:16].
- Routed to a JS worker: in-process MissionScheduler (5s poll) assigned M1 to the replay worker; lifecycle MISSION_CREATED 5ba37268... / ASSIGNED a6369ccd... / STARTED b4b03380... / COMPLETED cebe09ed...; result `{"worker":"replay","duration_ms":23,...}`.
- Result/evidence captured: REPLAY_COMPLETED E2 `4c73255e5ea79be7575b51dc97e89719f3e39119c126287f8196818630039694` (verified=true, reason=kernel_verified); WITNESS_CREATED E3 `d99c5ceb1bce5be57f93e4b93cb142b06aa8abbc5d25d5392d3e07d3678ea7b1` (attestation witness-4c73255e5ea79be7). Bridge also completed WITNESS_CREATE f880ce916d47ed2f and LINEAGE_CREATE 3a38311416c6f288; cascade settled, no runaway loop.
- Restart: `docker restart ping-gateway ping-qdrant` only; postgres untouched; no down -v or prune anywhere.
- Survival: post-restart, E1/E2/E3 and M1 rows exist with identical identifiers, payloads, results, original created_at timestamps.
- Resume: new work executed post-restart: E4 `400aa4f26dfda7dfe96fd7a06c624f32cfe0dace5817e53bed27e3ed2176b8c5`, M4 `d65ce50abf143925` completed by replay in under 5s, with its own verified REPLAY_COMPLETED (02:01:55.327228+00) and WITNESS_CREATED (02:02:00.304404+00). EventBridge polling resumed (36 clean cycles in 3 min).

---

# Multi-Runtime Proof

- Shared execution contract defined by reuse, not invention (WorkerRuntime, UnifiedEventRuntime, MissionRuntime/Scheduler, envelope.py, Task interface mapped; only principal/attempt/worker_id gap-filled): VERIFIED
- Real JS + Python execution with complete identifier traceability (event_id, mission_id, task_id, principal, namespace, correlation, causation chain, attempt, worker_id all captured and asserted): VERIFIED
- Python preserved without becoming a second event authority (zero Python-emitted events; all state transitions and canonical recording on the JS/PING side; transport no-authorization marker asserted): VERIFIED
- Cross-runtime canonicalization agreement (Python sha256 over canonical JSON independently recomputed in JS, byte-identical): VERIFIED
- No new event store, scheduler, or database created (proof harness uses JSONL/in-memory stand-ins implementing the production identity rules): VERIFIED
- Production persistence path (Postgres ping_events/ping_missions): PARTIAL (identity/causation/dedup rules are the production rules; storage backend is the stand-in)
- Retry/dead-letter path: PARTIAL (designed, retryable mapping implemented, no failure injected this run)
- Remote Pig/WSL ship transport: PARTIAL (same envelope bytes, direct subprocess only in this run)
- Synchronous scheduler, single capability, no concurrency load: PARTIAL (documented edges, not silent)

---

# Agent Orchestration Proof

- ExternalAgentAdapter contract and boundary for Codex/Hermes/OpenCode defined (file-protocol: WorkOrder envelope in, Result envelope out; agent never emits canonical events or writes mission state; write authority as PING-enforced policy input): VERIFIED
- No agent execution performed: VERIFIED (boundary only, per task scope)
- Codex environment boundary investigated (sandboxed Windows, ConstrainedLanguage, no WSL/Docker API, configured-roots-only filesystem): VERIFIED
- Next unit: first real agent execution through the boundary (P1)

---

# Knowledge Compounding Loop

Target loop: Observation -> Evidence -> Event -> Knowledge -> Playbook -> Automation -> Institutional Memory.

- Observation -> Evidence: VERIFIED (observation worker, EvidenceAuthority accumulate/verify/rank)
- Evidence -> Event: VERIFIED (workers emit through the event runtime; EVIDENCE_RECORDED events)
- Event -> Knowledge: VERIFIED (KnowledgeGraph PG knowledge_nodes, KnowledgePromoter with human approval gate to 1.0; 150 worker executions observed)
- Knowledge -> Playbook: PARTIAL (no playbook artifact observed in source)
- Playbook -> Automation: PARTIAL (missions are the automation unit, but no closed playbook-to-mission generation observed)
- Automation -> Institutional Memory: PARTIAL (replay/witness/lineage preserve decisions as evidence, but no replay-driven re-learning loop observed)
- Human/policy gate: VERIFIED (KnowledgePromoter approval gate; humans remain constitutional)

First broken edge: Knowledge -> Playbook. That is the next exact implementation unit for the self-improvement loop (alongside the TRACK V edges: who proposes/authorizes/executes/verifies/promotes; what survives restart).

---

# Website Truth Matrix

- 23-claim truth matrix built: WEBSITE CLAIM | RUNTIME COMPONENT | SOURCE EVIDENCE | LIVE EVIDENCE | STATUS | REQUIRED PROOF. VERIFIED
- Mirrored to the repo as research/website-truth-matrix.md (uncommitted). VERIFIED
- Key label applications: Agents = Experimental (IntelligenceWorker dormant); business-domain graph = Direction (generic KnowledgeGraph built); multi-runtime convergence = now PARTIAL (tonight's proof moves it from Direction); Codex/Hermes = not PING subsystems; Oracle = active development; Google Cloud = Direction; Neo4j = Experimental; CapabilityAuthority = Unproven (missing_implementation).
- The matrix is the enforcement mechanism for site honesty going forward.

---

# Homepage Work

- Rebuilt src/app/page.tsx from 14 equal-weight sections into the harvest hierarchy: living-system hero / compressed problem couplet / closed compounding loop (/observe /remember /connect /act /prove, business graph folded into Connect) / intelligence-is-not-authority (/govern, honest OFF: IntelligenceWorker dormant) / receipts (/prove) / one-authority-many-runtimes (/run) / Built on PING (/applied, moved up, build journal adjacent) / What-is-real status strip (/status, old roadmap folded in) / Follow the build / contact with scope note. VERIFIED (compiles, HTTP 200, stylesheet 200, /technology 200)
- New components: maturity-label.tsx (Live/Built/Experimental/Direction/Unproven), hero-evidence-card.tsx. VERIFIED
- Eyebrow taxonomy picked once; purpose clause on every section; no claim without an adjacent receipt or label. VERIFIED
- Real receipts wired in: commissioning event e9591d72...ce5864c5 (LEAD_CREATED, 2026-07-28), mission 51009ceae9ef316a (LEAD_FOLLOWUP), 150 worker executions, live gateway probe (healthy, constitution 1.0.0, auth enforced, probed 2026-09-16), three dated PING repo commits for the changelog. All labeled captured with as-of dates; nothing fabricated. VERIFIED
- One false claim FALSIFIED and fixed (Codex/Hermes card); one pre-existing em dash in seo.ts title template fixed. VERIFIED
- Boundaries held: no commits, no pushes, no deploys (HEAD f6386ee, 21 files uncommitted in the working tree), no copied branding, no em dashes in rendered HTML.
- Remaining gap: visual phone-width QA needs a live browser pass (structural mobile is done: responsive grids, tap-first, reduced-motion fallbacks). PARTIAL

---

# Competitive Work

- 8 draft pieces written (flagship Monday Work OS takedown in Nolan's voice plus 5 short posts, 1 vendor-agnostic AI-agent clown piece, 1 architecture-vs-marketing explainer). DRAFT ONLY headers on each; nothing published, nothing sent. VERIFIED
- Every technical comparison has a source/evidence basis with [INFERENCE] labels where it editorializes: Monday recipe payloads, tier-gated activity log retention (Basic 1 week through Enterprise 5 years) and Enterprise-only audit log from Monday's own security whitepapers, GHL trigger-then-sequential-actions model, role-permission vs authority-boundary lanes. VERIFIED
- Two claims PARTIAL (PING "structural" dedup semantics not fully audited this pass; GHL audit-log admin-only from a third-party source). All need Nolan's individual review before any use.

---

# Cloud Execution Placement

- Target topology documented: PING/Oracle authority plane -> WorkerRuntime -> workers on Oracle / Google Cloud / Vast.ai / Colab / Kaggle / Cloudflare edge. VERIFIED (design)
- Per-provider classification: Oracle = persistent execution (VERIFIED Always Free Ampere A1 ARM specs); Google Cloud = persistent/ephemeral (portable design); Vast.ai = GPU execution, on-demand/interruptible/reserved (VERIFIED pricing tiers); Colab = ephemeral burst, ~12h cap, ~90min idle timeout (VERIFIED official FAQ); Kaggle = ephemeral experiment (UNKNOWN: current free GPU quota not re-verified); Cloudflare = edge/gateway, no filesystem, 128MB isolates (VERIFIED).
- 10-item shared worker contract portability checklist. VERIFIED (design)
- Hard rules: one canonical Postgres, no split-brain, no cost, ARM64 multi-arch required on Oracle. VERIFIED (by construction)
- No accounts created, no cost incurred, no deployments performed. VERIFIED
- Shared contract runs on all providers: PARTIAL (design only; no provider has run a contract worker yet). ARM64 worker images: BLOCKED (pure-JS is arch-neutral, but no image built or tested on arm64).

---

# Files Changed

Track deliverables (all under ~/workspace/ping-overnight/):
- forensics/AUTHORITY_FORENSICS.md (event authority resolution, 9 questions, classification tables, bypass paths, canonical authority map)
- oracle/TRIAGE_REPORT.md (root causes, fixes, identifier-level persistence/restart proof log)
- multiruntime/EXECUTION_CONTRACT.md, PYTHON_ADAPTER.md, CROSS_RUNTIME_PROOF.md
- website/TRUTH_MATRIX.md, HOMEPAGE_REPORT.md
- competitive/DRAFTS.md, CLOUD_PLACEMENT.md
- STATUS.md (run timeline)

Repo changes (all UNCOMMITTED, none staged for commit):
- /home/nolan/projects/ping (main @ f6386ee): 21 files modified/added in working tree including rebuilt src/app/page.tsx, new maturity-label.tsx and hero-evidence-card.tsx, research/website-truth-matrix.md, seo.ts em dash fix. HEAD untouched.
- /home/nolan/ping: new worktree /home/nolan/ping/worktrees/oracle-assembly (branch main @ 5b102c664) containing multiruntime-proof/ files, uncommitted. constitutional-convergence-v2 branch read-only; no patches applied there. agent-smoke worktree untouched.
- Oracle live config: 3-line diff to the live compose file (backup .bak-20260916-oracle-triage kept on-box): QDRANT_URL added, qdrant healthcheck sh to bash, gateway healthcheck now logs non-200 statuses. No secrets written to any file.

---

# Tests Executed

- Oracle persistence proof: POST /events authenticated (200), deterministic id match, mission creation, replay worker execution (23ms), REPLAY_COMPLETED + WITNESS_CREATED captured, restart, survival verification, post-restart new-work execution, EventBridge 36 clean polling cycles. All PASS.
- Two live kernel replays with verified=true / kernel_verified plus witness attestations (pre and post restart). PASS.
- Multi-runtime proof: 34/34 traceability assertions PASS, exit 0; rerun reproduced byte-identical event IDs (determinism). PASS.
- JS/Python canonicalization agreement: byte-identical sha256 across runtimes. PASS.
- Gateway /health: 200 overall, all components healthy, before and after restart. PASS.
- Healthcheck repair: failing streaks 7387/7361 reset to 0, verified green. PASS.
- Website: dev server HTTP 200 on /, /technology; stylesheet 200; zero em dashes in DRAFTS.md and CLOUD_PLACEMENT.md (grep); zero en/em dashes in forensics deliverable. PASS.
- No test fabricated: PARTIAL/BLOCKED/UNKNOWN classifications are recorded honestly where evidence ran out.

---

# Git State

- /home/nolan/ping main worktree: branch constitutional-convergence-v2. Kickoff commit was c5f7808b2; at ~19:55 MDT another actor committed 099927152 ("history rewrite complete", docs-only) on top. All forensics sources re-verified byte-identical between the two commits; findings stand. No writes made by any sprint agent.
- Branches present: main @ 5b102c664, constitutional-convergence-v2 @ 099927152 (tip moved), plus night-shift/forensics branches from earlier work. curious-squid and PING-promotion branches do not exist locally (only origin/opencode/curious-squid remote); the mandate's curious-squid staging concern did not apply.
- Worktrees: /home/nolan/ping/worktrees/agent-smoke-abc123def456 [recovery/agent-smoke-2026-09-16] untouched; /home/nolan/ping/worktrees/oracle-assembly [main] created by this sprint, contains uncommitted multiruntime proof work.
- /home/nolan/projects/ping: main @ f6386ee, 21 files uncommitted, none committed or pushed.
- No commits, no pushes, no history rewrite, no git add -A/reset/clean/restore by any sprint agent tonight.

---

# P0 Remaining

1. Fix POST /events namespace-authorization bypass (B2): route it through CanonicalizationService like /ingest, or explicitly document the boundary. Owning unit: main deployment assembly.
2. Fix `emitWithDefaults` non-deterministic event_id (`evt_${Date.now()}_${random}`) so the content-addressed identity guarantee holds on every emission path. Owning unit: main deployment assembly.
3. Reconcile the two Oracle compose copies (live snapshot copy vs /opt/ping/infrastructure/oracle/docker-compose.oracle.yml, which lacks both healthchecks). Owning unit: morning crew decision.
4. Decide whether to start the `scheduler` service (defined, not running). Morning-crew decision; do not start blind.
5. Enforce append-only at the DB level if "append-only" is going to stay a marketed claim (currently convention only).
6. Registry case divergence (PascalCase vs SCREAMING_SNAKE event types).

---

# P1 Remaining

1. Wire the Python adapter to production Postgres (ping_events/ping_missions) instead of the stand-in backend; adapter design and migration recipe are done.
2. Inject a failure to exercise the retry/dead-letter path end to end.
3. Ship the worker envelope over the remote Pig/WSL transport instead of direct subprocess.
4. First real agent execution through the ExternalAgentAdapter (Codex/Hermes contract is defined; boundary only so far).
5. Live-loop run and recorded replay verdict for the site's "receipts" sections (remaining website gaps are runtime work).
6. Remove the .bak-20260916-oracle-triage compose backup once reviewed.

---

# P2 Remaining

1. Homepage visual phone-width QA via a live browser pass (structural mobile done).
2. Build and test ARM64 worker images on the Oracle A1 (pure-JS is arch-neutral; images not yet built).
3. Re-verify Kaggle's current free GPU quota before any Kaggle placement decision.
4. Nolan's individual review of every competitive draft before any use (drafts stay DRAFT ONLY).
5. Test whether the 1GB snapshot tarball restores as a full DR path.
6. Knowledge -> Playbook: the first broken edge of the compounding loop; next exact implementation unit for self-improvement.

---

# Exact Next Action

Fix the POST /events namespace-authorization bypass (P0 item 1) in the main deployment assembly worktree (/home/nolan/ping/worktrees/oracle-assembly, branch main). Route the /events door through CanonicalizationService like /ingest already does, so the emission choke point the forensics proved is also the enforced choke point. Pair it with the emitWithDefaults determinism fix (P0 item 2) in the same unit, since both concern event identity integrity. Everything downstream (multi-runtime receipts, site receipts, the truth matrix's PROVEN labels) depends on these two fixes being true. Verify by emitting through /events and confirming the namespace enforcement fires, then promote the worktree contents into the Oracle assembly when the owning review passes. No commits until the standing commit rule changes.
