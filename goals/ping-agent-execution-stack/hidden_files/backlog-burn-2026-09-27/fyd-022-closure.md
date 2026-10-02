# FYD-022 closure: regeneration provenance (2026-09-27)

Backlog item: a change record per altered value with cause
(source/owner/generated), old value, new value, and evidence ref.

## The gap (triage 2026-09-27, read-only, verified)

The FYD-021 regen diff emits only object-level
`{added|removed|changed, objectId, observationId, title, changedFields}`.
Nothing said WHY a value changed (source moved? owner corrected?
generation recomputed?), what it was before/after, or which evidence
backs the new value.

## Step 1: the failing probe FIRST (watched fail, then green)

`src/fyd/regen/__tests__/fyd-022-provenance.test.ts`, written before the
implementation. It runs one v1->v2 regen where:

- (a) the SOURCE changes a value (Painting service description);
- (b) an owner CORRECT decision changes a value (home_address);
- (c) generation recomputes a derived value (business source_digest /
  observed_at, compiler-set volatile fields).

and asserts the provenance record for each altered value carries
cause in {source, owner, generated}, old, new, and an evidence ref, and
that EVERY record resolves (the ref points at a real observation, a real
decision record, or real derivation inputs).

Observed failure before implementation: TS2339
`Property 'valueProvenance' does not exist on type 'RegenerateResult'`
and TS2305 `provenanceForCorrection` not exported — the record model
simply did not exist. After implementation: green.

## Harvest notes (no new models invented)

- FYD-021 `src/fyd/regen/regenerate.ts`: the foundation. The object-level
  diff (`diffServices`, observationIds, changedFields, idempotent re-run)
  is EXTENDED, not forked. Source-cause records are built from its
  `changes` output; the evidence ref is the V2 observation id it already
  names.
- FYD-016 `fieldDivergences` (owner/corrections.ts): the cause-taxonomy
  harvest for the owner-cause branch. `applyOwnerFieldCorrections`
  already returns per-correction `observedValueV2` and the source-moved
  note; the FYD-022 owner record is that branch formalized as a change
  record (old = V2 observed, new = corrected, evidence = the
  digest-pinned OwnerDecision record `owner-decision:<digest>`).
- FYD-024 `src/fyd/ask/snapshot.ts`: graph identity convention reused —
  the new `RegenerateResult.valueProvenance` names `objectId` with the
  same stable ids the snapshot pin hashes over; no second identity
  vocabulary.
- FYD-010 `src/fyd/visibility/policy.ts`: the field gate. The provenance
  record itself stays honest (full values); the VIEWER projection gates
  through `maySeeField`: records for owner-only fields (home_address,
  phone, email) are served to visitors as
  `{cause, objectId, field, redacted: true, note: "owner-corrected field",
  evidenceRef}` with no values. The record notes the correction without
  the value, per the item spec.
- FYD-024 served-proof pattern reused for the served-path evidence
  (jest + node http on an ephemeral port, production :3100 untouched).

## The cause taxonomy (closed, fail closed)

`ProvenanceCause = "source" | "owner" | "generated" | "unknown"` in
`src/fyd/regen/regenerate.ts`.

- source: the observed world moved — diffed against the NEW
  observation. Evidence ref: the V2 observation id
  (`obs-<slug>-<pattern>-<key>`; for removals, the V2 business-fields
  observation, the pass that found the card gone).
- owner: a verified CORRECT decision (replay loop already
  digest-verifies and target-checks it). Evidence ref:
  `owner-decision:<proposalDigest>` — the decision record in the intent
  replay report. Pairing of correction -> decision is positional and
  VERIFIED (objectId+field match), never assumed.
- generated: a derived/computed value with no new observation behind
  it (compiler-set volatile business fields `source_digest`,
  `observed_at`). Evidence ref names the derivation inputs:
  `derivation:source-bytes-web-sha256:<hex>` /
  `derivation:regen-input-observedAt:<ts>`.
- unknown: the value changed but its cause cannot be attributed
  honestly. The record carries `unknownReason` and an empty
  evidenceRef rather than guessing. Directly unit-tested via the
  exported `provenanceForCorrection` (fail-closed branch:
  `decisionDigest: undefined` -> cause unknown).

The three-state law holds: the provenance record is metadata ABOUT the
regen; graphV1, graphV2, and all observations are never mutated
(existing tests assert graphV1 deep-equality post-regen; still green).

## The delta

`src/fyd/regen/regenerate.ts`:
- `ProvenanceCause`, `ValueProvenance`, `CorrectionAttribution`,
  `provenanceForCorrection` (exported for direct unit test).
- `replayOwnerIntentOntoV2` now threads each applied correction's
  decision digest through and returns `appliedCorrections`
  (correction + observedValueV2 + decisionDigest, pairing verified).
- `buildValueProvenance`: source records from the FYD-021 `changes`,
  generated records for the compiler-set volatile business fields,
  owner records from the verified corrections; sorted by
  (objectId, field); a correction that changed nothing records nothing.
- `RegenerateResult.valueProvenance: ValueProvenance[]`.

New tests:
- `src/fyd/regen/__tests__/fyd-022-provenance.test.ts` (failing probe,
  now green: all three causes + resolution checks + unknown fail-closed).
- `src/fyd/regen/__tests__/fyd-022-serve-proof.test.ts` (ephemeral-port
  HTTP proof on served bytes: visitor sees full source/generated
  records, redacted owner record, and NO corrected address anywhere in
  the visitor body; demo-owner route sees the full record).

## Verification

- `npx tsc --noEmit` — clean.
- `npx jest src/fyd/regen` — 4 suites, 14 tests, all pass.
- Full `npx jest` — 34 suites, 276 tests, all green.
- Served-path proof: `fyd-022-serve-proof.test.ts` (ephemeral port;
  production :3100 untouched) asserts on the SERVED BYTES: per-value
  records with cause/old/new/evidence-ref for source and generated,
  the owner record present-but-redacted for the visitor
  ("owner-corrected field", corrected address absent from the visitor
  body), and the full owner record for the demo owner.

## Commit

Committed locally on `fyd-016-correct-survival` (never pushed):
`src/fyd/regen/regenerate.ts`,
`src/fyd/regen/__tests__/fyd-022-provenance.test.ts`,
`src/fyd/regen/__tests__/fyd-022-serve-proof.test.ts`.
