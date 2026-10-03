# Harvest Proposal: Reload (AI workforce / shared agent memory)

## What Reload is, and the open/closed verdict

Reload (withreload.com; app at app.reload.work) is a closed, proprietary SaaS platform founded by Newton Asare and Kiran Das (AI workforce management, ~$2.275M pre-seed led by Anthemis, Feb 2026). Its first native agent, Epic, frames itself as persistent architectural shared memory for coding agents; the current product is a "digital office" where agents act as managed teammates with a Chief of Staff, per-team channels, per-agent autonomy levels, and one shared team memory.

**OPEN/CLOSED VERDICT: CLOSED.** Negative findings verified 2026-10-02: no GitHub organization or repository (site:github.com search returned zero), no public developer documentation or API reference, no published VS Code/Open VSX extension package found, no license published anywhere. Everything observable is proprietary product surface. Therefore: **no code, schema, or text from Reload is adopted**; the mechanism below is a clean-room re-derivation written in my own words from observable product behavior, and it is explicitly NOT Reload's proprietary implementation.

## What was read (inputs to SOURCE_SHA)

1. `01-withreload.com.txt` (sha256 948103e8...) — https://withreload.com, full page text fetched 2026-10-02: offices/agent seats, workspace, standup, autonomy levels, shared memory entity card, tool provisioning, sandbox/tenant isolation.
2. `02-techcrunch.txt` (sha256 e68b2a38...) — https://techcrunch.com/2026/02/19/reload-an-ai-employee-agent-management-platform-raises-2-275m-and-launches-an-ai-employee/, full article text: system-of-record framing, roles/permissions/work-tracking, Epic mechanism (upfront artifacts + structured memory of decisions/code changes/patterns maintained across agents and sessions).
3. `03-search-bundles.txt` (sha256 f515e325...) — search snippets read from anthemis.com/insights/reload (onboarding directory, task assignment, access management, usage/spend tracking), dig.watch, afrotech.com, supercharged.beehiiv.com; plus the negative findings above.

Concatenated sha256: `sha256:a2d6ab5e0eec69d695cd75a6d554f8540a6570a1acebf1320277e0ee64942988`. Raw input files: /tmp/reload-sources/ (ephemeral; hashes recorded here).

## Clean-room mechanism re-derivation (primitive, not product)

What Reload's product *proves* valuable, stripped of marketing:

