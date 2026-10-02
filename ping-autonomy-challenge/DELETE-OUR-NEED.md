# DELETE-OUR-NEED: the survival gate applied to Wave 1

Date: 2026-09-23. Research only. No implementation.

## The gate

Nolan's hard rule: a mechanism survives only if it prevents at least 2 of the 9 FYD failure classes:

1. mobile-overflow, 2. unsafe-url, 3. graph-blindness, 4. fixture-drift, 5. claim-binding, 6. visibility-error, 7. clone-sitespecs, 8. correction-loss, 9. conflict-collapse.

Method: each lane's headline mechanisms (the ones the lane itself elevated in harvest rankings, coverage tables, or centerpieces) judged as specified. "Prevents" means the mechanism, as specified, causally blocks the failure class. Discipline citations (a wave-1 mechanism named as the same family as a survivor) are noted but do not count as prevention. The failure files in `failures/` show the gate applied in practice: FAIL-2, FAIL-5, FAIL-9, plus FAIL-1, FAIL-3, FAIL-4, FAIL-7, which exist in the same directory and were consulted for their wave-1 cross-checks and cut lists. Notably, FAIL-4 explicitly cut several wave-1 mechanisms as standalone (LANE-4 M-13, LANE-4 M-14, LANE-7 M7/M8, LANE-7 M15, LANE-12 M1/M2, LANE-12 M8/M9); those verdicts are adopted here.

Net result: out of 15 lanes and roughly 200 mechanisms, exactly one wave-1 mechanism family survives the gate. Everything else is deleted by the gate, each with one reason below.

## Survivors (1)

**LANE-14 Handoff Contract (section 3, including M20 typed handoff states).**
Prevents #9 conflict-collapse: the status vocabulary includes CONFLICTING, and rule 3.3.6 requires conflicts to be carried with both provenances while resolution is a recorded decision with a stated rule, so two workers' incompatible claims cannot be silently merged at the handoff. FAIL-9 cites this exact contract as wave-1 corroboration for the #9 discipline.
Prevents #5 claim-binding at the claim-entry seam: the EVIDENCE field requires pointers (source plus digest plus observed-at), never conclusions alone; rule 3.3.2 treats digest mismatch as STALE; rule 3.3.4 marks any packet without a valid status INVALID. Unsupported claims cannot cross the worker boundary into the knowledge layer, which is where FYD's rendered claims originate.
Caveat: the lane lists seven states (OK, INVALID, INCOMPLETE, STALE, CONFLICTING, BLOCKED, RETRYABLE) while FAIL-9 calls it a six-state contract. The discrepancy is unresolved in the sources.

## (a) Mechanisms deleted by the gate

Format: mechanism (lane): one-line reason.

### LANE-1 (ORCA deep dissection)

- M-4 PG advisory-lock coordinator claim: single-coordinator mutual exclusion prevents double-dispatch, which is not one of the 9.
- M-6 crash-safe dispatch rendezvous: coordinator crash recovery; no FYD class.
- M-7 startup reconciliation: restart recovery; no FYD class.
- M-8 fail-closed work-order authorization gate: work authorization, not data visibility; no FYD class.
- M-9 closed work-order envelope: dispatch hygiene; no FYD class.
- M-12 deterministic worker selection: scheduling; no FYD class.
- M-13 live-spine worker routing: dispatch machinery; no FYD class.
- M-14 bounded autonomy envelope: token budgets; no FYD class.
- M-16 timeout as honest failure: status hygiene; no FYD class.
- M-17 follow-up only from verified evidence: workflow ordering on task evidence, not claim evidence for render; no FYD class.
- M-19 typed status ledger: transition evidence for workers; FYD claim-binding lives at the render binding seam, a different seam.
- M-23 evidence-per-stage artifacts: debuggability; not prevention.
- D-1 through D-7 (ExecutionEngine universe, vendored adapter, PID locking, legacy minter, A0 facade, random mission IDs, disk capability registry): already decided by the lane itself as delete candidates or already deleted; the gate concurs but does not drive them. Archaeology preserved in section (d).

### LANE-2 (OpenAI agent runtime / Codex)

- apply_diff anchor patch engine: patch correctness; no FYD class.
- RolloutRecorder JSONL writer: transcript recording; detection, not prevention.
- RunState versioned snapshot plus interruption model: crash resume; no FYD class.
- Refcounted elicitation pause barrier: human-input gating; no FYD class.
- Atomic suffix-replacement compaction: context management; no FYD class.
- Per-command exec approval requirements: tool safety; no FYD class.
- Registry spawn slots, depth limits, nickname reservation: fan-out bounds; no FYD class.

