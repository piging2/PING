# CODEX HARVEST — PATHS ONLY (read-only differential study, 2026-10-01)

Directive: Nolan 2026-10-01 ~08:36 MDT. Harvest Codex's NAVIGATION MODEL, not its
architecture, runtime, state model, or agent system. No new PING subsystem.

## EVIDENCE: observed vs inferred (read first)

**OBSERVED (tool-verified this session):**
- 3 Codex processes alive on the Pig (codex, codex-code-mode-host,
  codex-computer-use-swift); all have EMPTY MainWindowTitle: no Codex UI window
  is currently rendered. Live UI observation was NOT possible. No input was sent.
- `C:\Users\nolan\.codex\sessions\2026\10\01\` contains rollout JSONL files
  written 08:00, 08:04, 08:24 today: Nolan is actively using Codex right now.
- Rollout record types: `session_meta`, `event_msg` (task_started, task_complete,
  token_count, thread_settings_applied), `response_item` (agent_message, message),
  `world_state` (environments, skills, permissions, collaboration_mode),
  `turn_context`, `inter_agent_communication_metadata`.
- PING forensics (read from workspace): single `ping_events` writer
  (`UnifiedEventRuntime.emit`, one INSERT site, PROVEN), canonical event identity
  (`IdentityAuthority.generateSpineEventId`, one call site, PROVEN),
  `MissionRuntime` -> `ping_missions` (mission_id = hash(missionType, event_id),
  lifecycle created->assigned->running->completed/failed, MISSION_* mirror events),
  canonical worker pipeline (observation->claim->classification->recommendation->
  projection->replay->witness->lineage->knowledge-promotion),
  `EvidenceAuthority.accumulate/verify/rank`, `knowledge_nodes`
  (candidate/approved/rejected, source_event_id), `KnowledgePromoter`
  (ADD-only on human approval), `EventReadAuthority` with
  getChildren/getDescendants/getAncestors/getCorrelationGroup,
  `verifyResultEnvelope` -> WORKER_COMPLETED/WORKER_FAILED.
- Mission Control (read from workspace): projection over the event plane.
  Live routes include /api/mc/today, /api/mc/agents (per-operation fields:
  Mission, Run, Operation, Attempt, Effect, Idempotency Key, Current State,
  Last Evidence, Reconciliation State, Retry Eligibility, Criticality,
  Authority Requirement), /api/mc/object (reverse trace PROVEN:
  object->fields->owner corrections->provenance->journal->source),
  /api/mc/trace-forward, /api/mc/search. Stated principles: drill-down reaches
  source; UNKNOWN renders as UNKNOWN; every number carries as-of + source link.
  Controls (reconcile, hold, resume, cancel, RETRY NOW) withheld by law pending
  witnessed mutation.

**INFERRED (NOT observed live):** the specific Codex UI paths below are drawn
from Codex's documented public UI patterns plus the rollout data model above.
The app window was not renderable, so no path was click-verified. Each path is
marked [DOC] where it rests on documented patterns rather than live observation.

## PATHS TABLE (Codex path -> PING mapping)

| # | CODEX PATH [DOC] | QUESTION IT ANSWERS | CURRENT PING EQUIVALENT | ORCA OWNER | MISSION CONTROL EQUIVALENT | REACHED? | FRICTION DELTA | HARVESTABLE UX PRIMITIVE | DUPLICATION RISK | SMALLEST DELTA |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Thread -> changed-files list -> diff view | What did it touch? What changed? | WORKER_COMPLETED payload file refs; artifact records | WorkerRuntime result envelope | /api/mc/agents has Effect field; no file-diff path | Data yes, path no | HIGH: today requires reading raw payloads | Changed-file summary + diff adjacency | HIGH if a FileChangeAuthority is invented; LOW if projection-only | Projection query "files touched by mission_id" rendered beside the mission; diff evidence via existing artifact refs |
| 2 | Single chronological thread timeline (message->step->tool->result interleaved) | What happened, in what order? | MISSION_* + WORKER_* + OBSERVATION/CLAIM events ordered by timestamp, linked by causation_id | MissionRuntime lifecycle | No mission-timeline view exists | Data yes, path no | HIGH: causation traversal exists in EventReadAuthority but is not rendered | Execution chronology | LOW (projection) | /api/mc/mission/:id/timeline projection over existing events |
| 3 | Command and its output shown adjacently, inline | What actually ran? What did it output? | Attempt records; WORKER_COMPLETED/WORKER_FAILED result payloads | ExternalAgentAdapter.verifyResultEnvelope | Last Evidence field exists per-operation; adjacency not rendered | Data yes, path partial | MEDIUM | Command/result adjacency | LOW (projection) | Render attempt->result pairs inside the timeline (#2); same delta |
| 4 | Error shown with file:line backlink | What failed? Where exactly? | WORKER_FAILED payloads; causation_id to source | WorkerRuntime dispatch | Failure renders; no source backlink | Data partial | MEDIUM | Compact failure surface w/ backlink | LOW (projection) | Render WORKER_FAILED payload file refs as links; no new types |
| 5 | Claim stated with evidence attached inline | How do we know? | CLAIM_CREATED -> EvidenceAuthority.verify/rank -> evidence rows | ClaimWorker | Evidence exists; claim->evidence adjacency not rendered | Data yes, path no | MEDIUM-HIGH | Evidence attached directly to claims | MEDIUM if an EvidenceUI store is built; LOW as projection | /api/mc/claim/:id/evidence projection; inline in timeline |
| 6 | Caused-by breadcrumb (this exists because X) | What caused this? Why does it exist? | getAncestors via metadata.causation_id | EventToMissionBridge | Not rendered | Data yes, path no | MEDIUM-HIGH | Contextual breadcrumbs | LOW (projection) | Breadcrumb strip on mission/event views from existing traversal |
| 7 | Status transition strip (started->running->done with times) | Where is it now? What happened? | MISSION_CREATED/ASSIGNED/STARTED/COMPLETED/FAILED mirror events | MissionRuntime | Status field exists; transition history not shown | Data yes, path no | MEDIUM | Status transitions | LOW (projection) | Render the MISSION_* event series as a strip; zero new events |
| 8 | Reopen / continue thread (resumable work) | What should happen next? / continue | mission retry_pending, lease reclaim; RETRY withheld by law | MissionScheduler | Not available (controls withheld) | Data yes, authority-gated | MEDIUM | Resumable work | HIGH if it bypasses the witnessed-mutation law; LOW if it goes through it | Wire existing retry through the approval path Nolan already requires; projection shows eligibility, not a bypass |
| 9 | Project/environment switcher -> thread list | Where am I? What else is running? | tenant_id column on ping_events; /api/mc/today | Tenant scoping (Lane L) | Partially (/api/mc/today) | Partial | LOW-MEDIUM | Repository/thread switching | LOW (projection) | Tenant->mission switcher in MC nav; data already tenant-scoped |
| 10 | Every status row one click from its evidence | Prove it. | /api/mc/object reverse trace (PROVEN); Last Evidence field | EventReadAuthority | Partial: principle stated, not wired everywhere | Data yes, path partial | HIGH (every screen, every reading) | Summary -> underlying evidence | LOW (projection) | Enforce the already-stated law: every MC number/row carries as-of + source link; audit and fill gaps |

## RANKED WINNERS (friction x frequency x data-available / cost)

1. **#10 Summary -> evidence, one click, everywhere.** Highest frequency
   (every MC screen), data fully available, near-zero cost: it is already
   Nolan's stated law, just unwired. PING dest: existing /api/mc/object
   reverse trace + Last Evidence fields, extended to every row.
2. **#2 Mission timeline.** The single biggest structural gap: all the data
   exists (timestamp ordering + causation_id), but no human can SEE a mission
   unfold. PING dest: /api/mc/mission/:id/timeline projection.
3. **#1 Thread -> changed files -> diff.** Answers "what did it touch" for
   every code-touching mission. PING dest: mission -> attempts ->
   artifact/file refs -> diff evidence. Projection only.
4. **#6 Caused-by breadcrumb.** Answers "why does this exist" in one glance.
   PING dest: getAncestors traversal rendered as a strip. Projection only.
5. **#5 Claim -> evidence inline.** The "HOW DO WE KNOW" primitive.
   PING dest: CLAIM_CREATED -> EvidenceAuthority rows, rendered in the timeline.
6. **#3 Command/result adjacency.** Folds into #2's delta; listed separately
   only because it answers a distinct operator question ("what actually ran").
7. **#7 Status transition strip.** Cheap, renders existing MISSION_* mirrors.
8. **#4 Error -> source backlink.** Compact failure surface; needs file refs in
   failure payloads to be link-rendered.
9. **#9 Tenant -> mission switcher.** Partially reached; navigation polish.
10. **#8 Resumable mission.** Ranked last ONLY because it is authority-gated:
    the witnessed-mutation law must be satisfied first. Do not wire a bypass.

## FIVE CLASSIFICATIONS

- **FYD CURRENT IMPLEMENTATION:** keep its real compiler/Ask/evidence paths
  (why-this, replay, SiteSpec determinism). Codex navigation must not infect
  the entity model or SiteSpec. FYD is not the harvest target; Mission Control is.
- **PING EXISTING IMPLEMENTATION:** overwhelmingly the semantic owner. Single
  canonical ping_events writer, canonical event identity, MissionRuntime,
  ClaimWorker, worker pipeline, EvidenceAuthority, KnowledgePromoter,
  EventReadAuthority traversals: all forensically established. The information
  for every winning path already exists as data.
- **HARVESTABLE CODE:** possibly ZERO lines of Codex code. The high-value
  harvest is interaction paths, adjacency rules, breadcrumbs, drill-down
  conventions, and resumability patterns, re-expressed in PING objects
  (MISSION, EVENT, WORKORDER/ATTEMPT, RESULT, EVIDENCE, ARTIFACT, CLAIM,
  KNOWLEDGE, APPROVAL, EFFECT, OUTCOME). Do not import Codex's rollout JSONL
  as canonical truth; it is Codex's private session store.
- **DUPLICATION RISK:** EXTREMELY HIGH if "steal Codex" is read as importing
  task/session/runtime/state abstractions (CodexTask, ThreadAuthority, a Codex
  event model, a second agent runtime, parallel history). Every one of those
  has a proven PING counterpart; importing them would fork truth.
- **SMALLEST REQUIRED DELTA:** projection/navigation only. Links before
  layers. Paths before primitives. Projection before persistence. The first
  harvest must not create any new authority, table, or event type.

## MARKETINGOS APPLICATION SKETCH (no new platform)

One INTELLIGENCE_RESEARCH mission becomes traversable as:
objective -> research questions -> workers -> observations -> claims ->
evidence -> contradictions -> verdict -> opportunity -> proposed artifact ->
approval -> distribution attempt -> verified effect -> metrics ->
experiment verdict -> learning -> next question.
Every arrow is an EXISTING edge: mission payload (objective/questions),
worker dispatch records, OBSERVATION_CREATED events, CLAIM_CREATED ->
EvidenceAuthority rows, knowledge_nodes (verdicts), PROPOSED_ACTION /
ACTION_APPROVED / ACTION_REJECTED events (durable approval record),
distribution effect records, metric observations. The
MARKETINGOS-PROJECTION-CONTRACT already defines this as a deterministic
read-only projection; the navigation harvest makes it WALKABLE. No dashboard,
no new store, no GrowthAgent authority.

## FIRST HARVEST (smallest delta)

**Wire #10 + #2 as one projection change in Mission Control:**
(a) audit every MC row for as-of + source link, fill the gaps (already the
law, just enforce it); (b) ship /api/mc/mission/:id/timeline rendering the
existing MISSION_*/WORKER_* event series with claim->evidence and
attempt->result adjacency inline. Zero new authorities, zero new tables,
zero new event types. If it requires a new foundational authority, reject it:
the primitives have not been disproven.

## WHAT WAS REJECTED

- CodexTask / ThreadAuthority / any task/session authority: PING mission is
  the proven owner.
- Importing Codex rollout JSONL as events or canonical truth: private session
  store, not PING evidence.
- A Codex event model, second agent runtime, or parallel history: forking truth.
- Copying Codex's internal state model because its UI exposes a useful path:
  re-express every path in MISSION/EVENT/ATTEMPT/RESULT/EVIDENCE/ARTIFACT/
  CLAIM/KNOWLEDGE/APPROVAL/EFFECT/OUTCOME or reject the path.
- "Make Mission Control look like Codex": the target is information scent,
  not visual mimicry.
- Any harvest touching FYD's entity model or SiteSpec: out of scope by directive.
