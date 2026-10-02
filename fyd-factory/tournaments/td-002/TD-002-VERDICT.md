# TD-002 Verdict: Ask FYD private-data leak probe

**Verdict: VULNERABLE**

Date: 2026-09-23. Investigator: TD-002. Pig repo: /home/nolan/projects/ping, branch fyd-factory. Read-only; no commits; no source files modified (one temporary untracked test file was added, run, and removed).

## Headline finding

A street-level address stored in an address-bearing field whose name does not contain "address" is served **verbatim** through the live Ask FYD path, violating the pipeline's own documented contract. The contract in `src/fyd/ask/visitor-answer.ts:14` states: "an address-bearing field is coarsened, never leaked verbatim." The implementation only coarsens fields whose *name* contains "address".

### Exact mechanism (live path, end to end)

1. Widget posts to `POST /api/fyd/ask` (`src/fyd/components/ask-fyd-widget.tsx:57`).
2. `handleAskRequest` (`src/app/api/fyd/ask/ask-pipeline.ts`) calls `answerAskFyd` (`src/fyd/ask/visitor-answer.ts`).
3. `answerAskFyd` calls `publicGraphOf`, which calls `applyFieldVisibility(graph, [])` (`visitor-answer.ts:184`). `resolveFieldVisibility` (`src/fyd/sitespec/field-visibility.ts`) returns `"show"` for any field whose name lacks "address" when no owner decision exists.
4. The legacy composer `composeAnswer` (`src/lib/ping/ask-composer.ts`) profile branch reads `fieldOf(target, "location")` (line 708) and emits it verbatim: no coarsening is applied at read time either.

### Reproduction (hostile fixture, all markers unique)

Fixture: public business object `td002-biz` with fields `"location": "999 Secret Lane, Grand Junction, CO 81501"` and `"street": "999 Secret Lane, Grand Junction, CO 81501"` and `"service_address": "888 Hidden Ave, Fruita, CO 81521"`, driven through `answerAskFyd` with a stub bundle loader (the same function the route serves).

- Question: "Tell me about this business"
- Answer contained: `Location on record: 999 Secret Lane, Grand Junction, CO 81501.`
- The `"service_address"` field was correctly coarsened to `Fruita, CO 81521`; the `"street"` and `"location"` fields passed through verbatim at the seam (`applyFieldVisibility(graph, [])` unit assertion confirmed both verbatim).

Test evidence: 13/13 hostile tests passed, including this leak reproduction (`td-002-hostile.test.ts`, temporary file, removed after the run; a permanent copy is kept at `~/workspace/fyd-factory/tournaments/td-002/td-002-hostile.test.ts` for re-running).

### Scope note

The two demo tenants use `address_*` field names, which are covered by the coarsening rule, so the gap is latent for them. It is active for any source graph that puts street-level detail in a field named `street`, `location`, `hq`, `geo`, or similar. The same seam (`applyFieldVisibility`) feeds the render path, so this is a shared-mechanism gap, but it was reproduced here specifically through the Ask FYD path, which LANE-SEC did not cover.

## Wiring seam finding: the concierge is not wired into any live path

`~/workspace/fyd-factory/patches/ask-concierge-wire.patch` is **unapplied**. Verified on the Pig: `grep` for `answerConciergeQuestion|matchConciergeQuestion|concierge` in `src/fyd/ask/answer.ts` returns nothing; `answer.ts:8` imports only the legacy `composeAnswer` from `../../lib/ping/ask-composer`.

The actual live chain is:

```
ask-fyd-widget.tsx --POST /api/fyd/ask--> ask-pipeline.ts: handleAskRequest
  --> visitor-answer.ts: answerAskFyd --> answer.ts:63 composeAskFyd
  --> lib/ping/ask-composer.ts: composeAnswer (legacy composer)
```

Consequences:

- The concierge's safety invariant (throw rather than render a SUPPORTED/DERIVED/INFERRED claim without evidence; 28 tests green) protects **nothing in production**. The live path relies on the legacy composer plus the `publicGraphOf` projection.
- A leak through the legacy path counts as a finding per the task brief, and Finding 1 above is exactly that.

## Supporting finding A: owner HIDE decisions have no effect on Ask FYD (latent divergence)

