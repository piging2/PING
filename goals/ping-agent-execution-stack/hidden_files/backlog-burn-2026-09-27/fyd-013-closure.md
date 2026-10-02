# FYD-013 closure: stale/superseded evidence policy

Backlog item: evidence carries version/as_of; binding against superseded
evidence fails closed or marks stale.

Working repo: ~/workspace/fyd-build @ a8e1878 (fyd-016-correct-survival;
re-verified on arrival 2026-09-27).

## Harvest notes (before writing)

- `ResolvedEvidence` (src/fyd/ask/types.ts) carries `observedAt` but no
  version/superseded fields. `src/fyd/evidence/` is only `refs.ts` + tests.
  Confirmed the triage gap: nothing marks evidence superseded, nothing
  stops a claim binding against it.
- FYD-021 regen (src/fyd/regen/regenerate.ts) knows exactly which
  observations are superseded: the v1->v2 diff emits typed changes
  (added/removed/changed) each named with its observation id, and a
  `changed` card keeps the same deterministic observation id slot
  (`obs-<slug>-<pattern>-<key>`) across source versions. The marking
  rides the regen diff; no second evidence model, no second version
  scheme.
- FYD-024 (src/fyd/ask/snapshot.ts) versions the GRAPH via digest pin
  (not a version counter) and stale-marks whole answers at serve time.
  There is no existing observation version counter, so the regen carries
  a small sequence: new optional `RegenerateInput.observationVersion`
  (default 1 = the committed 2026-09-22 corpus); the superseding
  record's version is observationVersion + 1.
- Binding surfaces (no second validator):
  - `src/fyd/claims/claims.ts validateClaims` — the constrained
    generator's gate (called by ask/answer.ts). New typed reason
    `superseded_evidence`, fail closed.
  - `src/fyd/evidence/refs.ts validateEvidenceRef` — FYD-009 citation
    gate (called by ask/visitor.ts). New typed reason
    `superseded_evidence`, fail closed.
- ResolvedEvidence producers to update for the new required fields:
  ask/load-fixture.ts (toResolvedEvidence, acquisitionEvidence),
  acquisition/validate-chain.ts (observationsToEvidenceEntries), plus
  test literals in conflict-surfacing.test.ts, fyd-024-snapshot.test.ts,
  refs.test.ts.

## Fail-closed vs stale-mark decision

FAIL CLOSED on both binding surfaces (validateClaims and
validateEvidenceRef return `superseded_evidence`).

Why, per surface, against the lane's existing contracts:
- FYD-009 already fails closed on dangling/wrong_snapshot/hidden
  evidence: a citation that cannot be anchored to current, visible
  evidence is dropped and becomes a gap/unknown, never support. A
  superseded record is exactly that class: the observation it cites has
  been replaced by a newer one. Dropping the binding is the consistent
  behavior; the caller falls back to the existing no-evidence refusal
  path (claims.ts: "every failure means the same thing to the caller").
- FYD-024's stale-mark-over-refusal is the WHOLE-ANSWER serve-time
  surface: an answer composed against an older graph snapshot is still
  shown with a visible stale notice, because the answer as a whole may
  still be useful and the staleness is honest. Per-evidence binding is
  different: the composer asserts "this specific record supports this
  specific claim". Binding to a record the system KNOWS is superseded
  would be a false support assertion. The honest behavior is to refuse
  the binding. The two compose: stale-mark at serve (whole answer),
  fail-closed at bind (per evidence).
- Three-state law: marking superseded is metadata on the evidence
  record (new fields on a copied record), never a mutation or deletion
  of the underlying observation. `applySupersededMarks` returns new
  record objects; inputs are never mutated.
- Privacy (FYD-010): the marking fields (ids, version, timestamps,
  pointer) carry no values; served proof serves metadata only.

## The delta

1. `src/fyd/ask/types.ts`: ResolvedEvidence gains
   `evidenceVersion: number`, `supersededBy: string | null`,
   `supersededAt: string | null`, `supersedingVersion: number | null`.
2. `src/fyd/regen/regenerate.ts`: new `SupersededObservation`
   interface; `RegenerateInput.observationVersion?` (default 1);
   `RegenerateResult.supersededObservations` computed from the FYD-021
   diff (`changed` -> same-id V2 record supersedes; `removed` -> the V2
   business-fields observation supersedes the gone card's record;
   `added` -> no V1 record, no mark). Sorted by observationId.