1. **Shared context as a first-class record, not raw logs.** The shared memory is entity-centric (a named subject, e.g. a company, with linked agents), and facts are discrete records ("2-year term approved at 15%", "Renewal ARR $18,000") with an update marker. Writes are ambient ("everything your agents do becomes memory"); reads are team-wide ("context never resets"). The durable value is: *every fact carries who wrote it, when, and which record it replaced* — the team always reads one current view derived from an append-only chain.
2. **Agent onboarding packet.** New agents are instantiated from templates into seats with: role definition, assigned team channel, pre-wired tool connections, and the current shared-context snapshot. An agent self-provisions further connections but stops for the human when a connection is missing or the scope exceeds the grant. The onboarding packet is what makes "agents as teammates" work without re-explaining context every session.
3. **Authority-threshold approval pause.** Per-agent quantitative authority limits (discount authority, refund limit). Work under the threshold runs autonomously; an action above the threshold enters a *paused* state with Approve / Edit / Defer, and the approval binds follow-up tasks. This is capability + constraint + pending-approval as a state machine, not just allow/deny.
4. **Coordination journal.** Scheduled standup rounds (what shipped / what's moving / needs-you) and a task queue where approvals become queued follow-through tasks. This is a projection of the same shared record, not a second system.
5. **Epic's two-phase context.** At project start: seed artifact bundle (requirements, data models, API specs, tech-stack decisions, diagrams, task breakdowns). During work: structured memory of decisions, code changes, patterns — carried across agent switches ("if you switch coding agents, your structure and memory follow"). This maps to: onboarding packet v1 + append-only fact records thereafter.

## Object model (clean-room, in PING semantics)

`SharedContextRecord` — one per tenant-scoped subject (business, project, account):
- `id`: `scr_<tenant-id>_<stable-slug>` (e.g. `scr_t-9f2_acme-company`) — stable across agents/sessions.
- `tenant_id`: strict isolation boundary; cross-tenant reads fail closed.
- `name`: human label.
- `linked_agents`: set of worker/agent IDs currently bound to this record.
- `entries[]` (append-only): each entry = `{ entry_id, key, value, author (agent/human id + actor_type), recorded_at, supersedes_entry_id (nullable), evidence_refs[] (nullable), status }`.
- `status` per entry: `CURRENT | SUPERSEDED | CONTESTED`.

Current view = projection over entries: for each key, the latest non-contested entry. Nothing is ever mutated in place; corrections are new entries that supersede the old (this is what makes proof 14 replay possible).

`OnboardingPacket` — created per agent at seat instantiation:
- `{ packet_id, agent_id, role, record_ids[] (shared-context records bound at start), snapshot_refs[] (entry_ids included), policy (autonomy thresholds, tool grants), issued_at }`.
- The snapshot refs are what let an agent start with *provenance*, not just context — it knows which facts are new to it.

`ApprovalPause` — an action awaiting a human decision:
- `{ pause_id, agent_id, action_digest, authority_limit, observed_value, state: PAUSED|APPROVED|EDITED|DEFERRED, decision_by, decided_at }`.
- On approval, follow-up tasks are enqueued; the approval decision itself is appended as a fact entry (author = human).

## ID scheme

- `scr_<tenant>_<slug>` — shared context records, stable and human-derivable.
- `sce_<ulid>` — entries (ULID for time ordering).
- `obp_<ulid>` — onboarding packets.
- `apz_<ulid>` — approval pauses.
All IDs encode tenant at the record level so cross-tenant leakage fails at the ID parse layer.

## State transitions

Entry lifecycle: `RECORDED -> CURRENT | (new entry supersedes) -> SUPERSEDED`; `CURRENT -> CONTESTED` on an injected/bad result (never deleted); `CONTESTED -> SUPERSEDED` when a superseding entry is verified. Approval pause: `PAUSED -> APPROVED | EDITED | DEFERRED` (terminal). Agent binding: `SEATED -> ACTIVE | OFFBOARDED`. Offboarding revokes the packet but never deletes entries.

## Authority boundary

The shared-context record is owned by the tenant; writers are agents/human holders of the `context:write` capability on that record. The capability-kernel's allow/deny answers *whether* an action may run; the approval-pause answers *who decides* when the action's magnitude exceeds the agent's quantitative authority. Records can only be appended to by bound agents; contesting an entry requires a distinct actor from the entry's author (separation of claim and verification). Tenant isolation is a fail-closed DB-layer check, mirroring the "isolated at the database layer and fail closed" boundary observed.

## Persistence semantics

Append-only entry log per record; current view is a deterministic projection (key -> latest non-contested entry). Offboarding, supersession, and contestation are all new entries — history is never rewritten. Snapshot refs in the onboarding packet pin exactly which entries an agent started from, so replay can reconstruct any agent's view at any point (proof 14).

## Evidence / receipts

Each entry may carry `evidence_refs[]` (pointers to canonical evidence). The current-view projection renders each fact with its author and timestamp — the "recorded this morning" list is a receipt, not a blob. Verification (proof 13) is itself an entry from a *different* author, bound to the claim's entry_id: claim and verdict are separate records with separate provenance.

## Retries / failures

A failed or bad worker result does not poison the record: the bad entry is marked `CONTESTED` by the verifier (distinct actor), and the fallback attempt's result is a new entry that supersedes it (proofs 11, 12). Retries never rewrite; they re-append with new provenance. The standup/task queue is rebuilt from the same entry log, so recovery after a crash is projection replay.

## Revocation model

Offboarding an agent revokes its onboarding packet and removes it from `linked_agents`; its historical entries remain (authorship is provenance, not a permission). Revoking `context:write` on a record immediately fails closed for new appends; reads of already-issued snapshots are scoped by packet expiry. Tenant deletion is out of scope for the primitive (platform-level policy).

## Tests (that would prove the primitive)

1. Two workers write conflicting facts; current view shows the latest, both entries preserved, authors distinct.
2. Injected bad result entry is CONTESTED by a verifier entry from a different author; current view excludes it.
3. Fallback attempt appends a superseding entry; current view reflects the good result.
4. Replay from the entry log reconstructs the exact current view seen by an agent whose onboarding packet pins snapshot refs (byte-identical projection).
5. Offboarded agent's append is rejected; its past entries still replay.
6. Cross-tenant record read fails closed at the ID layer.

## VERDICT: ADAPT (mechanism only — clean-room, zero copied material)

Reload the company/product is closed and proprietary: nothing to adopt, and no GPL/copyleft/SSPL/BSL to worry about (no license exists because no code is published). The value is the *mechanism*, re-derived clean-room: (a) provenance-attributed shared-context records with supersession, (b) onboarding packets that pin context snapshots, (c) authority-threshold approval pauses. These are adapted to PING semantics (objects, events, capabilities) with zero dependencies and zero Reload IP.

## SMALLEST MISSING PRIMITIVE

**`SharedContextRecord`: a named, tenant-scoped, append-only fact record where every entry carries author + timestamp + supersession link, and the readable "current view" is a deterministic projection.** PING already has the event spine, evidence, objects, and capability allow/deny. What it does not have is the coordination primitive Reload proves valuable: multi-worker shared context with *provenance*, where onboarding a new agent means handing it a snapshot of *whose-facts* rather than re-explaining, and where bad results are *contested* rather than deleted. Everything else (standups, channels, offices, credit pricing) is product; this record is the primitive. Authority owner: **object-kernel** (it is an object with identity and evidence refs; its current view is a projection-kernel consumer).

Proof mapping:
- 9 (create one mission): mission creation seeds a SharedContextRecord + onboarding packet for each worker.
- 10 (worker returns result): result appended as an entry with worker provenance.
- 11 (injected bad result rejected): bad entry CONTESTED by a different author, excluded from current view.
- 12 (fallback attempt succeeds): fallback appends a superseding entry.
- 13 (VERIFIED only after independent verification): verification is a separate-author entry bound to the claim entry_id; the record's VERIFIED state requires author(distinct) evidence.
- 14 (replay reconstructs state): append-only supersession chain + snapshot refs make the current view byte-replayable.
(Adjacent, not claimed: Epic's artifact-bundle maps to proofs 3/4 for SiteSpecs; kept out of scope per the smallest-primitive rule.)

## Dependency analysis

- `DEPENDENCIES`: [] — clean-room re-derivation; zero upstream code, zero packages.
- `DEPENDENCY_COST`: zero.
- No GPL/copyleft/SSPL/BSL exposure: nothing is taken from any licensed work. LICENSE field for the entry: `CLOSED/PROPRIETARY (nothing taken; mechanism re-derived clean-room)`.

## License finding (flagged for Nolan)

Reload publishes no license and no source; it is a closed proprietary SaaS. FLAG: because the company is closed, the harvest here is *inspiration-grade mechanism analysis only*. The proposed primitive is authored fresh for PING under PING's own license. There is no copyleft risk to manage and no proprietary code smuggled in — by construction, nothing of Reload's is copied.
