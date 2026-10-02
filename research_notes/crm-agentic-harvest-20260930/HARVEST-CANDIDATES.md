# Harvest Candidates (ranked)

Date: 2026-09-30. Source: the CRM/agentic harvest survey (34 systems, report.md). Every entry carries the smallest steal, what we deliberately do NOT take, continuity grade, differentiation note, and verdict. Ranked by steal-first value to PING: how small the primitive is, how directly it serves the evidence/replay substrate, and how production-tested it is.

---

## 1. Failure-trace debugger with replay-as-proof

- **Source:** Intercom Fin (Fin Operator's debugger skill). Evidence: **independent** (VentureBeat interview with Intercom leadership; corroborated detail that Operator runs on Claude as an engineering-like task).
- **Mechanism:** Given a failure artifact, trace every internal reasoning step, identify the root cause (commonly user-written guidance creating a reasoning loop), propose a corrected rule, replay the corrected rule against the original failing conversation to prove the fix, then propose a standing production monitor for the recurrence pattern. Closed loop: trace -> root-cause -> proposed edit -> replay proof -> monitor.
- **Smallest steal:** replay-as-proof-of-fix. Any proposed rule change must re-run against the exact failing artifact before it can be adopted.
- **What we deliberately do NOT take:** the conversation-resolution-first worldview (volume of resolutions is not evidence); the custom-model route (Apex model ownership is not our lane); the flywheel claim that every conversation makes the system smarter.
- **Continuity grade:** B (real trace-and-replay per conversation; no canonical event plane behind it).
- **Differentiation note:** We replay against the recorded event artifact, not a conversation export; we require owner approval of the exact diff; we store the correction as an owner-governed overlay with provenance (X was evidence, Y is the owner correction). A fix proven against one replayed case plus an owner signature is auditable; a flywheeled fix is only statistically plausible.
- **Verdict: ADOPT.**

## 2. Evidence-carrying scores

- **Source:** 6sense (every 6QA score ships with the signals that moved it and the comparison baseline). Evidence: **vendor-described** (July 2026 MCP launch PR), pattern corroborated **independent** by a practitioner data-model doc.
- **Mechanism:** A derived score is never shipped alone; it carries its support set (which signals moved it, how it compares to past outcomes), so the consumer acts on the number instead of second-guessing a black box.
- **Smallest steal:** every derived score/claim carries its support set at presentation time.
- **What we deliberately do NOT take:** the proprietary Signalverse as a data dependency; patented black-box scoring as an authority; account-only granularity (PING's person and property entities matter more for home services); vendor-measured effectiveness numbers as evidence.
- **Continuity grade:** B (closest thing in the survey to evidence-bound derived truth; substrate still daily snapshots).
- **Differentiation note:** 6sense tells you which signals moved the score; we let you re-run the movement from the immutable event log, with the model version pinned. Deterministic, replayable reasoning, not a vendor narrative.
- **Verdict: ADOPT.**

## 3. Mandatory entity binding for observations

- **Source:** Common Room (official docs: signals must map to a Contact/Organization/Custom Product Entity to be usable for personalization; entity-loose signals like job listings and news are explicitly quarantined). Evidence: **independent** (three corroborating official-docs pages).
- **Mechanism:** Every observation declares its entity binding at write time; observations that cannot bind are typed as entity-loose and barred from entity-scoped actions.
- **Smallest steal:** entity-binding as a write-time rule on the event plane, with a quarantine type for the unbound.
- **What we deliberately do NOT take:** whole-product dependency (now Zoom-owned); the mutable "continuously updated" profile assumption; Person360/Context360 as new authorities (identity stays PING-owned, owner-governed).
- **Continuity grade:** B (real activity streams and SIEM audit logs; mutable profiles).
- **Differentiation note:** Our binding is evidence-bound and immutable: the entity link is part of the event's provenance, owner corrections create new events rather than rewriting, and regeneration deterministically re-derives the same profile. Common Room cannot prove what it believed last Tuesday.
- **Verdict: ADOPT.**

## 4. Conditional execution gates on costly agent steps

- **Source:** Claygent (practitioner workflow order: filter -> qualify with a cheap model -> enrich with an expensive one -> personalize -> send-gate formula -> push; table filters hide rows so credits never burn). Evidence: **independent** (practitioner skill repos, review analysis).
- **Mechanism:** Every costly agent step declares a run-condition evaluated before execution; the gate order is cheapest-first; failed conditions are logged, not silently skipped.
- **Smallest steal:** run-condition declarations on every costly agent step, gates evaluated against the event plane, gate decisions recorded as events.
- **What we deliberately do NOT take:** the mutable-table blackboard (snapshot amnesia at the center of the workflow); Clay's credit-metered execution as a dependency; unverifiable "remembers context across runs" claims.
- **Continuity grade:** C (mutable table; prompt versioning is B-like for config only).
- **Differentiation note:** PING chains agents over an append-only event log instead of a mutable table: each agent's conclusion is a timestamped, attributable event, so the chain replays exactly and one step can be corrected without corrupting the rest.
- **Verdict: ADOPT.**

## 5. Capabilities exposed as callable agent tools

- **Source:** Unify (50+ native skills, Claude/MCP connector exposing ~50 tools); corroborated by folk's hosted MCP server and Pipedrive's native MCP server. Evidence: **independent**.
- **Mechanism:** The system's capabilities (signals, enrichment, sequencing) are callable as typed tools by external agents, not just reachable through a UI.
- **Smallest steal:** every system capability callable as a typed tool with a per-call permission model.
- **What we deliberately do NOT take:** any one vendor's connector as a dependency; tool catalogs as authority nouns.
- **Continuity grade:** C (plays are automations over current-state snapshots).
- **Differentiation note:** Our tools act on the evidence plane, so tool calls and their results are witnessed events with causal chains, replayable and falsifiable.
- **Verdict: ADOPT.**

## 6. Dry-run-estimate-first with write-protected computed cells

- **Source:** Copy.ai Tables (dry_run mode returns sample inputs and estimated cost before a live run; live runs refuse without max_credits; at cap the run finalizes cleanly; computed cells refuse hand-edits so provenance is machine-recorded). Evidence: **independent** (open-source GitHub skill documenting exact refusal semantics; independent 2026 product analysis).
- **Mechanism:** Estimate-first execution (no paid/batch AI step without a cost estimate), hard budget refusal, and tamper-evident computed values (superseded only by new runs, never hand-edited).
- **Smallest steal:** dry-run estimation as a required first mode for any paid/batch AI step; write-protected computed values; budgets that refuse cleanly.
- **What we deliberately do NOT take:** the credit-based billing unit as an internal primitive (we express budgets in our own terms); the Infobase as a mutable trained-knowledge store; whole-product adoption.
- **Continuity grade:** C (cells carry no binding to the run that produced them).
- **Differentiation note:** Copy.ai's cells are tamper-evident but not evidence-bound: you know a run produced the value, not why the value is true. We bind each value to its support set and keep every superseding run as a new event in history.
- **Verdict: ADOPT.**

## 7. Approval gates with named approvers + draft-by-default external sends

- **Source:** Lindy (per-action "Ask for Confirmation" with named approvers; external sends default to draft; condition-based escalation instead of guessing); corroborated by D365 Cowork's propose-don't-act posture and Copy.ai's review-as-workflow-node. Evidence: **independent** (official docs mirrored on GitHub, third-party reviews).
- **Mechanism:** Every consequential action carries an approval gate with a named approver; external sends default to draft; stuck/confused states escalate instead of guessing; approvals are typed nodes with recorded rationale.
- **Smallest steal:** nothing irreversible without an approval; the approval records who approved which exact artifact and when.
- **What we deliberately do NOT take:** the Lindy platform and credit-pool dependency; "AI employee" framing as an authority noun; mutable memory files as the store of record.
- **Continuity grade:** B (genuine approval provenance; mutable memory files).
- **Differentiation note:** Our approvals are immutable events on the evidence plane: who approved which exact artifact, on what evidence, replayable forever. Lindy's mutable files show what is believed now but cannot prove what was believed when.
- **Verdict: ADOPT.**

## 8. Deterministic nodes with agents as orchestrators

- **Source:** Gumloop (deterministic visual workflows; agents configured with prompt + model + toolset that can include pre-built workflows; "the agent orchestrates, the workflow executes"; run_id with per-node inputs/outputs; personal-credential execution). Evidence: **independent** (vendor blog + third-party review + GitHub skill doc).
- **Mechanism:** Separate the deterministic path (fixed nodes, typed IO) from the agentic path (prompt + tools + exit criteria); let agents call deterministic workflows as tools rather than improvising every step; every run gets a run_id with per-step IO logged.
- **Smallest steal:** every automated step is either a deterministic node with typed inputs/outputs or an agent step with declared tools; agents may act only through declared tools; every run gets a run_id with per-step IO logged.
- **What we deliberately do NOT take:** the Gumloop platform and credit-metering dependency; the NL builder as authoring authority; per-node logs mistaken for an event-sourced history.
- **Continuity grade:** B (genuine run provenance; logs not replayable).
- **Differentiation note:** PING makes the run log the event log: runs are immutable event sequences replayable deterministically, not just inspectable; owner approval gates sit on consequential nodes and approvals are events themselves.
- **Verdict: ADOPT.**

## 9. Triage inbox with an age SLA

- **Source:** Linear (every issue from an external integration lands in Triage and is processed on a short cadence; norm: nothing sits longer than 48h; fixed 5-state workflow vocabulary so analytics compose). Evidence: **independent** (multiple corroborating integration/skill docs; ops best-practices doc for the SLA).
- **Mechanism:** A mandatory inbound queue with an age SLA, separate from the committed backlog, so signal never rots silently; every transition timestamped with its actor.
- **Smallest steal:** mandatory triage inbox with an age SLA on inbound signal (missed calls, texts, emails, lead events).
- **What we deliberately do NOT take:** the Linear product/API dependency; their specific state names as law; the assumption a fixed vocabulary fits every domain (it fits work tracking, not customer knowledge).
- **Continuity grade:** B (complete attributable history; derived stream, not source of truth).
- **Differentiation note:** Our transitions are immutable events, so cycle-time analytics and "what did we know when" derive by replay; owner intent (customer-accepted vs internally-done) is a separate governed fact, not overloaded onto workflow state.
- **Verdict: ADOPT.**

## 10. Grounding as an enforced invariant

- **Source:** Salesforce Agentforce (Einstein Trust Layer: no customer-data answer without retrieved org data; zero data retention with third-party LLM providers; PII masking). Evidence: **independent** (mechanisms consistently described across independent technical sources).
- **Mechanism:** Grounding enforced as a platform invariant, not a prompt suggestion: no answer about customer data without retrieved evidence.
- **Smallest steal:** the invariant itself: no customer-data answer without retrieved evidence.
- **What we deliberately do NOT take:** the Salesforce platform; Data Cloud as the data architecture; opaque engines as acceptable; Trust Layer as a product (we implement the invariant structurally).
- **Continuity grade:** B (strongest grounding enforcement in the survey; agent traces ephemeral).
- **Differentiation note:** Our grounding is structural and replayable: the retrieval query, the retrieved chunks, and the model version are all recorded as events. Agentforce enforces grounded-or-silent at runtime; we add grounded-and-reproducible with owner corrections surviving regeneration.
- **Verdict: ADOPT (as a principle, implemented our way).**

## 11. Propose-don't-act with per-call permission enforcement

- **Source:** Microsoft Dynamics 365 Cowork (agent proposes record updates, drafted emails, case resolutions for approve/edit/dismiss; every tool call re-checks the caller's permissions; missing data produces explicit unknowns). Evidence: **vendor-described** (official Microsoft blog, mechanism-specific; no independent implementation review).
- **Mechanism:** Agent writes are proposals with approve/edit/dismiss; every tool call enforces the caller's identity and permissions; ambiguity surfaces as an explicit unknown, never a fabrication.
- **Smallest steal:** propose-not-act as the default posture for agents; per-call permission checks; explicit UNKNOWN.
- **What we deliberately do NOT take:** the Microsoft stack (Dataverse/Power Platform dependency trap); closed vendor-published plugin ecosystems; Work IQ as an authority noun.
- **Continuity grade:** B (most PING-aligned governance posture; snapshot state underneath).
- **Differentiation note:** Our proposal->approval->action chain is itself the durable record on the evidence plane; Microsoft enforces per call and surfaces proposals in the UI, we make the chain replayable forever.
- **Verdict: ADAPT (treat as near-standing-law for our agents).**

## 12. Brand/constraint objects with a pre-delivery conformance gate

- **Source:** Jasper (Jasper IQ: brand voice, audience profiles, style guide as named constraint objects injected into every generation endpoint; outputs checked for voice distortion before the final draft, violations surfaced as correctable diffs). Evidence: **unreplicated** (consistent across vendor pages + three independent reviews, no technical deep-dive).
- **Mechanism:** Named, versioned constraint objects + a pre-commit conformance check before any generated artifact leaves.
- **Smallest steal:** named constraint objects with a pre-delivery gate that surfaces violations as correctable diffs.
- **What we deliberately do NOT take:** model-routing-as-feature; template sprawl; the website-crawl-into-mutable-blob memory toggle (knowledge-staleness anti-pattern).
- **Continuity grade:** C (mutable brand store; run history without inputs).
- **Differentiation note:** Our constraints are evidence-bound: this rule came from the owner's dated statement (owner-governed), that fact from 12 support conversations (derived). The brand never silently drifts into statistical mush; disputes about who set a rule are answerable.
- **Verdict: ADAPT.**

## 13. Governance as generation-time constraint injection

- **Source:** Writer (voice profiles encode style guides and terminology, applied from the moment work is created; compliance-by-construction; per-scope tuning). Evidence: **vendor-described** (BusinessWire; effectiveness numbers vendor-commissioned, directional only).
- **Mechanism:** A defined constraint injection point where named, versioned constraints enter the generation context before any token is produced, tunable per team/product/region/audience.
- **Smallest steal:** the injection-point shape: constraints enter before generation, never as post-hoc review.
- **What we deliberately do NOT take:** the proprietary-model strategy; multi-model integration surfaces; the Knowledge Graph as a vendor noun; commissioned-TEI numbers as evidence.
- **Continuity grade:** B (audit logs and observability; no replay substrate).
- **Differentiation note:** Writer governs what the agent may say and spend; we govern what the agent may claim and why. Governance of expression vs governance of truth.
- **Verdict: ADAPT.**

## 14. Permission-aware retrieval with citation-per-claim

- **Source:** Notion (retrieval filtered by requester identity before generation; every answer carries clickable citations; 22-tool MCP server); corroborated by ClickUp's ACL-carrying chunks and Asana's scoped AI permissions. Evidence: vendor-described + one independent-single-source evaluation.
- **Mechanism:** The retrieval corpus is filtered by the requester's identity before generation; every generated claim cites its source.
- **Smallest steal:** identity-filtered retrieval; citation-per-claim.
- **What we deliberately do NOT take:** the Notion platform or its MCP server as an integration authority; 30-day version history as a continuity story; citing-a-page as grounding.
- **Continuity grade:** B (answers cite current page state, not pinned revisions).
- **Differentiation note:** We bind citations to immutable evidence events, not current page state: the same answer regenerated later must either reproduce or explicitly show what evidence changed.
- **Verdict: ADAPT.**

---

## 15. Typed AI steps with declared IO + an NL-to-rule compiler

- **Source:** Asana AI Studio (trigger/condition/action rules; "Use AI" steps declare read scope and output contract; Words-to-Workflows compiles plain-language descriptions into triggers, conditions, actions, AI variables). Evidence: **vendor-described** (official help center + product page); service-account audit pattern **independent**.
- **Mechanism:** A rule schema where any AI step declares its read scope and output contract; an NL compiler that targets that schema instead of emitting free-form agent behavior; machine actors identified as such in the record.
- **Smallest steal:** every automation is a typed rule; every AI step is logged with its inputs, prompt version, model, and outputs.
- **What we deliberately do NOT take:** the Asana platform; credit-metering as the trust model; story consolidation as "history" (never silently collapse events); NL-generated rules treated as safe without a human-readable, reviewable rule artifact.
- **Continuity grade:** B with a sharp caveat (story consolidation silently destroys events: the snapshot-amnesia failure mode wearing an audit-trail costume).
- **Differentiation note:** Our AI steps are immutable events with no consolidation, so any past decision replays exactly; owner intent governs consequential steps via explicit approval gates, and approvals are events too.
- **Verdict: ADAPT.**

## 16. Per-field enrichment provenance with per-attempt cost events

- **Source:** Clay (waterfall enrichment: providers queried cheap-to-expensive until one resolves; every resolved field records which provider resolved it; every provider hit records a credit event with record, provider, credits, time). Evidence: **independent** (practitioner modeling docs, skill repos, independent reviews).
- **Mechanism:** Every enriched fact names its resolving provider; every attempt logs its cost; "only if empty" guard logic.
- **Smallest steal:** per-field resolver attribution + per-attempt cost events.
- **What we deliberately do NOT take:** Clay's opaque credit-metering internals; the async table-run architecture (timeout mismatch with agent loops); Clay-hosted tables as the store.
- **Continuity grade:** C (snapshot table; provenance per field is a seed).
- **Differentiation note:** Our enriched facts are observation events with support sets (provider, query, timestamp, credit cost) on the evidence plane; when a cheaper provider later resolves the same field, conflicts resolve by evidence precedence, not overwrite order, and the expensive miss stays in history.
- **Verdict: ADAPT.**

## 17. Full-context handoff packets

- **Source:** Qualified/Piper (in-the-moment qualification against live CRM data; handoff to the human owner with the complete context: identity, history, what was asked, what was established). Evidence: **independent** (technical research doc, competitor comparison, BusinessWire PRs; 500+ companies, ~1,500 G2 reviews at 4.9).
- **Mechanism:** Qualify against live state in the moment; every booking/handoff carries a complete context packet.
- **Smallest steal:** the handoff packet: identity + history + what was established + open questions, generated at the moment of handoff.
- **What we deliberately do NOT take:** Salesforce lock-in (30-60 day deployments needing a dedicated admin); the "AI SDR replaces your team" framing; Salesforce-owned roadmap risk.
- **Continuity grade:** C (conversations as surface; CRM as record).
- **Differentiation note:** Our handoff packet is evidence-graded: confirmed facts distinguished from agent inferences, every fact linked to its source event, the owner correcting the record with new events rather than editing the agent's memory. Piper hands you a summary; we hand you a provable file. This is the home-service killer feature: missed-call capture with a provable packet.
- **Verdict: ADAPT.**

## 18. Process state on the membership edge

- **Source:** Attio Lists (each list entry carries its own stage/status fields independent of the underlying record; pipeline views are lists with entry-stage attributes; idempotent `entries assert` as first-class API semantics). Evidence: **independent** (open-source CLI docs, third-party playbook repos, independent reviews).
- **Mechanism:** Process state lives on the membership edge (record-in-list entry), not on the record; record attributes stay separate from process state.
- **Smallest steal:** the primitive: stage/status lives on the edge, attributes on the record.
- **What we deliberately do NOT take:** Attio's whole custom-object system as a schema authority; the snapshot-record assumption; freeform owner scheming without governance.
- **Continuity grade:** B (real timeline + webhooks; history a sidecar).
- **Differentiation note:** Our list entries are evidence-bound events with causal links (who, when, from what evidence) that replay into entry state, not overwrites of a stage column. An owner correcting a stage is a governed act, not a lost overwrite.
- **Verdict: ADAPT.**

## 19. Staleness as a derived state property

- **Source:** Pipedrive activity-based selling (every deal must carry a next scheduled action; no activity in 7+ days = flagged stalled; AI proposes the specific next action). Evidence: **independent** (multiple corroborating reviews).
- **Mechanism:** A missing next_action is itself a signal with an owner; follow-up becomes a state property, not a memory problem.
- **Smallest steal:** deal/job = {state, next_action_due}; staleness computed, never remembered.
- **What we deliberately do NOT take:** deal-value-blindness (assistant treats $500 and $50,000 deals alike); passive Smart Contact Data enrichment (documented misattribution); Pipedrive as the store.
- **Continuity grade:** B (timeline on snapshots).
- **Differentiation note:** Our next action is an outcome window with owner and deadline, computed by replaying the event stream; an honestly open window is never turned into a metric (no-signal discipline); the owner sees the full history of prior nudges, not just the current "stalled" badge.
- **Verdict: ADOPT (the pattern).**

## 20. Derived columns computed from the event stream

- **Source:** Streak Magic Columns (50+ derived fields auto-computed from linked communication history, zero data entry; typed communication objects preferred over hand-typed date columns). Evidence: **independent** (primary technical source + third-party reviews; 750k+ users).
- **Mechanism:** Derived attributes computed deterministically from the communication event stream, never hand-typed.
- **Smallest steal:** derived columns as projections over events; typed communication objects instead of manual logging fields.
- **What we deliberately do NOT take:** Gmail/Chrome-extension lock-in; the box-equals-row model as a primitive; thread-presence-equals-truth.
- **Continuity grade:** B (email-thread provenance for conversations; structured fields snapshot).
- **Differentiation note:** Our derived values are projections over an immutable log, so they are recomputable on any machine; corrected timestamps are events, not silent recomputes; refresh never hides the correction.
- **Verdict: ADOPT (the pattern; PING projections already do this, Streak validates it at scale).**

## 21. Score data-floor gating with first-class UNKNOWN

- **Source:** Freshsales Freddy (scoring trained on the tenant's own conversion history; documented ~100-contact data floor; nothing below it). Evidence: **independent** (cross-vendor comparisons with honest documented limits).
- **Mechanism:** A published minimum-data floor and a "not enough data" state instead of a fake number.
- **Smallest steal:** score = f(own conversion history) with a published floor and first-class UNKNOWN.
- **What we deliberately do NOT take:** native-sequence tooling; suite lock-in; scoring-as-black-box.
- **Continuity grade:** B.
- **Differentiation note:** Our scores are projections with cited support sets; every contributing signal is an inspectable event; model version recorded; insufficient history is a state, not a low number.
- **Verdict: ADAPT.**

## 22. Evidence-cited inline critic

- **Source:** Lavender (live 0-100 score with specific in-flow fixes; personalization assistant surfacing prospect context; team learning loop from what worked). Evidence: **independent** for the critic (TechCrunch 2023); vendor-described for the loop and outcome claims.
- **Mechanism:** A critic that scores a draft in-flow and attaches each suggestion to a reason; the loop's training data and weight changes visible.
- **Smallest steal:** in-flow critique with a cited reason per suggestion.
- **What we deliberately do NOT take:** generic style heuristics as truth (a 90+ score is a style proxy, not a truth proxy); stateless per-email suggestions; cold-email-as-default.
- **Continuity grade:** C (stateless per-email scoring).
- **Differentiation note:** Our critic is evidence-cited: every suggestion links to the record that justifies it (the estimate, the service history); personalization means referencing true facts about this customer. Lavender optimizes how the email reads; we constrain what it may claim.
- **Verdict: ADAPT.**

## 23. Signal -> channel + cadence + message as one logged decision

- **Source:** Regie.ai Signal Selling (the system decides the ideal channel and timing as well as the message; AI prioritization surfaces high-intent leads). Evidence: **vendor-described** (PR Newswire).
- **Mechanism:** On a signal, decide channel + timing + message as one decision, logged together.
- **Smallest steal:** the outreach decision as one logged event with its reasons, subject to owner-intent governance on autonomous outreach.
- **What we deliberately do NOT take:** whole-platform adoption; vendor-held messaging intelligence (your voice training their model is a dependency trap); signal-count marketing.
- **Continuity grade:** C.
- **Differentiation note:** We prove why this touch, this channel, this hour, and the owner can change the policy without retraining a black box; the decision is a governed, replayable event.
- **Verdict: ADAPT.**

## 24. ACL-carrying indexed chunks

- **Source:** ClickUp Brain (every indexed chunk carries its access-control list from the source system; the retriever enforces the requester's identity at query time; no shared index with post-hoc filtering). Evidence: **vendor-described** via independent press (the "zero index lag" claim unreplicated).
- **Mechanism:** Every indexed chunk carries (source, ACL); query-time identity filtering.
- **Smallest steal:** ACL bound to the chunk at index time; never post-hoc filtering.
- **What we deliberately do NOT take:** the digested universal model as a new authority; whole-product adoption; opaque "Memory & Preferences" as a knowledge authority; latency claims as fact.
- **Continuity grade:** C.
- **Differentiation note:** Our evidence plane already binds provenance and ownership to every event, so permission-aware retrieval falls out of the authority model; our deterministic guarantee: same identity + same evidence set = same answer.
- **Verdict: ADAPT.**

## 25. Streaming identity resolution with owner-governed merges

- **Source:** Warmly (sub-minute anonymous-to-person resolution with a contact waterfall); committee assembly adapted to household/property stakeholder sets. Evidence: **vendor-described** (acquisition context independent).
- **Mechanism:** Session -> identity-resolution attempt within seconds; every candidate match recorded as evidence; merges owner-confirmable and reversible.
- **Smallest steal:** the resolution evidence record; never a silent black-box stitch.
- **What we deliberately do NOT take:** HubSpot-locked identity/intent as a dependency; the proprietary intent black box; AI-automated signal-to-action without governance.
- **Continuity grade:** C.
- **Differentiation note:** We resolve at the same speed but show our work: each candidate match ships with the evidence that produced it; a wrong stitch is a correctable event, not silent database corruption.
- **Verdict: ADAPT.**

## 26. Per-agent identity with permission scope and spend budget

- **Source:** HubSpot Agent Hub (each agent carries per-agent access controls and credit run limits; a live status console shows every active agent). Evidence: **independent** (battlecard repos, architecture writeups).
- **Mechanism:** Every agent is an identity with its own permission scope and spend budget; a live console shows status and performance.
- **Smallest steal:** per-agent identity + permission scope + spend budget.
- **What we deliberately do NOT take:** HubSpot as the agent substrate; per-seat credit metering as an internal primitive; default-on data pooling (the July 2026 reversal is the cautionary tale).
- **Continuity grade:** B (best agent-governance surface; writes to snapshots).
- **Differentiation note:** Our agents act on the evidence plane, so every write is a witnessed event with a causal chain, replayable and falsifiable; HubSpot's agents write like privileged employees with good guardrails.
- **Verdict: ADAPT.**

## 27. Human review as a typed workflow node

- **Source:** Copy.ai (review steps with pass/fail semantics as explicit nodes in the workflow graph, so the audit trail includes what a human approved and when). Evidence: **vendor-described** (copy.ai blog; the pattern is industry-standard).
- **Mechanism:** Review is a node type in the workflow graph with pass/fail/evidence semantics, not a side channel.
- **Smallest steal:** review nodes that record the reviewer's decision and rationale as an event.
- **What we deliberately do NOT take:** anything beyond the primitive; the pattern is the whole steal.
- **Continuity grade:** C.
- **Differentiation note:** This is already PING's owner-approval shape; the steal is making the review a typed node with recorded rationale rather than a chat message.
- **Verdict: ADOPT.**

## 28. Typed handoff contracts with independently tested tools

- **Source:** Relevance AI (Tool Builder: reusable tools built and tested independently of agents; specialist agents with explicit handoff contracts; pipeline position and ownership visible). Evidence: **vendor-described** (official docs on GitHub) + independent-single-source reviews.
- **Mechanism:** Tools built and tested independently of the agents that use them; specialist handoffs carry typed contracts.
- **Smallest steal:** handoff contracts; tools tested before agents use them.
- **What we deliberately do NOT take:** the platform (enterprise-only pricing); "AI workforce" as an authority noun; the canvas as a substitute for an event record.
- **Continuity grade:** C.
- **Differentiation note:** Our handoffs are evidence-bound: each handoff carries the evidence set the upstream agent actually used, so the whole pipeline replays deterministically from the same evidence; approvals are events at handoff boundaries that touch the outside world.
- **Verdict: ADAPT.**

## 29. Segments-as-recommendations-with-attached-tactics

- **Source:** Mutiny (the system mines history to recommend which segments are worth personalizing, pairing each with a playbook: which value props, which proof, which CTA). Evidence: **vendor-described** for the analyzer; TechCrunch 2022 independent for the ML basis.
- **Mechanism:** Start from "these three segments are worth it, and here is the tactic" instead of "pick a segment."
- **Smallest steal:** a recommended-segment object that carries its playbook and its evidence (which history suggested it).
- **What we deliberately do NOT take:** firmographic de-anonymization machinery; cross-customer learning as the model; the no-code editor product.
- **Continuity grade:** C.
- **Differentiation note:** Our recommended segments attach to the observations that earned them (event IDs, not aggregated counters) and every experiment to a claim ledger, so the system can replay why a segment won a year later. Mutiny can tell you the lift; we tell you the reasoning chain behind it.
- **Verdict: ADAPT.**

---

## Rejected outright (see DO-NOT-BUILD.md for reasons)

- The conversation-resolution-first worldview and the conversation-volume flywheel (Intercom's flywheel as stated).
- Coda's digested universal model as a new authority (but not Coda the platform).
- Cross-customer/tenant learning as the improvement mechanism (Mutiny's 150M data points, Lavender's cross-team loop).
- Proprietary intent/score black boxes as authorities (Warmly's intent, Drift's Lift AI, 6sense's Signalverse).
- Default-on data pooling (HubSpot July 2026 ToS incident).
- Capture-without-consent UX (folkX-style).
- Firmographic de-anonymization as machinery (Mutiny's Clearbit-style reveal).
- Reactive chat-only models and form-replacement as the whole thesis (Drift).
- The "AI replaces your team" framing (Qualified's SDR marketing; PING strengthens the owner/worker).
- Opaque model engines as acceptable (Agentforce's Atlas-not-configurable lesson is about authoring around it, not inheriting the opacity).
