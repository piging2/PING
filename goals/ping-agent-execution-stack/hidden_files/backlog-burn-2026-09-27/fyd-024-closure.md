# FYD-024 closure: Ask FYD answers versioned against graph snapshot (stale-mark on regen)

Repo: `~/workspace/fyd-build`, branch `fyd-016-correct-survival`, base HEAD `c6e35d3`.

## Gap (triage 2026-09-27, read-only, verified)

`AskFydAnswer` had no graphVersion/specVersion/snapshot field
(`src/fyd/ask/types.ts`); no stale-mark existed anywhere on the ask
path. An answer composed against graph v1 was indistinguishable from
one composed against v2 after a regeneration. A user could act on a
stale answer with no signal.

## Harvest notes (harvest before writing)

- Digest discipline (NORTH STAR rule 16): digests pin identity. The
  regen machinery (FYD-021, `src/fyd/regen/regenerate.ts`) already
  versions graphs v1 -> v2 with object-level diffs, and the patch
  machinery (`src/fyd/proceduralize/patch.ts`) has the canonical
  recipe: `canonicalize` (sorted keys, volatile fields stripped) then
  sha256 (`proposalDigest`). The answer snapshot pin REUSES this
  recipe: no second versioning scheme was invented.
- Ask-path sourcePointer convention (`web:sha256:<digest>`) already
  exists on `ResolvedEvidence`; the snapshot pin is formatted
  `sha256:<hex>` to match.
- Composition sites: `baseAnswer()` in `src/fyd/ask/answer.ts`,
  `composeAskFyd` (copies the pin from the context), and the
  `unknown_object` refusal literal in `src/fyd/ask/visitor.ts` (all
  three updated; tsc pins this).
- The ask lane is self-contained and deterministic (types.ts header:
  no LLM, no network, no lib/ping modules). The pin function lives
  in the lane: `src/fyd/ask/snapshot.ts`, pure, no I/O, no clock.
- The pin is computed over the UNFILTERED graph (the loader holds
  it), not the viewer-filtered context: the digest is stable across
  viewer modes and changes if and only if the graph content changes
  (objects/relationships sorted by id before hashing, so it is
  order-independent).

## Step 1: the failing probe (written first, watched fail)

`src/fyd/ask/__tests__/fyd-024-snapshot.test.ts` asserts:

(a) every answer composed through `answerVisitorQuestion` carries
    `graphSnapshot` equal to `graphSnapshotPin(graph)` of the graph
    it was composed against;
(b) `withSnapshotFreshness(v1Answer, v2Graph)` (v2 = v1 with one
    service title changed, i.e. a regen) returns `stale === true`
    with the stale notice visible in the served answer text; serving
    a fresh answer against its own graph stays `stale === false`
    with the text untouched;
(c) interplay: a stale answer that also carries an FYD-011 flagged
    conflict shows BOTH the stale notice and the conflict flag;
(d) the refusal-shaped answer also carries the pin (an
    `unknown_object` answer is still versioned).

Ran BEFORE the delta: the suite failed because `../snapshot` did
not exist (import error: "Cannot find module"). The watched failure
is recorded in the run below.

## The delta (smallest)

1. `src/fyd/ask/snapshot.ts` (new):
   - `graphSnapshotPin(graph: ObjectGraph): string` — canonicalize
     (sorted keys, deep) the graph with objects/relationships sorted
     by id, sha256, return `sha256:<hex>`.
   - `withSnapshotFreshness(answer, currentGraph): AskFydAnswer` —
     compare `answer.graphSnapshot` against the current pin. Equal:
     return the answer unchanged. Different: return the answer with
     `stale: true` and the stale notice prepended to the answer
     text (user-facing, in the served bytes).
2. `src/fyd/ask/types.ts`: `AskFydContextInput` gains pinned key
   `graphSnapshot: string`; `AskFydAnswer` gains pinned keys
   `graphSnapshot: string` and `stale: boolean`.
3. `src/fyd/ask/load-fixture.ts`: `buildInputForSite` computes the
   pin from the graph it holds.
4. `src/fyd/ask/context-builder.ts`: `PINNED_INPUT_KEYS` gains
   `graphSnapshot`; the built context carries it through.
5. `src/fyd/ask/answer.ts`: `baseAnswer` takes the pin from the
   context (`composeAskFyd` stamps `graphSnapshot: ctx.graphSnapshot`,
   `stale: false` at composition). No other composer change.
6. `src/fyd/ask/visitor.ts`: the refusal literal computes the pin
   from `args.graph`; added `serveAskFydAnswer`-style entry is NOT
   wired into dev-server (it composes fresh); `withSnapshotFreshness`
   is the serve-time hook for stored answers.
7. `src/fyd/ask/__tests__/contract.test.ts`: `PINNED_ANSWER_KEYS`
   gains `graphSnapshot`, `stale` (contract evolution, same pattern
   FYD-011 used for conflicts).
8. Manual-input tests (`conflict-surfacing`, `fyd-010-field-gate`)
   gain the `graphSnapshot` key.

## Stale behavior picked and why

STALE-MARK, not refusal. Rationale: the ask lane's standing
contract is "never drop silently" (evidence refs, FYD-009
recomposition). Refusing to serve would destroy the composed answer
the user asked for; a visible stale notice preserves the served
experience while being honest, and it is the only behavior that can
show an FYD-011 conflict flag and a staleness signal on the same
answer at once.

## Interplay

- FYD-010 privacy: the pin is a one-way sha256 over the canonical
  graph; it reveals nothing about field values. The stale notice
  contains no object data. No leak path added.
- FYD-011 conflicts: the conflict flag note is appended by
  `withConflicts`; the stale notice is prepended by
  `withSnapshotFreshness`. The probe's case (c) proves both appear.

## Verification

- `npx jest src/fyd/ask` — 8 suites, 79 tests, all pass
  (includes the new `fyd-024-snapshot.test.ts` failing probe, now
  green, and `fyd-024-serve-proof.test.ts`).
- `npx tsc --noEmit` — clean.
- Full `npx jest` — 32 suites, 273 tests, all green.
- Served-path proof: `src/fyd/ask/__tests__/fyd-024-serve-proof.test.ts`
  (ephemeral port, production :3100 untouched): composes a real
  answer against the V1 fixture graph via `answerVisitorQuestion`,
  runs the REAL FYD-021 `regenerate()` on modified source bytes to a
  V2 graph, serves the stored v1 answer through
  `withSnapshotFreshness` over HTTP, asserts the stale notice is in
  the served bytes, `stale: true`, the original pin preserved, and a
  fresh v2 answer served clean. PASS.

## New invariant honored

source tree != built artifact != served artifact: the proof
asserts on the SERVED BYTES (HTTP body), not on the source tree or
the in-memory object.

## Commit

Committed locally on `fyd-016-correct-survival` (never pushed).
See git log for the FYD-024 commit.
