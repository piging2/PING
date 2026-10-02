# FYD-012 closure (NOW-7 / P2) — binding verifier coverage audit, live fyd-build renderer

Date: 2026-09-27. Implementer: FYD-012 subagent. Lane branch: `fyd-012-binding-verifier`, commit `573c0b6` (local only, never pushed).

## Verdict: PASS

The live renderer's factual reads are now routed through the presentation-binding verifier, the lint passes, the lint is wired into the lane's test path fail-closed, and the bindings are proven in the served HTML bytes.

## 1. Harvest notes (harvest before writing)

- **Verifier source**: `~/workspace/fyd-lane/repo/graph.ts` lines 53-161 — `BindingClassification`, `PresentationBinding`, `BindingVerdict`, `boundFieldValue`, `CLASSIFICATIONS`, `verifyPresentationBinding`, `resolveBoundField`. Absorbed **verbatim** into `src/fyd/sitespec/graph.ts` (the lane's own graph authority, alongside `resolveWebsiteUrl`). No second validator invented; the renderer imports the authority (`resolveBoundField`, `BindingClassification`) from `../sitespec/graph`, the same import shape the three disciplined copies use.
- **Usage pattern**: `~/workspace/fyd-lane/repo/renderer.tsx` lines 165-208 (`boundField`/`boundTitle`/`boundDescription` + projection-seam comment) and lines 608-665 (LinksSection `socialsBound` gate, SocialProofSection `boundField(ctx,o,fieldName)` gate). Mirrored, not redesigned.
- **Reconciliation with `src/fyd/claims/claims.ts` (FYD-008, GEN-CONSTRAINT, closed)**: `validateClaims` stays the **generation-time** authority (generated prose may be emitted only when it rests on structured claims whose evidence refs resolve in the evidence index). The absorbed verifier is the **render-time field-read** layer (an observed field value may be shown only when its presentation binding resolves to accepted evidence). Both fail closed; a `direct` binding requires `obj.provenance.ref`, the same evidence records claims' `evidenceRefs` name; neither validates the other's domain. Documented in the absorption header comment in `sitespec/graph.ts`. No competing validator created.

## 2. Delta (all inside `src/fyd/components/renderer.tsx` + lint/test wiring; `src/fyd/ask/`, `src/fyd/acquisition/`, Pig-side untouched)

- `src/fyd/sitespec/graph.ts`: +108 lines, absorbed verifier + reconciliation comment.
- `renderer.tsx`: `boundField`/`boundTitle`/`boundDescription` helpers; every factual render routed through them — Hero, BusinessSummary, CardGrid (Services/Products/ObjectGrid/GenericObjectCard), LocationsSection, PeopleSection `role`, PostsSection rendered `date`, FeedList (ObjectFeed/RecentObjects), ContactSection `phone`/`email` (safeTelHref/safeMailtoHref take `unknown`, so unverified values lose hrefs, never visibility), IdentityCardSection, `ownerTitle`.
- LinksSection: `socialsBound = boundField(ctx,o,"socials") !== undefined` gate; raw extraction rendered only when verified; every URL still through `safeWebsiteHref`.
- SocialProofSection: `reviews`/`testimonials` field-name probe + `boundField(ctx,o,fieldName)` gate; unbound quotes omitted.
- `fieldOf` is now **sort-only** (sole call site: PostsSection deterministic date sort). Its `.fields` line is allowlisted as sort-only.
- No remaining `o.title` / `o.description` / raw `o.fields` renders outside the four justified reads.
- `src/fyd/sitespec/__tests__/graph.test.ts`: 6 verifier unit tests pinning the fail-closed contract (direct/generated/derived/owner_authored, unknown object, unbound field, empty provenance ref, title/description pseudo-fields, omit-never-guess).
- `src/fyd/components/__tests__/binding-coverage.test.ts`: runs the lane-owned lint `--check` (fail-closed); plus a **bypass probe** — temp copy of renderer.tsx with an injected `o.fields["bypass_probe"]` read asserts the lint FAILs naming the injected line/function.
- `src/fyd/components/__tests__/binding-render.test.ts`: served-bytes proof via `renderToStaticMarkup(SitePageView)` — verified bindings render, empty `provenance.ref` omits all factual values while structural chrome still renders.
- `scripts/fyd012-binding-coverage.py` + `scripts/fyd012-binding-coverage.allowlist.json`: lane-owned copies of the delivered mechanism (byte-identical to the perfecting-pass originals at copy time).

## 3. Lint before / after (canonical invocation: absolute path; IDs are sha256 of workspace-relative path + function + normalized line)

BEFORE (2026-09-27, reproduced the triage exactly):
```
FYD-012 LINT FAIL: 3 uncovered direct .fields read(s):
  fyd-build/src/fyd/components/renderer.tsx:134 [fieldOf] id=1cb037a31b691c67
    const v = o.fields[name];
  fyd-build/src/fyd/components/renderer.tsx:484 [LinksSection] id=d09d8db3af37d8ab
    const raw = o.fields["socials"];
  fyd-build/src/fyd/components/renderer.tsx:521 [SocialProofSection] id=e85f1ec4fcd9a413
    const raw = o.fields["reviews"] ?? o.fields["testimonials"];
exit=1
```

AFTER:
```
FYD-012 LINT PASS: 4 direct read(s), all allowlisted.
exit=0
```
4 new allowlist entries (18 total), each with a recorded justification:
- `1cb037a31b691c67` sort-only — fieldOf helper, sole remaining call site is the deterministic PostsSection date sort (never rendered).
- `d09d8db3af37d8ab` gate-backed — LinksSection raw socials extraction; rendered only when `boundField(ctx,o,'socials')` verifies (socialsBound gate); every URL through safeWebsiteHref.
- `859b34e1b6ba896b` gate-backed — SocialProofSection reviews/testimonials field-name probe (presence only).
- `f4010462088603ef` gate-backed — SocialProofSection raw quote extraction; rendered only when `boundField(ctx,o,fieldName)` verifies.

## 4. Bypass-test evidence

`binding-coverage.test.ts` → "lint bites: an injected direct read fails the check": PASS. The injected `__fyd012BypassProbe` / `o.fields["bypass_probe"]` line is flagged `FYD-012 LINT FAIL` with its own occurrence id. A future unjustified read fails `npm test` the same way.

## 5. Served-path evidence (source ≠ built ≠ served)

How renderer.tsx reaches served output in this lane: `server/dev-server.ts:34` serves pages via `renderToStaticMarkup(SitePageView(...))` over HTTP (:3100). The lane's architecture exercises that exact render path deterministically through jest; the :3100 production server was **not** booted or restarted (production port, lane rule).

- **Source**: `src/fyd/components/renderer.tsx` + `src/fyd/sitespec/graph.ts` (this commit).
- **Built**: `npm run build:server` (tsc + `@/` alias rewrite → `dist/`, gitignored local artifact). Verified: `dist/src/fyd/sitespec/graph.js` contains `verifyPresentationBinding`; `dist/src/fyd/components/renderer.js` routes through `boundField`/`resolveBoundField`; `node -e` confirms both are exported functions from the built module.
- **Served bytes**: `/tmp/fyd012-dist-proof.js` (ephemeral) ran the **built** renderer through `renderToStaticMarkup` (the dev server's exact serve function): 11/11 — title, description, phone, socials link, and review quote present in the HTML when bindings verify; all omitted when `provenance.ref` is empty; structural chrome ("Ask FYD") still renders.
- **Regression**: full `npm test` — 24 suites / 231 tests green, including `render.test.ts` which asserts the real happy-place served HTML still contains the factual content ("Happy Place", `+15412865190`, `https://happyplacecarpentry.com`, the five service titles) — the bindings hold for the lane's real data. `tsc --noEmit` clean.

## 6. Residuals (explicitly out of scope, not fixed)

- `src/app/sites/happy-place/site-client.tsx:274` renders `{o.title}` directly — outside the task's surface boundary (renderer.tsx + lint wiring only). Flagged for a follow-up.
- `fyd-build/work/new/renderer.tsx` WIP copy (outside tsconfig; audit §5 media bypasses) — not promoted, untouched.
- `resolveWebsiteUrl`'s internal `fieldOf` reads in `sitespec/graph.ts` — same as fyd-lane's own authority; the binding discipline applies at the renderer's factual-value layer, which is the delivered lint's scope.
- Audit note correction: the triage said this copy's `fieldOf` had zero call sites; it actually had seven (role/date/phone/email renders + date sort). All rendered uses are now bound; only the sort remains.

## 7. Cost

No OpenRouter calls, no Copilot identities used — deterministic work only. The $25 balance untouched. No pushes, no destructive git, no new authorities, Jev untouched.
