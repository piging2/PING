# THE 100 MISSION CONTROL GAPS (north star: everything flows through Pigi + Mission Control)

Compiled 2026-09-26 by the ORCA/MC convergence coordinator. Ranked foundational-first: identity/authority resolution, event ingestion, capability gating, mission dispatch, approval, audit, then the engagement-surface instance, then runtime consolidation, then projection, then dogfood proof, then operational hygiene.

For each gap: what is missing, why it blocks the north star, what exists today that bypasses it, and what the wire-up looks like. Items marked [VERIFY 1/3] depend on the still-running PING substrate reader and will be reconciled when its report lands.

No new authorities. No new truth store. Wire, do not rewrite. Wiring happens around live work; nothing gets ripped out from under a running mission.

## FOUNDATION: identity, authority, events, dispatch, approval, audit

### 1. No single dispatch front door
Gap: there is no one API through which every mission, pass, run, and work order is dispatched. Why it blocks: the north star says nothing dispatches except through the control plane; today dispatch is a verb every caller performs for itself. Bypasses today: cron.d entries, the WorkerRuntime broker, fyd-factory claim.sh, the five engagement cron workers, Pig gateway one-offs, Hermes prompts. Wire-up: a Mission Control dispatch endpoint backed by the existing broker/claim machinery, with every current dispatcher converted into a caller of it (S-sequence, one surface at a time, live behavior unchanged until cutover).

### 2. CapabilityAuthority not enforced at the execution boundary
Gap: consequential effects still cross whatever the caller decides; no check sits between an executor and the outside world. Why it blocks: "nothing touches a capability without flowing through the control plane" is unenforceable if drivers can be invoked directly. Bypasses today: Pig drivers (x-engage.sh, fb-engage, ig drivers) invoked straight from cron bodies; Hermes CLI; ad-hoc ssh commands. Wire-up: wrap the EXECUTOR stage so every driver invocation resolves a named capability grant first; the Pig capability_authority.js stays the authority, Mission Control becomes the only caller path. [RESOLVED 1/3: no ExecutionAuthority implementation exists in this sandbox; the live shape is Pig-side only (`/app/gateway/capability_authority.js`). orca-adapter's `authorizeWorkOrder` is the live per-call fail-closed gate (KEEP). orca-finish's `orca_capability_gate.js` is a tool-lease layer around an injected authority, unmerged staging (WIRE).]

### 3. Observations recorded in prose logs, not the event store
Gap: what the browser actually did lives in per-pass Markdown logs, not in queryable events. Why it blocks: WHY DID IT STOP and WHAT DID THE BROWSER ACTUALLY DO must be answerable from the event store, never from prose. Bypasses today: x-engagement.md and siblings, engagement-passes/ per-pass logs, driver stdout. Wire-up: MC_PASS_* emission from cron bodies (spec lane schema done, SEQUENCE S1), then retire prose as the record of action.

### 4. No functional general approval API
Gap: there is no working approve/deny path outside the FYD owner apply flow. Why it blocks: the control plane cannot hold a consequential action for human decision if it has no approve primitive. Bypasses today: FYD owner apply (own flow, KEEP), engagement passes (no approval at all), HOLD/reconcile (staged, not deployed). Wire-up: generalize the owner apply proposal/approve/apply pattern plus the HOLD invariant into one approval path; Mission Control owns the state, the existing flows become callers.

### 5. No unified audit trail
Gap: MC_* events exist but emission is ad hoc; nobody can reconstruct who did what, when, under whose authority, from one place. Why it blocks: audit is one of the six foundational needs; the north star's "nothing records evidence except through the control plane" has no single record. Bypasses today: per-lane logs, ledger JSONLs, journal fragments, driver stdout. Wire-up: mission-control/emit.py is already the journal write path; make it the only write path by routing every emitter through it and projecting everything else from it.

### 6. No canonical agent/executor registry
Gap: there is no registry of who or what may execute work: agents, pipelines, scripts, workers, browser tasks, test suites, harvesters, falsifiers. Why it blocks: the control plane cannot dispatch to, bound, or audit an executor it cannot name. Bypasses today: external agent work-order adapter + AGENT_PROFILES.md (three copies), ad-hoc driver scripts, Copilot identities 1-4 (authorized but unregistered as executors). Wire-up: one registry (dedupe the three adapter copies first), every dispatch resolves the executor by registry id with its input/capability/timeout/resource/output/evidence contract.

### 7. No persisted CANCELLED status or cancellation API
Gap: missions cannot be cancelled; there is no terminal CANCELLED state and no API to request it. Why it blocks: a control plane that cannot stop work does not control it. Bypasses today: killing processes by hand, letting leases expire. Wire-up: add CANCELLED to the mission lifecycle, cancellation through the dispatch front door, executors check for cancellation at stage boundaries.

### 8. No persisted BLOCKED or WAITING_APPROVAL states
Gap: a mission that cannot proceed has nowhere to rest except prose. Why it blocks: the pass-health panel's "unknown count" and the approval flow both need first-class waiting states. Bypasses today: HOLD (staged), prose notes in pass logs. Wire-up: BLOCKED and WAITING_APPROVAL as persisted mission/run states with resume transitions.

