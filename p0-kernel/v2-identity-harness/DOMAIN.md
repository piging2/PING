# P0-A — Canonical Value Domain (PING event identity)

Status: PROPOSED (evaluation only; no production wiring). Decided 2026-10-01
overnight; needs Nolan's word before any write-path change.

## Rule

**Reject unsupported values BEFORE hashing. Do not invent encodings for
values the canonical schema should prohibit.** A value with no canonical
form is a fail-closed admission error, never a silent coercion.

## Permitted (have exactly one canonical form under RFC 8785)

| Value | Canonical treatment |
|---|---|
| `null` | `null` |
| `boolean` | `true` / `false` |
| `number` (finite) | ECMAScript `Number::toString` |
| `string` (valid Unicode, no lone surrogates) | RFC 8785 §3.2.2.2 escaping, UTF-8 |
| `array` of permitted | order preserved, `,`-separated, brackets explicit |
| plain `object` (string keys) of permitted | keys sorted by UTF-16 code units, recursive |

## Explicit decisions (overnight directive §1: "explicitly decide/test")

| Value | Decision | Rationale |
|---|---|---|
| `-0` | PERMITTED, identical to `0` (`"-0"` never appears; both hash as `"0"`) | RFC 8785 §3.2.2.3 explicit. This is a **deliberate** collapse, not a defect: -0 and 0 are the same IEEE-754 value class for identity purposes. Proven by vector `zero-vs-negzero`. |
| `NaN` | REJECTED (throw before hashing) | V1 coerced NaN→`null` (silent semantic change). Non-finite has no JSON form. |
| `+Infinity` / `-Infinity` | REJECTED (throw before hashing) | Same as NaN. |
| `undefined` | REJECTED | Not a JSON value; V1 serialized it as the 9 bytes `undefined` (worse: outside JSON entirely). |
| `BigInt` | REJECTED | Exceeds double precision; producers needing exact big integers MUST use strings. |
| Integers beyond 2^53 | PERMITTED with documented precision loss at parse | JS parses them to the nearest double before canonicalization ever sees them. Producers needing exactness MUST use strings. (Same guidance as the harvested canoncheck numeric policy.) |
| `Date` | REJECTED | Ambient object state must not be silently blessed. Producers MUST pass ISO-8601 strings. |
| `Buffer` / bytes | REJECTED | No canonical JSON form. Producers MUST pass hex/base64 strings. |
| `Map` / `Set` / class instances | REJECTED (non-plain objects) | Only objects with `Object.prototype` (or null) prototype are canonicalized. |
| `function` / `symbol` | REJECTED | Not JSON values. |
| Lone surrogates (in strings or keys) | REJECTED (throw) | RFC 8785 §3.2.2.2: such data breaks signatures. V1 passed them through silently. |
| Nesting deeper than 64 | REJECTED (throw) | Fail closed on hostile depth instead of stack overflow. |
| Duplicate member names | REJECTED at parse | Cannot exist in a parsed JS object; the admission parser (raw-text level) MUST refuse `{"a":1,"a":2}` including escaped spellings (`"a"` vs `"\u0061"`). Value-level canonicalization cannot detect this — documented boundary. |
| Unicode normalization | NOT performed | Composed `é` (U+00E9) and decomposed `e`+U+0301 are DIFFERENT identities (proven by vectors). Producers that need them to agree MUST normalize (NFC) before canonicalization. This is explicit, not an oversight. |
| Key ordering | UTF-16 code-unit sort, locale-independent | Proven by `key-sort-locale` (péché/pêche). `Object.keys().sort()` in V8 is exactly this. |

## What this fixes vs V1

V1 (`CanonicalBytes.serialize`) violated the domain in three ways:
1. **Array boundaries erased**: elements concatenated with no separator —
   `[1,2]` ≡ `[12]` (proven by execution; harness vector `array-boundary-1`).
2. **Non-finite coerced**: `NaN` → `"null"` via `JSON.stringify` (silent
   semantic change; harness vector `v1-nan-collapses-onto-null`).
3. **`undefined` serialized**: the 9 bytes `undefined` — not JSON at all.

V1 key sorting was correct (UTF-16 order); that part is preserved.
