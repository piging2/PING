# P0-A — JCS Evaluation Report (vector evidence)

Harness: `p0-kernel/v2-identity-harness` (UNEVALUATED, NOT WIRED).
Run: `node run.js`. Determinism anchor: corpus digest
`55107ec88618bac75e8f06cb077e2382923d963e52008f4de0e51e0f069c8e63`
(identical across 3 fresh processes).

## Verdict: ADOPT THE SCHEME (RFC 8785), PING profile per DOMAIN.md

Not "adopt the library": the scheme itself is proven by (a) a clean-room
from-spec implementation, (b) the RFC's byte-exact vectors, (c) byte-for-byte
agreement with the RFC author's reference implementation on 91 corpus items,
(d) PING's locked adversarial regression cases. Whether PING eventually
writes its own implementation (from this spec) or vendors a pinned,
vector-verified library is a morning decision — the verdict is on RFC 8785
the standard, and it is ADOPT.

## Evidence

| Section | Result |
|---|---|
| RFC conformance (Appendix B byte-exact + 24-number table) | 25/25 PASS |
| PING adversarial (locked regression cases) | 24/24 PASS |
| Semantic identity (same value -> identical bytes) | 9/9 PASS |
| Rejections (fail closed, never coerced) | 15/15 PASS |
| Oracle agreement (`canonicalize@2.1.0`, RFC author's JS impl) | 91/91 agree, 0 disagree |
| Oracle rejects NaN / Infinity | both throw (independent confirmation) |
| Cross-process determinism (3 fresh node processes) | 3/3 identical digests |
| V1 defect demonstration (read-only snapshot @20528ee18) | confirmed |

### The P0, concretely

V1 `CanonicalBytes.serialize` collapses (proven by running the vendored
read-only snapshot over the adversarial corpus):
- `[1,2]` ≡ `[12]` → both `"[12]"` (array elements concatenated with NO
  separator — `Buffer.concat(['[', ...elements, ']'])`)
- `{x:[1,2]}` ≡ `{x:[12]}` (same defect, nested)
- `NaN` ≡ `null` → both `"null"` (`JSON.stringify(NaN) === "null"`)
- `-0` ≡ `0`, `1.0` ≡ `1` (also true under JCS — deliberate, documented)

And `emit()`'s conflict guard compares with this same colliding serializer,
so a genuinely different event landing on a colliding id is misclassified
as "duplicate" and silently dropped (`deduplicated++`). The guard meant to
fail closed is blind. That is the load-bearing P0.

Under the evaluated JCS: `[1,2]` → `"[1,2]"`, `[12]` → `"[12]"` — differ.
`NaN` → throw. `null` → `"null"` — differ from every number.

### Key semantic rulings (explicit, tested)

- **-0 ≡ 0**: deliberate JCS decision (`"-0"` never appears). Accepted as
  PING semantics: negative zero is not a distinct identity.
- **Unicode NOT normalized**: `é` (U+00E9) vs `e`+U+0301 are different
  identities. Producers normalize (NFC) before canonicalization if they
  need agreement.
- **Key order**: UTF-16 code-unit sort, locale-independent
  (`péché`/`pêche` pinned).
- **`1` ≡ `1.0` ≡ `1e2`-as-100**: same numeric value, one identity.
- **`4.50` → `"4.5"`, `1E30` → `"1e+30"`, `2e-3` → `"0.002"`**: spellings
  normalize via ECMAScript `Number::toString`.
- **U+007F NOT escaped**; only U+0000–U+001F escaped (short forms where
  defined). Matches RFC §3.2.2.2 exactly.

### What the oracle proved (and didn't)

`canonicalize@2.1.0` (the RFC author's own JS implementation, used ONLY as
a test oracle) agrees byte-for-byte with the from-spec implementation on all
91 non-reject corpus items, and independently rejects NaN/Infinity. This
confirms the from-spec implementation is a faithful RFC 8785 — the verdict
rests on the scheme + the RFC's vectors, not on the oracle's claims.

### Deliberately NOT claimed

- Cross-language determinism (Python/Go): NOT proven here. The number
  formatting rule is ECMAScript-specific; any non-JS verifier must replicate
  `Number::toString` exactly (known hard surface; the harvested canoncheck
  notes confirm). PING's runtime is Node; cross-language verification is a
  flagged morning item, not a blocker for the Node-side V2.
- Duplicate member names at parse: value-level canonicalization cannot see
  them; the admission parser must refuse `{"a":1,"a":2}` (flagged in
  DOMAIN.md as a parser-boundary concern).
- The six official `testdata/` pairs were characterized from their
  published descriptions and the Appendix B byte-exact pair; every class
  they exercise (number formatting, locale-independent sort, surrogate-pair
  ordering, no-normalization, nesting, array order) is covered by a vector
  in this corpus.