### 9. No per-stage timeout enforcement
Gap: stages run until they finish or the machine gives up; no declared, enforced per-stage deadline. Why it blocks: bounded execution is a north-star promise (timeout is part of every executor contract). Bypasses today: driver-level ad-hoc timeouts, cron cadence as implicit bound. Wire-up: timeout in the executor contract, enforced at the dispatch front door, TIMED_OUT as a typed outcome.

### 10. No per-run worktree isolation with lineage
Gap: runs execute in shared working trees; there is no programmatic mission_id/run_id/agent_id/worktree/base-SHA/result-SHA/diff/tests lineage. Why it blocks: replay and evidence both require knowing exactly what code ran on what inputs. Bypasses today: the canonical dirty tree, lane worktrees created by hand. Wire-up: the dispatch front door mints an isolated worktree per run and records the lineage in the journal.

### 11. No deterministic bounded-context compiler for agents
Gap: agents receive hand-built context; there is no general compiler of mission + stage + relevant objects/relationships/evidence/artifacts/capabilities/visibility. Why it blocks: "agent receives bounded context" is a dogfood requirement; hand-built context is how policy leaks back into prose. Bypasses today: tandem/build-context-pack.py (narrow precedent, KEEP), per-lane brief builders. Wire-up: generalize the pack builder into the compiler; the LLM drafts inside the compiled bound, never outside it.

### 12. No general mission pause / wait-for-human / resume
Gap: outside FYD owner apply and the staged HOLD, a mission cannot be parked awaiting a human and resumed. Why it blocks: approval (gap 4) is useless without a place for the mission to wait. Bypasses today: cron workers that just skip, prose "waiting on Nolan". Wire-up: WAITING states (gap 8) plus resume transitions on the dispatch front door.

### 13. Unknown-outcome semantics fragmented across three vocabularies
Gap: staged HOLD/reconcile (SUCCEEDED/FAILED/SAFE_TO_RETRY/held), Pig-only effect_reconciler.js (EFFECT_*), outreach UNKNOWN_EXECUTION. Why it blocks: one control plane needs one typed-outcome vocabulary or verification cannot be deterministic. Bypasses today: each lane speaks its own. Wire-up: adopt the typed outcomes (SUCCEEDED, FAILED, BLOCKED, CANCELLED, TIMED_OUT, UNKNOWN) as the single vocabulary; HOLD/reconcile becomes the UNKNOWN handler; retire the competing spellings.

### 14. No unified proposed-transition flow
Gap: propose -> review -> approve/deny -> execute -> canonical event exists nowhere as one flow. Why it blocks: this is the control plane's core loop; every surface reimplements a fragment. Bypasses today: FYD owner apply (full loop, narrow), engagement passes (execute without propose), broker dispatch (execute without review). Wire-up: implement the loop once behind the dispatch front door; existing flows become stages of it.

### 15. No named secret references resolved only at the execution boundary
Gap: secrets travel however each lane carries them; there is no named-reference mechanism with boundary-only resolution. Why it blocks: the control plane cannot audit or bound what an executor may touch if credentials are ambient. Bypasses today: env vars, bearer tokens in container env, scattered credential files. Wire-up: named secret references in the executor contract, resolved by the front door at dispatch, never visible to the planner or the LLM.

### 16. Wake leases not wired to mission lifecycle
Gap: wake-wrap.ps1 exists per-run but nothing acquires/releases it from the mission lifecycle. Why it blocks: long missions die when the machine sleeps; the control plane must keep its own work alive. Bypasses today: manual wake-wrap invocation, global power policy debates. Wire-up: dispatch acquires a scoped lease, mission end releases it; bounded, per-mission, never global.

### 17. No Mission Control-owned scheduling surface
Gap: cron.d is live and real, but scheduling is not a control-plane concept; scheduler/ is empty. Why it blocks: "nothing schedules except through the control plane" — today cron schedules and MC watches. Bypasses today: cron.d entries, systemd timers, the five engagement crons. Wire-up: MC schedule registry projecting the live cron table first (read), then becoming the writer (one surface at a time).

### 18. No bounded fan-out / JOIN primitive
Gap: fan-out exists as prose ("parallelize") with no concurrency bounds, budget, cancellation, or typed join. Why it blocks: the dogfood requires bounded parallelism with cancellation and typed outcomes; the north star needs it for every multi-executor mission. Bypasses today: hand-rolled parallel agent spawns, xargs. Wire-up: one fan-out executor honoring the registry contracts (gap 6) with bounds and a typed JOIN.

### 19. Retry policy fragmented per lane
Gap: every lane rolls its own retry semantics (agent profiles have some, drivers have ad-hoc, broker has quota retries). Why it blocks: "retry safe" must mean one thing everywhere or UNKNOWN outcomes multiply. Bypasses today: per-driver retry loops, pass-level "do it again". Wire-up: single retry policy keyed on typed outcomes (gap 13): FAILED with SAFE_TO_RETRY retries bounded; UNKNOWN never auto-retries.

