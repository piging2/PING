# HARVEST CONTINUATION: PING UI CONVERGENCE
**Date:** 2026-09-17
**Pass type:** read-only continuation of UI_HARVEST_SPEC_2026-09-17.md. No files modified, no git operations, no credentials exposed.
**Scope:** /home/hatch/workspace mirrors and captured live evidence only. /home/nolan repos are not reachable from this machine; claims about them are cited from captured evidence and memory, never verified on disk.
**Maturity values used (only):** PROVEN, BUILT_NOT_LIVE, EXPERIMENTAL, DIRECTION, UNPROVEN.
**Requirement classification values used (only):** EXISTS, PARTIAL, MISSING, LEGACY, SYNTHETIC, DUPLICATE, UNKNOWN.
**Writing rule observed:** no em dashes anywhere in this document.
**Taxonomy note:** the prior pass used EXISTS/PARTIAL/SPEC_ONLY/PROTOTYPE/DEAD/DUPLICATE/UNKNOWN. This pass uses the task-mandated maturity set. Mapping used here: file-and-script artifacts that have run in production = PROVEN; artifacts built but not running or not proven live = BUILT_NOT_LIVE; built with live but unreliable data or test-scope-only proof = EXPERIMENTAL; named/spec'd with no implementation = DIRECTION; legacy/frozen/unverifiable = UNPROVEN. Recorded as R-10.

---

## PART A. VERIFICATION LOG (key known facts, checked live in files)

