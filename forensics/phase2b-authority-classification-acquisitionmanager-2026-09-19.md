# PHASE 2b: AcquisitionManager trace + four-way authority classification (2026-09-19)

Read-only forensic pass. No code mutated. Ground truth: worktree /home/nolan/worktrees/constitutional-convergence-authority-law @ 98ef51c9c. Pinned against Phase 0 scope pin, Phase 1 call-graph reverify, and the Phase 2 decision ownership matrix. Standing law applied, not relitigated: "REFACTOR AUTHORITY. PRESERVE MECHANISM. DELETE NOTHING. PROVE BEFORE PROMOTION." UnifiedEventRuntime is the canonical event acceptance authority; ping_events is the authoritative constitutional journal; IdentityAuthority owns event identity; CanonicalAuthority owns canonical hash; UER acceptance (PostgreSQL sequence) is the authoritative ordering.

## 1. TASK 1: AcquisitionManager read-only trace

### 1.1 Repo-wide search results

Search covered all JS/TS/MJS/CJS across the whole worktree (not just ping-runtime), node_modules and .git excluded.

| Search term | Executable-source hits | Detail |
|---|---|---|
| `AcquisitionManager` | 0 | No class, no variable, no require, no comment reference in any executable file. |
| `collectEvidence` | 1 | `ping-runtime/orchestration/dispatcher.js:157`, a method definition. |
| `batchCollectEvidence` | 0 | No hits anywhere. |
| `ConstitutionalEventStore` | 0 (executable) | Mentioned only in CERTIFICATION.md (doc). |
| `AcquisitionManager` (all file types) | 1 | Only `CERTIFICATION.md:53`: "AcquisitionManager / ConstitutionalEventStore \| UNKNOWN (phantom) \| Names exist only in side-branch docs; no code." |

### 1.2 The one `collectEvidence` hit is a coincidental dead method, not an AcquisitionManager

`ping-runtime/orchestration/dispatcher.js:157` defines `collectEvidence(batchId, workerOutputs)` on the `Dispatcher` class, a worker-orchestration utility (planHighROIWork, scheduleBackgroundWork, dead_code_excavator task types). Full behavior:

```js
collectEvidence(batchId, workerOutputs) {
  return {
    batchId,
    worker_count: workerOutputs.length,
    findings: workerOutputs.map(o => ({ worker: o.workerId, confidence: o.confidence || 0, findings_count: (o.findings || []).length, accepted: o.accepted || false })),
    consensus: this._computeConsensus(workerOutputs),
    collected_at: new Date().toISOString()
  };
}
```

What it does with the returned object: it returns a plain in-memory object. That is all. No persistence call, no DB write, no event emit, no queue, no further method chain.

### 1.3 Caller analysis (every caller recorded)

| Candidate caller | file:line | Finding |
|---|---|---|
| Any caller of `collectEvidence(` | none exist | Repo-wide grep for `collectEvidence(` returns only the definition at dispatcher.js:157. Zero call sites. |
| `new Dispatcher(` instantiations | `runtime/kernel/gateway_adapter.js:35`, `gateway/bootstrap/constitutional_runtime.js:14` | Both exist, but gateway_adapter.js:15 requires `./execution/dispatcher` (a DIFFERENT, 15-line Dispatcher in runtime/kernel/execution/dispatcher.js, no collectEvidence method). constitutional_runtime.js is not required by any live module (grep: zero requirers outside tests). |
| `this._dispatcher.` usages | none | Zero usages in gateway_adapter.js and constitutional_runtime.js. |
| Anything requiring `orchestration/dispatcher` | none | Zero requirers repo-wide. |

### 1.4 Persistence destination trace

There is none. The method creates no identity, computes no hash, assigns no sequence, opens no DB client, and never calls UnifiedEventRuntime.emit or any envelope/adapter ingress. The object it returns is garbage-collected by its (nonexistent) caller.

### 1.5 Verdict: AcquisitionManager does NOT reach UER

AcquisitionManager is a confirmed PHANTOM. There is no mechanism bearing that name anywhere in the worktree, so there is no seam missing. The constitutional question ("does AcquisitionManager eventually submit evidence/events through UER, or is the seam missing?") resolves to: neither. There is no submitter and no seam. The only live string collision (`collectEvidence` on the orchestration Dispatcher) is a dead, uncalled method on an unrelated worker-planning class with no persistence path at all. If an AcquisitionManager mechanism is ever introduced in the future, it would have to submit through UnifiedEventRuntime.emit() (or the preserved legacy ingress bridge) to sit under the event authority. Per the task boundary, this pass does NOT propose making AcquisitionManager an event authority.

## 2. TASK 2: Four-way classification against proven UER law