### 20. External agent work bypasses event ingestion
Gap: Hermes/Meta AI outputs land as files with provenance sidecars; nothing emits them as control-plane events. Why it blocks: "every observation goes through Mission Control" includes machine collaborators. Bypasses today: meta-ask.sh answer files, Hermes CLI stdout. Wire-up: ingestion adapter that emits OBSERVATION events for external agent outputs through emit.py.

### 21. No mission definition language adopted
Gap: factory MISSION-PROTOCOL.md is the closest thing to a mission-definition language but nothing requires missions to be written in it. Why it blocks: the control plane cannot dispatch what it cannot parse. Bypasses today: cron task bodies (prose), ad-hoc briefs. Wire-up: adopt and tighten the protocol; dispatch front door accepts only protocol-shaped missions.

### 22. No proposal schema for non-FYD surfaces
Gap: FYD owner proposals are typed and digest-pinned; engagement drafts, outreach copy, and research briefs are not. Why it blocks: proposals are north-star citizens; untyped proposals cannot flow through approval. Bypasses today: comment drafts in pass logs, email drafts in files. Wire-up: generalize the proposal envelope (digest, diff, approve/cancel) beyond FYD.

### 23. Identity of the dispatcher not recorded
Gap: events rarely say who dispatched the work: which human, which cron, which agent, under what authority. Why it blocks: audit needs a subject for every action. Bypasses today: implicit "the cron did it". Wire-up: dispatcher identity on every dispatch event (human Nolan, named cron, named agent, with the authority reference).

### 24. No authority-resolution order
Gap: when policy sources conflict (standing rule vs cron body vs lane doc), there is no deterministic precedence. Why it blocks: the policy engine (gap 30) needs a tiebreaker or it cannot be deterministic. Bypasses today: newest-memory-wins folklore, the outreach authority ordering (a good narrow precedent). Wire-up: codify the precedence chain once; the policy engine consults it, not prose.

### 25. Clock and idempotency discipline unenforced
Gap: idempotency keys exist in spots (journal, ledger) but nothing requires content-derived keys everywhere. Why it blocks: "stable idempotency keys" is a dogfood requirement; without it, retries double-execute. Bypasses today: timestamp-based dedup, filename conventions. Wire-up: content-derived idempotency keys as a dispatch-front-door requirement; duplicate delivery is a no-op with the original receipt returned.

## ENGAGEMENT SURFACE: the pipeline endgame as north-star gaps

### 26. Engagement cron bodies still carry natural-language policy sprawl
Gap: the five pass bodies encode policy in prose paragraphs the LLM must interpret per run. Why it blocks: Nolan's verdict is that this is where the engineering effort goes; prose policy cannot be a deterministic state machine. Bypasses today: x-engagement-pass__interval@2h.md and the IG/FB/Threads/TikTok equivalents. Wire-up: SEQUENCE S2 — shrink bodies to the 9-stage pipeline, deleting retired prose only as the machine proves each rule (spec lane's pass_policy_engine.py is the machine; it is built and tested, awaiting rollout).

### 27. Policy engine not yet the decider in live passes
Gap: the deterministic policy engine exists on a branch (13 states, 27 transitions, 11 reason codes, 60 green tests) but no live pass calls it. Why it blocks: the LLM still sits above the system in production; the endgame needs it beside. Bypasses today: every running pass. Wire-up: SEQUENCE rollout, X first (smallest surface), engine decides, LLM discovers/classifies/drafts inside its contracts.

### 28. No MC_PASS_* emission from live passes
Gap: the 14 event types are specced and added to emit.py (working-tree only) but no pass emits them. Why it blocks: the pass-health panel has no data until passes emit. Bypasses today: prose logs as the record. Wire-up: SEQUENCE S1 — wire emission into one platform's cron body, verify the three WHY-questions answer from the journal, then roll out.

### 29. Cap table not the single writer
Gap: caps live in cron bodies (authoritative), mirrored in the engine's snapshot table. Why it blocks: two writers for one semantic unit; drift is a matter of time. Bypasses today: cron bodies. Wire-up: SEQUENCE S3 — cap table becomes the writer, cron bodies become readers, with the weekly ramp encoded as data not prose.

### 30. Executor evidence has no intent-id join
Gap: observations (likes, comments, follows landed) cannot be joined back to the intent that requested them. Why it blocks: VERIFICATION cannot be deterministic if evidence floats free of intent. Bypasses today: driver stdout, per-pass result files. Wire-up: SEQUENCE S4 — every executor observation carries the intent id; verification joins intent to observation to receipt.

### 31. Comment proof is weak (no proof URLs)
Gap: a "comment landed" claim has no URL to check it. Why it blocks: WHAT DID THE BROWSER ACTUALLY DO needs checkable evidence, not assertion. Bypasses today: driver exit codes. Wire-up: SEQUENCE S4 — comment proof URLs captured at execution, stored with the observation event.

