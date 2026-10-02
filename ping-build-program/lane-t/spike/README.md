# Lane T spike: action planner seam

Pure JS, zero dependencies. Run: `node run.js`, `node redteam.js`.

## Files

- `intent.js` — deterministic keyword-anchored intent classifier (closed intent
  space; confidence is anchor/anchor_weak/none, never a probability; contact
  values are never parsed from free text).
- `policy.js` — policy evaluator: explicit deny wins, forbidden catalog,
  freshness downgrade, fixed contact tiebreak. Speaks the existing FydGrant
  vocabulary; no new grant strings.
- `planner.js` — `planAction(question, ctx)` -> ActionPlan. Pure and
  deterministic: same inputs give a byte-identical digest (timestamps live
  outside the digest). Quote requests reroute to the contact plan (never
  fabricates prices). Owner intents are ownership-gated before clarification.
  Zero relevant capabilities yields an honest refusal plus fallback, never a
  guessed route.
- `fixtures.js` — synthetic capability records (fixtures only, no live data).
- `run.js` — worked examples: "contact them", "call them",
  "book the soonest slot", "update my hours" (owner clarifies, visitor
  refused), "get a quote for a deck" (rerouted), "what services do they offer"
  (not an action intent). Prints determinism and gate-binds-plan checks.
- `redteam.js` — 19 invariants: injection (RT1), vanished capability (RT2),
  conflicting intents (RT3/RT3b), stale evidence (RT4), channel tie (RT5),
  missing grant (RT6), anonymous identity action (RT7), owner clarification
  without fabrication (RT8).

## What it proves

The seam is implementable as a small pure module on PING's existing
idioms (keyword anchors, FydGrant, digest-bound cards). No ML classifier,
no policy language, no new store, no new authority. The red-team run is the
failure test for the design in ACTION-PLANNER-DESIGN.md.
