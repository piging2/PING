# FAILURE-MODE.md - extruct Q9 fixture

Checkout keyed to: `fyd/sprint-integration-2026-09-24` @ `c93a7ced`
(2026-09-26 verified state; Pig unreachable 2026-09-27, re-verify before placing the test).

## What the current implementation does

`src/fyd/proceduralize/structured-data.ts` (670 LOC), function
`discoverStructuredData` (line 74): extracts exclusively
`<script type="application/ld+json">` blocks via regex and parses them as JSON.
No microdata parsing, no RDFa parsing, no `itemscope`/`itemprop` handling
exists anywhere in the file. Verified 2026-09-26 by the vein-1 researcher
(full 670-line audit) and independently by the falsifier.

The fixture `amicomechanical-microdata.html` carries **zero** `application/ld+json`
blocks. This matches the live page: the falsifier's 2026-09-26 re-fetch of
`https://www.amicomechanical.com/` found zero ld+json blocks and a live
`schema.org/LocalBusiness` microdata record with the six field values used
in the test.

## Exactly which assertion fails, and why

In `structured-data-microdata.test.ts`:

```ts
const result = discoverStructuredData(html);
const businesses = findTypedRecords(result, 'LocalBusiness');
expect(businesses).toHaveLength(1);   // <-- FAILS
```

Failure: the regex finds no ld+json script blocks, so `discoverStructuredData`
returns an empty collection. `findTypedRecords` returns `[]`. The assertion
fails with "expected length 1, received 0". The six field-value assertions
never execute.

Simulation (research space, mirrors the verified current behavior exactly):
`simulate-current-behavior.py` implements the ld+json-regex-only extraction,
runs it over the fixture, and confirms 0 records. The "fails before" half
of writer-gate Q9 is therefore proven, not assumed.

## What a minimal TS microdata-itemscope parser must add

A new typed extractor in `structured-data.ts` (or a sibling module the stage
calls), emitting records in the same JSON-LD record shape the stage already
produces, so downstream consumers do not change:

1. Walk the DOM for elements with `itemscope`; read the schema.org type from
   `itemtype` (take the fragment after the last `/`).
2. For each itemscope, collect `itemprop` properties: text content, or the
   `content` / `href` / `src` attribute when present (extruct's precedence).
3. Recurse into nested `itemscope` elements (e.g. `PostalAddress` inside the
   `address` property), attaching them as nested records under the property name.
4. Type-filter the output: emit only the schema.org types the OBJECT stage
   consumes (LocalBusiness and its subtypes, PostalAddress, OpeningHoursSpecification,
   etc.). Do NOT emit a blind multi-syntax dump: corpus pages 05 and 09 carry
   73/311 RDFa statements of menu/role vocabulary noise (2026-09-26 finding).
5. Feed the resulting typed records into the same evidence pipeline the
   JSON-LD records enter: RAW OBSERVATION -> EVIDENCE -> SEMANTIC EXTRACTION.
   Parser output is not truth (program law, vein 2).

The research-space prototype in `simulate-current-behavior.py`
(`parse_microdata`, stdlib `html.parser` only, ~70 lines) shows the mechanism
is small and portable without the extruct Python architecture: it yields
exactly one `LocalBusiness` record with all six asserted field values, and the
test's assertions pass against its output. extruct (scrapinghub/extruct,
BSD-3-Clause, pinned `a31daaadb82ec684b7d468d3b15734b8ae3b7265`) remains
algorithm/reference only; the Python package is the wrong stack for PING's
TS pipeline and is never depended on.

## Writer handoff checklist

- [ ] Re-verify checkout HEAD/branch on the Pig before placing (2026-09-26
      state assumed; may have advanced).
- [ ] Place `structured-data-microdata.test.ts` at
      `src/fyd/proceduralize/__tests__/` and the fixture HTML alongside it.
- [ ] Reconcile the test's import and the `findTypedRecords` shape search
      against the real `discoverStructuredData` signature/output shape
      (the test is deliberately shape-tolerant; pin the selector at placement).
- [ ] Confirm the test FAILS red against the real stage (expected: 0 records).
- [ ] Write the minimal microdata extractor per the five points above.
- [ ] Confirm green; run the surrounding proceduralize suite (69 tests green
      2026-09-21 baseline); falsify; commit on a harvest branch; never main.
