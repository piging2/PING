# FYD product lane — progress handoff (2026-09-23 ~18:30 UTC)

## Completed: steps 1 and 2

**Step 1 (regenerate both): PASS.** Both sites regenerated from current
canonical projections with digest verification; `generateSiteSpec` run
twice per site, byte-identical. Record:
`~/workspace/fyd/product-lane/STEP-01-REGENERATION.md`
Script: `~/workspace/fyd/product-lane/regen/step1-regen.ts`

- happy-place: specDigest d302ab17e261b0d60146f78a86bbe71cdc0bf44e2fc73fbf5af3337dba6744e6 (deterministic)
- coppersmith-plumbing: specDigest eb78eb023a2efec1c7df555d6038b61eb11c266b5d170442a3a5a95ede32d8ee (deterministic, post-fix)

**Step 2 (causality): first broken step found and fixed generically.**
The Coppersmith graph's real `person —works_for→ business` edge was
invisible to composition: `group()` only matched forward predicates
(employs/has_member), so no People section / no ObjectRail featuring,
while the builder's own eligibility contract said People was eligible.
The proceduralizer deliberately emits `works_for`; the planner could
never match it. STOP condition met verbatim.

**Generic fix** — role predicates now match in both directions via
`INVERSE_ROLE_PREDICATES` (person: works_for/member_of;
service/product: provided_by; post/article: published_by/authored_by).
Every inverse entry is a predicate the proceduralizer emits or schema
defs declare; nothing speculative, no customer names anywhere.
Files changed (in the extracted tree):
- src/fyd/sitespec/types.ts — optional `inversePredicates` on FYDQuery
- src/fyd/proceduralize/generator.ts — bidirectional group() + queries
- src/fyd/components/renderer.tsx — resolveQuery honors inverses, dedupes
- src/fyd/builder/eligibility.ts — mirrors generator exactly
- src/fyd/builder/planner.ts — planner's resolveQueryObjects mirrors too
- src/fyd/object/view.ts — structuredServices agrees with pages
- tests: 3 new regression tests in generator.test.ts; eligibility.test.ts
  expectation updated (it had encoded the broken behavior)

Causality record: `~/workspace/fyd/product-lane/STEP-02-CAUSALITY.md`
(includes the 5-row graph→planner→spec→visible table and the
evidence-quality note that the person is the WP author handle
"coppersmithplm", honestly labeled, owner-hideable in step 6).

## Proof collected

- Coppersmith spec now: home:People:3, about:People:1,
  home:ObjectRail:8 (person via works_for inverse). Happy Place
  unchanged (no person in graph → no People section).
- Lane tests: proceduralize 85/85, sitespec 91/91, components 82/82,
  object 178/178, customize 20/20, builder 70/71, ask 123/124.
  The 2 failures are pre-existing environmental ENOENTs on
  /home/nolan/ping/var/fyd-projections/ (Pig path absent on this VM),
  failing at file load before any changed code runs. tsc clean.
- Production build compiled clean; both routes serve HTTP 200.
- Served HTML: Coppersmith contains the People section
  (coppersmithplm rendered); Happy Place has no People section
  (only a `people-rail` CSS class string); Pergola service renders on
  A only. Visible graph→experience difference confirmed in markup.

## Running now

Next.js production server on port 3111, serving both sites with
projections from `~/workspace/fyd/product-lane/var/fyd-projections/`
(copies of the canonical fixtures; FYD_PROJECTION_DIR env).
Restart command:
`cd ~/workspace/fyd/product-lane/piging2-fyd-a69bb68fc84620a5635e071030cf49a633df7394 && FYD_PROJECTION_DIR=/home/hatch/workspace/fyd/product-lane/var/fyd-projections npx next start -p 3111`
Background session id: proc_9aadc2920cb9 (may not survive my shutdown).

## Remaining: steps 3–10 — needs a browser-capable lane

**Step 3 (real desktop + mobile browser proof) is the next checkmark
and I cannot perform it** (no live-browser tools in this subagent).
The server above is ready for it. Do not accept curl/SSR as browser
proof.

After step 3 passes: step 4 (Ask FYD "What services does this business
offer, and how do you know?"), step 5 (visible Why This provenance),
step 6 (one owner correction, source observation preserved), step 7
(correction survives regeneration), step 8 ("Move emergency plumbing
to the top" via typed SiteSpec patch; note the current resolver
refuses moving an individual object inside a section — step 8 may
expose this as the next generic gap), step 9 (second source
observation + deterministic dependency diff), step 10 (the exact
18-line readiness report).

## Caveats

- All source edits live in the extracted tarball tree
  `~/workspace/fyd/product-lane/piging2-fyd-a69bb68fc84620a5635e071030cf49a633df7394`
  (NOT a git worktree). If the canonical worktree is elsewhere, these
  8 files need porting; nothing was pushed or merged.
- No customer-specific code introduced (verified: no business names or
  name conditionals in generator/renderer/schemas).
- Frozen frontier untouched: no extraction or evidence changes.
