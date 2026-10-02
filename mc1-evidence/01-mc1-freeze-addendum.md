# MC-1 Evidence Freeze Addendum (coordinator)

Frozen: 2026-09-18 ~14:45 MDT. Extends `~/workspace/f7-evidence/02-era-census-and-bridge.md`
(F7-A freeze ~14:15 MDT). Methods: read-only source reads + live DB SELECTs via
`docker exec ping-postgres`. No repo writes, no git ops for this freeze.

## M1. Validator-live correction [STAT] — FALSIFIES F7-B reconciliation "latent" claim

The F7-B reconciliation reported "Currently latent: no validator wired in bootstrap."
Current source at HEAD `e01ffc57c3acb7b0757ce7d628ece2d929db1058`
(worktree `/home/nolan/worktrees/constitutional-convergence`,
branch `constitutional-convergence-v2`) proves otherwise:

- `gateway/bootstrap/gateway_runtime.js:177-178`:
  `const eventValidator = new EventValidator(repoRoot); eventValidator.load();`
- `gateway/bootstrap/gateway_runtime.js:432-437`:
  `new UnifiedEventRuntime({ pool, eventValidator, eventGovernance, integrationManager })`
- `ping-runtime/events/unified_event_runtime.js` step 2 (F7-B): with a validator
  present and no `validateEventType` method on `EventValidator`, the
  `isRegistered(eventType)` branch runs and returns
  `{ status:'error', code:'UNKNOWN_EVENT_TYPE', ... }` for unregistered types,
  BEFORE identity minting.

Consequence: a `canonical_events` row whose `event_type` is not among the registered
types is REJECTED at the acceptance boundary today. Combined with C-037 (old bridge
advances its cursor past rejections on both paths), such a row would be permanently
silently skipped the moment rows appear. The hazard is LIVE-gated-on-rows, not latent.

## M2. Governance wiring [STAT]

- `gateway/bootstrap/gateway_runtime.js:224-225`:
  `const eventGovernance = new EventGovernance(repoRoot); eventGovernance.load();`
  wired into the same `UnifiedEventRuntime` construction.
- `ping-runtime/events/event_bridge.js:184,283` passes `_skipGovernance: true` on both
  legs, honored at `unified_event_runtime.js:108`
  (`if (this._eventGovernance && !options._skipGovernance)`).
- Governance `validateEvent` rejects `UNREGISTERED_EVENT` for any type absent from the
  registry-derived ownership policy, before reaching namespace checks.

## M3. Registry and registration mechanism [STAT]

- `gateway/generated/event_registry.json`: `count` = 233, 233 events indexed.
- `grep -rn "registerEventType\|register_event_type\|addEventType"` over
  `gateway/ ping-runtime/ runtime/` (excluding node_modules): zero hits.
  There is NO producer-facing event-type registration mechanism anywhere in the repo.
- `canonical_events.event_type` is producer-controlled (TenantOS business ingress
  producers, external/legacy). Its value domain is unbounded and cannot be
  pre-registered. This is the evidence that settles the ruled
  registration-vs-exception question toward a DOCUMENTED COMPATIBILITY EXCEPTION
  (ruled law: "unless a documented compatibility exception exists").

## M4. repository_events has no progress primitive [EMPR]

Live `\d repository_events` on `crx_runtime`: columns
`event_id text PK, object_id, event_type, aggregate_type, sequence integer,
payload jsonb, witness jsonb, timestamp timestamptz, authority, authority_version,
causation_id, correlation_id, created_at, runtimeid, previouseventhash,
canonicaleventhash, reducerhash, witnesshash, replayhash, chain_root`.
No `processed`-like column, no monotonic ingestion sequence. `event_id` is a
hash-chain text value; lexicographic order is not creation order.
A correct per-row durable cursor for this table would require schema addition.
Per the repair rules (no casual schema), the repository_events bridge leg is
RETIRED (disabled by default, code retained as PRESERVED_INACTIVE), not repaired.
Rationale is additionally constitutional: repository_events is
PRESERVED_AUDIT_HISTORY (derived audit/projection); re-minting derived rows as new
canonical events would feed derived truth back in as source truth.

