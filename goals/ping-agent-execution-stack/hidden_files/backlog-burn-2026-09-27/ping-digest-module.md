# PING shared digest implementation — backlog burn ledger

Date: 2026-09-27. Substrate defect: no single shared digest implementation
existed despite NORTH STAR BACKLOG_PING.md rule 16 requiring every lane to
"commit the exact digest algorithm/script with it, **or point at the shared
digest implementation**."

## Repo state (verified on arrival, Pig)

- Path: `/home/nolan/projects/ping`
- Branch: `fyd/sprint-integration-2026-09-24`
- HEAD: `a8ed5103c08a20c9d57d29c0a796b2568ff9f4fa` (matches triage)
- Tree: clean of tracked modifications (only pre-existing untracked files)
- Transport: `~/workspace/pig-fb/pigwsl-exec.sh` (stdin-fed SSH), read-only
  probes first. Write path worked; no forcing needed.

## Harvest notes

- Triage listed 10 `sha256Hex` definitions; at HEAD there are **11 local
  definitions + 1 exported** (`src/fyd/proceduralize/sha256.ts`). New since
  triage: `src/fyd/acquisition/live-loop.ts:206`.
- Of the 11: 9 are `node:crypto` one-liners (5 string-only, 4 string|Buffer),
  2 are hand-rolled pure-TS SHA-256 (`proceduralize/sha256.ts` — the designated
  harvest candidate; `sitespec/binding-verifier.ts:752` — browser-safe lane).
- The harvest candidate was adopted **verbatim** into the shared module
  (K-table, padding, compression) and extended to `string | Uint8Array`
  (Buffer is a Uint8Array; view-slice correctness verified in agreement test).
  Kept pure-TS / zero node imports so browser-safe lanes keep working.
- Canonicalization discovery: 5 files already imported `canonicalize` from
  `@/lib/ping/ask-composer`, which already pinned the label
  `sha256-canonical-json-v1`. The shared module adopts that formulation
  verbatim; `ask-composer.ts` now re-exports it.

## What was built

- NEW `src/lib/ping/digest.ts` (167 lines): `DIGEST_ALGORITHM`,
  `canonicalize`, `sha256Hex`, `digestCanonical`, `verify`. Pure functions,
  no I/O, no authority. Doc comment pins the full algorithm recipe (sorted
  keys, no whitespace, UTF-8, sha256) so any digest is reproducible from the
  record alone — the FL-20260920-031b lesson.
- NEW `src/lib/ping/__tests__/digest.test.ts` (131 lines): pinned known
  vectors (published SHA-256 vectors + node:crypto-generated pins),
  canonicalize edge semantics, `verify` accept/reject.
- Converged 11 local `sha256Hex` copies to import the shared module;
  `proceduralize/sha256.ts` is now a re-export (its 7 importers untouched);
  `ask-composer.ts` re-exports `canonicalize` (all ~13 consumers untouched)
  and its `proposalDigest` now uses the shared `sha256Hex`.

## Agreement test results (per file)

Harness: `/tmp/digest-agreement.ts` (Pig, run with tsx; extractions were
mechanical verbatim slices, asserted present in source). Vectors: 16 string
vectors incl. SHA-256 padding edges (55/56/57/63/64/65/119/120 bytes),
unicode, 100KB; 6 Buffer vectors incl. binary 0x00-0xFF, empty, and a
nonzero-byteOffset slice. Result: **150/150 checks pass, 0 mismatches**.

| File | Formulation | Verdict |
|---|---|---|
| onboarding/compile-tenant.ts:126 | node:crypto, string | CONVERGED |
| data/fyd-tenant-graph.ts:127 | node:crypto, string | CONVERGED |
| ask/context-compiler.ts:51 | node:crypto, string | CONVERGED |
| customize/server.ts:46 | node:crypto, string | CONVERGED |
| sitespec/public-projection.ts:132 | node:crypto, string | CONVERGED |
| media/authority-binding.ts:101 | node:crypto, Buffer\|string | CONVERGED |
| acquisition/static-adapter.ts:56 | node:crypto, string\|Buffer | CONVERGED |
| acquisition/arrow2-proof.ts:92 | node:crypto, string\|Buffer | CONVERGED |
| acquisition/live-loop.ts:206 | node:crypto, string\|Buffer | CONVERGED |
| sitespec/binding-verifier.ts:752 | hand-rolled pure-TS | CONVERGED (byte-identical) |
| proceduralize/sha256.ts:22 | hand-rolled pure-TS (exported) | CONVERGED (re-export) |
| lib/ping/ask-composer.ts:60 | canonicalize (pinned label owner) | CONVERGED (moved to digest.ts, re-exported) |

Zero divergent `sha256Hex` copies. No silent convergences.

## Canonicalization residuals (reported, NOT converged)

