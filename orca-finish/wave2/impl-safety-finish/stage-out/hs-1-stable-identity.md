# SPEC (UNBUILT) — HS-1: key-order-stable mission identity

**Status: SPEC ONLY. Not built, not wired, no production callers.**
Source: ORCA-A harvest backlog, `~/workspace/orca-finish/wave2/impl-safety/GAP-ANALYSIS.md`.
Target surface: `/home/nolan/ping` (branch `refactor/runtime-authority-convergence`) — this lane must never touch it.
Lane build shape when authorized: `lib/orca/orca_stable_identity.js` (pure) + `lib/orca/test/test_orca_stable_identity.test.js`.

## Problem

`create()` builds its idempotency key with `JSON.stringify` on an object
whose key insertion order is not canonical. Two semantically identical
mission payloads with different key order hash to different keys, so the
duplicate-mission guard (ORCA-A Record 6 / probe H1j) can be bypassed by
key-order variation alone. The key must be order-stable.

## Contract

`stableStringify(value) -> string`, then `missionIdentityKey(payload) =
sha256hex(stableStringify(payload))` (64 lowercase hex chars).

Rules, all binding:

1. Object keys sorted lexicographically (recursive, all depths). Arrays keep
   order (arrays are ordered data; sorting them would destroy semantics).
2. Explicit type tags: the serialization must distinguish `1` from `"1"`,
   `true` from `"true"`, `null` from `"null"`, and objects from arrays. A
   canonical form like `{"k":...}` vs `[1,"1"]` must not collide across
   types. (Minimal viable: prefix or tagged encoding; exact encoding is the
   implementer's choice, but the type-distinction property must be tested.)
3. Reject non-finite numbers: `NaN`, `Infinity`, `-Infinity` THROW
   (`ErrNonFinite`). Silent coercion to `null` (JSON.stringify behavior) is
   forbidden; it would merge distinct payloads.
4. Reject `undefined`, functions, symbols, and BigInt-or-throw: `undefined`
   and functions THROW (`ErrUnserializable`). (JSON.stringify silently drops
   them, which merges distinct payloads.) BigInt: either throw or encode
   with an explicit `bigint:` tag; the spec requires the choice to be
   documented and tested, not silent.
5. No locale, no platform, no insertion-order dependence anywhere in the
   output. Same logical value, same bytes, on any machine.
6. Output of `missionIdentityKey` is exactly 64 lowercase hex chars
   (sha256).

## Composition

- Plugs into `orca_outcomes.js` `idempotencyKeyFor`: the stable identity is
  the idempotency-key source for external effects. Today
  `idempotencyKeyFor` takes a `deriveWorkOrderId` injection; HS-1 replaces
  the JSON.stringify inside `create()`-equivalent paths, not the injection
  seam.
- Pure function, no schema change, no I/O. Zero production callers today
  (caveat b applies to everything downstream: shape is provable, wiring is
  the risk and belongs to the PING lane).

## Acceptance criteria (the tests that must pass when built)

1. Permutation property: for a fixed nested payload, all key-order
   permutations produce byte-identical output.
2. Type distinction: `stableStringify(1) !== stableStringify("1")`,
   `stableStringify(null) !== stableStringify("null")`,
   `stableStringify([1]) !== stableStringify({0:1})`-style cases.
3. Non-finite throws: `NaN`, `Infinity`, `-Infinity` each throw.
4. Unserializable throws: `undefined`, functions, symbols each throw.
5. Hash shape: `missionIdentityKey({})` matches `/^[0-9a-f]{64}$/`.
6. Determinism: 1000 runs of the same payload, identical bytes.

## Explicitly out of scope

- Changing `create()` itself or the `ping_missions` DDL. Those are
  `/home/nolan/ping` writes and belong to the PING lane.
- Migrating existing keys. Old keys stay valid; the new canonical key
  applies to new missions (migration policy is a PING-lane decision).
