# ADR: PING UI Boundary and Projection Contract

**Date:** 2026-09-17
**Status:** ACTIVE (approved by Nolan 2026-09-17. Activation approves the architecture, not every capability the architecture describes.)
**Supersedes:** nothing (first UI-boundary ADR)
**Sources:** `UI_HARVEST_SPEC_2026-09-17.md` (harvest spec, this directory), `website/HOMEPAGE_REPORT.md`, `website/TRUTH_MATRIX.md`
**Read-only basis:** this ADR is an architecture decision record over harvested evidence only. No files were modified, no git operations performed, no credentials touched. Other agents' artifacts are treated as unaudited input; every factual claim cites its file and line.

---

## 0. Activation (2026-09-17)

Nolan explicitly approved this ADR on 2026-09-17. Status moves PROPOSED to ACTIVE.

**Scope of approval:** activation approves the architecture (trust surfaces, typed clients, projection contract, naming, repository boundary). It does not approve capabilities that do not exist yet. Run identity, tenant identity, namespace entitlement, scheduler history, and several approval/replay dispatch paths remain missing or partial; they are explicit negative boundaries below, not things the UI may invent.

**Resolved open questions (from section 10):**
1. tenant.ping.v1.json ownership: RESOLVED. The file does not exist; status stays DIRECTION. The UI does not author tenant identity. Before creating any tenant identity file, trace TenantRegistry + IdentityAuthority + namespace model and propose the minimum schema. If no canonical authoring path exists, stop at a typed interface/schema proposal. Do not invent a second tenant authority.
2. run_id ownership: RESOLVED. run_id belongs to the runtime/execution boundary, not the UI. The UI may define a projection/schema field but may not generate IDs. No browser-generated IDs, no timestamp inference, no correlation_id overloading without proven semantic identity. Until runtime instrumentation exists, the Runs UI is GAP-LABELED / UNAVAILABLE. Do not fabricate the Run layer.
3. Contract-change approval: RESOLVED. Nolan is the human approval authority for constitutional shared-contract changes, represented as an operator/human approval policy boundary, not a hardcoded name in application logic. Changes to schemas, trust-surface semantics, mutation contracts, authority mappings, maturity vocabulary, identity or namespace semantics require explicit operator review. Normal implementation conforming to an approved contract does not require a new architecture decision.
4. Operator identity: RESOLVED. No invented RBAC, no new operator database, no hardcoded superuser string. Use the existing authenticated identity/principal mechanism; operator authorization beyond the proven gateway model is PARTIAL/GAP. Operator mutation UI renders only when backed by a proven gateway authority path; otherwise it is disabled/gap-labeled or omitted. Future multi-operator identity requires a separate evidence-backed authority decision.

