# Codex web-dev harvest — 2026-09-28

Source: `/home/nolan/projects/fyd-design-baseline` on the Pig (Codex, 2026-09-26).
A stripped presentation harvest of the Happy Place website source: Next.js 15,
typed section registry, CSS token layer, 9 fictional fixtures through one
renderer, full check chain (typecheck, model tests, sanitation, build, browser
matrix at 320/390/768/1280/1440). No customer data; original repo untouched.

## What was actually harvested (implemented)

**Evidence-binding attributes in the PING editorial template**
(`/home/nolan/projects/ping-editorial-template`, port 3212 sandbox).

The template's content layer (`src/content/ping.ts`) already pins stable ids for
every interactive record (unit-tested), but those ids never reached the DOM.
Ported Codex's `data-object-id` / `data-section-id` pattern:

- 11 `data-section-id` on sections/footer (hero, continuity-loop, architecture,
  govern, runtimes, ping-social, status, build-log, details, closing, footer).
- 28 `data-object-id` on cards, tabs, articles, buttons, each bound to the
  test-pinned content id (loop stages, maturity items, evidence steps, graph
  nodes, permissions, applications, faq/build indexes).

This is the DOM hook for the WHY THIS escape hatch and the evidence-binding
invariant: element -> content id -> source record. FACTUAL CLAIM != GENERATED
COPY becomes inspectable in served bytes.

Verification: `tsc --noEmit` clean, unit tests 4/4, `next build` green, served
HTML contains all bindings (verified in `.next/server/app/index.html`).
Browser suite: 18/19 pass; the 1 failure (application-tab roving tabindex) is
pre-existing — neither original nor modified source sets tabindex there.
Backups: `ping-site.tsx.bak-20260928`, `ping-experience.tsx.bak-20260928`.

## What was evaluated and deliberately NOT ported

- Warm olive/paper/linen palette, serif display type: HPP-derived customer
  aesthetic. Per 2026-09-26 posture, customer sites must not wear PING's skin
  and PING must not wear theirs. Transfer the token-role discipline, not the
  values.
- Animation runtime removal: PING already ships a full reduced-motion reset.
- Skip link, focus-visible, 44px targets: PING already has all three.

## Harvest spec for the FYD / social-object compiler lane (not implemented here)

One writer per semantic unit; these belong to the compiler, not the PING
marketing page. Implement there:

1. **Semantic section registry.** Sections declared by object role
   (Hero, BusinessSummary, Services, Projects, People, Locations, Contact),
   resolved from the object graph via exact ID bindings, with stable semantic
   anchors (`section-<id>`, colons replaced). Missing-data behavior is the
   contract: empty section returns null, contact returns null without contact
   facts, media frame renders nothing without media. Content-driven layout;
   never invent facts to fill a section.
2. **Sanitized theme-token injection.** Owner-supplied theme tokens pass a
   hex-only regex gate (`/^#[\da-fA-F]{6}$/`) before becoming CSS custom
   properties. Never execute arbitrary CSS or remote URLs from tenant input.
3. **Token-role discipline.** Roles (color/type/space/radius/shadow), responsive
   clamps, one container width, adaptive gutters, section rhythm. Generalize
   duplicate and category tokens away; do not accumulate one-off values.
4. **Fixture harness.** Nine semantic scenarios (service-led, project-led,
   no-media, one-service, ten-services, multi-location, person, no-phone,
   no-address) through ONE renderer, switchable via a `/fixtures` index.
   New renderer work must survive all nine before review.
5. **Ship-with-harness discipline.** `typecheck + model tests + sanitation +
   build + browser matrix` as one runnable chain. Codex's baseline caught a
   hero aspect-ratio defect this way before review.

## Out of scope (per directive)

TenantOS frontend, deep backend architecture, Coppersmith generalization.
No new authorities or systems created; no platform architecture imported.
