# VENDORED DEPENDENCY

- Package: `canonicalize`
- Version: `2.1.0` (pinned)
- Source: `/home/nolan/projects/ping/node_modules/canonicalize`
  (already a dependency of the FYD app)
- Transfer tarball SHA256: `4a0cf830e592fc6319137634ab4dd17dd7faabecd6bc4170176fd2a0d350cb1d`
- License: **Apache-2.0** (package.json `license` field; LICENSE file
  vendored alongside). Vendoring into /home/nolan/ping is permitted.
  [Open item WS2-(a): CLOSED by this check.]
- Author: B. Erdtman (the RFC 8785 author; repository
  https://github.com/erdtman/canonicalize)
- Implementation: 40 lines, zero dependencies, CommonJS
  (`lib/canonicalize.js`; also ships `canonicalize.d.ts`, tests, and
  JSON test vectors under `test/testdata/`)

## Evaluation verdict: ADAPT (not pure adopt)

Empirically verified 2026-10-01 (node v24.20.0 and v22.23.2):

- PASS: `[1,2]` -> `[1,2]`, `[12]` -> `[12]` (distinct); key order
  normalized; `[1,2]` vs `[12]` mint distinct event IDs.
- PASS: NaN throws `NaN is not allowed`; ±Infinity throws
  `Infinity is not allowed` (RFC 8785 S3.2.2.3 conformant — fail closed).
- PASS: `-0` -> `"0"` (RFC Appendix B).
- PASS: keys sorted in UTF-16 code-unit order, recursively, built by
  direct string concatenation from the sorted key list — NO intermediate
  object, so NO integer-key enumeration defect (this library does not have
  the bug found in canonical-json@0.4.0's default path).
- PASS: number rendering matches RFC 8785 Appendix B sample table 9/9.
- PASS: the package's own test vectors (`test/testdata/{values,structures,
  arrays,weird,french}.json`) reproduce byte-identically through the PING
  validator (P-29).
- DEVIATION (documented, handled): undefined-valued object keys are DROPPED
  and undefined array elements become `null` (JSON semantics), silently.
  The PING domain REQUIRES fail-closed rejection (WS2 §1a proves the drop
  is a silent-dedup vector), so the strict domain validator runs FIRST and
  rejects `undefined` with `DOMAIN_UNDEFINED` before the library ever sees
  it (P-12, P-14, LOCK-18).
- DEVIATION (documented, handled): lone surrogates pass through (RFC
  S3.2.2.2 MUST terminate). Rejected by the validator (`DOMAIN_LONE_SURROGATE`).
- DEVIATION (documented, handled): `toJSON` is honored
  (`object.toJSON instanceof Function`). Rejected by the validator
  (`DOMAIN_BEHAVIORAL`).
- DEVIATION (documented, handled): circular input recurses to a stack
  overflow (not a typed error). Rejected by the validator (`DOMAIN_CIRCULAR`).
  No explicit depth cap in the library; the validator enforces 64.

Adaptation: the library is used ONLY as the byte-layout engine, behind
`v2/domain-validator.cjs`, which enforces the RFC's MUST-terminate rules
and the PING canonical value domain (DOMAIN.md) BEFORE hashing. The
validator is the conformance boundary; the library is the renderer.
Constitutional rule-of-one: this is the SINGLE canonical JSON engine;
the in-repo `runtime/kernel/replay/canonical_json.ts` (non-conformant,
unwired) and the earlier `canonical-json@0.4.0` evaluation are NOT adopted.

## Why canonicalize@2.1.0 over canonical-json@0.4.0

`canonical-json@0.4.0` was evaluated first (MIT) and REJECTED as the
engine: its default export path (`stringify-copy.js`) re-inserts sorted
keys into a fresh JS object, violating RFC 8785 S3.2.3 for integer-like
keys (proven by the RFC's own sort vectors). `canonicalize@2.1.0`
builds output by direct string concatenation from the sorted key list,
has no such path, is fail-closed on non-finite by default, and is the
RFC author's own implementation — and WS2 independently verified it on
the Pig. Convergence on one engine is the correct call.
