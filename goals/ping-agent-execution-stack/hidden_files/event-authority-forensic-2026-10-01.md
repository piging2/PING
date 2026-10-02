# Event Authority Forensic — Social Interdependence Skill Persistence Boundaries

Date: 2026-10-01. Scope: READ-ONLY. No build, launch, restart, patch, commit, wiring, or state mutation.
Task: determine whether PING's existing Event Authority covers the persistence boundaries marked in `~/workspace/skills/social-interdependence/`.
Method: full repository-estate search including every worktree (`git worktree list`: 18 worktrees under `~/workspace/.worktrees/` plus `/home/hatch/falsify-consequence-55b5d89`, `/home/hatch/repair-consequence`). Semantic families searched, not filenames alone: event, journal, ledger, log, record, evidence, observation, witness. Prior forensics reused as evidence only where re-verified against current estate state (notably the 2026-09-30 convergence-lane OPERATING_SPEC authority records).

## 1. The marked persistence boundaries (what the skill declares)

The skill is explicit that these boundaries are marked, not implemented. `README.md:51`: "Event Authority is under forensic review: persistence-integration boundaries are marked in each deliverable, not implemented." Per deliverable:

- **Instagram** (`instagram/docs/ARCHITECTURE.md:33-36`, `instagram/references/EVIDENCE_INDEX.md:53`): "Event Authority is under forensic review: this skill marks the persistence-integration boundary (where a PING event would be emitted) and implements everything else. No independent social event database is created."
- **Threads** (`threads/ARCHITECTURE.md:45`, `threads/references/REF_AUTHORITY_SOURCES.md:18`): "`RECORD_EXTERNAL` is a persistence boundary, marked explicitly in the transition log, never an event emission."
- **X** (`x/ARCHITECTURE.md:71-73`): "There is no independent social event database. The persistence boundary to the outreach ledgers (`x-engagement.md`, the intent ledger) is marked explicitly."
- **Facebook** (`facebook/ARCHITECTURE.md:44,60-66`): local surfaces are `intents.jsonl` (intents + transitions + adapter-evidence, one append-only stream), `observations.jsonl`, `decision_records.jsonl`, `watchdog.jsonl`, plus atomic `budgets.json`/`leases.json`/`circuit_breakers.json`/`relationships.json`. "No new event DB. The production `action-intent-ledger.py` remains the cross-surface intent ledger... The boundary is marked: reconciliation between the two is future work."

The threads/instagram state layers (`threads/src/si_state.py`, `instagram/bin/siig_states.py`, `facebook/bin/si_fb_state.py`) implement: append-only JSONL journals, sha256-chained transition logs (`record_transition`, `verify_chain`), decision replay as a fold over the transition stream (`replay_states` / `fold_intents` — "recompute the decision from the stored inputs; never mutate"). These are real, tested, local persistence surfaces. The missing piece in every case is the same: **the emit edge** — no code path from any of these surfaces to any PING event journal.

## 2. PING's existing Event Authority (verified current-estate state)

Canonical implementation: **UnifiedEventRuntime** (`UnifiedEventRuntime` class, `ping-runtime/events/unified_event_runtime.js`; estate copies verified at `convergence-lane3/unified_event_runtime.js`, `fyd-lane/harvest-wave1/code-evidence/unified_event_runtime.js`, `constitutional-sprint/fleet/observability/obs1-scratch/unified_event_runtime.js`, `gateway-hardening/build/app/ping-runtime/`). Decision owned: what canonical event PING accepts as having happened (acceptance, identity assignment, durable persistence). This matches the 2026-09-30 OPERATING_SPEC authority record; re-verified by reading the implementation.

Capability classification:

