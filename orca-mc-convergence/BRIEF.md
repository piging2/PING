# ORCA + MISSION CONTROL CONVERGENCE — BRIEF

Launched: 2026-09-26 ~19:10 MDT. Nolan's full directive is in the parent transcript ("ORCA + Mission Control Convergence Directive"). This brief is the operational distillation; the directive wins on conflict.

Runs IN PARALLEL with the FYD 24-hour design sprint. DO NOT INTERRUPT the FYD product lanes. The design sprint remains primary; this convergence track is successful only if it begins helping that sprint.

## Purpose (Nolan)

Not another agent framework. Make the agents, pipelines, harvesters, falsifiers, and build lanes we already have operable through one PING control plane.

- MISSION CONTROL = control plane. ORCA = intelligence/planning/coordination capability. MISSION RUNTIME = durable work. EXECUTION AUTHORITY = execution. CAPABILITY AUTHORITY = what may happen. UNIFIED EVENT RUNTIME / PING EVENTS = history. OBJECT GRAPH = what the system knows. FYD = product using all of it.
- DO NOT collapse these into one god service. Finish Orca by REDUCING it to the missing intelligence/coordination layer between Mission intent and the existing execution/capability/event machinery.

## Phase 0: inventory before anything (READ-ONLY)

Inventory ALL existing: Orca, MissionRuntime, MissionScheduler, Run, ExecutionAuthority, ExecutionAdapter, WorkerRuntime, AIRuntime, UnifiedEventRuntime, CapabilityAuthority, Mission Control routes/UI, agent registry, artifact/evidence stores, worktree isolation, approval/proposal paths, event bridges, scheduler/retry code, existing MCP work, pipeline definitions.

Classify each: KEEP / WIRE / MERGE / RETIRE / DEAD / UNKNOWN.

NO NEW ORCHESTRATOR UNTIL THIS MAP EXISTS.

## Harvest patterns (adapt, don't import)

