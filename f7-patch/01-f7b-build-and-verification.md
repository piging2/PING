# F7-B build and verification record — 2026-09-18

## Unit

F7-B: the smallest source unit implementing the ruled F7/D1 identity domain.
No commit. No push. Main/Oracle untouched.

## Changed files (worktree `constitutional-convergence`, branch `constitutional-convergence-v2`)

Authoritative source change:

- `runtime/kernel/replay/canonical_json.ts`
  SHA-256: `6c90d527bc1e2afa22ab06dc739e28270bba54948b6124b062daa879b6b6e532`
  - RFC-8785 canonicalization: lexicographic key order, exact string preservation
    (no Unicode normalization), `-0` rendered as `0`.
  - F7/D1 value-domain boundary: typed deterministic `CANONICALIZATION_ERROR`
    (fail-closed, before any bytes exist) for undefined anywhere, NaN,
    +Infinity, -Infinity, sparse arrays, circular references, Buffer, functions,
    symbols, bigint. `Buffer` declared ambiently (value and type); no
    `@types/node` dependency.
  - Maximum canonicalization depth 64, counted uniformly: one container level
    (array or object) = one depth unit. Depth 64 accepted, depth 65+ rejected
    with `EXECUTION_LIMIT_EXCEEDED`. This corrects the pre-existing TS
    double-counting of object levels (frozen as a contradiction in
    `evidence/f7-freeze-2026-09-18/01-ts-js-drift.md`).
  - Keeps the existing public surface: `canonicalize`, `stringify`,
    `toBuffer` (Node convenience), `toUint8Array`.
  - `toUint8Array` uses `TextEncoder` (runtime-neutral); `toBuffer` uses the
    ambient `Buffer`.
  - Removed the stale header claim of "UTF-8 normalization" (code preserves
    strings exactly).

Rebuilt artifact (never hand-edited; produced only by the pinned script):

- `gateway/replay/kernel/canonical_json.js`
  SHA-256: `0a8480b0bd6cd95af6f560180bdfa9228b37acebb3761d5f45116e189900c7f0`

Repository-owned build mechanism (new; none previously existed):

- `scripts/rebuild-canonical-json.sh`
  SHA-256: `c4beed12feac246d67188064b879db5dd66cc720a2a2947e96fc71b4deaea847`
  - `tsc --module commonjs --target es2020` on the single authoritative source.
  - Fail-closed: any tsc error aborts before the artifact is copied.
  - Prints a NOTE (does not overwrite) when a fresh compile of
    `deterministic_failure.ts` differs from the checked-in gateway copy
    (known older-revision drift, frozen in the F7-A evidence; out of F7 scope).
  - tsc resolution: `PATH` first, then the Hermes-shipped tsc, else a loud
    error telling the operator to install TypeScript.

Delegation (no second serializer):

- `runtime/kernel/authorities/canonical_authority.js`
  - `CanonicalBytes.serialize()` now delegates to the pinned
    `CanonicalJson.canonicalize()` and returns `Buffer.from(canonical, 'utf8')`.
  - Keeps the raw-Buffer input guard. Class docstring rewritten to state the
    F7/D1 domain instead of the old lenient rules.
  - The `ping-runtime` canonical_authority shim delegates to this kernel file,
    so it inherits the change with no separate patch (verified by reading the
    shim; classified ADAPTER, not a competing implementation).

Identity version:

- `runtime/kernel/authorities/identity_authority.js`
  - `_identityVersion`: `'1.0.0'` -> `'2.0.0'`. The version is inside the
    `generateId` preimage (`identity_version` field), so V2 IDs are
    domain-separated from V1 (proven: same material hashes differently under
    each version).
  - Constructor reorder (see collateral repairs): version assigned before
    `_generateAuthorityId()`.

Canonical acceptance path:

- `ping-runtime/events/unified_event_runtime.js` — `emit()` reordered:
  1. Build identity material (namespace default resolved; no ID minted).
  2. Event-type validation BEFORE minting. Rejection returns
     `{ status:'error', code:'UNKNOWN_EVENT_TYPE', error }` with NO `eventId`.
  3. Governance BEFORE minting. Rejection returns
     `{ status:'error', error:reason, code }` with NO `eventId`
     (code falls back to `'GOVERNANCE_VIOLATION'`).
  4. Mint inside the value-domain boundary: `generateId` in try/catch.
     Rejection returns `{ status:'error', code:'IDENTITY_VALUE_REJECTED',
     error:reason, deterministicCode }` with NO `eventId`, NO persistence,
     NO dispatch, and `failed` incremented.
  5-8. Build, persist, dispatch, integrate (renumbered; persist-failure still
     returns the minted `eventId`, which is correct: the event was accepted,
     persistence failed, the caller needs the ID to reconcile).

## Collateral repairs (required by the fail-closed boundary; all reversible)

