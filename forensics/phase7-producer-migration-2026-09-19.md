# Phase 7: Producer Migration - Forensics and Evidence

Date: 2026-09-19
Worktree: `/home/nolan/worktrees/constitutional-convergence-authority-law`
Branch: `constitutional-convergence-authority-law`
Morning pin: `83c6fcd29e282f4252addc67f1e3db7507b35f7c`
Phase 7 base at commit time: `efaaf69c9` (Phase 24 landed on the branch during the day; 83c6fcd verified as ancestor, no history rewritten)

Governing law: REFACTOR AUTHORITY. PRESERVE MECHANISM. DELETE NOTHING. PROVE BEFORE PROMOTION.

## What Phase 7 did

Migrated the five producer families off the raw `CanonicalEventEnvelope` receipt surface onto a new explicit seam, `ProducerEventPort` (`ping-runtime/events/producer_event_port.js`). The port preserves each producer's call shape and classifies every event type:

- Registered or mapped type: validate the tenant claim, accept directly through `UnifiedEventRuntime.emit()`, then `deriveRepresentationAfterCommit()`. The derivation never emits again and never dispatches missions.
- Unregistered domain envelope type: explicit receipt through `CanonicalEventEnvelope.executeEmitEvent()` with receipt semantics labels. Acceptance stays with UER via the allowlisted `LegacyIngressAdapter`. The receipt identity (ingress UUID) is never rewritten or silently substituted.
- Fail-closed: a registered/mapped type with no bound runtime throws instead of falling back to receipt. A malformed tenant claim throws instead of collapsing to `core::system`.

No producer was deleted. No registry entry was added, edited, or removed. No migration SQL was touched. `canonical_event_envelope.js`, `legacy_ingress_adapter.js`, `convergence_identity.js`, and `convergence_derivation.js` are byte-identical to before.

## Commits (bounded, one family per unit)

1. `cc8ad4e6a` phase7(producers): add ProducerEventPort migration seam
2. `ffc6429b9` phase7(producers): ReviewAuthority emits through ProducerEventPort
3. `7a5f13e6f` phase7(producers): ProjectAuthority emits through ProducerEventPort
4. `62e521b3a` phase7(producers): CustomerAuthority emits through ProducerEventPort
5. `f7d5fc7e7` phase7(producers): AIWorkspaceAuthority repaired writer via ProducerEventPort
6. `89f03283a` phase7(producers): gateway wiring and HTTP ingress seam
7. `ce25468ee` phase7(producers): per-family migration proof tests

Staging was explicit per file. The unrelated `CascadeProjects/infra/ui-next` files and other lanes' untracked test files (phase9/12/13/14) were never staged or touched.

## Producer tables

### F1 - ReviewAuthority (`ping-runtime/business/review_authority.js`)

| Field | Value |
|---|---|
| CURRENT WRITE PATH | `CanonicalEventEnvelope.executeEmitEvent` (receipt surface), then allowlisted `LegacyIngressAdapter` convergence |
| TARGET WRITE PATH | `ProducerEventPort.emitProducerEvent` -> explicit receipt seam -> envelope receipt row -> `LegacyIngressAdapter` -> `UnifiedEventRuntime.emit` -> `ping_events`; adapter marks the receipt row as the preserved representation (`source_event_id`, deterministic `envelope_id`, `metadata.legacy_ingress`) |
| EVENT TYPE | `review.flagged` |
| NAMESPACE | Receipt row carries the tenant claim; canonical namespace `tenant::<claim>` resolved at adapter authorization |
| IDENTITY SOURCE | Receipt: envelope ingress UUID. Canonical: `IdentityAuthority` (`event_<hex>`) at UER acceptance |
| HASH SOURCE | `canonicalEventHash` over canonical content at acceptance (constitutional hash path) |
| TENANT-PRINCIPAL SOURCE | Producer `tenantId` claim, validated at the port before any write |
| DOWNSTREAM CONSUMERS | None found. No `EventToMissionBridge` mapping, no graph projection subscription for `review.flagged`. Proven: 0 missions after flag + convergence |
| COMPATIBILITY REQUIREMENT | Preserved receipt/legacy path. `review.flagged` stays unregistered until governance decides. Receipt fields (`event_id` UUID, receipt timestamp, receipt order) are never promoted to constitutional semantics |

### F2 - ProjectAuthority (`ping-runtime/business/project_authority.js`)