| Component | Classification | file:line evidence | Live runtime mechanism? | Highest proof-ladder rung reached |
|---|---|---|---|---|
| IEventAuthority | INTERFACE_ONLY | `runtime/kernel/events/event-authority-interface.ts:8` (export interface, subscribe/unsubscribe/publish/getHistory). Zero importers and zero implementers repo-wide (grep). Referenced only in docs/manifests: AUDIT_REPORT.md, ping-runtime/orchestration/LawRouter.json, ArchitectureManifest.json, ExecutionRouter.json (manifest listings, not code imports). | No. Pure type declaration, never imported by executable code. | EXISTENCE (file present and parseable; nothing imports it) |
| ConstitutionalEventStore | UNKNOWN | Zero hits in every file type except CERTIFICATION.md's phantom note. No code exists. | No. | Not reached (not found). Marked UNKNOWN per the evidence standard. |
| EventRepository | LEGACY | Impl: `runtime/kernel/event_repository.js:15` (class EventRepository; writes `repository_events` + `event_processing` tables with its own hash chain: RuntimeID, PreviousEventHash, CanonicalEventHash, ReducerHash, WitnessHash, ReplayHash, chain_root; DDL at :25-63). Gateway shim: `gateway/event_repository.js:15` (class extends kernel EventRepository; required only by unrequired modules and tests). Instantiated + initialized in live boot: `gateway/bootstrap/gateway_runtime.js:386` (new GatewayToKernelAdapter), `runtime/kernel/gateway_adapter.js:27` (new EventRepository), `:147` (initialize -> CREATE TABLE IF NOT EXISTS). Write path dead: `getEventRepository()` has zero callers; adapter.executeEvent -> ConstitutionalExecutionPipeline.execute -> appendEvent has zero production call sites (only test_patch_001.js). Dozens of `this._eventRepository.appendEvent(` call sites in gateway/* (mission_authority_v2, trigger_authority, continuous_replay_authority, automatic_mission_generator, patch_authority_v2, persistent_queue_authority, local_first_execution_authority, constitutional_desktop_runtime, execution_graph_authority, best_in_class_integration, constitutional_watchers, worker_registry) and ping-runtime/agents/* (agent_memory_authority, distributed_desktop_agents) and runtime/kernel/authorities/capability_scheduler.js live in modules that NOTHING requires. Reads mounted but dormant: EventReadAuthority reads repository_events (`runtime/kernel/event_read_authority.js:43`+) and is mounted live at /events, /context, /system (`gateway/bootstrap/gateway_runtime.js:692/693/695`), but the store is write-unreachable so it reads an empty/dormant upstream. | Partially. DDL creation runs at live boot (side effect live); the write path is unreachable; reads are mounted but dormant. | REACHABILITY (instantiated in the live boot path; write path statically unreachable) |
| AcquisitionManager | UNKNOWN | Zero executable hits; name exists only in CERTIFICATION.md:53 phantom note ("Names exist only in side-branch docs; no code"). The `collectEvidence` method at `ping-runtime/orchestration/dispatcher.js:157` is a coincidental same-name dead method on an unrelated class (Section 1), not evidence of the component. | No mechanism exists. | Not reached (not found). Marked UNKNOWN per the evidence standard. |

### 2.1 Reading the EventRepository classification

EventRepository is LEGACY, and it is a genuinely separate semantic store, not a view of the two known stores: `repository_events` is a THIRD event table with aggregate event-sourcing semantics (object_id, aggregate_type, per-object sequence, hash chain columns) distinct from both `ping_events` (UER canonical journal) and `canonical_events` (envelope ingress journal). Its architecture predates the UER convergence order (StandardEventSchema aggregate model, which CERTIFICATION.md already marks DORMANT with zero live executions). The gateway shim (`gateway/event_repository.js`) is delegation-only (subclass with no added behavior), which is delegation, not duplication, per the authority forensic rule. Nothing here competes with UER for any decision today: it does not mint canonical identities, does not sequence canonically, and cannot be reached by live producers.

### 2.2 Why AcquisitionManager and ConstitutionalEventStore stay UNKNOWN, not PRESERVED_INACTIVE

PRESERVED_INACTIVE implies a mechanism that exists but is dormant (like IEventAuthority as an interface, or ConstitutionalEventSourcing as a dead switch per Phase 11). Neither AcquisitionManager nor ConstitutionalEventStore has any mechanism in the worktree at all. Per the evidence standard ("never claim VERIFIED from static existence; mark UNKNOWN when not found"), UNKNOWN (phantom) is the honest classification. This agrees with CERTIFICATION.md:53.

## 3. Missing-seam finding

No seam is missing, because there is no AcquisitionManager mechanism to attach one to. The constitutional boundary (UnifiedEventRuntime.emit) is intact and does not need an AcquisitionManager-facing change. The only action, if Nolan ever wants the name to mean something: a new AcquisitionManager mechanism would submit through UnifiedEventRuntime.emit() directly, or through the preserved legacy ingress bridge (canonical_events -> LegacyIngressAdapter -> UER) for compatibility types, and it would never mint identities, sequences, or hashes of its own. That is a future design decision, not a gap in the current seam.

## 4. Flags: what this pass found that touches the Phase 2 matrix

### 4.1 GAP (not a contradiction): the Phase 2 matrix undercounts stores

The Phase 2 matrix decision 3 (event persistence) frames the conflict as two stores (ping_events vs canonical_events). This pass shows three stores exist at live boot: `repository_events` is created by CREATE TABLE IF NOT EXISTS during the live gateway boot (via GatewayToKernelAdapter.initialize). The matrix is not wrong about the conflict it describes (repository_events is write-unreachable and claims no canonical authority), but a complete decision-3 picture should add a row or note: repository_events = LEGACY aggregate event-sourcing store, DDL live at boot, writes unreachable, reads mounted-but-dormant via EventReadAuthority. Recommend adding it to the matrix rather than silently resolving it here.

### 4.2 OPEN QUESTION (flagged, not resolved): appendEvent call-site count vs CERTIFICATION.md Phase V

CERTIFICATION.md Phase V says "8 writer stacks enumerated (6 dead, 1 dormant DDL, 1 legacy-dormant)". This pass found ~70 `appendEvent(` call sites across ~18 files. This is NOT yet a proven contradiction: the Phase V taxonomy appears to be about live write bypasses to the canonical path (ping_events / canonical_events), while the ~70 sites I found target `repository_events` via `_eventRepository` in modules nothing requires, and `replay_persistence_port` delegates to an injected provider (a different object than the kernel EventRepository in some of those files). The two counts may be measuring different things. Flagged for reconciliation in a later phase; I do not claim the CERTIFICATION.md number is wrong.

### 4.3 Confirmed consistencies with prior findings

- IEventAuthority: consistent with CERTIFICATION.md:51 ("IEventAuthority / ExecutionEventBus | DORMANT | Zero importers/implementers"). Sibling check: ExecutionEventBus exists at `runtime/kernel/execution/execution-event-bus.ts:34` with zero code importers; it was not in this task's four but behaves the same (dormant).
- EventRepository: consistent with CERTIFICATION.md:77 ("EventRepository LEGACY; repository_events dormant upstream"), now with full file:line evidence and the boot-path nuance (DDL live, writes dead).
- AcquisitionManager / ConstitutionalEventStore: consistent with CERTIFICATION.md:53 and :75 ("Phase B/P: AcquisitionManager and ConstitutionalEventStore do not exist (phantoms)"). The earlier "PHANTOM" finding for AcquisitionManager is confirmed by the wider all-JS/TS grep scope this task required.
- Phase 11 (ConstitutionalEventSourcing as dead switch, PRESERVED_INACTIVE): not redone, referenced as instructed.
- No matrix row claimed anything about AcquisitionManager, ConstitutionalEventStore, or EventRepository, so no matrix row is contradicted. The only touch is the decision-3 store-count gap (4.1).

## 5. Worktree state observation (read-only; not caused by this pass)

During this session, an untracked file appeared in the scope worktree: `ping-runtime/events/convergence_identity.js` (created 2026-09-19 06:20:57 MDT, ~2.8KB). Phase 0 certified the worktree clean; this file was added by another process/agent during my session. I made no mutation and only read its header (read-only peek). Per its own header it implements "Convergence identity helpers, PING event authority convergence, Phases 3/4/5", states "Pure mechanism: no I/O, no authority decisions", and names the identity roles canonical_event_id / envelope_id / source_event_id / ingress_event_id, delegating hashing to CanonicalAuthority and canonicalization to CanonicalBytes. I did not verify those claims; flagged so the parent can reconcile it against the Phase 3/4/5 work and the Phase 0 clean-worktree pin.

## 6. Method notes

- All searches ran read-only through pigwsl-run.sh against /home/nolan/worktrees/constitutional-convergence-authority-law @ 98ef51c9c. No files were written, edited, or executed beyond grep/sed/cat reads.
- The dirty convergence worktree (/home/nolan/worktrees/constitutional-convergence) was never touched.
- Grep scopes: `--include="*.js" --include="*.ts" --include="*.mjs" --include="*.cjs"`, excluding node_modules and .git; plus one all-file-types pass for ConstitutionalEventStore and AcquisitionManager.