### LANE-3 (Claude Code / Agent SDK)

- M-CC-03 subagent output scanning: neutralizes prompt-injection shapes in child text, not URL schemes or claim evidence; zero of the 9.
- M-CC-06 four-way tool decision, M-CC-08 eval order, M-CC-09 rule DSL, M-CC-10 tiered permissions, M-CC-22 policy hook: tool permission plumbing; prevents unsafe tool execution, not FYD data failures.
- M-CC-11 control protocol: task control messaging; no FYD class.
- M-CC-14 interrupt plus terminal_reason: control flow; no FYD class.
- M-CC-16 transcripts as offline authority: record substrate; keeping transcripts prevents no FYD class by itself.
- M-CC-18 async hooks: lifecycle plumbing; no FYD class.
- M-CC-21 mandatory child attribution: event labeling; no FYD class.
- M-CC-26 verbatim prompts: machine-text injection defense for prompts; not among the 9.
- M-CC-02 three-tier propagation, M-CC-12 output rewrite, M-CC-13 pre-compact snapshot: result plumbing and checkpoints; no FYD class.
- M-CC-04 background lifecycle frames, M-CC-05 ledger-gap lesson, M-CC-07 stop veto, M-CC-15 UUID-anchored resume, M-CC-20 run bounds, M-CC-23 deferral, M-CC-24 background-by-default, M-CC-25 session hooks: task lifecycle and resume; coordination machinery, no FYD class.
- M-CC-01 two-channel isolation, M-CC-17 event catalog, M-CC-27 effort dial: isolation patterns and knobs; no FYD class.
- M-CC-19 in-process capability servers: new machinery (see (b)); no FYD class.
- M-CC-28 OS-level bash sandboxing: code-execution defense in depth; not among the 9.

### LANE-4 (Temporal semantics)

