# LANE 2 REPORT: TenantOS Decision Surfaces + Worker Routing + Guards
## JEV/PING autonomy harvest, 2026-09-28 ~17:00 MDT

**Status: READ ONLY throughout. No builds, no writes to production trees, no production wiring, no gateway/scheduler/:3100 contact. All PING code claims are hypotheses until replayed from a clean checkout, per the standing lane rule.**

Evidence basis:
- Pig WSL read-only reads at `/home/nolan/projects/ping` (verified HEAD `0264d517`) and `/home/nolan/workspace/orca-adapter` (AGENT_PROFILES, authorizeWorkOrder), taken 2026-09-28 ~16:50-16:55 MDT (transport recovered after the 16:30-17:00 commute blackout; single retry per standing probe posture).
- Lane B1 decision-surface deep map (2026-09-28 14:26-15:10 MDT, pig-verified at 0264d517), lane 14 unified worker contract, lane B5 replaceability battery (executed on Pig, pure vendor functions only), lane 11 decision fabric, `~/workspace/ping-24h/STANDING_DECISIONS.md`, memory logs 2026-09-21..28.
- Web harvest: leepokai/jev-guard, eugeniughelbur/jev-engineering (300-injection attack kit, observe/guard/enforce modes), id774/sandbox tool_guard, ismaelga/omp-config Jev-guard adoption plan, marttp multi-agent placement article. Fetched 2026-09-28.

Key architectural facts bounding everything below:
- TenantOS is the tenant isolation / control-plane boundary (Nolan 2026-09-24, locked): isolation, resource, account, lifecycle, runtime/deployment-assignment, quota, admin-policy, secret boundary. It is NOT identity, missions, objects, FYD, events, capabilities, social, or agents. At pig HEAD `0264d517`, TenantOS has NO separate decision-surface code (`git ls-files` finds only `src/app/technology/tenantos/page.tsx`, a marketing page). Tenant decision surfaces live in PING code: tenant-context.ts, resolveTenantId, callerScope, mc-dispatch-identity, namespace binding.
- Standing Jev posture (binding): Jev may SELECT, never AUTHORIZE; never establish TRUTH, never EXECUTE, never erase EVIDENCE, never silently MERGE identities, never downgrade deterministic safety. Probabilities are evidence, not authority.
- Negative evidence (given): the archived 2026-09-26 Jev routing project found Jev tool-selection/compaction did NOT generically reduce token usage. System-1 does not equal cheaper. Every candidate below carries a rejection clause: measure System-2 calls avoided without reducing success or safety; if it loses at its seam, reject it there. This is the Ask-FYD-reranking rule generalized.

---

## 1. TENANTOS D0/D1/D2 DECISION SURFACE TABLE

D0 = deterministic computation (Jev has no place). D1 = bounded semantic judgment (the Jev candidate class). D2 = open-ended reasoning (stays with frontier intelligence / humans).

Each row carries an explicit AUTHORIZATION verdict. HARD RULE: Jev NEVER makes tenant authorization decisions. "Which of these already-authorized workers is best suited to this authorized mission?" is GOOD. "Jev thinks Nolan may access tenant B" is NEVER.

