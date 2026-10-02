# HPP Contractor-Family Reference

**Source:** `/home/nolan/projects/happy-place-platform` at `6dd11bed`
**Date:** September 25, 2026
**Purpose:** Canonical design and conversion reference for the FYD contractor family. This document describes what HPP does, not what the family must copy. The family harvests the grammar, not the facts.

## The Conversion Spine

HPP's homepage follows a strict conversion order. Each section earns the next scroll:

1. **Hero** - H1 with the core promise, subhead with the differentiator, primary CTA to estimate, secondary CTA to see work. Phone number visible.
2. **Compact trust strip** - Licenses, years, review count, service area. One line, scannable, no fluff.
3. **Services** - Cards for each service. Whole cards link to `/estimate?service=<slug>`. No competing CTAs inside cards.
4. **Before/After** - Visual proof with slider interaction. The work sells itself.
5. **Project bento grid** - Multiple projects in an editorial grid. Shows range, not just one hero job.
6. **Owner story** - The human behind the business. Photo, name, why they do this work.
7. **Reviews or honest fallback** - Real reviews when they exist. When empty, do not invent them. Show an honest "reviews coming" state or omit.
8. **One evidence-closed CTA** - Final call to action that references the proof above ("See what we did for [neighbor]? Let's talk about your project.").

## Service Card Contract

- The entire card is the link. No nested "Learn more" or "Ask about this service" links competing for attention.
- Card links to `/estimate?service=<slug>` where slug matches the service identifier.
- Cards without a valid estimate binding render as non-link articles (fail closed, never a dead link).
- Visual: image or icon, service name, one-line scope description, no price claims.

## Estimate Wizard (7 steps)

From `website/src/components/estimate-wizard.tsx`, `ALL_STEPS`:

1. Service - Which service do you need?
2. Tell us about your project - Free-form description
3. Photos - Upload project photos
4. Project Details - Structured questions from `interview-questions-v3.ts`
5. Property - Address and property details
6. Contact - Name, phone, email (LAST, after value is established)
7. Thank You - Confirmation

**Key principle:** Contact details come last. The wizard earns the lead's information by first demonstrating understanding of their project.

**Question authority:** `website/src/lib/interview-questions-v3.ts` is the live source for estimate questions. Branching logic adapts questions based on service selection.

## Phone Formatting

- Display: human-readable format (e.g., "(970) 555-0123")
- `href`: E.164 format under `tel:` (e.g., `tel:+19705550123`)
- Never expose raw E.164 in visible text. Never use non-tel: schemes for phone links.

## Design Tokens (Warm Craft)

- Background: warm bone tones (#F6F4F0, #F5F2ED, #F3EFE8, #F2EFE8)
- Text: dark charcoal for primary, warm gray for secondary
- Accent: copper/amber for CTAs and highlights
- Typography: serif for headings (craft/trust), sans for body (clarity)
- Texture: subtle blueprint grids, diagonal section dividers, curved bottoms
- Motion: scroll reveals, light sweeps on cards, no gratuitous animation

## What NOT to Harvest

- HPP-specific facts (project counts, years, license numbers, city names)
- Review content (reviews are empty in HPP source; only the schema/eligibility pattern transfers)
- Blog content (placeholder in source)
- Newsletter signup (rejected from family scope)
- Any invented social proof

## Family Mapping

| HPP Section | Family Component | Notes |
|-------------|------------------|-------|
| Hero | Hero | H1, subhead, dual CTA, phone |
| Trust strip | TrustBar | Omitted when no evidence; never invent |
| Services | ServiceGrid | Whole-card estimate links |
| Before/After | ProjectGallery | Slider interaction |
| Project bento | ProjectGallery | Editorial grid variant |
| Owner story | BusinessStory | Photo, name, why |
| Reviews | (none) | Honest fallback only |
| Final CTA | ContactCTA | Evidence-closed, id="estimate" |
| Navigation | Navigation | Sticky, service links |
| Footer | Footer | Standard |
| Ask entry | AskFYD-entry | Quiet, deliberate surface |