### 32. Follow verification is weak
Gap: follows are fire-and-forget; nothing verifies the follow relationship exists afterward. Why it blocks: unverified effects are UNKNOWN by another name. Bypasses today: x-follow-batch.sh exit codes. Wire-up: SEQUENCE S4 — post-action verification read (profile shows following), or the outcome stays UNKNOWN.

### 33. Driver preflights missing
Gap: drivers start without checking their preconditions (wrapper present, lock free, session alive). Why it blocks: the Temp-volatility incident class (x-follow-run.ps1 vanishing) becomes a pass failure instead of an infra incident. Bypasses today: drivers assume a warm world. Wire-up: SEQUENCE S4 — preflight checks with typed infra-incident outcomes, triggering in-run recovery not pass failure.

### 34. Discovery evidence is thin (reels, ads, identity, cool-downs, tiers)
Gap: discovery does not record comments-visible flags, ad flags, FB page identity evidence, TikTok cool-downs, or Threads tier rotation state. Why it blocks: the POLICY ENGINE decides on evidence; thin evidence forces heuristic decides. Bypasses today: discover scripts returning bare handle lists. Wire-up: SEQUENCE S5 — enrich discovery output to the evidence schema before it reaches the engine.

### 35. No prose-vs-journal divergence detector
Gap: nothing checks whether the prose logs and the journal agree about what happened. Why it blocks: during the migration (gaps 3, 28) the two records will drift; silent drift is how you get two truths. Bypasses today: nothing. Wire-up: SEQUENCE S6 — anomaly detector emitting DIVERGENCE events until prose is retired as a record.

### 36. No yield telemetry consumers
Gap: even with events flowing, nothing consumes them for yield analysis (which discovery sources convert, which hours perform). Why it blocks: the north star wants intelligence over the control plane; data without consumers is exhaust. Bypasses today: hand-reading pass logs. Wire-up: SEQUENCE S6 — telemetry projections off the journal; Orca consumes them for planning (intelligence beside the system).

### 37. Instagram: discovery surface drift has no detector
Gap: the CDP funnel silently produced 0 candidates across 62 result files before a human noticed the DOM had changed. Why it blocks: a dead discovery stage looks like "no eligible candidates" — the panel would report a healthy empty pass. Bypasses today: human diagnosis after the fact. Wire-up: discovery-stage heartbeat with candidate-count anomaly bounds; zero-yield streaks page as infra incidents, not quiet passes.

### 38. TikTok: no cool-down state machine
Gap: TikTok pacing relies on cron cadence, not on recorded per-account cool-down state. Why it blocks: provider safety is a policy decision; it belongs in the engine with evidence, not in the schedule. Bypasses today: 2h cadence as implicit cool-down. Wire-up: cool-down as engine state with last-action timestamps in evidence; the engine refuses over-pace with a reason code.

### 39. Threads: tier rotation not recorded
Gap: the business-radius tier system lives in prose; nothing records which tier a pass mined. Why it blocks: "continued radius expansion authorized" needs the control plane to know where the frontier is. Bypasses today: memory and prose. Wire-up: tier as pass evidence; the engine advances the frontier deterministically when a tier exhausts.

### 40. Facebook: page identity evidence not captured
Gap: the Page-must-match-business verification happens in the LLM's head; the evidence (phone/address/website match) is not recorded. Why it blocks: WHY WAS THIS CANDIDATE REJECTED needs the identity evidence, not a verdict. Bypasses today: prose verdicts. Wire-up: identity match recorded as structured evidence with the fields checked.