- The field-visibility mechanism honors HIDE: `applyFieldVisibility(graph, [hideDecision])` drops the field (`field-visibility.ts:107`; proven by test).
- The render seam accepts decisions (`buildRenderContext(..., ownerDecisions)`).
- But `answerAskFyd` hardwires `applyFieldVisibility(graph, [])` (`visitor-answer.ts:184`) with no way to supply decisions. Proven by test: with an owner HIDE decision on the business `phone` field, Ask FYD still answered `Phone on record: 970-555-0100.`
- Currently latent: owner decisions have no production persistence (the only HIDE UI, `demo-owner-console.tsx`, keeps them in memory; the fact-level `projectPublicFacts()` in `owner-mode/visibility-policy.ts` is called only by that demo console despite its docstring claiming Ask FYD consumes `publicFacts`). The moment decisions become persistent, ask and render will diverge: render hides, ask answers.

## Supporting finding B: the concierge performs zero visibility filtering (caller-trust)

- `answerConciergeQuestion` (`src/fyd/ask/concierge.ts:843`) builds its view in `buildGraphView` (line 350) with no `visibility === "public"` check anywhere; `conciergeInputFor` (line 964) is a pass-through. Its input contract (line 112) requires the caller to pass "the visible graph".
- Driven directly with an unprojected graph (private person + private service included), the concierge emitted the private owner as a SUPPORTED claim (`Person on record: ZZZ-PRIVATE-OWNER Quinn Mallory...`) with the private object in its evidence refs, and likewise the private service. Proven by test.
- Control: with the projected (public-only) graph it leaks nothing and still names the public tech/service (non-vacuous).
- The unapplied wiring patch would feed it `ctx.base` from `composeAskFyd`, which is public-projected on the route path, so wiring per the patch would be safe *on that path*. But `composeAskFyd` is also called by the lineage tracer (`src/fyd/lineage/tracer.ts:944`) with a different context, and any future caller handing it an unprojected graph gets cited private data with no backstop. The concierge's grading invariant is about evidence, not visibility; visibility is entirely caller-enforced.

## What held (verified, not vulnerable)

Private *objects* (`visibility: "private"`) do not leak through the live path:

- who-questions name the public person but not the private owner (and not the private cell `970-555-0199`); the branch firing was verified non-vacuous via the public-person control.
- services questions list the public service but not the private one.
- `objectId` pointing at a private object fails closed as `unknown_object` (404).
- Relationships incident to private objects are dropped by `publicGraphOf` (both-endpoints-public filter).
- `mode: "owner"` grants nothing; the private owner stays hidden.
- where-questions prefer the public location object over verbatim fields.

This matches the existing suite's `non-public objects are never cited or quoted` test. The deactivation path (`deactivate_object` sets `visibility = "private"` in `fyd-tenant-graph.ts:315`) flows through the same filter.

## Evidence inventory

- Hostile suite: 13/13 pass on the Pig (`npx jest --config src/fyd/ask/jest.config.cjs td-002-hostile`). Permanent copy: `~/workspace/fyd-factory/tournaments/td-002/td-002-hostile.test.ts`. Every leak assertion is paired with a control assertion proving the answering branch fired (tests are not vacuous).
- Full ask suite after cleanup: 158 tests, 157 pass on first run with 1 flaky failure in `route.test.ts` (stub-journal timing: "PING gateway unreachable", then recovery); 15/15 pass on re-run. I modified no source files, so the flake is pre-existing.
- Wiring grep evidence: `answer.ts` contains no concierge reference; `visitor-answer.ts:465` calls `composeAskFyd`; `ask-pipeline.ts` imports `answerAskFyd` from `@/fyd/ask/visitor-answer`.

## What was not done

No fix was applied (per the task brief). The Pig repo was left with no new, modified, or deleted tracked files; the temporary test file was removed. The 103 pre-existing modified/untracked entries from other lanes were untouched.

## Recommended follow-ups (for the parent, not executed)

1. Extend the conservative default in `resolveFieldVisibility` beyond the name-contains-"address" heuristic, or coarsen at the composer read site, so street-level detail cannot reach visitors verbatim regardless of field naming. This closes the one confirmed live-path leak.
2. Thread owner visibility decisions into `answerAskFyd` (currently `[]`) before decisions gain production persistence, or the ask/render divergence in Finding A becomes a live leak.
3. Decide the concierge's fate: either land the wiring patch (route path feeds it projected data, safe) plus a defense-in-depth visibility filter inside `buildGraphView`, or document that the concierge must never be called with unprojected data. Do not wire it anywhere that can pass a raw graph (e.g., the lineage tracer path).
4. Correct the `projectPublicFacts` docstring, which claims Ask FYD consumes `publicFacts`; it does not.
