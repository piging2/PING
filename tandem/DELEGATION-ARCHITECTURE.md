# MUSE x META AI x PING: Delegation Architecture
Read-only architecture study, 2026-09-13. No infrastructure was created, modified, or granted in this pass. Only harmless read-only probes were executed.

Baseline under study: the Meta AI research workflow as it exists after the 2026-09-13 delegation changes (versioned context pack builder, meta-pass.sh v2 with provenance sidecars, emit-observation.py, meta-ai-intel-pass every 6h, outreach engine step 4e with verification gate and PING emission).

---

## A. Existing capabilities (Muse, the orchestrator)

Graded on demonstrated history, not theory.

| Capability | Grade | Evidence |
|---|---|---|
| SSH to the Pig (key auth via proxy) | VERIFIED | Dozens of sessions as muse-ssh@100.79.154.43; file transfer, command execution, PowerShell |
| Docker on the Pig (ps, logs, exec, restart) | VERIFIED | Gateway restart 2026-09-13; container env inspection; log diagnosis |
| Filesystem (local VM + Pig) | VERIFIED | Full workspace management; atomic JSONL writes; scp transfers |
| Git (worktrees, commits) | VERIFIED | Four authorized commits 2026-09-12 on curious-squid |
| Web research (search + page fetch) | VERIFIED | Prospect verification rounds; stack research; review monitoring |
| Browser automation (CDP on Pig, cloud tasks) | VERIFIED | Facebook engagement worker; Meta AI ask worker; purchase flows |
| Connectors (Gmail, Instagram, Facebook CLI, Messenger) | VERIFIED | 10/day Gmail cap enforcement; IG pass 9 likes/5 comments; FB group scans |
| Scheduling (cron add/update/run) | VERIFIED | Five goal-owned jobs managed; manual runs executed |
| Independent verification of businesses | VERIFIED | Round-37 batch verification; review-triggered checks |
| Orchestration (subagents, background chains) | VERIFIED | Catch-up chain; coordinator patterns |
| PING gateway interaction (auth read + write) | VERIFIED | POST /events with L1 Bearer returned event_id 2026-09-13; /constitution read |
| Evidence capture (sweep summaries, logs) | VERIFIED | Per-sweep intelligence summaries; ingested.log; rotation.txt |
| Provenance (sidecars, event metadata) | PARTIAL | Sidecar convention and api:\<agentId\> stamping verified 2026-09-13; not yet exercised across many runs |
| Meta AI web driving (prompt, wait, extract) | VERIFIED | meta-ask.js completed passes A and B 2026-09-13 |
| Gateway mission/task primitives | NOT VERIFIED | MissionScheduler and missions routes exist in the container; not yet used by this agent |

## B. Meta AI comparative advantages (honest assessment)

Evidence base is thin: one fully completed research pass (A) plus one in flight (B). Nothing below is proven at scale.

| Task | Muse capability | Meta AI capability | Relative advantage | Cost/latency | Evidence quality | Verification burden | Best worker (today) |
|---|---|---|---|---|---|---|---|
| Broad consumer-web business discovery | Strong (search + fetch) | Plausibly complementary retrieval | Unproven; weak signal: pass A surfaced phone-only trades the engine's SOS/FB-group discovery had missed | 10-15 min per pass via browser; slower than direct search | Low (unverified, sometimes vague) | HIGH: every named business must be independently verified | Meta AI as a second net, Muse verifies |
| Long-form synthesis of a segment | Adequate | Plausibly stronger narrative synthesis | Unproven | Same as above | Low until verified | HIGH | Either; verify either way |
| Meta-ecosystem research (FB/IG business presence) | Good via FB CLI + IG skill | Native familiarity, but no account access beyond the shared login | None demonstrated | Same | Low | HIGH | Muse (has the CLI + skills) |
| Machine operation, Docker, SSH, Git | VERIFIED strong | None (no execution environment reachable) | Muse, decisively | n/a | n/a | n/a | Muse |
| Deterministic pipeline work (dedup, caps, atomic writes) | VERIFIED strong | Not applicable | Muse | n/a | n/a | n/a | Muse |

Working conclusion: Meta AI's only demonstrated value is as a second, differently-biased discovery net. Its output is consistently lower-trust than Muse's own research and costs more verification per item. The architecture should therefore spend Meta AI on breadth (candidate discovery, alternative angles) and spend Muse on depth (verification, machine work, PING writes). Do not route anything to Meta AI that requires determinism, credentials, or machine access.

## C. Existing infrastructure we can reuse

