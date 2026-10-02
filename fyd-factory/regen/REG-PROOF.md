# LANE-REG Regeneration Proof

**Invariant under test:** an owner correction survives regeneration. Facts are re-extracted from source on every refresh; assertions are append-only records replayed over the fresh facts, so a source refresh preserves owner intent by construction.

**Result: PROVEN.** Every assertion below passed. No em dashes in this file by rule.

## Inputs

- Fixture: `~/workspace/fyd-factory/corpus/fixtures/clearwater-plumbing-demo.json`
  - sha256: `1bef189ee1376d2c45d1cb3de2b36fdb89961d09f42e30ae1231dbf775a978b6`
  - 25 objects, 24 relationships, all public, all relationships `active`.
  - The conflicting Saturday hours are preserved, not resolved:
    - `cw-biz-01` hours (website): `Mon-Fri 7:00 AM - 6:00 PM; Sat 8:00 AM - 12:00 PM; Emergency service 24/7`
    - `cw-ext-gbp-01` hours (Google Business Profile): `Mon-Fri 7:00 AM - 6:00 PM; Sat 8:00 AM - 2:00 PM; Emergency service 24/7`
- Machinery on the Pig (`/home/nolan/projects/ping`, branch `fyd-factory`):
  - `src/fyd/owner-mode/corrections.ts` (CONFIRM | CORRECT | HIDE assertions, append-only, replay)
  - `src/fyd/owner-mode/facts.ts` (`extractSiteFacts`)
  - `src/fyd/owner-mode/provenance.ts` (`demoProvenance`, `canonicalJson`)
  - `src/fyd/proceduralize/generator.ts` (`generateSiteSpec`, pure and deterministic)
- Digest method: `sha256(canonicalJson(spec))`, where `canonicalJson` is the lane's deterministic key-sorted JSON. The generator's only non-graph input, `generatedAt`, is pinned, so the digest is a pure function of the graph.

## Pinned clocks (no real time anywhere)

| Clock | Value | Role |
|---|---|---|
| `generatedAt` | `2026-09-24T00:30:00.000Z` | pinned generator input, both generations |
| `T_FACT_1` | `2026-09-23T19:30:00.000Z` | first extraction |
| `T_FACT_2` | `2026-09-23T20:00:00.000Z` | simulated source refresh extraction |
| `TA1` | `2026-09-23T20:05:00.000Z` | first correction (later superseded) |
| `TA2` | `2026-09-23T20:12:00.000Z` | refined correction (chain head) |
| `TA3` | `2026-09-23T20:15:00.000Z` | confirm + hide |

## Procedure and recorded values

**Step 1: generate a SiteSpec from the fixture; record the digest.**
- `generateSiteSpec(graph, { generatedAt: PIN })` on 25 objects / 24 relationships.
- 96 facts extracted. `ownerObjectId` resolved to `cw-biz-01`.
- **digest1 = `bb2aed0356cd60b578e2f7148543bcba76266e424ac62b1f0e28d33a5d091866`**

**Step 2: record owner corrections through the corrections machinery.**
Append-only journal of 4 assertions (ids deterministic under the pinned clocks):

| # | id | op | target | value / notes |
|---|---|---|---|---|
| A1 | `oa-a9216cbfcb8322db` | CORRECT | `cw-biz-01 : hours` | `Mon-Fri 7:00 AM - 6:00 PM; Sat 8:00 AM - 1:00 PM; Emergency service 24/7`; `sourceValueSeen` = the website value above; superseded by A2 |
| A2 | `oa-31b026f3ff094fc7` | CORRECT | `cw-biz-01 : hours` | `Mon-Fri 7:00 AM - 6:00 PM; Sat 8:00 AM - 12:30 PM; Emergency service 24/7`; `provenance.supersedes` = A1's id; chain head |
| A3 | `oa-7e443ccf44fe5d2f` | CONFIRM | `cw-biz-01 : phone` | `sourceValueSeen` = `(970) 555-0142` |
| A4 | `oa-a56d891cef31fd32` | HIDE | `cw-ext-gbp-01 : hours` | the stale directory-sourced copy of the conflicting hours |

