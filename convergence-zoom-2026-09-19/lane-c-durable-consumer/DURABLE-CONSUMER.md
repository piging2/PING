# LANE C: Durable Consumer + Routing Version + Mission Schema + Identity + Namespace

Constitutional convergence audit, read-only. Target: `/home/nolan/worktrees/constitutional-convergence-authority-law`, HEAD `0d3cddd4a67238e0511ae7b58718cd75dd29d8d3` (verified via `git rev-parse`). All file:line citations are HEAD unless marked DIRTY (uncommitted worktree changes, listed below). No code was written or mutated on the Pig; this report was produced on the home machine.

## HEAD vs dirty worktree (distinguished, not analyzed as HEAD)

`git status --porcelain` at audit time:
- `M gateway/bootstrap/gateway_runtime.js` — DIRTY: +4 lines (Lane G, 2026-09-19): `WORKER_COMPLETED`/`WORKER_FAILED` added to graph-projection event list as zero-consumer dead letters routed through the human-approval gate.
- `M ping-runtime/orchestration/mission_runtime.js` — DIRTY: +30/-5 (Lane J): `complete()` now emits `MISSION_COMPLETED` and requires `{status:'ok'}` BEFORE the conditional UPDATE (completion-requires-emission; previously the UPDATE committed first and emission failure was unchecked).
- `M ping-runtime/workers/canonical_workers.js` — DIRTY: ObservationWorker subject-identity fallback (`event.event_id || event.mission_id`); ReplayWorker W-2 fail-closed completeness (`COMPLETE` only if explicitly `'COMPLETE'`).
- `M gateway/test_witness_w2_versioning.js` — DIRTY: +39 lines test.

Everything below cites HEAD.

## 0. The loss boundary (framing for all five parts)

The systemic issue is DURABLE CAUSAL HANDOFF, not mission identity (identity is already deterministic: `sha256(missionType:event_id).slice(0,16)`, no `Date.now` anywhere in the derivation path; `ping-runtime/orchestration/mission_runtime.js:63-76`).

The proven crash window, file:line:
1. `UnifiedEventRuntime.emit()` persists the event: `INSERT INTO ping_events ... ON CONFLICT (event_id) DO NOTHING RETURNING sequence` (`ping-runtime/events/unified_event_runtime.js:245-246`).
2. It then dispatches to in-memory handlers: `for (const handler of handlers) { try { await handler(event); ... } catch (err) { console.error(...) } }` (`unified_event_runtime.js:284-292`). Handler exceptions are swallowed; dispatch continues; nothing durable records the failure.
3. The bridge's handler inserts the mission: `INSERT INTO ping_missions ... ON CONFLICT (mission_id) DO NOTHING` (`mission_runtime.js:78-81`); its own catch only bumps an in-memory counter (`event_to_mission_bridge.js:145-146`, `this._stats.failed++`).

So: a crash (or a swallowed exception) between step 1 and step 3 leaves an event durably known in `ping_events` with NO durable record that its required mission was never produced. The live path is wired in `gateway/bootstrap/gateway_runtime.js:601-605` (`new EventToMissionBridge(...); eventToMissionBridge.start()`).

Two related boundaries must not be confused:
- `canonical_events -> UER` (legacy ingress): ALREADY has a durable consumer mechanism. `LegacyIngressAdapter` uses per-row disposition (`processed/processed_at/worker/retries/last_error` on `canonical_events`, `ping-runtime/events/legacy_ingress_adapter.js:287-288, 476-496`) and deliberately keeps NO cursor (C-035: cursor over random UUIDs can permanently skip rows; C-037: no cursor to advance past a failed row; adapter lines 41-53).
- `ping_events -> consumers` (bridge, graph-projection listener, integrations): NO durable mechanism exists. UER has only `replay({afterSequence})`, a read-only ordered reader with no durable cursor and no consumer registry (`unified_event_runtime.js:341-400`).

`tests/event-authority-convergence/phase13_fanout_exactly_once.js` (F1-F8) proves exactly-once EFFECTS under duplicate delivery; it does NOT prove at-least-once DELIVERY. The loss boundary is generic UER callback durability. A fix scoped to `LegacyIngressAdapter` leaves the generic problem intact.

---

## PART 2: Durable event consumption (patch families A-F)

### A. Reconciliation from ping_events

