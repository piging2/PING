# FYD-010 / NOW-5 closure ledger — field-level privacy gate for Ask FYD

Date: 2026-09-27 ~09:30 MDT. Implementer: FYD-010 subagent (Pigi).
Verdict: **PASS** — gap closed on the fyd-build working copy, proven at source, built, and served layers.

## 1. Reproduction (step 1, pre-fix)

Re-ran the existing falsification probe unchanged:
`~/workspace/goals/ping-agent-execution-stack/hidden_files/perfecting-pass-2026-09-27/jest.config.probe.cjs`
against `~/workspace/fyd-build` (HEAD `f90589e`).

Result (pre-fix): **CASE A FAILED** — `buildAskFydContext` with `viewer.mode="visitor"`
over a PUBLIC business object carrying `phone="+1-970-555-0142"` and
`home_address="123 Main St, Grand Junction, CO 81501"` returned both fields intact
(`Received: "+1-970-555-0142"` where `undefined` was required). **CASE B PASSED**
(demo_owner sees the fields). Gap confirmed still open; no prior closure.

## 2. Harvest (before writing)

Searched for existing field-level visibility/privacy gating across the lane:

- `src/fyd/visibility/policy.ts` — THE one shared visibility policy (constitutional
  owner of visibility decisions). Object-level only by design: `filterGraphForViewer`
  leaves "fields untouched; field visibility is a separate concern". Harvested its
  **fail-closed pattern** (`canSee`: unknown visibility -> false) as the shape for
  the field gate. `coarsenAddress` (policy.ts) has zero consumers on the ask path
  and is a *suppression shape* (partial redaction) — deliberately NOT used: the
  D-SHIP suppression-shape decision is Nolan's and still pending, so the gate hides
  fields (removes them), never rewrites a value.
- `src/fyd/ask/context-builder.ts` — `FORBIDDEN_KEYS` deep-scan (`rawHtml`,
  `crawlerDump`, `secretNotes`, `providerToken`) is input-level field-name gating
  prior art; the new gate follows the same name-based, builder-enforced philosophy.
- `src/fyd/proceduralize/__fixtures__/{happy-place-graph,coppersmith-plumbing-graph}.ts`
  — harvested the real field inventory to build the allowlist so existing ask tests
  (services.test.ts asserts `citation.source` matches `^https://` and `lastChecked`
  is "2026-09-22", both read from gated context fields) keep passing.
- Prior-art files named in the task: `work/src__fyd__ask__site-patch.ts` (site-patch
  proposal drafting, unrelated to field gating) and
  `work-gate-repair/ask-200-fields.testblock.ts` (served ask response-shape checks
  from a different pipeline) — read, nothing harvestable for this gate.
- No OpenRouter / paid calls used. No Copilot identities needed; deterministic
  software sufficed. All 11 escalation-contract fields: N/A (no escalation).

## 3. Delta (smallest reusable delta)

Two source files changed, one test file added. Renderer untouched
(`src/fyd/components/renderer.tsx` not in scope per FYD-012).

### `src/fyd/visibility/policy.ts` (+76)
- `VISITOR_VISIBLE_FIELDS` (exported, pinned): `claimKind, source_url, source_type,
  source_digest, observed_at, evidence_ref, title, description, website,
  area_served, service_key, service_href`. Contact-class fields (`phone`, `email`,
  `home_address`) and anything unlisted are owner-only.
- `maySeeField(fieldName, viewer)`: visitor -> allowlist only; demo_owner -> true
  for everything; unknown mode -> false (fail closed both ways, mirroring canSee).
- `filterObjectFieldsForViewer(object, viewer)`: pure projection; input not
  mutated; hidden keys absent (not undefined-valued); key order preserved.
- Gate HIDES fields; never rewrites values (no suppression-shape choice made).

### `src/fyd/ask/context-builder.ts` (+24/-8)
- Applies `filterObjectFieldsForViewer` to targetObject and every relatedObject in
  the non-owner branch.