| Capability | State | Evidence |
|---|---|---|
| Append | EXISTS, canonical | `emit(eventType, source, payload, options)`; exactly one `INSERT INTO ping_events ... ON CONFLICT (event_id) DO NOTHING` site (idempotent dedup; `RETURNING sequence`) |
| Identity | EXISTS, sovereign | `event_id` minted solely by `IdentityAuthority.generateSpineEventId` (`event_<16hex>`); `emit` takes no caller-supplied id |
| Admission | EXISTS, closed registry | `event_type` validated against `event_registry.json` (233 types in `ping-build-program/lane-wire/event_registry.json`); verdict-class admission exists in worktree only, not deployed |
| Query | EXISTS | `EventReadAuthority`, read-only pool queries, causal traversal (`getChildren`/`getDescendants`/`getAncestors`/`getCorrelationGroup`) |
| Subscription | EXISTS | `.on()` subscriptions; `EventToMissionBridge` maps ~20 event types to mission types (customer/lead/project/estimate/invoice/review/connector/worker pipeline events) |
| Replay | PARTIAL | journal is append-only and re-derivable, but the live replay path does not read back the canonical journal and re-mints identities (per 2026-09-30 record; no contrary estate evidence found) |
| Retention | UNKNOWN | no retention/expiry policy found in the implementation or registry |
| Tenant | ABSENT on deployed path | `tenant_id` partition column exists in worktree only; deployed `POST /events` has no tenant check and no `authorizeNamespace` (per 2026-09-30 distribution record) |
| Entry points | EXISTS | `POST /events` (`gateway/routes/events.js`) → `eventRuntime.emit`; internal emitters (`business_emitters.js`, `canonical_workers.js`); `MissionRuntime` receives `eventRuntime` for mission triggers |

Consumers of the journal: `EventToMissionBridge` → `MissionRuntime`/`MissionScheduler`/`WorkerRuntime` (mission IDs are deterministic `hash(missionType:event_id)`; worker downstream emission goes only through `this._eventRuntime.emit()`), `EventReadAuthority`, canonical/intelligence workers.

## 3. Candidate inventory (semantic-family sweep results)

- `IEventAuthority` (`runtime/kernel/events/event-authority-interface.ts`): DORMANT. In-memory pub/sub interface; zero `implements IEventAuthority` anywhere in the estate. Declares authority in a comment; owns no capability. Not sovereign.
- `ConstitutionalEventBus` (`gateway/event_bus.js`): LEGACY/deprecated, writes the legacy `events` table, bypasses the UER journal; zero live instantiation in the running gateway (per `event-bypass-classification.md` 2026-09-24, verified against the estate: no live require path). Not a competing authority.
- `CanonicalEventEnvelope` → `canonical_events` table: LEGACY_INGRESS, second live writer, but owns a *distinct* decision (tenant-scoped representation identity/sequence), bridged into `ping_events` by `EventBridge`. Not the acceptance decision; not a competitor for the skill's boundary.
- `EventRepository.appendEvent` → `repository_events`: LEGACY derived audit/projection adapter; never generates identity/hash/sequence (all caller-supplied). Polled by `EventBridge` and re-emitted through UER. Adapter, not authority.
- `PostgresEventStore` (`runtime/adapters/postgres_event_store.ts`): DORMANT; zero runtime instantiation; writes a different (`events`) table. Excluded from distribution.
- `social_ingest_adapter.js`: **referenced but absent**. `lane-b/knowledge_ingest_adapter.js` cites `gateway/social_ingest_adapter.js` as the module owning social schemas/predicates, and the 2026-09-24 bypass doc lists `social_ingest_adapter` as a live UER producer — but the file exists nowhere in this estate (full-estate `find` returned zero hits) or in any worktree. A named producer with no reachable implementation.
- Skill-local surfaces (`intents.jsonl`, `transitions.jsonl`, `observations.jsonl`, `decision_records.jsonl`, `watchdog.jsonl`, `~/workspace/outreach/action-intent-ledger.jsonl`, `x-engagement.md` et al.): real, tested, self-owned persistence. None is an event authority; all are file-local with no journal integration.

## 4. Coverage analysis: reached paths vs the first missing edge

Reached integration paths from the skill to the Event Authority: **none found**.

1. The skill tree contains zero references to `emit`, `UnifiedEventRuntime`, `ping_events`, `eventRuntime`, or `POST /events` in any executable code (Python/JS/TS). The boundary markings are documentation-only, exactly as the skill states.
2. `~/workspace/outreach/` (the production engagement machinery the skill genuinely reuses — `engagement-guard.py` is imported via importlib, `authority-check.py` gates builds; both verified as reached paths) likewise contains zero UER references. Its persistence is local JSONL (`action-intent-ledger.jsonl`, `*-engagement.md`).
3. `event_registry.json` (233 types): zero social-engagement types (no `SOCIAL_*`, `LIKE`, `COMMENT`, `FOLLOW`, `ENGAGEMENT_*`, platform names). Admission would have no registered type for such events.
4. `EVENT_MISSION_MAP`: ~20 mapped types, none social. Even if a social event were emitted, no mission consumer is mapped.
5. `social_ingest_adapter.js` does not exist in the estate, so the one nominally social UER producer is not a reachable path either.

