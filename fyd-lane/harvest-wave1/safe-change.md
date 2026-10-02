# FYD Safe-Change / Regeneration Harvest - Wave 1 (READ-ONLY lane)

Date: 2026-09-21. Lane: external-mechanism harvest for SAFE CHANGE/REGENERATION.
Product: FYD Social - deterministic website generator (OBJECT GRAPH -> SITE SPEC -> RENDERER -> BROWSER).
Frontier: OWNER CORRECTION + SOURCE REFRESH + OWNER CUSTOMIZATION must not clobber each other.

## Bounded harvest question

"An owner corrects a fact, then the source refreshes, then the site regenerates. Which exact mechanism gives each change a content-derived stable identity, makes patches idempotent, and preserves owner customizations across regeneration - without a CRDT sledgehammer where a simpler mechanism suffices?"

## Local baseline (stays hot)

DETERMINISTIC TRANSITION IDENTITY: canonical content -> stable ID -> idempotent append. Same logical change always yields the same identity, so replays and retries never duplicate or lose owner intent.

Local evidence this lane verified:
- `~/workspace/fyd-lane/harvest-report.md` C1 (2026-09-21, PING forensic): `event_id = SHA-256(JSON.stringify({eventType, source, [namespace], logical_id|payload}))`, `INSERT ... ON CONFLICT (event_id) DO NOTHING`. Same logical event hashes identically across processes; re-emit is a safe no-op. Known flag: JSON.stringify key order is not a canonical serializer; a canonical-bytes rule is required before depending on it.
- Truth-model transition ladder: PROPOSED -> APPROVED -> ACCEPTED -> OBSERVED_COMPLETE (concept/sketch stage, enforcement gap open).
- `~/workspace/fyd-lane/repo/graph.ts`: object graph (objects with id/fields/visibility/provenance.ref, relationships), `verifyPresentationBinding` fail-closed verifier, four binding classifications incl. `owner_authored`.
- `~/workspace/fyd-lane/repo/render-model.ts`: semantic determinism contract (same SiteSpec + graph snapshot + ViewerContext + OwnerOverrides + renderer version -> same render model); owner overrides recorded explicitly in the model; `RENDER_MODEL_VERSION` bump discipline.
- Greenfield finding: `grep -rin "patch|transition|correction"` across `~/workspace/fyd-lane/repo/*.ts` and `work/*.ts` returns NOTHING. FYD has no patch/transition machinery yet. Everything below composes with the identity kernel; nothing collides with existing code.

## Budget note

GitHub API: 1 call used total (a `GET /rate_limit` probe via the Pig bridge BEFORE the freeze notice arrived). Zero calls after the freeze. All SHA/LICENSE fields below are therefore TBD except where a raw file read (not API) supplied the value. Raw `raw.githubusercontent.com` reads and docs pages do not consume API quota and were used freely.

---

## CARD C1 - RFC 6902 JSON Patch + `test` preconditions (reference implementation: fast-json-patch)

PROJECT: fast-json-patch (Starcounter-Jack/JSON-Patch) - TypeScript implementation of RFC 6902 JSON Patch.
PINNED SHA: TBD (budget frozen; pin at release).
LICENSE: MIT (read directly from package.json on master branch, 2026-09-21; not an API call).
RECENT ACTIVITY: master package.json reads version 3.1.1; commit recency TBD at pin pass.
FYD PROBLEM: (a) owner correction and source refresh touching the same fact must not silently clobber each other; (b) replaying an already-applied transition must be provably safe; (c) approval needs a dry-run gate.

MECHANISM: A transition is a JSON Patch op array (RFC 6902: add/remove/replace/move/copy/test). The `test` op asserts a pre-image value at a path and aborts the whole patch (fail-closed) when it mismatches. `compare(before, after, invertible=true)` emits each change preceded by a `test` op on the old value, so every patch carries its own precondition. `applyPatch(doc, patch, validate, mutateDocument=false)` applies to a deep clone, leaving the original untouched (preview-before-apply as a pure function). `validate(patch, doc)` dry-runs a patch without applying it (approval gate). Re-applying an already-applied guarded patch throws `TEST_OPERATION_FAILED`: replay is not silently idempotent, it is fail-closed with a typed conflict. Combined with the local journal dedup (same transition ID -> second append is a no-op), the two halves cover both failure modes: retry-after-success dedups in the journal; apply-against-changed-world fails closed instead of clobbering.

EXACT IMPLEMENTATION: repo layout per README: `src/` TypeScript source, `commonjs/` + `module/` + `dist/` build outputs. Symbols: `applyPatch`, `applyOperation`, `applyReducer` (reducer form: `patch.reduce(applyReducer, doc)`), `compare`, `generate`, `observe`/`unobserve`, `validate`, `deepClone`, `getValueByPointer`, `escapePathComponent`/`unescapePathComponent`. Test surface per package.json scripts: `test-core` runs `test/spec/{jsonPatchTestsSpec,coreSpec,validateSpec}.mjs`, plus duplex specs, commonjs/webpack/typings specs (jasmine). `banPrototypeModifications` defaults true (prototype-pollution guard on apply).