| # | Decision surface | Call site (observed) | Current mechanism | D-class | Jev candidate? | Authorization touch? |
|---|---|---|---|---|---|---|
| 1 | Tenant context resolution (which tenant a request acts as) | `adapter.js:89` resolveTenantId (fail-closed throw on namespace contradiction); `src/fyd/tenant/tenant-context.ts` requireTenantContext/withTenantContext (typed TenantContextError, traversal-safe tenantScopedDir); `mc-dispatch-identity.ts:66` resolveCaller; `mc-tenant-gate.ts:45` callerScope (400/403) | Deterministic: authenticated principal -> trusted tenant resolution -> typed TenantContext. Client-supplied tenant selector never overrides trusted context (namespace_binding.js: "requested wins iff bound") | D0 | NO | YES: this IS the authorization decision. REJECT Jev unconditionally. |
| 2 | Data semantic classification (GLOBAL / PUBLIC / TENANT_PRIVATE / SHARED / DERIVED) | None in code. Exists only as Nolan's 2026-09-24 directive: classify state semantically before adding columns or considering RLS | Human design judgment, enforced later by deterministic predicates (RLS, projection gates) | D1 (design-time) | ADVISORY ONLY: Jev may propose classification labels on new state items during review, shadow mode. The classification never takes effect by Jev's say-so; a human or the deterministic enforcement layer decides. Authorization is decided by the enforcement predicates, not by the label. | Indirect. ACCEPT only as a design-time advisor with human/deterministic ratification. REJECT as an enforcement input. |
| 3 | Capability grant/deny per work order | `vendor/external_agent_adapter.js:185` authorizeWorkOrder: 8 deny reasons at :188-218; wall-clock expiry branch :193. Called adapter.js:1239 (dispatch gate) and re-run at issue :1298 under the index lock | Deterministic rule engine (registry AGENT_PROFILES: status, blockedExternal, allowedCapabilities, maxConstraints) | D0 | NO. Lane 11 tournament contract #1 sits here but classifies DETERMINISTIC; its value is regression-locking the 8 checks, not judgment | YES: grant is C4 authorization. REJECT. |
| 4 | Copilot identity fence (identities 1-4 allowed, 5-10 denied) | adapter.js ~:1225, first check in dispatchExecution, per-dispatch re-evaluation; Nolan 2026-09-25 directive | Deterministic static binding + per-dispatch re-check | D0 | NO | YES. REJECT. |
| 5 | Executor selection (which worker runs this work order) | TODAY: CALLER decides (dispatchExecution opts.agentId; mc-dispatch POST body.agent). Adapter only validates whitelist + LIVE + capability allowlist. NO capability-eligibility selection, no rationale, no "why this worker" event (lane14 R2, laneB5 D2). ABSENT decision | Caller-within-rails; silent default | D1 | YES: the prime candidate. Staged AFTER deterministic eligibility, Jev ranks among already-eligible workers. Selection among authorized workers is not authorization. | NO, if and only if staged post-authorization (see section 2). Any design that lets Jev admit an unauthorized worker is REJECTED. |
| 6 | Authority posture per order (effect ceiling, sandbox, data classes) | TODAY: ABSENT as a decision. Lives in AGENT_PROFILES maxConstraints data + caller constraints with monotonic tightening (lane14 R1, highest constitutional risk) | Adapter data, not a per-order authority decision | D0 should-be; currently carried data | NO. Posture is the authorization delta; must become an explicit CapabilityAuthority decision, never a Jev judgment | YES. REJECT. |
| 7 | Context selection (what context the executor receives) | `ask-composer.ts:189` buildAskContext (reached); compileAskContext declared-only at HEAD; ContextPack patch branch closes the gap; `context_pack_id` minted per order (params-only today, Lane 10) | Dispatcher-explicit; ranking surface D-09 rankDiscoveryItems exists but is UNWIRED | D1 | YES: rank/order/filter context items for the executor; never choose what the executor is ALLOWED to see (that is authorization). This is the same family as the standing first experiment: Ask FYD evidence reranking, shadow mode | NO for ordering/filtering; the allow-to-see decision stays deterministic (capability registry + tenant context). Split the decision: Jev orders, code permits. |
| 8 | Mission/work prioritization and queue order | Scheduler: lease/reap logic (HOLD/reaper P0); no priority judgment code found | Deterministic (FIFO, lease expiry) | D0 | NO (today). A future "which work first" judgment would be D1 but there is no label source and no volume case today. | NO touch, but NO candidate either. |
| 9 | Incident severity classification (ok/warning/critical) | `health-rules.ts:59` defaultHealthRules, :112 checkThreshold, :103 loadHealthRules; production callers validation-engine.ts, metrics.ts (laneB1 V15 D-15) | Deterministic classification; the THRESHOLDS are human config | D0 classification; D1 threshold tuning | THRESHOLD TUNING only, advisory: Jev may propose threshold adjustments from alert-history, applied by human approval. The classification itself stays deterministic. | NO for tuning recommendation; the alert decision stays code. |
| 10 | Notification relevance (what reaches the owner as WAITING_APPROVAL / escalation) | B-10 (laneB1 V26): NO CODE PRIMITIVE anywhere in canonical src/. Operator-executed procedure: read mission state -> hold/propose/escalate. grill-20 (B-03, agent-executed SI-03): verdict composition is deterministic over per-check judgments; 25 records in escalation-log.jsonl | Human/procedure; grill-20 composition deterministic | D1 for the triage scoring; D2/HUMAN for the actual hold/propose/escalate choice | YES for relevance SCORING (a notification relevance score feeding a ranked queue); the escalate/approve/deny CHOICE stays human (H-01/H-05). Escalation going to a human is carried-verdict safe. 25-record label source exists for grill-20-style calibration. | NO if Jev only scores/orders and a human or deterministic gate decides. The moment a score would AUTO-ESCALATE or AUTO-HOLD, it touches owner authority: REJECT. |
| 11 | Request routing to tenant stores / projections | `src/fyd/tenant/scoped-stores.ts`; `g-route-isolation.test.ts`, `e-scoped-stores.test.ts`, `b-projection.test.ts`; TenantOS INCOMPLETE at HEAD (ingress hostile 15/15 green; vector/postgres/event-privacy gates not fully there) | Deterministic store selection from trusted TenantContext | D0 | NO | YES: routing a request to tenant A's store vs tenant B's is the authorization-relevant read/write path. REJECT. |
| 12 | Outreach eligibility (send/skip/HOLD per prospect) | Agent-executed per round; rules in ~/AGENTS.md; statuses in pipeline files (laneB1 V22 B-06). B-05 never-reengage guard: deterministic allow/drop on durable ledger history, engagement-guard.py:432/:518/:557 | Bounded judgment + deterministic ledger gates | D1 | Partial: the CONFIDENCE judgment ("highest-confidence prospects") is already Jev-shaped; the never-reengage guard itself is pure deterministic code and must stay so (it is the authorization-adjacent safety policy) | Mixed: re-engagement policy is a standing owner directive; Jev may not relax it. Jev may score prospect confidence; the ledger gate stays code. |
| 13 | Worker result triage (CLEAN_PASS / VERIFY_MORE / NEEDS_FALSIFIER / ...) | Nolan's 2026-09-26 live-shadow program defined this as the first strategically valuable Jev family; labels: CLEAN_PASS, VERIFY_MORE, NEEDS_FALSIFIER, NEEDS_DEEP_REVIEW, CONFLICTING_EVIDENCE, MALFORMED, AUTHORITY_OR_SECURITY_REVIEW. ORCA remains the dispatcher | Not yet live; defined for shadow | D1 | YES: headless-result triage. It only adds friction (VERIFY_MORE) or routes to deeper review; it never promotes a worker claim to truth. Promotion is per-family: SHADOW -> ADVISORY -> POLICY-GATED LOW RISK -> AUTONOMOUS LOW RISK. | NO: the triage verdict never authorizes anything; AUTHORITY_OR_SECURITY_REVIEW is the explicit escalation lane. |

