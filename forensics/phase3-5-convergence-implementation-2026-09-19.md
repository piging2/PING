# Phases 3/4/5/8/9/10: Core Convergence Implementation — Event Authority

Date: 2026-09-19. Worktree: `/home/nolan/worktrees/constitutional-convergence-authority-law`
(branch `constitutional-convergence-authority-law`). Commit: `83c6fcd29e282f4252addc67f1e3db7507b35f7c`
(6 files, +1291/-63, staged explicitly; unrelated CascadeProjects WIP left unstaged and untouched).

Governing law: "REFACTOR AUTHORITY. PRESERVE MECHANISM. DELETE NOTHING. PROVE BEFORE PROMOTION."
Nothing was deleted: no implementation, table, mechanism, or historical row removed. All changes are
additive and reversible.

## Method-classification headline (CanonicalEventEnvelope)

- `dependencies`: pure mechanism (now injects optional adapters, no behavioral change)
- `initialize`: DDL mechanism (applies base schema + additive convergence migration, idempotent)
- `canonicalizeId`: serializer, legacy compatibility
- `generateEventId`: RETIRED authority decision, legacy-only (never called on the converged path; T5 proves it)
- `getNextSequence`: RETIRED authority decision, legacy-only (per-tenant MAX+1 receipt ordering; T5 proves unused on converged path)
- `executeEmitEvent`: deprecated legacy compatibility (receipt surface; explicit receipt semantics)
- `acceptCanonicalEvent`: adapter and certifier (carries constitutional fields, never re-derives, never mints)
- `_buildRepresentation`: serializer
- `executeValidateEvent`: validator (validates canonical representation shape, not legacy emit input)
- query/stats methods: query (preserved, read against representation rows)
- mark processed/failed methods: operational projection (preserved)
- `health`: mechanism
- `publishContract`: certifier (v2.0.0; no longer claims identity minting)

## Identity versus envelope_id (standing distinction, kept explicit)

- Canonical event identity (`event_id` on converged rows): `event_<16hex>`, minted once by
  IdentityAuthority inside UnifiedEventRuntime.emit(). One logical event, one canonical identity,
  across both tables (T1 proves: ping_events.event_id == canonical_events.event_id).
- Representation identity (`envelope_id`): deterministic UUID v5 derived from the canonical identity
  (`convergence_identity.js`), minted by nobody at runtime. It identifies the certified representation,
  never the event. T1 proves `envelope_id != event_id` and determinism.
- Ingress receipt identity (`event_id` on legacy rows): the ingress-era UUID, preserved on the row,
  never rewritten. After convergence it is explicitly labeled `ingress_event_id` (X), distinct from
  `canonical_event_id`/`migrated_event_id` (Y). T6 proves the roles and that the receipt identity is
  preserved, not silently substituted.

## Schema cross-reference (migration 2026-09-19_event_authority_convergence.sql)

- `canonical_events.event_id`: uuid -> text (widened so converged rows carry `event_<hex>`; historical
  UUID rows untouched, no rewrite).
- `canonical_events.sequence`: NOT NULL dropped. Era-dependent: ingress era = receipt ordering
  (per-tenant MAX+1); converged era = canonical log position allocated by PostgreSQL at the
  authoritative commit. Column comment documents this; receipt_order != canonical event sequence.
- `canonical_events.envelope_id`: nullable uuid, indexed (non-null). Deterministic representation identity.
- `canonical_events.source_event_id`: nullable text, UNIQUE partial index (non-null). Explicit
  cross-reference: `ping_events.event_id <-> canonical_events.source_event_id` (T2 proves round-trip).
- `canonical_events.timestamp` / `tenant_id` / `actor`: column comments document era-dependent
  semantics (receipt timestamp vs constitutional acceptance timestamp; tenant claim vs canonical
  namespace; actor as unverified claim, F3 frozen). No rewrites.
- `causation_id`/`correlation_id` (uuid-typed): left NULL on converged rows; converged
  causation/correlation are constitutional and travel in metadata, never truncated into receipt-typed
  columns.

## SEAM PROOF (refined standing law, 2026-09-19)

Claim: Producer -> Canonical Envelope/Receipt -> UER acceptance -> ping_events is the correct seam
for producer-controlled ingress, and Producer -> UER -> ping_events -> envelope derivation is the
correct seam for migrated producers. Both seams are correct because receipt fields are explicitly
modeled as RECEIPT in both, never silently promoted.

Receipt-side fields, explicitly labeled in code, migration comments, and adapter docs:

| Field | Ingress/receipt semantics | Constitutional semantics | Where constitutional is minted |
|---|---|---|---|
| identity | receipt identity (UUID, ingress era) | canonical identity (`event_<hex>`) | UnifiedEventRuntime.emit via IdentityAuthority |
| ordering | receipt ordering (per-tenant MAX+1) | canonical log position | PostgreSQL at the authoritative commit |
| timestamp | receipt timestamp | acceptance timestamp | UER acceptance |
| tenant | tenant CLAIM (unverified) | canonical namespace (`tenant::<id>` / `core::system`) | UER acceptance choke point (adapter authorization layer fails closed on malformed claims) |