| Field | Value |
|---|---|
| CURRENT WRITE PATH | `CanonicalEventEnvelope.executeEmitEvent` for `project.created`, `project.updated`, `project.artifact_added` |
| TARGET WRITE PATH | Port: `project.created` -> `PROJECT_CREATED` and `project.updated` -> `PROJECT_UPDATED` accepted directly by UER, representation derived after commit. `project.artifact_added` takes the explicit receipt seam and adapter convergence |
| EVENT TYPE | `project.created`, `project.updated`, `project.artifact_added` |
| NAMESPACE | Direct: `tenant::<claim>` validated at the port before emit. Receipt: claim carried on the row, resolved at adapter authorization |
| IDENTITY SOURCE | `IdentityAuthority` at UER acceptance for both seams (receipt identity preserved separately, never substituted) |
| HASH SOURCE | `canonicalEventHash` at acceptance |
| TENANT-PRINCIPAL SOURCE | Producer `tenantId` claim; malformed claims rejected fail-closed (proven: `bad tenant!` throws, never collapses to `core::system`) |
| DOWNSTREAM CONSUMERS | `EventToMissionBridge`: `PROJECT_SETUP` on `PROJECT_CREATED`, `PROJECT_UPDATE` on `PROJECT_UPDATED`. Graph projection subscribes to both uppercase types. `project.artifact_added` has no consumers |
| COMPATIBILITY REQUIREMENT | Original dotted spelling preserved in `metadata.producer_event_type` on both the ping row and the representation. Mapping table is code-local to the port, not a registry edit. Idempotent retry of the same logical create yields the same canonical identity (ON CONFLICT dedup, proven) |

### F3 - CustomerAuthority (`ping-runtime/business/customer_authority.js`)

| Field | Value |
|---|---|
| CURRENT WRITE PATH | `CanonicalEventEnvelope.executeEmitEvent` via the single `_emitEvent` helper for all five types |
| TARGET WRITE PATH | Port via the same helper: `CUSTOMER_CREATED` / `CUSTOMER_UPDATED` accepted directly by UER; `CUSTOMER_IMPORTED`, `CUSTOMER_EMAIL_SYNCED`, `CUSTOMER_CALENDAR_SYNCED` take the explicit receipt seam and adapter convergence |
| EVENT TYPE | `CUSTOMER_CREATED`, `CUSTOMER_UPDATED`, `CUSTOMER_IMPORTED`, `CUSTOMER_EMAIL_SYNCED`, `CUSTOMER_CALENDAR_SYNCED` |
| NAMESPACE | Direct: `tenant::<claim>` at the port. Receipt: claim on the row, resolved at adapter authorization |
| IDENTITY SOURCE | `IdentityAuthority` at UER acceptance |
| HASH SOURCE | `canonicalEventHash` at acceptance |
| TENANT-PRINCIPAL SOURCE | Producer `tenantId` claim validated at the port |
| DOWNSTREAM CONSUMERS | Bridge: `CUSTOMER_ONBOARD` on `CUSTOMER_CREATED`, `CUSTOMER_UPDATE` on `CUSTOMER_UPDATED`. Graph projection subscribes to both. The three sync/import types have no consumers |
| COMPATIBILITY REQUIREMENT | All five types keep flowing through the one `_emitEvent` helper; only the helper's target changed. No call-site changes beyond the constructor injection |

### F4 - AIWorkspaceAuthority (`ping-runtime/business/ai_workspace_authority.js`)

| Field | Value |
|---|---|
| CURRENT WRITE PATH | Broken: `_persist` called `executeEmitEvent` with a legacy field shape (`aggregateId`, `aggregateType`, `eventData`, `authority`) that `executeValidateEvent` rejects, so this authority never emitted on any path |
| TARGET WRITE PATH | Repaired to the port call shape (`source`, `actor`, `payload`, `metadata` preserving `authority: ai_workspace` and the version claim). `AI_WORKSPACE_RESULT_CREATED` is unregistered, so it takes the explicit receipt seam and adapter convergence |
| EVENT TYPE | `AI_WORKSPACE_RESULT_CREATED` |
| NAMESPACE | Claim on the receipt row, resolved to `tenant::<claim>` at adapter authorization |
| IDENTITY SOURCE | `IdentityAuthority` at UER acceptance after convergence |
| HASH SOURCE | `canonicalEventHash` at acceptance |
| TENANT-PRINCIPAL SOURCE | Producer `tenantId` claim |
| DOWNSTREAM CONSUMERS | None found |
| COMPATIBILITY REQUIREMENT | The repair changes the emit call only. DB persistence (`ai_workspace_results`) is untouched. The authority's public command surface is unchanged |

