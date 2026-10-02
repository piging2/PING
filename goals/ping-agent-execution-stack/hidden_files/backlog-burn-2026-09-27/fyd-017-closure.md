# FYD-017 closure: observed / visibility / presentation stored as three separate fields

**Backlog item:** FYD-017 — "observed/visibility/presentation stored as three separate fields"
**Implementer:** FYD-017 IMPLEMENTER (subagent)
**Date:** 2026-09-27
**Repo:** `~/workspace/fyd-build`, branch `fyd-013-superseded-evidence`, HEAD `8937576` (re-verified on arrival)
**Status:** COMPLETE — PASS

## Step 3 — Served-path proof (ephemeral port; production :3100 untouched)

`src/fyd/why/__tests__/field-triple-served.test.ts` starts an HTTP server on port 0 (OS-assigned
ephemeral port; asserted `!= 3100`), serves `GET /triple?objectId=&field=&viewer=` from the real
`fieldTriple` reader, and asserts the served bytes.

Captured served bytes (from a throwaway capture run, file deleted after):

**visitor:**
```json
{"found":true,"triple":{"objectId":"website-business-9d13c4196b4f1092","field":"phone","viewerMode":"visitor","observed":{"withheld":true,"sourceRef":"website-ingestion:https://happy-place-platform.vercel.app/"},"visibility":{"visible":false,"rule":"FYD-010 maySeeField: field NOT in VISITOR_VISIBLE_FIELDS — fail closed","ref":"src/fyd/visibility/policy.ts:maySeeField"},"presentation":{"withheld":true,"corrected":false,"cause":"visibility-suppression","rule":"FYD-016 overlay applied (if any), then FYD-010 maySeeField denied the field","ref":"src/fyd/visibility/policy.ts:maySeeField"}}}
```
The observed phone `+15412865190` appears NOWHERE in the visitor bytes (privacy: withheld, not leaked).

**demo_owner:**
```json
{"found":true,"triple":{"objectId":"website-business-9d13c4196b4f1092","field":"phone","viewerMode":"demo_owner","observed":{"value":"+15412865190","withheld":false,"sourceRef":"website-ingestion:https://happy-place-platform.vercel.app/"},"visibility":{"visible":true,"rule":"FYD-010 maySeeField: demo_owner sees every field (demo seam label, not production auth)","ref":"src/fyd/visibility/policy.ts:maySeeField"},"presentation":{"value":"+1-970-555-0100","withheld":false,"corrected":true,"cause":"owner-correction","rule":"FYD-016 applyOwnerFieldCorrections: owner correction wins for this field; FYD-010 maySeeField: allowed","ref":"owner-decision:fyd017-probe-correction-digest (via src/fyd/owner/corrections.ts:applyOwnerFieldCorrections)"}}}
```
The three layers are separately addressable in the served bytes (`triple.observed` /
`triple.visibility` / `triple.presentation`), and the visitor/owner difference is visible.

## Verification

- Failing probe first: `Cannot find module '../field-triple'` (TS2307), then 7/7 pass after the delta.
- Full jest suite: **38 suites, 289 tests, all pass.**
- `tsc --noEmit`: clean (exit 0).
- No paid calls; deterministic + headless only. No push. Production :3100 untouched.

## Delta (committed on branch `fyd-017-field-triple`, local only, never pushed)

1. `src/fyd/why/field-triple.ts` (new) — the pure reader `fieldTriple()` + the `FieldTriple` record
   type with three separate slots: `observed` (value + sourceRef), `visibility` (visible + rule +
   policy ref), `presentation` (value + corrected + cause + cause ref). References the three
   existing authorities; no second visibility policy, no second correction overlay, no second
   observation store. Docstring states the sovereignty and the FYD-012 boundary (triple reads the
   presentation graph, one hop up from the renderer binding verifier).
2. `src/fyd/why/__tests__/field-triple.test.ts` (new) — the failing probe: observed / visibility /
   presentation for `phone` on the happy-place business object, privacy no-leak assertion, public-field
   control, fail-closed on unknown object, fixture-not-mutated, and the three-layers-separately-addressable
   check. 7/7 pass.
3. `src/fyd/why/__tests__/field-triple-served.test.ts` (new) — served-path proof on an ephemeral
   port: three layers separately addressable in the served bytes, visitor/owner difference visible,
   visitor bytes contain neither the observed nor the corrected phone. 2/2 pass.
4. `src/fyd/why/__tests__/field-triple-fixtures.ts` (new) — shared probe fixtures (not a test).

## SI-03 note

No question or decision goes to Nolan in this item: the parent brief is complete and binding, the
probe/implementation/verification are all deterministic, and the report goes to the parent
orchestrator (not Nolan). No escalation record required; recorded here for the audit trail.

## What the item now answers

"What did the source say vs what may this viewer see vs what was actually shown" for a single
field — per field, per viewer, assembled live from the three authorities, with the visitor's
observed value withheld rather than leaked.


## The gap (triage 2026-09-27, read-only, verified)

The three layers are separated architecturally (`store.ts` docstring says so) but there is no
per-field triple record — `OwnerDecision` carries only the presentation-diff proposal body. A field's
observed value, its visibility rule, and its presentation value are not stored as three distinct,
separately-addressable facts, so nothing can answer "what did the source say vs what may this
viewer see vs what was actually shown" for a single field.

## Step 0 — Harvest before writing (existing authorities, referenced not forked)