Sharpest three D1 candidates (by volume x failure-cost x evidence availability):
1. **Executor selection among deterministically-eligible workers** (row 5): the R2 gap (no selection authority, no rationale) is exactly Jev-sized; J4 shadow routing harness already proved the shape; staged post-authorization so it never touches grant/deny.
2. **Context selection / evidence reranking for work-order input** (row 7): already the standing first experiment (Ask FYD evidence reranking, shadow, CURRENT vs CURRENT+JEV, reject if it loses). Zero authorization touch; measurable quality metric.
3. **Escalation/notification relevance scoring** (row 10): 25-record grill-20 label source exists; escalation lands on a human so carried-verdict risk is contained; attention tax is a real measurable cost.

---

## 2. WORKER ROUTING DESIGN (design only, not built)

### 2.1 The pipeline: MISSION -> REQUIREMENTS -> ELIGIBLE -> JEV RANK -> THRESHOLD -> DISPATCH/ESCALATE

**Stage 0. Requirements extraction (D0, deterministic code).**
The dispatcher assembles a Mission Requirements record from fields PING already owns on every WorkOrder (lane14 section 2): capability, constraints, namespace, deadline, input shape, plus a declared risk class (read_only | effecting | external) and environment (pig | wsl | cloud | browser). No model involvement. Requirements are a deterministic projection of the mission plus operator policy, emitted as an event before routing so the extraction itself is auditable.

**Stage 1. Deterministic eligibility intersection (D0, code). All authorization lives here.**
Input: requirements + the worker registry. Eligibility is the conjunction of these checks, each already code-owned in PING:

1. Registry membership: agentId in AGENT_PROFILES (unknown -> DENY, laneB5 A3/A4 fail-closed).
2. Liveness: status == LIVE (no live probe exists today; lane14 R5 is the known gap; do not invent one here).
3. Quota/block: blockedExternal not active (fail-closed on UNKNOWN/stale broker state; the codex stale-expiry D4 incident is the falsifying case).
4. Capability: required capabilities ⊆ profile.allowedCapabilities (authorizeWorkOrder :208).
5. Posture: mission constraints ⊆ profile.maxConstraints, monotonic tightening, hard no_canonical_events + no_mission_state_writes (lane14: this must become an explicit CapabilityAuthority decision per order; until it does, the registry ceiling applies and any profile change is an operator act, never a Jev act).
6. Tenant binding: namespace resolves via resolveTenantId / requireTenantContext; fail-closed on contradiction (D-04, tenant-context.ts). Jev NEVER participates in this step.
7. Copilot fence: identity_5..10 DENIED per-dispatch (adapter.js ~:1225). Deterministic.
8. Budget: dispatcher quota check on Copilot BROKER_STATE, fail-closed on unknown/stale.

Empty eligible set -> deterministic fallback: HOLD with typed reason (never Jev, never silent). Non-empty -> proceed. **The eligible set is, by construction, a set of already-authorized workers for this mission.** This is what makes Stage 2 constitutionally safe: Jev chooses among equals, never admits anyone.

**Stage 2. Jev ranking (D1, bounded).**
A single typed Jev call receives ONLY: the eligible worker descriptors (whitelisted fields: id, capability set relevant to the mission, environment, availability, cost class, current load, recent success rate on this task family, declared constraints) + the mission requirements + a task-family tag. Per Nolan's 2026-09-26 privacy call: NO tenant identity in the Jev payload, not even hashed; content-bearing families go to official TypeSafe only; the canonical decision record carries hashes/evidence references only.

Jev answers a narrow ranked question: "Order these already-eligible workers by expected success for this task family" + confidence per rank position. Output shape: ranking + confidence + one-sentence rationale per top pick (the J4 five-choice harness used the same shape: DETERMINISTIC_WORKER | HEADLESS_AGENT | DEEP_REASONER | VERIFY_MORE | HUMAN_REVIEW with a seven-field whitelisted state).

