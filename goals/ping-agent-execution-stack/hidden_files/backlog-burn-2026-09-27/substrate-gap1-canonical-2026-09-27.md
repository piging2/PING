# Substrate Gap 1 ledger: canonical-bytes conformance (2026-09-27)

## Branch + commit

- Branch: `substrate/gap1-canonical-conformance` (local only, never push)
- Harness commit: `0e4c543` ("substrate Gap 1: canonical-bytes cross-language
  conformance fixture + runner")
- This ledger: committed on the same branch (see log)

## What was built

`fyd-lane/canonical-conformance/` (new; no existing file modified):

- `fixture.json` — 11 cases. 6 positive (exact canonical bytes + sha256,
  generated from the reference via `make-fixture.mjs`); 5 throw-cases
  encoding the pinned `FLOATS_REFUSED` semantic. Inputs use `$float` /
  `$undefined` markers revived to native values per adapter.
- `run-conformance.py` — the runner. Invokes each implementation, compares
  against the fixture, prints a table + JSON. **Exit code is the verdict:**
  0 iff every implementation conforms on all applicable cases.
- `driver-ts.mjs` — node driver for the 4 TS/JS implementations (runs the
  `.ts` reference via type stripping; Node 22.18+ required, no build step).
- `make-fixture.mjs` — regenerates positive-case expectations from the
  reference. Throw-case expectations are never generated; they encode the
  pinned decision.
- `README.md` — home rationale, pinned semantics, typed reason codes,
  how to add an implementation.
- `conformance-report.json` — first verdict snapshot (committed evidence).

Home rationale: 4 of 7 implementations live in `fyd-lane`; no `substrate/`
namespace exists yet (creating one would assert a new authority boundary
beyond this item); the runner is test tooling, not a canonicalization
authority — it defines no canonical bytes of its own.

## Pinned semantics (decided 2026-09-27 for this gap)

1. **FLOATS_REFUSED.** Any float (finite or non-finite) in the input must
   make the canonicalizer throw/refuse, never emit bytes. Rationale:
   Python and JS serialize floats differently, so a digest must never
   silently depend on float bytes. `dump.py` already refuses; the pin
   extends fail-closed to all sides per the recon's falsification bar.
2. **KEY_ORDER_UTF16.** Keys sort in UTF-16 code-unit order (the
   reference's `Object.keys().sort()`). Proven empirically: Python
   `sorted()` uses code-point order and diverges on astral-plane keys
   (JS: z, U+1F600, U+E000; Python: z, U+E000, U+1F600).
3. **BYTE_FORM.** Recursive key sort, array order preserved (semantic),
   separators `(',', ':')`, raw UTF-8 (no `\uXXXX`), `undefined` ->
   `null`, empty structures preserved.
4. **Scope.** Canonical BYTES only. The `hashCanonical` envelope
   (`canonical_version`, `serialization_version`, `algorithm`) is a
   TS-jurisdiction versioning construct, out of scope for cross-language
   digest conformance.

## Fixture cases (11)

Positive (expect exact bytes): `key-order-basic`, `nested-arrays-preserved`,
`unicode-bmp`, `empty-structures`, `undefined-to-null` (ts-only),
`astral-key-order`.
Throw-cases (expect refuse, pinned `FLOATS_REFUSED`): `float-finite`,
`float-nested`, `float-nan`, `float-inf`, `float-neginf`.

## Conformance results (runner invocation below)

77 case-runs: 35 PASS, 39 FAIL, 3 SKIP (`undefined` has no Python meaning).
Verdict: **NON_CONFORMANT**, exit 1. Every FAIL carries a typed reason;
no implementation was edited (divergences recorded, not rewritten).

- **[ref] hash-authority.ts — NON_CONFORMANT.** 6/6 byte-cases PASS.
  All 5 float cases FAIL: `FLOAT_ACCEPTED` (finite) and
  `NONFINITE_SERIALIZED` (`{"x":null}` — non-finite null-swallowed).
  Honest finding: the constitutional reference predates the pin; the
  pinned refuse-floats semantic requires a Pig-side patch to the live
  file (this was an ingested evidence copy; not touched). Follow-up F4.
- **[live] absorb/canonical.ts — NON_CONFORMANT.** 9/11 PASS (incl. all
  byte-cases, non-finite refusal, undefined->null). 2 FAIL:
  `FLOAT_ACCEPTED` on finite floats (`{"price":19.99}`,
  `{"a":{"b":[1,2.5]}}`). Its own suite: 6/6 pass
  (`npx tsx --test test/canonical.test.ts`). Follow-up F2.
- **[live] dump.py — NON_CONFORMANT.** 9/10 applicable PASS, incl. all 5
  float cases (`REFUSED_AS_PINNED` — the only implementation that
  already honors the pin). 1 FAIL: `KEY_SORT_ASTRAL` on
  `astral-key-order` (code-point vs UTF-16 order). Follow-up F3.
- **[live] lane-e/proof.py — NON_CONFORMANT.** 4/10 applicable PASS.
  6 FAIL: `KEY_SORT_ASTRAL` + `FLOAT_ACCEPTED` (`{"p":1.5}`) +
  `NONFINITE_SERIALIZED` (`{"x":NaN}`, `{"x":Infinity}`). This is the
  recon's concrete failure made visible: for a float-bearing fact,
  dump.py refuses while proof.py silently hashes divergent bytes, with
  no alarm. Follow-up F1.
- **[hist] check-stable.py — NON_CONFORMANT (flagged).** 3/10 PASS.
  `UNICODE_ESCAPED` (ensure_ascii default escapes non-ASCII),
  `FLOAT_ACCEPTED`, `NONFINITE_SERIALIZED`. Pig-side ops probe, not
  importable; adapter evaluates its exact line-17 expression. No fix
  (frozen historical behavior; flagged, not silently accepted).
- **[hist] CanonicalBytes.serialize — NON_CONFORMANT (flagged).**
  3/11 PASS. `ARRAY_SEPARATORS` (`{"a":[12]}` — array elements
  concatenated with no separators, not valid JSON),
  `UNDEFINED_LITERAL` (`{"a":undefined}`),
  `FLOAT_ACCEPTED` / `NONFINITE_SERIALIZED`. Frozen PING-side copy;
  flagged, not fixed.
- **[hist] legacy top-level stringify — NON_CONFORMANT (flagged).**
  1/11 PASS. Stronger than the recon's "top-level-keys-only"
  description: `NESTED_KEYS_DROPPED` — the replacer-array form
  `JSON.stringify(o, Object.keys(o).sort())` not only skips nested
  sorting, it **drops nested keys absent from the top level**
  (`$.m` lost `'b'`, `$.deep` lost `'l1'`). Frozen C1-bug evidence;
  flagged, not fixed.

## Runner invocation

```
cd fyd-lane/canonical-conformance
python3 run-conformance.py --report conformance-report.json
echo $?   # 1
```

Full table + JSON in `conformance-report.json` (committed).

## Implementation test runs

- `absorb`: `npx tsx --test test/canonical.test.ts` → 6/6 pass
  (run 2026-09-27; the suite predates this item, untouched).
- `dump.py`, `lane-e/proof.py`: no unit suites exist; their tests are
  live proof runs requiring the Pig + :3100 (not available). Not run.
- `hash-authority.ts` (evidence copy), `canonical_authority.js`,
  `unified_event_runtime.js`, `check-stable.py`: frozen evidence /
  probes; no suites. Not run.
- No implementation file was modified by this item, so no
  implementation needed re-testing after a change.

## Incident: fyd-lane/dump.py missing from the shared tree

During this item, `fyd-lane/dump.py` disappeared from the shared
`~/workspace` working tree (it was present and importable at ~11:16
MDT; gone by ~11:35 MDT). It was never tracked in git, so no git
history exists for the original. Its content (with the Gap-3
`journal_identity` adoption, `canonicalize` behavior-identical per
that commit's message and verified against the probed original) is
preserved in the sibling's commit `e84764e`
(`substrate/gap3-journal-identity`): `git show
e84764e:fyd-lane/dump.py`.

This item's runner was validated against that blob (extracted to a
temp location; `canonicalize` output matches the ~11:16 probe on every
fixture case). `dump.py` was deliberately NOT committed on this
branch (it belongs to the Gap-3 stream). **Action for the parent:**
restore `fyd-lane/dump.py` to the shared tree (from `e84764e` or the
Gap-3 stream's working copy); until then the runner's `dump.py`
adapter cannot run outside a checkout that contains the file.

## Follow-up backlog items (fixes are separate items; nothing was
silently rewritten)

- F1: `lane-e/proof.py::canon` → refuse floats (align with `dump.py`).
- F2: `absorb/canonical.ts` → decide finite-float rule (needs caller
  audit for fractional floats; JS cannot distinguish int-valued
  floats, so the rule needs care).
- F3: `dump.py` key sort → UTF-16 code-unit order for astral keys
  (digest-affecting; needs projection-impact analysis).
- F4: PING `hash-authority.ts` (Pig-side live file) → throw on floats
  per the pin (needs Pig transport).
- F5: historical artifacts (`canonical_authority.js`,
  `unified_event_runtime.js` legacy, `check-stable.py`) stay flagged
  non-conformant; no fix (frozen evidence / Pig-side ops).

## Verdict

**GAP1-IMPL PARTIAL** — Evidence: the conformance harness exists and is
committed (`0e4c543`); the float semantic is pinned (`FLOATS_REFUSED`)
and the key-order semantic is pinned (`KEY_ORDER_UTF16`); the runner
exits 1 with 39 typed failing case-runs across all 7 implementations,
each divergence documented above with its follow-up. Not VERIFIED:
live divergences (proof.py float acceptance, absorb finite-float
acceptance, dump.py astral sort, reference float acceptance) remain
open as F1–F4, and `dump.py` needs restoring to the shared tree before
the runner is runnable there.