CLAIM EVIDENCE: README documents `TEST_OPERATION_FAILED` on test-op failure, the `invertible` compare example (`test` then `replace` pairs), and the `mutateDocument` flag semantics. All read 2026-09-21 from the master README (591 lines).
SOURCE EVIDENCE: README + package.json read via raw URLs. Individual `src/*.ts` files not inspected this pass (flagged for pin pass).
RUNTIME EVIDENCE: none executed by this lane (no npm install per lane rules). Test scripts exist per package.json; TEST EXISTS != TEST PASSES, flagged for the pin pass.
DEPENDENCY COST: zero runtime dependencies (devDeps only). Small bundle. Source targets TS 3.5 era. Alternative to depending: reimplement the core (apply + compare + validate is on the order of 200 lines), but the edge cases (array `-` index, escaping, atomic abort) are exactly what the library has already burned in.

WHAT FYD ALREADY HAS: content-derived transition IDs + append dedup (journal half). No patch representation, no guarded apply, no preview, no dry-run (all greenfield per grep).
WHAT THEY DO BETTER: precondition-guarded apply; mechanical conflict detection (pre-image mismatch -> typed error, not silent overwrite); preview-on-clone; validate-as-dry-run. The local concept makes *append* idempotent; this makes *application* safe. That is the missing half.
WHAT FYD DOES BETTER: domain-aware identity. RFC 6902 is domain-blind: a patch knows paths and values, not that this transition is stage=OWNER_CORRECTION on objectId=X by ownerId=Y at approval-ladder position APPROVED. FYD's semantic transition envelope (identity + ladder state + evidence refs) wraps the mechanical patch; they compose, they do not compete.
SMALLEST HARVESTABLE PRIMITIVE: `invertibleCompare(before, after)` -> test-guarded patch; `applyToClone(doc, patch)` -> preview; `validate(patch, doc)` -> approval dry-run; and the synthesis function `guardedPatch(patches, inversePatches)` (see C2) that builds `test` ops from pre-images.
REUSE/ADAPT/REPURPOSE/PATTERN_ONLY/REJECT: ADAPT. Adopt the RFC 6902 + test-precondition mechanism as FYD's canonical transition payload format. Library DEPEND is optional at pin time; the spec-shaped mechanism is the real harvest.
CAN IT:
- remove code? No (greenfield; it adds the change layer, replaces nothing).
- remove ambiguity? Yes. "Did this correction apply cleanly against the refreshed graph?" becomes a mechanical yes/no/typed-conflict, not a judgment call.
- improve beauty? No.
- improve expressiveness? Partially. Op arrays express field-level intent better than whole-object replacement.
- improve trust? Yes. Fail-closed apply + typed conflicts is the mechanism behind "no silent clobbering."
- improve mobile? No.
- improve accessibility? No.
- improve performance? Partially. Patches move deltas, not whole graphs, across the correction/refresh boundary.
- improve regeneration? Yes. Guarded replay of owner corrections onto a refreshed graph is exactly the regen-preservation primitive.
- reduce AI improvisation? Yes. Corrections become deterministic op arrays instead of regenerated prose; the AI proposes, the patch disposes.
FALSIFICATION EXPERIMENT: Take a graph G, record an owner correction C as an invertible patch (test+replace on `/objects/<id>/fields/phone`). Refresh the source so the same field changed underneath (G'). Apply C to G'. PASS if apply throws a typed pre-image failure and G' is untouched. FAIL (mechanism rejected) if any code path silently overwrites the refreshed value. Second leg: apply C to G twice; PASS if the second apply is either a journal dedup no-op or a typed already-applied signal, never a duplicate side effect.

## CARD C2 - Immer: patch + inverse-patch generation, fork-and-replay (reference implementation: immer)

PROJECT: immer (immerjs/immer) - immutable state via structural sharing; patches plugin.
PINNED SHA: TBD (budget frozen; pin at release).
LICENSE: MIT (read directly from package.json on main branch, 2026-09-21).
RECENT ACTIVITY: main package.json reads version 10.0.3-beta (active development line); vitest suite + import-size budget test; commit recency TBD at pin pass.
FYD PROBLEM: (a) recording an owner correction as a replayable, reversible transition without hand-writing op arrays; (b) replaying corrections recorded against graph G onto a refreshed graph G-prime; (c) undo/rollback of a correction.

MECHANISM: `produceWithPatches(base, recipe)` returns `[nextState, patches, inversePatches]`. Patches are recorded *during* mutation (no before/after snapshots needed) and are RFC-6902-like with array-form paths (normalizable to JSON Pointer by joining with `/` and escaping per RFC 6901). `applyPatches(state, patches)` replays a recorded patch set onto a *different, newer* base state: the docs' canonical example forks state, records wizard changes as patches, lets the server advance the base, then replays the fork's patches onto the new base. That is literally FYD's "owner corrects fact, source refreshes, site regenerates" flow. `inversePatches` applied in reverse undo the change (rollback primitive). Two honest caveats from the docs: generated patches are "correct but not guaranteed optimal" (post-process or compress for the journal), and `applyPatches` replay is unguarded (no preconditions; pairs with C1's `test` ops).