## M5. Canonical namespace format [STAT]

`EventGovernance._validateCanonicalNamespace` enforces
`/^(core|tenant)::[a-zA-Z0-9_-]+$/`. Bootstrap maps producers to `tenant::hpp`
(`gateway_runtime.js` ~line 450). The adapter self-enforces this same format
because it is the one governance rule that is type-independent.

## M6. Rewire points [STAT]

- `gateway/bootstrap/gateway_runtime.js:71` requires `event_bridge`;
  `:363` declares `let eventBridge = null`; `:461-469` instantiates/starts it;
  `:660` exposes it in the services object as `eventBridge`.
- `gateway/routes/mission_control.js:488-492` serves `GET /bridge` from
  `services.eventBridge.getStats()`. Only route referencing the bridge.
- `gateway/test_mc_event_mission_bridge.js` mentions EventBridge in comments only.

## M7. State primitives reused (no schema change) [STAT]

`canonical_events` already carries `processed BOOLEAN NULL`, `processed_at`,
`worker`, `retries INTEGER NULL`, `last_error TEXT NULL`, `metadata JSONB NULL`.
The repair maps UNPROCESSED / ACCEPTED / REJECTED / RETRYABLE onto these plus an
adapter-owned `metadata.legacy_ingress.disposition` marker. `ping_bridge_cursors`
(0 rows, verified live 2026-09-18) is NOT used by the new adapter; left untouched.

## M8. Deterministic rejection vector through JSONB [STAT+EMPR — CORRECTED 2026-09-18]

JSONB cannot carry `undefined`/`NaN`/`Infinity`/functions/symbols/BigInt or circular
refs, so the injectable F7/D1 rejection vector for certification is nesting depth.

CORRECTION to the pre-rebuild note: the drift freeze described the OLD TS source
("object nesting consumes 2 depth units per level"). The F7-B rebuilt artifact
(`gateway/replay/kernel/canonical_json.js` lines 113-117) counts ONE depth unit per
container level, uniformly across arrays/objects, with `depth > 64` throwing.
Empirically verified 2026-09-18 against the worktree's identityAuthority:
payload chains of 60 and 63 nested levels ACCEPTED; 64, 65, 70, 100 REJECTED with
`EXECUTION_LIMIT_EXCEEDED in MERKLE_CONSTRUCTION` (the +1 comes from the identity
envelope level above the payload). The MC-1 cert uses a 70-level payload as the
deterministic rejection vector. The exact 63/64 boundary placement vs the D1
"depth 64 accepted" phrasing is F7-C's domain; MC-1 only relies on the rejection
being deterministic and typed.

## M9. Certification defects found and repaired during MC-1 (2026-09-18) [EMPR]

Two genuine adapter bugs were caught by the certification script before the
final pass; both are repaired and re-verified:

1. `_markRejected()` never set `processed = FALSE` — only `_markRetryable()`
   did. A rejected row kept `processed = NULL`, contradicting the frozen M7
   state machine (REJECTED = processed=FALSE, never confused with acceptance).
   Repaired: `_markRejected` now sets `processed = FALSE` explicitly.

2. `_markRetryable()` never set `processed = FALSE` either (only retries,
   last_error, worker). A transient-failure row stayed `processed = NULL`.
   Repaired: `_markRetryable` now sets `processed = FALSE` explicitly.

Both repairs are comment-implementation alignments with M7; no state-model
change, no schema change. Verified by the passing cert (T3, T3b, T6, T7).

## M10. Capability-bound compatibility exception (2026-09-18) [EMPR]

The pre-certification adapter sent `_legacyIngress: true` + `_skipGovernance:
true` (caller-controlled booleans) on EVERY emit, skipping validation and
governance even for registered types. Repaired before certification:

- Bootstrap mints ONE opaque object (`Object.freeze({surface:'canonical_events',
  version:'1.0.0'})`) and hands it to both `UnifiedEventRuntime` and
  `LegacyIngressAdapter`.
- `UnifiedEventRuntime.emit()` grants the registry-membership exception (step 2)
  and the governance skip (step 3) ONLY on object-identity match with that
  object. Boolean flags without the object grant nothing.
