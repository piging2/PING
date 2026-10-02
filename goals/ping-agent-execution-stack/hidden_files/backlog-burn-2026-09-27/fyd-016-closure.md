# FYD-016 closure — owner address override survival across changed-source regeneration

Date: 2026-09-27 ~10:00 MDT. Implementer: FYD-016 subagent (Pigi).
Verdict: **PASS** — gap closed on the fyd-build working copy, proven at source, built, and served layers.

Working repo: `~/workspace/fyd-build`, HEAD `ba1bbc1` (branch `fyd-011-conflict-surfacing`, re-verified on arrival).
Lane branch for this work: `fyd-016-correct-survival` (local only, never pushed).

## 1. Failing probe first (step 1, pre-implementation)

Wrote `src/fyd/regen/__tests__/correct-regen.test.ts` BEFORE any implementation, against the intended final API
(`interpretRequest` correct_field intent, `regenerate()` returning `presentationGraphV2` + `fieldDivergences`,
`src/fyd/owner/corrections.ts`).

Pre-implementation run: **SUITE FAILED** —
`TS2339: Property 'presentationGraphV2' does not exist on type 'RegenerateResult'`,
`TS2339: Property 'fieldDivergences' does not exist on type 'RegenerateResult'`,
`TS2307: Cannot find module '../../owner/corrections'`
(plus the interpret layer returning null for "my address is ..."). The probe named exactly the missing
capability: no CORRECT-type decision existed anywhere in the lane (`OwnerDecision["type"]` listed "CORRECT"
in `owner/store.ts` but nothing produced, proposed, applied, or replayed it).

## 2. Harvest (before writing)

- **FYD-021 regen machinery** (`src/fyd/regen/regenerate.ts`): object-level diff (added/removed/changed +
  observationIds + changedFields), idempotent re-run, digest-verified per-decision replay with typed
  unapplied reasons. Reused as-is; CORRECT decisions slot into the same replay loop.
- **FYD-019 owner-intent machinery** (`src/fyd/owner/`): interpret -> proposeSitePatch (digest-pinned) ->
  applyProposal (tamper-refused, seam-logged) -> intent store OUTSIDE the graph -> replay. Reused as-is;
  CORRECT is the new intent kind through the same path.
- **FYD-010 field gate** (`src/fyd/visibility/policy.ts`): `VISITOR_VISIBLE_FIELDS` allowlist; contact-class
  fields (`phone`, `email`, `home_address`) are owner-only. Harvested as the owner-correctable field
  allowlist and as the privacy assertion in the probe (visitor projection never contains the corrected values).
- **FYD-038 honesty** (`overlay-authored` provenance kind -> "Demo addition" / DEMO_SYNTHETIC badge):
  harvested for the corrected object so owner state never wears the website's claim badge.
- **FYD-012 binding verifier** (`verifyPresentationBinding`, `owner_authored` classification): the verifier
  already defines `owner_authored` as "owner state, which is durable and survives re-ingestion" — the
  correction overlay is that classification's product realization. Renderer untouched (FYD-012 surface).
- Deliberately NOT built: no new authority. `claims.ts` stays generation-time authority (untouched);
  the binding verifier stays render-time (untouched); `applySitePatch` ignores `component: "owner"`
  proposals (spec untouched by corrections — the correction lives in the presentation graph, not the spec).

## 3. Delta (smallest reusable delta)

5 source files changed, 1 new module, 1 new test file. No paid calls, no Copilot, deterministic only.

### `src/fyd/proceduralize/patch.ts`
- `SiteIntent` gains `{ kind: "correct_field"; objectId; field; value }`.
- `OWNER_CORRECTABLE_FIELDS = {"home_address","phone","email"}` (FYD-010 contact-class, fail closed).
- `proposeSitePatch` case: field must be allowlisted, value non-empty <= 500 chars, objectId must equal
  `spec.ownerObjectId` (an owner corrects their own record only). Proposal is a digest-pinned site_patch
  with `component: "owner"` and propsDiff `ownerField.objectId` + `ownerField.<field>`; targetPage/Section
  are informational (where it presents). `intentPage` + the page guard exempt the new kind.

### `src/fyd/owner/corrections.ts` (new)
- Pure, deterministic, browser-safe overlay: `applyOwnerFieldCorrections(graphV1, graphV2, corrections)`
  returns a NEW graph (inputs never mutated) with corrected fields applied; corrected objects get
  `provenance.kind: "overlay-authored"` (FYD-038).
- Authority rule: the owner's correction wins for the corrected field. Divergence detection: when the V2
  observed value differs from BOTH the V1 observed value and the corrected value (source moved under the
  correction), the correction still wins and a `FieldDivergence` is recorded honestly.
