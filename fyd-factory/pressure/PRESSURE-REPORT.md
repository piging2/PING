# F4-PRESSURE Report: factory render path robustness

Date: 2026-09-23. Target: `generateSiteSpec` + `validateSiteSpec` +
`buildRenderContext` (plus `resolveQuery` as the claim-honesty probe over
every generated section query, since that is the real render path).

- Repo: /home/nolan/projects/ping, branch `fyd-factory`, commit `e48ef710`,
  read-only (no shared files modified; git status verified before/after).
- Runner: Node v22.23.2, tsx via repo node_modules. Harness lived in a new
  lane-contained dir `src/fyd/__pressure__/` (created, executed, deleted;
  zero residue; no `__pressure__` entries in final git status).
- Renderer UI tree cannot load under plain node (`.module.css` import in
  `object-circle.tsx`); a `--import` CSS stub neutralized asset imports so the
  pure seam functions (`buildRenderContext`, `resolveQuery`) execute for real.
- 22 graphs across the 12 attack classes. Every stage wrapped: a throw is
  recorded per stage with the exact error, never fixed, never retried.

## Verdicts

| # | Class | Verdict | Evidence |
|---|-------|---------|----------|
| 1 | missing business object | FAIL-CLOSED | generateSiteSpec returns `pages: []`, `ownerObjectId: ""`; validateSiteSpec emits typed error `error@pages: A site needs at least one page.` No throw. |
| 2 | zero services | FAIL-CLOSED | Honest site: home (5 sections) + about, no services page, 0 validator errors. |
| 3 | 200 services | FAIL-CLOSED | 2 ms end to end; 201 objects projected; 431 section-query resolutions; 0 validator errors; no invented strings. |
| 4 | duplicate / near-duplicate names | FAIL-CLOSED* | No throw, no invented strings. Near-dups: lowest-id owner wins cleanly. Duplicate ids: see finding F-7 (generator/renderer disagree). |
| 5 | cyclic relationships | FAIL-CLOSED | Owner/services/self loops resolve without hang; 8 resolutions, 0 errors. Single-hop `related()` never recurses. |
| 6 | conflicting facts across sources | FAIL-CLOSED | Two businesses, different phones: owner = lowest id `b-1`; Contact section resolves exactly one phone `555-0001`. No merge, no silent winner fabrication in output. |
| 7 | null/empty/malformed fields | CRASH / INVENTED-CLAIM | 6 distinct TypeErrors (F-1..F-6); title:null renders `About null` with 0 validator errors (F-8). One sub-case (numeric field value) handled honestly. |
| 8 | 1MB string fields | FAIL-CLOSED | 1MB description and 1MB title each pass in ~1 ms; titles byte-exact through all stages. |
| 9 | unicode / bidi / zero-width | FAIL-CLOSED | RTL overrides, zero-width chars, CJK, Arabic, emoji, embedded NUL round-trip byte-identical through spec, projection, and query resolution. |
| 10 | schema-less objects | FAIL-CLOSED | `schema: ""` and unknown `ping.social.unicorn@9` never match a role; honest-empty spec + typed validator error. Unlinked real service correctly dropped (no owner, no relations). |
| 11 | objects with no evidence | FAIL-CLOSED | `evidenceRef: ""` and `evidenceRef: undefined` on relationships: generator ignores evidence; full pipeline OK. |
| 12 | zero relationships | FAIL-CLOSED | Honest minimal site: home + about + explore (explore built from unlinked public objects); no phantom service/person sections. |

\* Class 4 verdict holds on the crash/invention bar; the inconsistency is
documented as F-7.

## Findings (non-fail-closed)

F-1. `generateSiteSpec` throws on `description: null`:
`TypeError: Cannot read properties of null (reading 'trim')`
(`homePage`: `g.owner.description.trim()`).

F-2. `generateSiteSpec` throws on `fields: null`:
`TypeError: Cannot read properties of null (reading 'phone')`
(`fieldValue`: `o.fields[name]`).

F-3. `generateSiteSpec` throws on `graph.objects: null`:
`TypeError: Cannot read properties of null (reading 'map')`
(`group()`: `graph.objects.map(...)`).

F-4. `generateSiteSpec` throws on `graph.relationships: null`:
`TypeError: graph.relationships is not iterable`
(`related()`: `for (const r of graph.relationships)`).

F-5. `generateSiteSpec` throws on an `undefined` member of `objects`:
`TypeError: Cannot read properties of undefined (reading 'id')`
(`group()`: `graph.objects.map((o) => [o.id, o])`).

F-6. `buildRenderContext` throws on an object with `fields: undefined`
(the `{}` empty-object case): generate and validate pass first
(honest-empty + typed error), then
`TypeError: Cannot convert undefined or null to object`
(`applyFieldVisibility`: `Object.entries(o.fields)`).

F-7. Duplicate object ids resolve inconsistently across the seam (no throw,
no invented string, but self-contradictory output). Two business objects with
id `dup` ("First Title"/`555-0001` vs "Second Title"/`555-0002`): the spec's
home page title is `First Title` (generator: stable-sort first wins) while the
rendered owner query resolves `Second Title` / `555-0002` (renderer: Map
last-wins). Exact evidence:
`specHomeTitle="First Title", resolvedOwnerTitle="Second Title",
resolvedOwnerPhone="555-0002", mismatch=true`.

F-8. `title: null` produces a visitor-facing invented artifact with zero
validator findings. Page titles come out as `[null, "About null"]`
(`"About " + null` string coercion); `validateSiteSpec` reports 0 errors, 0
warnings. The string `About null` is presented as a page title and does not
correspond to any input fact. Classified INVENTED-CLAIM (null-coercion
artifact, not hallucination).

## Honest-handling notes (not findings)

- Numeric field value (`phone: 12345`): treated as absent; Contact section
  correctly omitted; no throw. This is the fail-closed behavior the other
  malformed sub-cases lack.
- The harness's string-scan flagged component names (`Hero`,
  `BusinessSummary`, `Contact`, `CTA`, `AskFYD`, `ObjectRail`, `ObjectFeed`).
  These are structural registry names, not business claims: the validator
  reported 0 "Unknown component" errors in every such case, confirming they
  are known components.
- Address coarsening in the projection (`123 Main St, Grand Junction, CO
  81501` -> `Grand Junction, CO 81501`) is the documented conservative-default
  rule in `field-visibility.ts`, verified as derived-from-input, not invention.

## Overall verdict: FAIL

The pipeline fails closed on 10 of 12 classes, but the malformed-fields class
produces 6 uncaught TypeErrors across `generateSiteSpec` (5) and
`buildRenderContext` (1), and a null title renders the literal page title
`About null` with a clean validator pass. Degenerate input from JSON ingestion
can therefore crash the render path or surface a false business name instead
of a typed failure. No fixes applied (per task scope).

## Hygiene

- Zero modifications to shared files. Pre-run git status: 93 lines;
  post-run: 94 lines. The single delta is `?? src/fyd/ask/context-compiler.ts`,
  created 2026-09-23 19:47 MDT by a concurrent lane (Ask FYD context
  compiler), not by this task. No `__pressure__` residue.
- Storage law: all artifacts under `~/workspace/fyd-factory/pressure/`
  (cloud sandbox). Nothing written to /tmp, C:, D:, or WSL bulk paths.
- Harness sources kept for rerun: `f4-harness.mts` (22 cases), `f4-followup.mts`
  (4 focused probes), `css-stub.mts`, `run-f4.sh`, `run-f4-followup.sh`,
  `raw-output.txt`.
