# UI HARVEST SPEC
**Date:** 2026-09-17
**Pass type:** read-only UI/UX architecture archaeology across the PING system. No files modified, no git operations, no credentials exposed.
**Scope searched:** /home/hatch/workspace: ping-overnight/ (top reports + 18 subdirs), ping-arch-audit/, orchestration/, gateway-hardening/, ping-migration/, INTEGRATION.md/A1/A2, discovery-2026-09-12-read-routes-defects-event-count.md, orca-omniroute-audit-2026-09-13.md, pig/, outreach/, pig-fb/, tandem/, ping-content/, homepage-harvest-drafts/, marketing-intel/, goals/ping-social-brand-launch/, goals/ping-social-outreach-campaign/, goals/facebook-page-unfollow-cleanup/, goals/instagram-mass-unfollow/, goals/ping-gateway-exterior-agent-integration/.
**File counts:** ~777 files grepped in the core-repo scope, ~2,349 files swept in the workspace scope, ~50 directories listed, ~60 documents read substantially. (Details at end.)
**Note:** /home/nolan/ping and /home/nolan/projects/ping do not exist on this machine. All repo-file line references below are evidence captured earlier by live Pig reads into the searched artifacts (file + line cited).
**ID scheme:** A-## = automation/workspace ideas (from the outreach/workspace archaeology), P-## = platform/core ideas (from the core-repo archaeology), X-## = external harvested patterns (from the external research pass). Status values: EXISTS, PARTIAL, SPEC_ONLY, PROTOTYPE, DEAD, DUPLICATE, UNKNOWN.
**Writing rule observed:** no em dashes anywhere in this document.

## Canonical authority map (UI derives from these; UI never invents authority)

| Concern | Owner | UI relevance |
|---|---|---|
| Canonical event identity | CanonicalizationService + sha256 formula | event identity rendering |
| Event store | UnifiedEventRuntime over ping_events (append-only by live trigger) | event timeline, correlation |
| Mission lifecycle | MissionRuntime + MissionScheduler over ping_missions | mission list/detail, runs |
| Worker execution | WorkerRuntime + worker map | execution detail |
| Exterior-agent invocation | ExternalAgentAdapter.authorizeWorkOrder (isolated, not yet wired into MissionRuntime) | exterior agent views |
| Capability decisions | CapabilityAuthority.authorize() (live container) / registry | capability console |
| Knowledge | KnowledgeGraph + KnowledgePromoter | knowledge/dossier views, approval gate |
| Replay | DeterministicReplayEngine + ReplayWorker | replay UX |
| Witness | witness worker (WITNESS_CREATED) | proof UX |
| Lineage | lineage worker | lineage chain walker |
| Projection | projection event path | all read surfaces |
| Dead letters | DeadLetterAuthority + repository_dead_letters | terminal-failure browser |
| Automation classification | automation resilience program (pass-classifier, recovery-budgets) | health cockpit |

---

## 1. Existing PING UI surfaces

Surfaces that exist and run today (read the evidence citations; duplicate inventories from independent workers are marked DUPLICATE once, not merged silently).

**A-01. Daily automation health report (chat-delivered dashboard).** Source: `/home/hatch/workspace/outreach/automation-health-report.sh` (full file, ~380 lines); design doc `/home/hatch/workspace/ping-overnight/AUTOMATION_RESILIENCE_2026-09-17.md` sec 5. Strictly read-only, always-exit-0 generator. Emits per-platform sections (FACEBOOK, INSTAGRAM, THREADS, TIKTOK, X) with enumeration status, strategy/caps, actions with reason, next run; UNFOLLOW section; META AI + PING PIPELINE (reconcile gaps, capture-failed artifacts); INTENT LEDGER (open intents without terminal outcome); SYSTEM (enabled/disabled crons, CAPABILITY=BLOCKED markers). Restriction detection runs in two tiers (hedged vs unhedged signals). Status: EXISTS. Cron `automation-health-report` daily 07:30 America/Denver, owner goal:ping-social-outreach-campaign, first run 2026-09-17 07:30 MDT. Backend authority: none, it is a reader over logs/ledger/reconciliation/cron state. Primary user: Nolan.

**A-02. Universal empty-pass classifier (the "why did nothing happen" card).** Source: `/home/hatch/workspace/pig-fb/pass-classifier.js` (header + CLASSES, lines 1-60). Ten terminal classes: SUCCESS_ACTION, SUCCESS_EMPTY, ENUMERATION_FAILURE, ELIGIBILITY_EMPTY, DEPENDENCY_FAILURE, AUTH_FAILURE, SURFACE_DRIFT, RATE_LIMIT, TEMPORARY_FAILURE, TERMINAL_FAILURE. Zero-result suspicion: candidatesFound==0 and historicalBaseline>0 can never classify SUCCESS_EMPTY. Suspicion levels 0-4 (quarantine the surface after 3 consecutive enumeration failures). Every result returns {class, explanation, suspicionLevel, recommendedAction} with a human-readable sentence. Status: EXISTS (27/27 self-test). Consumer: worker scripts + Nolan.

**A-03. Capability/strategy registry console.** Source: `/home/hatch/workspace/pig-fb/capability-registry.json` (full; header: "This registry is a discovery projection, not an authority. The driver scripts define what each strategy actually does; if this file drifts, the implementations win."). Capability to strategies[] with health (good/degraded/broken/unknown), healthScore 0-100, lastSuccess, observedCount, confidence, preferred, notes. Negative knowledge is first-class (e.g. profile-page-following: health broken, observed 0 on 2026-09-17, kept as negative knowledge). Fallback rule: on unexpected zero, try the healthiest non-preferred strategy before declaring ENUMERATION_FAILURE. Status: EXISTS (v1.0.0, first entry enumerate_followed_pages).

**A-04. Recovery budgets governing rule.** Source: `/home/hatch/workspace/pig-fb/recovery-budgets.json` (full, v1.0.0; header: "This file is the governing rule for all recovery budgets; cron task bodies reference it rather than restating numbers."). Per-class budgets: authentication max 2 attempts to AUTH_FAILURE quarantine; browser_recovery max 2 to DEPENDENCY_FAILURE; enumeration max 3 alternate strategies to ENUMERATION_FAILURE quarantine; rate_limit backoff 5m to 10m to 20m to 24h quarantine. Global rules: budgets quarantine ONLY the affected surface; every outcome classified with the universal classifier. Status: EXISTS (wired into 5 cron bodies via cron.update 2026-09-17).

