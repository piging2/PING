# FYD-026b: OWNER_AUTHORED wiring (open follow-up from FYD-026 closure)

Date: 2026-09-27. Owner-authored wiring agent.

## The gap (triage)

The FYD-026 bridge `claimClassificationForContent(content, { ownerAuthored: true })`
maps to OWNER_AUTHORED (unit-tested at closure), but no call site ever sets
`ownerAuthored: true`. The bridge's only production call site is the claim hop
in `src/fyd/why/why-this.ts:398`, which calls it with NO opts. So owner
corrections applied via FYD-018 (`owner/apply.ts`) + overlaid via FYD-016
(`owner/corrections.ts`, which sets `provenance.kind = "overlay-authored"`)
classify as GENERATED_PRESENTATION, never OWNER_AUTHORED.

## Harvest notes

- FYD-026 bridge (`src/fyd/claims/claims.ts:204-212`): the harvest. DO NOT fork.
  `DEMO_SYNTHETIC + ownerAuthored:true -> OWNER_AUTHORED`; `DEMO_SYNTHETIC`
  alone -> GENERATED_PRESENTATION; WEBSITE_STATEMENT -> DIRECT (bridge only
  proposes; the write-time DIRECT admission gate still applies).
- Wiring point: `src/fyd/why/why-this.ts:398` (the only bridge call site).
  The claim hop already computes `contentClassificationOf(object.provenance.kind)`
  (overlay-authored -> DEMO_SYNTHETIC, renderer.tsx:170).
- Signal to key off: the FYD-038 `overlay-authored` provenance already set on
  corrected objects by `applyOwnerFieldCorrections` (corrections.ts:158). No
  second owner-authored marker invented.
- Served bytes already carry both vocabularies side by side
  (renderer.tsx:284-288): `<ClaimBadge/>` (FYD-038 "Demo addition") next to
  `<span data-claim-classification>` (FYD-026 claim vocabulary). They stay
  distinct: after wiring, the badge still says "Demo addition" while the claim
  classification says OWNER_AUTHORED.
- FYD-010 gate: phone/email/home_address are owner-only; demo_owner sees all
  fields (policy.ts maySeeField), visitors fail closed with the value withheld.
  The wiring is classification-only; no value paths change.
- Three-state law (ask/types.ts, evidence/refs.ts): claims are never mutated or
  deleted; this delta computes classification at read time, no mutation.

## Step 1: FAILING PROBE FIRST

New test: `src/fyd/why/__tests__/owner-authored-wiring.test.ts`.
Runs the REAL lane: interpretRequest -> applyIntent -> applyProposal (FYD-018)
-> fieldCorrectionsFromDecisions -> applyOwnerFieldCorrections (FYD-016)
-> whyThis (presentation/WHY THIS?). Asserts:

1. The corrected phone value's claim hop carries claimClassification
   OWNER_AUTHORED (through the bridge) while its FYD-038 classification stays
   DEMO_SYNTHETIC ("Demo addition" badge).
2. The same field's OBSERVED value carries claimClassification DIRECT /
   classification WEBSITE_STATEMENT (source classification).
3. FYD-010: a visitor's chain for the corrected owner-only field fails closed
   (found=false, value withheld) while a conflict/claim classification rides
   along honestly.
4. Served bytes: the rendered WhyThis chain contains
   `data-claim-classification="OWNER_AUTHORED"` next to the "Demo addition"
   badge.

Probe result (pre-implementation, 2026-09-27 ~10:55 MDT): FAILS AS DESIGNED.

- "corrected value" test: expected OWNER_AUTHORED, received
  GENERATED_PRESENTATION. The bridge is never told the content is
  owner-authored: the claim hop calls `claimClassificationForContent(...)`
  with no opts.
- "served bytes" test: rendered WhyThis chain shows the "Demo addition"
  badge (data-classification="DEMO_SYNTHETIC") next to
  data-claim-classification="GENERATED_PRESENTATION" -- the two vocabularies
  are already side by side in the served bytes; the claim side just has the
  wrong value.
- "observed value" and "FYD-010" tests pass pre-wiring: source classification
  (DIRECT / WEBSITE_STATEMENT) and the visitor fail-closed gate are already
  correct and must not regress.

## Step 2: the delta (smallest)

`src/fyd/why/why-this.ts` claim hop (the bridge's only production call site):
pass `{ ownerAuthored: object.provenance.kind === "overlay-authored" }` into
the bridge call. One expression; keys off the existing FYD-038 signal that
FYD-016's overlay already sets on corrected objects. No new marker, no bridge
fork, no value-path changes. The FYD-038 classification on the same hop stays
DEMO_SYNTHETIC ("Demo addition" badge): the two vocabularies stay distinct per
FYD-026.

Diff (why-this.ts, claim hop):

    claimClassification: claimClassificationForContent(
      contentClassificationOf(object.provenance.kind),
      { ownerAuthored: object.provenance.kind === "overlay-authored" }
    ),

New test: `src/fyd/why/__tests__/owner-authored-wiring.test.ts` (4 tests).

## Verification

- Full jest suite: 42 suites / 320 tests, ALL GREEN (2026-09-27 ~11:05 MDT,
  after the temp serve-proof was removed from the tree).
- `tsc --noEmit`: clean.
- No paid calls; deterministic + headless labor only. $25 untouched.

## Served-path evidence

Proof script (durable copy): `fyd-026b-serve-proof.ts` (this dir). Run:
`npm run build:server && node dist/server/serve-proofs/fyd-026b-serve-proof.js`
from the repo root; serves on an ephemeral port (run used port 36001),
production :3100 untouched.

Result (2026-09-27 ~11:02 MDT): ALL SERVED-PATH CHECKS PASSED --
  /owner/why-this-phone  : corrected phone +1-970-555-0100 served;
                          source phone absent; "Demo addition" badge present;
                          data-claim-classification="OWNER_AUTHORED" present.
  /observed/why-this-phone : source phone served; "Website statement" badge;
                          data-claim-classification="DIRECT".
Served bytes dump: `fyd-026b-served-why-this-phone.html` (this dir) --
contains exactly one `data-claim-classification="OWNER_AUTHORED"` next to
the "Demo addition" badge for the corrected value.

## Commit

Local commit on fyd-025-semantic-determinism (never pushed):
841825c49fb3c41a36e13b21056793e04105bd0c -- "FYD-026b: wire OWNER_AUTHORED
claim classification at the overlay/claim boundary" (2 files: why-this.ts
modified, owner-authored-wiring.test.ts new). No push, no production touch.
