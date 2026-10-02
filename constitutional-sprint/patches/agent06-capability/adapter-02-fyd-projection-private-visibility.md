# EVALUATION adapter-02: raw FYD projection API serves private-visibility objects

Status: EVALUATED, NO PATCH APPLIED. Dependency: agent04 owns the file
(src/app/api/fyd/projection/route.ts is a projection/derived-data path).
Logged for the coordinator; agent04 decides whether the behavior is a bug.

## WHY (evaluated)

src/app/api/fyd/projection/route.ts calls getPingObjectGraph(siteId,
{ ownerOverlay: false }) and returns { meta, graph } with no public-object
filtering in the route. The live happy-place.json projection contains one
"visibility": "private" object. Every other user-facing consumer (FYD
renderer, Ask FYD, Ask PING, Circle, discovery/feed/node) filters to public
objects at view composition; the FYD social feed reader filters to public
posts. This route is the only read surface observed returning unfiltered
graph state.

## EVIDENCE

- ping-constitutional src/app/api/fyd/projection/route.ts:32+: returns
  { meta, graph } directly from getPingObjectGraph without a visibility
  filter.
- The shipped projection data contains exactly one private-visibility object
  (observed in the live happy-place.json projection).
- Consumers of this route are not yet traced; intent (raw debug surface vs
  public API) is unresolved, so the finding is AMBIGUOUS, not an
  unambiguous-evidence correction.

## SKETCHED MINIMUM CHANGE (for agent04/coordinator, NOT applied)

Apply the same public-object predicate the FYD renderer uses
(src/fyd/object/view.ts) at the route boundary before returning the graph,
or gate the route behind the demo flag if it is a debug surface. Agent04
owns this call.

## RESULT

No patch applied by Agent 06: file is outside owned paths and intent is
ambiguous. Recommended follow-up: trace route consumers, then agent04 either
applies the filter or documents the raw-surface intent.
