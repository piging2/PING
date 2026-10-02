# VENDORED DEPENDENCY

- Package: `canonical-json`
- Version: `0.4.0` (pinned; npm dist-tag `latest` at evaluation time 2026-10-01)
- Registry tarball SHA256: `78354040a4e781b000f45a6ec7c4e9040d8393e18a67908bba429a497dc8c34d`
- License: MIT (package.json `license` field; LICENSE file vendored alongside)
- Author: Mirko Kiefer <mail@mirkokiefer.com>
- Repository: https://github.com/mirkokiefer/canonical-json
- Engines: node >= 14. Type: ESM (`"type": "module"`).
- Files vendored: index.js, index.d.ts, stringify.js, stringify-copy.js,
  canonical-json.js, walk.js, hash.js, hash.d.ts, README.md, LICENSE, package.json

## Evaluation verdict: ADAPT (not pure adopt)

Empirically verified 2026-10-01 (node v24.20.0):

- PASS: number rendering matches RFC 8785 Appendix B sample table 9/9
  (`1e+21`, `1e+23`, `5e-324`, `1.7976931348623157e+308`, `9007199254740992`,
  `0.30000000000000004`, `-0` -> `"0"`). V8's `String(number)` is the RFC's
  reference algorithm.
- PASS: object keys sorted in UTF-16 code-unit order, recursively; no
  whitespace; array order/boundaries preserved; string escaping matches
  RFC 8785 S3.2.2.2 (`\b \t \n \f \r`, `\"`, `\\`, `\u00xx` for other
  controls, everything else as-is).
- FAIL (spec non-conformance): non-finite numbers serialize as `null`
  instead of terminating with an error (RFC 8785 S3.2.2.3: "occurrences of
  NaN or Infinity MUST cause a compliant JCS implementation to terminate
  with an appropriate error").
- FAIL (spec non-conformance): lone surrogates in strings pass through
  instead of terminating (RFC 8785 S3.2.2.2 MUST terminate).
- NOTE: `toJSON` is honored by the library. The PING domain rejects
  behavioral values before the library ever sees them.

Adaptation: the library is used ONLY as the byte-layout engine, behind
`v2/domain-validator.js`, which enforces the RFC's MUST-terminate rules
and the PING canonical value domain (DOMAIN.md) BEFORE hashing. The
validator is the conformance boundary; the library is the renderer.

## Why not the in-repo `runtime/kernel/replay/canonical_json.ts`

It claims RFC 8785 but is non-conformant: its `canonicalizeNumber` is a
no-op for exponent-form numbers (relies on `JSON.stringify`, which happens
to match the RFC for numbers but is asserted nowhere and tested nowhere),
it has no non-finite rejection test, and it is TypeScript in a JS runtime
path with no build step. Harvest decision: do not wire it; the vendored
library plus the strict validator is smaller, tested, and pinned.
