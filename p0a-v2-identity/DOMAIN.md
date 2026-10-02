# P0-A CANONICAL VALUE DOMAIN (2026-10-01, overnight P0-A owner)

The domain is decided BEFORE the serializer. Everything an event identity may
contain, and what is rejected before any byte is hashed.

## PERMITTED VALUES (the JSON value domain)

- `null`
- `boolean`
- `string`: Unicode scalar values, preserved AS-IS. NO Unicode normalization
  (RFC 8785 Section 3.1: "all components ... MUST preserve Unicode string
  data 'as-is'"). Two strings that differ only by normalization form are
  DIFFERENT values and MUST produce different canonical bytes.
- `number`: IEEE 754 double-precision, FINITE only. Rendered per ECMAScript
  `String(number)` (RFC 8785 Section 3.2.2.3 + Appendix B; verified 9/9
  against the RFC's own sample table with the adopted engine).
- `array`: element ORDER is significant; element BOUNDARIES are significant.
  `[1,2]` and `[12]` are different values, full stop.
- `object`: plain objects only (prototype is `Object.prototype` or `null`),
  string keys, no duplicate names. Key order is NOT significant (sorted at
  canonicalization, UTF-16 code-unit order per RFC 8785 Section 3.2.3).

## EXPLICIT RULINGS (tested, not assumed)

| Value | Ruling | Reason |
|---|---|---|
| `-0` | NORMALIZED to `0`; `-0` and `0` produce IDENTICAL bytes BY SPEC | RFC 8785 Appendix B: `8000000000000000` -> `0`. ECMAScript `String(-0)` is `"0"`. Stated, not hidden. |
| `1.0` | IDENTICAL to `1` | Same IEEE 754 double. Not a defect. |
| `NaN` | REJECTED (`DOMAIN_NON_FINITE_NUMBER`) | RFC 8785 S3.2.2.3: "occurrences of NaN or Infinity MUST cause a compliant JCS implementation to terminate with an appropriate error." The old path mapped NaN->null silently: that was silent semantic collapse. |
| `+Infinity`, `-Infinity` | REJECTED (`DOMAIN_NON_FINITE_NUMBER`) | Same as NaN. |
| `undefined` (value or object property) | REJECTED (`DOMAIN_UNDEFINED`) | `JSON.stringify` drops undefined-valued keys and maps array elements to null: ambiguous, era-dependent, silent. Canonical events must not contain it. |
| `BigInt` | REJECTED (`DOMAIN_BIGINT`) | RFC 8785 Appendix D RECOMMENDS string encoding for extended precision. No silent coercion; the producer must encode explicitly. |
| `Date` | REJECTED (`DOMAIN_NON_PLAIN_OBJECT`) | No implicit `toJSON`. Producer must encode as an explicit ISO-8601 string. |
| `Buffer` / `Uint8Array` / binary | REJECTED (`DOMAIN_BINARY`) | No implicit base64. Producer must encode explicitly. |
| `Map`, `Set`, class instances | REJECTED (`DOMAIN_NON_PLAIN_OBJECT`) | Not JSON values. |
| `function`, `symbol` | REJECTED (`DOMAIN_NON_DATA`) | Not JSON values. |
| Object with callable `toJSON` | REJECTED (`DOMAIN_BEHAVIORAL`) | `toJSON` is behavior, not data. Honoring it lets a value smuggle arbitrary bytes into canonicalization. |
| Circular structure | REJECTED (`DOMAIN_CIRCULAR`) | Unserializable. |
| Nesting depth > 64 | REJECTED (`DOMAIN_DEPTH_EXCEEDED`) | Matches the existing replay canonicalizer's constitutional limit; bounds recursion. |
| Lone surrogates in strings | REJECTED (`DOMAIN_LONE_SURROGATE`) | RFC 8785 S3.2.2.2: "occurrences of such data MUST cause a compliant JCS implementation to terminate with an appropriate error." |
| Integers beyond 2^53 | PERMITTED as doubles, rendered per ECMAScript (deterministic; e.g. `9007199254740992` -> `"9007199254740992"`), with ADVISORY: producers SHOULD use strings per RFC 8785 Appendix D | Deterministic either way; rejection would break legitimate payloads. |
| Duplicate object keys | N/A | Impossible in JS objects and in parsed JSON per I-JSON. |
| `null` vs any number | ALWAYS DISTINGUISHED | `null` is a literal; no numeric value may canonicalize to it. |

## NON-GOALS

The domain does NOT attempt to canonicalize behavior, binary, or
higher-precision numerics. Rejection is a feature: an event that cannot be
represented unambiguously must fail at the boundary with a typed error, never
be silently coerced into a different value.