### F5 - HTTP ingress (`gateway/routes/canonical_events.js`, POST /)

| Field | Value |
|---|---|
| CURRENT WRITE PATH | `POST /canonical-events` passed the body straight to `canonicalEventEnvelope.executeEmitEvent` (producer-controlled event types through the old receipt surface) |
| TARGET WRITE PATH | `createCanonicalEventRoutes` takes the port as a second dependency. POST routes through `producerEventPort.emitProducerEvent`: registered types accepted directly by UER, unregistered types take the explicit receipt path. All read routes (`GET /`, `/stats`, `/unprocessed`) and processing routes (`POST /:id/processed`, `POST /:id/failed`) stay on the envelope unchanged |
| EVENT TYPE | Arbitrary producer-supplied types |
| NAMESPACE | Per the port: direct types validated at the port, receipt types resolved at adapter authorization |
| IDENTITY SOURCE | Per the port: `IdentityAuthority` at UER acceptance; receipt UUIDs preserved |
| HASH SOURCE | `canonicalEventHash` at acceptance |
| TENANT-PRINCIPAL SOURCE | Request `tenant_id`, validated at the port |
| DOWNSTREAM CONSUMERS | Depends on the posted type (bridge/graph for registered business types) |
| COMPATIBILITY REQUIREMENT | The factory defaults `producerEventPort = null` and falls back to the envelope when no port is passed, so other callers and degraded boot keep working. Response shape keeps the `{ event }` key |

## Type classification (with evidence)

Registry inspected 2026-09-19: `gateway/generated/event_registry.json`, 233 entries. Ownership and class confirmed per entry (for example `PROJECT_CREATED`: `authority_owner: ProjectAuthority`, `event_class: business`).

| Producer event type | Classification | Evidence |
|---|---|---|
| `project.created` | MAPPED TO EXISTING CANONICAL TYPE (`PROJECT_CREATED`) | `PROJECT_CREATED` registered, owner `ProjectAuthority`, class `business`. Port maps it; original spelling preserved in `metadata.producer_event_type`. Test F2 proves direct UER acceptance |
| `project.updated` | MAPPED TO EXISTING CANONICAL TYPE (`PROJECT_UPDATED`) | `PROJECT_UPDATED` registered, owner `ProjectAuthority`, class `business`. Test F2b proves direct acceptance |
| `CUSTOMER_CREATED` | REGISTERED CANONICAL EVENT TYPE | Registered, owner `CustomerAuthority`, class `business`. Test F3 proves direct acceptance |
| `CUSTOMER_UPDATED` | REGISTERED CANONICAL EVENT TYPE | Registered, owner `CustomerAuthority`, class `business`. Test F3b proves direct acceptance |
| `review.flagged` | NO CURRENT EQUIVALENT, RECEIPT PATH UNTIL GOVERNANCE REGISTERS | Absent from all 233 registry entries. `REVIEW_RECEIVED` exists (owner `ReviewAuthority`) but is a different business semantic (received vs flagged); not merged. Test F1 proves receipt + convergence |
| `project.artifact_added` | NO CURRENT EQUIVALENT, RECEIPT PATH UNTIL GOVERNANCE REGISTERS | Absent from the registry. Test F2d proves receipt + convergence |
| `CUSTOMER_IMPORTED` | NO CURRENT EQUIVALENT, RECEIPT PATH UNTIL GOVERNANCE REGISTERS | Absent from the registry. Test F3c proves receipt + convergence |
| `CUSTOMER_EMAIL_SYNCED` | NO CURRENT EQUIVALENT, RECEIPT PATH UNTIL GOVERNANCE REGISTERS | Absent from the registry. Same `_emitEvent` receipt path as `CUSTOMER_IMPORTED` |
| `CUSTOMER_CALENDAR_SYNCED` | NO CURRENT EQUIVALENT, RECEIPT PATH UNTIL GOVERNANCE REGISTERS | Absent from the registry. Same `_emitEvent` receipt path as `CUSTOMER_IMPORTED` |
| `AI_WORKSPACE_RESULT_CREATED` | NO CURRENT EQUIVALENT, RECEIPT PATH UNTIL GOVERNANCE REGISTERS | Absent from the registry. Writer repaired and proven in test F4 |
| arbitrary unregistered POST type | PRESERVED LEGACY TYPE | Documented receipt + adapter compatibility path; envelope fallback preserved when the port is absent |
| arbitrary registered POST type | REGISTERED CANONICAL EVENT TYPE | Direct UER acceptance through the port's direct path |