Durable resume, checkpoints, human-in-the-loop, agent profiles, scoped secrets, tool/MCP scoping, sandboxes, task queues, retries, timeouts, cancellation, run observability, subagents, handoffs. (LangGraph durable execution + HITL + deterministic/agentic mixing; OpenHands agent profiles + scoped secrets + MCP scoping; Temporal durable resumable workflows — patterns to harvest, not reasons to replace PING's mission/event/capability substrate.)

If PING has the primitive: WIRE IT. If PING lacks it: ADAPT the smallest mechanism. Never import another control plane.

## Target contract

MISSION -> PLAN -> RUN -> TASK/STAGE -> AGENT OR DETERMINISTIC WORKER -> TOOL/PIPELINE/EXECUTION ADAPTER -> ARTIFACT + EVIDENCE -> PROPOSED TRANSITION -> CAPABILITY/POLICY -> HUMAN APPROVAL IF REQUIRED -> CANONICAL EVENT -> PROJECTION -> NEXT WORK.

Orca's standing question: CAN SOFTWARE DO THIS? Deterministic workers own fetch/parse/validate/resolve-ID/render/screenshot/test; intelligence owns ambiguity, composition, critique. Never force every unit of work through an LLM.

Executors are equivalent resources (agent, pipeline, script, worker, browser task, test suite, harvester, falsifier), each with bounded INPUTS, CAPABILITIES, TIMEOUT, RESOURCE LIMIT, OUTPUT CONTRACT, EVIDENCE CONTRACT.

Agent profiles: ROLE, MISSION, INPUT OBJECTS, ALLOWED TOOLS, ALLOWED CAPABILITIES, VISIBLE CONTEXT, SECRET REFERENCES, OUTPUT CONTRACT, TIMEOUT, RESOURCE BUDGET. Never dump every secret and object into every agent. Build/reuse the deterministic context compiler: Mission + Stage + objects + relationships + evidence + artifacts + capabilities + visibility -> BOUNDED AGENT CONTEXT. Private context must never enter a public artifact.

MCP IS AN ADAPTER, NOT THE CORE. MCP availability != PING authorization. Every consequential operation still crosses CapabilityAuthority.

## Mission Control minimum UI

Active missions: RUNNING / BLOCKED / WAITING APPROVAL / FAILED / COMPLETE. Open mission: goal, stages, current stage, assigned executor, input objects, outputs, evidence, capabilities, logs/events, pending approval, retry/cancel. THAT'S ENOUGH. Do not build a giant dashboard.

Mission Control must answer at a glance: what are we trying to accomplish, what is running, who/what is doing it, what does it have permission to do, what inputs, what did it produce, what failed, what is blocked, what needs human approval, what should run next.

## Dogfood: real FYD missions, no toys

First production-like mission: "Generate and improve Happy Place." Stages: ACQUIRE, EXTRACT, RESOLVE, COMPILE, RENDER, SCREENSHOT, FALSIFY, PROPOSE IMPROVEMENT, TEST, RENDER AGAIN. Mixed executors (crawler deterministic, planner agent, renderer deterministic, screenshot deterministic, visual critic agent, security deterministic). Prove: mission persisted, run created, bounded executors assigned, deterministic steps run without LLM, agent step gets bounded context, tests execute, renderer executes, screenshot executes, falsifier returns evidence, artifact lineage preserved, failure visible, retry safe, approval visible if needed, mission resumes after worker interruption, events reconstruct state.

Then the SAME mission definition for Coppersmith (different objects/evidence). If Mission Control needs customer-specific orchestration: FAIL.

Then bounded parallelism: one FYD build mission fanning to acquisition/media/provenance/visual falsifier/mobile falsifier/accessibility/security, JOIN, planner/reviewer. Concurrency bound, budget, cancellation, timeouts, typed outcomes: SUCCEEDED / FAILED / BLOCKED / CANCELLED / TIMED_OUT / UNKNOWN. UNKNOWN matters: never blind-retry after side effects; consequential execution needs reconciliation. Idempotency keys from stable mission/run/stage/input identity. Resume without duplicating ingestion/writes/events/emails/follows.

## Execution infrastructure

Pig sleep already destroyed browser targets. Scoped wake locks: mission starts -> acquire execution lease; mission finishes/cancels -> release. Never global no-sleep. Worker disappears -> typed failure/UNKNOWN.

Worktree isolation per code-writing run: mission_id, run_id, agent_id, worktree, base SHA, result SHA, diff, tests. No casual edits to the canonical dirty tree. Mission Control displays lineage.

Orca harvest loop: SEARCH -> HARVEST -> COMPARE -> ADOPT/ADAPT/REJECT -> IMPLEMENT -> TEST -> FALSIFY. Harvest artifacts carry SOURCE, VERSION/SHA, LICENSE, PATTERN, PING EQUIVALENT, DECISION, DEPENDENCY COST. Distinguish CANONICAL EVIDENCE from WORKING NOTES from LEARNED PROCEDURE from AGENT MEMORY. Never dump agent thoughts into canonical history.

Approval scales with consequence: read auto, local analysis auto, draft auto, reversible FYD presentation preview/lightweight, external communication explicit policy, public provider write explicit capability, destructive strong approval.

## Projections

FYD customer sees Build my FYD / Customize with FYD / Ask FYD. Operator/developer sees Mission Control. Same objects/runs/capabilities, different projection. Never leak Mission Control into customer websites.

## Forbidden

Do NOT create OrcaAuthority, MissionControlAuthority, PipelineAuthority, AgentAuthority, TaskAuthority, PlannerAuthority, ApprovalAuthority. USE THE EXISTING SYSTEM. If a primitive is genuinely insufficient, PROVE IT WITH A FAILING DOGFOOD MISSION FIRST.

## Return format (report in these sections)

ORCA EXISTING / MISSION RUNTIME / EXECUTION / CAPABILITIES / EVENTS / AGENTS / PIPELINES / DUPLICATES RETIRED / MISSING WIRING / MISSION CONTROL MINIMUM UI / FYD HAPPY PLACE MISSION: PASS-FAIL / FYD COPPERSMITH MISSION: PASS-FAIL / DETERMINISTIC WORK % / INTELLIGENCE WORK % / RESUME AFTER INTERRUPTION: PASS-FAIL / CAPABILITY DENIAL: PASS-FAIL / APPROVAL: PASS-FAIL / WORKTREE LINEAGE: PASS-FAIL / FIRST BROKEN BOUNDARY / NEXT.

## Order of work

KEEP FYD PRODUCT MOVING. ARCHAEOLOGY OF EXISTING ORCA/MISSION INFRA. WIRE, DON'T REWRITE. RUN REAL FYD MISSION. FIX FIRST BROKEN BOUNDARY. RUN SECOND FYD MISSION. ONLY THEN IMPROVE MISSION CONTROL UX.

## MISSION CONTROL FINISH DIRECTIVE (Nolan, authoritative, 2026-09-26 ~19:25 MDT: ~/workspace/fyd-autonomy/batch5-owner-disposition.md; operating law O1-O17 in ~/workspace/fyd-autonomy/scratch/axioms.md)

REPLACES the abstract plan. The critical spine is:

OBSERVATION -> CANONICAL EVENT -> MISSION -> DECISION -> CAPABILITY/AUTHORITY -> DISPATCH -> EXECUTION -> RESULT -> VERIFICATION -> EVIDENCE -> REPLAY -> MC PROJECTION

Get the reached-path REAL first. The 100-gap inventory continues around it but must NOT become documentation theater: cluster gaps by root invariant; one root fix closes multiple gaps. No dashboards for theory.

Minimum useful MC: Overview, Missions, Approvals, Runs, Objects, Events/Evidence, System Health — all showing REAL states (NOT_STARTED/STARTED/EFFECT_UNKNOWN/EFFECT_PROVEN/COMPLETED) with identity, tenant, initiator, causation, reversibility, capability decision, dispatch attempts, external-effect state, HOLD/UNKNOWN reasons, replay paths. UNKNOWN MUST LOOK UNKNOWN.

Standing corrections absorbed from Batch 5: Q2 spend needs per-lane accounting, loop ceilings, duplicate-work detection, auto-stop on repeated identical failure (unbounded spend is an external effect); Q14 cut over only after clean-checkout one-click proof; Q20 run both frozen-graph and fresh-acquisition tests; Q31 observation != acceptance != regeneration != publication; Q15 truthful incompleteness over hard refusal; Q21 Ask FYD stays in the product proof, one excellent question. O5: implementer never certifies itself (IMPLEMENTER + INDEPENDENT FALSIFIER). O6: HOLD means hold. O11: escalate only genuine constitutional-authority questions.

## NORTH STAR (Nolan, binding, 2026-09-26 ~19:20 MDT)

Every single observation, proposal, and mission on this device goes through Pigi and Mission Control. Nothing dispatches, nothing records evidence, nothing schedules, nothing touches a capability without flowing through the unified control plane.

Implications for this track:
- Phase 0 inventory gains a hard filter: for every observation pipeline, proposal generator, and mission dispatcher found, ask WHICH BYPASSES THE NORTH STAR. Every bypass is a gap.
- Deliverable: the 100 biggest Mission Control gaps between today's state and the north star, ranked foundational-first (identity/authority resolution, event ingestion, capability gating, mission dispatch, approval, audit — the things everything else needs). Each: gap, why it blocks the north star, what exists today that bypasses it, what the wire-up looks like.
- Then WIRE from gap 1 downward: no god service, no new authorities; wire existing primitives behind Mission Control as the single front door. Where wiring would violate the forbidden list, prove it with a failing dogfood mission and escalate — that is a Nolan decision.
- The pass-health panel and deterministic engagement pipeline are gap items in this list, not a separate track.
- Preserve everything in flight: design sprint untouched, engagement schedules running, worker machinery keeps operating while wiring happens around it. Nothing gets ripped out from under a running mission.

## Nolan's engagement-pipeline endgame (2026-09-26 ~19:15 MDT, authoritative: nolan-pass-health-architecture.md)

Convergence target for ALL social surfaces (Instagram, Facebook, Threads, TikTok, X):

DISCOVERY -> EVIDENCE -> POLICY ENGINE -> ACTION MANIFEST -> INTENT LEDGER -> EXECUTOR -> OBSERVATION -> VERIFICATION -> EVENT STORE

LLM sits BESIDE the deterministic system (discovers, classifies, drafts), not above it. The natural-language policy sprawl in engagement pass bodies must be condensed into a small deterministic state machine — that is where the next engineering effort goes, not another 20 rules.

Mission Control pass-health panel (his mock): last-pass status (SUCCESS_ACTION etc.), actions landed vs caps, unknown count, candidates/eligible/skipped, 7-day rollup (passes, actions, failures, unknown, blocks), one-click WHY DID IT STOP? / WHY WAS THIS CANDIDATE REJECTED? / WHAT DID THE BROWSER ACTUALLY DO? — every one answerable from the event/evidence store (EXISTING UnifiedEventRuntime/PING events, not a new store), never from prose logs.

NEVER ACCEPT A FAILURE is the standing posture: in-run troubleshoot extends to every social pass — diagnose and recover inside the run, never defer to the next pass.

Constraints: engagement schedules keep running; changes to pipeline machinery must be backward compatible with running crons or sequenced through the parent coordinator. One writer per semantic unit. Do not touch FYD product surfaces.

## BATCH 6 AUTHORITY ADJUDICATION (Nolan, authoritative, 2026-09-26 ~19:45 MDT: ~/workspace/fyd-autonomy/batch6-owner-disposition.md)

SUPERSEDES Batch 6's recommended defaults where they differ. The constitutional correction:

HUMAN AUTHORITY DEFINES POLICY; IT IS NOT A SUBSTITUTE FOR POLICY.

Nolan defines policy, risk appetite, delegations, publication, money, credentials, privacy posture, irreversible commitments. Deterministic software operates inside those boundaries. The capability architecture exists precisely to avoid asking the human repeatedly about decisions the human has already made.

Binding interpretations now in force (extend O1-O17):

- MISSION CONTROL PROJECTS AUTHORITY; IT DOES NOT OWN IT. No MissionControlAuthority.
- JEV CLASSIFIES; IT DOES NOT AUTHORIZE. No new authority for consequence either: CONSEQUENCE CLASS {reversibility, external_effect, money, publication, privacy, credential_access, destructive_scope, commitment} is POLICY INPUT to the existing capability/authorization path. No ConsequenceAuthority, no ApprovalAuthority, no PrivacyAuthority, no SpendAuthority, no PublicationAuthority. Rule of one holds.
- HERMES EXECUTES; IT DOES NOT GOVERN.
- SILENCE IS NOT CONSENT. Approval binds an exact proposal digest. Never EXPIRE_APPROVE (expiry may mean EXPIRED/CANCELLED/SAFE NO-OP or another preauthorized state). Chat and Mission Control are PRESENTATIONS of the same ApprovalRequest {id, proposal_digest, capability, actor, consequence, expires_at?}; neither surface owns approval.
- AUDIT IMMUTABILITY DOES NOT REQUIRE PII IMMUTABILITY. Canonical event history is append-only; corrections are superseding events; secrets/PII/erasable payloads live behind revocable references with a retention lifecycle (ACTIVE/STALE/SUPERSEDED/SUPPRESSED/ERASURE_REQUESTED/ERASED) and are never embedded immutably.
- DELEGATION IS EXPLICIT, SCOPED, REVOCABLE, AND EXPIRING. Nolan owns delegation authority; low-risk classes may promote under pre-authorized policy once the mechanism is proven.
- BUDGET IS A CAPABILITY CONSTRAINT. Mission receives token/money/wall-clock/tool-call/loop ceilings; executor cannot exceed without escalation.
- PUBLICATION IS AN EXTERNAL EFFECT. OWNER DATA IS MINIMIZED BY DEFAULT.
- UNKNOWN IS A VALID TERMINAL/RECOVERY STATE. HOLD means HOLD; never blind-retry an unknown external effect.

Program (this section replaces abstract planning): inventory every active worktree (observe before every consequential write; one writer per semantic unit); build the narrow MissionIntent front door (validate → authorize → dispatch → observe; legacy callers become adapters; no flag day; bypass becomes illegal per migrated mission class only after replay-tested migration); add consequence metadata to policy evaluation; project WAITING_APPROVAL into Mission Control; add mission budgets; migrate ONE engagement pass through the spine and prove dispatch/hold/approve/deny/timeout/worker-death/UNKNOWN/receipt/replay before migrating others; keep the FYD product sprint moving independently; keep the swarm fed (rolling queue >= 16 meaningful tasks while real work exists).

QUESTION ERA CLOSED (2026-09-26 ~20:12 MDT, Nolan final). Batch 7 was the last fixed batch and is complete. NO BATCH 8. Escalate only: REAL OWNER AUTHORITY + NEEDED NOW + CONSEQUENTIAL + NOT ALREADY DELEGATED. Batch 7's 37 are final classifier training gold (19 named as should-not-have-reached-him).

## Operational rules

- Isolated worktrees, known base SHA, narrow diffs, tests, commits. No reset --hard, no blind stash, no overwriting the design sprint's files. The design sprint owns FYD product surfaces; this track WIRES the control plane and CONSUMES FYD work through missions. Coordinate file ownership through me if unclear.
- Lane reports are hypotheses until replayed from a clean checkout.
- No em dashes in anything Nolan will read.
- First readout: inventory map + classification. Check in with me at each stage; surface only genuine blockers needing Nolan's authority.

## Batch 7 locked corrections (2026-09-26, supersede where they differ)

- FREEZE VERSIONED CONTRACTS AND SEMANTICS, NOT IMPLEMENTATION SHAPE FOREVER. Historical meaning must remain replayable. CONSEQUENCE v1 vocabulary: reversibility, external_effect, money, publication, privacy, credential_access, destructive_scope, commitment. Schema change requires versioned migration with replay compatibility.
- MODEL classifies/reasons/recommends/proposes. POLICY/AUTHORITY authorizes. EXECUTOR executes exactly the authorized transition. Jev never authorizes. Hermes executes, never governs. Ambiguity increases conservatism.
- CREDENTIALS: agents almost never receive raw credentials. Broker to scoped operation to receipt. Never delegate raw credentials; delegate brokered capability to USE them.
- APPROVAL: one approval object resolves one exact proposal under one exact authority context: TENANT + ACTOR + PROPOSAL DIGEST + CAPABILITY + CONSEQUENCE + EXPIRY. Bare "yes" authorizes nothing. Terminal is terminal. No EXPIRE_APPROVE.
- EXTERNAL EFFECT: UNKNOWN is a real state. Once dispatch may have happened, reconcile before retry. Revocation blocks new dispatch immediately; in-flight effects classified honestly.
- DELEGATION durations belong to capability classes: ONE_SHOT / SESSION / UNTIL_TIMESTAMP / RECURRING_WITH_BOUND / UNTIL_REVOKED (only where justified). No reauthorization fatigue.
- JEV: first primary classes are Ask FYD evidence sufficiency and ambiguous entity/source classification; engagement scoring stays advisory. Promotion needs real evidence, not magic numbers; first consequential promotion returns to Nolan. $5/day hard ceiling stands.
- HERMES: initial consequence class is bounded filesystem mutation inside an explicitly assigned worktree. Boring-first missions. Bridge repair authorized and bounded; repair proves health, not authority.
- ENGAGEMENT migration order follows runtime evidence, not taste. Live migration stays gated: executor proof, dedupe proof, UNKNOWN reconciliation, provider authorization, platform policy, exact live-action authorization.
- UNKNOWN > FICTION: historical tenant scope is annotated, never rewritten, never backfilled to a default. Data handling is CLASS x PURPOSE x DESTINATION x TENANT x CAPABILITY x RETENTION x POLICY with default-deny on unknowns.
- T+24 CUTOVER: five technical gates + hostile-render security gate + visual/responsive at 375/390/1440; rollback retained until runtime evidence; owner acceptance is the final gate.
- ASK FYD: one known / one partial / one adversarial question per demo. Unsupported claims refused.
- BACKUP research authorized; a backup that never restored is unproven.
- CLASSIFIER target: necessary human decisions per unit of consequence. Weekly automated adversarial audit; first due 2026-10-04.
- COORDINATOR DELEGATION (standing, disposition #37): may inspect, dispatch read-only investigators/falsifiers, run tests, do bounded research, classify backlog, make reversible changes in assigned worktrees, select one writer per semantic unit, supersede patches on stronger evidence, spend inside authorized budgets, stop/HOLD work, retire only with preservation/supersession proof, integrate only where policy authorizes and gates pass. May NOT: production deploy, public publication, external messages/actions outside standing policy, spend beyond budget, new credentials, secret-policy weakening, new privacy posture, production destructive operations, unresolved cross-tenant actions, irreversible deletion of unknown work, constitutional changes, self-granted delegation.

## Brutal CEO 24-hour execution order (locked 2026-09-26)

- P0: Preserve truth. Main checkout staged material can regress the certified audit/PII repair. Capture everything, reconcile surgically, rerun the independent falsifier.
- P1: Spawn refusal explains itself. First denying component. DENIED/FAILED/UNKNOWN/RETRYABLE distinct. Then hostile-test the runtime.
- P2: Execution boundary. One executor of record (Hermes or lane-C, evidence decides).
- P3: Prove to the external-effect boundary, then stop unless the exact effect is authorized.
- P4: Red-team external-effect uncertainty. UNKNOWN means reconcile before retry.
- P5: FYD product loop. Rendered experience to Ask FYD to evidence. Design sprint keeps its lanes; observe, do not interrupt.
