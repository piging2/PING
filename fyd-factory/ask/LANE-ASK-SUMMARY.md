# LANE-ASK summary: minimal evidence-backed Ask FYD concierge

Date: 2026-09-23. Branch: fyd-factory (Pig repo /home/nolan/projects/ping).

## What was built

`src/fyd/ask/concierge.ts` (new file, 971 lines) extends the existing ask
lane; it does not replace it. It answers exactly the seven canonical visitor
questions from the visible object graph only:

1. "What does this business do?" (profile)
2. "What services do they offer?" (services)
3. "Where do they operate?" (where)
4. "Who works here?" (who)
5. "How do you know?" (provenance)
6. "What information conflicts?" (conflicts)
7. "What don't you know?" (unknowns)

Every claim carries one grade:

- SUPPORTED: restates evidence directly (object field, relationship, owner
  value, website statement). Must cite >= 1 evidence item; the module throws
  instead of rendering a SUPPORTED claim without evidence.
- DERIVED: computed from evidence (counts, comparisons, merged lists).
  Must cite every input.
- INFERRED: labeled inference from evidence (e.g. "coppersmithplm looks like
  a website username, not a personal name"). Must cite its basis.
- UNKNOWN: no evidence exists; stated explicitly, cites nothing. UNKNOWN is
  the honest answer, not a failure.

`answerConciergeQuestion(input)` is a pure function: same graph + question
gives the same answer (no dates, no randomness, all lists sorted).
`matchConciergeQuestion(question)` returns null for anything outside the
seven, so the existing composer keeps the long tail.
`toAskFydAnswer(ans)` converts a concierge answer onto the existing
AskAnswer-shaped pieces (answer text with [n] markers, evidenceRefs,
claimClassifications, unknowns), so the route and widget need no changes.

## Tests

`src/fyd/ask/__tests__/concierge.test.ts` (new file, 529 lines), picked up by
the existing jest config. 28 tests, all passing:

- matcher: 7 canonical questions map to ids; case/punctuation-insensitive;
  non-concierge questions return null; "what does this business do" is
  profile, not services.
- happy-place x 7 and coppersmith-plumbing x 7 (14 pairs): grading contract
  asserted on each (every claim graded, SUPPORTED/DERIVED/INFERRED cite
  evidence, UNKNOWN says unknown, [n] markers resolve, deterministic).
  - happy-place "who works here" -> UNKNOWN (no person records; the
    taylor@ email never becomes a person).
  - coppersmith "who works here" -> SUPPORTED person record "coppersmithplm"
    + INFERRED username reading + UNKNOWN real name.
  - both sites "conflicts" -> none found (DERIVED, compared records cited).
  - happy-place unknowns include people/hours/owner; coppersmith unknowns
    include pricing/owner; known facts are not listed.
- sparse-evidence fixture: UNKNOWN returned for who/services/where, nothing
  invented; "how do you know" still cites the record; "what don't you know"
  lists all seven probes.
- conflict fixture (two located_at locations): both values surfaced as
  SUPPORTED, the contradiction as DERIVED, both sides cited.
- wiring view: [n] markers align with evidenceRefs; UNKNOWN claims become
  unknowns, never citations; no SUPPORTED claim without cited evidence
  across all 14 site/question pairs.

Full ask lane suite: 152 tests across 9 suites, all passing. Only the two
new files are untracked in git; no shared file was modified.

## How UNKNOWN is surfaced

Rendered inline as `[UNKNOWN] <fact>: unknown. <reason>, so I will not
guess.` plus an entry in `unknowns[]`. A question whose every claim is
UNKNOWN sets `refused: true`, which the pipeline already reduces to the
"unknown" answer class (widget shows the honest fallback copy).

## Wiring status

WIRING GAP (by design, per lane rules): the concierge is NOT yet called by
the live pipeline. Shared file `src/fyd/ask/answer.ts` was read but not
modified. The wiring is delivered as a patch proposal:

  /home/nolan/workspace/fyd-factory/patches/ask-concierge-wire.patch
  (also: ~/workspace/fyd-factory/patches/ask-concierge-wire.patch locally)

It inserts concierge routing into `composeAskFyd` after site-patch intent
detection and before the generic composer. Verified with
`git apply --check` (applies cleanly). To activate:

  cd /home/nolan/projects/ping
  git apply /home/nolan/workspace/fyd-factory/patches/ask-concierge-wire.patch
  npx jest --config src/fyd/ask/jest.config.cjs

Effect once applied: both POST /api/fyd/ask and POST /api/fyd/ask/[siteId]
route the seven questions through the concierge (the widget posts to these
routes, so no widget change is needed). The 3-class reducer maps grades to
supported/derived/unknown automatically.

## Notes / caveats

- Tests answer from the pinned fixture base graphs (the same digests
  getFydTenantGraph serves), with no journal overlays: hermetic and honest.
- "What does this business do?" quotes the description verbatim, including
  the fixture's mid-sentence truncation on coppersmith; the concierge never
  completes truncated text.
- No em dashes in user-facing copy; no JSX in the module (server-side TS
  only); no customer-specific logic (generic graph shapes only).