The registry was not edited. All mapping lives in the port's code-local table, clearly marked as pending governance.

## Migrations applied

None. No migration SQL was created, edited, or run by Phase 7. The work ran on the existing convergence migration (receipt/receipt-semantics columns, `source_event_id`, `envelope_id`, convergence state columns).

## Preserved paths

- `CanonicalEventEnvelope.executeEmitEvent` and the full receipt surface: preserved, still the explicit receipt path for domain envelope types, still the read/update surface for receipt history.
- `LegacyIngressAdapter` with its allowlist and capability-bound compatibility exception: preserved, still the only acceptance route for receipted rows.
- `deriveRepresentationAfterCommit`: preserved, still never emits and never dispatches.
- All GET and processing routes on `/canonical-events`: preserved on the envelope.
- `business_emitters.js` (`ReviewEmitter`, `CustomerEmitter`, `ProjectEmitter`, `ConnectorEmitter`, `SystemEmitter`) route through `CanonicalizationService`, a separate seed-time producer surface outside the five Phase 7 families: untouched.
- One canonical identity per logical event, envelope_id distinct from event_id, receipt order distinct from canonical sequence: all preserved and re-proven.

## Pending governance decision (exact)

Governance must decide whether to register the following currently unregistered domain envelope types in the event governance registry. Until that decision, they stay on the explicit receipt path. The registry must not be edited without this decision.

1. `review.flagged` (dotted). Note: `REVIEW_RECEIVED` is already registered under `ReviewAuthority`, but flagged and received are different business semantics. Recommendation: register as a distinct type, do not merge.
2. `project.artifact_added` (dotted). No semantic equivalent exists.
3. `CUSTOMER_IMPORTED`. Note: distinct from `CUSTOMER_CREATED`; it describes sync provenance, not a canonical customer mutation. Recommendation: register as a distinct type, do not merge.
4. `CUSTOMER_EMAIL_SYNCED`. Same note as above.
5. `CUSTOMER_CALENDAR_SYNCED`. Same note as above.
6. `AI_WORKSPACE_RESULT_CREATED`. No semantic equivalent exists.

If governance registers any of these, the change is a one-line move in the port's mapping table (receipt set to registered set), not a producer rewrite.

## Test results

- `tests/event-authority-convergence/producer_migration_phase7.js` (new, Phase 7): **50 passed, 0 failed** on a self-contained scratch PostgreSQL database (created and dropped by the harness). Families F1-F4 plus cross-cutting C1-C3: seam selection per family, one canonical identity, both-directions cross-reference (`ping_events.event_id` = `canonical_events.event_id` = `source_event_id`), deterministic `envelope_id` distinct from `event_id`, receipt UUID preserved and never rewritten, exactly-once mission dispatch (5 mapped emits = 5 missions, derivation added 0), malformed tenant fail-closed, unbound runtime fail-closed, idempotent retry identity stability.
- `tests/event-authority-convergence/convergence_invariants.js` (existing regression): **67 passed, 0 failed**.
- `tests/event-sequence-replay/sequence_replay_cert.js`: **blocked, environment not present**. It requires a dedicated certification container on port 5434 with `PGADMIN_PASSWORD` (only the `w1a-scratch-pg` container on 15439 exists here) and hardcodes `require` paths into the out-of-bounds `constitutional-convergence` worktree. Not adapted; adapting it is another lane's call.
- W-1A harness: not present in this worktree; not run.

## Incidental findings (not changed, recorded)

1. The live gateway wiring is the class-based `GatewayRuntime._initializeServices` (authorities constructed before `UnifiedEventRuntime` exists; routes mounted in `_mountRoutes`). An early tool read returned a phantom `initializeGateway` block that does not exist in the file; the real anchors were re-verified before patching.
2. `BusinessProfileAdapter` (`gateway/google/business_profile.js`) is constructed with a null envelope and the runtime then sets `businessProfileAdapter._eventEnvelope`, a field the adapter never reads (it reads `this._events`). Its `review.received` / `review.replied` emits would throw on the null reference. Pre-existing dead wiring, outside the five Phase 7 families; left untouched for its owner.
3. `gateway/routes/canonical_events.js` uses a module-level shared `express.Router()` singleton, so calling the factory twice double-registers routes. Pre-existing; the factory is called once in production.
4. `gateway_runtime.js` destructures `canonicalizeEvent` from `convergence_derivation.js`, which does not export it (dead import, evaluates to `undefined`, never called). Pre-existing; left untouched.