### 41. X: like+comment pair rule not enforced by machine
Gap: the pair rule (comment implies like on the same post) is prose; the engine now encodes it in validate_manifest but live passes do not call it. Why it blocks: prose rules are followed until a tired run skips one. Bypasses today: cron body paragraphs. Wire-up: roll out validate_manifest in the X pass first (gap 27's vehicle).

### 42. Cross-platform learning has no channel
Gap: what one platform learns (a dead discovery surface, a restriction signal pattern) does not reach the others. Why it blocks: five surfaces re-learning the same lessons is the opposite of a unified control plane. Bypasses today: per-platform docs. Wire-up: restriction signals and discovery health emitted as journal events; all five engines consume the shared signal feed.

### 43. Restriction signals not typed
Gap: "something felt off" is prose; there is no RESTRICTION_SIGNAL event with a provider, surface, and evidence. Why it blocks: fail-closed needs a typed signal or every slow load looks like a block. Bypasses today: worker judgment calls. Wire-up: typed restriction events; the engine transitions to restriction handling deterministically.

### 44. In-run recovery budget not enforced by machine
Gap: "never accept a failure" is a standing order, but no machine enforces the diagnose-recover-continue loop or its budget. Why it blocks: standing orders drift without machinery. Bypasses today: worker diligence. Wire-up: the engine's DISCOVERY_RECOVERY/EXECUTION_RECOVERY states with the 3-alternate-strategy budget (built, tested, awaiting rollout).

### 45. Pass terminal classification not machine-computed
Gap: pass outcomes (SUCCESS_ACTION etc.) are declared by the worker in prose. Why it blocks: the panel's headline number must be computed, not claimed. Bypasses today: worker's closing summary. Wire-up: classify_pass_terminal (built, tested) computed from events; the panel renders the computed class.

### 46. Engagement guard and ledger not wired to the engine
Gap: engagement-guard.py and action-intent-ledger.py are called by prose-driven workers, not by the policy engine. Why it blocks: the safety core must be inside the deterministic path, not adjacent to it. Bypasses today: worker scripts calling guard/ledger directly. Wire-up: the engine's lazy-wired GUARD_EVAL/REFUSE_EVAL (built) becomes the only call path in live passes.

### 47. Unknown-action obsession not extended to all five surfaces
Gap: the X surface's never-re-engage/unknown machinery is the strongest; the other four have weaker equivalents. Why it blocks: the north star's duplicate/unknown obsession must hold everywhere equally. Bypasses today: per-platform variance. Wire-up: port the ledger-backed dedup and UNKNOWN terminals to all five via the shared engine.

### 48. Candidate rejection reasons not queryable
Gap: WHY WAS THIS CANDIDATE REJECTED is answered today by reading prose. Why it blocks: it is one of Nolan's three one-click questions. Bypasses today: pass logs. Wire-up: all 11 reason codes emitted per candidate (built in the engine); the panel answers from the journal.

### 49. 7-day rollup not computed from events
Gap: the rollup (passes, actions, failures, unknown, blocks) is hand-counted today. Why it blocks: the panel's second block must be a projection, not arithmetic done by a worker. Bypasses today: coordinator summaries. Wire-up: rollup projection over MC_PASS_CLOSED events (spec done in PANEL-SPEC.md).

### 50. No engagement scheduling inside the control plane
Gap: the five 2h crons are cron.d entries the control plane cannot see, pause, or retime. Why it blocks: gap 17's instance for the busiest missions on the device. Bypasses today: cron.d. Wire-up: schedule registry (gap 17) absorbs the five engagement schedules first, since they are the highest-frequency dispatchers.

## RUNTIME: consolidation of what exists, wiring of what is missing

### 51. mission_runtime.js exists in 4-9 copies with no canonical owner
Gap: consolidation was claimed, not completed; behavior has drifted between copies. Why it blocks: the control plane cannot wire "the" mission runtime while several compete. Bypasses today: each lane imports its nearest copy. Wire-up: prove behavioral overlap, pick the strongest, convert the rest to re-exports or delete after deadness is proven (never old-looking-file to delete).

### 52. mission_scheduler.js in at least 3 copies
Gap: same class as 51 for scheduling logic. Why it blocks: gap 17 needs one scheduler to absorb. Bypasses today: per-lane imports. Wire-up: consolidate to one, then wire behind the schedule registry.

### 53. external_agent_adapter.js in 3 copies
Gap: the work-order adapter and AGENT_PROFILES.md are triplicated. Why it blocks: gap 6's registry needs one adapter. Bypasses today: per-lane copies. Wire-up: dedupe, then the registry owns the profiles.

### 54. No unified pipeline runner
Gap: FYD stages (acquire/extract/resolve/compile/render/screenshot/test/ask/verify/regenerate/owner-apply/refresh) are callable libraries with no composer. Why it blocks: the dogfood mission needs an end-to-end runner; the control plane needs a TASK/STAGE executor. Bypasses today: hand-sequenced lane scripts. Wire-up: build the runner as composition over the existing stages (wire, don't rewrite); it becomes the deterministic-worker half of the execution contract.

### 55. Visual capture is Pig/Windows-path dependent
Gap: screenshot machinery hardcodes Pig paths; it cannot run anywhere else. Why it blocks: evidence capture must be portable or the control plane cannot verify work off-Pig. Bypasses today: visual-capture.js with C:/ paths. Wire-up: portable screenshot runner configuration (env-injected paths, no hardcoded roots).

### 56. Stale orca_control_loop.js with broken imports
Gap: a dead control loop sits in the tree, importable-looking but broken. Why it blocks: archaeology confusion; someone will wire to the corpse. Bypasses today: nothing yet, which is the risk. Wire-up: RETIRE — salvage any useful policy into the engine spec, then delete.

### 57. Stale marketing Mission Control spec
Gap: a dead spec describes a Mission Control that was never built. Why it blocks: it competes with the real journal-projection lane for the name. Bypasses today: confusion. Wire-up: RETIRE — archive with a pointer to the real implementation.

### 58. Four Mission Control implementations, one convergence pair
Gap: journal-projection lane + UI-contract builders are the pair to keep; Pig gateway /mc API and the dead spec are the others. Why it blocks: the front door must be one. Bypasses today: gateway /mc routes bypass the journal lane. Wire-up: keep the pair, wire the gateway's useful routes behind the journal, retire the spec (57).

### 59. Pig gateway /mc API bypasses the journal
Gap: the gateway answers MC queries from its own state, not from journal projections. Why it blocks: two sources of "mission control truth". Bypasses today: direct /mc calls. Wire-up: reimplement the routes as projections over the journal; the gateway becomes a reader, not a store.

### 60. Factory claim.sh not wired to mission dispatch
Gap: claim/renew/release/status is a proven primitive living outside the control plane. Why it blocks: the dispatch front door (gap 1) should not reinvent claiming. Bypasses today: factory lanes calling claim.sh directly. Wire-up: the front door's lease mechanism wraps claim.sh semantics.

### 61. MISSION-PROTOCOL.md not enforced
Gap: the closest mission-definition language is advisory. Why it blocks: gap 21 needs a required shape. Bypasses today: prose briefs. Wire-up: front door validates protocol shape at intake; non-conforming missions are rejected with reasons, not run.

### 62. No mission templates for recurring work
Gap: every engagement pass, every outreach pass, every research pass is a bespoke brief. Why it blocks: recurring missions should be instantiations, not reinventions. Bypasses today: copied cron bodies. Wire-up: templated missions with parameters; the five engagement passes become five instances of one template.

### 63. Test suites not part of the dispatch contract
Gap: "tests execute" is a dogfood requirement but no executor contract requires a test target. Why it blocks: the control plane cannot claim verification without tests in the contract. Bypasses today: lane diligence. Wire-up: test target in the executor contract (gap 6); dispatch refuses executors with no verifiable output contract.

### 64. Artifact lineage not recorded
Gap: artifacts (screenshots, renders, reports) do not carry mission_id/run_id/producer/digest lineage. Why it blocks: "artifact lineage preserved" is a dogfood requirement; evidence without lineage is decoration. Bypasses today: filenames. Wire-up: lineage envelope on every artifact at creation, recorded in the journal.

### 65. No deterministic replay verifier
Gap: "events reconstruct mission state" is claimed but no verifier replays the journal to prove it. Why it blocks: the north star's audit is only as good as its replay. Bypasses today: trust. Wire-up: replay verifier that rebuilds mission state from events and diffs against the projection; divergence is an incident.

### 66. Resume-after-interruption unproven
Gap: no mission has demonstrated resume after worker interruption. Why it blocks: it is an explicit dogfood requirement and a north-star promise. Bypasses today: reruns from scratch. Wire-up: checkpoint events per stage; resume replays to the last checkpoint and continues; prove with the dogfood.

### 67. Retry safety unproven end to end
Gap: "retry safe" is asserted per lane, never demonstrated across the control plane. Why it blocks: gap 19's policy needs a live proof. Bypasses today: reruns that happen to work. Wire-up: the dogfood fails a stage deliberately and retries; idempotency keys (gap 25) make it a no-op-or-resume.

### 68. Capability denial unproven
Gap: no recorded instance of the control plane denying a capability request. Why it blocks: an unenforced gate is a suggestion; the dogfood requires a denial proof. Bypasses today: everything is allowed. Wire-up: dogfood mission requests a denied capability; the denial is emitted as an event and the mission routes to approval or fails closed.

### 69. Falsifier not wired as a stage
Gap: falsifiers exist (visual, claim, replay) but are not stages in any runner. Why it blocks: "falsifier returns evidence" is a dogfood requirement; verification must be structural. Bypasses today: post-hoc human falsification. Wire-up: falsify as a first-class stage type in the runner (gap 54).

### 70. No budget enforcement
Gap: missions have no spend/time/compute budget the control plane enforces. Why it blocks: bounded fan-out (gap 18) and Copilot token burn both need budgets. Bypasses today: ceilings in prose, worker restraint. Wire-up: budget in the mission definition; the front door refuses dispatch beyond budget with a typed outcome.

### 71. Copilot identities not registered as executors
Gap: identities 1-4 are authorized but live outside any registry or contract. Why it blocks: gap 6 covers all executors; authorized-but-unregistered is a bypass. Bypasses today: direct Copilot use. Wire-up: register the four identities with capability contracts and budgets (gap 70).

### 72. MCP treated as transport, not authorized
Gap: MCP availability is correctly not treated as authorization, but no MCP adapter exists behind the front door at all. Why it blocks: when MCP tools are needed, the path must already be capability-gated. Bypasses today: no MCP use (fine) with no gated path either (gap). Wire-up: MCP as an adapter behind capability gating (gap 2), never as a direct tool surface.

### 73. AIRuntime does not exist
Gap: the brief names AIRuntime as a substrate component, but no implementation exists anywhere: no class, no file, no code. Why it blocks: the spine's vocabulary references a missing component; intelligence beside the system currently means subagents and Jev with no runtime home. Bypasses today: nothing (there is nothing to bypass). Wire-up: Nolan decision required — either scope and build AIRuntime as an executor behind the registry (gap 6), or strike it from the vocabulary and let the executor registry + Jev shadow cover the need. Do not wire a fiction. [RESOLVED 1/3: explicitly NOT FOUND.]

### 74. WorkerRuntime dispatch bypasses the front door
Gap: the broker dispatches headless agents on its own authority. Why it blocks: "Mission Control can now dispatch a real headless agent" is the escalation trigger; dispatch must flow through MC. Bypasses today: broker direct dispatch; orca-adapter lane C (authorize -> work order -> hermes transport -> atomic artifact capture -> 8-field envelope verify -> WORKER_COMPLETED/WORKER_FAILED via injected UER) is the live spine here, with a live smoke 2026-09-26. Wire-up: orca-adapter becomes the execution backend; MC becomes the only dispatcher; Lane A's WorkerRuntime fail-closed repair patch is WIRE-pending. [RESOLVED 1/3: canonical WorkerRuntime is Pig-side; ~8 sandbox copies MERGE/RETIRE to it.]

### 75. UnifiedEventRuntime canonical is Pig-side; local copies are dead
Gap: the canonical UER lives on the Pig; sandbox UER copies (convergence-lane3, demotion-lane) have dangling requires and are dead; emission here is voluntary across four surfaces. Why it blocks: a voluntary event store is a suggestion box. Bypasses today: every prose log; the orphaned Pig Orca ExecutionEngine's private EventQueue (RETIRE; lane-D confirms it off the dispatch path). Wire-up: local canonical emission is mission-control/emit.py -> journal (KEEP, live); fyd-journal-gateway JSONL serves the :3100 read path (KEEP); dead UER copies RETIRE; merge toward UER as sole acceptance, with one identity law across the five minting schemes (gap C8). [RESOLVED 1/3.]

## PROJECTION: the panel and honest Mission Control UI

### 76. Pass-health panel not built
Gap: Nolan's mock exists on paper; no panel renders last-pass status, actions vs caps, unknown count, candidates/eligible/skipped, or the 7-day rollup. Why it blocks: it is the north star's first visible proof for the busiest missions on the device. Bypasses today: prose summaries in chat. Wire-up: PANEL-SPEC.md build order, ending in the ping-ui-contract projection builders; data only from the journal.

### 77. Three WHY-questions not one-click
Gap: WHY DID IT STOP / WHY WAS THIS CANDIDATE REJECTED / WHAT DID THE BROWSER ACTUALLY DO require reading logs today. Why it blocks: Nolan named them as the panel's reason to exist. Bypasses today: human log-reading. Wire-up: query logic is specced (PASS-HEALTH-EVENT-SCHEMA.md); panel wires the three queries to the journal.

### 78. Honesty rules not encoded in projections
Gap: the UI-contract builders label missing authority paths honestly, but nothing enforces honesty in new projections. Why it blocks: a panel that fabricates controls is worse than no panel. Bypasses today: builder discipline. Wire-up: projection honesty as a tested invariant — missing data renders as missing, never as zero or stale-as-fresh.

### 79. No mission list projection
Gap: there is no one screen listing live missions with state. Why it blocks: the control plane's most basic view. Bypasses today: asking in chat. Wire-up: projection over mission table + journal; read-only first.

### 80. No mission detail projection
Gap: no drill-down from mission to runs to stages to events to evidence. Why it blocks: the three WHY-questions generalize to every mission. Bypasses today: file archaeology. Wire-up: detail projection composed from the same event queries as the pass panel.

### 81. No approval queue UI
Gap: approvals (gap 4) need a human surface. Why it blocks: WAITING_APPROVAL with nowhere to approve is a dead letter. Bypasses today: chat messages. Wire-up: minimal approve/deny surface projecting the approval queue; every decision emits an event with dispatcher identity.

### 82. No capability grant view
Gap: nobody can see what capabilities are granted to which executor. Why it blocks: capability gating (gap 2) without visibility is unreviewable. Bypasses today: code reading. Wire-up: projection over the registry's capability contracts.

### 83. No schedule view
Gap: the control plane cannot show what is scheduled and when it last/next runs. Why it blocks: gap 17/50 need a visible schedule. Bypasses today: crontab -l. Wire-up: schedule registry projection (read-only over cron.d first).

### 84. No audit view
Gap: no UI answers "what did the system do in the last 24h". Why it blocks: audit (gap 5) needs eyes. Bypasses today: log spelunking. Wire-up: journal projection with dispatcher, action, outcome, evidence links.

### 85. Projections not labeled by freshness
Gap: nothing says how old the data on screen is. Why it blocks: stale-as-fresh is the honesty failure mode (gap 78). Bypasses today: n/a. Wire-up: every projection carries its as-of event id and timestamp; the panel shows it.

## DOGFOOD: proof the wiring holds

### 86. Happy Place mission not run through the control plane
Gap: the dogfood mission exists as a requirement, not a run. Why it blocks: every gap above is a hypothesis until a real mission exercises it. Bypasses today: lane-local runs. Wire-up: run "Generate and improve Happy Place" (ACQUIRE through RENDER AGAIN) with mission persisted, bounded executors, deterministic stages without LLM, typed outcomes, idempotency keys, worktree lineage.

### 87. Coppersmith second-mission not run
Gap: the identical-mission-different-objects proof is pending. Why it blocks: customer-specific orchestration smuggled into the runner fails the north star's generality. Bypasses today: n/a. Wire-up: run the identical definition against Coppersmith; any custom orchestration is a FAIL report, not a patch.

### 88. Bounded fan-out not demonstrated
Gap: fan-out with concurrency bounds, budget, cancellation, timeouts, typed outcomes is unproven. Why it blocks: gap 18 needs a live proof before the panel work completes. Bypasses today: hand-rolled parallelism. Wire-up: dogfood stage fans out bounded, one branch cancelled mid-flight, join typed.

### 89. Resume after interruption not demonstrated (mission-level)
Gap: distinct from 66's mechanism: no full mission has resumed after a killed worker. Why it blocks: explicit dogfood requirement. Bypasses today: restarts from scratch. Wire-up: kill a worker mid-dogfood, resume from checkpoint events, verify state reconstruction.

### 90. Deterministic-vs-intelligence work split not measured
Gap: "DETERMINISTIC WORK %" and "INTELLIGENCE WORK %" are report fields with no instrumentation. Why it blocks: the endgame's core claim (LLM beside, not above) must be measured per mission. Bypasses today: estimates. Wire-up: stage-level tagging (deterministic vs intelligence) emitted in events; the panel reports the split.

## OPERATIONAL HYGIENE: keeping the wiring honest

### 91. Duplicate clusters not retired on a schedule
Gap: duplicates are inventoried, not retired. Why it blocks: every duplicate is a future bypass. Bypasses today: continued use of nearest copies. Wire-up: retire queue with deadness proof per item (gaps 51-53, 56-57); one writer per semantic unit enforced at merge time.

### 92. Lane reports still accepted without clean-checkout replay
Gap: the replay rule exists as memory, not machinery. Why it blocks: unverified claims become wired-in assumptions. Bypasses today: trust in lane self-reports. Wire-up: no merge to a shared branch without an independent clean-checkout replay; the verifier's result is the record.

### 93. No escalation records for Nolan-directed questions
Gap: the SI-03 classifier log exists for FYD autonomy but not for control-plane decisions. Why it blocks: "keep it quiet unless a gap requires Nolan's authority" needs a record of what was decided vs escalated. Bypasses today: chat. Wire-up: extend the escalation log to control-plane wiring decisions; every Nolan-authority gap gets a record.

### 94. Worktree discipline not enforced by tooling
Gap: "known base SHA, narrow diffs, isolated worktrees" is convention, not tooling. Why it blocks: conventions drift under load; the dogfood's lineage needs machinery. Bypasses today: diligence. Wire-up: dispatch mints worktrees (gap 10); merges require the lineage fields present.

### 95. No dead-code reaper for the convergence tree
Gap: retired items linger (stale specs, dead loops, superseded docs). Why it blocks: archaeology confusion compounds; gap 56/57 are instances of a standing need. Bypasses today: manual cleanup. Wire-up: periodic deadness scan with the archive-before-delete rule; deletions only after deadness is proven.

### 96. Wake policy still debated per incident
Gap: every sleep-related failure reopens the global-vs-scoped debate. Why it blocks: settled policy (scoped leases, gap 16) needs machinery so it stays settled. Bypasses today: memory entries. Wire-up: lease acquisition in the dispatch path; the debate ends where the code begins.

### 97. No control-plane health signal
Gap: nothing reports whether Mission Control itself is healthy (journal writable, projections fresh, dispatch responsive). Why it blocks: the north star's single front door is a single point of failure with no pulse. Bypasses today: noticing when things break. Wire-up: health events on a short cadence; the panel's first row is MC's own pulse.

### 98. Pig/WSL path assumptions scattered
Gap: C:/ paths, /mnt/c paths, WSL-only /tmp assumptions are spread across drivers and docs. Why it blocks: portable wiring (gap 55) needs the assumptions in one place. Bypasses today: per-script fixes. Wire-up: path policy in one module; drivers read it, never hardcode.

### 99. No runbook for "the control plane is down"
Gap: if MC fails, every north-star flow stops and nobody knows the fallback. Why it blocks: a front door with no failure plan becomes a reason to bypass it. Bypasses today: n/a. Wire-up: fail-closed runbook — dispatch refuses safely, in-flight missions checkpoint, prose is never the fallback record.

### 100. The gap list itself has no owner or refresh cadence
Gap: this list rots the moment it is written unless something keeps it current. Why it blocks: the north star is a standing direction; its gap inventory must be a living projection. Bypasses today: this file. Wire-up: gaps become tracked items with states (OPEN/WIRING/PROVEN/CLOSED); the list regenerates from the tracker; review cadence weekly until the foundational twenty are closed.

---

## Wiring order (first pass)

Start at gap 1 and move down, except where a later gap is the proven prerequisite tooling for an earlier one. Sequencing notes: gaps 3+28+45+48+49 (event emission) unblock the panel (76+77) and are additive, so they wire first in practice; gaps 2+6+13+19 (gating, registry, outcomes, retries) are the dispatch front door's load-bearing walls; gap 51-53 dedup is prerequisite to 6. Nothing here authorizes touching the FYD design sprint's files or live cron behavior before its SEQUENCE step.
