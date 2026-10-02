# Agent 03 proposed patch: canonical artifact_hash in replay envelope conversion

Target: `/home/nolan/ping/gateway/kernel_replay_execution_provider.js`
Status: PROPOSAL ONLY (live runtime). Not applied. No second replay authority created.

## WHY

The constitutional replay guarantee (Soul section 10; Replay Law) is that the same
causal history produces the same hash and witness. The live replay path converts
PING events into kernel CanonicalEventEnvelopes at
`kernel_replay_execution_provider.js` lines 78-80. When an event carries no
`canonical_hash`, the fallback computes:

```js
this._computeHash(JSON.stringify(event.payload || {}))
```

`JSON.stringify` serializes object keys in insertion order. Two semantically
identical payloads constructed with different key order therefore produce
different `artifact_hash` values, different envelopes, and ultimately different
replay fingerprints and witness roots, even though the causal history is the
same. This is a nondeterministic input at the replay boundary: replay output
depends on how the caller happened to build the payload object, not on what the
payload means.

The kernel's own `DeterministicReplayEngine` canonicalizes the event stream with
its hash authority (RFC-8785 style, `deterministic_replay_engine.ts:57-61`), but
`artifact_hash` is fixed earlier, at the boundary, outside that canonicalization.

## EVIDENCE

- File: `/home/nolan/ping/gateway/kernel_replay_execution_provider.js`, lines 78-80
  (md5-identical copy confirmed inside the running `ping-gateway` image,
  `ping-gateway:devin-boundary2`, via `docker run --rm --entrypoint grep`):
  ```js
  const artifactHash = event.canonical_hash || event.metadata?.canonical_hash
    || this._computeHash(JSON.stringify(event.payload || {}));
  ```
- The `_computeHash` algorithm is order-sensitive string hashing (murmur-style,
  lines 223-237); any change in the serialized string changes the hash.
- Regression proof: `regression-test.js` in this directory extracts the verbatim
  `_computeHash` from the real file and shows payloads `{name,price,tags}` vs
  `{tags,price,name}` hash to `df5ea64574372` vs `14c9d7c3ac027`. Same content,
  different hashes.
- Scope note: the engine itself is timestamp-agnostic (no `timestamp` reference
  in `deterministic_replay_engine.ts`), so the fabricated default timestamp at
  krep.js:86 does not enter the fingerprint. This proposal targets only the
  artifact_hash input.

## MINIMUM CHANGE

Two edits, no new authority, no interface change:

1. Add a `_stableStringify(value)` method: recursive sorted-keys JSON
   serialization (objects sorted, arrays preserved, primitives via
   `JSON.stringify`). Mirrors the canonicalization spirit of the kernel hash
   authority at the boundary where `artifact_hash` is fixed.
2. Line 80 becomes:
   ```js
   || this._computeHash(this._stableStringify(event.payload || {}));
   ```

Behavior is unchanged when `canonical_hash` or `metadata.canonical_hash` is
present; when the payload fallback is used, hashes are now key-order invariant.
Distinct payloads still hash distinctly (verified by test).

Diff: `kernel_replay_execution_provider.js.patch` (unified diff, 37 lines).
Patched reference copy: `kernel_replay_execution_provider.js.patched`.
Unmodified reference copy: `kernel_replay_execution_provider.js.orig`.

## TEST

`regression-test.js` (run: `node regression-test.js`, exit 0 = pass):

1. Confirms the buggy line exists verbatim in the current source (evidence gate).
2. Extracts the verbatim `_computeHash` from the real file and reproduces the
   divergence: identical payloads, different key order, different hashes.
3. Extracts the proposed `_stableStringify` from the patched copy and verifies
   the four test payloads (shallow reorder, nested reorder) now hash
   identically, while genuinely distinct payloads (`{a:1}` vs `{a:2}`) still
   differ.
4. Syntax-checks the patched file with `node --check`.

## RESULT

- Bug reproduced on current code: YES (hash divergence proven).
- Fix verified: YES (key order invariant; distinct payloads distinct; syntax OK).
- Applied to `/home/nolan/ping`: NO, proposal only per patch-target rule.
- Applied to `/home/nolan/projects/ping-constitutional`: N/A (no unambiguous
  adapter correction found; no patch applied there either).
- No second canonical replay authority created; the change is internal to the
  existing `KernelReplayExecutionProvider` boundary conversion.
