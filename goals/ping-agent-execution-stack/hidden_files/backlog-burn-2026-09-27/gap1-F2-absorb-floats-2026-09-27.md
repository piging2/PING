# Gap-1 F2 ledger: absorb/canonical.ts finite-float rule (2026-09-27)

## Branch + worktree

- Branch: `fix/gap1-f2-absorb-floats` (local only, NEVER pushed)
- Worktree: `~/worktrees/gap1-F2-absorb-floats` (dedicated; base
  `mc/sprint-integration-2026-09-27`, shared checkout untouched)
- Commit: see `git -C ~/worktrees/gap1-F2-absorb-floats log --oneline -1`
- Conformance runner report: `/tmp/gap1-F2-conformance-report.json`
  (ephemeral; absorb rows reproduced below)

Context: the conformance harness + absorb live in `~/workspace` as
UNTRACKED files (absorb belongs to a sibling stream; never touched the
shared checkout). For an isolated, committable run, the harness was
extracted from branch `substrate/gap1-canonical-conformance` into the
worktree, and `absorb/` was copied read-only into the worktree before
editing. `dump.py` in the shared tree is byte-identical to the
gap3-blob the Gap-1 item validated (`git show
e84764e:fyd-lane/dump.py` diff: none); `journal_identity.py` was
extracted from that same commit into the worktree so the runner's
dump.py adapter could import.

## Caller audit (read-only, F2 prerequisite)

Every caller of `canonicalize` / `canonicalBytes` from
`fyd-lane/absorb/src/canonical.ts`:

1. `fyd-lane/absorb/src/transition-id.ts` — `canonicalBytes()` on
   `{stage, object_id, owner_id, logical_payload, generator_version}`.
   `logicalPayload` is typed `unknown`, but every current producer
   passes strings/integers only (tests `c1.test.ts`: `field/op/target`
   strings, `{a: 1, b: 2}` ints). **No floats, fractional or otherwise.**
2. `fyd-lane/absorb/test/canonical.test.ts` — strings, integers,
   undefined only.
3. `fyd-lane/absorb/test/c1.test.ts` — via `fydTransitionId`; string /
   integer payloads only.
4. `fyd-lane/canonical-conformance/driver-ts.mjs` — harness adapter
   (test tooling).
5. `fyd-lane/absorb/src/binding-verifier.ts` — **NOT a caller.**
   Its `canonicalBytes` is a string field/parameter name; it never
   imports `canonical.ts`. Verified by reading the file.

No caller anywhere in `fyd-lane` passes fractional floats (or any
non-integer numbers) through this module. Verified by reading all four
call sites and grepping absorb src/test for fractional literals (none).

Downstream note (out of scope): `<repo>/src/fyd/data/canonical.ts` is a
ported copy in the FYD product lane (`fyd-product-lane/`) from the H0
lane; that tree is frozen for the 19:00 adjudication, so it was not
touched. If the product lane wants float refusal, that is a separate
follow-up.

## Decided rule + justification

**Rule (implements the pinned FLOATS_REFUSED semantic):**
`typeof value === 'number' && !Number.isInteger(value)` throws;
everything else unchanged.

- `Number.isInteger` is false for finite fractional floats AND for
  NaN/+-Infinity, so one check covers all five fixture throw-cases
  (float-finite, float-nested, float-nan, float-inf, float-neginf).
- Integers keep serializing byte-identically (all 6 byte-case fixtures
  use integers only), so **no caller breaks**: the audit found zero
  callers passing fractional floats, and JS cannot distinguish
  int-valued floats (1.0 === 1), so there is nothing narrower to
  carve out. **No silent carve-out was made; the pin is implemented as
  stated, narrowed only by JS's representational limit.**
- Error message: `canonicalize: float values are refused; they cannot
  serialize deterministically (pinned FLOATS_REFUSED)` (was
  "non-finite number ...").
- Delta: 2 files, `absorb/src/canonical.ts` (rule + header docs) and
  `absorb/test/canonical.test.ts` (extended the existing fail-closed
  test: +4 throw assertions for finite/nested floats and NaN, Infinity
  message regex updated, +1 integer passthrough assertion; test count
  unchanged at 6).

## Evidence

**Conformance runner** (worktree,
`fyd-lane/canonical-conformance`, fixture unchanged):

- `[live] absorb/canonical.ts` -> **CONFORMANT**, 11/11 applicable
  cases PASS:
  - key-order-basic, nested-arrays-preserved, unicode-bmp,
    empty-structures, undefined-to-null, astral-key-order: BYTES_MATCH
  - float-finite, float-nested, float-nan, float-inf, float-neginf:
    REFUSED_AS_PINNED
- Before this fix the same runner reported absorb 9/11 with 2
  FLOAT_ACCEPTED failures; those are gone.
- Global runner verdict stays NON_CONFORMANT (exit 1, 37 failing
  case-runs) because of the other items' divergences, all out of F2
  scope: F1 `lane-e/proof.py` float acceptance + astral sort, F3
  `dump.py` astral sort, F4 `hash-authority.ts` float acceptance,
  and the frozen historical impls (flagged, not fixed). No new
  failures were introduced.

**Absorb's own suite** (worktree, `npx tsx --test`):

- `test/canonical.test.ts`: **6/6 pass**
- Full suite `test/*.test.ts`: **41/41 pass**, 7 suites, 0 fail —
  no regressions in transition-id (C1), binding-verifier (C3), or C4.

## Verdict

**F2 VERIFIED** — Evidence: absorb/canonical.ts is CONFORMANT on all
11 conformance cases (5/5 float throw-cases REFUSED_AS_PINNED, 6/6
byte-cases BYTES_MATCH) and absorb's own suite passes 41/41 including
the updated 6/6 canonical tests, with the caller audit showing zero
callers passing fractional floats today. Commit is local-only on
`fix/gap1-f2-absorb-floats`; nothing pushed, no HPP original contact,
no credentials, no broad process kills, no Pig writes.
