# CONTACT lane handoff (2026-09-22) — for the compose lane

## What changed (all uncommitted, branch fyd/builder-composition)

### renderer.tsx — YOUR edit zones (keep these intact)
- **Lines 30-35**: new imports (`contactMethodFor`, `ClaimEvidence`,
  `ContactMethod`, `ContactMethodKind` from `../object/object-projection`;
  `FydContactLink` from `./contact-link`).
- **Lines ~329-400**: new helpers `contactMethod(ctx, o, kind, correction)`,
  `contactEvidence(o, kind, correction)`, `provenanceReceipt(ref)` —
  placed right after `boundWebsite`, before `SectionShell`.
- **Hero, ~lines 477-483 + 541**: phone button is now
  `<FydContactLink method={phoneMethod} theme={theme} variant="button" />`
  (line 541). `phoneMethod` built at line 483 via
  `contactMethod(ctx, o, "phone", correctionFor(o, "phone"))`.
- **ContactSection, ~lines 810-845**: phone/email rows are now
  `<FydContactLink method={phoneMethod|emailMethod} theme={theme} variant="row" />`
  (lines 832, 838). `CorrectionNote` rendering is unchanged.
- Untouched: website links, CTA section, Links section, Ask section.

### New generic components — src/fyd/components/contact-link.tsx
`FydContactLink` (the affordance), `ContactFlow` (the evidence-backed
surface: value + provenance + real Call/Send-email action INSIDE),
`ProvenanceLine` (progressive disclosure: compact
"Verified from X · N sources" -> tap expands full lineage),
`compactProvenanceLine` (pure). Zero customer-specific JSX. No JS state:
`<details>`/`<summary>`, works in static HTML, no motion.

### Projection layer — src/fyd/object/object-projection.ts
`ContactMethodKind`, `ContactMethod`, `contactMethodFor()` (pure,
safety-gated, null for unverifiable/unsafe), `ObjectProjection.contactMethods`
(required array, phone-then-email). `objectViewToProjection` populates it
from the same evidence as the contact Facts.

### object-rail.tsx — one-line fix (line ~106)
`contactMethods: []` added to `pingObjectToProjection` (required field;
this adapter grants no call/email capabilities by design).

## Seam decision
Contact flow = inline `<details>` disclosure, not a JS popover/sheet and
not an Ask FYD redirect. Rationale: works on /build in every serving mode
(static HTML included), no hydration, no motion, native keyboard/screen-reader
semantics, matches the existing WhyThis chrome. tel:/mailto: live ONLY
inside `data-fyd-contact-flow` divs; the top-level surface carries only
`data-fyd-contact` affordances.

## Ask FYD handoff (NOT touched — ask lane owns it)
"How do I contact them?" already answers via
src/lib/ping/ask-composer.ts:772-820 through the composer's own evidence
gates (verified: ask suite 114 pass). The new `ContactMethod` projection
(kind/value/evidence) is the typed input the ask lane can consume later if
it wants; no changes made to src/fyd/ask or src/lib/ping/ask-composer.

## Card/Node lane handoff (Lane B owns it)
`ObjectCard`/`ObjectNode` capability buttons (`call`/`email` with direct
hrefs in evidence-chrome.tsx `CapabilityAction`) are NOT converted in this
lane. `projection.contactMethods` is ready for Lane B to render through
`FydContactLink` when it chooses. Node `FactRow` contact facts remain plain
text (no dead links, no live links).

## Tests (all passing)
- components suite: 56 pass (`contact-link.test.ts` new, 13 tests;
  `projection-boundary.test.ts` +2 tests incl. nesting-aware
  `hrefsOutsideContactFlow` helper).
- object suite: 135 pass (`contact-method-projection.test.ts` new, 4 tests).
- ask suite: 114 pass (regression check, untouched).
- `tsc --noEmit`: clean.