- The adapter is two-phase per row: phase 1 emits with NO exception flags
  (full validator + governance, exactly direct-ingress rules); ONLY after a
  normal-path `UNKNOWN_EVENT_TYPE` does it retry once presenting the
  capability. Without the capability the adapter fails closed (durable
  REJECTED with code UNKNOWN_EVENT_TYPE).
- Which phase accepted a row is durably recorded in
  `canonical_events.metadata.legacy_ingress.exception` ('none' |
  'registry_compat').
- Side effect on dead code: the preserved-inactive `event_bridge.js` passes
  `_skipGovernance: true` without any capability; under the repair that flag
  is inert. `gateway/test_decision_graph.js` also passes `_skipGovernance`
  but constructs its runtime with no governance instance, so it is unaffected.

## M11. MC-1 certification result (2026-09-18) [EMPR]

Script: `~/workspace/mc1-evidence/02-mc1-cert.js` (85 assertions), run against a
scratch database `ping_adapter_cert` (port 5433) as an unprivileged role
`mc1_cert`. Production `crx_runtime` was never written during certification.

Result: CERT_PASS, 85/85 assertions. Coverage:

- T1: legacy row -> adapter -> V2 runtime -> `ping_events`; original event ID,
  source, timestamp, metadata, sequence, tenant, actor (claimed provenance),
  event_version, causation/correlation preserved per their semantic layers;
  V2 `event_<16hex>` identity; canonical timestamp is acceptance time;
  forward correlation (`canonical_events.metadata.legacy_ingress.canonical_event_id`)
  and reverse correlation (`ping_events.metadata.original_event_id`,
  `ingress_surface='canonical_events'`).
- T2: re-poll is idempotent (no duplicate canonical rows).
- T3: deterministic F7/D1 rejection (70-deep payload) -> durable REJECTED,
  `processed=FALSE`, never reached `ping_events`, excluded from future work;
  neighboring rows unaffected (no head-of-line blocking).
- T3b: injected transient failure -> RETRYABLE (visible, `processed=FALSE`,
  retries=1) -> after maxRetries durable REJECTED `RETRY_EXHAUSTED`; the
  canonical row was emitted exactly once (idempotent re-mint + ON CONFLICT).
- T4: five rows converged across three FRESH adapter instances (batchSize=2);
  no cursor table created or used; no work remains; all rows durable ACCEPTED.
- T5a: direct `emit()` of an unregistered type is rejected `UNKNOWN_EVENT_TYPE`
  with no ID minted and nothing persisted (validator is live and flag-gated).
- T5b: REGISTERED type (`INVOICE_CREATED`) through the adapter is accepted via
  the NORMAL path (`exception='none'`): full validator + governance applied.
- T5c: boolean `_legacyIngress`/`_skipGovernance` grant nothing; a forged
  capability object is rejected; the genuine capability grants the narrow
  exception.
- T5d: an adapter constructed WITHOUT the capability fails closed on an
  unregistered type (durable REJECTED, `UNKNOWN_EVENT_TYPE`, nothing
  persisted).
- T6: malformed tenant (`'bad tenant!!'`) is durably REJECTED
  `INVALID_TENANT_NAMESPACE`, never collapsed to `core::system`, never
  persisted.
- T7: state counts reconcile (accepted + rejected == total; unprocessed ==
  retryable == 0); stats shape correct.

Production read-only re-verification after certification (2026-09-18):
`canonical_events` 0 rows, `repository_events` 0 rows, `ping_events` 739 rows
with 739 distinct non-`event_` IDs (Era H intact), `ping_bridge_cursors` 0 rows.
All stores preserved; nothing rewritten or deleted.

Temporary certification infrastructure (`ping_adapter_cert` database,
`mc1_cert` role, `/tmp/.mc1_certpw`, Pig-side temp scripts) was dropped /
deleted after the passing run.

Procedural note: the full git/worktree safety sequence was run before starting
MC-1 work and HEAD/status were re-checked during the session, but the complete
sequence was not repeated before every individual file mutation. Recorded here
honestly; the final diff was fully reviewed before this addendum was closed.