Proposed query shape:
```sql
SELECT e.event_id, e.event_type
FROM ping_events e
LEFT JOIN ping_missions m
  ON m.payload->>'event_id' = e.event_id
 AND m.mission_type = <mapped mission type for e.event_type>
WHERE e.event_type IN (<EVENT_MISSION_MAP keys>)
  AND m.mission_id IS NULL
ORDER BY e.sequence ASC LIMIT N;
-- then INSERT ... ON CONFLICT (mission_id) DO NOTHING
```

Does the HEAD schema support it cleanly? Partially. The join key `payload->>'event_id'` works because the bridge writes `event_id` into the mission payload (`event_to_mission_bridge.js:130`), but it is a convention, not a contract: `payload` is caller-shaped JSONB, nothing enforces the key, and a future bridge change that renames it silently turns the reconciler into a machine that reports "all clear" while deriving duplicates under new IDs. Clean support requires the additive `source_event_id` column (see Part 3). `ON CONFLICT DO NOTHING` makes re-derivation safe under races.

Falsification notes:
- F-A1: the payload-join is convention, not contract. Falsified as a durable mechanism; acceptable only as a no-migration bootstrap (A0), to be replaced by the column join (A1).
- F-A2: without `routing_version` (Part 12), the reconciler cannot know which routing law was in force at the event's acceptance; re-derivation through today's law is a policy choice, not a reproduction.
- F-A3: reconciliation only sees what the CURRENT map maps. Events whose type was removed from the map are invisible (correct), but an event type whose MISSION TYPE CHANGED derives a second mission under the new type while the old one may already exist (needs version pinning, Part 12).

Smallest patch: A0 now (periodic job running the payload-join query; zero migration), A1 with the Part 3 columns (`source_event_id`, `routing_version`; join on columns, derive via current declared policy).

### B. Durable consumer cursor

Two designs attacked: B1 `event_consumers(consumer_name, namespace, last_sequence)`; B2 per-event receipt table `event_deliveries(event_id, consumer_name, status, attempts, last_error, updated_at)`.

- Crash-before-mission-insert with cursor already advanced: B1 loses the event permanently. The only safe order (advance cursor in the SAME tx as the mission insert) collapses B1 into D.
- Cursor corruption: a manual UPDATE, or a second bridge instance advancing the shared cursor, silently skips events; no per-event evidence survives to detect the skip.
- Out-of-order: `sequence` is allocated at INSERT ATTEMPT (`nextval` before the conflict check; the UER comments at `unified_event_runtime.js:236-244` acknowledge consumed-but-gapped values), and concurrent `emit()` calls dispatch out of order. A cursor at N while N-1's handler is still in flight, then a crash, loses N-1 forever.
- Multiple bridge instances: both advance one cursor; the loser's range is marked done while its inserts may have failed.
- Namespace isolation: a `(consumer_name, namespace)` key is expressible, but the bridge subscribes per event_type globally with no per-namespace dispatch, so per-namespace cursors do not match the actual consumer topology.
- Poison events: one permanently failing event head-of-line blocks the cursor, or requires a skip list, which is a second mechanism with its own durability problem. This was already falsified in-repo: the adapter's C-035/C-037 findings (`legacy_ingress_adapter.js:41-53`) rejected cursors for exactly these reasons and use per-row disposition instead.

B2 survives all six: crash-before = no receipt = redeliver; crash-after (receipt in the same tx as the mission insert) = no double work beyond idempotent re-derivation; corruption is per-row and detectable; ordering is irrelevant; multi-instance via conditional claim on the receipt row; poison via attempts cap to dead-letter without blocking others.

Falsification notes:
- F-B1: B1 is rejected. It fails the crash-before-advance, corruption, out-of-order, and multi-instance attacks, and contradicts the repo's own proven cursor rejection (C-035/C-037).
- F-B2: B2 written in the same tx as the mission insert IS the obligation journal; specifying it separately from D would be a duplicate mechanism. Do not spec both.

Smallest patch: do not build B1. Build B2 only as the obligation journal in D.

### C. Event + required mission in the SAME Postgres transaction

Attacked hard on authority separation, as instructed. A single transaction has a single owner, and the candidates both break the standing law:

- If UER owns the tx: UER must know the routing law (`EVENT_MISSION_MAP`) to derive the mission rows inside the commit. That absorbs the "accepted-event to mission trigger" authority, which the standing law assigns to `EventToMissionBridge` (standing authority law: `EventToMissionBridge = accepted-event -> mission trigger authority`). Consequences: (1) a poison event whose mission derivation throws now fails the CANONICAL COMMIT, so a consumer-policy bug can veto event acceptance; the acceptance authority becomes hostage to its consumers. (2) N consumers (bridge, graph-projection listener, integrations) would all need their derivation policies and failure semantics encoded in UER's transaction; UER becomes the orchestrator the convergence was built to remove. (3) With N consumers sharing one tx, one consumer's failure semantics (abort vs. skip) is forced on all others.
- If the bridge owns the tx and also writes the event: impossible without un-accepting; the event is committed by UER before dispatch, and redefining acceptance to include derivation just moves the merge.

Falsification notes:
- F-C1: C does not close the boundary lawfully; it merges two authorities to dodge a handoff problem. Rejected in strong form.
- F-C2: the weaker reading ("one tx per consumer, owned by that consumer, covering receipt + derived rows") is exactly D. There is no distinct C left standing.

Smallest patch: none. Document the rejection; implement A+B2/D instead, which keeps the commits separate and makes the handoff durable and idempotent.

### D. Transactional outbox

Repo sweep FIRST, as instructed (grep for `outbox|inbox|delivery|receipt|cursor|checkpoint|lease|consumer|subscription|processed|pending|dispatch|reconcile`, HEAD, non-test):

- `gateway/event_outbox.js` (296 lines, "Phase 21"): EXISTS but is PRESERVED_INACTIVE. It is never instantiated in non-test code (zero `new EventOutbox` hits outside tests), it is built on the pre-convergence `StandardEventSchema`/aggregate model (`aggregate_id`, `aggregate_type`, `authority`, witness attachment), and it publishes to Redis/WebSocket, not to mission derivation. Rewiring it to the `ping_events`->mission boundary would be a rewrite, not a reuse.
- `gateway/mission_event_bus.js` (+ `mission_events` table): same status, never instantiated.
- `gateway/checkpoint_authority.js` (`checkpoints` table): session checkpoints for a persistent runtime; unrelated to event consumption.
- `LegacyIngressAdapter` per-row disposition: live, but scoped to the `canonical_events`->UER boundary (see section 0). It is the PROVEN PATTERN to copy (per-row, no cursor), not the mechanism to reuse.
- UER `replay()`: read-only, no consumer registry.
- `ping_events.processed`: exists as a column with a manual `POST /events/processed` route (`gateway/routes/events.js:88-94` via `EventReadAuthority`), but NOTHING in the live consumer path writes it. Dead flag, not a mechanism.

Conclusion: no live outbox exists for this boundary, so proposing one does not duplicate a live mechanism; per "refactor authority, preserve mechanism," the spec copies the adapter's proven per-row pattern onto a new table scoped to the new boundary.

Design (smallest):
```sql
CREATE TABLE IF NOT EXISTS ping_mission_obligations (
  source_event_id TEXT NOT NULL,
  mission_type    TEXT NOT NULL,
  mission_id      TEXT NOT NULL,
  namespace       TEXT NOT NULL DEFAULT 'core::system',
  routing_version TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'required',  -- required | discharged | dead_letter
  attempts        INTEGER NOT NULL DEFAULT 0,
  last_error      TEXT,
  derived_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  discharged_at   TIMESTAMPTZ,
  PRIMARY KEY (source_event_id, mission_type)
);
```
Bridge change: in ONE transaction, `INSERT INTO ping_mission_obligations ... ON CONFLICT DO NOTHING` + `INSERT INTO ping_missions ... ON CONFLICT DO NOTHING`. The obligation table is a DERIVED journal, never presented as canonical truth; `ping_events` remains the journal. Reconciliation (A1) heals either side. Poison: attempts cap transitions to `dead_letter` with alert; never head-of-line blocks (no cursor).

Falsification notes:
- F-D1: if the bridge tx rolls back, nothing is recorded; reconciliation re-derives deterministically. Safe.
- F-D2: two bridge instances deriving concurrently collapse on the PK + mission `ON CONFLICT`. Safe.
- F-D3: the journal must never be read as "what happened"; only as "what is still required." Guard with a comment and a read-path review.

