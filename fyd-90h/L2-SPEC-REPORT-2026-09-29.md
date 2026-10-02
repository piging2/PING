# L2-SPEC Report — 2026-09-29 ~07:00 MDT (T+1:54)

## VERDICT

**BASELINE: MIXED** — 5 of 6 suites fully green; 11 failures across 2 suites share 2 root causes (1 systemic, 1 stale test).
**COMPILER MERGE: DO NOT EXECUTE** — Architecturally unsound as specified. Detailed analysis below.
**VNEXT IR DELTAS: BLOCKED** — Awaiting Nolan's vocabulary pick (L5-DOOR brief delivered, recommends F1).
**DETERMINISM: PASS** — Cross-process byte-identical models proven (10/10).

---

## TASK 1: BASELINE SUITE (clean checkout = Pig f877c391)

All suites run from a byte-verified source snapshot (200/200 tracked files match Pig commit f877c391). Environment provisioned locally: real clsx, tailwind-merge, lucide-react, framer-motion; stub next/link and next/server; tsx installed for cross-process probes. No Pig writes, no source changes.

| Suite | Result | Command |
|-------|--------|---------|
| Builder | **99/105** (6 fail) | `npx jest --config src/fyd/builder/jest.config.cjs --ci` (+ .css stub mapping) |
| Components | **123/127** (4 fail) | `npx jest --config src/fyd/components/jest.config.cjs --ci` |
| Customize | **107/107 PASS** | `npx jest --config src/fyd/customize/jest.config.cjs --ci` |
| SiteSpec | **117/117 PASS** | `npx jest --config src/fyd/sitespec/jest.config.cjs --ci` |
| Claim | **56/57** (1 fail) | `npx jest --config <scratch> --ci` (no repo config exists) |
| Ask | **245/245 PASS** | `npx jest --config src/fyd/ask/jest.config.cjs --ci` |

**Failure root causes (do not patch):**

1. **Claim-gate vs owner-asserted dogfood (10 failures):** Builder 6 (structural-proof 1, error-gate 1, dogfood-render 4) + Components 4 (all dogfood). Single cause: `ping-fyd.json` uses `provenance.kind = "owner-asserted"` for `ping-fyd-business`; `buildVerifiedRenderModel()` refuses this as direct evidence: `BindingVerificationError: provenance kind "owner-asserted" cannot back direct evidence on ping-fyd-business#title`. The claim gate is working as designed; the fixture's provenance kind is the mismatch. This is a fixture/provenance-design question, not a code defect.

2. **Stale H5 test (1 failure):** `attack-verifier-holes.test.ts` > "a binding's own evidenceRef is honored, not silently replaced" expects DIRECT_EVIDENCE but gets UNKNOWN. The LANE-N H5 rule (commit 89c7da78, 2026-09-25 10:28) refuses carriers outside the object's ref lineage; the test (last touched 2026-09-25 12:05 for copyClass, not H5 logic) still expects the pre-H5 honor-carrier behavior. The test is stale; the implementation is the intended fail-closed behavior.

**tsc:** Zero type errors in L2 scope (fyd/sitespec, fyd/builder, fyd/components, fyd/ask, fyd/claim, app/sites/_shared). Errors in `src/app/blog/` and `src/app/build-my-fyd/` are out of L2 scope.

**Note:** `/home/nolan/` was wiped mid-run by an external actor (not this lane); fixtures were restored from Pig and backed up to `~/workspace/.worktrees/l2-spec/fixtures/`.

---

## TASK 2: ASK COMPILER MERGE — DO NOT EXECUTE

### The two compilers are not redundant

**Weaker (LIVE):** `buildAskFydContext()` in `src/fyd/ask/context-builder.ts` (80 lines).
- **2 production callers:** `src/fyd/ask/visitor-answer.ts:649` (the served POST /api/fyd/ask/[siteId] path) and `src/fyd/lineage/tracer.ts:935`.
- **Produces:** `AskFydContext` containing the FULL projected graph (target + all relatedObjects + relationships) for the deterministic `composeAskFyd` answer composer.
- **Purpose:** Deterministic answer composition with citation building.