**A-05. Discovery/action truth funnel (per-run).** Source: `/home/hatch/workspace/outreach/action-truth-README.md` (full); `/home/hatch/workspace/outreach/action-truth.jsonl`; `/home/hatch/workspace/outreach/action-truth-append.py`. Independent append-only per-run record: ts, run_id, platform, operation, source, monotone funnel discovered >= eligible >= selected >= attempted >= succeeded (verified <= succeeded; failed <= attempted), classification (A-02 vocabulary), notes. "Every automation run appends exactly one record, even when it did nothing." Explicitly NOT PING canonical intelligence (Nolan's PING intelligence boundary). Status: EXISTS (seeded with 5 verified 2026-09-17 records).

**A-06. Enumeration verification pipeline (stage UI).** Source: `/home/hatch/workspace/pig-fb/enumeration-verify.js` (per AUTOMATION_RESILIENCE sec 1). DISCOVER to ENUMERATE to VERIFY ENUMERATION to PLAN to EXECUTE to VERIFY EFFECT to RECONCILE. Health signals: expectedPopulation, discoveredPopulation, discoveryDeltaVsPrevious, enumerationConfidence, surfaceFingerprint, selectorDrift, actionableCandidateCount, executionCount, postActionVerificationCount. Never throws; always reaches RECONCILE. Status: EXISTS.

**A-07. X adaptive tier record / seed tiers.** Source: `/home/hatch/workspace/pig-fb/x-tier-record.py`, `x-tier-state.json`, `x-seed-ids.json` v2. Per-tier tracking (candidate yield, eligibility rate, engagement yield, action yield, last successful candidate, last useful pass), 60-entry history tail. Tiers: Tier 1 = 15 verified Nolan-followed seeds; Tier 2 = DRAFT/INACTIVE (@karpathy, @lexfridman, @emollick, user IDs null, never auto-activate); Tier 3 = TBD. Adaptive gate: 4h cadence at 0-1 consecutive empties, 12h at 2-4, 24h at 5+; any landed action restores 4h. Distinct empty states: NO_CANDIDATES, NO_ELIGIBLE_CANDIDATES, CANDIDATES_BUT_ALL_BLOCKED, CANDIDATES_BUT_ACTION_FAILED, RESTRICTION_HALT, USEFUL_PASS. Status: EXISTS.

**A-08. Engagement guard (mechanical eligibility boundary).** Source: `/home/hatch/workspace/outreach/engagement-guard.py` (docstring lines 1-45). Never-re-engage as mechanical boundary: classifies candidates ELIGIBLE / ALREADY_ENGAGED / BLOCKED / UNKNOWN-UNCHECKABLE against durable history (markdown logs authoritative; derived index rebuilt by sha256). Subcommands: check, filter (eligible-only + pass manifest + audit line), record, verify (post-pass violation check), rebuild. Fail-closed exit 3 on unreadable history. Decisions logged to `goals/ping-social-brand-launch/hidden_files/engagement-passes/engagement-guard-decisions.jsonl`. Status: EXISTS.

**A-09. Action-intent ledger lifecycle.** Source: `/home/hatch/workspace/outreach/action-intent-ledger.py` (docstring, lifecycle ~lines 1-60); crash-proof note `/home/hatch/workspace/outreach/intent-crash-proof-2026-09-14.md`. Intent made durable BEFORE any browser action. Record types: intent (stage ACTION_INTENT_DURABLE) to execution (before delivery) to observation (terminal) to FINALIZATION. Terminal states: EXECUTED / FAILED / NOT_ATTEMPTED / UNKNOWN_EXECUTION (never silently retried, never auto-reconciled). Append-only JSONL; torn tail fails closed until operator inspects. Note: 378 open intents with no terminal outcome as of 2026-09-17. Status: EXISTS (store exists; viewer missing, see P-13).

**A-10. Engagement pass log sections.** Source: `/home/hatch/workspace/outreach/facebook-engagement.md`, `instagram-engagement.md`, `threads-engagement.md`, `x-engagement.md`, `tiktok-engagement.md` (headers/log conventions). Dated pass sections: likes with handles+URLs, verbatim comments+URLs, skips+why, anomalies; guard filter lines. The logs are both history and the guard's source of truth. Status: EXISTS.

**A-11. Research job envelope.** Source: `/home/hatch/workspace/pig-fb/new-job.sh`, `meta-pass.sh`; design: `/home/hatch/workspace/tandem/DELEGATION-ARCHITECTURE.md` sec C; `/home/hatch/workspace/tandem/interop-audit-2026-09-13.md` sec 3 (lines ~110-190). Structured job envelope `<run_id>.job.json`: job_id, mission_id, initiator, auth ref, objective, expected output. meta-pass.sh = 8-stage worker: pack build, prompt assembly, CDP preflight, scp, remote node, scp pull-back, validation, sidecar + JSONL ledger, retention sweep. Exit 0/2/3 with stable classifications. TASK-first prompt ordering. Status: EXISTS.

**A-12. Research brief lifecycle + quarantine.** Source: `/home/hatch/workspace/tandem/brief-lifecycle.py`; `/home/hatch/workspace/tandem/contracts/quarantine-record.schema.json`; `/home/hatch/workspace/tandem/quarantine/c-review-complaint-signals.json`. Lifecycle PENDING to RUNNING to VALIDATING to COMPLETE / VALIDATION_FAILED to RETRY to TERMINAL_FAILURE to QUARANTINED. RETRY_LIMIT=3 consecutive contract rejections (~18h). `--check` emits human-gated recommendations, never auto-quarantines. Quarantine record: quarantined_at, approved_by (Nolan explicit), reason, consecutive_failures, retry_budget, attempts[]. c-review-complaint-signals: 5 consecutive rejections, 20 artifacts preserved, retry-eligible 2026-09-24, lift requires Nolan. Status: EXISTS (CLI; no board UI).

**A-13. Research contract validator (machine-checkable gate).** Source: `/home/hatch/workspace/tandem/validate-research-contract.py`; `/home/hatch/workspace/tandem/contracts/c-review-complaint-signals.json`; `/home/hatch/workspace/tandem/validate-meta-answer.py`. One contract file renders the prompt_block AND drives the validator (single source of truth, wired into meta-pass.sh as gate 4b). Min 3 VALID; exit 0 PASS / 3 REJECTED / 2 infra; fail closed. Classification vocabulary: VALID, INSUFFICIENT_EVIDENCE, OUT_OF_GEOGRAPHY, DUPLICATE, STALE_REVIEW, WRONG_TRADE, WRONG_SIGNAL, BUSINESS_NOT_VERIFIED, CONTRADICTED (precedence ordered). Status: EXISTS.

**A-14. Verification gate + PING emission (human approval UI pattern).** Source: `/home/hatch/workspace/tandem/mark-verified.sh`; `/home/hatch/workspace/tandem/emit-observation.py`; procedure in `/home/hatch/workspace/goals/ping-social-outreach-campaign/files/ping-social-operations-manual.md` sec 16o. LEARN-phase distillation: sweep proposes 0-3 generalizable observations as `learn-<sweep-id>.md` + provenance sidecar to runs.jsonl line to verification gate (human or authorized gate, never automatic; `mark-verified.sh --by "outreach-engine round-N"`) to emit-observation.py POSTs OBSERVATION_CREATED (fail-closes without verified transition; Bearer resolved at runtime from gateway container env, never stored) to sidecar accepted_by_ping. Orphaned evidence: 11 capture-failed meta-ai artifacts on disk (2026-09-17). Status: EXISTS (procedure + scripts).

**A-15. Versioned context pack builder.** Source: `/home/hatch/workspace/tandem/build-context-pack.py`; pack cache `tandem/.pack-cache/`; prompts `tandem/prompts/`. Builds compact versioned packs from source artifacts (pitch positioning, AGENTS.md geography, JSONL coverage as negative signals); version = sha1(pack)[:10]; idempotent cache. Pack carries OBJECTIVE/CONTEXT/OUTPUT CONTRACT sections. Status: EXISTS.

**A-17. Outreach operating loop (the campaign control chain as it actually exists).** Source: `/home/hatch/workspace/goals/ping-social-outreach-campaign/files/ping-social-operations-manual.md` sec 16c (lines 245-247). SWEEP to DISCOVER to VERIFY to ENRICH to CLASSIFY to IDENTIFY OPPORTUNITY to SCORE CONFIDENCE to CHECK SUPPRESSION to SELECT BEST ELIGIBLE ACTION to PERSONALIZE to OUTREACH/CONTENT/WATCH to RECORD OUTCOME to LEARN to NEXT SWEEP. "Every stage transition is observable: per-row in the JSONL fields, per-sweep in the structured run line (16m)." Note: the literal chain "Goal to Audience to Intent to Campaign to Agents to Content to Channels to Actions to Results to Evidence to Next strategy" was NOT found verbatim anywhere searched; this operating loop is the closest real artifact. Status: EXISTS (engine runs it every 3h).

**A-18. Sweep output structured run ledger.** Source: operations manual sec 16m (lines ~261-263); `/home/hatch/workspace/outreach/append-sweep-run.py`; hidden_files/sweep-<UTC-date>-round<N>.md. Per-sweep summary (NEW SIGNALS, FOLLOW-UPS, OPPORTUNITIES, SOCIAL INTELLIGENCE, SEO-AEO, HOT PROSPECTS, SUPPRESSED, LEARNING) + ONE structured JSONL line in shared runs.jsonl with per-stage counts (signal, research, candidate, validated, verified, prospect, outreach_sent, outreach_submitted, outreach_dm, responses, declines, bounces, followups, conversions, evidence_observations, ping_emitted) + evidence refs. "Every stage transition is derivable from the record without parsing prose." Status: EXISTS.

**A-19. Social content queues.** Source: `/home/hatch/workspace/ping-content/queue.json` (full); `/home/hatch/workspace/outreach/content-queue.md` (full). FB Page queue.json: items with image, pig_image_path, caption, posted true/false, posted_at; `post_next.py` selects first unposted item, posts via page-post.js on Pig CDP, marks posted=true on success. content-queue.md: ranked topic queue (pattern seen, times seen, PING angle, status); ranked by real-signal frequency; "NOT auto-published. Nolan decides what gets made." Status: EXISTS.

**A-20. Sunday post decision record (decision-record UI pattern).** Source: `/home/hatch/workspace/ping-content/sunday-post-decision-2026-09-14.md` (full, ~120 lines). Decision record template: business context, candidates considered, evidence, PING references (deterministic lookup over accepted events, honest zero), the decision (POST/DEFER/RESEARCH MORE), reason, stated uncertainties, intended capability. Execution-time step: worker writes sunday-post-execution-<date>.md with explicit verdict before posting; DEFER/RESEARCH MORE stop after writing the record. Status: EXISTS (decision recorded 2026-09-14 for 2026-09-20 post; execution path pending).

**A-21. X qualified action queue (doctrine ladder).** Source: `/home/hatch/workspace/goals/ping-social-brand-launch/files/x-qualified-action-queue-2026-09-13.md` (full). Per-candidate queue with interaction ladder OBSERVE ONLY / LIKE / FOLLOW / COMMENT, per-person rationale, governing question ("smallest interaction that creates the greatest legitimate relationship or information value"), follow-slot budgeting. Abstention is a first-class decision with a recorded reason. Status: EXISTS (2026-09-14 batch of 5 follows executed and verified; 2026-09-15 entrepreneur batch 13 queued via pig-fb/x-follow-queue.txt).

**A-22. X relationship ledger.** Source: `/home/hatch/workspace/goals/ping-social-brand-launch/files/x-relationship-ledger-2026-09-13.md` (full). Tracks every interaction decision incl. abstentions (with reasons). Tables: follows executed (date/handle/rationale/result), follow queue, abstentions, like-eligible, comments (gated: "Two gates closed: no canonical knowledge objects to ground a contribution, autonomous comments off by Nolan's standing rule"). Killer metric: "Relationships or opportunities created that would probably not have happened without PING: 0 so far. Counting from first execution." (honest negative evidence). Status: EXISTS.

**A-23. Marketing intelligence arbitrage queue (experiment queue UI).** Source: `/home/hatch/workspace/marketing-intel/arbitrage-queue.md` (head; Q1-Q3+). "The cheapest reproducible implementation of each discovery, as queued experiments." Each Q: discovery ref, route, client-side cost, eligibility, compliance design (non-negotiable), pre-registered falsification metric, kill threshold, thin-moat note, Nolan-hours setup/month. Binding rules: every experiment states Nolan-hours/month; no lead-gen experiment pitches a client before the Business Agent runs demand-vs-capacity check; nothing starts without Nolan-visible decision or standing authorization; all reversible. Status: EXISTS (queued, none started without authorization).

**A-25. Competitive scoreboard.** Source: `/home/hatch/workspace/marketing-intel/scoreboard.md` (full). "Internal. Populated from evidence only. Every populated cell cites its source. Every unpopulated cell says UNKNOWN. No fabricated scores." Columns: Capability | Local market maturity | Best observed | Our capability | Gap | Opportunity. "New evidence changes cells; enthusiasm does not." Status: EXISTS.

**A-26. Prospect record / pipeline UI (unified business record).** Source: operations manual sec 16a-16j; `/home/hatch/workspace/outreach/pipeline.md`; prospect JSONL + `your_files/prospect-digest.md` (rebuilt per sweep); `prospect-source-of-truth.md`; `prospect-schema.json`. Canonical JSONL row: identity columns + 21 intelligence columns (intel_updated, website_quality, booking_mechanism, missed_call_risk, social_presence, review_velocity, notable_reviews, new_filing_signal, stack_signals, opportunity_primary/secondary/evidence/confidence, ai_discoverability, priority_state, last_signal, suppression_state, next_eligible_action, conversion_state/at/evidence). Priority states: HOT/WARM/WATCH/SUPPRESS. Opportunity engine enums (NEW_BUSINESS_SETUP, MISSED_CALL_LEAD_CAPTURE, WEBSITE_REVAMP, SEO, AEO_AI_DISCOVERABILITY, SOCIAL_PRESENCE, AUTOMATION, INTEGRATION, UNKNOWN). known-to-inferred-to-unknown hard rule; stack grades CONFIRMED/STRONG INDICATION/WEAK INDICATION/UNKNOWN. 300-active quality cap (archive, never delete). Status: EXISTS.

**A-27. Follow-up ladder + triggers.** Source: operations manual sec 15a-15c (lines 204-227); `/home/hatch/workspace/outreach/follow-ups.md`. Every SENT email/DM gets up to 2 follow-up touches (day 4-7 bump, day 10-14 final angle with easy out), counted inside the 10/UTC-day email cap, priority over new cold sends; max 3 touches, never chase a no. New-business radar (SOS filings 60-90 days, chamber lists, grand-opening posts, tagged NEW). Review-triggered outreach (2-star or fewer, or 3-star mentioning phone/response/wait, to tailored same-week message, never the reviewer; max 1 per business per 90 days; suppressed during active ladder). Status: EXISTS.

**A-28. Angle performance closed-loop learning.** Source: `/home/hatch/workspace/outreach/angle-performance.md`; operations manual sec 16l; `learnings.md`. Rolling tally of signal to angle to channel to response to outcome. "Optimize toward qualified conversation to meeting to customer to revenue, never opens/clicks/follows." Empty distills recorded as skipped with reason. Status: EXISTS.

**A-51. Meme object schema (presentation layer over evidence).** Source: `/home/hatch/workspace/marketing-intel/meme-objects/SCHEMA.md` (full); `compose_meme.py`; `meme-drafts.json`; `meme-objects/patterns/`. "The meme layer is a presentation layer over canonical evidence, never a source of truth." Five-layer chain: Observation to Evidence/receipt to Business implication to Verified opportunity to Joke/meme (object does not validate if any layer missing). Families: MARKETING_CIRCUS, SAAS_STACK_GRAVEYARD, AGENCY_MAGIC_TRICK, PING_RECEIPT (default). Fields: id, family, status (draft/approved/queued/posted), observation (pattern-level, never named business), receipt (evidence list, sources, grade OBSERVED/INFERRED/VERIFIED), implication, opportunity, joke, drafts, no_named_business (validator scans business-names.txt), approved_by + date. Status: EXISTS (draft objects; status machine draft to approved to queued to posted).

**A-53. PING Receipt format (evidence receipts).** Source: `/home/hatch/workspace/marketing-intel/meme-objects/receipt-cam.md` (head); `distribution-strategy.md` sec 1 ("Receipts Before Punchlines"). Recurring format, five beats: CLAIM (quoted public promise) to RECEIPT (observed customer journey, evidence refs + grade) to FINDING to CLOWN to OPPORTUNITY. "The receipt makes the joke credible." 1 LIVE receipt/day for 5 days, each approved individually; receipt-cam capture from Pig browser; human approval; no auto-tagging. Status: EXISTS (format documented, edition #1 filled from real evidence: "24/7 Promise").

**A-54. Competitive tech map / capability map / discoveries.** Source: `/home/hatch/workspace/marketing-intel/competitive-tech-map.md`, `capability-map.md`, `discoveries.md`. Evidence-graded intel maps (site tech OBSERVED/INFERRED), challenge-report falsification discipline (required revisions R1-R5 per finding). discoveries.md D3 (line 146): "The review machine is a trigger and a log, not a $399 dashboard." Status: EXISTS.

**A-61. Entity dossier projection.** Source: `/home/hatch/workspace/tandem/entity-dossier.py` (docstring); `/home/hatch/workspace/tandem/knowledge/entity-index.json`, `knowledge/dossiers/*.json`. Derived, rebuildable projections answering per entity: what we know / why we believe it / what changed / connections / what opportunity or decision follows, with source refs per claim. Edge rules: every relationship edge carries provenance or is classified "inferred"; normalized-name matches are "inferred", never silently promoted; distinct spellings stay distinct dossiers unless explicit same_identity edge with provenance. Status: EXISTS (projection builder + JSON dossiers; no HTML viewer).

**A-63. Cron bodies as executable specs (goal-owned scheduler).** Source: `/home/hatch/workspace/goals/ping-social-outreach-campaign/crons/` (daily/hourly/runonce .md files, frontmatter id/kind/every/time/enabled/owner). The cron body IS the executable spec (per `tandem/capability-inventory-2026-09-14.md` line 8: six outreach-campaign cron bodies). Scheduler resilience sections (hard non-blocking rule, budget refs, universal classification, yield-driven cadence) embedded in 5 cron bodies via cron.update 2026-09-17. Status: EXISTS. See contradiction R-4 (file state vs live scheduler state).

**A-65. Reconciliation report + LATEST.json (gap states UI).** Source: `/home/hatch/workspace/tandem/reconcile.py`, `reconcile-run-report.sh`, `reconciliation/LATEST.json` (per capability-inventory rows; referenced in the health report). Timestamped reconciliation reports + refreshed LATEST.json with typed gap vocabulary: NOT_REQUIRED, NOT_RUN, SKIPPED, FAILED, BLOCKED, NO_VALUE, DEGRADED. "Same gap in 3 consecutive reports becomes visible." STAY-ON rule: failed probe records UNCHECKED, never disables the watchdog. Status: EXISTS.

**A-66. Scheduler tick-gap detection (R7 SCHEDULE).** Source: `/home/hatch/workspace/tandem/loop-health-audit-2026-09-14.md` lines 100-106 (Repair 2). Reconcile pass derives expected tick times since previous report for meta-ai-intel-pass (6h anchor) and outreach-engine (3h anchor), confirms each has a scheduler run record, appends any missing tick as rule R7 step SCHEDULE state GAP. "Quiet on a single gap; the three-consecutive rule surfaces a persistent one." Status: EXISTS.

**A-68. Pig capabilities machine contract.** Source: `/home/hatch/workspace/pig-fb/pig-capabilities.json` (v1; per AGENTS.md: consumer contract research.ask, research.context, artifact.write/read, browser.status, validation.run, retention.sweep, job.record; versioned; consumer is Muse, not Meta AI). Status: EXISTS (versioned).

**A-70. Yield-driven cadence controls.** Source: `/home/hatch/workspace/ping-overnight/AUTOMATION_RESILIENCE_2026-09-17.md` sec 5; cron bodies (SCHEDULER RESILIENCE sections). 3 consecutive genuine-empty passes to LIGHT MODE half-breadth discovery; 5 to one-step interval stretch (max 12h, reversible via cron.update); any landed action to instant restore. "Failures never drive cadence (only verified-healthy genuine empties count; the IG/Threads wedge streak is DEPENDENCY_FAILURE so it cannot stretch intervals)." Status: EXISTS.

**A-72. Daily architecture review pass (proposal UI).** Source: AGENTS.md: "a daily architecture review pass that reads machine state (reconciliation reports, gap patterns, cron health) and proactively PROPOSES concrete improvements. Improvement proposals ARE surfaced to Nolan (unlike routine healthy status, which stays quiet)." Cron `ping-architecture-review` daily 06:21. Proposal format: concrete and actionable, not a status essay. Status: EXISTS (scheduled).

**P-01. /ops/dashboard + /ops/system system dashboard.** Source: `/home/hatch/workspace/discovery-2026-09-12-read-routes-defects-event-count.md` sec A table ("`/ops/dashboard (ops.js:82), /ops/system (ops.js:110)`"); `/home/hatch/workspace/goals/ping-gateway-exterior-agent-integration/files/PHASE4_PIPELINE_COMPLETION_RECORD.md:37,92`. Returns `SystemAuthority.getSystemState()`: version, generated_at, containers[] (name, status, state, IMAGE, PrivatePort to PublicPort, uptime, created), git (branch, pending_changes, recent_commits), postgres (total_events, streams, event_types, oldest/newest), qdrant (collections, total_points), missions/replay counts, metrics (uptime_seconds, total_requests). Status: EXISTS (JSON API, verified live 200 on 2026-09-12/13; no HTML rendering, API only). Backend authority: SystemAuthority, UnifiedEventRuntime (ping_events), MissionRuntime (ping_missions). Permissions: public, read-only; classified SENSITIVE_PUBLIC (exposes image names, port maps, git branch/authors/messages).

**P-02. /mc/* Mission Control REST surface.** Source: `/home/hatch/workspace/tandem/interop-audit-2026-09-13.md:85` ("`/mc/*` (dashboard incl. queues/scheduler/workers reads)"); sec Scheduling:101 ("`/mc/scheduler` is status-read only; no `/schedule`, `/cron`, `/jobs`, `/tasks` routes"); `/home/hatch/workspace/goals/ping-gateway-exterior-agent-integration/hidden_files/audit-threads-2026-09-16/thread-handoffs.md:247,260` (cites `gateway/routes/mission_control.js:242`, required by DeadLetterAuthority and gateway bootstrap). Dashboard reads over queues, scheduler, workers; scheduler is status-read only; schedule creation does not exist as an endpoint. Status: PARTIAL (routes code-verified in Pig repo; JSON only, no HTML; write/scheduling ops absent). Backend authority: MissionRuntime (ping_missions), MissionScheduler, DeadLetterAuthority, WorkerRuntime. Permissions: public reads (per interop audit). See contradiction R-5 (route contents enumerated differently by two sources).

**P-03. ORCA ExecutionEngine dashboard.** Source: `/home/hatch/workspace/gateway-hardening/orig-engine.js:419-522` (generateDashboard()), :522 (printDashboard() console); `/home/hatch/workspace/gateway-hardening/orig-orchestration.js:13,230-241` (GET /orchestration/engine to "Engine dashboard"). Full JSON + console-print dashboard. Sections: repository, replay_coverage, certificates, constitutional_debt, capability_registry (workers idle/running, totalCapabilities, averageQuality), worker_states, events (total/recentPerMinute/byType), artifact_store, missions (total/pending/completed/failed/closureRate), merge_gate, velocity (closure/accept/efficiency rates). Status: EXISTS (JSON via GET /orchestration/engine, verified 200 unauth 2026-09-13; console via printDashboard); engine is live-but-orphaned (initialized at boot, disabled by decision, executor:null). Backend authority: ORCA ExecutionEngine (not the live spine; own private EventQueue, in-memory missions). Permissions: unauthenticated read. See contradiction R-1 (synthetic closure rates).

**P-04. ORCA engine report (dashboard + high-priority missions).** Source: `/home/hatch/workspace/gateway-hardening/orig-orchestration.js:241` (GET /orchestration/engine/report); `orig-engine.js:650-664` (getReport()). generateDashboard() plus high_priority_missions list; manual CLI entrypoint writes phase38_report.json (orig-engine.js:685-709). Status: EXISTS (JSON API). Same synthetic-data caveat as P-03.

**P-16. PING marketing homepage (harvest hierarchy).** Source: `/home/hatch/workspace/ping-overnight/website/HOMEPAGE_REPORT.md:21-36`; `/home/hatch/workspace/ping-overnight/PING_OVERNIGHT_2026-09-16.md:191`. 14 sections compressed into 10 beats: living-system hero (hero-evidence-card.tsx, timer-based replay w/ reduced-motion fallback), closed compounding loop /observe /remember /connect /act /prove (KnowledgeLoop component, BusinessGraph folded into Connect with "illustrative model, not live data" caption), /govern (honest OFF: IntelligenceWorker dormant), /prove (annotated captured event record w/ real IDs + ReplayEvidence component), /run (MultiRuntime component), /applied (build journal, changelog strip), /status (status strip, old roadmap folded in), contact CTA. Every claim carries maturity-label.tsx (Live/Built/Experimental/Direction/Unproven) with hover definitions and captured/as-of receipts. Status: EXISTS (site repo main @ f6386ee, 21 uncommitted files; dev server 200s; visual phone-width QA pending). Backend authority: none (marketing surface; receipts from ping_events/ping_missions captures).

**P-17. Website truth matrix (23-claim status board).** Source: `/home/hatch/workspace/ping-overnight/website/TRUTH_MATRIX.md` (columns: WEBSITE CLAIM | RUNTIME COMPONENT | SOURCE EVIDENCE | LIVE EVIDENCE | STATUS | REQUIRED PROOF); `HOMEPAGE_REPORT.md:80-92` (status table: Missions PARTIAL, IntelligenceWorker BLOCKED, replay BLOCKED, Oracle BLOCKED, playbooks BLOCKED, Codex/Hermes FALSIFIED, newsletter UNKNOWN). Claim-by-claim truth board with statuses PROVEN / BUILT_NOT_LIVE / EXPERIMENTAL / DIRECTION / FALSIFIED / UNKNOWN and explicit "required proof" per row. Mirrored byte-identical to research/website-truth-matrix.md in the site repo. Status: EXISTS (markdown board, uncommitted). Backend authority: audit evidence (live captures).

**P-19. Dead-letter store.** Source: `/home/hatch/workspace/goals/ping-gateway-exterior-agent-integration/hidden_files/audit-threads-2026-09-16/thread-handoffs.md:260` ("`gateway/dead_letter_authority.js:1-80` ('FAILED to DeadLetterAuthority to repository_dead_letters to Witness to Replay'; columns incl. retry_count, failure_reason, replayable BOOLEAN)"); `/home/hatch/workspace/ping-overnight/PING_TEN_HOUR_CONVERGENCE_2026-09-17.md:112` (MISSION_DEAD_LETTERED verified live: `3daa14285107788e` to `21a6af0b72a8cfeb...`, retries=2, exactly one DLQ record). Terminal-failure browser concept: missions that exhausted retries land in repository_dead_letters with retry_count, failure_reason, replayable flag, feeding Witness to Replay. Status: PARTIAL (store + authority + events verified live; no browser UI). Backend authority: DeadLetterAuthority, WitnessWorker, ReplayWorker.

## 2. Existing UI ideas by source

Grouped by where the idea lives. Status is repeated for scanability.

**Automation resilience program (Nolan directive 2026-09-17):** A-01 health report (EXISTS), A-02 pass classifier (EXISTS), A-03 capability registry (EXISTS), A-04 recovery budgets (EXISTS), A-05 action truth funnel (EXISTS), A-06 enumeration verification pipeline (EXISTS), A-07 X tier record (EXISTS), A-63 cron bodies as executable specs (EXISTS), A-65 reconciliation report (EXISTS), A-66 tick-gap detection (EXISTS), A-68 Pig capability contract (EXISTS), A-70 yield-driven cadence (EXISTS), A-72 daily architecture review (EXISTS).

**Engagement machinery:** A-08 engagement guard (EXISTS), A-09 intent ledger (EXISTS, viewer missing), A-10 engagement pass logs (EXISTS).

**Meta AI tandem research:** A-11 job envelope (EXISTS), A-12 brief lifecycle + quarantine (EXISTS, CLI only), A-13 contract validator (EXISTS), A-14 verification gate + PING emission (EXISTS), A-15 context pack builder (EXISTS), A-61 entity dossier projection (EXISTS, JSON only).

**Outreach campaign machinery:** A-17 operating loop (EXISTS), A-18 sweep run ledger (EXISTS), A-19 content queues (EXISTS), A-20 decision record (EXISTS), A-21 X qualified action queue (EXISTS), A-22 X relationship ledger (EXISTS), A-26 prospect pipeline (EXISTS), A-27 follow-up ladder (EXISTS), A-28 angle performance (EXISTS).

**Marketing intelligence:** A-23 arbitrage queue (EXISTS), A-24 client report template (SPEC_ONLY), A-25 competitive scoreboard (EXISTS), A-51 meme object schema (EXISTS), A-52 ranked queue scoring (SPEC_ONLY draft), A-53 PING Receipt format (EXISTS), A-54 competitive tech map (EXISTS).

**Homepage design harvest (competitive patterns, all SPEC_ONLY):** A-55 authority gradient slider, A-56 governance toggles with honest OFF, A-57 held action awaiting approval, A-58 published authority rulebook, A-59 evidence cards + no-fake-dashboard rule, A-60 knowledge loop spine with graph-as-canvas. Source: `/home/hatch/workspace/homepage-harvest-drafts/PING_HOMEPAGE_HARVEST.md` (H2, H4, H6, H8; lines ~307-360) and `PING_HOMEPAGE_REDESIGN_PLAN.md` (lines ~55-119, ~142-201). Unknown whether the inaccessible site repo implements any.

**Gateway read surfaces (Pig repo, captured evidence):** P-01 /ops/dashboard (EXISTS, JSON only), P-02 /mc/* Mission Control REST (PARTIAL, JSON only), P-03/P-04 ORCA dashboards (EXISTS, synthetic data caveat R-1).

**Convergence reports:** P-05 Oracle window three-level projection (SPEC_ONLY, sec 4), P-06 Event Explorer (SPEC_ONLY), P-07 mission-level dashboard on /ops/* (SPEC_ONLY), P-08 Decision Inspector (SPEC_ONLY), P-09 playbook approval human gate (PARTIAL, backend only), P-19 dead-letter store (PARTIAL), P-20 entity dossier viewer (PARTIAL, JSON only).

**PING Agent Network trajectory doc (roadmap through May 2027, ALL SPEC_ONLY):** `/home/hatch/workspace/goals/ping-social-brand-launch/files/PING_AGENT_NETWORK.md` lines ~44-60, ~370-400, ~440-560. A-32 lead capture, A-33 lead scoring/qualification (incl. BANT), A-34 follow-up automation/drip campaigns, A-35 scheduling and calendar, A-36 dispatch board + GPS tracking, A-37 estimate builder + proposal templates, A-38 invoice builder + payment processing, A-39 job costing + financial reporting, A-40 customer portal, A-41 mobile app for field workers, A-42 pricebook management, A-43 time and expense tracking, A-44 evidence ledger (every decision has an event trail; every claim has evidence; every audit produces a witness; append-only; witness roots signed), A-45 reputation system (reviews backed by job evidence; manipulation detected via lineage), A-46 operational memory dashboard (job history, customer timeline, technician performance, pricing intelligence, failure patterns; "searchable through verified projections"), A-47 campaign management (multi-channel, budget tracking/optimization, A/B testing, lead source attribution, ROI by channel; spend as immutable events; ROI replayable), A-48 network memory (industry benchmarks, regional pricing intelligence, best practices; consent-based sharing), A-49 agent registry + human authorization gates, A-50 AI concierge. Constitutional UI constraints in the same doc: dashboards and reports are PROJECTIONS, never truth authorities ("Deleting a dashboard must never destroy the underlying business records"); AI outputs tagged REASONING_ARTIFACT with _verified:false, blocked from business records until verification gates; human authorization gates for critical workflows.

**Website:** P-16 homepage (EXISTS), P-17 truth matrix (EXISTS).

---

## 3. Orphaned/unimplemented UI ideas

Ideas found in old specs, TODOs, abandoned branches, comments, design notes, agent prompts, or deliberately-parked/rejected states. None were dismissed; each is classified.

**A-16. A2A research-task state machine (RESEARCH_TASK_ASSIGNED).** Source: `/home/hatch/workspace/tandem/interop-audit-2026-09-13.md` sec 4 (lines ~200-230); `/home/hatch/workspace/tandem/DELEGATION-ARCHITECTURE.md` sec F. Standardized task states SUBMITTED/WORKING/INPUT_REQUIRED/AUTH_REQUIRED/COMPLETED/FAILED/CANCELED/REJECTED (A2A v1.0.0 evaluated). Status: DEAD by deliberate decision (MCP and A2A evaluated and rejected; RESEARCH_TASK_ASSIGNED deferred until a second genuinely different worker exists). The scheduler + brief rotation + sidecar already assign work; the JSONL ledger already records state. Archived, not an oversight.

**A-24. Client reporting template (one-page, decision-first).** Source: `/home/hatch/workspace/marketing-intel/client-report-template.md` (full). "Decision the report must answer: 'Should this capability stay on, be fixed, or be killed?' If the report cannot answer that, it is collecting vanity metrics." Per-period metrics table (missed calls, text-back rate, conversations, booked jobs, review requests, reviews gained, referral asks, reactivations, estimated revenue influenced with KNOWN/INFERRED marking), pre-period baseline (judged on DELTA), kill threshold in arbitrage-queue.md, red rows for annoyance/compliance events pause the pilot regardless of numbers. "One page. If it does not fit on one page, it is not a report, it is a dashboard. (See: the Marketing Circus.)" Status: SPEC_ONLY (no client pilot report produced yet). See contradiction R-1c.

**A-31. Control Panel (named concept).** Source: AGENTS.md engineering order ("then Control Panel/Mission Control/harvesting -> canonical backend"); MEMORY.md PING website section (same order). Named but undesigned; sits after production health, namespace ACL, and the three playbook wiring gaps. Status: SPEC_ONLY (name only). Naming tension: competes with Mission Control (P-02, P-05) without a stated distinction.

**A-52. Ranked live queue scoring system.** Source: `/home/hatch/workspace/marketing-intel/distribution-strategy.md` sec 2 ("Score Then Schedule"); source material: Meta AI brief k-clowning-distribution (UNVERIFIED external research, passed competitive_signal_pass gates). Score all drafts on evidence_quality x novelty x entertainment x market_relevance x actionable_insight; highest posts first; lowest stays draft until improved. Score refresh twice weekly; <=2 items move to queued per refresh. Success metric: drafts held back for lack of evidence. Status: SPEC_ONLY (DRAFT document: "Nothing here ships without Nolan's approval. No auto-publish, no auto-tagging, ever.").

**A-55 to A-60. Homepage design patterns.** Listed in section 2; all SPEC_ONLY; implementation status in the inaccessible site repo is UNKNOWN.

**A-64. Missing discovery projection for campaign crons (flagged gap).** Source: `/home/hatch/workspace/tandem/capability-inventory-2026-09-14.md` line 69. "The single smallest missing projection: a pig-capabilities.json-style discovery projection (versioned JSON, contract-tested like test-capabilities.py) for the six outreach-campaign crons and the tandem/skill-CLI script set, so 'which capability for X' outside the Pig substrate is answerable from a machine file rather than prose." Status: SPEC_ONLY (flagged as gap; "not authorized here", "not built"). Pattern to copy: A-03/A-68.

**A-67. Knowledge graph viewer.** Source: searched across all scopes; no graph UI/viewer found. `/home/hatch/workspace/tandem/knowledge/entity-index.json` is machine JSON (entity list for dossiers). The business-graph-as-canvas concept (A-60) is homepage design, not a product UI. Neo4j adapter referenced as EXPERIMENTAL (TRUTH_MATRIX). Status: UNKNOWN (no graph viewer found in scope).

**A-69. Facebook session watch (disabled).** Source: `tandem/capability-inventory-2026-09-14.md` row (facebook-session-watch, every 2h, DISABLED); cron file in crons/hourly/. Session liveness checks (browser task: signed-in vs login form; silent when healthy). Status: DEAD (deliberately disabled by standing exception; cloud FB login attempts likely triggered the 2026-09-13/14 account lock. "Facebook stays Pig-only.")

**A-71. Meta AI tandem interop surfaces (rejected).** Source: `interop-audit-2026-09-13.md` secs 4-5. MCP tools/list surface, A2A delegation with negotiation, OTel GenAI telemetry naming (adopted: gen_ai.agent.name etc. naming in ledger/future telemetry; no collector until a consumer exists). Status: DEAD (evaluated and rejected with reasons: MCP = ceremony for four shell scripts; A2A = overhead, JSONL ledger already records state). Notable: OTel naming adopted without building a collector.

**A-73. Orphaned fragments.**
- `e/f` prompt slugs in tandem/prompts exist as experiments but are ignored by next-brief.py rotation (capability-inventory line 23). Status: ORPHANED.
- `x-sweep.js..x-sweep4.js` are NOT the engagement pass entry point (read-only follow-curation sweep; nothing invokes them). Live entries: xapi.py + x-engage.sh. Status: ORPHANED/DEAD.
- Pig gateway watchdog (PigiGatewayWatch, every 5 min, probes /events: 401=healthy, 503+degraded to docker restart max 1/10min): EXISTS but unindexed in pig-capabilities.json ("implemented-but-not-indexed"). Status: EXISTS/unindexed.
- instagram-messages-cli DM capability: deliberately parked ("Nolan's not-yet"). Status: PARKED.
- Backlogs: 378 open intents in action-intent-ledger.jsonl with no terminal outcome (oldest 2026-09-14); 28 reconcile gaps in LATEST.json; 11 capture-failed meta-ai artifacts on disk. Status: EXISTS/backlog (surfaced as pre-existing conditions 2026-09-17).

**P-05. Oracle window: three-level read-only projection (L1/L2/L3).** Source: `/home/hatch/workspace/goals/ping-gateway-exterior-agent-integration/hidden_files/continuity-audit-2026-09-13.md` sec 3 step 4 (lines ~95-103). "The 'Oracle' window is a read-only projection over gateway GETs, not a new system." L1 Mission (human): GET /missions + GET /events/correlation/:id to status, progress, last event, "renderable as a static page or even a generated markdown digest hitting the gateway's public/auth'd GETs." L2 Execution trace: GET /events/:id/descendants|ancestors causal tree, run_id as filter. L3 Evidence: content-addressed artifacts linked via output_refs; raw bytes stay in files, hashes+pointers in events. Explicitly: "no continuity.db/agent_events.db; no new bus/scheduler/dashboard backend." Status: SPEC_ONLY. Backend authority: UnifiedEventRuntime (ping_events), MissionRuntime (ping_missions). Dependency gap: no run_id exists anywhere yet (missing instrumentation). See contradiction R-3c (name collision: "Oracle is Oracle Cloud infrastructure, not a UI" earlier in the same doc).

**P-06. Event Explorer.** Source: continuity-audit-2026-09-13.md:23 ("planned-but-unimplemented 'Event Explorer'"). Named but undesigned. Closest existing: dormant ExecutiveDashboard (console print). Status: SPEC_ONLY. Backend authority: UnifiedEventRuntime (ping_events).

**P-07. Mission-level dashboard on /ops/*.** Source: continuity-audit-2026-09-13.md sec 4 item 5: "A mission-level dashboard built on /ops/* must route around these" (the /ops/status 500 `fingerprint.generate is not a function` and /constitution/graph 503). Status: SPEC_ONLY. Backend authority: MissionRuntime, /ops route family.

**P-08. Decision Inspector.** Source: `/home/hatch/workspace/discovery-2026-09-12-read-routes-defects-event-count.md` sec B: "`docs/runtime_map.md:26` (future Decision Inspector, marked future)". Future inspector surface consuming /ops/status etc. Marked future in repo docs. No design captured. Status: SPEC_ONLY.

**P-09. Playbook approval human gate (PENDING_HUMAN queue).** Source: `/home/hatch/workspace/ping-overnight/playbook/PLAYBOOK_SPEC.md:6-8` ("Human-authority law: every playbook activation and every revision requires an explicit recorded approval... Production promotion is a human gate (Nolan) and stays closed"); :27-29 ("constitutional human-approval gate": KnowledgePromoter.handle() handles SNIPPET_APPROVED/AI_RESPONSE_ACCEPTED to status approved, confidence 1.0); `/home/hatch/workspace/ping-overnight/playbook/REPORT.md` sec Phase 13 (revision node `194a2b85bde957ed`, v1.1.0, `decision: PENDING_HUMAN`, `required_approver: Nolan Geske (human)`, `decided_by: null`); `/home/hatch/workspace/ping-overnight/website/TRUTH_MATRIX.md:24`. Approval queue UI concept: candidate to approved to active lifecycle, revision nodes gated on a named human approver. Backend logic VERIFIED live (promoter stats handled=1, approved=1; gate fired exactly once; revision gate correctly refused with zero approvals). Status: PARTIAL (events + promoter authority proven; NO UI surface exists; approvals are POSTed events only). Backend authority: KnowledgePromoter, KnowledgeGraph, EvidenceAuthority. Note: SNIPPET_APPROVED is in neither EVENT_MISSION_MAP nor MISSION_WORKER_MAP, so ordinary runtime cannot dispatch to the promoter (proven P0 wiring gap).

**P-10. Capability discovery projection viewer.** Source: pig-fb/pig-capabilities.json (v1, "discovery-projection, NOT authority"); tandem/capability-inventory-2026-09-14.md:64-69 (same text as A-64). Human/machine-readable capability browser: id, description, inputs/outputs, timeout, failure modes, implemented_by, idempotency. Status: PARTIAL (Pig substrate JSON exists with contract test pig-fb/test-capabilities.py; cron/skill coverage missing, human draft only).

**P-18. Gateway dashboard.js (archived).** Source: `/home/hatch/workspace/ping-migration/migration-matrix-2026-09-15.md:11` ("Gateway dashboard.js | Unmounted, zero callers, `require` fails MODULE_NOT_FOUND | Archived with history | `git mv` to `archive/dead-routes-2026-09-15/` + README note | none | DONE (`128119da`)"); `morning-report-2026-09-16.md:18,66`. Status: DEAD (archived with history; 4 gateway suites re-ran green after).

**P-20. Entity dossier viewer.** Source: `/home/hatch/workspace/tandem/knowledge/dossiers/1st-choice-pro-services.json` (canonical_name, identity {key, match_basis, spellings[]}, identity_confidence, open_questions, opportunity, pipeline, next_justified_action {action, because, evidence_ref}); `tandem/entity-dossier.py`, `entity-identities.md`. Per-entity dossier cards: identity resolution with confidence grading, spellings with source refs, open questions, next justified action with evidence ref. Status: PARTIAL (JSON dossiers + builder exist; no viewer UI). Backend authority: none (outreach machinery; PING boundary: only high-quality verified intel goes to PING).

**Tenant UI.** From the core-repo scope: TenantRegistry is in ACTIVE DEVELOPMENT, gateway/routes/tenants.js exists; no tenant screen found. Status: UNKNOWN/none.

**Missing UI primitives (backend authority exists, no screen):** /mission view (ping_missions has full lifecycle created to assigned to running to completed/failed to archived, leases, retries; GET /missions exists; P-05 L1 explicitly specs it as "renderable as a static page" but nothing renders it). /intents view (378 open intents, ledger file only). /authorities view (authorities/registry.yaml tracks statuses; no authority browser). /capabilities view (GET /capabilities 404'd live 2026-09-13; capability_requests audit table has request_id, agent_id, session_id, capability, parameters, authz, granted, policy_violation, result, event_id, audit_status; no viewer). Evidence-to-repair pipeline view (events exist: REPLAY_COMPLETED, WITNESS_CREATED/REJECTED, LINEAGE_CREATED, MISSION_DEAD_LETTERED; no chain walker UI; P-05 L2/L3 and P-06 are the specced answers). Knowledge graph browser (KnowledgeGraph BUILT: knowledge_nodes/edges, confidence semantics, promoter lifecycle; hybrid_search BUILT; site BusinessGraph labeled illustrative, not live; Neo4j adapter EXPERIMENTAL). Live runtime status strip (P-01 is SENSITIVE_PUBLIC JSON; /ops/status 500s on `fingerprint.generate is not a function`; the website has a /status strip for marketing claims but nothing equivalent for live runtime health). Scheduler/jobs UI ("no /schedule, /cron, /jobs, /tasks routes" per interop-audit:101; "no execution history anywhere (fire times, outcomes not recorded)" per continuity audit sec 1; the 2026-09-17 resilience program added classification + action truth to files, but no scheduler screen). Worktree/agent-run supervisor (worktree-architecture-spec.md defines manifests (.agent-worktree.json), ledger `/home/nolan/.ping-worktree-ledger.log`, 15-min reaper, awaiting-merge states; visibility is log files only). Backup/restore UI (verified backup set + RESTORE_VERIFICATION_PROCEDURE.md + RETENTION_POLICY.md in phase10; shell scripts only).

## 4. Mission Control architecture

Derived from the actual PING authorities, anchored on the only written spec (P-05, the Oracle-window three-level projection) and the existing read API (P-02). The information architecture is a drill-down over one truth:

Mission
  to Run
  to Execution
  to Event
  to Artifact
  to Evidence
  to Projection

The operator moves from a high-level mission into increasingly concrete evidence without losing context. A Mission detail screen must answer, at minimum:

- What is the objective? Why does it exist? (mission record, ping_missions)
- Who/what owns it? (principal, agent identity)
- Current status? Progress? (mission lifecycle states: created, assigned, running, completed/failed, archived; P-05 L1 via GET /missions + GET /events/correlation/:id)
- Current run? Agent? Current execution? Current capabilities? Current model route?
- What changed? What failed? (events by correlation; dead-letter state via P-19)
- What evidence exists? What artifacts were created? (L3: content-addressed artifacts via output_refs)
- What approvals are waiting? (P-09 PENDING_HUMAN queue)
- What is the next action?
- Can I replay/inspect the run? (REPLAY_COMPLETED, WITNESS_CREATED; sec 10)
- Can I understand why the agent did what it did? (execution trace L2; lineage)

Major surfaces (each is a projection over one authority; naming note: decide whether "Control Panel" (A-31) and "Mission Control" are one surface or two, since the sources never distinguish them):

**COMMAND CENTER.** Global state in one operations view: active missions, blocked missions, waiting approvals (P-09), failed/recovering runs (P-19), agent health, execution queue (P-02), reconcile gaps (A-65), unresolved intents (A-09), evidence/proof backlog, integration health, platform health (P-01). Keep the global live queue visually distinct from tracked work state (external pattern X-20: CoWork OS separates the live global queue from the workspace-scoped board; one list that mixes "currently executing" with "planned" lies about both). Every counter labeled by source authority; a service that cannot be read renders explicit Unavailable/UNKNOWN, never 0 or "All clear" (X-19).

**MISSIONS.** Durable objectives. Views: list, board (lifecycle stages created/assigned/running/completed/failed/archived), timeline, dependency graph, mission detail (the answer list above). Backend: MissionRuntime/MissionScheduler over ping_missions. A Kanban board here is a work-lifecycle surface; dragging changes tracked state via the authority, never by direct mutation (X-25).

**RUNS.** One autonomous attempt. Show: agent, worktree, container/runtime, model route, capabilities, start/end, status, cost, latency, parent/child relationships, executions, artifacts, events, evidence. Missing instrumentation gap: no run_id exists anywhere yet (P-05 dependency). Typed nested trace tree (X-12, LangSmith) is the reference rendering.

**EXECUTIONS.** Individual authoritative execution calls. Show: execution ID, capability, command/tool, input hash, output hash, host, runtime, duration, result, events, artifacts, failure classification (A-02 classes). Per-step Data In / Data Out with failure localization (X-34, X-37, n8n/Zapier pattern).

**EVENTS.** Canonical event stream, never a raw log dump (X-32 is the anti-pattern; X-13 LangSmith succeeds because runs are typed and nested). Provide: timeline, filters (faceted: event type, actor, mission, run, execution, correlation, lineage, policy version; X-15), causal tree via /events/:id/descendants|ancestors (P-05 L2). Backend: UnifiedEventRuntime over ping_events.

**EVIDENCE / PROOF.** See section 9. This is the differentiator.

**REPLAY.** See section 10.

Constitutional contract, stated in the interface itself (X-17, CoWork OS: "Observes and configures; is not a second permission plane"): the UI can narrow or defer work but cannot widen an access profile, revive an unavailable capability, or grant permissions. Approvals, retries, and wakes dispatch through MissionRuntime/ExecutionAuthority policy, never around it (X-29 is the anti-pattern to refuse). Structured input cards for operator handoffs: long-running tasks pause with 1-3 short choices, answered inline; decisions feed back as events, never free-form commands into the executor (X-23). What-the-system-learned on completion cards: memory captured, playbook reinforcement, evidence links, next action when human review is needed (X-24, CoWork OS core-harness completion card).

## 5. Automation Health architecture

This is the most production-ready UI domain in the system: the data model already exists and runs. The daily health report (A-01) is the de facto spec; its fields are the data model. The architecture is built around one principle: **every attempted action eventually reaches a terminal disposition or an explicitly visible unresolved state.** No "0 actions" without an explanation (A-02 zero-result suspicion rule; X-28 "green but broken" anti-pattern).

Terminal pass classes for every automation pass (A-02): SUCCESS_ACTION, SUCCESS_EMPTY, ENUMERATION_FAILURE, ELIGIBILITY_EMPTY, DEPENDENCY_FAILURE, AUTH_FAILURE, SURFACE_DRIFT, RATE_LIMIT, TEMPORARY_FAILURE, TERMINAL_FAILURE. These become first-class filters in the health cockpit (X-15 faceted filtering applied to PING's own pass classes).

Per automation surface, show (A-01's field model, made interactive):
- Enumeration: expectedPopulation vs discoveredPopulation, discoveryDeltaVsPrevious, enumerationConfidence, surfaceFingerprint, selectorDrift (A-06).
- Strategy: capability health + preferred strategy + healthScore (A-03).
- Eligibility: eligible vs selected vs attempted vs succeeded vs verified vs failed funnel (A-05), with discovery and action truth stored independently (A-02 requirement).
- Actions: what landed, what failed, with the "why did nothing happen" sentence per pass (A-02).
- Failures: failure class distribution, budgets consumed (A-04).
- Quarantine: brief-level (A-12) and surface-level (A-04) quarantine records with artifacts/errors/attempts/timestamps.
- Reconciliation: typed gap states (A-65: NOT_REQUIRED, NOT_RUN, SKIPPED, FAILED, BLOCKED, NO_VALUE, DEGRADED); three-consecutive-gap surfacing; tick-gap detection (A-66).
- Open intents: terminal disposition per intent; 378 currently open is a visible backlog, not a hidden number (A-09).
- Capture failures: 11 meta-ai artifacts quarantined, visible (A-14).
- Scheduler health: enabled/disabled counts, next runs, yield-driven cadence state (A-63, A-70); light-mode/stretch state per schedule.
- Capability blocks: CAPABILITY=BLOCKED markers per capability (A-03; the IG wedge is the canonical example).

Health cockpit requirements: failure clustering into prioritized, routable issues (X-13 LangSmith Engine: ten identical failures read as one issue with a root cause and an owner, not ten problems). Alerts carry the clustered issue, the failing runs, and the owner; alerting without routing or evidence links is the anti-pattern (X-30). "Green but broken" detection (X-28): a pass that produced no evidence is SUSPECT, not successful (A-02 rule already encodes this).

## 6. Knowledge Graph architecture

Current state: the graph backend is built (KnowledgeGraph BUILT: knowledge_nodes/edges, confidence semantics, promoter lifecycle; hybrid_search BUILT; Neo4j adapter EXPERIMENTAL). The UI is missing (A-67: no graph viewer found). What exists: JSON dossiers (A-61/P-20) and the lineage chain spec (A-62). The requirement: a graph UI that is useful, not a pretty node diagram.

Interaction model, from the graph to operations:

Entity
  to Relationship
  to Evidence
  to Event
  to Decision
  to Mission
  to Agent

Start from an entity and answer: What does this connect to? Why do we believe this? What changed? What missions depend on it? Which agent created/changed it? What evidence supports it? What contradicts it?

Harvested patterns (X, Neo4j/Aura): ontology-first navigation, where the surface exposes types and relationships as the navigation model so operators browse by what things are (X-39); graph-to-context-to-agent flow, where an operator clicks from a Mission's evidence into the graph context that informed it (X-40); an openable reasoning tab on every agent-facing claim showing the derivation path and query logic used (X-41); layered views per document or per mission (lexical/entity/full) so a Mission renders as raw events, extracted entities/claims, or the full merged view (X-43); show-graph-from-selection, where selecting evidence items projects the derived graph for exactly that selection with provenance attached (X-44); no-code exploration with a co-pilot where curation edits go through evidence events (X-45).

Constitutional edge rules already specced (A-61): every relationship edge carries provenance or is classified "inferred"; normalized-name matches are "inferred", never silently promoted; distinct spellings stay distinct dossiers unless an explicit same_identity edge with provenance exists. The homepage's "graph-as-canvas" (A-60) is page design; the product graph UI must not be decorative node-soup.

## 7. Campaign/Social Control architecture

The operating campaign machinery exists (A-17 through A-28). The UI job is to make it an adaptive mission surface instead of a pile of scheduled actions. The target chain:

Goal
  to Audience
  to Intent
  to Campaign
  to Agents
  to Content
  to Channels
  to Actions
  to Results
  to Evidence
  to Next strategy

Note: this literal chain was NOT found verbatim in any searched source; the closest real artifact is the operating loop (A-17). The UI spec below fills the chain from existing parts.

**Campaign workspace with shared state (X-47, HubSpot):** one persistent container holding plan, assets, audience, and results. A-18 (sweep run ledger), A-26 (prospect pipeline), A-28 (angle performance) are the existing state fragments; the workspace unifies them.

**Audience as first-class (X-50):** dynamic segmentation as its own workspace object with its own evidence (segment performance), not a filter buried in campaign setup. Maps to A-26 priority states and suppression.

**The Loop as a named visible cycle (X-48):** Results to Evidence to Next strategy is an explicit, named, UI-visible cycle. A-28's closed-loop learning (signal to angle to channel to response to outcome, optimizing toward qualified conversation to meeting to customer to revenue) is the existing implementation of the loop; the UI names it and shows it.

**Collaborative AI campaign canvas (X-46):** agent-drafted content presented on a canvas where the operator edits and approves, with every iteration an event. Existing precedent: A-20 decision records, A-51 meme status machine (draft to approved to queued to posted), A-53 receipt format.

**Specialized agents per job (X-51):** the operator describes the outcome; the assistant decomposes into specialized agents. Maps to A-11 job envelopes and A-17 stages.

**Multi-channel orchestration with unified attribution (X-52):** Channels to Actions to Results with evidence-linked attribution. Existing: A-10 per-platform logs, A-18 per-stage counts (outreach_sent, outreach_submitted, outreach_dm, responses, declines, bounces, followups, conversions).

**AI surfaces issues, then coordinates agents to fix them (X-49):** automation-health signals (FAILED/BLOCKED pass classes) feeding the diagnostic-to-repair pipeline with human approval in the middle. This is the campaign-side face of section 5.

Do NOT copy: HubSpot's backend; the point is the campaign workspace, planning-to-execution-to-measurement, approvals, multi-channel orchestration, AI-assisted planning, real-time reporting, and iterative refinement.

## 8. Agent observability architecture

Harvested from LangSmith (X-12 through X-21), mapped to PING primitives:

- **Typed nested trace tree:** every Run renders as an expandable parent/child tree (LLM calls, tool calls, retrievers) with name, duration, status. This is Mission to Run to Execution to Event made visible. The typed-run model is the pattern to take, not LangChain specifics.
- **Run detail pane:** clicking any node shows exact inputs, outputs, metadata, token usage, error messages. Maps to the Artifact + Evidence projection per Execution.
- **Execution timeline/waterfall:** parallel and sequential runs on a shared time axis. Maps to Run to Execution timeline when a Mission fans out.
- **Faceted run filtering:** date range, tags, metadata, run names, error status, feedback scores. Maps to the event-projection query surface; PING's pass classes become first-class filters.
- **Per-LLM-call prompt/response + token/cost capture:** maps to Execution evidence for model interactions, feeding the cost model.
- **Failure clustering into prioritized, routable issues:** maps to the evidence-to-diagnostic pipeline (section 9).
- **Annotation queues:** humans label/compare runs pairwise in a queue. Maps to the quality gate on Evidence; gives REQUIRES_HUMAN a real work surface for campaign content review.
- **Side-by-side trace comparison + regression gating:** compare a repair run against the failing run before adopting it. Maps to evidence-to-proof comparison.
- **Unified cost view:** cost aggregated across LLM calls plus custom costs (retrieval, tools, external APIs). Maps to per-Mission/per-Run/per-Campaign cost roll-up feeding ROI and the campaign chain.
- **Human-in-the-loop at the approval step only:** the engine drafts diagnosis and fix; the human approves. Maps to diagnostic-to-repair proposals waiting on REQUIRES_HUMAN.

From the open-source Mission Control inventory (X-22 through X-31): agent lifecycle panel (register, heartbeat, wake, retire; distinguishes idle/monitoring/waiting/executing, not binary alive/dead); token usage + per-model cost breakdowns; outbound webhooks with delivery history, retry, and circuit-breaker state (every external action in the campaign chain shows attempt/delivery/retry state from evidence, not assumption); cron/scheduler panel separate from the task board (MissionScheduler's durable schedule view distinct from the live run queue); per-execution trace waterfall with live metrics and human-in-the-loop approve/resume.

## 9. Evidence/Proof UX

This is the documented differentiator. The existing spec is the lineage chain (A-62, from DELEGATION-ARCHITECTURE.md sec F): raw artifact (verbatim, preserved) to extracted observations (statement + source span + confidence) to source evidence (URLs, quotes, timestamps) to verification results (per observation: verified/failed/unconfirmable; method; timestamp; verifier) to contradictions and uncertainty (preserved, never collapsed) to PING events (one per verified unit, linked to raw artifact + verification) to claims derived by PING. The same doc's conformance note is honest: the current implementation does NOT yet meet this (one compressed observation per business, no raw_artifact link in the event, no per-observation verification records, no preserved uncertainty).

The operator-facing pipeline:

Observation
  to Evidence
  to Counter-evidence
  to Confidence
  to Proof
  to Diagnostic
  to Repair plan

Note: the literal phrase "evidence to proof to diagnostic to repair" was NOT found verbatim in any searched source; A-62's lineage chain is the closest real artifact and the above is the specified UI rendering of it.

UX requirements:
- Contradictions are first-class citizens: preserved and shown, never collapsed into a single narrative (A-62; X-41 openable reasoning).
- Confidence is graded and labeled (A-61 edge rules: inferred vs proven; A-26 stack grades CONFIRMED/STRONG INDICATION/WEAK INDICATION/UNKNOWN; A-53 receipt grades OBSERVED/INFERRED/VERIFIED).
- Evidence cards carry method and as-of date with every number (A-59 house rule); empty cells show status, never hidden (A-25 scoreboard rule).
- The PING Receipt format (A-53: CLAIM to RECEIPT to FINDING to CLOWN to OPPORTUNITY) is the existing presentation pattern for evidence-backed claims.
- The evidence ledger from the Agent Network spec (A-44): every decision has an event trail; every claim has evidence; every audit produces a witness; append-only; witness roots signed.
- AI outputs tagged REASONING_ARTIFACT with _verified:false, blocked from business records until verification gates pass (A-44/A-48 constitutional constraints).
- Diagnostic-to-repair proposals surface as cards with the human at the approval step only (X-18); the repair proposal can be exercised in a playground before adoption (X-42, Aura one-click deploy pattern applied to PING's repair proposals).
- "What-the-system-learned" closure on completion cards (X-24): memory captured, playbook reinforcement, evidence links, next action.

## 10. Replay UX

Make replay understandable to operators. Current backend: DeterministicReplayEngine + ReplayWorker (mission-driven path VERIFIED; directly emitted REPLAY_VERIFY creates no mission, documented wiring gap), WITNESS_CREATED attestations, lineage worker firing.

Show, per replay:
- source events and source hashes
- policy version
- model route
- capabilities
- artifacts
- projection state
- replay result
- divergence (where it differs from the original run, and why)
- explanation

Patterns: debug-from-evidence (X-36, n8n: load a failed execution's pinned data and reproduce; maps to re-executing a failed Run's evidence bundle under the ExecutionAuthority); side-by-side trace comparison before adopting a repair (X-16); the agent playground (X-42): exercise a repair proposal before adoption.

Hard rule: do not imply that an LLM must reproduce byte-for-byte output. Replay in PING verifies that the same causal history produces the same canonical state, ordering, bytes where deterministic, hash, and witness (SOUL.md determinism section). The UI explains divergence in terms of the determinism contract, not as a generic "diff."

## 11. TenantOS UX

Sparse evidence in scope. TenantRegistry is in ACTIVE DEVELOPMENT; gateway/routes/tenants.js exists; no tenant screen was found (status UNKNOWN/none). Requirements from the spec set:

- The unified navigation model (section 14) places TENANT as a zoom level between GLOBAL and CAMPAIGN: a tenant view scopes missions, campaigns, knowledge, and approvals to one tenant.
- Per-principal namespace ACLs are a P0 platform gap (the /events fix validates namespace syntax only); the tenant UI must not imply per-tenant enforcement that does not exist yet.
- No invented authority: a tenant screen renders TenantRegistry state and namespace policy state; it does not create tenant policy.

UI work here is P2 until the namespace ACL and wiring gaps close (section 18).

## 12. External patterns harvested

Condensed from the external research pass (sources cited there). Each pattern is mapped to the PING primitive it serves.

**LangSmith (agent observability):**
- X-12 typed nested trace tree (Mission to Run to Execution to Event)
- X-13 run detail pane with inputs/outputs/metadata (Artifact + Evidence per Execution)
- X-14 execution timeline/waterfall (concurrent Mission fan-out)
- X-15 faceted run filtering (event-projection query surface; PING pass classes as filters)
- X-16 per-LLM-call prompt/response + token/cost capture (Execution evidence, cost model)
- X-17 failure clustering into prioritized, routable issues (evidence-to-diagnostic triage)
- X-18 human-in-the-loop at the approval step only (REQUIRES_HUMAN gate)
- X-19 annotation queues (human labeling of runs; quality gate on Evidence)
- X-20 side-by-side trace comparison + regression gating (evidence-to-proof comparison)

**CoWork OS Mission Control (agent control room):**
- X-21 "observes and configures; is not a second permission plane" as a stated, enforced contract
- X-22 three-panel cockpit (Agents left / Board center / Feed+Details right)
- X-23 operational counters grouped by source in the header (never silently conflated)
- X-24 explicit Unavailable state instead of zero (fail-closed projections)
- X-25 global runtime queue kept distinct from scoped board work
- X-26 approval/review lane as a Kanban stage (REVIEW column with mention tracking)
- X-27 structured input cards for operator handoffs (1-3 choices, answered inline, fed back as events)
- X-28 core harness view: trace to failure mining to clustering to eval to experiment to learning loop (the evidence-to-repair pipeline made visible)
- X-29 completion cards showing what-the-system-learned (memory, playbook reinforcement, evidence links)

**Open-source Mission Control projects (panel inventory, not architecture):**
- X-30 26-28 panel inventory (a panel = a projection over one authority)
- X-31 agent lifecycle panel (register, heartbeat, wake, retire; idle/monitoring/waiting/executing states)
- X-32 token usage + per-model cost breakdowns
- X-33 quality gates blocking completion without sign-off (REQUIRES_HUMAN as a gate)
- X-34 outbound webhooks with delivery history, retry, circuit breaker (every external action shows attempt/delivery/retry from evidence)
- X-35 cron/scheduler panel separate from the task board
- X-36 silent-failure detection ("green but broken" as its own feed class)
- X-37 fleet health roll-up where one blocked runtime never hides the others
- X-38 per-execution trace waterfall with live metrics and approve/resume

**HubSpot Marketing / Campaign Agent:**
- X-39 campaign as a workspace with shared state (plan, assets, audience, results together)
- X-40 collaborative AI campaign canvas (operator edits and approves agent-drafted assets; every iteration an event)
- X-41 The Loop: Express to Tailor to Amplify to Evolve (named iterative cycle; every interaction is a learning opportunity)
- X-42 AI surfaces issues, then coordinates agents to fix them (health signals feeding diagnostic-to-repair with human approval)
- X-43 audience as first-class (segments as workspace objects with their own evidence)
- X-44 the CRM as context authority behind every agent (PING as the knowledge authority feeding campaign planning; the UI shows which context informed a plan)
- X-45 specialized agents per job coordinated by an assistant (campaign Missions decomposed into specialized Runs, decomposition visible)
- X-46 multi-channel orchestration with unified attribution (evidence-linked attribution in the campaign chain)

**Neo4j / Aura Agent (knowledge graph):**
- X-47 ontology-first navigation (browse by what things are)
- X-48 graph to context to agent flow (click from Mission evidence into the graph context that informed it)
- X-49 response tab showing reasoning + query logic (every claim carries its derivation path)
- X-50 agent playground with one-click deploy (exercise a repair proposal before adoption)
- X-51 layered graph views: lexical / entity / full (raw events vs entities/claims vs merged view)
- X-52 show-graph-from-selection (project the derived graph for exactly the selected evidence, provenance attached)
- X-53 Bloom-style no-code exploration with co-pilot (curation edits go through evidence events)

**n8n / Make / Zapier (execution history patterns only):**
- X-54 execution list with per-execution detail (input/output per step)
- X-55 failure localization: failing step highlighted, upstream grey, error on click
- X-56 debug from evidence: load a failed execution's pinned data and reproduce (replay a failed Run's evidence bundle under the ExecutionAuthority)
- X-57 task history: searchable, Data In / Data Out per step, replay of failed runs
- X-58 workflow health reports: success rate, failure count, avg duration, sorted worst-first (pass-class distribution as the health metric)
- X-59 snapshots before every edit, with diff and rollback (Mission definitions versioned; UI can diff and revert)

## 13. Patterns NOT to copy

1. A second permission plane: a control UI that grants capabilities, widens access profiles, or executes outside the authority's policy. Every Mission Control action (approve, retry, wake) dispatches through MissionRuntime/ExecutionAuthority policy, never around it. CoWork OS states this contract explicitly; PING must enforce it in the interface.
2. Node-graph-as-architecture: letting the UI's visual graph be the system of record for behavior (n8n-style editing). PING's record is the Mission definition + event stream; any graph in Mission Control is a read projection, never an editable architecture. PING's primitive is Mission to Run to Execution to Evidence, not node to node to node.
3. Raw event log dumps: ping_events as a scrolling JSON/text log with no typing, clustering, or drill-down. Typed, nested, filterable runs are the minimum.
4. Dashboards with no drill-down: aggregate charts that cannot be clicked through to the underlying runs/evidence. Every number in Mission Control resolves to the Missions/Runs/Events behind it.
5. Vanity metrics: counts that flatter but decide nothing (total events ever, cumulative tokens with no outcome context). Every metric ties to a decision: cost per outcome, failure rate per mission template, evidence freshness.
6. Silent zeros / fake "all clear": reporting 0 or "healthy" when the underlying service could not be read. Unreadable renders as Unavailable/UNKNOWN (the UNKNOWN pass class exists for exactly this).
7. "Green but broken" success: marking a run successful when a step failed under continue-on-fail or produced no data. EMPTY/SUCCESS is classified from evidence, never from the absence of errors (A-02 already encodes this).
8. Human-out-of-the-loop auto-repair: auto-applying diagnostic-to-repair without a REQUIRES_HUMAN gate. The UI surfaces the proposal; the human approves.
9. Conflating live runtime state with tracked work state: mixing "currently executing" with "planned/tracked" in one list. The Mission lifecycle state and the live Run queue are different authorities; one list lies about both.
10. Alerting without routing or evidence links: alerts that say "error rate high" with no link to the clustered issue, the failing runs, and the owner. The minimum viable alert is LangSmith Engine's issue artifact (identify, categorize, attach, group).

## 14. Unified navigation model

The UI exposes different zoom levels over the same truth. Screens are projections; there is exactly one data model per concern.

GLOBAL
  to TENANT
  to CAMPAIGN
  to MISSION
  to RUN
  to EXECUTION
  to EVENT
  to EVIDENCE
  to PROOF

Rules:
- Never create separate competing data models per screen. The Mission list, the Run timeline, and the Evidence view all read the same authorities (ping_missions, ping_events, knowledge graph).
- The live runtime queue and the tracked work board stay visually distinct at every zoom level (X-25).
- Fail-closed at every level: a level that cannot be read shows Unavailable/UNKNOWN, never an empty success state (X-24).
- The final design test: an operator can start at "something is wrong" and drill all the way down to the exact mission, run, execution, event, evidence, and proof that explains it; and an operator can start at a strategic goal and see which campaigns, missions, agents, executions, and outcomes are advancing it. Both directions must hold before Mission Control is the actual operating cockpit.

## 15. Shared UI primitives

Primitives reused across every surface (harvested, not invented):

- **Maturity labels** (P-16/P-17): PROVEN / BUILT_NOT_LIVE / EXPERIMENTAL / DIRECTION / UNPROVEN (+ FALSIFIED, UNKNOWN from the truth matrix). Every claim carries its label with the receipt and as-of date.
- **Pass classes** (A-02): the ten terminal classes as status chips and first-class filters everywhere automation appears.
- **Terminal disposition** (A-09): every attempted action ends EXECUTED / FAILED / NOT_ATTEMPTED / UNKNOWN_EXECUTION or is visibly unresolved.
- **Evidence receipt cards** (A-53): CLAIM to RECEIPT to FINDING to CLOWN/OPPORTUNITY; every number carries method and as-of date (A-59); unpopulated cells say UNKNOWN (A-25).
- **Approval cards** (P-09, A-57): held action with approver, evidence cited, grant/deny control visible. Approvals dispatch through the authority, never around it.
- **Capability health rows** (A-03): capability, strategies, health score, last success, preferred flag, negative knowledge entries.
- **Quarantine records** (A-12): reason, consecutive failures, retry budget, preserved artifacts, lift requires a named human.
- **Decision records** (A-20): context, candidates, evidence, decision, uncertainties, intended capability; execution writes the verdict before acting.
- **Funnel stages** (A-05): discovered >= eligible >= selected >= attempted >= succeeded, verified <= succeeded, failed <= attempted. One record per run, even when it did nothing.
- **Drill-down breadcrumb** (section 14): the zoom path is always visible so context is never lost moving Mission to Run to Execution to Event to Evidence.
- **"What changed / what failed / what is next"** trio on every Mission detail (section 4 answer list).
- **What-the-system-learned** closure cards (X-29).

## 16. Data projections required

Each projection names its read source. No projection invents authority.

- Mission list + board + timeline + detail: MissionRuntime over ping_missions; progress from GET /missions + GET /events/correlation/:id (P-05 L1; the mission view is the single largest missing primitive).
- Run queue (live, global): MissionScheduler + WorkerRuntime state; kept distinct from the tracked mission board.
- Run timeline + typed nested trace: runs with executions as typed child spans; requires run_id instrumentation (currently missing; P-05 dependency).
- Execution detail: ExecutionAuthority records + execution events; input hash, output hash, host, runtime, duration, result, artifacts, failure class (A-02).
- Event timeline + causal tree: UnifiedEventRuntime over ping_events; /events/:id/descendants|ancestors (P-05 L2).
- Evidence chain: lineage worker records (raw artifact to observations to verification to events to claims); the conformance gap in A-62 must close before this projection is honest.
- Proof/witness: WITNESS_CREATED/REJECTED events; replay attestations (section 10).
- Dead-letter queue: repository_dead_letters with retry_count, failure_reason, replayable flag (P-19).
- Approval queue: knowledge_nodes with status candidate + revision nodes PENDING_HUMAN (P-09).
- Capability health: capability-registry.json + capability_requests audit table (A-03; P-10).
- Automation health: action-truth.jsonl + action-intent-ledger.jsonl + tandem/reconciliation/LATEST.json + cron definitions (A-01, A-05, A-09, A-65, A-63).
- Scheduler state: cron definitions + execution history (history does not exist yet; continuity audit sec 1).
- Research briefs + quarantine: tandem runs.jsonl + quarantine records (A-12).
- Knowledge dossiers: tandem/knowledge/dossiers/*.json (A-61; viewer missing).
- Knowledge graph: KnowledgeGraph nodes/edges with provenance on every edge (A-61 rules; graph UI missing).
- Campaign state: sweep runs.jsonl + pipeline.md + angle-performance.md + content queues (A-17/A-18/A-26/A-28/A-19).
- Prospect intelligence: prospect JSONL + digest (A-26); entity dossiers (A-61/P-20).
- System/platform: P-01 /ops/dashboard JSON (SENSITIVE_PUBLIC; no HTML).
- Cost: per-execution token/cost capture rolled up per Mission/Run/Campaign (X-16/X-32; capture does not exist yet).
- Tenants: TenantRegistry + namespace policy state (P-? tenant UI; registry in active development).

## 17. Backend APIs/events required

Exists today (keep and build on):
- GET /missions, POST /missions (auth'd), /orchestration/missions (unauth'd, note the exposure)
- GET /events, GET /events/:id, GET /events/correlation/:id, POST /events (auth'd, namespace-authorized)
- /mc/* dashboard reads (queues/scheduler/workers; JSON only; P-02)
- /ops/dashboard, /ops/system (JSON; P-01)
- DeadLetterAuthority events: MISSION_DEAD_LETTERED, TASK_FAILED
- Knowledge events: playbook proposal/approval/activation/revision/outcome; SNIPPET_APPROVED, AI_RESPONSE_ACCEPTED/REJECTED
- Replay events: REPLAY_COMPLETED, WITNESS_CREATED/REJECTED, LINEAGE_CREATED

Gaps proven by failed runs (platform follow-ups; UI must not imply they exist):
- Per-principal namespace ACLs: the /events fix validates namespace syntax only; a valid-but-unauthorized explicit namespace is still accepted. (P0 Remaining item 1, PING_TEN_HOUR_CONVERGENCE_2026-09-17.md)
- POST /knowledge/nodes drops nodeId, sourceEventId, correlationId; nodes created through it are invisible to the approval gate (orphan 4917265ee67e678c is the residue). (P0 Remaining item 2)
- SNIPPET_APPROVED is in neither EVENT_MISSION_MAP nor MISSION_WORKER_MAP; ordinary runtime wiring cannot reach KnowledgePromoter. (P0 Remaining item 3; blocks the P-09 UI's ordinary path)
- A directly emitted REPLAY_VERIFY creates no mission; the dispatch-only worker runtime never runs the replay worker. (P0 Remaining item 4; blocks ordinary replay UI actions)
- Append-only trigger does not cover TRUNCATE; must be re-applied after any from-scratch rebuild. (P0 Remaining item 5)
- /ops/status 500s (`fingerprint.generate is not a function`); /constitution/graph 503s (continuity audit sec 4)
- GET /capabilities 404'd live 2026-09-13 (capability_requests audit table exists with no viewer)
- No /schedule, /cron, /jobs, /tasks routes (interop-audit:101); no scheduler execution history anywhere (continuity audit sec 1)
- No run_id instrumentation anywhere (P-05 dependency for the L2 trace)
- /env.mission-control tracked env config exists (worktree-architecture-spec.md sec 1, FACTS F5); contents not read (flagged for secrets audit)

## 18. P0 UI work

Work that closes the gap between what the backend proves and what any operator can see today.

1. **Interactive Automation Health Cockpit** (extends A-01). The daily text report is the spec; build it as a live surface with the per-platform enumeration/strategy/eligibility/actions/failures/quarantine/reconciliation/open-intents/scheduler/capability sections from section 5, pass-class filters (A-02), and failure clustering (X-17). Backend: action-truth.jsonl, action-intent-ledger.jsonl, tandem/reconciliation/LATEST.json, cron definitions, capability-registry.json.
2. **Mission list + Mission detail with full drill-down** (P-05 L1). The single largest missing primitive. Renders GET /missions + correlation events; answers the section 4 question list. Backend: MissionRuntime over ping_missions, UnifiedEventRuntime over ping_events.
3. **Approval queue UI** (P-09). Revision 194a2b85bde957ed sits PENDING_HUMAN with no surface to see or act on it. Shows candidate proposals and revisions with evidence cited, approver, grant/deny; approvals dispatch through the promoter authority. Backend: KnowledgePromoter, knowledge_nodes. Blocked on the SNIPPET_APPROVED dispatch gap for the ordinary path (harness path proven).
4. **Intent ledger viewer** (A-09). 378 open intents with no terminal outcome need an explicit triage surface; every intent reaches a terminal disposition or stays visibly unresolved. Backend: action-intent-ledger.jsonl.
5. **Fail-closed UNKNOWN rendering everywhere** (X-24). No surface may render a silent zero or "All clear" for unreadable state. This is a cross-cutting UI rule, enforced in code review.
6. **Evidence chain walker, first cut** (A-62). Artifact to observation to verification to event to claim, with contradictions preserved. Honest about the conformance gap (one compressed observation per business today); the UI must not render lineage that does not exist.

## 19. P1 UI work

1. **Typed nested Run trace** with per-step Data In/Data Out, failure localization, and replay-from-evidence (X-12/X-13/X-55/X-56). Requires run_id instrumentation first (section 17 gap).
2. **Dead-letter browser** (P-19): retry_count, failure_reason, replayable flag, Witness to Replay path. Backend exists and is verified live.
3. **Replay comparison view** (section 10): source events, hashes, policy version, model route, capabilities, artifacts, projection state, result, divergence, explanation; side-by-side repair-vs-failure comparison before adoption.
4. **Quarantine UI** (A-12): lifecycle board for briefs; quarantine records with artifacts/errors/attempts/timestamps; human-gated lift.
5. **Capability console** (A-03 + A-64): the registry as a live console; add the missing cross-cron/cross-script discovery projection ("the single smallest missing projection," capability-inventory-2026-09-14.md:64-69).
6. **Scheduler/jobs UI** (A-63 + section 17 gaps): cron definitions as executable specs made visible; add execution history (fire times, outcomes), which exists nowhere today.
7. **Knowledge dossier viewer** (A-61/P-20): render the JSON dossiers as entity cards with identity confidence, provenance, open questions, next justified action.
8. **Campaign chain view** (section 7): Goal to Audience to Intent to Campaign to Agents to Content to Channels to Actions to Results to Evidence to Next strategy, unified from A-17/A-18/A-26/A-28/A-19; the named Loop (X-41) made visible.
9. **Cost per outcome** (X-16/X-32): per-execution token/cost capture rolled up per Mission/Run/Campaign; the metric that justifies the machinery. Capture does not exist yet.
10. **Agent lifecycle panel** (X-31): register/heartbeat/wake/retire with idle/monitoring/waiting/executing states; fleet health roll-up where one blocked runtime never hides the others (X-37).

## 20. P2 UI work

1. Authority gradient slider (A-55): observe-only to suggest to act-with-approval to act-autonomously, operator-held, genuinely operable.
2. Governance toggles with honest OFF (A-56): every toggle names the real authority mechanism; an ON that is not true is a lie.
3. Held-action approval visualization (A-57): show the gate, not the claim.
4. Published authority rulebook, versioned (A-58).
5. Knowledge graph browser (section 6): ontology-first navigation, graph-to-context-to-agent, layered views, show-graph-from-selection. After the conformance gap in A-62 closes.
6. Agent playground for repair proposals (X-50): exercise before adoption.
7. Annotation queues for human labeling of runs (X-19).
8. Mission definition versioning with diff/rollback (X-59).
9. Client report template as a real surface (A-24): one-page, decision-first, DELTA-judged, kill thresholds. (Note the anti-dashboard tension, R-1c: client-facing reports stay one-page; operator machinery stays dashboard-grade.)
10. Agent Network business UIs (A-32 through A-50): lead capture through network memory, on the 2027 roadmap; AI concierge (A-50); tenant UI after namespace ACLs close.

---

## Contradiction records

**R-1. ORCA dashboard closure rates are synthetic.** Source A (`/home/hatch/workspace/gateway-hardening/orig-engine.js:650-664`): getReport() computes missionClosureRate, missionAcceptRate from engine._missions (merged/total). Source B (`/home/hatch/workspace/goals/ping-gateway-exterior-agent-integration/files/execution-architecture-deep-audit-2026-09-16.md:178`): "Orca presents as 'CONSTITUTIONAL EXECUTION ENGINE' with an autonomous loop resolving missions at fabricated confidence 0.85 vs it executes nothing and is disabled at boot. Any dashboard closure rate from the loop is synthetic. (PROVEN)" Net: P-03/P-04 render velocity numbers from a disabled loop that fabricates findings inline (orig-engine.js:615-625, startAutonomousLoop). A Mission Control built on /orchestration/engine inherits synthetic closure; the honest data source is the live spine (ping_missions + ping_events).

**R-1b. Anti-dashboard positioning vs dashboard machinery.** marketing-intel/discoveries.md D3 (line 146): "The review machine is a trigger and a log, not a $399 dashboard." marketing-intel/competitive-messaging.md (lines 35, 60): "dashboard obsession", "Welcome to the circus..." marketing-intel/client-report-template.md: "One page. If it does not fit on one page, it is not a report, it is a dashboard. (See: the Marketing Circus.)" VERSUS: the daily automation health report (A-01) is a dashboard delivered to chat; action-truth funnel (A-05), capability registry (A-03), scoreboard (A-25) are dashboard-grade. Assessment: the anti-dashboard stance is client-facing positioning (triggers and logs for clients); operator-facing machinery is dashboard-heavy. Genuine tension, not a factual error. Resolution for the UI program: client reports stay one-page; operator surfaces stay dashboard-grade (P2 item 9 encodes this).

**R-2. "Mission Control navigates via events/queues, not CRUD" vs existing write endpoints.** `/home/hatch/workspace/ping-overnight/drift-sources/mission_runtime.js.live-20260917` lines 1-11: "Mission Control navigates these via events/queues, not CRUD." VERSUS interop-audit:101: "Mission submission/dispatch exists (POST /missions auth'd; /orchestration/missions unauth'd)." Create/dispatch endpoints are effectively mission writes. The comment states an aspiration; the gateway already exposes mission creation.

**R-3. Authority framing of machine-readable governance files.** capability-registry.json: "This registry is a discovery projection, not an authority... Fix the file when it disagrees with observed reality, never the reverse." VERSUS recovery-budgets.json: "This file is the governing rule for all recovery budgets; cron task bodies reference it rather than restating numbers." Two machine-readable governance files with opposite authority claims (projection vs governing rule) in the same subsystem. Resolution: keep the distinction explicit in any UI that renders both (registry = observed reality wins; budgets = the file wins until Nolan changes it).

**R-3b. "No dashboard" (continuity audit) vs "/mc/* dashboard reads exist" (interop audit).** continuity-audit-2026-09-13.md sec 3.5: "Explicitly not built: ... no new bus/scheduler/dashboard backend." VERSUS interop-audit-2026-09-13.md:85: "/mc/* (dashboard incl. queues/scheduler/workers reads)" listed under "Gateway REST (public)" as present. Resolution: the first refers to building a NEW dashboard backend/UI; the second refers to pre-existing JSON read endpoints. Not a true conflict, but the phrasing invites misreading "no dashboard" as "no dashboard endpoints."

**R-3c. "Oracle is not a UI" vs the "Oracle window" proposal (same document).** continuity-audit-2026-09-13.md:23: "'Oracle' is Oracle Cloud server infrastructure, not a UI... No Oracle UI, dashboard, or prototype exists anywhere." Same doc, sec 3.4: proposes "the 'Oracle' window is a read-only projection over gateway GETs" as the UI concept name. Terminological tension inside one document; the proposal reuses the name "Oracle" for a UI after establishing Oracle is not a UI. Recommendation: rename the UI concept (e.g. "Mission window") to avoid the collision.

**R-4. Cron file state vs live scheduler state.** AGENTS.md lesson (2026-09-17): "editing cron .md files directly does not take effect, cron internal state is authoritative. All bodies were re-applied via cron.update." VERSUS automation-health-report.sh reading cron frontmatter .md files for cadence/enabled status ("next-run derivation uses cron definition frontmatter, not live scheduler state; script cannot call cron.runs from bash"). The report can display a schedule that differs from live scheduler state. Any scheduler UI must read live scheduler state, not files.

**R-5. /mc/* enumerated differently by two sources.** interop-audit:85: "/mc/* (dashboard incl. queues/scheduler/workers reads)". census-2026-09-13.md:56: "/mc/* (unpaid invoices, inboxes, queues, follow-ups)". Both agree: public, unauthenticated, GET-only, read-only-but-sensitive. The enumerated contents differ (scheduler/workers vs invoices/inboxes/follow-ups); likely both true (different sub-routes), but no single authoritative route listing was found in scope.

**R-6. PING Social framing: "possible" vs operating.** PING_AGENT_NETWORK.md (2026-09-12): "PING Social is a possible client-facing application that demonstrates the agent network trajectory." VERSUS current reality: perpetual outreach engine running since 2026-09-09, FB page live since 2026-09-11, daily engagement passes. The doc's framing is stale relative to the operating business; it reads as pre-launch trajectory language.

**Additional findings not found verbatim:** the campaign chain "Goal to Audience to Intent to Campaign to Agents to Content to Channels to Actions to Results to Evidence to Next strategy" and the pipeline phrase "evidence to proof to diagnostic to repair" were not found verbatim in any searched source. Closest real artifacts: A-17 (operating loop) and A-62 (lineage chain). Sections 7 and 9 specify the UI rendering of these chains from existing parts.

---

## Search method and file counts

- Core-repo scope (ping-overnight/, ping-arch-audit/, orchestration/, gateway-hardening/, ping-migration/, pig-audit/, tandem/): ~777 files grepped (.md/.json/.js/.py/.sh/.sql), ~50 directories listed, ~30 full document reads, targeted code reads (orig-engine.js generateDashboard/printDashboard/getReport, orig-orchestration.js route table, live mission_runtime.js/mission_scheduler.js extracts in drift-sources).
- Goal dirs: 14 files under goals/ping-gateway-exterior-agent-integration/.
- Workspace scope (outreach/, pig-fb/, tandem/, ping-content/, homepage-harvest-drafts/, marketing-intel/, goals/ping-social-brand-launch/, goals/ping-social-outreach-campaign/, goals/facebook-page-unfollow-cleanup/, goals/instagram-mass-unfollow/): 2,349 files swept, ~37 documents read substantially, remainder reached via keyword sweeps (dashboard, control panel, mission control, console, viewer, queue, ledger, approval, gate, projection, evidence, replay, witness, scheduler, cron, heartbeat, capability, tenant, receipt, scoreboard, template).
- No screenshots of any PING UI exist in scope. No prototype UI components or abandoned UI branches found; the only prototype-adjacent artifact is the dormant console-print ExecutiveDashboard (cited secondhand) and the ORCA console dashboard.
- Read-only throughout. No files modified, no git operations, no credentials encountered or exposed. Other agents' work treated as unaudited input; all findings cite file paths and line/section references.
