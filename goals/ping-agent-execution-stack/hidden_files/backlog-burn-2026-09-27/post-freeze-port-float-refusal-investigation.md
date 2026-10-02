# Post-freeze port investigation: "fyd-product-lane float-refusal port"

Investigated 2026-09-27 ~13:50 MDT. NO PATCH STAGED — the target is
ambiguous and the obvious candidate does not clearly want the Gap-1
refusal discipline. This note exists so the post-freeze port does not
proceed on a guess.

## Candidate found

`src/fyd/builder/canonical.ts` (product-lane only; fyd-build has no
equivalent): `canonicalizeValue` passes non-record values through
untouched, then `JSON.stringify`s. Divergences from the Gap-1 pinned
semantics:
1. Finite floats serialize silently (Gap-1: REFUSE).
2. `NaN`/`Infinity`/`-Infinity` collapse to `null` via JSON.stringify
   (silent semantic conflation with real null).
3. Key sort is `Object.keys(v).sort()` = UTF-16 code-unit order (Gap-1/F6:
   code-point order for astral keys).

## Why no patch

- The Gap-1 refusal rule exists to guarantee CROSS-IMPLEMENTATION byte
  agreement on journal-event canonical bytes. `canonicalizeSpec` /
  `semanticDigestOf` are used only inside the product lane's own builder
  (`builder/index.ts`, `builder/planner.ts`) — single-implementation,
  TypeScript-only. Within one JS runtime the output is deterministic for
  a given input; there is no cross-impl digest contract to break.
- Specs legitimately contain floats (dimensions, opacities, design
  tokens). A blanket float-refusal ported from the journal domain could
  break legitimate spec content. The correct rule for this domain (refuse
  non-finite only? allow finite?) is a semantic decision, not a mechanical
  port.
- The NaN-to-null conflation is real but latent: it only matters if NaN
  can actually appear in a spec, which would itself be a bug upstream.

## Needed before porting

A decision: does the spec semantic-digest domain adopt (a) full float
refusal, (b) non-finite-only refusal, or (c) no change (single-impl
determinism is sufficient)? Alternatively, identify the real port target
if "float-refusal port" meant a different file. Do not guess; ask the
coordinator or Nolan post-freeze.