**Hard boundaries (activation does not resolve these; they fence off missing backend):**
- A. Namespace authorization validates syntax only. Valid syntax is not entitlement. No tenant-isolation claims, no new tenant mutation capability until per-principal namespace authorization is proven.
- B. run_id does not exist. No fake Run backend, no manufactured run history. Mission to correlation/events to evidence/artifacts may be implemented where real data supports it. Runs stay gap-labeled.
- C. UI capability names (mission.read, run.read, execution.read, approval.grant, etc.) are PROPOSED until mapped to real gateway/CapabilityAuthority enforcement. A name in a matrix is not an authority.
- D. Scheduler history does not exist. Cron/markdown definitions are not live state. No historical scheduler claims.
- E. Sensitive-public endpoints (/ops/dashboard, /ops/system, /mc/*, /governance/*, /constitution/*) get route-by-route data classification before any public exposure. PublicPingClient exposes only explicitly approved public projections.
- F. Approval path gaps: do not render a functional approval button where SNIPPET_APPROVED lacks ordinary runtime mapping. Harness success is not production-path proof. Render the gap.
- G. Replay gap: do not expose a functional Replay action merely because replay machinery exists. Read-only replay evidence is separate from replay execution; the mutation stays gap-labeled until direct REPLAY_VERIFY creates a mission through the ordinary path.
- H. Evidence/lineage gaps: no manufactured lineage, no inferred edges, no UI-generated provenance, no "verified" label without an evidence receipt.
- I. TenantOS gap: tenant.ping.v1.json does not exist; do not silently create it as architecture-by-implementation.
- J. /env.mission-control: contents not audited. SECRET-SENSITIVE UNKNOWN. Never print, copy into reports, commit, or expose in build logs. Inspect filenames, tracking state, ignore rules, and variable names only. Stop and report if tracked secret material is found, without printing the value.

**Governing rule:** observed runtime reality wins over documentation where documentation claims implementation status. Every implementation claim carries both MATURITY (PROVEN / BUILT_NOT_LIVE / EXPERIMENTAL / DIRECTION / UNPROVEN, plus FALSIFIED / UNKNOWN) and stage (HARVESTED / CONTRACT_DEFINED / IMPLEMENTED / WIRED / RUNTIME_VERIFIED / DEPLOYED). Never collapse the axes.

---

## 1. Context

PING is an intelligence and execution substrate, not an application. Its constitutional authorities are already named and (mostly) live in the Pig repo: MissionRuntime/MissionScheduler over `ping_missions`, UnifiedEventRuntime over `ping_events`, ExecutionAuthority (Python, the actual OS executor), DeadLetterAuthority over `repository_dead_letters`, KnowledgePromoter, WitnessWorker, ReplayWorker.

Nolan's north star: PING should feel like ONE SYSTEM even when implemented through multiple applications, runtimes, repositories, workers, and deployment targets. The governing rule from the delegation architecture:

**ONE AUTHORITY MODEL, ONE CONTRACT LANGUAGE, MULTIPLE PROJECTIONS, MULTIPLE EXECUTORS.**

Unity must not be achieved by creating duplicate authorities (a UI that grants permissions is a second permission plane) or by blindly merging repositories.

The UI harvest (2026-09-17) found three UI-relevant layers in play: existing operator-facing machinery (health reports, pass classifiers, capability registries, intent ledgers, research gates, prospect pipelines, all in `~/workspace/outreach`, `~/workspace/pig-fb`, `~/workspace/tandem`), existing gateway read surfaces (P-01 `/ops/dashboard`, P-02 `/mc/*`, P-03/P-04 ORCA), and the standalone public marketing site (P-16/P-17). It also found a cluster of contradictions (R-1 through R-6) that this ADR resolves, and a backend gap list (spec section 17) that bounds what any UI may honestly claim.

This ADR decides the UI workspace boundary, the trust surfaces, the naming (Mission Control vs Control Panel), the projection contract semantics, the shared package structure, the public-site relationship, and the repository boundary.

---

## 2. Evidence

### 2.1 Existing surfaces the ADR must respect

- **A-01 through A-70:** the automation resilience machinery is the most production-ready UI domain. The daily health report (`~/workspace/outreach/automation-health-report.sh`, cron `automation-health-report` daily 07:30 MDT) is the de facto health-cockpit spec: its field model (enumeration, strategy, eligibility funnel, actions with reasons, failure budgets, quarantine, reconciliation gap states, open intents, scheduler health, CAPABILITY=BLOCKED markers) is the projection schema to adopt, not to re-specify. (harvest spec, sections 1 and 5)
- **P-01 `/ops/dashboard` + `/ops/system`:** EXISTS, JSON only, verified live 200 on 2026-09-12/13, classified SENSITIVE_PUBLIC (exposes image names, port maps, git branch/authors/messages). Public read-only. Backend: SystemAuthority, UnifiedEventRuntime, MissionRuntime. (harvest spec, P-01)
- **P-02 `/mc/*`:** PARTIAL. Routes code-verified in the Pig repo (including `gateway/routes/mission_control.js:242`, required by DeadLetterAuthority and gateway bootstrap); dashboard reads over queues/scheduler/workers; scheduler is status-read only; no `/schedule`, `/cron`, `/jobs`, `/tasks` write routes. Permissions per interop audit: public reads. Enumeration differs between two sources (see R-5). (harvest spec, P-02)
- **P-03/P-04 ORCA dashboards:** EXISTS as JSON + console print, but their closure rates are synthetic (see R-1 below). Live-but-orphaned engine, disabled by decision, `executor:null`. Unauthenticated read. (harvest spec, P-03/P-04)
- **P-05 Oracle window:** SPEC_ONLY. The only written spec for a Mission Control-grade UI: a three-level read-only projection over gateway GETs (L1 mission, L2 execution trace, L3 evidence). Explicitly "not a new system" and "no new bus/scheduler/dashboard backend." Dependency gap: no `run_id` exists anywhere yet. (harvest spec, P-05; continuity-audit-2026-09-13.md sec 3)
- **P-16/P-17 homepage + truth matrix:** EXISTS. 14 sections in 10 beats, repo `/home/nolan/projects/ping` main at f6386ee, all work uncommitted (exact uncommitted file count unverified; see C-3 in the harvest continuation), dev server HTTP 200 on :3000. The truth matrix carries statuses PROVEN / BUILT_NOT_LIVE / EXPERIMENTAL / DIRECTION / FALSIFIED / UNKNOWN with explicit required proof per claim. (website/HOMEPAGE_REPORT.md, website/TRUTH_MATRIX.md)
- **A-24 client report template:** SPEC_ONLY. One-page, decision-first ("Should this capability stay on, be fixed, or be killed?"), judged on DELTA against a pre-period baseline, with kill thresholds and red-row pause rules. (harvest spec, A-24)

### 2.2 Contradiction records the ADR resolves

- **R-1: ORCA closure rates are synthetic.** `gateway-hardening/orig-engine.js:650-664` computes missionClosureRate/missionAcceptRate from `engine._missions`; `execution-architecture-deep-audit-2026-09-16.md:178` proves the loop "executes nothing and is disabled at boot" and its dashboard loop "fabricates findings inline" (`orig-engine.js:615-625`). Decision: the honest operational spine is `ping_missions` + `ping_events`; ORCA numbers must never be presented as production operational truth.
- **R-1b: anti-dashboard tension.** `marketing-intel/discoveries.md` D3 ("The review machine is a trigger and a log, not a $399 dashboard") and `marketing-intel/client-report-template.md` ("One page... it is not a report, it is a dashboard") versus the genuinely dashboard-grade operator machinery (A-01, A-03, A-05, A-25). Assessment (harvest spec): the anti-dashboard stance is client-facing positioning; operator machinery is dashboard-heavy. Resolution: client reports stay one-page; operator surfaces stay dashboard-grade. Not a factual error.
- **R-2: "navigates via events/queues, not CRUD" vs write endpoints.** `mission_runtime.js.live-20260917` lines 1-11 states the aspiration; `interop-audit:101` confirms mission submission/dispatch endpoints exist (POST /missions auth'd; /orchestration/missions unauth'd). Decision: UI actions (approve, retry, wake, dispatch) go through the authority's event/policy path, never around it; the aspiration is enforced in the UI contract.
- **R-3: registry vs budgets authority claims.** `capability-registry.json` header: "This registry is a discovery projection, not an authority... Fix the file when it disagrees with observed reality." `recovery-budgets.json` header: "This file is the governing rule for all recovery budgets; cron task bodies reference it." Two files, opposite authority claims, same subsystem. Decision: any UI rendering both must label them distinctly (registry = observed reality wins; budgets = file wins until Nolan changes it).
- **R-3b: "no dashboard" vs `/mc/*` reads.** continuity-audit-2026-09-13.md sec 3.5 ("no new bus/scheduler/dashboard backend") vs interop-audit-2026-09-13.md:85 (`/mc/*` read endpoints present). Resolution: the first refers to building a NEW dashboard backend; the second to pre-existing JSON read endpoints. Not a conflict, but the phrasing misleads; this ADR uses precise wording going forward.
- **R-3c: "Oracle is not a UI" vs the "Oracle window".** continuity-audit-2026-09-13.md:23 establishes Oracle is Oracle Cloud server infrastructure, not a UI; the same doc's sec 3.4 then proposes an "Oracle window" UI. Decision: rename the concept "Mission window" to kill the collision.
- **R-4: cron file state vs live scheduler state.** AGENTS.md lesson (2026-09-17): cron internal state is authoritative; editing .md files takes no effect. Meanwhile `automation-health-report.sh` reads cron frontmatter .md files for cadence/enabled status and can display a schedule that differs from live state. Decision: any scheduler UI reads live scheduler state, never files.
- **R-5: `/mc/*` enumerated differently by two sources.** interop-audit:85 (queues/scheduler/workers reads) vs census-2026-09-13.md:56 (unpaid invoices, inboxes, queues, follow-ups). Both agree public, unauthenticated, GET-only, read-only-but-sensitive. No single authoritative route listing found in scope. Decision: the typed client wraps only routes verified by a live route-table read; anything unverified is marked UNKNOWN in the contract, not assumed.
- **R-6: PING Social framing.** PING_AGENT_NETWORK.md calls PING Social "a possible client-facing application"; reality is a perpetual outreach engine since 2026-09-09 with a live FB page since 2026-09-11. Decision: the doc's framing is stale; the public site and PING Social are treated as the first TenantOS tenant/product projection (see section 6.6), not as a hypothetical.

### 2.3 Backend gaps that bound UI honesty (harvest spec, section 17)

The UI must not imply these exist: per-principal namespace ACLs (the /events fix validates syntax only); `POST /knowledge/nodes` drops nodeId, sourceEventId, correlationId (orphan `4917265ee67e678c` is the residue); SNIPPET_APPROVED is in neither EVENT_MISSION_MAP nor MISSION_WORKER_MAP (blocks the P-09 ordinary approval path; harness path proven); directly emitted REPLAY_VERIFY creates no mission (blocks ordinary replay UI actions); the append-only trigger does not cover TRUNCATE; `/ops/status` 500s (`fingerprint.generate is not a function`); `GET /capabilities` 404'd live 2026-09-13; no `/schedule`, `/cron`, `/jobs`, `/tasks` routes and no scheduler execution history anywhere; no `run_id` instrumentation anywhere (P-05 dependency); `/env.mission-control` tracked env config contents not read (flagged for secrets audit).

### 2.4 Naming evidence

The only written operator-UI spec is P-05 (the "Oracle-window"/Mission-window three-level projection) plus P-02's existing `/mc/*` Mission Control REST surface. A-31 ("Control Panel") is a name only: it appears in the AGENTS.md engineering order ("Control Panel/Mission Control/harvesting -> canonical backend") and MEMORY.md, with no design and no stated distinction from Mission Control; sources never distinguish the two. The website uses maturity labels (P-16) and a 23-claim truth matrix (P-17) as its honesty vocabulary. The maturity vocabulary in live use is PROVEN / BUILT_NOT_LIVE / EXPERIMENTAL / DIRECTION / UNPROVEN, plus FALSIFIED and UNKNOWN from the truth matrix.

---

## 3. Decision

**One operator surface, named Mission Control.** The "Control Panel" name is retired to avoid a second unnamed authority. Rationale: the only written spec (P-05) and the only existing REST surface (P-02, `mission_control.js`) both say Mission Control; no source distinguishes Control Panel from Mission Control; the harvest spec's own section 4 asks the question and its section 3 finds the distinction absent. The P-05 concept is renamed "Mission window" per R-3c.

**One UI workspace, five packages, three typed clients.** The workspace boundary:

- `apps/mission-control` - authenticated operator surface (auth boundary, not authorization source)
- `apps/web` - public marketing site (the current standalone repo becomes this; a tenant/product projection, not a second system)
- `packages/ui` - visual primitives/design system (maturity labels, pass-class chips, evidence receipt cards, approval cards, funnel stages, quarantine records, drill-down breadcrumb; the harvest spec section 15 primitives)
- `packages/api-client` - the three typed clients (PublicPingClient, AuthenticatedPingClient, OperatorPingClient)
- `packages/schemas` - canonical shared projection contracts (schemas carry maturity, proof_status, verified_at, evidence_ref, source)

**No premature packages.** Auth, telemetry, config, and icons are not packages until a second consumer exists. The gateway remains the security enforcement point; the clients encode visibility (UX), not authorization.

**Operator surfaces are dashboard-grade; client reports stay one-page.** The R-1b resolution is binding: dashboard-depth for the operator (Mission Control), one-page decision-first for the client (A-24 template). Neither may impersonate the other.

**ORCA is preserved but classified synthetic.** ORCA dashboards stay available for archaeology; their closure rates are synthetic data from a disabled loop (R-1) and must never feed production operational truth, SLA numbers, or any Mission Control counter. The authoritative operational spine is `ping_missions` + `ping_events`.

---

## 4. Architecture

### 4.1 Information architecture (Mission Control, candidate)

One operator surface with four sections. Each subsection is retained ONLY where existing or clearly required capabilities justify it; the list is the candidate IA, not a build order.

- **Command Center:** active missions, blocked missions, waiting approvals (P-09), failed/recovering runs (P-19 dead letters), agent health, execution queue (P-02), reconcile gaps (A-65), unresolved intents (A-09; 378 open as of 2026-09-17, surfaced as backlog not hidden), evidence/proof backlog, integration health, platform health (P-01).
- **Missions:** list, board (lifecycle stages created/assigned/running/completed/failed/archived), timeline, dependency graph, mission detail answering: objective, owner, status/progress, current run/agent/execution/capabilities/model route, what changed, what failed, evidence/artifacts, waiting approvals, next action, replay/inspect, why-the-agent-did-what (section 4 answer list).
- **Runs:** one autonomous attempt; agent, worktree, container/runtime, model route, capabilities, start/end, status, cost, latency, parent/child, executions, artifacts, events, evidence. Requires `run_id` instrumentation (proven missing; no Run UI is honest until it lands).
- **Executions:** execution ID, capability, command/tool, input hash, output hash, host, runtime, duration, result, events, artifacts, failure class (A-02). Per-step Data In/Data Out with failure localization.
- **Events:** canonical stream as typed, nested, faceted timeline (never a raw log dump); causal tree via `/events/:id/descendants|ancestors`; faceted filters (event type, actor, mission, run, execution, correlation, lineage, policy version). Backend: UnifiedEventRuntime over `ping_events`.
- **Workers:** worker states, worker map, heartbeat/wake/retire lifecycle, fleet health roll-up where one blocked runtime never hides the others.
- **Automation Health:** the A-01 field model made interactive: enumeration (expected vs discovered, delta, confidence, fingerprint, drift), strategy health (A-03), eligibility funnel (A-05), pass classes as first-class filters (A-02), failure clustering into routable issues, quarantine (brief A-12 and surface A-04), reconciliation gap states (A-65), tick gaps (A-66), scheduler health with yield-driven cadence state (A-63, A-70), CAPABILITY=BLOCKED markers.

- **Knowledge:** Artifacts, Evidence, Projections, Lineage.
- **Evidence/Proof:** the A-62 lineage chain as UI: raw artifact to extracted observations (statement + source span + confidence) to source evidence to verification results (per observation: verified/failed/unconfirmable; method; timestamp; verifier) to contradictions and uncertainty (preserved, never collapsed) to PING events to claims. Contradictions are first-class. The conformance gap (one compressed observation per business today) is labeled in the UI until it closes; the UI must not render lineage that does not exist.
- **Replay:** source events and hashes, policy version, model route, capabilities, artifacts, projection state, result, divergence with explanation. Hard rule: never imply an LLM must reproduce byte-for-byte output; replay verifies same causal history to same canonical state/ordering/bytes-where-deterministic/hash/witness (SOUL.md determinism section). Divergence is explained in determinism-contract terms.
- **Artifacts:** content-addressed artifacts via output_refs (P-05 L3); raw bytes stay in files, hashes and pointers in events.

- **Governance:** Authorities, Capabilities, Violations, Policies.
- **Capabilities:** the A-03 registry as a live console (capability, strategies, health score, last success, preferred flag, negative knowledge) plus the missing cross-cron/cross-script discovery projection flagged in A-64. Labels the R-3 distinction: registry = observed reality wins; budgets = governing file.
- **Approvals:** the P-09 queue: candidate proposals and revision nodes (e.g. revision `194a2b85bde957ed`, PENDING_HUMAN) with evidence cited, approver, grant/deny; approvals dispatch through KnowledgePromoter, never around it. Blocked on the SNIPPET_APPROVED dispatch gap for the ordinary path; the UI shows the gap explicitly until it closes.
- **Dead letters:** P-19 browser: retry_count, failure_reason, replayable flag, Witness to Replay path. Backend verified live (MISSION_DEAD_LETTERED `3daa14285107788e`, retries=2, exactly one DLQ record per PING_TEN_HOUR_CONVERGENCE_2026-09-17.md:112).
- **Policies/Rulebook:** versioned authority rulebook (A-58); recovery budgets as the governing rule (A-04) with explicit authority labeling per R-3.

- **System:** Runtime, Infrastructure, Integrations, Settings.
- **Runtime/Infrastructure:** P-01 projection with SENSITIVE_PUBLIC classification honored (no new exposure surface; JSON exists, HTML rendering is new).
- **Scheduler:** cron definitions as executable specs made visible (A-63), read from LIVE scheduler state per R-4 (never files); execution history (fire times, outcomes) once it exists anywhere.
- **Integrations:** Pig capabilities contract (A-68), gateway watchdog state, exterior-agent views (authorizeWorkOrder is isolated, not yet wired into MissionRuntime; the UI shows isolation, not integration).

### 4.2 One execution model, many executors

Mission Control consumes one execution model regardless of executor: JS worker, Python worker, Codex, Hermes, Oracle, local machine, future cloud worker. Executor identity is metadata on the execution record (host, runtime, model route), never competing product semantics. The /run beat of the public site ("workers run, the event plane holds truth, authority decides"; HOMEPAGE_REPORT.md) is the public-facing statement of the same invariant. The falsified "Codex and Hermes operate under capability grants" card (HOMEPAGE_REPORT.md, now fixed) is the cautionary precedent: the UI must label exterior agents as exterior.

---

## 5. Trust Model

Three trust surfaces. The gateway is the security enforcement point. UI visibility is UX, never authorization.

- **PUBLIC:** `apps/web` and read-only public projections. May consume only the PublicPingClient. Anything labeled public must be genuinely safe under P-01's SENSITIVE_PUBLIC lesson: P-01 JSON is public today but exposes image names, port maps, git branch/authors/messages; the UI must not widen public exposure beyond what the gateway already serves unauthenticated. R-5's unknown `/mc/*` sub-routes are NOT wrapped as public until a live route-table read verifies them; unverified routes are marked UNKNOWN, not assumed public.
- **AUTHENTICATED USER/CUSTOMER:** future tenant users (PING Social tenants). AuthenticatedPingClient. Tenant-scoped projections (GLOBAL to TENANT to CAMPAIGN zoom, harvest spec section 14) read TenantRegistry and namespace policy state but must not imply per-tenant enforcement that does not exist (P0 gap: namespace ACLs validate syntax only; tenant UI stays P2 until the gap closes, per harvest spec section 11).
- **OPERATOR/ADMIN:** `apps/mission-control`, Nolan plus explicitly granted operators. OperatorPingClient. Approvals, retries, wakes, and dispatches go through MissionRuntime/ExecutionAuthority policy (X-21: "observes and configures; is not a second permission plane"). The UI can narrow or defer work; it cannot widen an access profile, revive an unavailable capability, or grant permissions.

**Never rely on:** hidden buttons, disabled controls, client-side roles, frontend routing, or obfuscation as authorization. These are presentation choices; the gateway decides. A UI control that lacks a matching gateway authorization check is a bug, not a feature.

**Structured handoffs:** operator handoffs use structured input cards (1-3 short choices, answered inline, fed back as events), never free-form commands into the executor. Long-running tasks pause with choices; decisions become events.

---

## 6. Contract Model

### 6.1 Three typed clients

- **PublicPingClient:** read-only by construction. It is incapable of expressing operator mutations: no write methods exist on the type. It may only call public gateway GETs.
- **AuthenticatedPingClient:** read-only over tenant-scoped public/auth'd GETs; plus tenant-scoped reads. No operator mutations.
- **OperatorPingClient:** full read surface plus action methods (approve, retry, wake, dispatch, quarantine-lift-request) that each map to one gateway mutation endpoint and carry the authority path (e.g. approval dispatches through KnowledgePromoter).

Defense in depth: schema-level incapability (the type cannot express the action) PLUS mandatory gateway authorization (the gateway re-checks on every call). Client-side capability is never the enforcement point (section 5).

### 6.2 Projection schemas (packages/schemas)

Every projection schema carries, in-band:

- `maturity`: one of PROVEN / BUILT_NOT_LIVE / EXPERIMENTAL / DIRECTION / UNPROVEN (+ FALSIFIED, UNKNOWN from the truth matrix). Uses existing terminology; this is the P-16/P-17 label system, not a new vocabulary.
- `proof_status`: the truth-matrix row status for the underlying claim where one exists.
- `verified_at`: as-of timestamp of the last verification.
- `evidence_ref`: pointer to the evidence (event ID, capture file, report section).
- `source`: the authority the projection reads (e.g. `ping_missions via MissionRuntime`).

**Invariant: UI CLAIM <= BACKEND PROOF.** No surface may display a claim stronger than the backend's proven rung. If the backend is EXPERIMENTAL, the UI label is EXPERIMENTAL even if the screen looks finished.

Harvest/convergence stage labels are tracked separately and never collapsed into maturity: HARVESTED / CONTRACT_DEFINED / IMPLEMENTED / WIRED / RUNTIME_VERIFIED / DEPLOYED. A screen can be IMPLEMENTED but RUNTIME_VERIFIED=no; both facts travel with the schema. The sibling section 16/17 reconciliation owns the stage tracking; this ADR only requires the separation.

### 6.3 Shared primitives (packages/ui)

The harvest spec section 15 primitives become the design system: maturity labels, pass-class chips (the ten A-02 classes), terminal disposition badges (EXECUTED / FAILED / NOT_ATTEMPTED / UNKNOWN_EXECUTION or visibly unresolved), evidence receipt cards (A-53: CLAIM to RECEIPT to FINDING to CLOWN/OPPORTUNITY), approval cards, capability health rows, quarantine records, decision records, funnel stages (A-05: discovered >= eligible >= selected >= attempted >= succeeded, verified <= succeeded, failed <= attempted), drill-down breadcrumb (GLOBAL to TENANT to CAMPAIGN to MISSION to RUN to EXECUTION to EVENT to EVIDENCE to PROOF), the "what changed / what failed / what is next" trio, and what-the-system-learned closure cards.

### 6.4 Projection rules

1. **Drill-down:** Mission to Run to Execution to Event to Artifact to Evidence to Projection. Screens are projections, never competing data models. The Mission list, Run timeline, and Evidence view all read the same authorities.
2. **Fail-closed rendering:** a level that cannot be read renders Unavailable/UNKNOWN, never a silent zero or "All clear". This is the X-24 rule and the A-02 zero-result suspicion rule, applied everywhere. The A-25 scoreboard rule holds: unpopulated cells say UNKNOWN, never hide.
3. **Live vs tracked separation:** the live runtime queue (currently executing) is visually distinct from the tracked work board (planned/tracked lifecycle) at every zoom level. One list that mixes them lies about both.
4. **Every number drills down:** aggregate counters resolve to the underlying missions/runs/events. No dead-end dashboards.
5. **Every counter labeled by source authority.** A service that cannot be read renders explicit Unavailable/UNKNOWN, never 0.
6. **Live scheduler state, not files:** any scheduler surface reads live scheduler state per R-4.
7. **Run UI waits for run_id:** the typed nested Run trace (P-05 L2) is not honest until `run_id` instrumentation exists. Until then the UI shows the gap, not a fabricated trace.
8. **Evidence UI waits for conformance:** the A-62 chain walker does not render per-observation verification records that do not exist; the conformance gap is labeled until it closes.
9. **Approval UI waits for dispatch:** the P-09 queue shows PENDING_HUMAN items with the SNIPPET_APPROVED dispatch gap explicitly labeled until the wiring closes.

### 6.5 Capability matrix (summary)

The full capability matrix is a sibling document (in production by a sibling worker). This ADR fixes its contract terms so the matrix has something to hang from:

- Capabilities are named per the Pig capabilities contract pattern (A-68: `research.ask`, `research.context`, `artifact.write/read`, `browser.status`, `validation.run`, `retention.sweep`, `job.record`): named capability, multiple strategies, health scores, last-known-good preferred, versioned JSON, contract-tested.
- Each capability maps to: the owning authority (not the UI), the typed client allowed to invoke it (public/authenticated/operator), the gateway endpoint(s) that enforce authorization, the UI surface that renders it, and its maturity label.
- Discovery is separated from eligibility from invocation: the capability registry is a discovery projection (observed reality wins, per R-3); recovery budgets are governing rules (the file wins until Nolan changes it); the engagement guard is a mechanical eligibility boundary (fail-closed exit 3 on unreadable history).
- Negative knowledge is first-class: broken/unknown strategies stay in the matrix as negative knowledge (A-03 pattern), never silently dropped.

### 6.6 Public-site relationship

**Corrected history, in writing:** HPP (the Happy Place platform) is frozen and untouched; it is source archaeology only. The standalone public frontend lives in its own repository (`/home/nolan/projects/ping`, main at f6386ee), built independently: a 14-section site in 10 beats, uncommitted (21 files), dev server verified 200 on localhost:3000 (HOMEPAGE_REPORT.md). It is BUILT_NOT_LIVE: built and honest, not yet deployed, not yet wired to live gateway APIs. Its truth matrix (TRUTH_MATRIX.md, mirrored into the repo) carries PROVEN / BUILT_NOT_LIVE / EXPERIMENTAL / DIRECTION / FALSIFIED / UNKNOWN with required proof per claim.

**Decision:** the public site becomes the PING tenant/product projection: `apps/web` in the UI workspace, consuming `packages/schemas`, `packages/api-client` (PublicPingClient only), and `packages/ui` primitives, plus public gateway APIs. TenantOS framing holds: tenant identity per `tenant.ping.v1.json`-style file; a second tenant is a new JSON file, not a fork (per HOMEPAGE_REPORT.md: the site is already a live tenant driven by tenant-config).

**It must NOT invent:** its own CMS, its own auth system, its own event store, its own mission scheduler, its own customer database, or its own automation engine. Anything that looks like canonical state (newsletter signups, contact submissions, tenant config, build journal) goes through PING events via public gateway APIs or is explicitly labeled static. The falsified Codex/Hermes card (HOMEPAGE_REPORT.md) is the standing warning: public claims follow the truth matrix, and the truth matrix follows runtime evidence.

**R-1b binding on the public site:** marketing stays honest-labeled (maturity labels with receipts and as-of dates, P-16 pattern); the public site never renders operator machinery; client-facing numbers follow the A-24 one-page, decision-first, DELTA-judged template when they exist.

---

## 7. Repository Boundary

The UI workspace decision and the backend repository consolidation are SEPARATE decisions. This ADR decides the UI workspace; it does not decide backend repo topology.

- The API boundary (`packages/schemas` + `packages/api-client` + gateway) must let the UI consume PING regardless of backend repo topology. The UI never imports backend internals; it consumes typed contracts over HTTP.
- The public repo stays separate short term. This is also currently enforced by an external fact: the GitHub API 401 on the Piging85 token is a platform egress-proxy fault (custom.github vault surrogate not substituted), not a bad token; escalation is pending and no PAT regeneration or repo creation proceeds until the platform fixes the binding (MEMORY.md, 2026-09-16/17).
- No blind monorepo merge of backend and UI. If backend consolidation is later decided, it happens on backend evidence (dependency direction, ownership, build coupling), not as a side effect of building the UI.

---

## 8. Consequences

- **Positive:** one named operator surface ends the Mission Control vs Control Panel ambiguity; three typed clients make the trust boundary mechanical (the public client cannot express a mutation); every UI claim carries its maturity in-band so honesty is structural, not editorial; the public site keeps its independence while gaining shared contracts; the UI cannot outrun the backend because UI CLAIM <= BACKEND PROOF is checked in review.
- **Negative:** the UI workspace is a new repository boundary to maintain (contracts must be versioned; drift between gateway and `packages/schemas` is a real failure mode, mitigated by contract tests in the A-68 pattern). Some desired UI (Run trace, evidence walker, approval queue ordinary path, tenant scoping) must honestly display gaps until backend P0 items close; this will look unfinished in exactly the places it is unfinished, which is the point.
- **Neutral:** existing file-based machinery (health report, action truth, intent ledger, engagement logs) keeps running unchanged; the UI reads them as projections. No migration of the workspace machinery into the UI repo is required or desired.

---

## 9. Rejected Alternatives

1. **"Mission Control backend" as a separate authority.** Rejected: P-05 explicitly specifies the Mission Control concept as a read-only projection over gateway GETs, "not a new system"; continuity-audit sec 3.5 explicitly declines "no new bus/scheduler/dashboard backend" (R-3b). A second backend would be a competing authority and violate the Rule of One.
2. **"Public Website backend" as a separate authority (own CMS/auth/event store/mission scheduler/customer DB/automation engine).** Rejected: the TenantOS framing and the corrected history (section 6.6) make the public site a tenant/product projection over PING. A second canonical store for site state would be competing truth.
3. **Blind monorepo merge of backend + UI.** Rejected: merges nothing but hides the authority boundaries; the UI workspace boundary and backend repo topology are separate decisions (section 7). Unity comes from one authority model and one contract language, not one directory tree.
4. **The public site inventing its own CMS/auth/store.** Rejected: see 2. Same competing-truth objection, narrower scope.
5. **Using ORCA synthetic data as operational truth.** Rejected: R-1 proves the closure rates are fabricated by a disabled loop (orig-engine.js:615-625, execution-architecture-deep-audit-2026-09-16.md:178). ORCA is preserved for archaeology, explicitly classified synthetic/demo, never fed to production counters.
6. **Client-side-role authorization (hidden buttons, disabled controls, client-side roles, frontend routing as the enforcement point).** Rejected: the gateway is the enforcement point; the clients encode visibility only. A UI control without a matching gateway authorization check is a bug.
7. **Two operator surfaces ("Control Panel" AND "Mission Control").** Rejected: no source distinguishes them (R evidence, section 2.4); two names for one surface is the seed of two competing authorities. One surface, one name.
8. **Raw event log dumps as the Events surface.** Rejected: anti-pattern X-32. Typed, nested, faceted runs are the minimum (harvest spec section 13, item 3).
9. **Dashboards with no drill-down and vanity metrics.** Rejected: every number resolves to underlying runs/evidence; every metric ties to a decision (harvest spec section 13, items 4-5).

---

## 10. Open Questions

All questions resolved by the 2026-09-17 activation (see section 0). The original list is preserved here for archaeology; statuses reflect the activation decisions.

1. **Route-table verification for `/mc/*`:** RESOLVED as process, still open as data. Which sub-routes are actually live (R-5's two enumerations differ)? Requires a live route-table read in the Pig repo before the OperatorPingClient wraps anything beyond verified reads. Until then, unverified routes are UNKNOWN and unwrapped.
2. **Public exposure review:** OPEN as data. P-01's SENSITIVE_PUBLIC classification needs a line-by-line decision on what the public site may render before `apps/web` consumes any `/ops/*` data.
3. **Operator identity:** RESOLVED. No invented RBAC; existing authenticated identity mechanism; anything beyond the proven gateway model is PARTIAL/GAP (section 0).
4. **Approval dispatch wiring:** OPEN as backend work. The SNIPPET_APPROVED ordinary-path gap stays labeled in the P-09 queue UI until the runtime closes it; the UI ships gap-labeled, not blocked.
5. **Scheduler execution history:** OPEN as backend work. No fire-time/outcome history exists anywhere; MissionScheduler instrumentation owns it. No Scheduler history surface claims it until then.
6. **`run_id` instrumentation owner:** RESOLVED as ownership (runtime/execution boundary, see section 0); OPEN as backend work. The UI ships the Runs layer gap-labeled until instrumentation lands.
7. **Contract versioning policy:** PARTIAL. packages/schemas versions independently; breaking changes require explicit operator review (section 0). Semver policy itself is still DIRECTION.
8. **The 2026-09-20 PING Social post execution path** remains Nolan's call; the content-queue projection renders whichever path he picks without taking a side.

---

## 11. Migration Sequence

Sequenced so that no step invents authority and each step is independently shippable. Stages: HARVESTED / CONTRACT_DEFINED / IMPLEMENTED / WIRED / RUNTIME_VERIFIED / DEPLOYED, tracked separately from maturity (section 6.2).

1. **Contracts first.** Extract `packages/schemas` from the harvest spec sections 16/17 (projection list + required APIs) and the A-01 field model; version v0.1.0; contract tests in the A-68 pattern. CONTRACT_DEFINED.
2. **Typed clients.** `packages/api-client` with the three clients; PublicPingClient first (read-only by construction), wrapped only around verified-live GETs (`/missions`, `/events`, `/events/:id`, `/events/correlation/:id`, P-01, verified `/mc/*` reads). IMPLEMENTED.
3. **Primitives.** `packages/ui` from harvest spec section 15 (maturity labels first; they are already proven on the public site, P-16). IMPLEMENTED.
4. **Mission window (P-05 renamed).** L1 mission list + detail as the first Mission Control surface; renders GET /missions + correlation events; fail-closed UNKNOWN on the missing `run_id` and L2/L3 gaps. WIRED.
5. **Automation Health Cockpit.** Interactive A-01: the P0 UI item with the most complete data model. WIRED, then RUNTIME_VERIFIED against the daily report output.
6. **P-09 approval queue, gap-labeled.** Candidate proposals and PENDING_HUMAN revisions with the SNIPPET_APPROVED dispatch gap explicitly labeled; harness-path approvals wired. WIRED.
7. **Public site as `apps/web`.** Migrate the standalone repo in as the tenant projection; PublicPingClient for any live data; maturity labels already in place are kept, not re-spec'd. WIRED.
8. **Dead-letter browser, intent ledger viewer, quarantine UI.** Backends verified live; viewers are projections over JSONL/DB reads. WIRED.
9. **Run trace, evidence walker, replay comparison.** Blocked on `run_id`, A-62 conformance, and the REPLAY_VERIFY dispatch gap respectively; ship gap-labeled skeletons that turn on when the backend closes the gaps. CONTRACT_DEFINED until then.
10. **Tenant UI.** P2; waits on namespace ACLs. SPEC only until the P0 gap closes.

---

## 12. Verification Criteria

- [ ] Exactly one operator surface exists under the Mission Control name; no "Control Panel" routes, packages, or docs introduce a second name.
- [ ] PublicPingClient has no method that can express an operator mutation (verified by type inspection, not by convention).
- [ ] Every gateway mutation endpoint used by the UI has a matching server-side authorization check; a UI control without one is filed as a bug.
- [ ] Every rendered claim carries `maturity`, `proof_status`, `verified_at`, `evidence_ref`, `source` in-band; a screen showing a claim stronger than the backend's proven rung fails review (UI CLAIM <= BACKEND PROOF).
- [ ] Harvest/convergence stage labels (HARVESTED through DEPLOYED) are stored and displayed separately from maturity; no screen collapses them.
- [ ] Unreadable state renders Unavailable/UNKNOWN in every surface; zero silent zeros, zero fake "All clear" (spot-check against the A-02 zero-result suspicion rule).
- [ ] Live runtime queue and tracked work board are visually distinct at every zoom level.
- [ ] Every aggregate counter in Mission Control resolves by click to the underlying missions/runs/events.
- [ ] ORCA-sourced numbers appear nowhere in production counters; any ORCA rendering is labeled synthetic/demo.
- [ ] The public site makes no claim without an adjacent maturity label and receipt or as-of date (P-16 rule, already true; kept).
- [ ] Scheduler surfaces read live scheduler state (R-4); a file-read regression fails the contract test.
- [ ] No UI package imports backend internals; the UI consumes typed contracts over HTTP only.
- [ ] The R-3 labeling holds: any surface rendering both the capability registry and recovery budgets labels which one wins on conflict.
- [ ] R-5 resolved: a live route-table read exists and the typed client wraps only verified routes; unverified routes are marked UNKNOWN.

---

## Appendix: Source Index

- `UI_HARVEST_SPEC_2026-09-17.md` - full harvest (sections 1-20, contradiction records R-1 through R-6, search method). All P-## and A-## identifiers above come from its ID scheme.
- `website/HOMEPAGE_REPORT.md` - public site build record (14 sections, 10 beats, truth-matrix outcomes, repo main at f6386ee, all work uncommitted (exact uncommitted file count unverified; C-3), :3000 verified 200).
- `website/TRUTH_MATRIX.md` - the 23-claim status board (PROVEN / BUILT_NOT_LIVE / EXPERIMENTAL / DIRECTION / FALSIFIED / UNKNOWN).
- Sibling work (delivered 2026-09-17 and cross-checked against this ADR's contract terms, sections 6.1-6.5, and the UI CLAIM <= BACKEND PROOF invariant): `HARVEST_CONTINUATION_2026-09-17.md` (20 surfaces, 38 requirement rows, new contradiction records R-7 through R-10, corrections C-1 through C-4) and `CAPABILITY_MATRIX_2026-09-17.md` (21 real named capabilities, 37-row operation matrix, three typed clients, 19-schema shared package, 20-item gap list). No decision-level conflicts; the one factual conflict (C-3, uncommitted file count) is corrected in this ADR above. The full invariant-checked map is `PING_UI_CONTRACT_MAP.md`.
