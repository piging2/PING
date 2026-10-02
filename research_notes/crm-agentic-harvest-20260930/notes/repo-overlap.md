# Repo Overlap: CRM / Agentic Marketing / Business-OS Capabilities in PING/FYD

Search agent report, 2026-09-30. READ-ONLY forensic sweep of 35 git worktrees
(main repo ~/workspace + 34 worktrees, incl. detached dirs under
~/workspace/.worktrees, ~/workspace/track-a/*, /home/hatch/worktrees/*,
/home/hatch/falsify-consequence-55b5d89, /home/hatch/repair-consequence).
Giant vendored data dirs (ping-autonomy-challenge, ping-build-program,
tenanos-wave, donor repos) pruned from signal. Findings keyed to the main
workspace; other worktrees mostly mirror it unless noted.

Legend: EXISTS = implemented. PARTIAL = real pieces exist, gaps named.
ABSENT = nothing found. Authority-vs-behavior noted per item, per the
collapse-authority-not-semantics rule: ID generator != workflow-scoped ID !=
identity authority; a ledger with fail-closed code != a journal authority.

---

## 1. CRM-like object model: person/contact, organization, deal, custom objects

**PARTIAL leaning EXISTS for the prospect/contact record; ABSENT for deals, org objects, custom objects.**

- `~/workspace/outreach/prospect-schema.json` — JSON-schema-typed prospect record
  (~35 fields: business_name, owner_name, phone, email, website, city, trade,
  priority_state, conversion_state, suppression_state, opportunity_confidence,
  opportunity_evidence, last_signal, stack_signals, review_velocity, ...).
  Typed fields + controlled vocabularies = behavior, not an enforced authority.
- `~/workspace/outreach/prospect_store.py` — canonical store access module.
  Enforces the 300-ACTIVE-prospect cap at a single choke point, fcntl-locked
  read-modify-write, atomic .tmp + os.replace writes, append-only archive
  (`outreach/prospect-archive.jsonl`). This IS an enforced authority over the
  prospect table (all mutations routed through it).
- Canonical data: `~/workspace/your_files/western-co-prospects.jsonl`.
- Missing vs a real CRM: no deal/opportunity object with pipeline stages, no
  separate organization/company entity type, no custom objects, no typed
  relationship model between records (relationships live in
  `tandem/entity-dossier.py` projections as edges with provenance, not as a
  schema).
- Closest to org/company dedup: `~/workspace/outreach/check-prospect-collision.py`,
  `goals/.../hidden_files/dedupe-names-20260924.json` (name-normalization
  dedupe, behavior-level).

## 2. Event sourcing / append-only journal / immutable history / replay / undo

**EXISTS (behavior + partially enforced; the canonical journal lives off-repo).**

- Append-only ledgers with fail-closed enforcement in code:
  - `~/workspace/outreach/action-intent-ledger.py` — typed intents with terminal
    states (EXECUTED/FAILED/UNKNOWN_EXECUTION/NOT_ATTEMPTED); malformed tail
    refuses append (exit 3); never-reengage guard merges ledger post IDs.
  - `~/workspace/outreach/action-truth-append.py` — per-run outcome records,
    validated vocabularies, fsync'd single-write appends.
  - `~/workspace/tandem/entity-identities.md` — append-only identity relation
    log (convention, not code-enforced; corrections are new rows).
  - `~/workspace/tandem/event-spool.py` — durable local outbox
    (ACCEPTED -> SPOOLED -> DELIVERY_PENDING -> DELIVERED -> ACKNOWLEDGED),
    idempotency keys, three-state probes; explicitly NOT an event authority.
- Canonical event store is PING's `ping_events` via the gateway — **not in this
  repo** (gateway code referenced at /home/nolan/ping, absent from this VM).
- Replay: `~/workspace/replay-lane/`, `~/workspace/fyd-replay/`,
  `~/workspace/fyd-replay-2026-09-27-r2/`, mission-control pass replay
  worktrees, `.worktrees/mc-projection-replay`.
- Undo: `src/lib/editor/command-pattern.ts` (+ `durable-event-store.ts`) in the
  FYD editor trees (fyd-write-boundary, phase1-approval-door, lane-p01 trees) —
  command-pattern undo/redo for the site editor.
- Gap: no in-repo immutable event journal authority; off-repo PING journal is
  the authority and this repo only appends to it.

## 3. Activity timeline / audit log / provenance tracking on records

**EXISTS (behavior; per-record provenance, no unified timeline UI).**

- `~/workspace/tandem/emit-observation.py` — emits typed OBSERVATION events into
  PING with provenance; Meta AI intel has per-business provenance sidecars
  (`goals/ping-social-outreach-campaign/hidden_files/meta-ai-intel/`, verification
  / acceptance transitions).
- `~/workspace/tandem/entity-dossier.py` — builds per-business dossiers; every
  relationship edge carries provenance (source_ref + basis quote) or is
  explicitly marked "inferred"; distinct spellings stay distinct dossiers.
- Mission Control emits typed `MC_*` events (approval transitions, mission
  lifecycle) to the PING journal (`mission-control/emit.py`,
  `approval_request.py`: "every transition appends a typed MC_APPROVAL_* event").
- Missing: a unified per-record activity-timeline surface; provenance is
  scattered across ledgers, sidecars, and dossiers.

## 4. Human approval workflows / approval gates / human-in-the-loop steps

**EXISTS (enforced authority).**

- `~/workspace/mission-control/approval_request.py` — canonical ApprovalRequest
  primitive: proposal is canonicalized + sha256 digest-pinned; `approve()` binds
  an EXACT digest (no approve-latest); silence is never approval; no expiry
  path approves; approval state is SERVER-CONTROLLED via the ApprovalStore
  file. This is a genuine enforced authority.
- Generalized from FYD owner proposal/approve/apply envelope
  (`src/fyd/owner/apply.ts`, `src/fyd/proceduralize/patch.ts` in the FYD trees).
- `~/workspace/mission-control/approval_cli.py`, `proposal_record.py`,
  `proposal_validate.py` — proposal lifecycle around the gate.
- `/home/hatch/worktrees/phase1-approval-door/` — dedicated worktree for the
  FYD approval door (write boundary); also `src/fyd/customize/write-boundary.ts`.
- MarketingOS content loop: human approves/rejects the exact artifact before
  distribution (`~/workspace/marketing-os/` + competitive-signal-pass
  public-safety gate).

## 5. Lead scoring / signal scoring / ranking with evidence

**EXISTS as evidence-scored behavior; no unified scoring authority.**

- `~/workspace/skills/competitive-signal-pass/signal_pass.py` — deterministic
  scoring pipeline for competitive signals: MIN_EVIDENCE=2,
  MIN_VERIFICATION_RATIO=0.5, SCORE_FLOOR=0.15, terminal states
  PASS/NO_VALUE/BLOCKED/FAILURE decided by gates, not vibes. Scored with
  evidence counts; closest thing in-repo to evidence-backed scoring.
- Outreach prospects carry `opportunity_confidence` + `opportunity_evidence`
  fields and a `ranked-2026-09-08.md`; `signal`-driven prioritization
  (`priority_state`, `last_signal`) — scoring as stored fields, not a scoring
  engine.
- Missing: a first-class scoring model/authority (weights, model registry,
  score history per record).

## 6. Data enrichment (contact/company enrichment from external sources)

**PARTIAL (behavior; no enrichment-provider integration).**

- `~/workspace/tandem/build-context-pack.py` — versioned context pack per
  business; `~/workspace/tandem/business-context.py`; Meta AI delegated
  research with per-business verification + OBSERVATION_CREATED events into
  PING (output UNVERIFIED until the verification gate).
- `~/workspace/tandem/entity-dossier.py` — per-business dossiers assembled
  from prospect JSONL, intel sidecars, and PING events.
- Enrichment signals on the prospect record: stack_signals, review_velocity,
  ai_discoverability, booking_mechanism, social_presence.
- Missing: no Clearbit/Apollo-style external enrichment provider integration
  found; enrichment is research-agent behavior, not a provider pipeline.

## 7. Identity stitching / merging anonymous-to-known / dedupe / merge logic

**PARTIAL. True identity authority is off-repo; stitching is a disciplined
convention here.**

- The canonical identity authority (`identity-authority.ts`,
  `canonical-id-generator.ts`, `generateUUIDv5`) lives at
  `/home/nolan/ping/runtime/kernel/identity/` — **not present in this repo/VM**.
- Harvested (not duplicated authority): deterministic UUIDv5 derivation rule
  reimplemented dependency-light in
  `/home/hatch/worktrees/phase1-approval-door/src/fyd/identity/uuid.ts`
  (also fyd-write-boundary, lane-p01 trees). This is an ID-generation rule,
  NOT an identity authority — per the task's collapse rule, say so.
- `~/workspace/tandem/entity-identities.md` — append-only identity relation
  log across BUSINESS ENTITY / PLATFORM ACCOUNT / INTERACTION layers with
  relationship types (name-variant-of, platform-account-of, same-entity-as,
  distinct-from), per-entry evidence + confidence, never-false-merge rule.
  Convention, not code enforcement.
- Dedupe behavior: outreach name-normalization dedupe; never-reengage guard
  dedupes engagement by platform account.
- Missing: entity-resolution/matching engine; no anonymous-to-known stitching
  (no web tracking).

## 8. Workflow automation / triggers / scheduled jobs / journey builders

**PARTIAL. Scheduled jobs: EXISTS. Triggers/journey builders: ABSENT.**

- `~/workspace/cron.d/` (daily/hourly/minutely/weekly/...), 
...[truncated 10686 chars]