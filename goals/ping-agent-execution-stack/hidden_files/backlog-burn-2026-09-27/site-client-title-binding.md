# SITE-CLIENT RESIDUAL — `{o.title}` routed through the binding verifier

Date: 2026-09-27. Implementer: SITE-CLIENT RESIDUAL subagent.
Lane branch: `site-client-title-binding`, local only, never pushed.
Task: FYD-012 follow-up residual — `src/app/sites/happy-place/site-client.tsx:274`
rendered `{o.title}` directly, flagged out of scope in the FYD-012 closure ledger
(renderer.tsx + lint wiring only).

## Verdict: PASS

## 1. Collision check

- Before editing: `git status --short -- src/app/sites/happy-place/` and
  `git diff HEAD --stat -- src/app/sites/happy-place/` both empty — the
  concurrently-working FYD-038 agent had no uncommitted changes in the directory
  at edit time. No collision; edit proceeded.
- Exactly one `{o.title}` occurrence in the file (line 274 before edit;
  line 288 after, shifted by the added imports/helper).

## 2. Delta (site-client.tsx only + one new test file; nothing else in the repo)

- +2 imports: `resolveBoundField` from `@/fyd/sitespec/graph`,
  `type PingObject` from `@/lib/ping/types`.
- New module-level `boundTitle(graph, o)` helper — same contract as
  renderer.tsx's boundTitle (direct binding, title pseudo-field): verified →
  string, unverified → undefined (OMIT, never guess). Takes `graph` directly
  because EditorPanel receives it as a prop (renderer.tsx's version reads
  `ctx.graph` from its RenderContext).
- The render expression: `{o.title}` → `{boundTitle(graph, o)}`.
- `claims.ts` untouched (generation-time authority unchanged); no second
  validator created — the read goes through the verifier absorbed into
  `src/fyd/sitespec/graph.ts`, per the FYD-012 reconciliation.

## 3. Lint before / after

- BEFORE: `fyd012-binding-coverage.py --inventory src/app/sites/happy-place/site-client.tsx`
  → `[]` — the read is invisible to the lint (it scans `.fields` reads only),
  confirming it was uncovered by FYD-012's mechanism. Canonical `--check`
  (absolute path) on renderer.tsx → `FYD-012 LINT PASS: 4 direct read(s), all allowlisted.`
- AFTER: same `--check` → PASS (exit 0, unchanged; the fix introduces no
  `.fields` reads). Inventory on site-client.tsx → `[]`. The read is now
  *covered* behaviorally through the verifier (proven by the new test), not
  by an allowlist entry — the lint's `.fields` scan scope was deliberately
  not extended (out of this task's surface boundary).

## 4. Test wiring

- New `src/fyd/components/__tests__/site-client-title-binding.test.ts`
  (`.test.ts` to match the existing testMatch glob; mounts via
  `React.createElement` because SiteClient uses hooks): renders the full client
  shell via `renderToStaticMarkup(SiteClient)` with a two-object
  `{ kind: "all" }` fixture so the Featured row appears.
  - Verified provenance ref → both titles render in the featured buttons;
    "Featured" chrome renders.
  - Empty provenance ref → both titles omitted (fail closed);
    "Featured" chrome still renders.
- 2/2 pass.

## 5. Suite + typecheck

- `npm test` (full jest): **25 suites / 233 tests green**
  (was 24/231 at FYD-012 closure; +1 suite / +2 tests = this test file).
- `npm run typecheck` (`tsc --noEmit -p tsconfig.json`): clean.

## 6. Cost / boundaries

- Deterministic + headless labor only; no Copilot identities used, no paid
  model calls. No pushes, no destructive git, no new authorities, Jev untouched.
- claims.ts stays the generation-time authority; the absorbed verifier stays
  the render-time field-read layer — the FYD-012 reconciliation holds.
