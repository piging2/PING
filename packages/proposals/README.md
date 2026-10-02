# @piging2/proposals

Conversational customization + regeneration for the FYD experience IR.

**Proof 7** — "Move emergency plumbing to the top." arrives as a planned
intent (structured input; the LLM plans, this package never calls one).
`proposePatch` mechanically compiles it to a **typed SiteSpec patch
proposal** with a before/after preview. `approveProposal` is a real gate
(explicit approval, id re-verification; no auto-approve path).
`applyProposal` applies only approved proposals and appends a canonical
transition record to an append-only journal. No direct filesystem
mutation anywhere in this path.

**Proof 8** — `regenerate` takes a fresh observation and runs:
evidence diff (new vs old evidence records) → affected object ids →
affected SiteSpec paths → the generator re-runs for affected pages only
→ owner assertions re-apply → presentation overrides re-apply → a new
SiteSpec version. Owner corrections and presentation overrides survive
regeneration by construction; a changeless observation is a
byte-identical no-op.

## Layout

- `src/types.ts` — `PlannedIntent`, `SiteSpecPatchOp` (reorder_section /
  set_visibility / set_component_option), `PatchProposal` (id =
  `pp-` + digest of patch + spec digest), `SpecTransition`, `ProposalsState`,
  `PresentationOverride`, re-exported owner `OwnerAssertion` types,
  regeneration types.
- `src/compiler.ts` — `proposePatch`: intent + spec (+ graph) → validated
  proposal. Target resolution: section name first (with the tiny
  `SECTION_ALIASES` owner-vocabulary map), then object title resolved to
  its containing section. `move_section_to_top` is a *section*-order
  operation; intra-section ordering is `presentation.objectOrder` via
  `set_component_option`. `validatePatch`: every op must target a real
  path, `before` must match the spec, `after` must be schema-valid.
- `src/proposal.ts` — `approveProposal` (real gate), `applyProposal`
  (stale/tamper/validation refusals, idempotent re-apply, transition
  journal, override derivation), `applyOverrides` (absolute, idempotent).
- `src/assertions.ts` — adapter over the owner package's canonical
  assertion algebra (`applyCorrections`, `assertCorrection`,
  `chainHeads`): one assertion authority, no fork. Derives
  `changedObjectIds` for the affected-path computation and surfaces
  `hiddenFactIds` for the visibility layer.
- `src/regenerate.ts` — `diffEvidence`, `affectedSpecPaths` (bound-set
  comparison across old/new graphs through the real query seam),
  `regenerate`.
- `src/render.ts` — `renderSpecDigest`: spec + graph → semantic render
  model digest (deterministic re-render check).
- `src/clone.ts` — `undefined`-preserving deep clone. `JSON` round-trips
  drop `undefined` keys while the digest canonicalizer emits them as
  `null`; every clone here goes through `deepClone` so digests are stable
  across clone boundaries (proven by a failing stale-proposal check).

## Owner-assertion shape (coordination note)

The sibling `packages/owner` worker had not landed at build time, so this
package defines the minimal `OwnerAssertion`
`{ assertionId, objectId, field, op, value?, provenance: { owner, assertedAt, supersedes? }, sourceValueSeen? }`.
The semantics mirror `ping-fyd-converged`
`src/fyd/owner-mode/corrections.ts` exactly (append-only, chain heads,
regeneration projects assertions over fresh facts, conflicts surfaced),
and the field names map 1:1 to the source `OwnerAssertion`, so the shapes
can converge without behavior change. CORRECT application also attaches
the harvested `PingObject.ownerFieldCorrections` record (source-SAYS /
owner-SAYS) for contact/description fields.

## Determinism

Same spec + same intent → same proposal id. Same journal + same base →
same state. Same observation + same assertions + same overrides → same
regenerated spec. Re-rendering is byte-identical. Tests pin all clocks.

## Harvest verdicts

| Source file | Verdict | Notes |
|---|---|---|
| `src/fyd/customize/owner-command-compiler.ts` | ADAPT (resolution semantics, intent vocabulary) | Plain-English parsing stays upstream (LLM); name matching tightened (candidate-contains-target only) so the compiler never guesses |
| `src/fyd/customize/owner-proposal.ts` | ADAPT (draft→approve→apply→replay lifecycle, digest-bound ids, append-only state) | Capability-verdict approval replaced by explicit `{approvedBy, approvedAt}` (no capability system in piging2 yet); replay = `applyOverrides` + assertion re-projection inside `regenerate` |
| `src/fyd/ask/site-patch.ts` | ADAPT (typed patch ops bound to a spec digest, before/after card) | Ops re-typed to the piging2 SiteSpec (`reorder_section`, `set_visibility`, `set_component_option`); digest-bound proposal ids kept |
| `src/fyd/owner-mode/corrections.ts` | ADAPT (assertion algebra semantics) | `src/assertions.ts` delegates to the canonical algebra in `packages/owner` (converged 2026-10-02; no duplicate authority) |

## Tests

`npx jest` — 18 tests: `test/proposals-proof7.test.ts` (12),
`test/regenerate-proof8.test.ts` (6).
