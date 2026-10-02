# Step 8: plain-English SiteSpec change — 2026-09-23

Required sentence (verbatim): **"Move emergency plumbing to the top."**

## What the machinery did before the fix

Ran against the live API (`POST /api/fyd/customize`, action=parse,
siteId=coppersmith-plumbing) with a Coppersmith projection enriched with
the real service set (Plumbing, Heating & Cooling, HVAC, Ventilation,
Emergency Plumbing). Result before the fix:

- code `unresolved`: `"emergency plumbing" names the object "Plumbing",
  but this wave only promotes whole sections to the top of the page.
  Reordering objects inside a section is not supported yet.`

Two defects found:

1. The matcher picked the WRONG object: "Plumbing" (shortest substring
   match) instead of the exact "Emergency Plumbing".
2. promote_first on any object was an honest refusal, so the required
   sentence could never succeed.

## Generic repairs (no customer branches)

`src/fyd/customize/intent.ts`:

- `findObject`: an exact title match now beats a shorter partial match.
  "emergency plumbing" names "Emergency Plumbing", never "Plumbing".
- `resolveCustomizationIntent` (promote_first): when the target names an
  object rather than a section, the containing section moves to index 0.
  Resolution note names the object and the section explicitly, e.g.:
  `"emergency plumbing" is the object "Emergency Plumbing"; this wave
  promotes whole sections, so the Services section containing it moves
  to the top of the page.` An object shown in no section still resolves
  to honest UnresolvedIntent. Nothing is invented.

`src/app/sites/coppersmith-plumbing/page.tsx`:

- The rendered page called `generateSiteSpec` directly and never applied
  the presentation-intent layer, so approved directives could never
  reach the visitor (the page's own docstring already promised
  "overlays applied from PING events"). It now applies
  `applyPresentationIntent(base, presentationIntent, graph)` exactly as
  the happy-place page already did. Happy Place needed no change.

## End-to-end proof (live server, port 3111, demo-owner mode)

1. parse: ok=true, intent `{kind: promote_first, target: "emergency plumbing"}`,
   siteIntent `{kind: reorder_section, pageSlug: home,
   sectionId: home:Services:2, toIndex: 0}`, digest-bound proposal.
2. approve: ok=true, intentId `pi-37b2061541c5a9bc`,
   eventId `demo-evt-8d27e320cbb3d60f`. Journaled via a disposable
   /tmp stub honoring the README journal contract (the PING-side dump
   lives on the Pig; the stub is demo harness only, not candidate code).
3. Rendered `/sites/coppersmith-plumbing`: h2 order is now
   Services, About, Where we work, The people — Services first,
   Emergency Plumbing listed (9 mentions).
4. Re-observation: changed the Ventilation source description and
   recomputed the graph digest (new digest `6bf18676fd92`). The
   directive stayed applied and resolved; Services stayed first; the
   re-observed copy went live. Customization survives source change.
5. Happy Place regression: renders 200, corrected phone
   `+1 541 555 0147` live, Pergola still hidden. Unaffected.

## Test state after the repairs

- object: 182/182 PASS
- proceduralize: 85/85 PASS
- components: 82/82 PASS
- customize: 21/21 PASS (was 20; +1 exact-match test)
- tenant: 28/28 PASS
- sitespec: 91/91 PASS
- TypeScript: PASS; production build: 46/46 pages PASS

Candidate change set (3 files):
- `src/fyd/customize/intent.ts`
- `src/fyd/customize/__tests__/intent.test.ts`
- `src/app/sites/coppersmith-plumbing/page.tsx`