Determinism check: drafting A2 twice with the same pinned clock yields the same id.

**Step 3: regenerate the SiteSpec from the same fixture (source refresh).**
- Fresh extraction at `T_FACT_2`; fresh `generateSiteSpec` call with the same pinned `generatedAt`.
- **digest2 = `bb2aed0356cd60b578e2f7148543bcba76266e424ac62b1f0e28d33a5d091866`**
- digest2 equals digest1: the source refresh is byte-identical when the source data is unchanged.

**Step 4: replay the journal over the regenerated facts (`applyCorrections(facts2, journal)`).**
- Projected `cw-biz-01 : hours` value = A2's value (`Sat 8:00 AM - 12:30 PM`).
- `conflicts` = [], `orphaned` = [].
- `applied` = A2, A3, A4 (A1 retained in the journal, not applied).
- `hiddenFactIds` = [`fact-cw-ext-gbp-01-hours`] (the GBP hours fact only).

**Step 5: determinism control.**
Two fresh generations with no corrections, same pinned input, are byte-identical (`canonicalJson` equal) and their digest equals digest1. Two fact extractions at the same pinned clock are deep-equal.

## Assertion verdicts

| # | Assertion | Verdict | Evidence |
|---|---|---|---|
| 1 | Step 1 generation succeeds; digest recorded | PASS | digest1 `bb2aed03...91866`, 96 facts, `ownerObjectId=cw-biz-01` |
| 2 | Corrections recorded as an append-only journal with a supersession link | PASS | 4 assertions; A2.supersedes = A1 id; A1 retained, not edited or deleted; re-draft of A2 reproduces its id |
| 3 | Regenerated SiteSpec digest matches the original | PASS | digest2 `bb2aed03...91866` == digest1 |
| 4 | The correction still holds after regeneration | PASS | projected `cw-biz-01 : hours` = `Mon-Fri 7:00 AM - 6:00 PM; Sat 8:00 AM - 12:30 PM; Emergency service 24/7` |
| 5 | No uncorrected fact changed unexpectedly | PASS | all 96 `(factId, value, kind)` pairs identical across the refresh; in the projection the only value edit is the hours fact; the HIDE target's value is untouched; the CONFIRM target's value is untouched (only the `ownerConfirmation` stamp added) |
| 6 | The supersession chain is intact | PASS | A1 in journal but not in `applied`; A2 in `applied`; projected value is A2's value, not A1's |
| 7 | Replay accounting is clean | PASS | 0 conflicts, 0 orphaned assertions; `hiddenFactIds` holds exactly the GBP hours fact |
| 8 | Determinism control: two fresh generations without corrections are byte-identical | PASS | `canonicalJson` equal; digest equals digest1 |
| 9 | Zero modifications to shared files | PASS | `git status`: all `M` entries are pre-existing other-lane work; the lane's additions are two new files under `src/fyd/owner-mode/__tests__/` only |

## Reproduction

On the Pig, `/home/nolan/projects/ping`, branch `fyd-factory`:

```
npx jest --config src/fyd/owner-mode/jest.config.cjs regen-proof
```

10/10 proof tests pass; the full owner-mode suite is 34/34 green. New files (lane-contained, nothing else modified):

- `src/fyd/owner-mode/__tests__/regen-proof.test.ts`
- `src/fyd/owner-mode/__tests__/clearwater-plumbing-demo.json` (sha256 `1bef189e...a978b6`, identical to the corpus fixture)

## Caveats

- The "source refresh" in this proof regenerates from the same fixture bytes with a new extraction clock. A real refresh with changed source bytes is covered by the conflict algebra (not exercised here): a changed asserted field would surface a `CorrectionConflict`, never a silent win.
- `demoProvenance` marks the owner as "demo-owner (seeded, unverified)"; the proof covers the assertion mechanics, not identity verification.