Smallest patch: the table + ~15 lines in the bridge (one tx) + the A1 reconciler. Roughly 60 lines total.

### E. Temporal

Status: `gateway/temporal_scheduler_provider.js` + `gateway/scheduler_port.js` + `gateway/temporal_runtime.js` exist, but `@temporalio` is NOT in `package.json`: not installed, not live, plumbing only.

Evaluation: Temporal closes WORKFLOW EXECUTION durability (once a workflow starts, it runs to completion with retries). It does not close the handoff. The dual-write moves from (`ping_events` INSERT, mission INSERT) to (`ping_events` COMMIT, Temporal `startWorkflow` acknowledgement). Exact remaining crash boundary: after UER's `ping_events` COMMIT returns and before the Temporal client's `startWorkflow` call is acknowledged. If the bridge dies in that window, Temporal holds no record of intent and no workflow ever starts. Temporal's idempotent start (`workflowId` = deterministic mission id) makes the START safely retriable, but SOMETHING must durably remember to issue it, which is the obligation journal (D) again. So E presupposes D and adds an external server, against the Postgres-native direction and the standing bar against new infrastructure without proven need.

Falsification notes:
- F-E1: E moves the dual-write; it does not close it. The named remaining boundary is COMMIT -> startWorkflow-ack.
- F-E2: E is orthogonal to the invariant: it hardens execution, not delivery obligation.

Smallest patch: none for this invariant. Revisit Temporal only for execution durability after D lands.

### F. Startup reconciliation only

Falsification:
- F-F1: the loss is not only crash-shaped. UER's dispatch loop swallows handler exceptions and continues (`unified_event_runtime.js:288`); the bridge's catch bumps an in-memory counter (`event_to_mission_bridge.js:146`). A live, never-restarted process can lose a mission with no crash, and then no startup ever runs: permanent silent loss. Startup-only is falsified by the non-crash loss path.
- F-F2: even for crashes, startup-only bounds the loss window by time-to-next-boot, which is unbounded if the supervisor is down.
- F-F3: the first boot after a routing-law change would mass-derive under the new law unless reconciliation is version-aware (Part 12) and idempotent (Part 4).

Smallest patch: F is necessary but insufficient alone. Ship F (run `reconcile()` at boot, before the bridge subscribes) PLUS a periodic sweep (same function on an interval, e.g., 5 min), and make handler failures loud (rethrow after logging, so the supervisor restarts into F) or at minimum counted into a durable gauge. One `reconcile()` function, two triggers.

### Part 2 verdict

Adopt A1 + B2/D + F-periodic. Reject B1 (cursor), C (same-tx merge), E-for-this-boundary (moves the dual-write). The generic `ping_events`->consumer boundary is closed by: idempotent obligation journal (D) + reconciliation under declared current policy (A1/F) + version pinning (Part 12) + collision-loud identity (Part 4).

---

## PART 12: Routing version

Evidence: `EVENT_MISSION_MAP` is a static const (`event_to_mission_bridge.js:22-78`) with NO version field, no history table, and no `routing_version` anywhere in the codebase (grep, HEAD, non-test: zero hits). Git history on the bridge file proves the law is mutable:
- `0fe09842a` "break infinite chain loop": `LINEAGE_CREATED` made terminal (a routing REMOVED).
- `89d5f4ea9` "harden canonical routing": routing entries changed.
- `98ef51c9c` W-1A: `REPLAY_COMPLETED -> WITNESS_ATTEST` ADDED.

So a reconciler replaying old events through today's law can derive missions that were not required at event time (e.g., every pre-W-1A `REPLAY_COMPLETED` would now spawn `WITNESS_ATTEST`).

Decision among A-E:
- (C) immutable routing semantics by event type: FALSIFIED by the history above.
- (A) routing_version captured on the event: rejected. It would require UER, the acceptance authority, to know the bridge's routing-law version at emit time, violating authority separation (section 0; Part 2-C reasoning).
- (D) historical router versions: rejected despite being the most "faithful" option. It can resurrect deliberately killed routings: replaying a pre-`0fe09842a` `LINEAGE_CREATED` through its contemporary law re-derives the chain mission the terminal change was made to kill. It also requires maintaining full historical maps for a case (never-derived obligations for ancient events) that shrinks over time.
- (B) routing_version captured on the mission obligation + (E) explicit current-policy reconciliation semantics: ADOPTED. Every obligation row records the law version that derived it (auditability; skew is visible, not hidden). Reconciliation of NEVER-derived obligations uses CURRENT law, declared explicitly in the reconciler's contract: an obligation that was never recorded has no historical record to contradict, current law is the only law the system can honestly claim to enforce, and current law is loop-free by construction because each law change is reviewed as a law change.