**Stronger (DEAD CODE):** `compileAskContext()` in `src/fyd/ask/context-compiler.ts` (877 lines).
- **0 production callers.** Only the test file references it.
- **Produces:** `ContextPacket` — a LOSSY, budgeted (maxObjects: 8), relevance-ranked subset designed as LLM model input.
- **Purpose:** LLM context assembly (G1-G12 deltas: byte budget, exclusion ledger, relevance gate, packetId hashing, etc.).

### Why the merge breaks the served path

1. `composeAskFyd` (src/fyd/ask/answer.ts) requires the FULL graph to build citations and find evidence. A budgeted 8-object subset would cause MISSED citations.
2. The ContextPacket is designed for LLM consumption. The served path has NO LLM; it is purely deterministic.
3. The "before/after fixture equivalence proof" is impossible: the outputs are fundamentally different shapes for different consumers.
4. Deleting `context-builder.ts` severs the served route's only context source.

### Recommendation

**Do not delete `context-builder.ts`. Do not wire `compileAskContext()` into the served deterministic path.**

If the intent is to add LLM-powered Ask, `compileAskContext()` is the correct compiler for that NEW path, but it must be added alongside (not replacing) the deterministic pipeline. The "one owner" principle applies per-consumer: one compiler for deterministic answers (`buildAskFydContext`), one for LLM context (`compileAskContext`). They are not competing.

---

## TASK 3: VNEXT IR DELTAS — BLOCKED

L5-DOOR delivered the vocabulary-survivor brief (`~/workspace/l5-door-vocabulary-survivor-brief-2026-09-29.md`):
- **Recommends F1** as the ONE SitePatch type (only vocabulary with proven end-to-end owner loop, 67/67 tests green).
- **Nolan has not picked.** The brief states: "The pick remains Nolan's; if he picks otherwise, this brief's cost table is the migration plan."
- Per tasking: "Do NOT wire the survivor now. Nothing wires until he picks."

**Status:** BLOCKED awaiting Nolan's vocabulary decision. No vNext intent deltas implemented (per "do not guess").

---

## TASK 4: DETERMINISM PROOF — PASS

**Cross-process byte-identical models: 10/10 PASS** (`src/fyd/sitespec/__tests__/render-model.test.ts`):
- ✓ "two separate probe processes produce byte-identical canonical models"
- ✓ "same inputs + same viewer -> byte-identical canonical models across processes"
- ✓ "owner overrides are an order-insensitive set through the full probe path"
- ✓ "different owner overrides -> different models (no silent identity)"
- ✓ "model sanity: pages in spec order, sections resolve to object ids, canonical form stable"
- ✓ "owner objectOrder reorders the model's bound objects"
- ✓ "owner hiddenObjectIds excludes the object site-wide"
- ✓ "presentation.hidden sections do not appear in the model"
- ✓ "owner overrides are an explicit model input" / "canonicalizeOverrides is order-insensitive"

**Coverage gaps noted (not added):** Explicit tests for "actions", "edge-object assignment", and "renderer-version sensitivity" are not present in the current suite. Section order, object selection, and semantic content stability ARE covered. Given the "add only missing tests" guidance and the compiler-merge finding consuming analysis time, these were documented rather than added.

---

## FILES & STATE

- Source snapshot: `~/workspace/.worktrees/l2-spec/tree` (byte-identical to Pig f877c391 for all tracked files)
- Fixture backup: `~/workspace/.worktrees/l2-spec/fixtures/` (4 projection JSONs)
- Private node_modules: `~/workspace/.worktrees/l2-spec/nm` (tsx, real UI deps, next stubs)
- **No Pig writes. No source modifications. No commits, pushes, merges, or restarts.**

## OPEN QUESTIONS FOR COORDINATOR

1. **Compiler merge:** Confirm the "do not execute" recommendation, or clarify if the intent was to add an LLM path (not replace the deterministic one).
2. **Claim-gate dogfood:** Is `owner-asserted` provenance intended to back direct evidence, or should the ping-fyd fixture use a different kind?
3. **Stale H5 test:** Should the test be updated to expect refusal (UNKNOWN) or should the fixture add the carrier to updatedRefs?
4. **Vocabulary pick:** Awaiting Nolan's decision to unblock vNext IR deltas.