Proof artifacts:
- T8: pre-migration, the receipt surface works and the adapter converges it into a distinct canonical
  identity, recorded in metadata (bridge preserved across the migration boundary).
- T6: post-migration, receipt identity preserved on the row, canonical identity in source_event_id,
  representation identity in envelope_id, identity roles explicit in metadata; malformed tenant claim
  REJECTED fail-closed (never silently collapsed to core::system).
- T1/T5: the converged path carries identity, sequence, acceptance timestamp, and canonical namespace
  without reminting anything (generateEventId/getNextSequence provably uncalled).
- Seam bug found and fixed during this unit: the adapter's work-row selection initially treated
  converged-era representation rows as ingress work and marked them REJECTED (category error:
  representation conflated with ingress). Fixed by `_workRowExclusion()` (excludes era
  converged/legacy_converged and non-null source_event_id); T6 now proves the adapter leaves
  certified representations untouched. This is exactly the conflation the standing distinctions forbid.

## canonical_events role: SECONDARY CERTIFIED EVENT REPRESENTATION

Responsibilities, each with proving evidence (per the standing rule: proven, never assigned):
- Certified representation: T1 (row built with canonical identity, envelope_id, canonical hash, era,
  cross-reference; hash verified against CanonicalAuthority-delegated computation).
- Immutable representation: T4 (conflicting content under the same identity fails closed;
  certified row not mutated; no downstream dispatch).
- Compatibility journal: legacy executeEmitEvent path preserved and still receipting (T8/T6);
  historical rows readable and era-interpretable.
- Audit: T7 auditCrossReferences proves zero dangling representations; explicit cross-reference index.
- Migration compatibility: T8 proves the adapter converges pre-migration (metadata-only fallback);
  T6 proves post-migration explicit marking; historical rows never rewritten.
- Domain projection: NOT claimed. The preserved query methods are a compatibility read surface;
  projection authority is a later phase. This is deliberately left unproven.

## Consistency model B failure semantics

- No authoritative commit, no representation: deriveRepresentationAfterCommit returns
  NO_AUTHORITATIVE_COMMIT without manufacturing anything (T7).
- Source commit survives derivation failure: derivation never writes to ping_events; a failed
  derivation leaves the commit intact.
- Retry uses the same identity: same event_id plus same logical content reuses the row and the
  envelope_id (T3); UER re-emit of the same logical event dedups to the same identity (T3).
- Duplicate derivation is harmless: ON CONFLICT DO NOTHING on source_event_id plus pre-check
  idempotence; downstream hook fires at most once per inserted representation (T1/T3/T4).
- Conflicting content under the same identity fails closed: CONVERGENCE_IDENTITY_CONFLICT, no
  overwrite, no hook, no new row (T4).
- Missing representation is rebuildable: rebuildMissingRepresentations restores from ping_events
  with identical identities; rebuild is idempotent (T7).
- Receipt-side retry/exhaustion unchanged from the adapter's frozen C-035/C-037 semantics.

## Test results (all on real PostgreSQL, isolated scratch stores)

- New convergence invariants `tests/event-authority-convergence/convergence_invariants.js`: 67/67 pass.
  Covers T0 (contract), T1 (one identity across tables), T2 (round-trip), T3 (idempotent retry, no
  redispatch), T4 (conflict fails closed), T5 (never remints), T6 (adapter post-migration, explicit
  identity roles, fail-closed rejection, representation untouched), T7 (model B: commit-required,
  rebuild, audit), T8 (pre-migration fallback).
- W-1A invariant harness against the isolated worktree (temp copy, path repointed): 18/0.
- Sequence/replay certification against the isolated worktree (temp copy, RUNTIME_PATH repointed):
  73/73, 0 blocked. T5's Docker restart ran against a throwaway postgres:15 container created for the
  run and removed afterward; scratch DB dropped by the harness.

## Deliberately left to later units

- No change to `unified_event_runtime.js`: the convergence contract (identity_version, principal,
  canonical hash) was satisfiable from existing authoritative material (IdentityAuthority identity,
  CanonicalAuthority hash delegation, metadata claims); no minimal UER change was required. If a later
  phase needs an explicit principal, that is a separate bounded unit.
- Domain projection as a proven canonical_events responsibility: not claimed (see above).
- Producers still emitting to the legacy receipt surface: they converge via the adapter; migrating
  producers to direct UER emit is Phase 7 work (migrate producers not data).
- Oracle cutover, W-1A integration, fanout exactly-once: later phases.

## File-partition conflicts

None. Changed files are exactly the allowed partition: gateway/canonical_event_envelope.js,
ping-runtime/events/legacy_ingress_adapter.js, the new additive migration, two new convergence
helper modules, and the new test directory. The four business authorities, gateway_runtime.js
injection sites, POST /canonical-events, and event_registry.json were not touched.
