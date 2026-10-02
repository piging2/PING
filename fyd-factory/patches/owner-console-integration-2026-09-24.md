# Patch proposals: LANE-OWNER integration seams (2026-09-24)

Source: LANE-OWNER work on branch `fyd-factory`. New lane code lives in
`src/fyd/owner-mode/` (facts, provenance, corrections, visibility-policy,
owner-identity, demo-owner-console) and `src/fyd/customize/`
(owner-command-compiler, owner-proposal), with 78 passing tests.
GIT READ-ONLY observed; the three items below touch shared files outside
the lane's writable directories, so they are proposals, not applied changes.

## P-OWNER-1: Mount the DEMO OWNER MODE console

New component: `src/fyd/owner-mode/demo-owner-console.tsx`
(`DemoOwnerConsole`, props `{ siteId, graph, spec }`).

What it is: the six-tab owner surface (OBJECTS, CONTENT, VISIBILITY, SITE,
ASK FYD, EVIDENCE) with the explicit demo banner
"DEMO OWNER MODE - not real authentication". It renders null unless
`isDemoOwnerModeEnabled()` is true, so mounting it unconditionally is safe.

Proposal:
- In `src/app/sites/happy-place/page.tsx` (and the equivalent demo site
  pages), next to the existing `<DemoOwnerMode siteId={SITE_ID} />` mount,
  add `<DemoOwnerConsole siteId={SITE_ID} graph={graph} spec={spec} />`
  wherever the page has the object graph and site spec in scope.
- Same for `src/app/dev/objects/objects-lab-client.tsx` next to its
  existing `<DemoOwnerMode siteId={siteId} />` mount.
- No customer-specific JSX is introduced: the console is generic over any
  spec/graph pair.

## P-OWNER-2: Wire promote_action into the renderer

Gap: the owner command "Make the phone action more prominent." compiles to
a lane-local `ownerSiteIntent` of kind `promote_action` and applies into
`OwnerSiteState.actionProminence`, but nothing in the renderer reads that
state yet. The approval/apply/replay loop is fully tested; only the last
mile (rendering) is unwired.

Two options, owner's choice:
- Option A (recommended, lane-contained): the renderer reads
  `OwnerSiteState.actionProminence` for the current spec and elevates the
  matching action (e.g. renders the phone action as the primary CTA).
  Keeps canonical `SiteIntent` untouched.
- Option B (shared change): add `promote_action` as a canonical
  `SiteIntent` kind in `src/fyd/sitespec/types.ts` (or wherever `SiteIntent`
  is owned), with `{ pageSlug, sectionId, objectId, action }`, so the
  existing apply-layer and renderer handle it like any other intent.
  Then `customize/owner-proposal.ts` can drop its lane-local variant.

## P-OWNER-3: Durable conversion of owner state (explicitly unwired)

Design boundary, recorded so nobody reimplements it: the lane's
`OwnerSiteState` (assertions, visibility decisions, site intents) is a pure
in-memory typed algebra. The durable layer already exists at
`src/fyd/object/owner-events.ts` (append-only owner events) and
`src/fyd/object/owner-overlay.ts` (projection overlay). Production wiring
means converting approved `OwnerAssertion`s and `VisibilityDecision`s into
those durable events; that conversion belongs to whoever owns the durable
layer, not to this lane. Until it exists, journal replay is deterministic
but in-memory only.
