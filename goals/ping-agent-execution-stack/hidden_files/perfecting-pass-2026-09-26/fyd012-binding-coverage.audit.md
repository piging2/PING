# FYD-012 binding-verifier coverage audit (ping-perfecting-pass 2026-09-26)

Item: BACKLOG_PING.md NOW-7 / FYD-012 — "audit that every factual render
binding call site is routed through verifyPresentationBinding, and add a
lint/test that no factual render binding bypasses it."

Method: static enumeration of every direct `.fields` access in each renderer
copy via `fyd012-binding-coverage.py --inventory` (occurrence identity =
sha256(relative_path, enclosing_function, normalized_line)); each occurrence
hand-verified against the source.

## Verdicts

### 1. fyd-lane/repo/renderer.tsx — CLEAN (4 occurrences, all justified)
- line 162 `fieldOf` helper `const v = o.fields[name];` — sole call site is the
  deterministic feed sort (line 455, `fieldOf(b,"date").localeCompare(...)`),
  explicitly commented "never rendered"; the rendered date goes through
  `boundField` (resolveBoundField). Category: sort-only.
- line 613 LinksSection `o.fields["socials"]` — raw extraction rendered ONLY
  when `boundField(ctx,o,"socials")` verifies the same binding; every URL then
  passes resolveSafeLink. Category: gate-backed.
- lines 657-658 SocialProofSection reviews/testimonials — same gate-backed
  pattern via `boundField(ctx,o,fieldName)`. Category: gate-backed.

### 2. fyd-grill-contact/src/renderer.tsx — CLEAN (5 occurrences)
Same three patterns as (1), plus line 195 `claimBadgeLabel` reading
`o.fields["claimKind"]`: feeds a CLOSED-SET provenance label (Feed item /
Website statement / Site record / Demo addition); raw observed text is never
rendered from this read. Category: presentation-label.

### 3. fyd-grill-compose/work/renderer.tsx — CLEAN (5 occurrences)
Same as (2): line 231 claimKind label, line 287 sort-only fieldOf, gate-backed
socials (1438) and reviews/testimonials (1482-1483).

### 4. fyd-build/src/fyd/components/renderer.tsx — GAP (the live lane renderer)
This file IS the fyd-build lane's compiled renderer (inside the lane's
tsconfig include). Zero verifyPresentationBinding / resolveBoundField call
sites in the entire lane src tree; the lane's own
`src/fyd/sitespec/graph.ts` exports ONLY `resolveWebsiteUrl` — the verifier
was never absorbed from fyd-lane. Unbound factual reads:
- line 134 `fieldOf` helper (used for sort? NO — check call sites: this
  copy's fieldOf has ZERO call sites; dead helper. The factual values render
  directly:)
- Hero: `{presentation.heading ?? o.title}`, `{presentation.copy ?? o.description}`
  — direct object title/description renders, no binding.
- line 484 LinksSection `o.fields["socials"]` — direct; gated only by
  safeWebsiteHref (URL safety), NOT by binding verification.
- line 521 SocialProofSection `o.fields["reviews"] ?? o.fields["testimonials"]`
  — direct; rendered as blockquotes with NO binding gate.
- `src/app/sites/happy-place/site-client.tsx:274` renders `{o.title}` directly.
Object-level visibility IS gated (resolveQuery -> filterGraphForViewer,
FYD-010 object-level); URL hrefs ARE safe-linked. The FACTUAL-BINDING layer is
absent. This is the owning lane's (fyd-build) fix: absorb the verifier and
route these reads through it.

### 5. fyd-build/work/new/renderer.tsx — WIP, outside the lane's tsconfig
Not compiled by the lane (tsconfig include is src/** + server/** only; the
file imports ../sitespec/field-visibility which exists nowhere under
fyd-build or fyd-lane). Carries the boundField discipline plus TWO unbound
media bypasses for the owning lane to fix before this copy is promoted:
- line 1116 ProjectGallerySection filters on unbound
  `o.fields["classification"] === "OWNED_AUTHORIZED"`.
- line 1127 `const f = o.fields as unknown as MediaFields;` then raw
  `src={variantUrlFor(f,800)}`, `srcSet`, `width`, `height` (lines 1137-1144)
  with no resolveSafeLink; same pattern in Hero lines 385/392/394
  (`variantUrlFor(heroMedia.fields,1600)`, `srcSetFor`, `heroMedia.fields.alt`).
  The 2026-09-23 sink audit covered href= only; <img src> is a second sink.
- mediaForOwner (work/new/media.ts:107-113) gates classification by the same
  unbound read; object visibility IS checked (public only).

## Delivered mechanism (pays rent)
- `fyd012-binding-coverage.py` + `fyd012-binding-coverage.allowlist.json`
  (this dir): --check fails closed on any direct `.fields` read not
  allowlisted. Verified 2026-09-26:
  - PASS on the 3 disciplined copies (14/14 occurrences justified).
  - FAIL on fyd-build/src/fyd/components/renderer.tsx (3 unbound sites
    named: 134, 484, 521).
  - FAIL on a scratch copy with a deliberately injected
    `o.fields["phone"]` read (the injected line flagged with its own id).
- Adoption (wiring into the lane's test path) belongs to the owning lane.

## Status recommendation
FYD-012 stays OPEN: the audit is complete and the lint is delivered, but the
invariant does NOT hold for the live fyd-build renderer. The defect above is
the precise, reproducible gap for the fyd-build lane.
