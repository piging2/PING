# FYD-011 closure: Ask FYD conflict surfacing

Date: 2026-09-27. Implementer: FYD-011 subagent (depth 2).
Repo: ~/workspace/fyd-build. Branch: `fyd-011-conflict-surfacing`, commit `ba1bbc1`.
HEAD on arrival: `b0cef74` (verified). Not pushed (Nolan's rule).

## The gap (triage 2026-09-27, read-only, verified)

Directive 6 makes conflict-preservation standing law. The detection half was
proven: `src/fyd/refresh/conflict.ts` detects value disagreements across
sources, keeps both claims with full provenance, ships a ready-made
visitor-facing `conflictSurfaceText`, and `conflict.test.ts` (6 tests, node
--test) proves detection plus "resolution keeps the loser." But Ask FYD was
completely blind: zero conflict references anywhere in `src/fyd/ask/`. An
answer whose content carried a flagged conflict presented the
projection-policy winner with no conflict flag and no path to the losing
evidence chain.

## Step 1: the failing probe FIRST

Wrote `src/fyd/ask/__tests__/conflict-surfacing.test.ts` (10 tests) BEFORE
any implementation. First run failed exactly as designed: ts-jest type
errors, `Property 'conflicts' does not exist on type 'AskFydContext' /
'AskFydAnswer'`, zero tests executed. Two probe-only fixture bugs fixed
after implementation (business title contained the substring "conflict";
identity answer prints top-level `description`, not `fields.description`).

One probe design note: the probe does NOT import the runtime detector.
The refresh lane uses `.ts`-extension imports (node --test/tsx convention)
which ts-jest rejects with TS5097, and jest's testMatch does not cover the
refresh lane. Detection is already proven by `conflict.test.ts`; the probe
pins ask-side *consumption* of the `Conflict` record (assembled literally,
typed as `Conflict`). Type-only imports from `../refresh/types` are erased
at compile, so the ask lane has no runtime dependency on the refresh lane.

## The delta (smallest; harvest before writing)

No second conflict model, no second surfacing vocabulary, no new
authorities. `claims.ts` stays the generation-time authority; the binding
verifier stays the render-time field-read layer.

- `src/fyd/ask/types.ts`
  - `AskFydContextInput.conflicts: Conflict[]`: generation-side open
    conflicts for the target object. The ask path never detects.
  - `AskConflictSurface { conflict: Conflict; winnerClaimId: string;
    loserClaimId: string }`: the full record (both claims kept, harvested
    `surfaceText`) plus the projection-policy winner/loser assignment.
  - `AskFydAnswer.conflicts: AskConflictSurface[]` (pinned keys extended).
  - `loserClaimOf()` helper with a fail-closed broken-surface error.
- `src/fyd/ask/context-builder.ts`
  - `conflicts` added to the pinned input keys (extra-key rejection holds).
  - `filterConflicts()`: keeps only `status === "open"`, entityId matching
    the target object, and (for non-demo_owner) `maySeeField(conflict.field)`
    — the FYD-010 field gate applies to the conflict path, so an owner-only
    field conflict (phone/email/home_address) never enters the visitor
    context. demo_owner keeps the owner-field conflicts (demo seam label,
    not an auth upgrade). Deterministic: input order preserved.
- `src/fyd/ask/answer.ts`
  - `assignWinnerLoser()`: the website claim is the presented winner when
    the pair has one (the projection is website-derived); otherwise the
    first claim. The loser is never deleted.
  - `surfacedConflicts(ctx, presentedFields)`: an answer carries only
    conflicts whose field its template actually presented (identity:
    title+description; services: title).
  - `conflictFlagText()`: appends `[conflict flagged] ` + the harvested
    `surfaceText` VERBATIM, then the losing evidence chain (loser label,
    sourceUrl, observed date, evidenceRef) and the WHY THIS?
    (`view_why_this`) path for full provenance of both claims. The flag
    note is disclosure text, not an evidence citation, so it does not go
    through FYD-008 claim validation; no new claim machinery in ask.
  - `noEvidenceAnswer` paths carry `conflicts: []`: if the question cannot
    be answered, no winner is presented, so no flag.
- `src/fyd/ask/load-fixture.ts`: `conflicts: []` with a doc note — the
  loader has no claim store and cannot produce generation-side conflicts;
  callers attach them before building the context.
- `src/fyd/ask/visitor.ts`: the `unknown_object` refusal shape carries
  `conflicts: []`.
- Tests: `contract.test.ts` pinned input/answer keys extended with
  `conflicts`; `fyd-010-field-gate.test.ts` `inputFor` carries
  `conflicts: []`.

## Verification

- Full jest suite: 28 suites / 252 tests PASS (includes the 10 new probe tests).
- `tsc --noEmit`: clean.
- Refresh lane `npm run test:refresh` (node --test): 21/21 PASS (detection half untouched).
- Served-path proof (source != built != served invariant):
  - Rebuilt `dist/` via `npm run build:server` (binds HEAD `ba1bbc1` source
    to the built artifact).
  - `/tmp/fyd-011-served-proof.cjs` serves the BUILT ask modules over HTTP
    on an ephemeral port (46159; production :3100 untouched), builds the
    conflicted fixture with the REAL `detectConflicts` +
    `conflictSurfaceText` (compiled from the refresh lane sources), and
    POSTs "What is this business?" for the happy-place fixture.
  - 12/12 checks PASS: served 200; winner presented; `[conflict flagged]`
    marker; harvested surfaceText verbatim; exactly one conflict carried
    (phone conflict gated out); winner = website claim; loser = facebook
    claim with both claims kept; loser evidence ref named in the answer;
    `view_why_this` offered; no phone value anywhere in the served JSON;
    no phone conflict surfaced.
  - Served answer excerpt: "Happy Place Carpentry LLC [1]: Licensed Oregon
    carpentry contractor ... [conflict flagged] Conflict on
    website-business-9d13c4196b4f1092 field 'description': your website ...
    says '...', while the synthetic Facebook fixture (labeled test data)
    ... says 'Boutique furniture studio ...'. Both claims are kept with
    their provenance. Tell me which one is right, and I will regenerate
    only the affected sections. The losing claim is preserved with its
    provenance and shown under WHY THIS? (view_why_this): proof-fb-desc
    via https://facebook.com/happyplace, observed 2026-09-27, evidence ref
    served-proof:proof-fb-desc."

## Harvest notes

- `Conflict` type, `detectConflicts`, `conflictSurfaceText`: reused from
  `src/fyd/refresh/conflict.ts`; nothing re-modeled.
- Privacy interplay: the FYD-010 field gate (`maySeeField` from the one
  shared visibility policy) is applied to the conflicted FIELD at builder
  time, so a visitor can never pull owner-only values through the conflict
  path. Asserted in the probe (builder + answer levels) and in the served
  proof (phone conflict over the real happy-place fixture).
- Winner semantics: projection-policy winner = the claim the projection
  already presents. The projection is website-derived, hence the website
  claim wins when present. Documented in `assignWinnerLoser`.
- Open follow-up (out of this delta's scope): no persisted conflict store
  exists yet, so the served `/api/ask` route still supplies `conflicts: []`
  via `buildInputForSite`. When the generation side persists conflicts,
  the loader (or the route) attaches them to the input; the ask-side
  machinery already consumes them.

## Budget

Deterministic + headless labor only. Zero paid calls. No Copilot used.