EXACT IMPLEMENTATION: package source entry `src/immer.ts`; patches behind `enablePatches()` plugin flag. Symbols: `produceWithPatches`, `applyPatches`, `enablePatches`, `produce`, `current`, `original`. Tests: `__tests__` vitest suite; `test:size` import-size budget (`produce enableMapSet enablePatches enableArrayMethods`). Docs page `immerjs.github.io/immer/patches` read 2026-09-21 (fork/replay and inverse examples verified in the rendered page text).
CLAIM EVIDENCE: docs state patch correctness guarantee ("applying them to an equal base object should result in the same end state") and the non-optimality caveat; fork-and-replay example is the documented primary use case.
SOURCE EVIDENCE: docs page + package.json read. `src/` patch internals not inspected this pass.
RUNTIME EVIDENCE: none executed by this lane. Vitest suite exists per package.json scripts; TEST EXISTS != TEST PASSES, flagged for pin.
DEPENDENCY COST: small, zero-dep core, tree-shakeable (`sideEffects: false`), size-budgeted upstream. Structural sharing keeps patch generation cheap on large graphs.
WHAT FYD ALREADY HAS: deterministic render from (SiteSpec + graph + overrides); owner overrides recorded in the render model. No mutation-recording or replay machinery.
WHAT THEY DO BETTER: ergonomic patch capture (write the mutation naturally, get patches + inverse free); proven fork-and-replay pattern; inverse patches as first-class artifacts.
WHAT FYD DOES BETTER: semantic identity and the approval ladder. Immer patches are anonymous op arrays; FYD wraps each replay in a content-identified, ladder-gated transition.
SMALLEST HARVESTABLE PRIMITIVE: the *pattern* `record(base, mutation) -> (patches, inversePatches)` plus `replay(newBase, patches)`; and the key synthesis: **inverse patches are pre-image carriers, so `test` ops can be generated mechanically from them** (`guardedPatch` from C1). That synthesis is a ~20-line function and is the sharpest single harvest of this wave.
REUSE/ADAPT/REPURPOSE/PATTERN_ONLY/REJECT: ADAPT the pattern; DEPEND on the library is optional at pin (small, MIT, size-budgeted, maintained). The pattern alone is implementable, but immer's structural-sharing patch generation is genuinely hard to get right by hand.
CAN IT:
- remove code? Partially. Replaces any hand-rolled diff/patch recorder FYD would otherwise write.
- remove ambiguity? Yes. A correction becomes a recorded artifact, not a remembered intention.
- improve beauty? No.
- improve expressiveness? Yes. Corrections expressed as ordinary mutations, captured exactly.
- improve trust? Yes. Inverse patches give rollback a mechanical basis instead of "regenerate and hope."
- improve mobile? No.
- improve accessibility? No.
- improve performance? Yes. Structural sharing + delta-only journal entries instead of graph snapshots per correction.
- improve regeneration? Yes. Fork-and-replay is the regen-preservation pattern: corrections survive refresh by replay, not by being baked into generated output.
- reduce AI improvisation? Yes. The correction pipeline stops asking the AI to re-derive intent; intent is captured as ops.
FALSIFICATION EXPERIMENT: Record correction patches on G via produceWithPatches. Refresh source to G' (disjoint field changed). `replay(G', patches)`; PASS if the disjoint refresh survives and the correction lands (docs' wizard/server example). Then change the *same* field in G' and replay the *unguarded* patches; PASS for the experiment (i.e., mechanism behaves as documented) if it applies without complaint, which PROVES the caveat: unguarded replay is unsafe, and therefore the C1 guard synthesis is required, not optional. If unguarded replay ever throws on its own, the docs' claim is wrong and the card's caveat is wrong; either way we learn.

## CARD C3 - jsondiffpatch: reversible deltas, identity-keyed array diff, human-readable diff rendering

PROJECT: jsondiffpatch (benjamine/jsondiffpatch) - diff and patch JavaScript objects.
PINNED SHA: TBD (budget frozen).
LICENSE: TBD (verify at pin; README carries a license badge, file not read this pass).
RECENT ACTIVITY: monorepo layout (`packages/jsondiffpatch`), ESM-only, Node 18/20+, min+gz ~16KB per README; commit recency TBD at pin pass. Diligence flag: web search surfaces several forks (swompythesecond, johnwdunn20, contentful) ahead of the canonical repo; check at pin whether the canonical repo is where maintenance happens.
FYD PROBLEM: (a) the approval step needs a human-readable preview of what a correction/refresh changes (old value -> new value), not an op array; (b) array diffing across regeneration must match objects by stable identity (object id), not by position, or a reordered services list looks like delete+recreate.

MECHANISM: `diff(left, right)` produces a delta in a compact JSON format: `[oldValue, newValue]` modified, `[newValue]` added, `[oldValue, 0, 0]` removed, moves encoded as `['', newIndex, 3]`, arrays marked with `_t: 'a'`. `reverse(delta)` / `unpatch(obj, delta)` give mechanical undo. `objectHash` option matches array items by stable identity (e.g. `obj.id`) with LCS-based move detection instead of positional matching. `propertyFilter` excludes volatile fields from diffs. Multiple output formats from one delta: pure JSON, visual HTML diff, annotated JSON, console-colored, and **RFC 6902 JSON Patch generation** (the bridge to C1's canonical format). `clone` for preview copies.

EXACT IMPLEMENTATION: `packages/jsondiffpatch/` (src + `test/examples/`); symbols: `diff`, `patch`, `reverse`, `unpatch`, `clone`, `create(options)`, `formatters` (html, annotated, console, jsonpatch). Delta format doc and formatters doc referenced from README (read the README, 424 lines, 2026-09-21; delta/format docs not opened this pass).
CLAIM EVIDENCE: README asserts reversible deltas, LCS array diffing with objectHash, and RFC 6902 output; the array example shows move detection (`_4: ['', 2, 3]`).
SOURCE EVIDENCE: README read via raw URL. Source and formatter docs not opened this pass (flagged for pin).
RUNTIME EVIDENCE: none executed by this lane. `test/examples/` exists per README; TEST EXISTS != TEST PASSES, flagged for pin.
DEPENDENCY COST: ~16KB min+gz, zero-dep core (text diffs need optional diff-match-patch). Small.
WHAT FYD ALREADY HAS: nothing at the diff/preview layer; render-model records override sets but has no old->new rendering.
WHAT THEY DO BETTER: human-readable delta rendering in four formats from one artifact; identity-keyed array diffing, which positional `compare` (C1) gets wrong on reordered lists.
WHAT FYD DOES BETTER: FYD's diffs would be *evidence-bound* (each changed field traces to claim -> evidence -> observation -> source per the verifier); jsondiffpatch deltas are value-only. FYD wraps the delta in provenance; the delta does not replace it.
SMALLEST HARVESTABLE PRIMITIVE: `objectHash`-keyed array diff for the services/objects lists + the HTML/annotated delta renderer for the owner approval preview. Canonical journal payload stays RFC 6902 (C1); jsondiffpatch is the preview/diff layer, and its own RFC 6902 output is the bridge.
REUSE/ADAPT/REPURPOSE/PATTERN_ONLY/REJECT: ADAPT for preview/diff rendering; REJECT its delta format as the canonical journal payload (non-standard, no preconditions; RFC 6902 wins).
CAN IT:
- remove code? Partially. Replaces hand-rolled diff rendering for approvals.
- remove ambiguity? Yes. Owner sees old->new per field instead of "something changed."
- improve beauty? Yes. The HTML/annotated formatters are built for human review; this is the one card that touches presentation quality of the approval UX.
- improve expressiveness? Partially. Move detection expresses reorder as reorder, not delete+add.
- improve trust? Yes. A readable preview the owner can verify before approving is the trust surface of the whole correction flow.
- improve mobile? No.
- improve accessibility? Partially, only insofar as a readable HTML diff is more accessible than an op array (formatter-dependent).
- improve performance? No.
- improve regeneration? Partially. Identity-keyed diffing makes refresh-vs-correction comparison correct on reordered lists.
- reduce AI improvisation? Partially. Deterministic diffs replace "ask the AI what changed."
FALSIFICATION EXPERIMENT: Build two graphs whose services array is reordered with one field edited. Diff with default positional matching vs `objectHash: o => o.id`. PASS if objectHash yields one `replace` on the edited field plus moves, while positional yields spurious remove+add pairs. Then render the delta to HTML; PASS if a non-technical reader can point to the changed value. If the HTML output needs a build step that breaks FYD's browser-safe constraint, the formatter half of the card fails and only the diff half survives.

## CARD C4 - Hash-chained immutable log (git object-model pattern; no dependency)

PROJECT: pattern. Primary evidence: git's content-addressed object model (commit = hash over tree + parent hashes + metadata; Merkle DAG).
PINNED SHA: n/a (pattern, not a repo).
LICENSE: n/a.
RECENT ACTIVITY: n/a; the mechanism is stable since git's inception.
FYD PROBLEM: the local transition identity hashes the *change* but binds nothing about *position in history*. Two needs pull apart: (1) "same logical change -> same ID" for cross-history dedup (retry safety), (2) "this journal is complete and ordered" for audit and replay proof.

MECHANISM: separate two identities. Transition ID = hash(canonical logical change): position-independent, so the same owner correction proposed twice (or replayed after a crash) dedups everywhere. Log record ID = hash(prevRecordId + transitionId + ladder-state + timestamp): binds each record to its predecessor, giving a tamper-evident, order-proving chain. Verification is mechanical: rewalk the chain, recompute hashes. This is exactly git's split between blob/tree identity (content) and commit identity (content + parents). The local C1 has layer 1 only; adding layer 2 does not change any transition ID, it only wraps the journal records.

EXACT IMPLEMENTATION: ~15 lines. `recordId = sha256hex(canonical({prev: prevRecordId, transition: transitionId, state: ladderState, at: isoTimestamp})))`; `verifyChain(records)` rewals and recomputes. No library.
CLAIM EVIDENCE: spec-described pattern (git object model); this lane verified the mechanism description against general references, not a pinned source file. Treat as PATTERN_ONLY with the semantics stated here.
SOURCE EVIDENCE: pattern-level; no repo pinned.
RUNTIME EVIDENCE: none; the function is trivially unit-testable (falsification experiment below is the test).
DEPENDENCY COST: zero.
WHAT FYD ALREADY HAS: layer 1 (content-derived transition IDs, append dedup). No chain binding, no order proof.
WHAT THEY DO BETTER: the predecessor binding. It answers "was a transition dropped or reordered?" which content hashing alone cannot.
WHAT FYD DOES BETTER: FYD's transition IDs are domain-logical (stage/object/owner/payload), richer than git's opaque content blobs; the ladder states give the chain business meaning git commits lack.
SMALLEST HARVESTABLE PRIMITIVE: the two-layer ID split + `verifyChain`. Nothing else.
REUSE/ADAPT/REPURPOSE/PATTERN_ONLY/REJECT: REPURPOSE (pattern). No dependency exists or is needed.
CAN IT:
- remove code? No.
- remove ambiguity? Yes. "Is the journal complete and in order?" becomes computable.
- improve beauty? No.
- improve expressiveness? No.
- improve trust? Yes. Tamper-evident ordering is the audit story for owner corrections.
- improve mobile? No.
- improve accessibility? No.
- improve performance? No (adds one hash per record; negligible).
- improve regeneration? Partially. Replay can prove it consumed the journal in order, which is the "regen applied exactly the approved transitions" proof the local C1 wrapper sketch wants.
- reduce AI improvisation? No.
FALSIFICATION EXPERIMENT: Build a 3-record chain, then (a) swap two records, (b) drop the middle record, (c) mutate a transition payload. `verifyChain` must reject all three and accept the intact chain. Then propose the identical logical correction twice at different chain positions: PASS if both records share the same transitionId but have different recordIds (dedup works on transitionId; ordering is still provable). If any mutation verifies, the hash construction is broken and the card is rejected.

## CARD C5 - Event upcasting: schema evolution without rewriting the immutable journal (pattern)

PROJECT: pattern. Evidence: Azure Architecture Center event-sourcing pattern doc (upcasting vs tolerant deserialization vs event versioning vs in-place migration as last resort); protean `@domain.upcaster(event_type, from_version, to_version)` with automatic v1->v2->v3 chaining; Marten `StoreOptions.Events.Upcast<TOld, TNew>`; the rule "upcasters must be deterministic and side-effect free" (cameronraysmith event-sourcing SKILL.md); compensating events for undo (never rewrite history).
PINNED SHA: n/a (pattern).
LICENSE: n/a.
RECENT ACTIVITY: n/a; pattern is stable industry practice.
FYD PROBLEM: "schema patches." The transition journal is immutable, but the transition *schema* will evolve (new ladder states, new payload fields, new binding classifications). Rewriting history breaks the audit trail; refusing to evolve freezes the product.

MECHANISM: version every transition type from day one (`type: "owner.correction", v: 1`). Register upcaster functions keyed `(type, fromVersion -> toVersion)`; at journal read time, chain them so handlers only ever see the current schema. Upcasters are pure and deterministic: same old record always yields the same new shape (this is the same determinism contract as the renderer). Additive, non-breaking changes use tolerant reading (ignore unknown fields, default missing ones); renames and restructures get explicit upcasters; semantic breaks get a new type version. Undo is a compensating transition appended to the journal, never an edit. In-place migration is the documented last resort.

EXACT IMPLEMENTATION: `upcasters: Map<"type:v1->v2", (record) => record>`; `readJournal()` maps each record through the chain before handing to projectors. ~30 lines plus one function per schema bump.
CLAIM EVIDENCE: Azure doc lists the four strategies with in-place migration explicitly last; protean shows the decorator + chaining; Marten shows typed registration. All read 2026-09-21 via search-result snippets and the linked docs pattern.
SOURCE EVIDENCE: pattern-level from the cited docs; no repo pinned (deliberately: the pattern is the harvest, and every cited implementation drags a framework).
RUNTIME EVIDENCE: none by this lane.
DEPENDENCY COST: zero (pattern only). The frameworks that implement it (protean, Marten, nestjslatam ddd-es-lib) are all heavier than the pattern and wrong-stack for FYD; do not depend.
WHAT FYD ALREADY HAS: versioning instinct at the render layer (`RENDER_MODEL_VERSION` bump discipline in render-model.ts). No journal schema story at all.
WHAT THEY DO BETTER: the chained-upcaster discipline and the explicit "never rewrite, compensate instead" rule, both stated as laws rather than conventions.
WHAT FYD DOES BETTER: nothing yet at this layer; FYD's contribution would be binding upcasters to the truth-model states (an upcaster must never promote an UNVERIFIED record to a verified-looking shape).
SMALLEST HARVESTABLE PRIMITIVE: versioned transition types + the upcaster registry + the compensating-transition rule.
REUSE/ADAPT/REPURPOSE/PATTERN_ONLY/REJECT: PATTERN_ONLY.
CAN IT:
- remove code? No.
- remove ambiguity? Yes. "What does this old journal record mean under the current schema?" has one deterministic answer.
- improve beauty? No.
- improve expressiveness? Partially. Explicit versions make schema intent visible instead of tribal.
- improve trust? Yes. History stays byte-stable while the product evolves; audit survives schema bumps.
- improve mobile? No.
- improve accessibility? No.
- improve performance? No.
- improve regeneration? Yes. Regen replays the whole journal; without upcasting, the first schema bump breaks every old replay.
- reduce AI improvisation? Partially. Deterministic upcasters replace "ask the AI to interpret the old format."
FALSIFICATION EXPERIMENT: Write journal records at v1, add a v2 schema (renamed field), register a v1->v2 upcaster. Replay the journal through a projector that only understands v2. PASS if the projector output is byte-identical to a journal written natively at v2, and the stored v1 bytes are untouched. Then write a deliberately lossy upcaster (drops a field); PASS for the experiment if a conformance test comparing v1-native vs v2-native replay catches it, proving upcasters need the same determinism testing as the renderer. If the v1 bytes get mutated at any point, the pattern implementation is rejected.

## CARD C6 - ETag / If-Match conditional writes (RFC 7232 pattern; no dependency)

PROJECT: pattern from HTTP semantics (RFC 7232 conditional requests). No library.
PINNED SHA: n/a. LICENSE: n/a. RECENT ACTIVITY: n/a (stable spec).
FYD PROBLEM: compare-and-swap for owner corrections against a moving source graph, at the API boundary rather than inside the patch applier.

MECHANISM: a content-derived validator (ETag = hash of the representation the owner saw) travels with the correction; the apply endpoint honors If-Match semantics: validator matches current state -> apply; mismatch -> 412 Precondition Failed, a typed conflict, never a silent overwrite. This is the HTTP-shaped twin of C1's `test` op: `test` guards inside the patch, If-Match guards at the boundary. FYD's correction-apply endpoint takes `(transitionId, baseGraphHash, patch)`; `baseGraphHash` is the validator.

EXACT IMPLEMENTATION: `applyCorrection({transitionId, baseGraphHash, patch})`: recompute current graph hash; if mismatch, return typed `CONFLICT(stale_base, currentHash)`; else journal-append (dedup by transitionId, C4 chain) and apply guarded patch (C1). ~25 lines around existing machinery.
CLAIM EVIDENCE: spec-described HTTP semantics; this lane did not re-read RFC 7232 this pass (long-stable knowledge, flagged as spec-described not source-verified).
SOURCE EVIDENCE: pattern-level. RUNTIME EVIDENCE: none.
DEPENDENCY COST: zero.
WHAT FYD ALREADY HAS: the verifier (`verifyPresentationBinding`) proves what is shown; nothing guards what is written.
WHAT THEY DO BETTER: a 30-year-old, intermediaries-understood contract for optimistic concurrency; every HTTP client already speaks it.
WHAT FYD DOES BETTER: FYD's validator can be *semantic* (hash of the evidence-bound graph snapshot the owner approved against), not just byte-based; and the conflict response can carry the structured diff (C3) showing exactly what moved underneath.
SMALLEST HARVESTABLE PRIMITIVE: `(transitionId, baseGraphHash, patch)` apply signature + typed CONFLICT.
REUSE/ADAPT/REPURPOSE/PATTERN_ONLY/REJECT: PATTERN_ONLY.
CAN IT:
- remove code? No.
- remove ambiguity? Yes. "Was the owner's approval based on current data?" is answered by the validator, not by timestamps.
- improve beauty? No.
- improve expressiveness? No.
- improve trust? Yes. The owner can never unknowingly approve-against-stale-data.
- improve mobile? No.
- improve accessibility? No.
- improve performance? Partially. Validators are cheap hashes; they avoid full re-fetch/re-verify round trips.
- improve regeneration? Partially. Regen can assert it is regenerating from the graph the approved transitions were validated against.
- reduce AI improvisation? No.
FALSIFICATION EXPERIMENT: Owner loads graph hash H1, source refresh moves to H2, owner submits correction with baseGraphHash=H1. PASS if the endpoint returns CONFLICT with H2 and applies nothing. Then resubmit with baseGraphHash=H2 and the refreshed preview; PASS if it applies. If the first submit applies against H2 silently, the boundary is theater and the card is rejected.

## CARD C7 - Enforced transition-table approval (pattern; robot3 as the "smallest real implementation" existence proof)

PROJECT: pattern. Existence proofs: robot3 (~1.2kB min+gz; `createMachine`/`state`/`transition`/`guard`/`reduce`/`interpret`; guard + reducer + immediate-transition patterns per robot3-viz docs) vs XState (~16.7kB; SCXML, actors, visualizer per the rainforestqa comparison). Both enforce that illegal transitions are mechanically impossible, not merely UI-hidden.
PINNED SHA: n/a (pattern; no dependency proposed). LICENSE: n/a. RECENT ACTIVITY: n/a.
FYD PROBLEM: the objective's "approval workflows" line, and the lane's reject rule: "approval workflow that is UI theater with no enforced state machine." FYD's ladder (PROPOSED -> APPROVED -> ACCEPTED -> OBSERVED_COMPLETE) currently exists as a concept; the gap is mechanical enforcement.

MECHANISM: a transition table `{state, event, guard} -> nextState` with guards as pure predicates; the only way to move a transition's ladder state is through the table; every legal move appends a content-identified journal record (C1 identity + C4 chain). Illegal moves are impossible by construction (no table entry), not by UI convention. Effects (sending the correction to the renderer, notifying the owner) live outside the table, in the workflow layer.

EXACT IMPLEMENTATION: for a 5-state ladder, ~30 lines hand-rolled: `const LADDER = {proposed: {approve: 'approved', reject: 'rejected'}, approved: {accept: 'accepted', ...}, ...}` + `move(transitionId, event, ctx)` that looks up the table, runs the guard, appends the journal record, returns the new state or throws `ILLEGAL_TRANSITION`. robot3 is cited only to set the "don't bother depending" threshold: if the smallest real library is 1.2kB and the hand-rolled table is 30 lines with zero deps, depending is the worse trade.
CLAIM EVIDENCE: robot3-viz docs show guard/reducer/immediate patterns; rainforestqa comparison gives the size numbers and the shared trait list (extended state, guards, invoked functions). Read 2026-09-21.
SOURCE EVIDENCE: pattern-level; docs pages read, no repo pinned.
RUNTIME EVIDENCE: none.
DEPENDENCY COST: zero (pattern). Depending on robot3 or XState is explicitly the rejected alternative (see kill list).
WHAT FYD ALREADY HAS: the ladder states and their business meaning; the truth-model state names (UNKNOWN/UNVERIFIED/OUTCOME_UNKNOWN etc. from the product law).
WHAT THEY DO BETTER: mechanical enforcement as a solved, boring problem with tiny implementations.
WHAT FYD DOES BETTER: the ladder is domain-shaped (approval -> acceptance -> observed completion mirrors the real owner relationship); generic FSMs know nothing about evidence preconditions per transition.
SMALLEST HARVESTABLE PRIMITIVE: the transition table + guard predicates + journal-append-per-move.
REUSE/ADAPT/REPURPOSE/PATTERN_ONLY/REJECT: PATTERN_ONLY.
CAN IT:
- remove code? No.
- remove ambiguity? Yes. "Can this correction move to APPROVED?" is a table lookup, not a code-path audit.
- improve beauty? No.
- improve expressiveness? Partially. Guards make approval preconditions explicit and testable.
- improve trust? Yes. This is the enforcement half of the approval trust story (C1/C6 are the data half).
- improve mobile? No.
- improve accessibility? No.
- improve performance? No.
- improve regeneration? Partially. Regen replays only transitions in APPROVED-or-later states; the table is what makes "approved" mean something.
- reduce AI improvisation? Yes. The AI can propose transitions but cannot move ladder states; only table events can.
FALSIFICATION EXPERIMENT: Attempt every illegal move on the ladder (e.g. PROPOSED -> OBSERVED_COMPLETE, APPROVED -> PROPOSED without a reject event). PASS if all throw ILLEGAL_TRANSITION and append nothing to the journal. Then attempt a legal move whose guard fails (approve with unverified evidence); PASS if the guard blocks and the journal is untouched. If any illegal move succeeds or appends, the enforcement is theater and the card is rejected.

---

## KILL LIST (one-line rejection reasons)

- Automerge: CRDT machinery for multi-writer convergence; FYD's owner-correction flow is single-writer with an approval gate, content hash + journal dedup covers it. Sledgehammer, rejected per lane rule.
- Yjs: same rejection as Automerge; collaborative-editing CRDT where a content hash suffices.
- XState (as dependency): real enforced state machines, but ~16.7kB for a 5-state approval ladder that is 30 lines hand-rolled. Pattern noted in C7; dependency rejected.
- robot3 (as dependency): the smallest real FSM (~1.2kB) and still not worth depending on for a 5-state ladder. Pattern noted in C7; dependency rejected.
- recast: AST-preserving reprinting is the wrong layer; FYD's unit of change is the object graph, not source syntax trees. Regeneration preservation is solved at the patch/overlay layer.
- node-eventstore: unmaintained; the upcasting pattern (C5) harvested instead of the library.
- immudb / Temporal / EventStoreDB (as infrastructure): server-grade machinery for a journal FYD can hold as a file/table with C1+C4+C5. Sledgehammer.
- jsdiff (kpdecker/diff): text-diff only; folded into C3, which covers structured + text diffing with formatters.
- deep-diff / deep-object-diff: diff without patch/reverse/format; strictly weaker than C3.
- RFC 7386 JSON Merge Patch (as canonical): subtree replacement loses op-level identity and preconditions; weaker than RFC 6902 + test for conflict detection. (Usable as an authoring shorthand, never as the journal payload.)
- Redux action log: replayable but no content-derived identity and no preconditions; weaker than the local concept on both axes.
- mobx-keystone patches: same patch+inverse mechanism as C2 in a smaller ecosystem; redundant to the immer card.
- fast-json-patch `observe`/`generate` (duplex observer API): legacy mutation-observer path; the `compare` path is the clean primitive. Noted inside C1, not separately harvested.
- json-schema-migrate-style in-place migration tools: rewriting history breaks the immutable journal; C5 names in-place migration the last resort for a reason.
- gun / OrbitDB: decentralized sync machinery; a single-owner approval journal does not need it.
- Generic "approval workflow" SaaS/UIs (any): UI theater with no enforced transition table; rejected by the lane's stated rule, replaced by C7's mechanical enforcement.

## GitHub API calls used

1 total. A single `GET /rate_limit` probe via the Pig bridge, executed BEFORE the freeze notice arrived. Zero API calls after the freeze. All PINNED SHA fields are TBD pending budget release; LICENSE fields were filled only where a raw file read (not API) supplied the value.

---

## Verdict: does anything beat or sharpen the local DETERMINISTIC TRANSITION IDENTITY concept?

Nothing beats the kernel. Content-hash -> stable ID -> idempotent append remains the right primitive, and it is already local (harvest-report.md C1). Every external candidate evaluated is domain-blind document mechanics; FYD's layer is semantic, domain-aware identity (stage/object/owner/payload + approval ladder + truth-model states). They compose; none replaces.

Six genuine sharpenings, in priority order:

1. **Precondition-guarded patches (C1) are the missing half of the local concept.** The local identity makes *append* idempotent; it says nothing about *application* safety. RFC 6902 `test` ops (via invertible compare) turn "replay the same transition" from blind re-apply into fail-closed conditional apply: pre-image mismatch -> typed conflict instead of silent clobber. For the bounded question (owner corrects, source refreshes, site regenerates), this is the single most load-bearing harvest: journal dedup handles retry-idempotency, test ops handle refresh-vs-correction conflicts.
2. **Inverse patches are pre-image carriers (C2 + C1 synthesis).** Immer's inverse patches literally contain the old values, so `test` preconditions can be synthesized mechanically from any recorded mutation: `guardedPatch(patches, inversePatches)`. ~20 lines. This is the sharpest single function of the wave.
3. **Two-layer identity (C4).** Keep content-derived transition IDs position-independent (cross-history dedup preserved); bind log-record IDs to their predecessor git-style (ordering + tamper-evidence). The local C1 has layer 1 only.
4. **Preview-before-apply and approval dry-run as pure functions (C1).** `applyPatch` on a clone + `validate(patch, doc)` need no infrastructure; they are the preview gate and the approval gate respectively.
5. **Upcasting (C5).** The immutable journal currently has no schema-evolution story; without it the first schema bump breaks every old replay. Deterministic, side-effect-free, chained upcasters on read; compensating transitions for undo; never rewrite history.
6. **Canonical bytes discipline.** The local C1 already flags JSON.stringify key-order instability; name the standard answer: canonical serialization (sorted keys; JCS RFC 8785 is the citable scheme) must be specified before "same logical change -> same ID" is true across processes. Without it the kernel's central promise is false.

What FYD does better than all seven cards: semantic transition identity with an evidence-bound approval ladder. None of the external mechanisms know what an owner correction *is*; they only know how to move bytes safely. FYD's harvest posture is therefore: keep the local identity kernel and ladder as the semantic envelope; adopt C1's guarded-patch format as the canonical transition payload; use C2's record/replay pattern to produce it; C3 to preview it; C4 to chain it; C5 to evolve it; C6/C7 to gate it.

Recommended pin-pass order when budget releases (one repo-endpoint call covers SHA + license each): fast-json-patch, immer, jsondiffpatch. The four pattern cards (C4-C7) need no pins.
