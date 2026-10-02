# Step 6: Owner correction across every projection — PASS

Date: 2026-09-23. Local production build on :3111, digest-verified fixture
projections via `FYD_PROJECTION_DIR=/tmp/fyd-proj`, demo owner mode on.
Corrections were recorded earlier the same day through the real endpoint
(`POST /api/fyd/objects/happy-place/overrides`, demo-authorized proposals)
and persisted in `data/fyd-owner/happy-place.json` (candidate tree only).

## The three durable demo-owner actions

1. `owner.corrected-fact` — phone. Effective: `+1 541 555 0147`.
   Source retained: `+15412865190`. Approval bound to baseStateDigest,
   baseViewDigest, patchDigest; omitting baseViewDigest failed with
   `approval_not_bound` (verified earlier).
2. `owner.confirmed-fact` — email `taylor@happyplacecarpentry.com`.
3. `owner.hid-fact` — service `website-service-51de038c1defe8bd`
   ("Pergola Design Consultations"), `set-service-visibility` visible:false.

No real owner identity was verified. Demo only.

## Projection-by-projection verification (live, final build)

- `/sites/happy-place` (200): no Pergola service section, no object
  affordance, no "About Pergola" card, no sample question naming it, no
  Pergola data in the serialized client payload (service id count 0), no
  metadata keywords leak. The one remaining case-insensitive "pergola"
  occurrence is the business's own prose description ("building decks,
  fences, pergolas, bathrooms..."), which is source text, not the hidden
  object.
- `/o/website-business-6fa5ebd99d72c4cb` (200): owner phone
  `+1 541 555 0147` effective and rendered; source phone disclosed as
  "Source says: +15412865190"; service list excludes Pergola; the Ask
  sample question fell back to the generic "What services do you offer?"
  instead of leaking the hidden service name.
- `/o/website-service-51de038c1defe8bd` (200): the hidden object survives
  as a direct route with its evidence intact. Hide is presentation, not
  deletion or privatization.
- `/sites/coppersmith-plumbing` (200): unaffected by every change.
- Ask FYD, both required questions verbatim ("What services does this
  business offer, and how do you know?"): answerClass `supported` for
  both sites (HPP: Repairs; Fencing; Painting; Drywall; Restoration.
  Coppersmith: Plumbing; Heating & Cooling; HVAC; Ventilation).

## Defects found and fixed (all generic, no customer branches)

1. **Presentation boundary hole.** `hiddenServices` reached the object
   view but not SiteSpec generation, renderer query resolution, or
   archetype presence. Fixed by annotating `PingObject` with
   `OwnerPresentationOverride` (separate from source `visibility`, which
   stays `public`) in a new `applyOwnerPresentationOverrides()` step,
   wired into the read seam after field corrections. All three generic
   consumers (procedural SiteSpec role grouping, renderer queries,
   archetype presence) respect it. 4 new regression tests: hidden
   service stays in the graph, source visibility unchanged, real
   event-log timestamp/actor attach, generated SiteSpec/queries exclude
   it, no annotation without an owner decision.
2. **Sample-question leak.** `view.ts` fell back to `services[0]` when no
   visible service existed, resurrecting the hidden name in an Ask
   sample question. Removed the fallback; the generic question renders.
3. **Client-payload leak.** Both site pages serialized the full graph
   into the client, so view-source exposed the hidden service object.
   New `src/app/sites/_shared/client-graph.ts`: `clientGraph(graph)`
   strips hidden objects and any relationship touching them from the
   client payload only. Server-side composition keeps the full graph.
   The Customize EditorPanel is section-level and unaffected.

## Test/build status after fixes

- Object suite 182/182 (incl. 4 new presentation-overlay tests).
- Proceduralize 85/85, components 82/82. tsc clean. Build 46/46 pages.
- Owner store re-read per request; corrections survived multiple
  server restarts (overlay applied on every serve, no caching).

## Invariants held

- Source fixture untouched (the real Pig projection was never written).
- Hiding never rewrites source truth or source visibility.
- Direct object routes remain reachable for evidence.
