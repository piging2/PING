# P0-A V2 Identity Evaluation Harness

**UNEVALUATED. NOT WIRED INTO ANY PRODUCTION PATH. DO NOT IMPORT.**

Purpose: evaluate RFC 8785 (JCS) as the V2 canonicalization for PING event
identity, per `~/workspace/directives/2026-10-01-p0-kernel-first.md` (P0-A)
and `~/workspace/directives/2026-10-01-p0a-serializer-overnight.md`.
No production cutover, no history rewrite, no changes to the live serializer
were made by this harness.

## Files

- `jcs-from-spec.js` — clean-room RFC 8785 implementation written from the
  RFC's rules (evaluation only).
- `vectors.js` — locked vector corpus: RFC conformance vectors (Appendix B
  byte-exact + number table), PING adversarial regression cases, semantic
  identity cases, rejection cases.
- `run.js` — the proof runner. Also runs the CURRENT production serializer
  (vendored read-only snapshot) over the adversarial corpus to demonstrate
  the V1 defects.
- `v1-snapshot-canonical_authority.js` — READ-ONLY byte copy of
  `/home/nolan/ping/runtime/kernel/authorities/canonical_authority.js`
  @ `20528ee18` (536 lines, verified identical). Defect demonstration only.
  Not a fork; never imported by production.
- `DOMAIN.md` — the canonical value domain (what is permitted/rejected).
- `DESIGN.md` — V1-reader/V2-writer/era design + migration compatibility.
- `EVAL-REPORT.md` — verdict + vector evidence.

## Run

```
node run.js            # human summary + corpus digest
node run.js --json     # full machine-readable report
```

Cross-process determinism: run three times in fresh processes; the
`Corpus digest` line must be identical.

The oracle (`canonicalize` npm, RFC author's JS implementation) is resolved
from `/tmp/node_modules` when present; without it, RFC vectors remain the
conformance proof.

## Current results

79/79 pass. Corpus digest
`55107ec88618bac75e8f06cb077e2382923d963e52008f4de0e51e0f069c8e63`
(3/3 processes identical). Verdict: **ADOPT RFC 8785** (the scheme), PING
profile per `DOMAIN.md`. See `EVAL-REPORT.md`.
