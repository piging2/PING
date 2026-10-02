# PHASE 11 (25-phase): ConstitutionalEventSourcing gate hardening proposal (2026-09-19)

Proposal document only. No code was changed. Analysis and hardening proposal; the gate is currently resolved as PRESERVED_INACTIVE.

Ground truth: worktree /home/nolan/worktrees/constitutional-convergence-authority-law @ 98ef51c9c. All claims cite file:line. No em dashes used in this document.

## What ConstitutionalEventSourcing is

gateway/constitutional_event_sourcing.js:26 defines class ConstitutionalEventSourcing. It is a self-contained event-sourcing module with its own:

- event store: in-memory Map plus a PostgreSQL table constitutional_events (constructor :27-31; _loadEvents :54-74; _persistEvent :177-196 INSERT INTO constitutional_events).
- snapshot store: constitutional_snapshots (_loadSnapshots :78-94; :197 INSERT INTO constitutional_snapshots).
- event identity: own minting via identityAuthority.generateId('event', {type, aggregate_id, timestamp}) (emitEvent :108-113).
- event ordering: own per-store MAX(sequence_number)+1 (_getNextSequenceNumber :143-156).
- event hash: own canonical_hash and witness_hash computed via CanonicalAuthority.hash (emitEvent :113-127).
- event emission: emitEvent(eventType, eventData, aggregateId) (:104-136) persists and returns the event.
- state reconstruction: reconstructState + _applyEvent with a fixed kernel lifecycle vocabulary: MissionCreated, MissionQueued, MissionSelected, ExecutionPlanned, NodeExecuted, ReplayVerified, WitnessVerified, PolicyApproved, CommitCreated, ArtifactStored, MissionArchived (:157-260).

Semantically this is a COMPETING event authority: it decides identity, ordering, persistence, and hash for its event domain, independently of UnifiedEventRuntime. It is not merely a utility module. If it were live, the system would have two event identity regimes, two ordering regimes, and two persistence targets (constitutional_events vs ping_events) with no cross-reference between them.

## Definition, default, and override points

- Definition: gateway/constitutional_event_sourcing.js:26-511, module.exports :511.
- Gate: gateway/constitutional_bootstrap.js:307: `if (this._bootstrapManifest.runtime_config.enable_event_sourcing) {` then requires the module, constructs it, initializes it (:308-314).
- Default: enable_event_sourcing: true in the default bootstrap manifest (gateway/constitutional_bootstrap.js:153).
- Configuration/override points found by repo-wide grep for "enable_event_sourcing": exactly two occurrences, both in constitutional_bootstrap.js (:153 default, :307 gate). There is NO environment variable override, NO CLI flag, NO config file path for this flag anywhere in the repo.
- The manifest itself has two sources: (a) the in-code default (_getDefaultBootstrapManifest), and (b) a database row: SELECT manifest_data FROM bootstrap_manifests WHERE active = true LIMIT 1 (_loadBootstrapManifest, constitutional_bootstrap.js:106-121). So the flag's effective value could be set by whoever writes a row to bootstrap_manifests, not just by the code default. No env-based override exists.

## All call sites (verified by repo-wide grep)

- Instantiation: exactly one, gateway/constitutional_bootstrap.js:309.
- require: exactly one, gateway/constitutional_bootstrap.js:308 (inside the gated block).
- Tests: zero. No test file references ConstitutionalEventSourcing or constructs it.
- Everything else that mentions the string "constitutional_event_sourcing" or "ConstitutionalEventSourcing" is JSON data (ping-runtime/orchestration/*.json indexes, gateway/docs/repository_inventory.json), not code.

Critical second fact: constitutional_bootstrap.js itself is referenced by ZERO other files. Repo-wide grep for require/import of constitutional_bootstrap across *.js returns nothing. The live gateway boots via gateway/server.js:1 -> gateway/bootstrap/gateway_runtime.js, which never mentions constitutional_bootstrap.js. Dockerfile and package.json scripts contain no reference either.

## Verdict: can the dead switch reactivate a competing authority?

NO, not through any reachable path today. The verdict rests on two independent layers, either of which is sufficient:

1. The gate module (ConstitutionalEventSourcing) has exactly one call site, and that call site lives in constitutional_bootstrap.js, which has zero callers. A switch with no live caller cannot fire accidentally: there is no code path from any entry point (server.js, tests, workers, crons) to constitutional_bootstrap.js.
2. Even inside constitutional_bootstrap.js, activation is gated on the manifest flag. The flag has no env override, so no deployment configuration change can flip it. The only writable source is a bootstrap_manifests DB row, and writing that row has no effect because nothing reads the module.

Identified latent risk (not currently reachable, but real): if a future change wires constitutional_bootstrap.js into the live boot path, the default enable_event_sourcing: true would ACTIVATE a competing event authority by default, with no explicit operator decision. The default is fail-OPEN for this gate, and that is the exact hazard Phase 11 exists to close. The module's event domain (kernel lifecycle events like MissionCreated, NodeExecuted) overlaps conceptually with the UER worker-pipeline vocabulary (missions, replay, witness), so reactivation would not be a cleanly disjoint domain; it would be a genuine authority conflict.

## Hardening proposal (smallest refactor; proposal only, no code change authorized here)

Goal: make accidental reactivation impossible while preserving the module byte-for-byte per the preservation law (PRESERVED_INACTIVE classification stays).

Option A (recommended): remove from the live boot path structurally, keep the module.
- Delete the gated block (constitutional_bootstrap.js:306-314) or, better, move the require into an explicitly named, never-called archival function with a comment stating the classification. The single require site disappears; the module file itself is untouched.
- Flip the in-code default to enable_event_sourcing: false (constitutional_bootstrap.js:153) so that any future reader who does wire the bootstrap in gets fail-closed behavior: the manifest path would need an explicit true, and the DB row path would need an explicit active row. This closes the fail-open default without deleting anything.
- Add a one-line assertion or comment at the gate location documenting: PRESERVED_INACTIVE; must not be reactivated without a constitutional decision; reactivation requires an explicit versioned mode selection, not a boolean.

Option B (belt and suspenders, only if Nolan wants a runtime guard): keep the module and the block, but change the gate from a boolean to an explicit versioned mode selection, e.g. event_sourcing_mode: 'disabled' | 'archived-read' | '<explicit-versioned-mode>', default 'disabled', fail-closed on any unrecognized value. Booleans can be flipped by a single DB write; an explicit mode enum forces the reactivating party to name the intended semantics. The DB row path (bootstrap_manifests) then cannot reactivate with a stale boolean row from an older era.

What NOT to do:
- Do not delete gateway/constitutional_event_sourcing.js (preservation law; it is forensic evidence of the Omega.95 architecture and may hold mechanism worth harvesting).
- Do not delete the constitutional_events / constitutional_snapshots DDL knowledge (any existing rows are evidence; the Phase 6 law covers their interpretation: dead lineage, forensic only).
- Do not "fix" the module's identity/ordering to match UER while it is inactive. Inactive code gets documentation, not refactors; a refactor implies a live consumer that does not exist.

## Recommended action for the parent

Authorize Option A as a surgical change: two small edits in constitutional_bootstrap.js (default false; gate block annotated as PRESERVED_INACTIVE with the require made structurally unreachable), zero changes to constitutional_event_sourcing.js, zero changes to any table or data. If Nolan prefers the stronger guard, Option B's enum gate replaces the boolean in the same file. Either way, add one invariant note to the Phase 2 matrix doc (decision 8/12 area): ConstitutionalEventSourcing is PRESERVED_INACTIVE and is not a certification or witness input under any circumstance.