**Stage 3. Confidence threshold (D0, deterministic code).**
- confidence >= threshold T (T set from PING's own shadow data, never a magic number; lane11 U-04 calibration is NOT established, so T is provisional and the bar is the Nolan rule: 100 high-quality shadow decisions before volume) -> dispatch to top-ranked worker. The dispatch writes the lane14 contract's `executor_selection` record: {decided_by: "ping:executor-selector", rationale: "jev-rank", confidence, at: ISO}. Jev recommends; PING records the decision.
- confidence < T -> System-2 escalation (deep reasoner picks, or deterministic cheapest-fit fallback). Escalation is logged as the routing decision, not hidden.
- Jev provider anomaly (timeout, malformed, 429/529 exhausted, auth/schema failure) -> fail-closed per the J7 harness: zero ALLOW outcomes; 429/529 bounded retries then deterministic fallback; auth/schema failures HOLD; every recommendation remains shadow-denied. This is the same J4 rule: "every recommendation remains shadow-denied."

### 2.2 Capability descriptors (no 50 agent classes)

The registry already has this shape; extend it, do not proliferate classes.

Worker descriptor (stored data, operator-owned; what AGENT_PROFILES already approximates):
```
worker {
  id,                       // registry key, e.g. hermes, cloud-subagent, copilot-2
  capabilities,             // subset of capability vocabulary; ceiling, not decision
  environment,              // pig | wsl | cloud | browser
  availability,             // live | pending_auth | blocked (static today; live probe = known gap R5)
  cost_class,               // free-local | quota-metered | spend
  current_load,             // dispatcher-observed
  recent_success,           // per task-family success rate from verified outcomes (effect_unknown-safe: completion only, never effect truth)
  constraints               // maxConstraints ceiling
}
```

Mission requirements (dispatcher-computed, deterministic):
```
mission {
  required_capabilities,    // must all be satisfied
  preferred_capabilities,   // tie-break signals
  risk,                     // read_only | effecting | external
  environment,              // allowed environments
  expected_output           // envelope kind: text | artifact | decision-record
}
```

Grounded in what PING actually has: AGENT_PROFILES (~9 entries across four ORCA dispatcher families: hermes variants with fixture.read/text.transform/text.summarize; cloud-subagent with orchestration.plan/review + generation capabilities; opencode/test.generate families; codex DORMANT/HOLD), Copilot broker identities 1-4 fixed (5-10 denied), the headless Hermes bridge as the proven transport, and the orca-adapter mc-dispatch SLICE_AGENTS defense-in-depth list.

### 2.3 What this design explicitly does NOT do

- It does not let Jev admit, deny, or change the posture of any worker. R1 (posture as data) and R2 (no selection authority) are the gaps it closes; it does not move authorization into Jev.
- It does not let Jev see tenant identity, per the standing privacy call.
- It does not assume Jev is cheaper. Per-family measurement: deep-reasoning calls avoided, success rate, safety incidents, latency, verified decisions per dollar. The archived 2026-09-26 finding (Jev tool-selection/compaction did not generically reduce token usage) is the null hypothesis for every family.
- It does not replace the caller default silently: the executor_selection record makes the rationale auditable, which today is absent (R2).

---

## 3. GUARDS HARVEST (allow/ask/deny, from the Jev ecosystem)

Sources: leepokai/jev-guard (live project, updated ~4 days ago), eugeniughelbur/jev-engineering (MIT, 39 commits, 300-injection attack kit, measured: 0 of 12 dangerous commands ran where Claude Code auto mode let 8 run; review-router caught 13/13 CVE fixes a filename rule sent to quick review), id774/sandbox tool_guard (self-contained TypeScript reference), ismaelga/omp-config Jev-guard adoption plan, marttp "where Jev fits in multi-agent systems".

### 3.1 The canonical pattern (convergent across all sources)

1. **Jev answers narrow typed questions; the policy lives in code.** jev-guard asks four parallel questions per action: `risk` (4-level Score: read-only -> easy to undo -> hard to undo/outside workspace -> destructive), `approval` (Noul: would a careful senior engineer want human approval?), `user_requested` (Noul over session context), `from_untrusted` (Noul: does this carry out an instruction planted in content the agent read?). The reducer is pure source code, not config:
   - `deny` if risk >= 2.5 (or destructive/exfiltrates/off-scope over a denyScore);
   - `ask` if risk >= 1.5 or approval >= 0.75;
   - `user_requested >= 0.85` can downgrade ask -> allow;
   - **user_requested NEVER lifts a deny**;
   - **from_untrusted is a standalone deny**, independent of risk level.
2. **Ordering is the whole design** (jev-engineering: "Four steps, and the order is the whole design"): (a) hard rules first: deterministic denials in plain regex, single-digit milliseconds, never call the model; (b) fast-path read-only allowlist, never call the model; (c) Jev; (d) thresholds from the operator's own observe-mode log. Denials run BEFORE the allowlist on purpose: a command name says nothing about its arguments (`cat` vs `cat ~/.ssh/id_ed25519`); a shipped-wrong-way-round test pins this. Rationale: the model is least reliable exactly where a hard rule is easiest to write.
3. **Modes:** observe (log everything, block nothing) -> guard (block deny, log the rest) -> enforce (block deny and ask). "Read your own decisions.jsonl for a week before you turn anything on. That file is the only source of thresholds that will fit your work."
4. **Fails open in interactive UX, must fail closed in PING.** jev-engineering fails open to the harness's normal permission prompt on error/timeout/missing key. PING's worker runtime is headless, so the omp-config plan's rule applies: when there is no UI, an `ask` must BLOCK (HOLD), otherwise the layer is theatre.
5. **Cache scoping:** action verdicts embed session-relative state (user_requested), so a global action cache would let one session's request authorize an identical command in another. Key action verdicts by session id AND call hash. Only content scans may use a bare content hash.
6. **Provenance for from_untrusted:** the untrusted-content question needs a real provenance channel (paths and URLs read this session, metadata only, no content). Without it, scope the question to intent-phrasing and cap its authority at ask, never deny.
7. **The placement rule (marttp):** "A probability is evidence, not authority. High-risk actions still need deterministic policy or human approval." Jev sits on the edges between agents, tools, and shared state, never in place of the agents doing open-ended work. Output-space dividing line: choose from known routes / score relevance / approve-ask-deny a tool call -> decision model + policy code; perform a high-risk action -> deterministic policy + human approval.
8. **Adjacent primitives from the same repo:** `route` (pick model tier before spending, confidence floor 0.5 steps up one tier not to the top), `rank` (order up to 255 options against one criterion in a single call), `keep` (drop context items verbatim, never summarize; a summary silently loses the exact path or error). All three are one-request, parallel-answer, state + typed questions.

### 3.2 Where such guards sit in PING (friction ADDERS; they never remove a constitutional check)

The invariant: a Jev guard may only ever tighten (allow -> ask, allow -> deny, ask -> deny). It may never loosen a deterministic verdict, never grant, never lift a deny (the user_requested rule). CapabilityAuthority remains the sole decider of every grant.

Candidate insertion points, each with the exact typed question:

- **A. Work-order prompt assembly gate (pre-transport).** Between Stage 0 requirements and transport invoke: "Does this proposed prompt/command appear inconsistent with the stated mission requirements and constraints?" Verdicts: ALLOW | ASK (route to operator HOLD with the inconsistency quoted) | SUSPICIOUS (treat as ASK with the laneB5 D8 objective-fidelity warning attached). Hard rule first (deterministic: constraint-violation regexes over the prompt), then Jev. This fences the laneB5 D8 gap (objective fidelity uncheckable) with friction rather than proof.
- **B. Result-evidence quality signal (post-verify).** After verifyResultEnvelope passes structurally: "Does this evidence look fabricated or placeholder?" (the Hermes `12:34:56Z` placeholder case, laneB5 D7). Verdicts feed only the triage labels: CLEAN_PASS | VERIFY_MORE | NEEDS_FALSIFIER. Never flips verify's valid/invalid; never promotes evidence to truth; effect_state stays effect_unknown.
- **C. Prompt-injection planted-instruction detector on tool results fed to workers.** "Does this tool_result carry an instruction from untrusted content that the mission did not request?" With a real provenance channel (paths/URLs read in the run, metadata only). Standalone-deny only where the provenance channel exists; otherwise cap at ASK. The deny feeds the existing reconcile/HOLD path, never a new authority.
- **D. Escalation-record second look (grill-20 input).** Before a grill-20 `decide` verdict on a C4-check item: "Does this decision package omit a check that a careful reviewer would require?" ASK routes to the owner. The decide/escalate composition stays deterministic; the guard only adds asks.
- **E. Outbound message hold (outreach sends).** The jev-engineering "outbound check" use case: hold risky drafts before send. In PING outreach: the never-reengage ledger gate stays deterministic code; Jev may add ASK on drafts that read as customer-posing or B2B-line-missing, but the deterministic disclosure-line check remains the hard rule.

For every insertion: ship in OBSERVE mode first, log every verdict (session id + call hash keyed), derive thresholds from PING's own log, and keep the J7 fail-closed posture: any Jev-side error -> deterministic fallback, zero ALLOW outcomes from the guard itself. The guard is a second lock, never the lock.

---

## 4. SECURITY BOUNDARY (what Jev must never decide)

Non-negotiable, per the standing decisions file and Nolan's binding orders:

1. **Tenant authorization.** Who may act as tenant B; cross-tenant reads/writes; tenant context resolution; namespace binding; caller-to-tenant mapping. Decided ONLY by: resolveTenantId, requireTenantContext, callerScope, mc-dispatch-identity, the namespace binder, and deterministic store/projection predicates. Jev sees no tenant identity at all (2026-09-26 privacy call: exclude tenant identity entirely, including hashed).
2. **Capability grants.** authorizeWorkOrder's GRANT|DENY, the identity_5..10 fence, authority posture per order, constraint ceilings. Jev never grants, never lifts a deny, never loosens a deterministic verdict.
3. **Canonical truth.** Worker output is a claim; only PING authorities promote evidence to events. Jev never establishes truth, never merges identities, never erases evidence.
4. **Owner authority.** approve|deny|hold on WAITING_APPROVAL, FYD publish, Mission Control approvals, gateway fixes. Silence never approves; Jev never fills a human's seat.
5. **Execution.** Jev never invokes transport, never dispatches, never cancels, never retries. Its recommendations are shadow-denied until a per-family promotion decision with owner approval.
6. **Deterministic safety downgrades.** No threshold, routing, or guard may weaken a standing deterministic check (never-reengage, monotonic constraint tightening, no_canonical_events, reconciled retry). Jev adds friction only.

Operational corollaries: Jev payloads carry hashes/evidence references, never raw tenant content; failure records contain no credentials, raw subject references, or raw context (J7 harness check); diagnostics reveal only CONFIGURED/NOT_CONFIGURED, never key material.

## 5. EXISTING PING CODE TO REUSE (do not rebuild)

- `vendor/external_agent_adapter.js:185` authorizeWorkOrder: the deterministic eligibility core. Extend, never duplicate.
- `AGENT_PROFILES` (vendor file :60): the worker descriptor registry. Extend with environment/availability/cost_class/load/recent_success fields; do not create parallel registries.
- `adapter.js:89` resolveTenantId + `src/fyd/tenant/tenant-context.ts` requireTenantContext/withTenantContext: tenant binding with typed fail-closed errors; the d-worker.test.ts battery (context-less worker paths fail closed) is the test shape to keep.
- `src/app/api/mc/_lib/mc-dispatch-identity.ts:66` resolveCaller + `mc-tenant-gate.ts:45` callerScope: deterministic caller-to-tenant decisions.
- `vendor/external_agent_adapter.js:306` verifyResultEnvelope: structural result binding (three-way agent binding, exact echoes, non-retryable invalid).
- Lane14 contract fields (spec, not yet code): `executor_selection` {decided_by, rationale, at}, `authority_posture`, `executor_binding` nonce, `action_fingerprint`, `input_digest`. The routing design writes into `executor_selection` first; it is the smallest contract addition with the largest audit gain.
- `~/workspace/outreach/engagement-guard.py`: the deterministic ledger-backed allow/deny guard pattern (load_index merges durable post IDs on every load; ALREADY_ENGAGED verdicts). Template for any Jev guard's hard-rule layer.
- `~/workspace/skills/competitive-signal-pass/signal_pass.py`: the exact Jev design pattern in PING's own history: LLM generates candidates, deterministic machinery (gates :222-237) decides PASS/NO_VALUE/BLOCKED/FAILURE. 57 recorded runs. Copy the architecture, not the code.
- J4 shadow executor-routing harness (`jev-shadow-routing-domain` branch): TypedDecision / JevShadowWorker / JEV_DECISION_EVALUATED path, five routing choices (DETERMINISTIC_WORKER | HEADLESS_AGENT | DEEP_REASONER | VERIFY_MORE | HUMAN_REVIEW), seven-field whitelisted state, 37/37 tests, zero production routing changes. This is the proven shadow-recording substrate for the worker-routing design.
- J7 fail-closed provider harness (`jev-failure-mode-harness` branch): 18/18 tests across timeout/429/529/401/422/malformed; zero ALLOW outcomes; bounded retry then deterministic fallback; auth/schema failures HOLD. Adopt as the provider-failure contract for any live Jev call.
- grill-20 escalation records (`escalation-log.jsonl`, 25 records): the only labeled ask/escalate corpus in the system; the label source for candidate 3.
- `~/workspace/jev-eval/privacy-envelope.md`: the privacy envelope for Jev payloads (exclude tenant identity; hashes/evidence references in canonical records).

---

## Report-back summary

**Three sharpest D1 candidates:**
1. Executor selection among deterministically-eligible workers (fills the lane14 R2 / laneB5 D2 gap: no selection authority and no rationale today; J4 shadow harness already proved the shape; staged post-authorization so it cannot touch grants).
2. Context selection / evidence reranking for work-order input (already the standing first experiment: Ask FYD evidence reranking, shadow, reject-if-it-loses; zero authorization touch).
3. Escalation/notification relevance scoring for WAITING_APPROVAL triage (25-record grill-20 label source exists; escalation lands on a human so carried-verdict risk is contained; attention tax is measurable).

**Single most important security boundary:** Jev never decides tenant authorization or capability grants. The deterministic pipeline (authorizeWorkOrder, resolveTenantId, requireTenantContext, callerScope, namespace binder, identity_5..10 fence) is the sole decider; Jev's outputs are advisory, tenant-identity-free, and fail closed to HOLD on any provider anomaly. Jev may SELECT among already-authorized workers; it may never AUTHORIZE.

**Existing PING code that already does deterministic worker selection:** NONE. Today the caller decides (dispatchExecution opts.agentId) and the adapter only validates (whitelist + LIVE + capability allowlist). The deterministic eligibility machinery exists (authorizeWorkOrder, AGENT_PROFILES, resolveTenantId, Copilot fence, broker quota gate), the selection decision itself is absent, and the selection rationale is absent. That absence is the Jev-sized hole this design fills.