- `if (viewer.mode === "visitor")` -> `if (viewer.mode !== "demo_owner")`: unknown
  modes fail closed (canSee drops non-public objects; maySeeField drops every
  field). demo_owner path byte-identical to before (no filtering, as before).
- Header doc updated to describe the field gate.

### `src/fyd/ask/__tests__/fyd-010-field-gate.test.ts` (new, 13 tests)
Probe CASE A/B (canonical), visitor keeps public non-sensitive fields, unlisted
fields hidden for visitors but visible to demo_owner, related objects gated, input
not mutated, unknown viewer mode fails closed at both layers (every field hidden;
private target throws `unknown_object`), `maySeeField` policy semantics.

Diff stat:
```
 src/fyd/ask/context-builder.ts | 32 +++++++++++++-----
 src/fyd/visibility/policy.ts   | 76 ++++++++++++++++++++++++++++++++++++++++++
 2 files changed, 100 insertions(+), 8 deletions(-)
```
Commit: branch `fyd-010-field-gate` on the fyd-build working copy (local only,
never pushed). `dist/` is gitignored; the built artifact was regenerated via
`npm run build:server` and verified, not committed.

## 4. Test evidence (full output)

- Lane jest suite (`npm test`, jest.config.cjs): **21 suites, 210/210 tests PASS**,
  including the 13 new fyd-010 tests. `npm run typecheck`: clean.
- Original falsification probe (post-fix): **CASE A PASS, CASE B PASS** (2/2).
- No existing test regressed (services/contract/no-evidence/visibility suites all
  green; citations still carry source + lastChecked).

## 5. Served-experience test (source != built != served)

The served Ask FYD surface is `POST /api/ask` in `server/dev-server.ts`, built to
`dist/` and calling `answerVisitorQuestion` (hardcoded visitor mode).

1. **Built bytes**: rebuilt via `npm run build:server` (alias rewrites: 18);
   `dist/src/fyd/visibility/policy.js` and `dist/src/fyd/ask/context-builder.js`
   carry `maySeeField`/`VISITOR_VISIBLE_FIELDS`. Probe fixture run through the
   BUILT `dist/src/fyd/ask/context-builder.js`: CASE A phone/home_address =
   `undefined` (website intact), CASE B fields intact — PASS on the built artifact.
2. **Served HTTP**: ran a byte-copy of `dist/` on ephemeral port 3199 (only the
   `PORT` const differed; `diff -rq` confirmed; production :3100 untouched).
   `POST /api/ask {"site":"happy-place","question":"What services do you offer?"}`
   -> 200, real services answer with intact evidence citations (source,
   lastChecked, claimClass all present). Full served JSON scanned for the
   fixture owner-field values: `15412865190`: 0 hits,
   `taylor@happyplacecarpentry.com`: 0 hits, `970-245-3869`: 0 hits.
   The single `coppersmithplumbing.com` hit is the public evidence-citation
   `source` (the business's own public website URL), not an owner field.
   Ephemeral server stopped afterwards; port 3199 free.

Note: the answer composer never emitted owner fields even pre-fix (it reads
title/description/relationships only); the leak was in the *context*, which is
what the probe and the gate cover. The served test proves the real ask pipeline
now builds a field-gated context end to end.

## 6. Boundary compliance

- HARD BOUNDARY honored: no suppression shape chosen. The gate removes fields;
  how a suppressed value renders stays with Nolan's pending D-SHIP decision.
- Renderer (`src/fyd/components/renderer.tsx`) untouched (FYD-012 scope).
- No destructive git, no push (local branch commit only). No new authorities.
  OpenRouter not used, never a dependency. Jev untouched.
- Backlog state: NOW-5 / FYD-010 was OPEN; this closure provides the proof the
  item demands ("test passes both ways"). Backlog file update left to the
  owning lane / parent (not edited here).
