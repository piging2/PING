# Architecture Call: Privacy P0 Cross-Consumer Visibility Inconsistency

Date: 2026-09-25 ~20:10 MDT
Called by: FYD compiler main lane (per privacy lane handoff)
Status: **DEFERRED** (not entering the compiler plan now)

## The item

Privacy P0 lane flagged (not fixed, needs architecture call):
- `publicGraphOf()` hardcodes `[]` decisions (ignores owner HIDE/SHOW)
- `buildRenderContext()` accepts owner decisions
- `composeObjectView()` bypasses `applyFieldVisibility`
- All defined in `src/fyd/object/view.ts`
- Threading decisions into the Ask path needs a decisions store + route changes
- No end-to-end failing test exists yet

Privacy lane's own fixes are green on `fyd/privacy-projection-p0`:
- ecd2ef9 (7 RED tests), 7e6b81c (field-visibility.ts), f5d2de4 (visitor-answer.ts)

## The call: DEFER

1. **Not proven.** No end-to-end failing test demonstrates a visibility decision
   being ignored on a live consumer path. The sprint charter's safety-lane rule
   is "fix ONLY if proven." The three proven defects are already fixed on the
   privacy branch.

2. **Requires new architecture.** A decisions store + route changes is new
   architecture, not a seam fix. Nolan's binding order: "DO NOT REOPEN THE
   ARCHITECTURE."

3. **Outside the compiler's blast radius.** The v2 family render path
   (`family-input.ts` -> `planPage` -> `PublicFamilyPage`) does not import or
   call `publicGraphOf()`, `buildRenderContext()`, or `composeObjectView()`.
   Verified by grep 2026-09-25. The inconsistency lives in the object-view /
   API layer (`src/fyd/object/view.ts`, consumed by `by-id.ts`,
   `circle/route.ts`, `preview/pipeline.ts`, etc.).

4. **Sprint priority.** Nolan's Batch 2 decisions (2026-09-25 ~20:01 MDT) put
   the live walkthrough FIRST. Diverting the compiler lane into a
   decisions-store build would delay the :3105 v2 landing.

## Entry criteria (when it enters the plan)

- A failing end-to-end test that demonstrates a specific owner visibility
  decision (HIDE/SHOW) being ignored on a specific consumer path
  (public graph, Ask, or object view), with the leaked field named.
- Then it enters as a P0 at the public projection seam, scoped to the
  smallest fix that makes the failing test pass without new architecture
  if possible; if a decisions store is truly required, that is a
  separate architecture proposal to Nolan, not a compiler-lane diversion.

## Noted for the future

- The seam shape (three functions, decisions threading) is understood and
  documented here. When the owner-correction loop phase reaches the Ask
  path, this inconsistency must be re-examined.
- The v2 page currently renders from a pinned fixture with no owner
  decisions in play; the cutover to live graphs must route through a
  single visibility authority.