- **Scheduler:** `meta-ai-intel-pass` (goal-owned, every 6h, rotation.txt checkpoint). One scheduler is enough; it can grow a worker-selection step without forking.
- **SSH substrate:** key auth as muse-ssh via the egress proxy; known_hosts pinned. The single machine-access path.
- **Gateway:** POST /events with exterior-agent Bearer auth (L1/L2); generic envelope {event_type, aggregate_id, aggregate_type, event_data}; source stamped api:\<agentId\>; public read routes (/constitution verified 200).
- **PING pipeline:** OBSERVATION_CREATED verified live 2026-09-13; EventBridge/ClaimWorker chain proven 2026-09-12.
- **Capability registry:** L1/L2 levels with exterior auth middleware (2026-09-12 commits). Future workers can receive scoped credentials here.
- **Files:** tandem/ (pack builder, prompts, provenance), pig-fb/ (browser workers), goal hidden_files/ (answers, sidecars, watermarks).
- **Browser:** Pig's headed Chrome via CDP :9223 for any web-chat-driven worker, not just Meta AI.
- **Connectors:** Gmail, Instagram, Facebook CLI, Messenger, social search for verification and discovery.

## D. Duplicate infrastructure to avoid

Explicitly do NOT create: a second cron/scheduler for delegated research; a second lead or prospect database (JSONL stays canonical for outreach); a Meta AI memory/knowledge store; a parallel ingestion pipeline; Meta AI-specific SSH access or credentials; a permanent duplicate context database (packs are generated, versioned, cached, and disposable); an agent-specific truth store of any kind; a new result format when the PING event envelope already carries it.

## E. Recommended delegation architecture (corrected 2026-09-13 per Nolan)

Smallest scalable design, reusing everything in C and creating nothing in D. Corrections applied: the scheduler owns a research objective, not an agent; PING is the intelligence coordinator underneath Muse, not just a destination; the worker is replaceable without changing the pipeline.

```text
RESEARCH OBJECTIVE (owned by the scheduler: "run the intelligence acquisition cycle")
        |
  Muse, exterior orchestrator, determines:
    - what needs doing (from PING-derived intelligence + rotation state)
    - what context is required (retrieved from files/PING, packed, versioned)
    - which worker is best for this objective
        |
  WORKER (replaceable; pipeline does not change)
    |-- Meta AI: currently best available worker for certain research objectives
    |-- Muse: direct research (already happens in engine sweeps)
    |-- future agents / specialized services: same contract, new transport
        |
  COMMON EVIDENCE CONTRACT (section F: full lineage, not lossy summaries)
        |
  verification (independent; per-observation, not per-business)
        |
  PING: observations -> evidence -> claims -> derived intelligence
        |
  PING-derived intelligence feeds back into Muse's next delegation decision
```

Division of responsibility:

- **Muse:** decides what to delegate and operates external systems (SSH, browser, connectors, scheduler). Temporary working context only.
- **Workers:** perform specialized acquisition/research. Temporary working context only. Never a competing intelligence store.
- **PING:** owns accumulated intelligence: observations, evidence, claims, decisions, relationships, history, replay, verification state. Increasingly the coordinator that tells Muse what should happen next.

The feedback loop is the important part. PING does not just accumulate; the accumulated intelligence determines the next acquisition/delegation cycle.

Lock-in rules:

- One scheduler. One orchestration layer. Many interchangeable workers. One evidence contract. One canonical intelligence substrate: PING.
- Nothing outside PING becomes a competing source of intelligence. Meta AI can have temporary working context. Muse can have temporary working context. Workers can have caches and raw artifacts. The durable intelligence lifecycle is: acquire -> preserve evidence -> verify -> emit -> PING -> derive intelligence -> use that intelligence to determine the next acquisition/delegation.
- Do not encode "Meta AI = discovery worker." Encode "Meta AI = currently best available worker for certain research objectives," and let evidence determine whether its role expands (alternative search angles, synthesis, social-context interpretation, weak-signal detection, cross-source association are all unevaluated, not granted).

## F. Common evidence contract (corrected: full lineage, not lossy)

PING's existing generic event envelope carries the contract. No new objects are required. Correction per Nolan: the worker must make the entire evidence lineage recoverable. A business being verified does not verify every statement made about it. Meta AI does not "feed leads into PING"; it contributes evidence to PING's intelligence process.

Required lineage for every unit of worker output:

```text
Worker output
  -> raw artifact (verbatim answer, preserved forever, content-addressed or path-linked)
  -> extracted observations (each: statement, source span in the raw artifact, confidence)
  -> source evidence (URLs, quotes, timestamps as given by the worker)
  -> verification results (per observation: verified / failed / unconfirmable; method; timestamp; verifier)
  -> contradictions and uncertainty (preserved as such, never collapsed into one fact)
  -> PING events (one per verified evidence unit, each linked to its raw artifact and verification)
  -> claims and knowledge derived by PING (PING's job, never the worker's)
```

