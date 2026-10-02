# VQ Repair Spec

Date: 2026-09-24. Branch: Pig `fyd-factory` (`/home/nolan/projects/ping`).
Scope: VQ-REPAIR-SPEC only. Golden donor route frozen; CLONE-PROVE running separately.

## Verification

All five patch proposals pass `git apply --check` on the Pig, verified
2026-09-24 via `~/workspace/bin/wsl-run.sh`:

- PASS(check): vq-001-motion-never-gates-content
- PASS(check): vq-002-hero-pill-on-dark
- PASS(check): vq-004-typographic-hero-treatment
- PASS(check): m-issue-2-fab-inflow-mobile
- PASS(check): m-issue-3-mobile-hero-call-cta

No patch was applied. No repository file was changed. The donor, the Pig
repo, and `~/workspace/fyd-factory/hpp-clone/` were not modified.

## Worktree state caveat

The Pig worktree contains 100+ uncommitted entries from concurrent lanes.
Two of them overlap this repair surface:

1. `src/fyd/components/renderer.tsx` has uncommitted motion-CSS changes
   (visible base state, `.fyd-io-pending`, `.fyd-inview`,
   `.fyd-force-visible`). The VQ-001 patch below builds on that current
   worktree state; it does not duplicate it.
2. `src/fyd/components/__tests__/mobile-visibility.test.ts` is untracked
   (another lane's work in progress). The VQ-001 patch updates its
   assertions. If that file changes before this patch is applied, re-verify.

Patches were generated from the worktree state at verification time. If a
concurrent lane lands changes in the same regions, re-run `git apply
--check` before applying.

## Standing constraints honored

- Motion never determines whether content exists (VQ-001).
- No literal RGB-complement accessibility fixes (VQ-002 uses theme tokens).
- No em dashes in patch comments.

## Defect to patch map

### VQ-001: Motion gates content

- Evidence: `desktop-critique.json:1`, `findings[id="VQ-001"]`.
  Five Services cards sit at computed opacity 0 until scrolled; full-page
  capture, print, crawlers, and no-scroll contexts show a blank 613px
  section.
- Patch: `~/workspace/fyd-factory/patches/vq-001-motion-never-gates-content.patch`
- What it does: in `FydMotionStyles` (`src/fyd/components/renderer.tsx`),
  the `fyd-enter` and `fyd-hero-settle` keyframes become transform-only
  (the slide is kept, opacity is never touched), the `.fyd-io-pending`
  entrance becomes transform-only, and a `@media print` rule forces
  `[data-motion='enter']` and `.fyd-hero-settle` fully visible. Regression
  assertions are added to `mobile-visibility.test.ts`: no `opacity: 0`
  hiding rule anywhere, keyframes contain no opacity, print rule present.
- Scope: presentation only. It changes CSS strings and test assertions.
  It does not change object graph facts, composition semantics, SiteSpec
  validation, validator behavior, or the zero-validation-findings property.

### VQ-002: Hero pill illegible on dark slab

- Evidence: `desktop-critique.json:1`, `findings[id="VQ-002"]`.
  The `SITE RECORD` badge renders `rgb(67,46,45)` on dark navy: near-zero
  contrast.
- Patch: `~/workspace/fyd-factory/patches/vq-002-hero-pill-on-dark.patch`
- What it does: `ClaimBadge` gains an optional `tone="onDark"` prop. On the
  dark hero slab it renders `text-background` (the same token as the hero
  h1, proven legible on ink) with a `theme.accent` border (the same
  treatment as the Ask FYD button border on that slab). All other call sites
  keep the default light-surface treatment. Theme tokens only; no invented
  colors and no literal RGB-complement math.
- Scope: presentation only. It changes badge styling on one surface. It
  does not change object graph facts, composition semantics, SiteSpec
  validation, validator behavior, or the zero-validation-findings property.

### VQ-004: No designed no-media hero treatment

- Evidence: `desktop-critique.json:1`, `findings[id="VQ-004"]`.
  Zero images on the page (`imgs: 0`); the hero is a flat text-only dark
  slab.
- Patch: `~/workspace/fyd-factory/patches/vq-004-typographic-hero-treatment.patch`
- What it does: the hero `<section>` gains `data-hero-treatment`
  (`"photo"` vs `"typographic"`) and, when `ctx.heroMedia` is null, a
  deterministic token-derived accent wash
  (`color-mix(in srgb, theme.accent 16%, theme.ink)` over `theme.ink`)
  instead of the flat panel. Photo heroes are untouched. No media is
  acquired, fabricated, or bound; the existing hookup
  (`page.tsx` `heroMediaFor` to `SiteClient` prop to `ctx.heroMedia`) is
  documented in the code comment.
- Scope: presentation only. It changes hero background derivation. It does
  not change object graph facts, composition semantics, SiteSpec
  validation, validator behavior, or the zero-validation-findings property.

### ISSUE-2: Fixed FAB occludes About content on mobile

- Evidence: `mobile-critique.json:1`, `issues[id="ISSUE-2"]`.
  The fixed 153px Featured object pill covers section headings and paragraph
  text at 320 through 430px.
- Patch: `~/workspace/fyd-factory/patches/m-issue-2-fab-inflow-mobile.patch`
- What it does: in auto placement mode, an injected below-breakpoint media
  rule makes the trigger button in-flow (`position: static`, centered with
  top margin) instead of fixed, via a new `fyd-rail-auto-trigger-btn` class
  hook on the button. Desktop rail behavior and the explicit `rail`/`dock`
  placements are unchanged.
- Scope: presentation only. It changes trigger placement CSS on mobile. It
  does not change object graph facts, composition semantics, SiteSpec
  validation, validator behavior, or the zero-validation-findings property.

### ISSUE-3: No thumb-reachable dial action on mobile

- Evidence: `mobile-critique.json:1`, `issues[id="ISSUE-3"]`.
  The phone action sits about 2800px below the fold; the hero offers Visit
  website and Ask FYD, neither of which dials.
- Patch: `~/workspace/fyd-factory/patches/m-issue-3-mobile-hero-call-cta.patch`
- What it does: when the website is safe AND a binding-verified phone
  `ContactMethod` exists, the hero renders an additional mobile-only
  (`md:hidden`) Call button through `FydContactLink`, which opens the FYD
  contact flow (value plus provenance plus the real Call action), never a
  raw `tel:` link. Desktop is untouched. The single semantic phone value is
  reused; no duplicate or competing CTA is created.
- Scope: capability exposure only. It surfaces an already-verified contact
  method in the hero on mobile. It does not change object graph facts,
  composition semantics, SiteSpec validation, validator behavior, or the
  zero-validation-findings property. Provenance display and safe-link
  capability gating are preserved.

## Out of scope for this spec

VQ-003, VQ-005 through VQ-008, FP-001 through FP-004, NOTE-001 through
NOTE-003, SH-001, SH-002, and mobile ISSUE-1, ISSUE-4, ISSUE-5, ISSUE-6 are
not covered here.

## Patch files

- `~/workspace/fyd-factory/patches/vq-001-motion-never-gates-content.patch`
- `~/workspace/fyd-factory/patches/vq-002-hero-pill-on-dark.patch`
- `~/workspace/fyd-factory/patches/vq-004-typographic-hero-treatment.patch`
- `~/workspace/fyd-factory/patches/m-issue-2-fab-inflow-mobile.patch`
- `~/workspace/fyd-factory/patches/m-issue-3-mobile-hero-call-cta.patch`