**First missing edge:** the emit call itself. Concretely, ordered by dependency, covering the marked boundary would require: (a) a reached code path from the skill's transition-log boundary (`RECORD_EXTERNAL` / "where a PING event would be emitted") to `UnifiedEventRuntime.emit` or `POST /events` — this edge does not exist and is first; (b) registered social event types in `event_registry.json`; (c) an admission/tenant decision for the social namespace (deployed path currently has no tenant check); (d) optionally, `EVENT_MISSION_MAP` entries if social events should trigger missions. Nothing upstream of (a) is missing: the canonical journal, idempotent append, identity minting, read/query, subscription, and mission-bridging machinery all exist and are sovereign.

A secondary reachability note: the skill executes in this environment (WSL/cron); UER's Postgres lives wherever the gateway runs (per the 2026-09-30 record, the Oracle `ping-gateway` container). Network reachability from the skill's runtime to `POST /events` was not probed (out of scope for a repository forensic); the code edge is missing before reachability matters.

## 5. Authority bypass audit

- **Skill side:** no bypass of the Event Authority exists — nothing in the skill or outreach estate writes to `ping_events`, the legacy `events` table, `canonical_events`, or `repository_events`. The skill is honest about this: boundaries are "marked... not implemented," "never an event emission."
- **Declared-vs-actual mismatch (naming overlap, safe direction but misleading):** the skill README's "Shared authorities (reused, none created)" lists PING primitives — MissionRuntime, MissionScheduler, WorkerRuntime, CapabilityAuthority, IdentityAuthority, HashAuthority, Witness, Lineage, Replay — and `facebook/ARCHITECTURE.md` maps each to a *local* mechanism: "Witness (decision records + observations)", "Lineage (intent_id determinism + batch lineage)", "Replay (fold_intents decision replay)", "IdentityAuthority (acting account identity via the envelope + authority gate)", "HashAuthority (evidence_hash via the guard's stamp)", "WorkerRuntime (the Pig worker, via the production adapter)". None of these is a reached path to the PING runtime classes of the same name. Per the sovereignty rule (comments do not establish sovereignty; declared authority must match actual capability ownership), these are conceptual mappings, not reuse. The real reuse the skill achieves is narrower and verified: `engagement-guard.py` (importlib import), `holds.json`/`authority-check.py` (gate), `eligibility-data/*.json`.
- **PING side:** no live competing writer to `ping_events` besides UER (single INSERT site, proven). Reachable bypasses (`EventBridge` polling `repository_events`/`canonical_events`) are classified as legacy-ingress adapters re-emitting through UER, not competing acceptance authorities. `IEventAuthority` is a dormant interface with zero implementers — declared authority with no capability. No bypass found that would let the skill's (future) emissions circumvent UER admission.

## 6. Verdict

**The existing Event Authority does NOT cover the persistence boundaries marked in the social-interdependence skill.** The authority itself is real, canonical, and sovereign over its decision (event acceptance → idempotent durable append in `ping_events` → identity via IdentityAuthority → query/subscription/mission-bridging). But coverage of the skill's boundaries fails at the first edge: **there is no integration path from any skill persistence surface to `UnifiedEventRuntime.emit`**, no registered social event types, no mapped mission consumers, and the one nominally social producer (`social_ingest_adapter.js`) is absent from the estate. The skill's local journals (hash-chained transition logs, decision-replay folds) are sound self-owned persistence, but they terminate at the marked boundary.

**What the Event Authority covers:** canonical event acceptance, idempotent append, identity minting, read/query/causal traversal, subscription, and mission triggering — for registered event types from emitters that can reach `emit()`/`POST /events`.

**What it does not cover:** any social-engagement event type or producer; the skill's intent/transition/observation/decision/watchdog surfaces; the outreach ledgers; tenant-scoped admission on the deployed path; full replay (PARTIAL).

**Downstream implication for the ordered work:** the recursive MissionScheduler/WorkerRuntime archaeology should treat the skill's "reuses MissionRuntime/MissionScheduler/WorkerRuntime" language as unverified naming overlap, not as evidence of integration. The skill's execution path is cron → guard → skill orchestrator → Pig adapter → local JSONL; the PING mission/worker path is a separate, currently unconnected system as far as this skill is concerned.
