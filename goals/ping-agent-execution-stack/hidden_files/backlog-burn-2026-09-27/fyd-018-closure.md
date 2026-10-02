# FYD-018 closure — owner correction record shape (explicit target/before/after/classification/timestamp/actor)

Date: 2026-09-27 ~10:30 MDT. Repo: ~/workspace/fyd-build, branch fyd-018-correction-record (from c3736c9 on fyd-017-field-triple). Implementer lane.

## 1. Failing probe FIRST (watched it fail)

New test: `src/fyd/owner/__tests__/owner-correction-record.test.ts` (5 tests). Written before any
implementation; first run failed at compile time (`Property 'before' does not exist on type
'OwnerDecision'`, `observedGraph` not in ApplyOptions) — the gap was real: the record had no
explicit before/after/classification fields. After implementation: 5/5 PASS.

## 2. Harvest notes (no new machinery invented)

- Extended the existing `OwnerDecision` in `src/fyd/owner/store.ts` (FYD-016 store). No second
  correction record type.
- before-capture reuses the lane's existing extraction point (`applyProposal` in
  `src/fyd/owner/apply.ts`); field/after parsing mirrors the defensive shape already in
  `fieldCorrectionsFromDecisions` (corrections.ts).
- Classification: the lane's EXISTING FYD-038 vocabulary `ContentClassification`
  (`"WEBSITE_STATEMENT" | "DEMO_SYNTHETIC"`, renderer.tsx — "the single classification mapping").
  Corrected content is overlay-authored owner state (corrections.ts header), so every CORRECT
  decision classifies as `DEMO_SYNTHETIC`. Typed as `ContentClassification`, so any future
  vocabulary drift (FYD-026 territory) fails the build instead of drifting silently. No new
  vocabulary invented; FYD-026 drift untouched.
- FYD-022 value-provenance linkage (`owner-decision:<digest>`) untouched: the digest still pins
  exactly the proposal body.

## 3. The delta

**`src/fyd/owner/store.ts`**
- `OwnerDecision` gains optional top-level fields, present on CORRECT decisions only:
  `correctionField?: string` (what field changed), `before?: string | null` (observed value at
  decision time; explicit null when the source never had the field — never fabricated),
  `after?: string` (owner's corrected value), `classification?: ContentClassification`
  (`DEMO_SYNTHETIC` for corrections).
- `CORRECTION_CLASSIFICATION` exported constant (`ContentClassification = "DEMO_SYNTHETIC"`).
- Store version 1 -> 2.

**`src/fyd/owner/apply.ts`**
- `ApplyOptions` gains `observedGraph?: ObjectGraph` — the observed world at decision time.
- New `correctionRecordDetail(proposal, observedGraph)`: field+after from the digest-pinned
  proposal body, before read off the observed graph (null when unbound or no graph supplied).
- `applyProposal` attaches the detail on CORRECT decisions only (target/timestamp/actor were
  already top-level).

**`server/dev-server.ts`**
- The `/api/owner/apply` route now passes `observedGraph: SITES[site].graph`, so the production
  path captures `before` at decision time.

**Tests** — `src/fyd/owner/__tests__/owner-correction-record.test.ts`:
1. Phone correction: record carries explicit target/correctionField/before/after/classification/
   decidedAt/actor with correct values (before=+15412865190 observed, after=+1-970-555-0199
   owner-supplied, classification=DEMO_SYNTHETIC); explicit in the persisted JSON bytes too.
2. Address correction on an unbound field: before is explicit null (honest, not fabricated).
3. v1 -> v2 migration: digest byte-identical; correctionField/after recovered from the proposal,
   classification=DEMO_SYNTHETIC, before=null (unrecoverable from v1 — stated, not invented).
4. Non-CORRECT decisions (HIDE) carry no correction fields.
5. FYD-010 reader gate: phone/email/home_address are visitor-hidden, owner-visible — any surface
   reading the record must gate on the viewer.

## 4. Migration / digest decision

- The `value` digest (`proposalDigest`) covers the proposal BODY only (volatile keys stripped) —
  unchanged by this item. before/after/classification/correctionField are decision-time record
  metadata, like decidedAt/actor: recorded at decision time, NOT digest-pinned. The FYD-016/019/022
  machinery (proposal replay, `owner-decision:<digest>` linkage) depends on the digest pinning
  exactly the proposal body, and it stays byte-identical.
- Old records: `loadOwnerIntent` migrates v1 -> v2 in memory on load (forward-tolerant: already-
  explicit fields preserved); the on-disk file upgrades to version 2 on the next
  `recordDecision` atomic write. No repo on-disk v1 stores exist today (verified: zero
  `owner-intent-*.json` files in the repo). Fixture-built v1-shape decisions (field-triple
  fixtures) still flow through the proposal-based extractors unchanged.
- Nothing is silently broken: the pinned shape the FYD-016/019/022 machinery reads (proposal
  body + digest) is untouched.

## 5. Suite output (post-implementation)

- `npm test`: **39 suites / 294 tests PASS** (includes the 5 new FYD-018 tests).
- `npm run typecheck` (`tsc --noEmit`): **clean**.
- `npm run test:refresh`: **21 pass, 0 fail**.

## 6. Served-path evidence (ephemeral port; production :3100 untouched)

Proof script: `fyd-018-serve-proof.ts` (TS source, copy beside this ledger; throwaway runner in
/tmp/fyd018-serve/). Compiled the real pipeline with the repo tsconfig to /tmp/fyd018-serve/lib,
ran the REAL lane (interpretRequest -> applyIntent -> applyProposal with observedGraph ->
persisted store file), then served over HTTP on ephemeral port:

- `GET /owner/decisions?viewer=demo_owner` (200): served bytes carry the explicit record —
  `{"type":"CORRECT","target":"website-business-9d13c4196b4f1092","correctionField":"phone",
  "before":"+15412865190","after":"+1-970-555-0199","classification":"DEMO_SYNTHETIC",
  "decidedAt":"2026-09-27T16:26:40.093Z","actor":"demo_owner","value":"395185de…650"}`.
  Every one of target/before/after/classification/timestamp/actor asserted as an explicit
  top-level key with the correct value, against the SERVED BYTES. Served record snippet saved as
  `fyd-018-served-owner-record.json`.
- `GET /owner/decisions?viewer=visitor` (403): the record surface is gated by the REAL FYD-010
  `maySeeField` policy (record served only when the viewer may see every corrected field it
  carries). Served bytes contain none of the owner values (no before/after/target leak).

Result: **ALL SERVED-PATH CHECKS PASSED**. Source tree != built artifact != served artifact:
assertions ran against HTTP-served bytes read from the store file the compiled pipeline wrote.

## 7. Notes / residuals (not blockers)

- A CORRECT decision whose proposal is malformed (no well-formed ownerField keys) is still
  recorded, but without explicit correction fields — the overlay lane already skips such
  proposals at replay; the record stays honest about what it could extract. This is a degenerate
  path the typed propose lane cannot produce (proposeSitePatch fail-closes).
- D-SHIP suppression-shape choice untouched (Nolan-gated, out of scope).
- The record is owner-side storage; served surfaces must gate readers with maySeeField — the
  served proof asserts this for the record endpoint. Renderer-side display of records (if any
  future surface shows them) inherits the same rule.
