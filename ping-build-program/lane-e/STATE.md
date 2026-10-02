# LANE E — SCHEMA → EVERYTHING — STATE.md

Status: **PROVEN (schema→most subset + R-07 convergence)** — verdict written, convergence applied + verified + red-teamed on the Pig. Awaiting coordinator.

## Standing decisions honored

- Nolan 2026-09-23: connector credentials queued for morning; this lane used fixtures/recorded responses only, no live credentials, no connects. (No connector work was needed.)
- Nolan 2026-09-23 vendor veto: experimentation free, adoption gated. `@jsonforms/core` installed ONLY in isolated `harvest/test-jsonforms/` for mechanism testing; recommendation is REJECT for adoption (does not remove commodity code). No vendor enters any hot path.

## Ledger

- RESEARCHED: PING repo read-only via pigwsl-exec. Found the three real schemas in `src/fyd/sitespec/schemas.ts` (Business/Service/Post, FYDSchemaDef). Found five derivations, ONE wired (`eligibleComponents`; the other four tested but unconsumed). Found dual schema→component mappings (schemas.ts table vs registry.ts acceptsSchemas) — DUP note filed below. Found NO zod/ajv/prisma/drizzle in direct deps (transitive only) — no existing machinery to reuse beyond the custom FYDSchemaDef chain.
- HARVESTED: schema-driven UI ecosystem (rjsf, JSON Forms, Payload, Sanity, Keystone, Refine). Mechanism extracted: ranked predicate testers + mandatory second UI layer. TESTED headless: `@jsonforms/core@3.8.0` ranked eligibility (works, graceful unknown fallback), `generateDefaultUISchema` (flat CRUD only), AJV compile (works; not needed). → `SCHEMA-UI-HARVEST.md`.
- IMPLEMENTED: spike in `spike/` — one canonical definition (`schemas.canonical.json`, extracted verbatim + honest `declared` block) + `run.js` with 9 generators emitting to `spike/out/`.
- TESTED: `node spike/run.js` — all generators self-test; red-team: evolution law PASS (optional-add safe, type-change caught), expressiveness ceiling DOCUMENTED (6 inexpressible real requirements), editor red-team DOCUMENTED.
- PROVEN: 5/9 targets (validator, TS types, component eligibility, search fields, agent tool descriptions).
- FALSIFIED: schema→EVERYTHING as a claim — 4/9 PARTIAL, failures load-bearing (editor, relationship governance, prescriptive normalization, protocol hints). Verdict: STOP, no meta-framework. → `SCHEMA-EVERYTHING-VERDICT.md`.
- CONVERGED (2026-09-23 ~21:20 MDT, re-dispatch): DUP R-07 schema→component dual mapping resolved in the PING repo (Pig, /home/nolan/projects/ping, branch fyd-factory, uncommitted per lane policy). `SCHEMA_COMPONENTS` hand table DELETED from `src/fyd/sitespec/schemas.ts`; `eligibleComponents()` now = inversion of registry DEFINITIONS via `componentsForSchema()`; `componentForSchema()` reimplemented as its head. New leaf `src/fyd/sitespec/schema-roles.ts` (verbatim move, zero imports, re-exported by schemas.ts — all existing importers unchanged). Drift guard test added to `src/fyd/sitespec/__tests__/schemas.test.ts`.
- TESTED (convergence, Pig): tsx behavioral suite ALL VERIFY PASS (pre-existing pins + converged truth + 15-schema single-source invariant sweep + acceptsSchemas coverage); registry-first import order clean (no cycle); `tsc --noEmit` zero errors mentioning touched symbols; spike re-run 2026-09-24: 5 PROVEN / 4 PARTIAL / 0 FAILED, evolution law PASS. Caveat: repo jest cannot execute TS tests (babel has no TS transform) — pre-existing, verified on untouched registry.test.ts; equivalent assertions proven via tsx instead.
- RED-TEAMED (converged mapping): no codegen path (Map.get lookups only; renderer switches on getComponentDef, no dynamic import); malicious schema id → GenericObjectCard fallback, never throws; generator + validator consume the same derived function so the two directions agree by construction; no other hand-written schema-keyed tables exist repo-wide; residual risk: `strategies.ts`/`planner.ts` hardcode the "GenericObjectCard" NAME (a constant, not a mapping) — fine; a future rogue table would not trip the behavioral guard — recommend DUP continuous scan as the lint.
- NEXT: lane closed pending coordinator review. Remaining handoffs (unchanged): validator→proceduralizer advisory wiring; search fields→lane F; agent descriptions→lanes I/G; normalization targets→lane CONN/BCQ (advisory). One repair item for the repo owner: jest TS transform is broken repo-wide (pre-existing) — the new drift-guard test cannot execute under jest; it was proven via tsx. If the repo owner fixes jest's babel config, the guard runs in CI.

## Files

- `STATE.md` (this file)
- `schemas-as-found/NOTES.md` + `sitespec-schemas.ts.VERBATIM` + `registry-excerpt.ts.VERBATIM`
- `spike/schemas.canonical.json` — the single definition
- `spike/run.js` — nine generators + red-team + scorecard
- `spike/scorecard.json` — 5 PROVEN / 4 PARTIAL / 0 FAILED
- `spike/out/` — generated artifacts (validator.js, schema-types.d.ts, editor-spec.json, component-eligibility.json, relationship-rules.json, search-fields.json, agent-tool-descriptions.json, normalization-targets.json, protocol-hints.json + red-team notes)
- `SCHEMA-EVERYTHING-VERDICT.md` — expand-or-stop with evidence (STOP)
- `SCHEMA-UI-HARVEST.md` — steering harvest (ADAPT tester mechanism, REJECT editor generation + package adoption)
- `harvest/test-jsonforms/` — isolated mechanism tests (own node_modules, not PING)

## Handoffs needed from coordinator

1. Lane F: `spike/out/search-fields.json` as deterministic text-index seed.
2. Lanes I / G: `spike/out/agent-tool-descriptions.json` for MCP tool contracts / Ask FYD context.
3. Owner of `src/fyd/sitespec/schemas.ts` + `src/fyd/components/registry.ts`: (a) wire `validateAgainstSchema` into proceduralizer output as advisory findings; (b) consider ranked-tester eligibility ADAPT (`SCHEMA-UI-HARVEST.md` minimal wrapper); (c) converge the dual component mappings — DUP lane input.
4. Lane CONN/BCQ: `spike/out/normalization-targets.json` as advisory adapter mapping contract (never a gate).