- `fieldCorrectionsFromDecisions` extracts corrections from stored CORRECT decisions' digest-pinned proposals.

### `src/fyd/owner/interpret.ts`
- `OwnerIntent` gains `correct_field`. Deterministic keyword-anchored patterns: "my/our address is X",
  "change/correct/update the address to X" -> home_address; same shapes for phone/phone number and email.
  Resolves against `spec.ownerObjectId`; null when no owner or empty value. Never guesses.

### `src/fyd/owner/apply.ts`
- `toSiteIntent` maps correct_field -> `decisionType: "CORRECT"`, target = objectId. Before/after summary
  names the field change ("Correct home_address from ... to ..."); service titles unchanged.
  `applyProposal` path unchanged: digest verify -> applySitePatch (no-op for component "owner") ->
  persist CORRECT decision outside the graph -> seam log.

### `src/fyd/regen/regenerate.ts`
- `UnappliedReason` gains `field_not_correctable`.
- `replayCorrectDecision`: digest check -> well-formed owner-correctable correction -> target object
  exists in V2 (else typed unapplied, never silently dropped).
- `replayOwnerIntentOntoV2` collects verified CORRECT corrections and applies them in bulk via
  `applyOwnerFieldCorrections(graphV1, graphV2, ...)`; returns `presentationGraphV2` (owner-view
  presentation graph) and `fieldDivergences`.
- `RegenerateResult` gains `presentationGraphV2` + `fieldDivergences`. `graphV1`/`graphV2` stay the
  pure observed world.

### `src/fyd/regen/__tests__/correct-regen.test.ts` (new, 9 tests)
- interpret/propose/approve/persist arc for "my address is ..."; tampered CORRECT proposal refused;
  visitor cannot propose; graph untouched throughout.
- Changed-source regen (real V1 evidence bytes + surgical Gutters/painting edits): both CORRECT decisions
  replay applied; presentation graph shows corrected address + phone; observed V2 graph keeps source values;
  uncorrected changes (painting description, Gutters card) update normally; `fieldDivergences` empty;
  V1 untouched; byte-identical deterministic re-run.
- Privacy: FYD-010 gate — visitor projection has no home_address/phone; demo_owner sees corrected values.
- Divergence unit tests on the pure overlay: source move -> correction wins + honest divergence record;
  no-move -> no divergence; field the source never had -> applies cleanly; inputs never mutated.

## 4. Suite output (post-implementation)

- `npm test`: **29 suites / 261 tests PASS** (includes the 9 new FYD-016 tests + the 2 existing FYD-021 regen tests).
- `npm run test:refresh`: **21 pass, 0 fail**.
- `npm run typecheck` (`tsc --noEmit`): **clean**.

## 5. Served-path evidence (ephemeral port; production :3100 untouched)

Proof script: `fyd-016-serve-proof.ts` (copy beside this ledger; throwaway original in /tmp/fyd016-serve/).
Compiled the real pipeline to JS, served over HTTP on ephemeral port **41555**:

- `GET /owner/contact` — the REAL Contact section via the live renderer's `renderSection`, with the
  owner-view `presentationGraphV2`: served bytes contain the corrected phone `+1-970-555-0100`,
  do NOT contain the source phone `+15412865190`, badge reads "Demo addition" (`data-classification="DEMO_SYNTHETIC"`).
- `GET /owner/fields` — business fields through the real FYD-010 gate (demo_owner viewer): served bytes
  contain the corrected address `123 Corrected Way, Grand Junction, CO 81501`.
- `GET /observed/contact` — same section from the OBSERVED V2 graph: served bytes contain the source
  phone, do NOT contain the correction.

Result: **ALL SERVED-PATH CHECKS PASSED**. Served HTML snippet saved as `fyd-016-served-owner-contact.html`
in this directory. Source tree != built artifact != served artifact: assertions ran against the served bytes.

## 6. Notes / residuals (not blockers)

- The current regen compiler carries business contact fields forward from V1 (site identity, never
  re-derived), so a "source moves under a business-field correction" cannot arise from changed bytes
  today; the divergence branch is implemented, unit-tested with hand-built graphs, and ready for a
  compiler that re-derives those fields.
- The live renderer does not field-gate (FYD-010 closure left `renderer.tsx` untouched per FYD-012);
  visitor privacy for the corrected values rests on the constitutional FYD-010 gate (`maySeeField` /
  `filterObjectFieldsForViewer`) plus the overlay never entering the visitor's graph — both asserted
  in the probe. Renderer field-gating is FYD-010/FYD-012 territory, not this item.
- Escalation budget: $0 spent (no paid calls; deterministic + headless only).
