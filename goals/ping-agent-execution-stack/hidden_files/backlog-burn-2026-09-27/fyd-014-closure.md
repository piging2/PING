# FYD-014 closure ledger — WHY THIS? visible interaction (2026-09-27)

## Triage (verified empirically, not trusted blindly)
- HEAD `d827d31` on `fyd-016-correct-survival`, re-verified on arrival.
- Served `/sites/happy-place` (dev server, ephemeral :3214): served bytes contain
  6 `data-fyd-object-id` bindings, ZERO server-rendered WHY THIS? affordances.
  "Why is FYD showing this?" appears exactly once, inside the client `<script>`
  that injects buttons post-load. Triage confirmed: no visible path in served bytes.
- `/api/why-this` route exists and resolves (e.g. Drywall service card), but the
  panel it feeds shows flat strings only: no chain hops, no claim classification,
  no conflicts, no FYD-010 privacy gate on the route.

## Harvest (no second models)
- `src/fyd/why/why-this.ts` — lineage/evidence-chain contract (extended, not forked).
- FYD-012 `resolveBoundField` (`src/fyd/sitespec/graph.ts`) — the WHY THIS?
  surface reads the shown value through it, never around it.
- FYD-038 `ClaimBadge` / `contentClassificationOf` (`src/fyd/components/renderer.tsx`)
  — the classification display, reused (component rendered in the chain; mapping
  imported, not re-implemented).
- FYD-010 `maySeeField`/`VISITOR_VIEWER` (`src/fyd/visibility/policy.ts`) — field gate.
- FYD-011 `Conflict` (`src/fyd/refresh/types.ts`) + `conflictSurfaceText` vocabulary —
  conflicts carried in, winner+loser shown, never re-detected here.

## Failing probe (written FIRST, watched fail)
- `src/fyd/why/__tests__/why-this-visible.test.ts`
- Failure observed: ts-jest compile errors — `WhyThis` not exported from
  `components/renderer`, `evidence` not on `RenderContext`, `viewer`/
  `conflicts`/`valueField` not on `WhyThisInput`, `chain`/`conflict` not on
  `WhyThisResult`. 0 tests ran. This is the expected failing probe.

## Delta
- `src/fyd/why/why-this.ts`: `WhyThisInput` gains `viewer` (default VISITOR_VIEWER),
  `conflicts` (default []), `valueField` (default "title"); `WhyThisResult` gains
  machine-walkable `chain: WhyThisChainHop[]` (value -> object-field -> claim ->
  evidence -> observation -> source) and optional `conflict: WhyThisConflictView`
  on both variants. Value read through FYD-012; FYD-010 gate applied before any
  read; open conflicts on (objectId, valueField) surface winner+loser (values
  withheld for owner-only fields, classification still shown honestly).
- `src/fyd/components/renderer.tsx`: `RenderContext` gains optional `evidence:
  WhyThisEvidence`; new `WhyThis` component (server-rendered `<details>` with
  "Why this?" summary) placed next to every `ClaimBadge`; renders the chain hops,
  reuses `ClaimBadge` for the claim hop, shows conflicts, fails closed honestly.
- `server/dev-server.ts`: populates `ctx.evidence` (observations from disk,
  conflicts [], visitor or demo-owner viewer); removes the JS-injected button
  block (replaced by the server-rendered affordance); `/api/why-this` passes
  explicit `VISITOR_VIEWER` + `conflicts: []` and now returns the chain.
- `server/site.css`: `.why-this` details/summary styling.

## Suite / typecheck
- `npm test`: 30 suites, 266 tests, all green (was 197+... now includes the 5
  new FYD-014 probe tests; the 5 pre-existing why-this tests still pass
  unchanged — the result extension is additive).
- `npm run typecheck` (`tsc --noEmit`): clean.

## Served-path evidence (ephemeral port, production :3100 untouched)
- Rebuilt (`npm run build:server`); served on ephemeral :3217 (dist PORT
  patch; :3100 never bound in this session). Proof server stopped after.
- `GET /sites/happy-place` (200): served bytes contain 8 server-rendered
  `Why this?` affordances (`<details class="why-this"
  data-why-this-object="...">` next to every ClaimBadge: Hero, About,
  5 service cards, Contact). All 6 `data-fyd-object-id` claims have their
  affordance; none missing.
- Walked chain (Drywall card, `...-service-c63c87ed8420d0c6`), every hop
  resolved in the served bytes:
  value "Drywall" -> object-field `Field "title" on "Drywall"` ->
  claim `Website statement` (FYD-038 badge reused) + `The "Drywall" entry` ->
  evidence `service-cards:estimate-service-card:drywall` ->
  observation `obs-happy-place-estimate-service-card-drywall` (observed
  2026-09-22T15:35:00Z by service-cards.ts v2-2026-09-22) ->
  source `https://happy-place-platform.vercel.app/`.
- `GET /api/why-this?site=happy-place&objectId=<drywall>` returns the same
  chain as typed JSON hops (machine-walkable, FYD-015).
- Business object (no evidence_ref): chain fails closed honestly in both
  surfaces ("carries no evidence reference, so FYD cannot say where it was
  observed") — unknowns shown, never papered over, nothing invented.
- `/sites/coppersmith-plumbing` (200, 7 affordances),
  `/sites/happy-place?demo_owner=1` (200, 8 affordances),
  `/sites/happy-place/services` (200): no errors, server log clean.
- Sweep note: every factual claim on the homepage carries the affordance;
  claims with evidence resolve every hop; claims without evidence fail
  closed with the honest reason. No served claim lacks a path; no hop is
  invented.

## Commit
- `c6e35d3` on `fyd-016-correct-survival` (local only, never pushed).
  5 files: why-this.ts, renderer.tsx, dev-server.ts, site.css,
  why-this-visible.test.ts.
- No paid calls. No production touch. dist/ is gitignored (proof ran from
  a PORT-patched build artifact).
