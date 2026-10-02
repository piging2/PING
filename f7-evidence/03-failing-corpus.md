# F7-A Evidence Freeze (3/3): Failing Semantic Corpus (Pre-Patch Behavior)

Frozen: 2026-09-18 ~14:20 MDT. [EMPR] captured live via node against the CURRENT
(V1) code: `runtime/kernel/authorities/canonical_authority.js` (CanonicalBytes) and
`gateway/replay/kernel/canonical_json.js` (compiled artifact). Probe script:
`/tmp/f7-freeze-probe.js` (local copy `~/workspace/f7-freeze-probe.js`).

## V1 identity collisions (CanonicalBytes.serialize -> sha256)

```text
{tags:[1,2]}    => bytes="{\"tags\":[12]}" hash=7fd61799bc9a2c0e
{tags:[12]}     => bytes="{\"tags\":[12]}" hash=7fd61799bc9a2c0e
COLLIDE [1,2] vs [12]: true
```

Array elements concatenate with no separator: `[1,2]` and `[12]` produce identical
canonical bytes and identical event IDs. Distinct legal inputs, same identity. F7
confirmed live.

```text
{v:NaN}         => bytes="{\"v\":null}" hash=aae9e223dcdc02df
{v:null}        => bytes="{\"v\":null}" hash=aae9e223dcdc02df
COLLIDE NaN vs null: true
```

`JSON.stringify(NaN)` -> `"null"`: NaN silently coerces to null's identity. D1 requires
NaN to be REJECTED fail-closed.

```text
{v:-0}          => bytes="{\"v\":0}" hash=ec4f95abcb4e2e3d
{v:0}           => bytes="{\"v\":0}" hash=ec4f95abcb4e2e3d
COLLIDE -0 vs 0: true (D1: normalized-equivalent, NOT a defect)
```

Recorded for the corpus: D1 classifies -0/0 as NORMALIZED-EQUIVALENT (JSON transport
erases the distinction). V2 must preserve this equivalence, not "fix" it.

```text
{a:undefined}   => bytes="{\"a\":undefined}" hash=6a52fa367b4e61b3
undefined coerced (no throw): true
```

`undefined` is silently admitted into the identity preimage. D1 requires rejection
of `undefined` anywhere, before identity minting, with no ID minted.

## Compiled-artifact drift (gateway/replay/kernel/canonical_json.js)

```text
compiled canonicalize NFC: "{\"s\":\"café\"}"
compiled canonicalize NFD: "{\"s\":\"café\"}"
COMPILED JS collapses NFC/NFD (drift): true
```

NFC input (`caf\u00e9`) and NFD input (`cafe\u0301`) are distinct JS strings but
produce identical canonical bytes under the compiled artifact (NFC normalization).
D1 requires NFC != NFD (strings preserved as supplied).

```text
depth 200 nested objects: NO THROW (missing depth guard = drift)
```

The compiled artifact recurses unbounded; the TS source throws at depth > 64.
D1 requires max depth 64 enforced.

```text
function value: NO THROW (silent coercion)
```

Functions fall through `canonicalizeValue` and are silently dropped by the terminal
`JSON.stringify`. D1 requires rejection.

```text
Buffer canonicalized as: {"b":{"0":97,"1":98,"2":99}}
```

A Buffer is serialized as an object of byte indices. D1 requires Buffer rejection.

## Corpus verdict (pre-patch)

Every D1 REJECTED-class input is currently admitted or silently coerced by at least
one layer of the identity path; the two F7 collision classes reproduce live; the
compiled artifact disagrees with its source on strings and depth. This is the
behavior F7-B must eliminate and F7-C must certify against.