| # | Claim from brief | Verdict | Evidence |
|---|---|---|---|
| V-1 | ORCA dashboard closure rates are synthetic | CONFIRMED | `gateway-hardening/orig-engine.js:500,511` compute closureRate/missionClosureRate from `engine._missions` (in-memory, ephemeral); `:554,571` print them; `:615-625` fabricate findings inline with `confidence: 0.85` in startAutonomousLoop. Deep audit `goals/ping-gateway-exterior-agent-integration/files/execution-architecture-deep-audit-2026-09-16.md:178` grades this PROVEN. Record R-1 stands. |
| V-2 | /mc/* routes are JSON-read-only, no scheduling writes | CONFIRMED | `tandem/interop-audit-2026-09-13.md:85` ("/mc/* (dashboard incl. queues/scheduler/workers reads)"); `:101` ("/mc/scheduler is status-read only; no /schedule, /cron, /jobs, /tasks routes"). |
| V-3 | /ops/dashboard JSON is SENSITIVE_PUBLIC | CONFIRMED | `discovery-2026-09-12-read-routes-defects-event-count.md:21` classifies it SENSITIVE_PUBLIC: exposes image names, port maps, git branch/authors/messages. Same table rows 22-25 classify /governance/* and /constitution/* SENSITIVE_PUBLIC as well. |
| V-4 | P-05 Oracle-window is the only written Mission Control spec | CONFIRMED | `goals/ping-gateway-exterior-agent-integration/hidden_files/continuity-audit-2026-09-13.md:57-59` is the sole L1/L2/L3 read-only projection spec found; no competing written spec found in scope. |
| V-5 | Control Panel vs Mission Control naming unresolved | CONFIRMED | A-31: named only in AGENTS.md engineering order ("then Control Panel/Mission Control/harvesting -> canonical backend") and MEMORY.md PING website section. No distinction, no design, no code. |
| V-6 | No screenshots or prototype UI components found | CONFIRMED | `find` over scope for *.png/*.jpg UI assets and *.tsx/*.jsx/*.vue returned zero results (marketing mascot images and profile photos excluded). Only prototype-adjacent artifacts: ORCA console dashboard and the dormant console-print ExecutiveDashboard (cited secondhand at continuity-audit-2026-09-13.md:23; no code found in scope). |
| V-7 | Cron file state differs from live scheduler state | CONFIRMED | `outreach/automation-health-report.sh:16-17,20` (cron_file/cron_field read `*crons*/<id>__*.md` frontmatter); `:235-236` (enabled/disabled counts derived from files). The script cannot read live scheduler state, so its schedule section is file-derived. AGENTS.md 2026-09-17 lesson: cron internal state is authoritative; file edits do not take effect. |
| V-8 | tenant.ping.v1.json may not exist on disk | CONFIRMED ABSENT | `find /home/hatch/workspace -maxdepth 4 -iname "*tenant*"` returns no tenant.ping.v1.json. grep for the filename hits only self_improvement memory reconciliation snapshots, not a config file. `tandem/tenant-os-trace-2026-09-14.md` and `agents/training/tenantos-context-pack.md` contain no "tenant.ping.v1" string. The identity-authority idea lives in MEMORY.md only. Recorded as R-7. |

---

## PART B. PER-SURFACE CLASSIFICATION

### B-1. Mission Control REST (/mc/*) - BUILT_NOT_LIVE
- **What exists:** JSON read routes for dashboard incl. queues/scheduler/workers. `tandem/interop-audit-2026-09-13.md:85`; `mission_control.js:242` cited in `goals/ping-gateway-exterior-agent-integration/hidden_files/audit-threads-2026-09-16/thread-handoffs.md:260` (required by DeadLetterAuthority and gateway bootstrap).
- **Where:** Pig repo `gateway/routes/mission_control.js` (not on this machine; evidenced via captured audits).
- **Data used:** mission, scheduler, worker, dead-letter state from the live spine.
- **API used:** GET-only /mc/* routes, public reads (per interop audit). /mc/scheduler is status-read only (interop-audit:101).
- **Real or synthetic:** Real reads; route contents partially disputed, see R-5 and R-8.
- **Authority represented:** MissionRuntime (ping_missions), MissionScheduler, DeadLetterAuthority, WorkerRuntime.
- **Preserve:** the read-only contract (no scheduling writes); the DeadLetterAuthority wiring (routes/mission_control.js is required by the authority).
- **Share:** the /mc/* route enumeration, once a single authoritative listing exists.
- **Remain separate:** JSON API layer vs any future HTML UI; scheduler status reads vs any future schedule writes (which do not exist).
- **Maturity:** BUILT_NOT_LIVE (code-verified in repo; live 200 on these specific routes not captured in scope).

### B-2. Control Panel (named concept) - DIRECTION
- **What exists:** a name in the engineering order only. AGENTS.md ("then Control Panel/Mission Control/harvesting -> canonical backend"); MEMORY.md PING website section (same order).
- **Where:** prose only; no path, no design, no code.
- **Data/API/real-synthetic:** none.
- **Authority represented:** unresolved; competes with Mission Control (P-02, P-05) without a stated distinction.
- **Preserve:** the ordering constraint (after production health, namespace ACL, three playbook wiring gaps).
- **Share:** nothing yet.
- **Remain separate:** do not merge with Mission Control until the distinction is decided; the decision itself is a genuine open item for Nolan.
- **Maturity:** DIRECTION.

### B-3. Automation health machinery - PROVEN
- **What exists:** daily chat-delivered health report `outreach/automation-health-report.sh` (~380 lines; cron `automation-health-report` daily 07:30 America/Denver, owner goal:ping-social-outreach-campaign, first run 2026-09-17 07:30 MDT); universal pass classifier `pig-fb/pass-classifier.js` (10 terminal classes, 27/27 self-test per spec); capability registry `pig-fb/capability-registry.json` v1.0.0; recovery budgets `pig-fb/recovery-budgets.json` v1.0.0; action-truth funnel `outreach/action-truth.jsonl` + `action-truth-append.py`; reconciliation `tandem/reconcile.py` + `tandem/reconciliation/LATEST.json` (confirmed on disk) with typed gap vocabulary; tick-gap detection (loop-health-audit-2026-09-14.md:100-106); intent ledger `outreach/action-intent-ledger.py` + `outreach/action-intent-ledger.jsonl` (378 open intents, confirmed on disk); engagement guard `outreach/engagement-guard.py`; enumeration verification `pig-fb/enumeration-verify.js`; X tier record `pig-fb/x-tier-record.py` + `x-tier-state.json`.
- **Where:** paths above; design doc `ping-overnight/AUTOMATION_RESILIENCE_2026-09-17.md` sec 5.
- **Data used:** log files, ledgers, reconciliation reports, cron file frontmatter, registry JSON.
- **API used:** none (file readers; no PING API calls).
- **Real or synthetic:** Real operational data, with the R-4 caveat: schedule fields are file-derived, not live-scheduler-derived.
- **Authority represented:** none; it is an explicit reader (health report docstring: "Strictly read-only, always-exit-0").
- **Preserve:** terminal-disposition model (every action reaches EXECUTED/FAILED/NOT_ATTEMPTED/UNKNOWN_EXECUTION or stays visibly unresolved); zero-result suspicion rule; fail-closed UNKNOWN; independent discovery vs action truth (A-05).
- **Share:** the ten pass classes as first-class filters/status chips across every automation surface; the funnel shape (discovered >= eligible >= selected >= attempted >= succeeded).
- **Remain separate:** campaign logs stay outside PING canonical intelligence (Nolan's PING intelligence boundary, per MEMORY.md); only verified generalizable intel crosses via OBSERVATION_CREATED.
- **Maturity:** PROVEN.

### B-4. ORCA dashboard - EXPERIMENTAL
- **What exists:** `gateway-hardening/orig-engine.js:419-522` generateDashboard() + `:522` printDashboard(); `orig-orchestration.js:13,230-241` GET /orchestration/engine; `:241` GET /orchestration/engine/report (getReport() `:650-664`).
- **Where:** paths above; verified 200 unauth 2026-09-13 per spec.
- **Data used:** engine._missions (in-memory, ephemeral), fabricated findings (confidence 0.85 inline, `:615-625`).
- **API used:** GET /orchestration/engine, GET /orchestration/engine/report.
- **Real or synthetic:** SYNTHETIC. Engine is live-but-orphaned (initialized at boot, executor:null, autonomous loop disabled by decision). R-1.
- **Authority represented:** ORCA ExecutionEngine, which is NOT the live spine (own private EventQueue, in-memory missions; orca-omniroute-audit-2026-09-13.md:47-48).
- **Preserve:** nothing as a data source. The console-print pattern is the only salvageable interaction precedent.
- **Share:** nothing.
- **Remain separate:** isolate completely from the live-spine dashboard; the honest data source is ping_missions + ping_events. Any Mission Control built on /orchestration/engine inherits synthetic closure.
- **Maturity:** EXPERIMENTAL (runs, but numbers are not trustworthy; do not build on).

### B-5. Oracle read-only window proposal - DIRECTION
- **What exists:** the P-05 three-level read-only projection spec: L1 Mission (`GET /missions` + `GET /events/correlation/:id`, "renderable as a static page or even a generated markdown digest"), L2 Execution trace (`GET /events/:id/descendants|ancestors` causal tree, run_id as filter), L3 Evidence (content-addressed artifacts via output_refs). Explicitly "no continuity.db/agent_events.db; no new bus/scheduler/dashboard backend."
- **Where:** `goals/ping-gateway-exterior-agent-integration/hidden_files/continuity-audit-2026-09-13.md:57-59`.
- **Data used (proposed):** ping_missions, ping_events, content-addressed artifacts.
- **API used (proposed):** gateway public/auth'd GETs. Backend traversal exists auth'd: `GET /events/:id/children|descendants|ancestors` (recursive CTE, depth-capped) and `GET /events/correlation/:id` (limit 200), continuity-audit:14.
- **Real or synthetic:** Real (proposed over real APIs).
- **Authority represented:** UnifiedEventRuntime (ping_events), MissionRuntime (ping_missions).
- **Preserve:** the three-level zoom pattern (Mission to trace to evidence); the "no new system" constraint; the read-only posture.
- **Share:** the zoom model with Mission Control (B-1); the L2/L3 pattern with the evidence chain walker (B-14).
- **Remain separate:** rename the concept (R-3c: same doc :23 establishes "Oracle" is Oracle Cloud infrastructure, not a UI). Suggested: "Mission window". Also missing dependency: no run_id exists anywhere yet (continuity-audit:53 is a proposal; zero occurrences of run_id in drift-sources, gateway-hardening, or ping-overnight outside the harvest spec itself).
- **Maturity:** DIRECTION.

### B-6. Public website (marketing homepage + truth matrix) - BUILT_NOT_LIVE
- **What exists:** homepage rebuild around the harvest hierarchy: 14 sections compressed into 10 beats, living-system hero with captured evidence card (hero-evidence-card.tsx), maturity-label.tsx label system (Live/Built/Experimental/Direction/Unproven) with hover definitions and as-of receipts, honest OFF states, "illustrative model, not live data" captions. 23-claim truth matrix with per-claim status and required proof.
- **Where:** site repo `/home/nolan/projects/ping` (unreachable from this machine); evidence mirrored at `ping-overnight/website/HOMEPAGE_REPORT.md:1-45` (repo main at f6386ee, all work uncommitted, dev server tmux ping-dev :3000 compiling with HTTP 200s) and `ping-overnight/website/TRUTH_MATRIX.md`.
- **Data used:** captured receipts from ping_events/ping_missions (labeled captured, e.g. LEAD_CREATED e9591d72...ce5864c5, mission 51009ceae9ef316a, captured 2026-07-28) plus live probes (labeled live, probed 2026-09-16).
- **API used:** none at runtime (static site with captured evidence).
- **Real or synthetic:** Real captured evidence, explicitly labeled; illustrative elements explicitly captioned.
- **Authority represented:** none (marketing surface).
- **Preserve:** the maturity-label taxonomy and the receipt/as-of discipline; the "no claim without an adjacent receipt or label" house rule; the honest-OFF pattern.
- **Share:** the five-status label taxonomy across all PING surfaces (adopted as this pass's maturity vocabulary).
- **Remain separate:** marketing surface vs operator console; the truth matrix stays a claim board, not a live monitor. The public frontend is NOT an HPP transformation (per task brief; HPP is frozen).
- **Maturity:** BUILT_NOT_LIVE (dev server live at localhost:3000 per MEMORY.md; not deployed).

### B-7. Standalone public frontend (site repo tree) - BUILT_NOT_LIVE
- **What exists:** the independent site repository with its own Git history, branches, credentials, Vercel project, and deployment lifecycle, fully independent of HPP. Surgical upgrade 2026-09-17: architecture diagrams, 14-section homepage with honest status labels, PingWordmark with the official gold pig head logo site-wide; work uncommitted on main.
- **Where:** `/home/nolan/projects/ping` (unreachable); MEMORY.md PING website section.
- **Data/API/real-synthetic:** same as B-6 (same artifact).
- **Authority represented:** none (marketing surface).
- **Preserve:** the independence boundary (no shared history, remotes, or deployment credentials with HPP); the credential rule (Piging85 account/integration, no new credential sprawl).
- **Share:** nothing technical with operator surfaces.
- **Remain separate:** fully independent repository, Git history, credentials, Vercel project, deployment lifecycle from HPP. Zero HPP changes of any kind.
- **Maturity:** BUILT_NOT_LIVE.

### B-8. HPP references - UNPROVEN
- **What exists:** legacy HPP route families still listed on the gateway public REST surface (interop-audit-2026-09-13.md:85: "/ops, /governance, /constitution, /mc/* ..., legacy HPP families"); gateway dashboard.js archived with history to `archive/dead-routes-2026-09-15/` (migration-matrix-2026-09-15.md:11; 4 gateway suites re-ran green after).
- **Where:** legacy route family on the gateway; archive path above.
- **Data used:** legacy routes (contents not enumerated in scope).
- **API used:** gateway REST (legacy family).
- **Real or synthetic:** Real but frozen.
- **Authority represented:** none active; HPP is FROZEN per Nolan's standing call (MEMORY.md: zero changes of any kind; source archaeology only).
- **Preserve:** the archival pattern (git mv + README note) demonstrated by P-18.
- **Share:** nothing.
- **Remain separate:** HPP stays frozen and untouched; the public frontend never inherits from it.
- **Maturity:** UNPROVEN (legacy, frozen, not a basis for UI work).

### B-9. Operator/admin surfaces - PROVEN
- **What exists:** (a) worktree supervisor spec: manifests (.agent-worktree.json), ledger `/home/nolan/.ping-worktree-ledger.log`, 15-min reaper, awaiting-merge states (`orchestration/worktree-architecture-spec.md`); visibility is log files only. (b) backup/restore: verified backup set + `ping-overnight/phase10/RESTORE_VERIFICATION_PROCEDURE.md` + `ping-overnight/phase10/RETENTION_POLICY.md` (confirmed on disk); append-only trigger DDL runbook at `ping-overnight/event-boundary/trigger-append-only.sql`. (c) goal-owned cron .md files as executable specs (`goals/ping-social-outreach-campaign/crons/daily|hourly|runonce/`; confirmed on disk, e.g. automation-health-report__daily@07:30:00.md). (d) Pig gateway watchdog (PigiGatewayWatch, every 5 min, probes /events: 401=healthy; EXISTS but unindexed in pig-capabilities.json). (e) tracked `.env.mission-control` / `.env.qdrant` flagged for secrets audit, contents not read (worktree-architecture-spec.md:19,156,190,205).
- **Where:** paths above.
- **Data used:** logs, backup sets, cron frontmatter, container health probes.
- **API used:** shell/docker/SSH; no PING API.
- **Real or synthetic:** Real.
- **Authority represented:** various (filesystem, scheduler, containers); not PING constitutional authorities.
- **Preserve:** the executable-spec pattern (cron body IS the spec); the archival-with-history pattern; the secrets-audit flag on .env.mission-control (do not read contents casually).
- **Share:** cron frontmatter schema as the future scheduler UI's data contract; the runbook pattern for P0 fixes.
- **Remain separate:** shell operator tooling vs any web Mission Control until a real scheduler API exists (no /schedule, /cron, /jobs, /tasks routes, interop-audit:101).
- **Maturity:** PROVEN.

### B-10. Runtime dashboards (P-01 /ops/dashboard + /ops/system) - PROVEN
- **What exists:** JSON API returning SystemAuthority.getSystemState(): version, generated_at, containers[] (name, status, state, IMAGE, port maps, uptime, created), git (branch, pending_changes, recent_commits), postgres (total_events, streams, event_types, oldest/newest), qdrant (collections, total_points), missions/replay counts, metrics (uptime_seconds, total_requests).
- **Where:** `ops.js:82,110` (route code in Pig repo); evidenced at discovery-2026-09-12-read-routes-defects-event-count.md:21 and PHASE4_PIPELINE_COMPLETION_RECORD.md:37,92.
- **Data used:** live container/docker state, git adapter, Postgres, Qdrant.
- **API used:** GET /ops/dashboard, GET /ops/system; public, read-only; verified live 200 on 2026-09-12/13.
- **Real or synthetic:** Real, with SENSITIVE_PUBLIC classification (image names, port maps, git branch/authors/messages).
- **Authority represented:** SystemAuthority; UnifiedEventRuntime (ping_events); MissionRuntime (ping_missions).
- **Preserve:** read-only posture; the SENSITIVE_PUBLIC handling (a UI must not widen exposure, e.g. no public unauth'd HTML rendering without the same classification review).
- **Share:** the field model for a live platform status strip.
- **Remain separate:** /ops/status 500 (`fingerprint.generate is not a function`, continuity-audit:18,70) and /constitution/graph 503 stay as known defects; any mission-level dashboard built on /ops/* must route around them. Keep public vs auth'd read surfaces distinct.
- **Maturity:** PROVEN (JSON API proven live; no HTML rendering exists).

### B-11. Governance surfaces (/governance/*, /constitution/*) - PROVEN
- **What exists:** JSON APIs: /governance/* returns policy list (event_type, authority_owner, event_class, source, namespace, expectedOwner), full NAMESPACE_OWNERS map, violations (50 cap), stats; /constitution/ returns platform_hash, runtime hashes, contracts, startup order; /constitution/contracts returns per-registry contracts.
- **Where:** evidenced at discovery-2026-09-12-read-routes-defects-event-count.md:22-25.
- **Data used:** event governance policy, constitution registry.
- **API used:** GET /governance/*, GET /constitution/* (public reads per audit family).
- **Real or synthetic:** Real; classified SENSITIVE_PUBLIC (complete accepted-input attack surface; architecture internals). /constitution/graph is a dead 503 path.
- **Authority represented:** governance/policy authority; constitution registry.
- **Preserve:** the sensitivity classification; the violations list as the governance signal.
- **Share:** the NAMESPACE_OWNERS map and policy list as reference data for any authority browser.
- **Remain separate:** do not imply per-tenant enforcement in any UI (namespace ACLs are a P0 gap; the /events fix validates syntax only, TEN_HOUR:60).
- **Maturity:** PROVEN (JSON proven; no HTML UI exists).

### B-12. Event views - DIRECTION
- **What exists:** P-06 Event Explorer = named but undesigned, planned-but-unimplemented (continuity-audit-2026-09-13.md:23). Closest existing: dormant console-print ExecutiveDashboard (cited secondhand; no code found in scope; existence UNKNOWN). Backend traversal API exists and is auth'd (continuity-audit:14).
- **Where:** spec at continuity-audit:23; backend routes on the gateway.
- **Data used (available):** ping_events via UnifiedEventRuntime; causation_id/correlation_id indexed; recursive CTE traversal.
- **API used (available):** GET /events, /events/recent, /events/stats, /events/:stream, /events/unprocessed, /events/:id/children|descendants|ancestors, /events/correlation/:id (limit 200), all Bearer-auth'd.
- **Real or synthetic:** Real.
- **Authority represented:** UnifiedEventRuntime (ping_events).
- **Preserve:** the auth'd traversal contract (depth-capped CTE, correlation limit 200); never render as a raw log dump (anti-pattern X-32 in prior spec).
- **Share:** the L2 causal-tree pattern with the evidence chain walker.
- **Remain separate:** event stream views vs mission views (different zoom levels, same authorities).
- **Maturity:** DIRECTION.

### B-13. Mission views - DIRECTION
- **What exists:** no rendering exists. Backend: MissionRuntime lifecycle created to assigned to running to completed/failed to archived (`ping-overnight/drift-sources/mission_runtime.js.live-20260917:1-11`); GET /missions exists (continuity-audit:14,57); live Postgres ping_missions held 222 rows at the 2026-09-17 backup (TEN_HOUR:100).
- **Where:** backend in Pig repo; no UI path anywhere in scope.
- **Data used (available):** ping_missions rows; correlation events per mission.
- **API used (available):** GET /missions (+ correlation, P-05 L1).
- **Real or synthetic:** Real data available; no view renders it.
- **Authority represented:** MissionRuntime + MissionScheduler over ping_missions.
- **Preserve:** the lifecycle state vocabulary; the rule that Mission Control navigates missions via events/queues in the UI projection (R-2), even though the gateway exposes write endpoints.
- **Share:** the mission record shape with the run queue (B-1) and the drill-down model (B-5 L1).
- **Remain separate:** the tracked mission board vs the live run queue must stay visually distinct (prior spec sec 4, X-20 pattern).
- **Maturity:** DIRECTION (the single largest missing primitive per prior spec sec 16).

### B-14. Artifact/evidence views - EXPERIMENTAL
- **What exists:** no chain-walker UI. Backend chain proven in test scope: proposal 9d5b14d3... to playbook node 94043c0eb1d3918d to approval 3c1985a53d... to activation 0bc80b9d... to projection 04e4808a... to mission 0405c01805096690 (REPLAY_VERIFY) to REPLAY_COMPLETED 408247b6... to WITNESS_CREATED 2c75c8da... to outcome 93687aab... to revision 194a2b85bde957ed (PENDING_HUMAN), 9/9 events present across a gateway restart (TEN_HOUR:124). Python-prod chain: TASK_STARTED to TASK_COMPLETED a6e70b783956e4c1... to EVIDENCE_RECORDED 9bbbfff731a2023d... to evidence 6cafb21dca536f4f to MISSION_COMPLETED f8c1ae1fc1c7bc32... (TEN_HOUR:108). Artifact append result via append_orchestrator (thread-handoffs failure-vocabulary table).
- **Where:** events in live Postgres (test.playbook / test.python-prod namespaces); spec A-62 in `tandem/DELEGATION-ARCHITECTURE.md` sec F.
- **Data used (available):** content-addressed artifacts (pack sha1; answers by timestamped filename), output_refs in boundary events (P-05 L3).
- **API used (available):** event GETs; artifact store (ORCA-side artifact_store is ephemeral container disk, not the live path).
- **Real or synthetic:** Real in test scope; the A-62 conformance gap is open (one compressed observation per business today; no raw_artifact link in the event; no per-observation verification records; no preserved uncertainty). A UI must not render lineage that does not exist.
- **Authority represented:** WitnessWorker, ReplayWorker, lineage worker, EvidenceAuthority (declared), KnowledgePromoter.
- **Preserve:** content-addressed artifact pattern; the conformance gap must stay labeled, never silently rendered as complete.
- **Share:** the L3 evidence pattern with the Oracle window (B-5); the receipt format (A-53) as the presentation pattern for evidence-backed claims.
- **Remain separate:** PING canonical evidence vs outreach-machine dossiers (the PING boundary).
- **Maturity:** EXPERIMENTAL.

### B-15. Worker/execution views - DIRECTION
- **What exists:** no viewer UI. Backends: live WorkerRuntime registry (9 workers registered; `intelligence` skipped as dormant; orca-omniroute-audit-2026-09-13.md:28); execution reports with status pending/running/completed/failed (worker_runtime.js:102,187,197,206; thread-handoffs failure-vocabulary table); ORCA-side CapabilityRegistry (in-memory Map + JSON; exactly ONE worker `opencode:local`, totalTasksCompleted: 0; orca-omniroute:26); capability_requests audit table (columns code-verified: request_id, agent_id, session_id, capability, parameters, authz, granted, policy_violation, result, event_id, audit_status; live rows unverifiable, no DB client on Pig; continuity-audit:18); GET /capabilities 404'd live (continuity-audit:18).
- **Where:** backends in Pig repo/live container; no UI path.
- **Data/API/real-synthetic:** real registry state; no read API for capability_requests.
- **Authority represented:** WorkerRuntime (live spine); ORCA ExecutionEngine (orphaned; not the live spine).
- **Preserve:** the live worker registry as the source of truth; the dormant-intelligence-worker honest state.
- **Share:** worker health states with the automation health surface.
- **Remain separate:** ORCA's private in-memory registry must never be conflated with the live WorkerRuntime registry or the capability_requests audit table (three different stores, per orca-omniroute:26-28,47-48).
- **Maturity:** DIRECTION.

### B-16. Knowledge graph UI attempts - DIRECTION
- **What exists:** no graph viewer found (A-67). Nearest: entity dossier JSON projections `tandem/knowledge/dossiers/*.json` (e.g. 1st-choice-pro-services.json with identity_confidence, open_questions, next_justified_action; confirmed on disk) built by `tandem/entity-dossier.py`; edge rules (every edge carries provenance or is "inferred"; A-61). Backend: KnowledgeGraph BUILT (knowledge_nodes/edges, confidence semantics, promoter lifecycle), hybrid_search BUILT, Neo4j adapter EXPERIMENTAL (HOMEPAGE_REPORT.md maturity table).
- **Where:** `tandem/knowledge/`; no viewer path.
- **Data used (available):** knowledge_nodes/edges with provenance; dossier JSON.
- **API used (available):** none for the graph (no route evidenced in scope).
- **Real or synthetic:** Real nodes/edges; provenance grading real (A-61 rules).
- **Authority represented:** KnowledgeGraph + KnowledgePromoter.
- **Preserve:** the edge-provenance rules (A-61); the inferred-vs-proven labeling; contradictions preserved, never collapsed.
- **Share:** dossier card shape with the approval queue (B-18) and prospect intelligence.
- **Remain separate:** outreach dossiers (machine JSON, PING boundary excludes most) vs canonical knowledge graph UI; the homepage BusinessGraph is illustrative, not live data (HOMEPAGE_REPORT.md:10).
- **Maturity:** DIRECTION.

### B-17. Campaign/social control surfaces - PROVEN
- **What exists:** operating loop (operations manual sec 16c, SWEEP to DISCOVER to VERIFY to ENRICH to CLASSIFY to IDENTIFY OPPORTUNITY to SCORE CONFIDENCE to CHECK SUPPRESSION to SELECT BEST ELIGIBLE ACTION to PERSONALIZE to OUTREACH/CONTENT/WATCH to RECORD OUTCOME to LEARN to NEXT SWEEP; runs every 3h); sweep run ledger (`goals/ping-social-outreach-campaign/hidden_files/meta-ai-intel/runs.jsonl`, confirmed on disk; structured JSONL per-sweep lines); prospect pipeline (`outreach/pipeline.md` + prospect JSONL + digest, 21 intelligence columns, HOT/WARM/WATCH/SUPPRESS states; confirmed on disk); follow-up ladder (`outreach/follow-ups.md`); angle performance (`outreach/angle-performance.md`); content queues (`ping-content/queue.json`, `outreach/content-queue.md`; "NOT auto-published. Nolan decides what gets made."); X qualified action queue + relationship ledger (`goals/ping-social-brand-launch/files/x-qualified-action-queue-2026-09-13.md`, `x-relationship-ledger-2026-09-13.md`; confirmed on disk); Sunday post decision records (`ping-content/sunday-post-decision-2026-09-14.md`); marketing intelligence: arbitrage queue, scoreboard (`marketing-intel/scoreboard.md`, "every unpopulated cell says UNKNOWN"), meme object schema (`marketing-intel/meme-objects/SCHEMA.md`, five-layer chain), PING Receipt format (`marketing-intel/meme-objects/receipt-cam.md`), competitive tech/capability maps.
- **Where:** paths above.
- **Data used:** sweep outputs, prospect records, engagement logs, market observations.
- **API used:** none (file machinery; PING contact only via emit-observation.py POST OBSERVATION_CREATED after the verification gate).
- **Real or synthetic:** Real operational data.
- **Authority represented:** outreach campaign machinery (not PING constitutional authorities; deliberately outside PING per the intelligence boundary).
- **Preserve:** the pipeline record schema; the operating loop stage observability ("every stage transition is derivable from the record without parsing prose"); decision records; the no-auto-publish rule.
- **Share:** funnel stages, terminal disposition, evidence-receipt cards, decision records as UI primitives across campaign and PING surfaces.
- **Remain separate:** campaign machinery stays outside PING canonical intelligence; only high-quality, generalizable, verified intel crosses via the verification gate (A-14). Client-facing reports stay one-page (R-1b); operator machinery stays dashboard-grade.
- **Maturity:** PROVEN.

### B-18. Approval UIs - DIRECTION
- **What exists:** no UI surface. Backend proven in test scope: KnowledgePromoter handled=1, approved=1, gate fired exactly once; revision node `194a2b85bde957ed` v1.1.0 `candidate`, `decision: PENDING_HUMAN`, `required_approver: Nolan Geske (human)`, `decided_by: null` (playbook/REPORT.md:23,69,96,157,168; website/TRUTH_MATRIX.md:24). Human-authority law: every activation and revision requires an explicit recorded approval; production promotion stays closed (playbook/PLAYBOOK_SPEC.md:6-8).
- **Where:** no UI path; backend in Pig repo + live Postgres (test.playbook namespace).
- **Data used (available):** knowledge_nodes with status candidate; revision nodes PENDING_HUMAN.
- **API used (available):** approvals are POSTed events only today.
- **Real or synthetic:** Real backend proof in test scope; ordinary runtime path broken.
- **Authority represented:** KnowledgePromoter, KnowledgeGraph, EvidenceAuthority.
- **Preserve:** the PENDING_HUMAN semantics; named-human approver; TEST SCOPE ONLY labeling discipline; approvals dispatch through the promoter authority, never around it.
- **Share:** the approval-card primitive (held action, evidence cited, approver, grant/deny) with the campaign held-action pattern (A-57).
- **Remain separate:** the harness-proven path vs the ordinary runtime path; the UI must not imply the ordinary path works (SNIPPET_APPROVED dispatch gap, TEN_HOUR:62).
- **Maturity:** DIRECTION (backend EXPERIMENTAL-to-PROVEN in test scope; UI nonexistent).

### B-19. Quarantine UIs - DIRECTION
- **What exists:** CLI only: `tandem/brief-lifecycle.py --check` emits human-gated recommendations, never auto-quarantines; lifecycle PENDING to RUNNING to VALIDATING to COMPLETE/VALIDATION_FAILED to RETRY to TERMINAL_FAILURE to QUARANTINED; quarantine record schema `tandem/contracts/quarantine-record.schema.json`; live record `tandem/quarantine/c-review-complaint-signals.json` (5 consecutive rejections, 20 artifacts preserved, retry-eligible 2026-09-24, lift requires Nolan; confirmed on disk).
- **Where:** paths above; no board UI.
- **Data used:** runs.jsonl, quarantine records with artifacts/errors/attempts/timestamps.
- **API used:** CLI.
- **Real or synthetic:** Real records.
- **Authority represented:** brief lifecycle state machine (outreach machinery); quarantine approved by Nolan explicitly.
- **Preserve:** human-gated lift; quarantine preserves artifacts/errors/attempts/timestamps; research items end in QUARANTINED, never stall.
- **Share:** the quarantine-record shape (reason, consecutive failures, retry budget, preserved artifacts, named-human lift) with surface-level recovery budgets (A-04).
- **Remain separate:** brief quarantine vs surface quarantine (different budgets, different lift authorities).
- **Maturity:** DIRECTION (backend PROVEN as CLI + records; UI missing).

### B-20. Scheduler UIs - DIRECTION
- **What exists:** no scheduler UI. Cron .md files as executable specs (goal crons dirs, confirmed on disk); 2026-09-17 resilience sections embedded in 5 cron bodies. Proven absences: no /schedule, /cron, /jobs, /tasks routes (interop-audit-2026-09-13.md:101); no execution history anywhere, fire times and outcomes not recorded (continuity-audit-2026-09-13.md:21); tick-gap detection derives expected ticks from reconcile reports (loop-health-audit-2026-09-14.md:100-106).
- **Where:** `goals/*/crons/`; no UI path.
- **Data used (available):** cron file frontmatter (id, title, enabled, owner, mode, schedule); live scheduler state (cloud-side, not file-readable).
- **API used (available):** none on the gateway; cron tool (cloud-side).
- **Real or synthetic:** Real definitions; R-4: file state can differ from live scheduler state.
- **Authority represented:** cloud scheduler (outside PING); MissionScheduler (PING-side mission scheduling, distinct).
- **Preserve:** the cron-body-as-executable-spec pattern; yield-driven cadence rules (A-70).
- **Share:** the scheduler health section shape with the automation health cockpit.
- **Remain separate:** any scheduler UI must read LIVE scheduler state, never files (R-4). PING MissionScheduler vs cloud cron scheduler are different authorities.
- **Maturity:** DIRECTION.

---

## PART C. SECTIONS 16/17 RECONCILIATION

One row per requirement. Evidence citation on every row.

### C-1. Section 16: data projections required

| # | Requirement (sec 16) | Class | Evidence / reasoning |
|---|---|---|---|
| 16.1 | Mission list + board + timeline + detail (MissionRuntime over ping_missions; GET /missions + GET /events/correlation/:id) | PARTIAL | Read sources exist and are live: mission lifecycle created to archived (`ping-overnight/drift-sources/mission_runtime.js.live-20260917:1-11`); `GET /missions` + `GET /events/correlation/:id` auth'd (continuity-audit-2026-09-13.md:14,57); ping_missions 222 rows at backup (TEN_HOUR:100). No rendering exists anywhere in scope. |
| 16.2 | Run queue, live and global (MissionScheduler + WorkerRuntime; distinct from mission board) | PARTIAL | Scheduler + worker state exist live (orca-omniroute-audit-2026-09-13.md:28: 9 workers registered). No queue UI exists. |
| 16.3 | Run timeline + typed nested trace (requires run_id instrumentation) | MISSING | No run_id anywhere in scope: zero occurrences in drift-sources, gateway-hardening, and ping-overnight outside the harvest spec itself. continuity-audit-2026-09-13.md:53 is a proposal to inject run_id/parent_run_id, not an implementation. |
| 16.4 | Execution detail (ExecutionAuthority records + execution events; hashes, host, runtime, duration, result, artifacts, failure class) | PARTIAL | Execution reports with status exist (worker_runtime.js:102,187,197,206 per thread-handoffs failure-vocabulary table); structured TASK_COMPLETED/EVIDENCE_RECORDED proven in python-prod (TEN_HOUR:108); failure classes exist (A-02, `pig-fb/pass-classifier.js`). No detail UI exists. |
| 16.5 | Event timeline + causal tree (UnifiedEventRuntime over ping_events; /events/:id/descendants\|ancestors) | PARTIAL | Traversal API exists auth'd: `GET /events/:id/children\|descendants\|ancestors` (recursive CTE, depth-capped), `GET /events/correlation/:id` (limit 200) (continuity-audit-2026-09-13.md:14); in-band causation_id/correlation_id on every event (PING_OVERNIGHT_2026-09-16.md:78). No timeline/tree UI exists. |
| 16.6 | Evidence chain (lineage worker records; raw artifact to observations to verification to events to claims) | PARTIAL | Full chain proven in test scope with 9/9 events across a restart (TEN_HOUR:124). A-62 conformance gap is open: one compressed observation per business today, no raw_artifact link in the event, no per-observation verification records, no preserved uncertainty (DELEGATION-ARCHITECTURE.md sec F conformance note, cited in prior spec sec 9). No walker UI exists. |
| 16.7 | Proof/witness (WITNESS_CREATED/REJECTED; replay attestations) | PARTIAL | WITNESS_CREATED 2c75c8da... attested (TEN_HOUR:124); mission-driven replay verified True with REPLAY_COMPLETED ead4be8a... and attestation witness-ead4be8a1eaaa77c (TEN_HOUR:136). No proof UI exists. |
| 16.8 | Dead-letter queue (repository_dead_letters; retry_count, failure_reason, replayable) | PARTIAL | DeadLetterAuthority + repository_dead_letters verified live: MISSION_DEAD_LETTERED `3daa14285107788e` to `21a6af0b72a8cfeb...`, retries=2, exactly one DLQ record (TEN_HOUR:112); columns incl. retry_count, failure_reason, replayable BOOLEAN (thread-handoffs:260). No browser UI exists. |
| 16.9 | Approval queue (knowledge_nodes candidate + revision nodes PENDING_HUMAN) | PARTIAL | Backend proven in test scope: promoter handled=1, approved=1; revision `194a2b85bde957ed` PENDING_HUMAN, decided_by null, approver Nolan Geske (playbook/REPORT.md:23,69,96,157,168). No queue UI exists. Ordinary path blocked by SNIPPET_APPROVED dispatch gap (TEN_HOUR:62). |
| 16.10 | Capability health (capability-registry.json + capability_requests audit table) | PARTIAL | `pig-fb/capability-registry.json` v1 + contract test `pig-fb/test-capabilities.py` exist; capability_requests table columns code-verified but live rows unverifiable and GET /capabilities 404'd live (continuity-audit-2026-09-13.md:18). No console UI exists. |
| 16.11 | Automation health (action-truth.jsonl + action-intent-ledger.jsonl + reconciliation/LATEST.json + cron definitions) | PARTIAL | All four data sources exist on disk and the daily report runs (B-3). The interactive cockpit specified as P0 work 1 in the prior spec does not exist; the projection today is chat-delivered text + JSONL/machine files. |
| 16.12 | Scheduler state (cron definitions + execution history) | PARTIAL | Cron definitions exist as files (goal crons dirs; confirmed on disk). Execution history exists nowhere: "no execution history anywhere (fire times, outcomes not recorded)" (continuity-audit-2026-09-13.md:21). Any UI reading files instead of live state inherits R-4. |
| 16.13 | Research briefs + quarantine (tandem runs.jsonl + quarantine records) | PARTIAL | runs.jsonl exists at `goals/ping-social-outreach-campaign/hidden_files/meta-ai-intel/runs.jsonl` (confirmed on disk; see correction C-4); quarantine record `tandem/quarantine/c-review-complaint-signals.json` exists (confirmed on disk). CLI only; no board UI. |
| 16.14 | Knowledge dossiers (tandem/knowledge/dossiers/*.json) | PARTIAL | Dossier JSONs exist (e.g. 1st-choice-pro-services.json; `tandem/knowledge/dossiers/` confirmed on disk); builder `tandem/entity-dossier.py` exists. No viewer UI exists. |
| 16.15 | Knowledge graph (nodes/edges with provenance on every edge) | MISSING | No graph UI found anywhere in scope (A-67). Backend exists (KnowledgeGraph BUILT; HOMEPAGE_REPORT.md maturity table) but no projection renders it. |
| 16.16 | Campaign state (sweep runs.jsonl + pipeline.md + angle-performance.md + content queues) | PARTIAL | All sources exist on disk (B-17). No unified campaign workspace view exists. |
| 16.17 | Prospect intelligence (prospect JSONL + digest; entity dossiers) | PARTIAL | Prospect JSONL + digest + pipeline.md exist; dossiers exist (16.14). No intelligence UI exists. |
| 16.18 | System/platform (P-01 /ops/dashboard JSON; SENSITIVE_PUBLIC; no HTML) | PARTIAL | JSON exists and is proven live 200 (discovery doc:21; PHASE4 record:37,92); classified SENSITIVE_PUBLIC. No HTML rendering exists. |
| 16.19 | Cost (per-execution token/cost capture rolled up per Mission/Run/Campaign) | MISSING | Capture does not exist yet (prior spec sec 16: "capture does not exist yet"). No cost events, tables, or roll-ups found in scope. |
| 16.20 | Tenants (TenantRegistry + namespace policy state) | PARTIAL | TenantRegistry in ACTIVE DEVELOPMENT; `gateway/routes/tenants.js` exists (prior spec). No tenant screen found. tenant.ping.v1.json does not exist on disk (R-7). |

### C-2. Section 17: backend APIs/events required - "exists today (keep and build on)"

| # | Requirement (sec 17) | Class | Evidence / reasoning |
|---|---|---|---|
| 17.1 | GET /missions, POST /missions (auth'd) | EXISTS | continuity-audit-2026-09-13.md:14 (`/events/*` table context; GET /missions at :57); interop-audit-2026-09-13.md:101 ("POST /missions auth'd"). |
| 17.2 | /orchestration/missions (unauth'd; note the exposure) | EXISTS | interop-audit-2026-09-13.md:101 ("/orchestration/missions unauth'd"). Exposure note stands; flagged, not resolved. |
| 17.3 | GET /events, GET /events/:id, GET /events/correlation/:id, POST /events (auth'd, namespace-authorized) | EXISTS | continuity-audit-2026-09-13.md:14 lists GET /events, /events/recent, /events/stats, /events/:stream, /events/unprocessed, /events/:id/children\|descendants\|ancestors, /events/correlation/:id (limit 200), all behind Bearer auth (verified-live 401 without key); interop-audit-2026-09-13.md:150 (HTTP POST /events); namespace-auth fix verified live (TEN_HOUR:43). |
| 17.4 | /mc/* dashboard reads (queues/scheduler/workers; JSON only) | EXISTS | interop-audit-2026-09-13.md:85; /mc/scheduler status-read only (interop-audit:101). Caveat: exact sub-route contents disputed (R-5); one enumerating source is unverifiable (R-8). |
| 17.5 | /ops/dashboard, /ops/system (JSON) | EXISTS | discovery-2026-09-12-read-routes-defects-event-count.md:21; verified live 200 on 2026-09-12/13 (PHASE4_PIPELINE_COMPLETION_RECORD.md:37,92). SENSITIVE_PUBLIC. |
| 17.6 | DeadLetterAuthority events: MISSION_DEAD_LETTERED, TASK_FAILED | EXISTS | MISSION_DEAD_LETTERED verified live (TEN_HOUR:112). TASK_FAILED emitted with structured fields (task_id, mission_id, correlation, namespace, principal) in the python-prod controlled-failure chain (`ping-overnight/python-prod/REPORT.md:71-78`); event type defined in `ping-overnight/multiruntime/EXECUTION_CONTRACT.md:194-196`. |
| 17.7 | Knowledge events: playbook proposal/approval/activation/revision/outcome; SNIPPET_APPROVED, AI_RESPONSE_ACCEPTED/REJECTED | EXISTS | Full chain with event IDs captured (website/TRUTH_MATRIX.md:24; TEN_HOUR:124). Workers registered for these event types live: knowledge-promotion handles SNIPPET_APPROVED/REJECTED, AI_RESPONSE_ACCEPTED/REJECTED (orca-omniroute-audit-2026-09-13.md:28). |
| 17.8 | Replay events: REPLAY_COMPLETED, WITNESS_CREATED/REJECTED, LINEAGE_CREATED | EXISTS | REPLAY_COMPLETED ead4be8a... verified True; WITNESS_CREATED 4aa7b0eb... attested; lineage worker firing (TEN_HOUR:124,136). |

### C-3. Section 17: gaps proven by failed runs (platform follow-ups)

| # | Requirement (sec 17) | Class | Evidence / reasoning |
|---|---|---|---|
| 17.9 | Per-principal namespace ACLs (fix validates syntax only) | MISSING | TEN_HOUR:60: valid-but-unauthorized explicit namespace still accepted; no per-principal entitlement map. UI must not imply per-tenant enforcement. |
| 17.10 | POST /knowledge/nodes drops nodeId, sourceEventId, correlationId (orphan 4917265ee67e678c) | MISSING | TEN_HOUR:61. Nodes created through it are invisible to the approval gate. |
| 17.11 | SNIPPET_APPROVED in neither EVENT_MISSION_MAP nor MISSION_WORKER_MAP | MISSING | TEN_HOUR:62. Ordinary runtime wiring cannot reach KnowledgePromoter; blocks the P-09 UI's ordinary path. |
| 17.12 | Directly emitted REPLAY_VERIFY creates no mission | MISSING | TEN_HOUR:63. Dispatch-only worker runtime never runs the replay worker on the direct path. |
| 17.13 | Append-only trigger does not cover TRUNCATE | MISSING | TEN_HOUR:64. DDL saved at `ping-overnight/event-boundary/trigger-append-only.sql`; must be re-applied after any from-scratch rebuild. |
| 17.14 | /ops/status 500 (`fingerprint.generate is not a function`); /constitution/graph 503 | MISSING | continuity-audit-2026-09-13.md:18 (verified-live) and :70 (known defect in the read path). Any mission-level dashboard on /ops/* must route around these. |
| 17.15 | GET /capabilities 404'd live | MISSING | continuity-audit-2026-09-13.md:18 (verified-live 2026-09-13). capability_requests audit table exists with no viewer. |
| 17.16 | No /schedule, /cron, /jobs, /tasks routes; no scheduler execution history | MISSING | interop-audit-2026-09-13.md:101 (no routes); continuity-audit-2026-09-13.md:21 (no execution history anywhere). |
| 17.17 | No run_id instrumentation anywhere | MISSING | continuity-audit-2026-09-13.md:53 is a proposal only; zero occurrences in drift-sources, gateway-hardening, ping-overnight outside the harvest spec. Blocks the L2 trace and the typed nested Run trace. |
| 17.18 | /env.mission-control tracked env config (contents not read) | EXISTS | worktree-architecture-spec.md:19,156,190,205 (flagged for secrets audit). Exists on disk in the brainos tree; contents deliberately not read in this pass. |

### C-4. Corrections to the prior spec's citations
- **C-1 (path correction):** prior spec sec 16 and A-18 cite "tandem runs.jsonl" / "shared runs.jsonl". The file found on disk is `goals/ping-social-outreach-campaign/hidden_files/meta-ai-intel/runs.jsonl`. No runs.jsonl exists at `tandem/`. The ledger exists; the cited path was imprecise.
- **C-2 (unverifiable citation):** prior spec R-5 cites `census-2026-09-13.md:56` for the "/mc/* (unpaid invoices, inboxes, queues, follow-ups)" enumeration. No census-2026-09-13.md exists anywhere under /home/hatch/workspace. See R-8.
- **C-3 (unverified number):** prior spec P-16 says the site repo has "21 uncommitted files". HOMEPAGE_REPORT.md says only "All work uncommitted"; the number 21 was not found in the report or in scope. Treat the file count as unverified, not as a fact.
- **C-4 (no disagreement):** TASK_FAILED, which a surface read of the prior spec might leave un-cited, is in fact evidenced (python-prod/REPORT.md:71-78; EXECUTION_CONTRACT.md:194-196). The sec-17 EXISTS row for it stands.

---

## PART D. NEW CONTRADICTION RECORDS

**R-7. tenant.ping.v1.json does not exist on disk.** MEMORY.md references "tenant.ping.v1.json is the identity authority" as the tenant-configuration boundary. `find` across /home/hatch/workspace returns no such file; grep hits only self_improvement memory reconciliation snapshots, not a config file; `tandem/tenant-os-trace-2026-09-14.md` and `agents/training/tenantos-context-pack.md` contain no "tenant.ping.v1" string. If the file exists under /home/nolan (unreachable from here), this harvest cannot verify it. Net: treat tenant.ping.v1.json as DIRECTION, not as an existing authority file. Any tenant UI or tenant-configuration work built on the assumption that the file exists is building on an unverified premise.

**R-8. R-5's second source is unverifiable in scope.** Prior spec R-5 cites `census-2026-09-13.md:56` for "/mc/* (unpaid invoices, inboxes, queues, follow-ups)". No file named census-2026-09-13.md exists under /home/hatch/workspace (find, maxdepth 3 and full grep, zero hits). The interop-audit-2026-09-13.md:85 enumeration (queues/scheduler/workers reads) stands alone as verifiable. The invoices/inboxes/follow-ups enumeration must be treated as unverified until a reachable copy of the census document is produced. Practical effect: there is still no single authoritative /mc/* route listing in scope.

**R-9. The read-only/event-only posture is a UI projection contract, not a gateway property.** R-2 recorded the drift-source comment "Mission Control navigates these via events/queues, not CRUD" against the existing write endpoints (POST /missions auth'd, /orchestration/missions unauth'd, interop-audit:101). This pass deepens it: because the gateway DOES expose mission creation (including one unauthenticated path), any Mission Control UI must be built to the stricter projection contract (no writes through the UI; approvals/retries/wakes dispatch through MissionRuntime/ExecutionAuthority policy, never around it). The read-only claim constrains the future UI, not the existing gateway.

**R-10. Maturity taxonomy mapping.** The prior pass graded artifacts with EXISTS/PARTIAL/SPEC_ONLY/PROTOTYPE/DEAD/DUPLICATE/UNKNOWN; this pass was required to use PROVEN/BUILT_NOT_LIVE/EXPERIMENTAL/DIRECTION/UNPROVEN. The mapping applied: artifacts that have run against real data = PROVEN; built but not running or not proven live = BUILT_NOT_LIVE; live but with unreliable or test-scope-only data = EXPERIMENTAL; named or spec'd with no implementation = DIRECTION; frozen legacy or unverifiable = UNPROVEN. No prior finding was silently relabeled; the per-surface rows above show the mapping explicitly.

---

## PART E. SUMMARY COUNTS

### Surfaces by maturity (20 rows, Part B)
| Maturity | Count | Surfaces |
|---|---|---|
| PROVEN | 5 | B-3 automation health machinery; B-9 operator/admin surfaces; B-10 runtime dashboards (/ops JSON); B-11 governance surfaces (JSON); B-17 campaign/social control surfaces |
| BUILT_NOT_LIVE | 3 | B-1 Mission Control /mc/* REST; B-6 public website (homepage + truth matrix); B-7 standalone public frontend (site repo) |
| EXPERIMENTAL | 2 | B-4 ORCA dashboard (live, synthetic data; do not build on); B-14 artifact/evidence views (test-scope chain, no UI, conformance gap open) |
| DIRECTION | 9 | B-2 Control Panel (name only); B-5 Oracle read-only window (spec); B-12 event views; B-13 mission views; B-15 worker/execution views; B-16 knowledge graph UI; B-18 approval UIs; B-19 quarantine UIs; B-20 scheduler UIs |
| UNPROVEN | 1 | B-8 HPP references (legacy, frozen) |

### Requirements by classification (38 rows: 20 sec-16 + 18 sec-17)
| Classification | Count | Rows |
|---|---|---|
| EXISTS | 9 | 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7, 17.8, 17.18 |
| PARTIAL | 17 | 16.1 through 16.20 except 16.3, 16.15, 16.19 (all 17 remaining) |
| MISSING | 12 | 16.3 (run trace/run_id), 16.15 (knowledge graph projection), 16.19 (cost capture); 17.9 (namespace ACLs), 17.10 (POST /knowledge/nodes drop), 17.11 (SNIPPET_APPROVED maps), 17.12 (REPLAY_VERIFY direct), 17.13 (TRUNCATE trigger), 17.14 (/ops/status 500, /constitution/graph 503), 17.15 (GET /capabilities 404), 17.16 (no scheduler routes/history), 17.17 (no run_id) |
| LEGACY | 0 | - |
| SYNTHETIC | 0 | - (synthetic-data finding lives at surface level: B-4/R-1, not as a requirement row) |
| DUPLICATE | 0 | - |
| UNKNOWN | 0 | - |

**Net new findings this pass:** 4 new contradiction records (R-7 tenant.ping.v1.json absent; R-8 census source unverifiable; R-9 read-only posture is a UI contract not a gateway property; R-10 taxonomy mapping). 4 citation corrections (C-1 runs.jsonl path; C-2 census citation; C-3 "21 uncommitted files" unverified; C-4 TASK_FAILED citation supplied). All 8 brief-named facts verified: 7 CONFIRMED, 1 CONFIRMED ABSENT (tenant.ping.v1.json, stated plainly).
