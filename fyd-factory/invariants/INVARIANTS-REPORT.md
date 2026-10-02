# Invariants Probe Report: LANE-INVARIANTS

**Program:** 500-site factory stress program, lane LANE-INVARIANTS
**Date:** 2026-09-23 (MDT)
**Branch:** `fyd-factory` (repo `/home/nolan/projects/ping`, read-only except this lane's test files)
**Suite (on the Pig):** `src/fyd/invariants/__tests__/` (10 test files + `support.ts` + `hostile-view.ts`), config `src/fyd/invariants/jest.config.cjs`
**Run command (on the Pig):** `npx jest --config src/fyd/invariants/jest.config.cjs --runInBand`
**Local stage copies:** `~/workspace/fyd-factory/invariants/stage/`
**Final result:** 10 suites, 90 tests, **89 passed, 1 failed**. The single failure is the honest, expected INV-05 seam failure (see below).

## Scope discipline

- New lane-contained files only: everything this lane created lives under `src/fyd/invariants/`.
- Zero modifications to shared files. `git status --porcelain` after the run shows this lane added exactly one untracked path (`?? src/fyd/invariants/`). All `M` (modified) entries (`package.json`, `src/app/o/[objectId]/page.tsx`, builder/UI files, etc.) and all other `??` entries are pre-existing dirt from other lanes, untouched by this lane.
- No duplication of adjacent lanes. LANE-REG (`src/fyd/owner-mode/__tests__/regen-proof.test.ts`) proved correction survival over a value-identical refresh; INV-06 extends it to a source that MOVES under the correction. QA-HOSTILE found the `/o` capability hole; INV-05 asserts the gate over a hostile battery and pins the seam failure with exact evidence. F4-PRESSURE's harness and the hostile corpus fixtures are referenced, not rerun.

## Verdicts

| # | Invariant | Verdict | Evidence |
|---|---|---|---|
| INV-01 | Same input, same canonical graph | **PASS** | Reversed object/relationship input order produces an identical canonical fact set and identical semantic digest `7a2bd14414c6ff393e7a62d740f67bf41ea6c20afb365df3a05bb8c79d3d692e` (96 facts both ways). |
| INV-02 | Same graph + context, same site spec | **PASS** | Five repeated generations byte-identical; different `generatedAt` values give the same semantic digest; reversed graph input gives a byte-identical SiteSpec under pinned context; owner identity stays `cw-biz-01`. |
| INV-03 | Hidden objects never leak into public projections | **PASS** | HIDE routes the fact to the withheld set with value untouched; the hidden fact is ABSENT from `publicFacts` (not redacted: its value appears nowhere in the public projection bytes); identity facts cannot be hidden; unknown fact ids are refused; unknown tenant/object loader returns null. |
| INV-04 | Unbound factual claims fail closed | **PASS** | All seven concierge questions run against rich, sparse, and conflicting-phone graphs: every non-UNKNOWN claim carries evidence, every UNKNOWN claim carries none, sparse unanswered questions refuse honestly, and the fail-closed throw guard is present in source. |
| INV-05 | Unsafe URL schemes never executable | **FAIL (honest)** | The standalone gate passes: 24 of 25 assertions green, including `javascript:`, `data:`, `vbscript:`, `file:`, `blob:`, case/whitespace/control-char evasions, and header-injection call/email inputs, all `non_navigable`. The `/o` capability seam fails: `buildCapabilities` interpolates the observed website value into the href without calling the gate, so `website: { href: "javascript:alert('xss-test')" }` is emitted and the gate rates that emitted href `non_navigable`. See Findings. |
| INV-06 | Owner correction survives reobservation | **PASS** | Source unchanged: correction holds, no conflict. Source MOVED: the owner's value stays applied AND an explicit `CorrectionConflict` surfaces both values (never a silent win). Source ADOPTED the owner value: satisfied, no conflict. Stale CONFIRM against a moved source: conflict surfaced, projection changes nothing. |
| INV-07 | Owner hide does not delete evidence | **PASS** | The hidden fact record survives byte-identical in `hiddenFacts` (value, identity, provenance linkage intact); the public projection carries no trace of the hidden value; every other fact is undisturbed. HIDE is a visibility decision, not a deletion. |
| INV-08 | Unknown capability, no action button | **PASS** | Data seam: unknown schema role yields ask-only (never contact buttons); business without contact values yields only `follow` (no dead buttons); phone-only yields call but not email/website; every emitted kind across all seven schema roles plus an unknown role is in the closed known set. Render seam: the real `/o/[objectId]` page render switch renders the known call action and renders nothing (no label, no href, no button) for an unknown `purchase` capability kind. |
| INV-09 | Conflicting evidence, no silent invention | **PASS** | Two conflicting phone values are both surfaced as SUPPORTED claims with evidence; the contradiction is labeled as a DERIVED claim ("contradict"); no third invented value appears anywhere in the answer text. |
| INV-10 | One object change invalidates only dependent projections | **PASS** | Invalidating `svc:decks` touches exactly `estimate-form`, `service-detail`, `services`; the business touches only its five sections; unknown objects invalidate nothing; change records map to scoped sets (business-only sections untouched by a service+reviews change); `merge()` extends the registry without disturbing existing scopes. |

## Findings

### F1 (INV-05): the `/o` capability seam is ungated, the gate itself is sound

`src/fyd/sitespec/safe-link.ts` (`resolveSafeLink`) is a correct fail-closed parser-based allowlist: all 12 hostile navigate inputs, all hostile call/email inputs, relative references, and non-string inputs resolve `non_navigable`, and the positive controls (`https:`, `tel:` built from phone characters, `mailto:` from a well-formed address) resolve `safe`.

The residual hole, first found by QA-HOSTILE and still present on this branch: `src/fyd/object/view.ts` `buildCapabilities` interpolates the observed `contact.website` value directly into the capability href (`caps.push({ kind: "website", href: contact.website, ... })`), and the `/o` page renders capability hrefs raw. With a hostile record the emitted capability is verbatim `{ kind: "website", href: "javascript:alert('xss-test')" }`. The drafted patches (`~/workspace/fyd-factory/patches/o-capability-safe-link.patch`, `o-contact-block-safe-link.patch`) are not applied on this branch. INV-05 therefore FAILS at the seam while the gate PASSES standalone; the probe preserves that distinction deliberately.

### F2 (INV-03/INV-07): the visibility policy hides location facts by conservative default

`src/fyd/owner-mode/visibility-policy.ts` resolves per-fact visibility by precedence: explicit owner decision, then HIDE assertion, then conservative default (`location` kind defaults to hidden, everything else public). On the Clearwater fixture this means 13 location-kind facts are hidden with no owner action at all, plus the 1 HIDE-asserted fact (14 hidden of 96). This is documented policy, not a bug; the probes assert the full policy (every non-asserted hidden id is location-kind) rather than assuming only the asserted fact is hidden.

### F3 (INV-06/INV-07): correction application is pure and HIDE is non-destructive

Verified in source: `applyCorrections` returns new fact records and never mutates inputs; the HIDE branch records the factId in the result's `hiddenFactIds` without editing the fact record, and visibility is resolved per fact by the policy at projection time. FACT and VISIBILITY stay separate concepts end to end.

## Machinery exercised (all real, on the Pig)

- `src/fyd/owner-mode/facts.ts`: `extractSiteFacts`, `factIdFor`
- `src/fyd/owner-mode/corrections.ts`: `assertCorrection`, `applyCorrections`
- `src/fyd/owner-mode/visibility-policy.ts`: `projectPublicFacts`, `hiddenFactIds`, `setFactVisibility`
- `src/fyd/proceduralize/generator.ts`: `generateSiteSpec`
- `src/fyd/builder/canonical.ts`: `semanticDigestOf`
- `src/fyd/ask/concierge.ts`: `answerConciergeQuestion`
- `src/fyd/sitespec/safe-link.ts`: `resolveSafeLink`
- `src/fyd/object/view.ts`: `buildCapabilities`
- `src/fyd/object/by-id.ts`: `loadObjectViewById`
- `src/app/o/[objectId]/page.tsx`: capability render switch (via static markup with mocked Next/UI deps)
- `src/fyd/refresh/dependency-index.ts`: `DependencyIndex`

## Recommended follow-ups

1. Apply (or adjudicate) the two drafted safe-link patches for the `/o` capability and contact seams; re-run `inv-05-url-schemes.test.ts` and expect the seam test to flip to PASS.
2. Consider a seam-level regression test in the owning lane so the ungated interpolation cannot regress silently.
3. No action needed on F2/F3: policy behavior is as designed and probes now pin it.