- M-1 deterministic replay: resumes crashed runs, and replays accidents as faithfully as intentions per the lane's own warning; no FYD class.
- M-2 mismatch tripwire: the lane says it does not transfer to planner output; detects code/history divergence, not fixture or claim drift.
- M-3 sandbox: constrains helper code, not agent effects or render data (lane section 3.2).
- M-4 workflow identity plus reuse policy: run identity; clone-sitespecs is site identity, a different problem.
- M-5 retry policies, M-7 timeout taxonomy, M-8 durable timers, M-9 cancellation, M-11 signals/queries/updates, M-12 child workflows, M-15 sticky execution, M-16 reset, M-17 local activities, M-18 terminate/cancel labeling: durable-execution control plane; none touches a FYD class.
- M-6 heartbeating: worker liveness; no FYD class.
- M-10 continue-as-new: history rollover drops history by design, the opposite of correction preservation.
- M-13 SideEffect records: FAIL-4 cut as standalone (single class at best, #4 edge cases).
- M-14 versioning: FAIL-4 cut as standalone (deploy-time semantics, not render determinism).

### LANE-5 (Restate)

- REST-JOURNAL, REST-REPLAY, REST-RECOVERY, REST-STATE-JOURNAL: exactly-once journaling with at-least-once effects per the lane's own summary; FYD failures live outside the journal.
- REST-DEDUP-INGRESS, REST-DEDUP-TRANSPORT, REST-EO-RPC, REST-IDEMPOTENCY-KEY: dedup machinery; no FYD class.
- REST-RUN ctx.run boundary: at-least-once effects; no FYD class.
- REST-VO-LOCK single-writer: race protection on handler state; no FYD class.
- REST-AWAKEABLE, REST-SUSPEND, REST-TIMER, REST-RETRY, REST-CANCEL-KILL, REST-FLOW-CONTROL, REST-WORKFLOW-RUNONCE: suspension, retry, and lifecycle; no FYD class.
- REST-RETENTION-PURGE: bounds guarantees in time; no FYD class.
- REST-OBSERVE SQL introspection: observability; detection, not prevention.

### LANE-7 (LangGraph)

- M1 superstep, M2 checkpoint payload, M3 persistence ladder, M4 pending-writes, M9 resume/fork, M11 namespaces, M12 two-table schema, M13 snapshots: checkpoint and state machinery; crash recovery, not FYD prevention.
- M5 version watermarks: re-trigger thresholds; not correction-loss (owner corrections surviving regen).
- M6 deterministic task ids: task identity for idempotency; not site identity.
- M7/M8 interrupts and gates: FAIL-4 cut as irrelevant to the 9.
- M10 channel reducers: merge strategies for concurrent writes; FYD conflicts must be preserved, not merged (FAIL-9).
- M14 BaseStore memory: new memory service; the lane says check PING's knowledge layer first; no FYD class.
- M15 memoization: FAIL-4 cut ("prevents none of the 9; a wrongly keyed cache is itself a drift source").
- M16 error routing: failure handling; no FYD class.

### LANE-8 (multi-agent red team)

- M-01 deterministic termination: loop bounds; no FYD class.
- M-02 validated digraph: routing-cycle prevention; no FYD class.
- M-03 task context dependencies: token bounding; not claim evidence.
- M-04 event-sourced checkpoints: opt-in crash resume; no FYD class.
- M-05 handoff as structured data: routing as a typed field; prevents addressing bugs, not FYD classes.
- K-01 through K-11 kill list: already killed by the lane itself; the gate concurs.

### LANE-9 (MCP ecosystem)

- M-SECRETS: keeps credentials off the tool wire; #6 visibility-error is private business facts in render, a different layer; one class max.
- M-TOOL-ANNOT (hints untrusted): transport hygiene; no FYD class.
- M-RECEIPT-AUDIT (hash tool-call audit): proves tools ran; #5 is factual predicates in render, not tool execution; one class max.
- M-STRUCTURED-IO: JSON schemas on tool IO; not render-seam capability typing (FAIL-2 Survivor 1 types URLs, visibility, and evidence at the render seam).
- M-TOOLSETS: tool exposure filtering; access control on tools, not FYD.
- M-SKILLS, M-INSTALL-CONSENT: supply-chain consent; not among the 9.
- M-DISCOVER, M-TOOL-LIST-CACHE, M-SEARCH-DISCOVERY, M-PAGINATION, M-COMPLETION: discovery plumbing; no FYD class.
- M-TASKS, M-SUBSCRIPTIONS, M-STATEFUL-HANDLES: new stateful machinery; no FYD class.
- M-TIMEOUT, M-CANCEL, M-PROGRESS, M-SSE-STREAM, M-ERROR-CODES, M-VERSION-NEG, M-EXTENSIONS: protocol plumbing; no FYD class.
- M-AUTH, M-PER-REQUEST-AUTHZ: auth transport; policy lives in PING's authorities (see anti-list), and the wire mechanisms prevent no FYD class.
- M-FS-SCOPING: filesystem allow-list; sandboxing, not among the 9.
- M-STDIO-RESURRECT: crash recovery; no FYD class.
- M-X-MCP-HEADER: header mirroring; routing aid, not a FYD class.
- M-OTEL: trace propagation; detection, not prevention.
- AA1 through AA14: standing constraints ("MCP is transport; PING authority owns policy"), not mechanisms; preserved as doctrine, not counted.

### LANE-11 (observability agents)

- The minimum trace (T1-T8 plus 3 events) and harvest H1-H12: post-mortem explanation ("why did it do that"); every falsification scenario is framed as an after-the-fact investigation. Detection is not prevention; zero of the 9.
- Note: the audit reads that the failure files' falsifiable tests require (rendered HTML, verified render model, event log, evidence graph, audit events) are served by the event journal plus evidence graph on the anti-list, not by a new OTel pipeline.

### LANE-12 (idempotency / distributed effects)

- PI-1 tri-state outcomes: effect typing; the FYD analog (UNKNOWN evidence fails closed) belongs to FAIL-2 Survivor 3 at the render seam, not to effect typing.
- PI-2/PI-3 keys plus atomic claim: FAIL-4 cut ("prevents duplicate side-effect application, which is not one of the 9").
- PI-4 journal-before-effect, PI-5 outbox, PI-6 inbox: crash-consistency for delivery; the 9 are rendered-content correctness, not delivery.
- PI-7 dedup windows: config discipline; no FYD class.
- PI-8 UNKNOWN resolution: honest UNKNOWN handling for effects; one class max (#5-adjacent), fails the >=2 rule.
- PI-9 reconciler: desired-vs-observed repair; FYD's analog is regen, owned by the evidence graph.
- PI-10 sagas: FAIL-4 cut ("none of the 9 is a partial-effect problem").
- PI-11/PI-12 fencing tokens: stale-worker write protection; no FYD class.
- PI-13 dead-letter: poison-message bounding; no FYD class.
- PI-14 deterministic orchestration: replay hygiene; LANE-4 section 3.1 warns replay re-enacts stale decisions.
- PI-15 exactly-once mapping: review checklist; not a mechanism.

### LANE-13 (worker death)

- M1 fenced-lease: work-item ownership; no FYD class.
- M2 idempotency-key: safe tool re-execution; the 9 are not double-apply classes.
- M3 durable-journal: journal as coordinator system-of-record; FYD's system of record is the evidence graph (the anti-list keeps the event plane as a record, not as coordinator authority).
- M4 atomic-snapshot: torn-write protection; file hygiene, not a FYD class.

### LANE-14 (context engineering; the handoff contract itself survives, above)

- M16 dependency context, M6 masking, M1 tool-result clearing, M10 staged ladder, M4 condenser framework, M9 hybrid summary-plus-recency, M7 elision markers, M18 position discipline, M2 summary assembly: token and context management; cost controls, not FYD prevention.
- M5 condensation-as-event (tombstones): auditability of loss; detection, not prevention.
- M14 structured summaries: discipline credit inside FAIL-4 S3 ("types before prose"), not a standalone prevention mechanism.
- M12 tiered memory: memory accretion structure; no FYD class.
- M13 bi-temporal invalidation: staleness queries on PING memory claims; FYD correction-loss is owner assertions surviving regen (owned by FAIL-5 S3 and FAIL-9 M1); one class max.
- M15 sleep-time compute plus merge protocol: background consolidation; no FYD class.
- M17 staleness representation: recency-vs-validity; correction-loss-adjacent at best, fails >=2.

### LANE-16 (GitHub intelligence)

- M1 guarded rescue: conditional-write discipline for job rows; real shape, but its domain is mission rows, not FYD conflicts; one class max.
- M2 actor supervision: process shutdown structure; no FYD class.
- M3 dedup queue: mission-queue internals; no FYD class.
- M4 reconcile contract: step-outcome contract; no FYD class.
- M5 visibility timeout: redelivery horizon; no FYD class.
- M6 owner-token mutex: lease primitive; its own README disclaims safety proof; no FYD class.
- M7 workflow identity replay: step-output replay; no FYD class.
- M8 signed link metadata: step attestation; #5 is factual predicates in render, not step execution; one class max.
- M9 KSUID: correlation IDs; the lane says explicitly "never constitutional identity."
- M10 backoff: retry pacing; no FYD class.
- M11 idempotency middleware: FAIL-4's cut on idempotency keys covers the shape.

### LANE-17 (next-work selection)

- The selection function centerpiece and M1-M15 (dependency release, priority subqueues, multifactor scoring, backfill, queue sort, aging/fairness, critical-path, info gain, behavior trees, failure recurrence, admission, state machine, claim-atomic discovery, scheduler hooks): scheduling and ordering machinery; none of the 9 is a scheduling failure. M13 (LLM-vibes prioritization) was already rejected by the lane.

### LANE-18 (adversarial coordinator)

- Invariant 1 (separate execution from verification): prevents self-graded missions; #5-adjacent at best since FYD's verifier doctrine already owns "no invented claims"; one class, fails >=2.
- Invariant 2 (completion as observed effect): completion claims need evidence; one class (#5-adjacent), fails >=2.
- Invariant 3 (atomic claims plus fencing): partition safety; no FYD class.
- Invariant 4 (side effects keyed by stable intent): crash-consistency; no FYD class.
- Invariant 5 (finite budgets): spend bounding; no FYD class.
- Invariant 6 (liveness per tier): starvation metric; no FYD class.
- Invariant 7 (decaying claims with provenance, re-verified before outbound action, forward taint on falsification): as specified, its domain is agent memory driving outbound outreach actions (Attack 4's scenario is a pitch sent on false memory); it never touches the FYD pipeline, so it prevents zero of the 9 as specified. Whether to re-scope it to the FYD seams is the open judgment call in section (d).
- Invariant 8 (cycle check at declaration): graph hygiene; no FYD class.
- Attacks 1-13 and framing critiques F1-F7: attack catalog and posture, not mechanisms.

## (b) Proposed new machinery the gate makes unnecessary

New stores, authorities, or services wave 1 proposed (or floated as open questions) that prevent fewer than 2 FYD classes and therefore do not get built as prevention machinery:

1. LANE-11: minimum-trace pipeline (OTel span store, collector with tail sampling, trace backend, mission-scoped retention). Detects; prevents zero of the 9.
2. LANE-12 (PI-2/PI-3, M1/M2): idempotency-key claim store with per-key locking. FAIL-4 cut it explicitly: duplicate side-effect application is not one of the 9.
3. LANE-12 (M4/PI-5): outbox table plus relay for notify-the-world actions. Delivery consistency; zero of the 9.
4. LANE-12 (M5/PI-6): inbox tables per consumer. Zero of the 9.
5. LANE-12 (M11/PI-11): fencing-token issuer plus token-checked mutation paths on shared rows. Zero of the 9.
6. LANE-13 (M1): fenced-lease protocol machinery (lease table, heartbeat protocol, generation counters, re-registration protocol). Zero of the 9.
7. LANE-13 (M3 as promotion): promoting the event plane to coordinator system-of-record with fsync discipline, torn-tail truncation, and re-registration. The journal itself survives (anti-list); the promotion to coordinator authority is what the gate kills.
8. LANE-14 (M12): three-tier memory with agent-managed paging. Zero of the 9.
9. LANE-14 (M15): sleep-time compute consolidator plus merge protocol. Zero of the 9.
10. LANE-14 (M13): bi-temporal claim store on memory claims. One class max.
11. LANE-16 (M6): owner-token distributed mutex fleet (redsync shape). Zero of the 9, and its own README disclaims safety proof.
12. LANE-16 (M8): in-toto layout and functionary key infrastructure plus a verification service. One class max.
13. LANE-17: selection-function machinery (consumption ledger, versioned scoring policy, reservation and lease tables, scorer injection M15). Scheduling; zero of the 9.
14. LANE-9 OQ-1: signed tool-receipt format plus PING gateway signature requirement. Zero of the 9.
15. LANE-9 OQ-5: canonical scope vocabulary plus gateway mapping. Zero of the 9.
16. LANE-9 OQ-6: per-server tool-catalog content digests. Zero of the 9.
17. LANE-9 OQ-8: single-use-token (nonce ledger) service for MRTR flows. Zero of the 9.
18. LANE-9 OQ-4: principal-bound task-handle authorization. Zero of the 9.
19. LANE-3 (M-CC-19): in-process capability (SDK MCP) servers. Zero of the 9.
20. LANE-2: registry spawn slots, depth limits, nickname reservation. Zero of the 9.
21. LANE-4/5/7 as adopted components: Temporal, Restate, or LangGraph runtimes as new execution authorities. The lanes themselves reject adoption ("no Temporal adoption is proposed"; "reproducible on PG plus a mission runtime"); Nolan's 2026-09-18 call already prohibits new execution authorities; the gate concurs at zero of the 9.
22. LANE-7 (M14): BaseStore long-term memory as a new memory service. The lane says check PING's knowledge layer first (delete-our-need if covered); zero of the 9.

## (c) Anti-list: existing machinery that must NOT be deleted

Grounded in what the lanes actually said:

- UnifiedEventRuntime single-writer invariant: LANE-1, "the 09-19 audit falsified the claims that these were missing or broken. They are the substrate the remediation stands on."
- computeEventId identity: LANE-1, same.
- The bridge: LANE-1, same.
- MissionRuntime conditional-SQL lifecycle: LANE-1, same.
- MissionScheduler: LANE-1, same.
- WorkerRuntime.dispatch and canonical workers: LANE-1, same.
- Event journal / event-plus-evidence plane (append-only event record): LANE-13 ("PING's event/evidence plane is an append-only event record"); LANE-8 (event-sourced checkpointing "is the closest any of the three frameworks gets" to PING's plane); LANE-5 and LANE-12 continuity guardrail ("never duplicate PING's event system").
- Approvals machinery (approvals, approval_policies tables): LANE-1, "dormant, not absent; the M-18 policy consult may eventually wire into it."
- AGENT_PROFILES codex/opencode entries: LANE-1, "dormant data, not dead code demanding deletion."
- PING's authority set (registry, authz, witness/evidence): LANE-9 anti-authority section, "Policy (who may do what, what is true, what is proven) lives in PING's authorities (registry, authz, witness/evidence) and is never delegated to the wire."
- PING's knowledge layer: LANE-7 M14, "Check PING's existing knowledge layer first (DELETE_OUR_NEED if covered)."
- Capability plane (default-deny grants): LANE-4 section 3.2, "that remains PING's capability plane (default-deny grants), which is the stronger and more relevant mechanism."

Corroborated by the failure files (FYD seam machinery marked DONE_VERIFIED; do not touch): the parser-based safe-link resolver with capability-specific allowlists (FAIL-2), the projection-seam binding verifier operating over the semantic render model (FAIL-5), owner-assertion evidence records with priority over source observations (FAIL-5, FAIL-9), and the locked provenance vocabulary DIRECT / DERIVED / INFERRED / OWNER_ASSERTED / CONFLICTING / UNKNOWN (FAIL-9).

## (d) Preserved archaeology classifications (do not redo)

From LANE-1's dissection and the 09-13 / 09-19 audits it cites:

- ORCA ExecutionEngine private universe (M-26: private event queue, scheduler, artifact store, consensus engine, merge gate, context authority, worker state machine, ollama provider, disk capability_registry.json, /orchestration mount): DEAD-BY-DESIGN / LIVE-BUT-ORPHANED. DELETE CANDIDATE, gated on Nolan's convergence call (D-1). Keep mission_compiler.js catalog vocabulary (M-27) under WATCH before deleting.
- Vendored byte-copy adapter: ALREADY DELETED, verify on the Pig (D-2).
- File/PID-based coordinator locking: DELETE, replaced by M-4 PG advisory lock (D-3). Stale main.new.js / delegate.new.js drafts: stale, superseded (archival).
- Legacy taskId-derived work_order_id minter: DELETE after the compat window (D-4).
- A0 facade path (startAutonomousLoop synthetic outputs): DELETE CANDIDATE, gated on Nolan (D-5).
- Non-deterministic mission ID minter on /orchestration: DELETE if the surface survives D-1 (D-6).
- ORCA disk-file capability registry: DELETE, consolidate to the PG capability_registry table (D-7).
- EventBridge: RETIRED but SUPERSEDED (09-19 audit).
- WITNESS_CREATED binding witness_root: LIVE (09-19 audit).
- WorkOrder envelope: LIVE, already exists (09-19 audit).
- approvals / approval_policies tables: DORMANT, not absent.
- AGENT_PROFILES entries: DORMANT data.
- ORCA v1 control loop: SUPERSEDED by the v2 remediation.
- Agent profile statuses (M-20): LIVE / PENDING_AUTH / blockedExternal (data states, not deletion targets).

No other lane assigned PING-archaeology classifications; harvest classes (DIRECT_REUSE, ADAPT, ADOPT, PATTERN_ONLY, STUDY, WATCH, INSPIRED) are reuse judgments, not archaeology, and are superseded by this gate pass wherever they conflict.

## (e) Largest open delete/keep judgment call (unresolved)

**Whether LANE-18 invariant 7 gets re-scoped to the FYD pipeline.**

As specified, invariant 7 ("treat memory as decaying claims with provenance, re-verified before outbound action; forward taint tracing when a memory is falsified") lives in the outreach coordinator: Attack 4's scenario is a pitch sent because a stale memory said Faith Roofing had a website. Its "outbound actions" are send, publish, pitch. In that domain it prevents zero of the 9 FYD classes, so the gate deletes it.

Re-scoped ("outbound action" includes rendering a site and answering via Ask FYD; "memory" includes owner-assertion records and evidence-graph claims), its shape prevents two classes: #5 claim-binding (no provenance re-verification means no render; a claim whose evidence cannot be re-verified fails closed at action time) and #8 correction-loss (an owner correction falsifies a claim, and forward taint tracing marks every dependent rendered artifact for regeneration instead of letting the correction die silently). That is exactly 2 classes, so it would survive.

Why it could not be resolved: the lane's text specifies the outreach domain, and no failure file cites invariant 7, so extending its domain is a design decision, not a reading. It is also wave 1's only near-miss on #8 correction-loss: every other wave-1 mechanism leaves #8 completely uncovered, so this call decides whether wave 1 contributes anything at all to correction-loss. The deciding question is whether "re-verified before outbound action" and "forward taint on falsification" are adopted as FYD pipeline rules (render seam and evidence graph) or left as outreach-coordinator rules. Note that FAIL-5 S3 (dangling evidence pointers fail closed) and FAIL-9 M4 (the conflict and correction task lifecycle) already implement the two halves at the render seam; adopting invariant 7 would be the worker-layer statement of the same discipline, mirroring how the surviving handoff contract relates to FAIL-9.