3. `src/fyd/evidence/refs.ts`: `applySupersededMarks(records, marks)`
   (pure; marks matched by observationId, first wins; never mutates
   inputs); `validateEvidenceRef` returns `superseded_evidence` when the
   resolved record is marked (checked right after resolution, before
   anchoring checks: the record is known-replaced regardless of graph).
4. `src/fyd/claims/claims.ts`: `validateClaims` returns
   `superseded_evidence` when a resolved record is marked.
5. Producers updated: load-fixture.ts, acquisition/validate-chain.ts,
   three test literal sites.
6. Probe: `src/fyd/regen/__tests__/fyd-013-superseded.test.ts`
   (failing first, then green). Served proof:
   `src/fyd/regen/__tests__/fyd-013-serve-proof.test.ts` (ephemeral
   port; production :3100 untouched).

## Failing probe

Written before any implementation. Run:
`npx jest src/fyd/regen/__tests__/fyd-013-superseded.test.ts`

Result 2026-09-27 (pre-implementation): FAIL at compile time, as
designed. ts-jest errors:
- `Module '"../../evidence/refs"' has no exported member
  'applySupersededMarks'`
- `'evidenceVersion' does not exist in type 'ResolvedEvidence'`
- `Property 'supersededObservations' does not exist on type
  'RegenerateResult'`
Zero tests ran: the API surface the probe needs does not exist yet.

## Suite + tsc

2026-09-27, post-implementation:
- `npx tsc --noEmit`: clean.
- `npm test` (jest): 36 suites, 280 tests, all pass (includes the 3
  FYD-013 probe tests + 1 served-proof test).
- `npm run test:refresh` (node --test): 21 pass, 0 fail (refresh lane
  does not import the changed modules; run for completeness).

Incident during the run: the first full-suite pass had 1 failure in
fyd-024-snapshot.test.ts (`answer.conflicts.length` 0 vs 1). Cause:
that test builds its evidence literal through an `as unknown` cast, so
`supersededBy` was `undefined` at runtime and the strict
`!== null` check fired, dropping the citation and with it the
conflicted object. Fix: gave the literal the pinned shape
(evidenceVersion 1, null marks) — the correct fix, since the record
was genuinely current; the strict check stands (out-of-contract
records fail closed, which is the lane's answer to unverifiable
bindings).

## Served-path evidence

`src/fyd/regen/__tests__/fyd-013-serve-proof.test.ts`, ephemeral port
(127.0.0.1:0, production :3100 untouched). After a real v1->v2 regen
(painting description changed), `/regen/evidence?viewer=visitor`
serves as JSON bytes:
- `superseded[0]`: observationId obs-happy-place-estimate-service-card-painting,
  evidenceVersion 1, supersededBy the same id (v2 record), supersededAt
  2026-09-22T16:00:00Z, supersedingVersion 2, changeKind "changed".
- `binding`: { outcome: "fail_closed", reason: "superseded_evidence" },
  computed server-side through the real validateClaims gate.
- FYD-010: neither painting description nor the warranty sentence
  appears in the served body (metadata only: ids, version, timestamps,
  pointer, extractor, sourcePointer).

## Files changed

- src/fyd/ask/types.ts — ResolvedEvidence += evidenceVersion,
  supersededBy, supersededAt, supersedingVersion (required, pinned).
- src/fyd/regen/regenerate.ts — SupersededObservation interface,
  RegenerateInput.observationVersion (default 1, positive-int checked),
  RegenerateResult.supersededObservations computed from the FYD-021
  diff (changed -> same-id v2 record; removed -> v2 business-fields
  observation; added -> no mark), sorted by observationId.
- src/fyd/evidence/refs.ts — applySupersededMarks (pure, never
  mutates); validateEvidenceRef += superseded_evidence (checked right
  after record resolution).
- src/fyd/claims/claims.ts — validateClaims += superseded_evidence.
- src/fyd/ask/load-fixture.ts, src/fyd/acquisition/validate-chain.ts —
  producers set version 1 / null marks.
- Tests: new fyd-013-superseded.test.ts (failing probe, now green),
  new fyd-013-serve-proof.test.ts; literals updated in refs.test.ts,
  conflict-surfacing.test.ts, fyd-024-snapshot.test.ts.

Branch: fyd-013-superseded-evidence (local commit 8937576, never pushed).