This decides the framing question: NOT generic-replay (UER `replay()` stays policy-free and read-only) but DURABLE-DELIVERY-OBLIGATION-AT-ACCEPTANCE under declared current policy. The invariant is: every accepted mapped event has its currently-required obligations durably recorded and discharged, each pinned to the law version that derived it.

Falsification notes:
- F-R1: (E) can derive a mission for an old event that "would not have been required then." Accepted explicitly: the alternative (D) risks resurrecting killed routings, which is worse; and the version pin makes the skew auditable per row.
- F-R2: if a law change is ever non-monotone in a harmful way (removes a routing whose obligations are still outstanding), the reconciler must NOT derive under current law for events accepted before the removal. Guard: law changes that remove routings must drain outstanding obligations first; encode as a checklist item in the version-bump test.

Smallest patch: `ROUTING_LAW_VERSION` constant in `event_to_mission_bridge.js`, bumped in the same commit as any `EVENT_MISSION_MAP` change (enforced by a unit test that fails when the map's canonical serialization changes without a version bump); `routing_version TEXT NOT NULL` on the obligation/mission row, populated by the bridge; reconciler logs `(event_id, derived_under_version, current_version)` skew.

---

## PART 3: Mission schema, CURRENT vs MINIMUM REQUIRED

CURRENT (`mission_runtime.js:30-52`, HEAD): `mission_id VARCHAR(255)` PK, `mission_type VARCHAR(100)` NOT NULL, `status VARCHAR(50)` DEFAULT 'created', `priority INTEGER` DEFAULT 0, `payload JSONB` DEFAULT '{}', `result JSONB`, `assigned_to VARCHAR(255)`, `created_by VARCHAR(255)`, `created_at` DEFAULT NOW(), `started_at`, `completed_at`, `error TEXT`, `retries INTEGER` DEFAULT 0, `retry_at`, `lease_until`, `claimed_at`; indexes on status, type, priority, assigned_to, retry_at, lease_until. No namespace, no source_event_id, no routing_version.

Per-field verdict (WHAT INVARIANT REQUIRES IT?):

KEEP (required):
- `mission_id`: the deterministic identity; the idempotency anchor for `ON CONFLICT`. Invariant: one logical mission, one row.
- `mission_type`: the routing target; the obligation's "what". Required with `mission_id`.
- `status`, `priority`: lifecycle state machine and scheduling order (claim protocol P0-1/O4 depends on `status`).
- `payload`: the work description. Keep, but it is NOT the join key (see `source_event_id`).
- `result`: completion evidence.
- `created_at`, `started_at`, `completed_at`: lifecycle timestamps; SLA and ordering evidence.
- `created_by`: provenance (`'event-to-mission-bridge'` vs Bearer-token caller). Cheap, already present.
- `assigned_to`, `claimed_at`, `lease_until`: the exactly-once claim across schedulers (proven by the P0-1 conditional-claim and O4 loser-must-not-advance repairs). Invariant: no double execution.
- `error`, `retries`, `retry_at`: bounded attempts with backoff; exhaustion to dead letter. Invariant: attempts are bounded.

ADD (each with its invariant):
- `source_event_id TEXT`: REQUIRED. Invariant: every required consequence is traceable to its cause; turns the A-reconciliation join from payload convention into contract.
- `namespace TEXT NOT NULL DEFAULT 'core::system'`: REQUIRED. Invariant: `NAMESPACE(MISSION)` is durable without trusting caller payload (Part 13: the bridge currently passes namespace only inside `payload` JSON).
- `routing_version TEXT`: REQUIRED. Invariant: which routing law produced the obligation (Part 12).
- `idempotency_key TEXT`: REQUIRED. Invariant: collision detection (Part 4, M-ID-A); stores the exact preimage string so a conflicting row can be verified rather than silently absorbed.
- `semantic_key TEXT NOT NULL DEFAULT ''`: REQUIRED. Invariant: future two-semantic-missions-from-one-event stay representable (Part 4, M-ID-E); part of the identity preimage.

DELETE FROM SPEC:
- `logical_id` (as a column): no invariant needs it separately; event missions use `source_event_id`, direct missions use `idempotency_key`.
- `attempt_count`: rename churn; `retries` + max-attempts already bounds attempts. The invariant is "attempts are bounded," already satisfied.
- `lease_owner`: duplicate of `assigned_to`. No invariant distinguishes them.
- `lease_expires_at`: duplicate of `lease_until`.
- `ping_mission_attempts` table: no invariant requires it. Claimed invariant "every attempt is auditable" is already satisfied: `MISSION_FAILED`, `MISSION_LEASE_EXPIRED`, and retry transitions are canonical events in `ping_events`. A separate table would be a competing authority over attempt history.
- `ping_effects` table: no invariant requires it. Exactly-once effects are already proven via deterministic event IDs + `ON CONFLICT` (Phase 13 F3/F4). A generic effects table competes with the journal.

Falsification notes:
- F-S1: every ADD above is additive and nullable-or-defaulted; no historical row is modified, per the migration law in `database/migrations/2026-09-19_event_authority_convergence.sql`.
- F-S2: if a future reader proposes `ping_mission_attempts` again, the falsifier is: show the attempt in `ping_events` first; only spec the table if an attempt exists that the journal cannot represent.

Smallest patch: one additive migration adding the five columns (`source_event_id`, `namespace`, `routing_version`, `idempotency_key`, `semantic_key`); bridge populates them in the same INSERT that creates the mission.

---

## PART 4: Mission identity options

CURRENT (`mission_runtime.js:63-76`, HEAD): `sha256(missionType:event_id).slice(0,16)` when `payload.event_id` is present, else `sha256(missionType:JSON.stringify(payload)).slice(0,16)`; `ON CONFLICT (mission_id) DO NOTHING`. No `Date.now` in the path (operator's correction confirmed and respected).

Three defects found in the current scheme:
1. `JSON.stringify` is NOT canonical: key order changes the ID for the same logical direct-mission payload (duplicate missions for one intent).
2. No namespace in the direct-mission preimage: two tenants POSTing identical `missionType`+payload to `POST /missions` (`gateway/routes/missions.js:56-72`) get the SAME mission_id; the second is silently absorbed by `ON CONFLICT DO NOTHING` (cross-tenant collapse).
3. Bare 16-hex with no type prefix: parser ambiguity against `event_<16hex>` (the `IdentityAuthority` convention is `<type>_<16hex>`, `runtime/kernel/authorities/identity_authority.js:73-83`).

Options:
- M-ID-A (keep ID + collision detection): history-compatible (no ID changes); on conflict, compare the stored `idempotency_key` with the attempted preimage and throw on mismatch instead of silently dropping. Migration: 1 column + ~10 lines; callers unchanged; parser/DB-index/replay impact: none. ADOPT regardless of the rest.
- M-ID-B (IdentityAuthority domain 'mission'): `mission_<16hex>` via `generateId('mission', canonicalPreimage)`. History: old bare IDs untouched; the prefix era-marks. Collision behavior: same 64-bit bound, now fail-loud via A. Migration: additive; callers: `create()` only. Parser impact: none found (no code regexes mission_id as bare hex; only an unrelated `mission_${mission.mission_type}` template in `self_improvement_loop.js:152`). DB index: same size class. Replay: old IDs replay verbatim. ADOPT for the new era.
- M-ID-C (persist full SHA-256): 64 hex chars; doubles index bytes; no collision or security need at mission volumes (birthday bound 2^32 at 64-bit is ample, and collisions become detected availability events under A, not silent corruption). REJECT.
- M-ID-D (readable `mission_<digest>`): subsumed by B; B IS `mission_<16hex>`. MERGE into B; do not spec separately.
- M-ID-E (versioned identity preimage `{identity_version, namespace, source_event_id | payload_hash, mission_type, semantic_key}`, canonicalized via `CanonicalBytes`): fixes defect 1 (canonical serialization), defect 2 (namespace in preimage), and reserves `semantic_key` for the one-event/one-type/two-semantic-missions case (no current map entry needs it; the map is 1:1 event_type to missionType today, but the ladder use-case is foreseeable). Cost: the preimage fields are the Part 3 columns. ADOPT combined with B: identity = IdentityAuthority 'mission' domain over the E preimage.

Falsification notes:
- F-I1: 64-bit retention is FINE and matches the constitutional `<type>_<16hex>` convention; the risk was never the width, it was silent absorption, which A closes.
- F-I2: "one event + one missionType needing two semantic missions" is not needed by any current map entry; E reserves the discriminator without complicating today's derivation (default `semantic_key = ''`).
- F-I3: the no-rewrite rule holds structurally: historical bare-16hex IDs never match the `mission_` prefix, so era confusion is impossible by construction.

Smallest patch: A now (idempotency_key column + conflict verification); B+E for new missions (`generateId('mission', ...)` with the versioned preimage); C rejected; D merged into B. Rule honored: DO NOT rewrite historical mission IDs; new era only.

---

## PART 13: Namespace

PROOF that `event_id` already includes namespace in its identity preimage: `ping-runtime/events/unified_event_runtime.js:132` builds `const identityData = { event_type: eventType, source, namespace };` (with `logical_id` or `payload` added at :133), and `:201` calls `identityAuthority.generateId('event', identityData)`, which hashes the full canonicalized preimage including `type` and `identity_version` (`runtime/kernel/authorities/identity_authority.js:73-83`). YES: namespace is in the preimage, so `event_<16hex>` is namespace-domain-separated, and `mission_id = sha256(missionType:event_id)` is TRANSITIVELY domain-separated for event-derived missions. Cross-namespace mission collision via the event path is not possible.

Two gaps remain:
1. The separation is inherited, not declared: namespace is nowhere in the mission preimage directly. M-ID-E (Part 4) makes it direct.
2. Direct HTTP missions (`POST /missions`, `gateway/routes/missions.js:56-72`): authorized by Bearer `PING_MISSION_API_TOKEN` (fails closed 503 when unconfigured), but there is NO tenant concept and NO namespace field; `mission_id = sha256(missionType:JSON.stringify(payload))`, and namespace reaches the row only if the caller embeds it in payload. Proven consequence (Part 4, defect 2): identical cross-tenant payloads collapse into one mission via `ON CONFLICT DO NOTHING`, with the second tenant's intent silently dropped.

NAMESPACE(MISSION) durability requirement: every mission row MUST carry a `namespace` column populated by its creator from an authoritative source, never inferred from payload: bridge from `event.namespace`; HTTP from an explicit `namespace` body field defaulting to `'core::system'` and validated against the `core::<name> | tenant::<id>` boundary (the same boundary UER enforces at its choke point, `unified_event_runtime.js` step 3). No migration rewrites history: `ADD COLUMN namespace TEXT NOT NULL DEFAULT 'core::system'` is additive and honestly marks pre-column rows as default-era.

Falsification notes:
- F-N1: transitive separation (via event_id) is PROVEN for event-derived missions; the direct-HTTP path is where the invariant fails, and it fails loudly once stated.
- F-N2: adding namespace to the mission identity preimage (M-ID-E) is defense in depth, not a fix for a live event-path collision; do not present it as closing an open hole on the event path.

Smallest patch: the `namespace` column (Part 3), bridge populates from `event.namespace`, HTTP route accepts and validates an explicit `namespace` field; M-ID-E folds namespace into the new-era preimage.

---

## Lane C consolidated recommendation

1. Add five columns to `ping_missions` (additive migration): `source_event_id`, `namespace`, `routing_version`, `idempotency_key`, `semantic_key`.
2. New `ping_mission_obligations` journal (Part 2-D); bridge writes obligation + mission in one tx.
3. `ROUTING_LAW_VERSION` + bump-enforcing test; current-policy reconciliation declared (Part 12 B+E).
4. New-era mission identity: `IdentityAuthority.generateId('mission', versionedPreimage)` (Part 4 B+E); collision-loud conflicts (A); never rewrite history.
5. One `reconcile()` function run at startup AND on a 5-minute interval (Part 2 A1+F); handler failures become loud.
6. Explicitly NOT built: consumer cursor table (B1), same-tx event+mission merge (C), Temporal for this boundary (E), `ping_mission_attempts` / `ping_effects` tables, full-SHA-256 IDs (M-ID-C), separate M-ID-D.

Open question for the operator: the periodic reconciler's interval and alerting target (log vs page) are policy choices not made here.