Conformance note (2026-09-13 red-team): the current implementation does NOT yet meet this. It emits one compressed observation per business (one line: business + trade + summary), with no raw_artifact link in the event, no per-observation verification records, and no preserved uncertainty. The lineage currently lives scattered across the sidecar, the engine's sweep notes, and the event. The contract above is the bar the existing pass must be brought to, using existing primitives only.

ResearchTask (RESEARCH_TASK_ASSIGNED event): DEFERRED. Do not implement until a second, genuinely different worker exists. The existing scheduler + brief rotation + sidecar already assign work; promoting the task abstraction into PING prematurely would be infrastructure without a consumer. When promotion happens, the task carries {task_id, objective, context_refs (pack version + artifact paths, not blobs), constraints, requested_outputs, worker, priority, provenance_requirements} in event_data.

ResearchResult as an event (in use now, to be deepened per the lineage above):

```text
event_type:      OBSERVATION_CREATED
aggregate_id:    research pass or task id
aggregate_type:  research_pass | research_task
event_data:
  task_id, worker (meta-ai | muse | ...), timestamp,
  raw_artifact (path or content hash of the verbatim answer),
  observations[] (each with source span + confidence),
  sources[], verification[] (per-observation results),
  uncertainty (contradictions and unknowns, preserved),
  provenance {brief_id, context_pack_version, research_agent}
```

The on-disk provenance sidecar mirrors the event's provenance block. Verification updates verification_status via a follow-up event, never by editing the original. PING never needs to know which model did the research; the worker field is provenance, not routing.

## G. Meta AI to Pig desktop feasibility

**What works now:** nothing in this direction. There is no existing mechanism by which the Meta AI web chat can invoke SSH, reach the Pig, authenticate, or execute commands. The meta.ai product surface is a chat interface with no tool use, no API, and no network path to the Pig. No Meta/Muse connector with SSH capability exists in the connector inventory.

**What does not:** the entire path Meta AI -> connector -> SSH -> Pig. All three links are absent, and the middle link cannot be built without either Meta shipping agent tool-use or placing a credential where a chat product could reach it, which the security constraints forbid.

**Smallest missing bridge:** none should be built. The correct future-proof answer is that Meta AI (and future research workers) never need machine access at all. The "one machine access substrate" is SSH held solely by Muse. If a worker needs a machine fact, Muse gathers it read-only and includes it in the task context. Delegation flows one way (tasks and context down, evidence up); machine access never flows down. This keeps every worker interchangeable and keeps the credential boundary to a single holder.

## H. Read-only proof results

- Muse -> SSH -> Pig: VERIFIED (session, file transfer, Docker, PowerShell all exercised).
- Muse -> gateway POST /events with L1 Bearer: VERIFIED 2026-09-13 (event_id 8ad47542..., status ok).
- Gateway health: recovered from degraded in-memory mode with a container restart; PG-backed event path confirmed live.
- Meta AI -> SSH -> Pig: NOT TESTED, deliberately. No connector or product mechanism exists that would permit it, and attempting a proof would require violating the credential and governance constraints in section 7 of the brief (no credential exposure, no new access architecture, no weakening SSH config). The finding is architectural, not a missing test: the path should not exist.

## I. Implementation roadmap (ranked)

1. **Highest leverage:** keep the current loop; evolve `meta-ai-intel-pass` step 2 into explicit worker selection (meta-ai vs muse) with zero new schedulers. (No build needed until a second worker exists.)
2. **Lowest complexity:** adopt the section F event shapes as the convention for all worker results; the observation half is already live.
3. **Greatest reuse:** route every future worker through the Pig CDP browser pattern or direct API, the existing PING event envelope, and the sidecar provenance convention.
4. **Strongest provenance:** keep raw answers verbatim forever; version packs by content hash; record verification outcomes as follow-up events.
5. **Easiest future expansion:** when a worker beyond Meta AI appears, issue it a scoped credential through the existing capability registry (L1 needs its over-grant fixed first: drop fs.write/fs.patch from the L1 profile, per the 2026-09-12 audit finding) and let it claim RESEARCH_TASK_ASSIGNED events.

Explicitly out of scope: Meta AI SSH access, duplicate schedulers, duplicate stores, a context database, any gateway auth changes.

## J. STOP

No architectural changes were implemented from this study. The next step, when Nolan asks for it, is at most item I.1, and only when a second worker actually exists.