- `fyd/proceduralize/structured-data.ts` `canonicalJson` and
  `fyd/owner-mode/provenance.ts` `canonicalJson` (used by
  `customize/owner-proposal.ts`): equivalent to `sha256-canonical-json-v1`
  on all JSON-representable vectors, but **diverge on bigint**:
  shared yields `{"n":null}`, theirs **throw**
  `TypeError: Do not know how to serialize a BigInt`. Per the safety rule,
  left untouched and reported.
- `lib/ping/dev-signer.ts` `canonicalizeJson`: drops undefined-valued keys
  (shared emits `"key":null`). Residual.
- `fyd/builder/canonical.ts` `canonicalizeSpec`: strips volatile `*At`
  timestamp keys by design. Residual.
- `fyd/proceduralize/patch.ts` `canonicalize`: strips VOLATILE_KEYS
  (proposalDigest, createdAt, generatedAt, nonce) by design. Residual.
- `fyd/builder/source-refresh.ts` `canonicalOwnerLayer`,
  `fyd/sitespec/render-model.ts` `sortKeys`,
  `fyd/sitespec/binding-verifier.ts` `sortKeys`: `JSON.stringify` over
  sorted-key values — drops undefined keys (shared emits null). Residual.
- `fyd/customize/intent.ts` `canonicalizeIntent`: fixed-shape
  `JSON.stringify({kind, target})`, domain-specific. Residual.

## Out-of-scope items (untouched, as briefed)

- Tandem Python edge: `build-context-pack.py` uses sha1 for pack versions.
  Residual; changing it would alter live pack versions.
- `UnifiedEventRuntime.emit` event-ID formulation: triage described it as
  "sha256 over JSON.stringify of {eventType, source, [namespace],
  logical_id|payload}". **No `UnifiedEventRuntime` class and no such
  formulation exists anywhere in the repo tree at HEAD a8ed5103**
  (`src/lib/editor/event-system.ts` emit does not hash). It lives in the
  live gateway runtime — documented in the module doc comment, runtime
  unchanged.
- Other `createHash("sha256")` one-off sites (blob-storage, media-contracts,
  assignment-store, dataset-snapshots, lineage, identity/provider base64url,
  etc.): not `sha256Hex` copies; left alone.
- FL-20260920-031b stays OPEN in FAILURE_LEDGER.md (not my file to close);
  this module is the prevention mechanism, cited in its doc comment.

## Diff stat (working tree only — NO-COMMIT convention, nothing committed)

12 files changed, 20 insertions(+), 200 deletions(-), plus 2 new files:

- M `src/fyd/acquisition/{arrow2-proof,live-loop,static-adapter}.ts` (5 lines each)
- M `src/fyd/ask/context-compiler.ts`, `src/fyd/customize/server.ts`,
  `src/fyd/data/fyd-tenant-graph.ts`, `src/fyd/media/authority-binding.ts`,
  `src/fyd/onboarding/compile-tenant.ts`,
  `src/fyd/sitespec/public-projection.ts` (5 lines each)
- M `src/fyd/sitespec/binding-verifier.ts` (-91/+1: removed 80-line local impl)
- M `src/fyd/proceduralize/sha256.ts` (now a re-export)
- M `src/lib/ping/ask-composer.ts` (canonicalize re-export; proposalDigest via shared sha256Hex)
- ?? `src/lib/ping/digest.ts`, `src/lib/ping/__tests__/digest.test.ts`

## Test evidence

- Agreement harness: 150/150 pass, 0 fail (tsx, Pig).
- New `digest.test.ts`: 12/12 pass (pinned vectors).
- Relevant suites via ad-hoc ts-jest config (`/tmp/jest.ts.config.json`;
  repo's bare `npx jest` cannot parse TS at HEAD — pre-existing):
  10 suites / 136 tests pass, incl. patch, lane-a, ask-fyd,
  context-compiler, binding-verifier, verified-render-model,
  authority-binding, compile-tenant, hostile.
- 5 suites fail to *parse* under the ad-hoc config (CSS-module imports);
  verified identical failures on a pristine `a8ed5103` worktree — pre-existing,
  not regressions.
- `npx tsc --noEmit`: clean (one ES2017 BigInt-literal error in the new test
  was fixed via `BigInt(10)`).
- One mid-task bug caught by tests: ask-composer re-export initially broke
  internal `proposalDigest` (re-export is not a local binding); fixed with
  `import { canonicalize, sha256Hex } from "./digest"` + `export { canonicalize };`.

## Follow-ups for parent

- None blocking. Optional: point future lanes at `src/lib/ping/digest.ts`
  per NORTH STAR rule 16; consider converging `structured-data.ts` /
  `provenance.ts` `canonicalJson` only after a human decision on the bigint
  semantic (total function vs throw).