The F7/D1 boundary exposed a latent bug class: five authority constructors
called `_generateAuthorityId()` BEFORE assigning the version field the
preimage includes. The old lenient serializer silently hashed
`version: undefined`; the new boundary throws. Each fix moves the version
assignment above the `_generateAuthorityId()` call. No preimage semantics
changed other than replacing the accidental `undefined` with the intended
version string. Verified no external callers of these `getAuthorityId()`
getters exist in-repo.

- `runtime/kernel/authorities/identity_authority.js` (proven crasher:
  `new IdentityAuthority()` threw before the fix)
- `runtime/kernel/authorities/capability_scheduler.js`
- `ping-runtime/agents/agent_memory_authority.js` (instantiation verified OK)
- `ping-runtime/agents/distributed_desktop_agents.js` (instantiation verified OK)
- `gateway/constitution_version_authority.js` (load-time singleton;
  instantiation verified OK; new ID `constitution_version_3a3ba131322eaf39`
  now computed with the real version `5.0.0`)

## Pre-existing breakages found (NOT caused by F7-B; not fixed; recorded)

- `runtime/kernel/authorities/capability_scheduler.js` line 32 requires
  `./constitution_version_authority`, which does not exist in
  `runtime/kernel/authorities/` (only `constitutional_clock.js` and
  `constitutional_time_authority.js`). The module cannot load at HEAD either.
  The constructor reorder there is still correct for when this is fixed.
- `gateway/automatic_mission_generator.js` line 40 references
  `WatcherEventTypes` with no definition (identical at HEAD). The module cannot
  load; the constructor reorder there is still correct for when this is fixed.
- `gateway/semantic_authority.js` `_generateAuthorityId()` returns a template
  string with `this._authorityVersion` assigned after the call, yielding a
  `vundefined`-style ID. Cosmetic only (no hashing, no throw). Out of scope.

## Runtime verification [EMPR] — 2026-09-18

`node /tmp/f7b_verify.js` (test file staged at
`~/workspace/f7-patch/f7b_verify.js`): **48 checks passed, 0 failed**,
against the REBUILT artifact and the real `emit()` path (no DB pool: zero
database writes).

- Normalized-equivalent: key order, nested key order, `-0 == 0`, `1.0 == 1`.
- Legal-injective: array order, array grouping (`[1,2]` vs `[12]` distinct,
  including nested), cross-type (`1`/`"1"`/`true`/`null` distinct), empty
  `{}`, `[]`, `""` mutually distinct, NFC != NFD with byte-exact preservation.
- Rejected fail-closed with typed `CANONICALIZATION_ERROR`: undefined
  (top/nested/array), NaN, +Infinity, -Infinity, sparse arrays, Buffer,
  functions, symbols, bigint, circular references.
- Depth 64 accepted / 65 rejected, identically for arrays and objects
  (`EXECUTION_LIMIT_EXCEEDED`).
- Delegation: `CanonicalBytes.serialize` output equals the pinned artifact;
  rejects fail-closed.
- Injectivity: 15-value corpus produces unique SHA-256 hashes except the
  single ruled `1`/`1.0` pair (verified the ONLY collision is that pair).
- Identity: version reports `2.0.0`; V1 vs V2 domain-separated;
  V2 ID matches `event_[0-9a-f]{16}`.
- `emit()`: success returns `event_<16hex>`, dispatches, builds the canonical
  event; unknown event type -> `UNKNOWN_EVENT_TYPE` with no `eventId` and
  `failed` counted; governance denial -> no `eventId`, no dispatch; NaN
  payload -> `IDENTITY_VALUE_REJECTED` + `CANONICALIZATION_ERROR`, no
  `eventId`, no dispatch, `failed` counted, nothing persisted.
- `node test_patch_004.js`: PASSED (all 7 tests, including kernel/gateway
  delegation and determinism checks).

## Era H certification [EMPR] — 2026-09-18

Re-queried `ping_events` (SELECT-only) after all F7-B work:

- total 739, distinct IDs 739, bare 64-hex 739, `event_`-prefixed 0,
  processed=true 0. Identical to the F7-A census. No IDs recomputed,
  rewritten, or added. Era H remains stored-ID-only. CERTIFIED.

## Deliberately unchanged

- `canonical_events` untouched (0 rows; MC-1 unit not started).
- `EventBridge` untouched (MC-1 unit not started).
- The three dirty ledger files (`CERTIFICATION.md`, `CONTRADICTIONS.md`,
  `EVIDENCE_LEDGER.md`) untouched (other-agent WIP).
- No commit (authorization ambiguous under the standing model; implementation
  and testing are complete, commit is staged for Nolan's explicit word).
- No `identity_era` column. No historical ID rewrites. No deletions.
- 172 files reference the canonical path; only the proven crashers were
  touched. Any other latent reliance on the old leniency will now throw
  loudly (fail-closed) rather than silently corrupt; a full preimage audit
  is a later unit.