1. **Visibility (FYD-010):** `src/fyd/visibility/policy.ts` — `maySeeField`, `VISITOR_VISIBLE_FIELDS`,
   `filterObjectFieldsForViewer`, `Viewer` / `VISITOR_VIEWER`. The one shared visibility policy;
   the reader imports it directly, no fork.
2. **Presentation overlay (FYD-016):** `src/fyd/owner/corrections.ts` —
   `fieldCorrectionsFromDecisions` + `applyOwnerFieldCorrections` (returns the owner-view
   presentation graph AND the `applied` records with `correctedValue` / `observedValueV2` /
   `sourceMoved`). The reader calls the real overlay on the real observed graph and reads the
   presentation value out of the returned graph; the winning `applied` record supplies the cause ref.
   No second correction overlay.
3. **Observed world:** the fixture/observed `ObjectGraph` (`HAPPY_PLACE_GRAPH`) — `fields` carry
   verbatim source observations, `provenance.ref` is the source pointer
   (`website-ingestion:https://happy-place-platform.vercel.app/`). The reader never mutates it.
4. **Privacy pattern:** `src/fyd/why/why-this.ts` runs the FYD-010 gate BEFORE any value is read
   and withholds values (never leaks) for viewers who may not see a field — the same pattern the
   triple reader uses for the `observed` slot (task requirement: a visitor's triple must not leak
   an owner-only field's observed value through the `observed` slot).
5. **Placement:** new module `src/fyd/why/field-triple.ts` (sibling of whyThis: per-field,
   viewer-aware, evidence-carrying). Test `src/fyd/why/__tests__/field-triple.test.ts`; served
   proof `src/fyd/why/__tests__/field-triple-served.test.ts`. No tsconfig/jest config changes needed
   (why/ is already in both).
6. **Correction proposal shape:** `src/fyd/proceduralize/patch.ts` apply.ts carries correct_field as
   `propsDiff: { "ownerField.objectId": id, "ownerField.<field>": value }` — the probe builds its
   in-memory CORRECT OwnerDecision in exactly that shape.

## Persist-vs-reader decision

**Reader, not a persisted store.** Rationale: a persisted triple store would be a fourth derived
store competing with the three authorities it claims to separate (a sovereignty violation); it
could drift from them and would need invalidation machinery. A pure, deterministic reader that
assembles the triple on demand from the three authorities on the three existing sources can never
drift and answers "what did the source say vs what may this viewer see vs what was actually
shown" for any field, any viewer, at any time. If a future consumer needs memoization, it can
cache the reader's output keyed by (objectId, field, viewer, graph digest, decisions digest) —
that is a cache, not a new authority.

## Step 1 — Failing probe (written FIRST, before any implementation)

Probe: `src/fyd/why/__tests__/field-triple.test.ts` imports `../field-triple` (does not exist yet).
For object `website-business-9d13c4196b4f1092` / field `phone` on HAPPY_PLACE_GRAPH:

- observed layer: value `+15412865190`, sourceRef `website-ingestion:https://happy-place-platform.vercel.app/`
- visibility layer: visitor -> hidden (FYD-010 rule named); demo_owner -> allowed
- presentation layer: visitor -> nothing shown (suppressed); demo_owner + CORRECT decision Y -> value Y, corrected=true, cause ref = decision digest
- privacy: the visitor's whole triple JSON must not contain the observed phone value
- observed world not mutated (fixture byte-identical before/after)
- control: public field `website` for visitor -> all three layers open, presentation = observed value

**FAILURE (2026-09-27):**
```
FAIL src/fyd/why/__tests__/field-triple.test.ts
  Test suite failed to run
    src/fyd/why/__tests__/field-triple.test.ts:25:29 - error TS2307:
    Cannot find module '../field-triple' or its corresponding type declarations.
```
Probe fails exactly as designed: no `fieldTriple` reader exists. Proceeding to the implementation.

## Step 2 — Delta (smallest)

New module: `src/fyd/why/field-triple.ts` (+ tests). One new file, no config changes, no edits to
existing modules.

The reader `fieldTriple({ observedGraph, viewer, objectId, field, decisions })`:

- **observed slot** — reads the verbatim value from the observed graph and the object's
  `provenance.ref` as the source ref. The value is populated only when `maySeeField` allows the
  viewer; otherwise `withheld: true` and the value slot is empty (the whyThis privacy pattern).
  The input graph is never mutated.
- **visibility slot** — the raw FYD-010 verdict: `maySeeField(field, viewer)` from
  `src/fyd/visibility/policy.ts` (imported, not forked), plus which rule text decided and a
  `policy.ts:maySeeField` ref. Unknown viewer modes fail closed via maySeeField itself.
- **presentation slot** — the owner-view value: the REAL `applyOwnerFieldCorrections` overlay
  (FYD-016) run on the observed graph, then the FYD-010 gate. Cause is one of
  `owner-correction` (ref = the originating decision digest), `observed-passthrough` (no
  correction; ref = observed source ref), `visibility-suppression` (gate denied; ref = policy),
  `unbound` (field nowhere). Value normalization (missing/empty = unbound; arrays joined with
  ", ") mirrors `corrections.ts`'s `observedValueOf` semantics.

The FYD-012 binding verifier is deliberately NOT in this reader's path: the triple's presentation
slot is "what the presentation graph carries for this viewer", one hop up from the renderer
binding (resolveBoundField). Documented in the module docstring.

The correction-decision lookup matches the winning `applied` record back to its originating
`OwnerDecision` through `fieldCorrectionsFromDecisions` (FYD-016's extractor), yielding the
digest-pinned ref `owner-decision:<digest>`.
