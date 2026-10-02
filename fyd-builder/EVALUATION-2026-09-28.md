# FYD BUILDER — READ-ONLY BASELINE (2026-09-28, stack down)

Owner decisions LOCKED (see ~/workspace/orca-mc-sprint/MUSE-CEO-MODE-100H-FOREVER.md "FYD BUILDER — DECISIONS LOCKED").
System under construction: AN EVIDENCE-BACKED DIGITAL-PRESENCE COMPILER.
Sequencing: read-only investigation until the reliability lane reports the stack healthy (PID/HEAD/PORT/health/routes/death-log-path proven). Then: json-render spike, live served proof of /sites/happy-place and /sites/coppersmith.

## Current FYD code inventory (piging2/fyd HEAD 0264d517, read-only)

| Subsystem | Files | LOC (non-test) | Status vs locked decisions |
|---|---|---|---|
| sitespec | 13 | 3,341 | IR exists: schemas.ts, types.ts, validator.ts, render-model.ts, binding-verifier.ts (814 LOC), public-projection.ts, field-visibility.ts, safe-link.ts |
| builder | 18 | 3,658 | planner/composition machinery |
| components | 11 | 4,427 | renderer.tsx 2,197 LOC; registry.ts 178 LOC (18 semantic components + GenericObjectCard); hero-section, object-rail, object-affordance, ask-fyd-widget, compose-motion |
| customize | 8 | 3,373 | SitePatch machinery (plain English → SitePatch → SiteSpec) |
| preview | 4 | 377 | |
| owner-mode | 11 | 2,837 | DEMO_OWNER_MODE: explicit env gate, hazard banner "DEMO OWNER MODE - not real authentication", mount contract (owner routes only, never /sites/*), server-side resolution, demo verdicts never reusable for real auth — MATCHES locked decision |
| ask | 16 | 4,260 | Binding contract: INPUT = QUESTION + CURRENT OBJECT + RELATED SUBGRAPH + EVIDENCE + VIEWER CONTEXT + ALLOWED CAPABILITIES; OUTPUT = ANSWER + CLAIMS + EVIDENCE REFS + UNCERTAINTIES + OPTIONAL PROPOSED ACTION; fail-closed honest-unknown. Claim classes: SUPPORTED DIRECTLY / SUPPORTED BY MULTIPLE EVIDENCE / DERIVED / CONFLICTED / UNSUPPORTED; coarse KNOWN/CONFLICTED/UNKNOWN. Note: locked decision says DIRECT/DERIVED/INFERRED/UNKNOWN; current code folds INFERRED into DERIVED. Minor vocabulary alignment question for the spike phase — not a blocker. |
| media | 19 | 3,169 | INGEST→DIGEST→DERIVATIVES→SERVE implemented: ingest.ts (rights gate FIRST, unclear-reference-only rejected), provenance.ts (source URL, observed_at, sha256, rights classification, derived-asset chain), derivatives.ts (sharp; magic-byte validation not extension; SVG rejected upstream; decompression-bomb guard), safe-fetch.ts (shim over ONE canonical SSRF gate @/fyd/net/safe-fetch). DisplayMedia.src = "FYD-served, same origin, never a hotlink". MATCHES locked decision. No pre-existing PING-wide media library found (only src/fyd/media + API route) — FYD media IS the PING media machinery; do not duplicate. |
| acquisition | 5 | 1,558 | |
| adapters | 7 | 562 | |
| presence | 2 | 445 | |

Renderer anatomy (json-render spike input): renderer.tsx = resolveQuery (graph query resolution, FYD-owned) + boundField/boundTitle/boundDescription (evidence binding, FYD-owned) + SectionShell/motion/design-intent (presentation, partly commodity) + ~18 semantic section components (the catalog entries json-render would consume; FYD-owned content, commodity dispatch). Registry contract: schema→component mapping, single source for generator/validator/renderer. Rough hypothesis: ~30-40% of renderer.tsx is commodity dispatch/plumbing json-render could own; ~60-70% is FYD differentiation (query resolution, evidence binding, owner corrections, affordances, capability actions). The SPIKE must measure this, not this document.

Dead-code note: components/registry.ts.bak exists (stale backup). Flag for removal in a cleanup pass, not now.

## Ecosystem evaluation (COMPLETE — both scouts returned 2026-09-28; all facts verified from primary sources)

| SUBSYSTEM | CURRENT FYD LOC | CANDIDATE | LICENSE | MATURITY | SECURITY | FIT | ADAPTER LOC (est.) | DELETABLE LOC (est.) | DECISION |
|---|---|---|---|---|---|---|---|---|---|
| Renderer dispatch/registry/binding verifier/visibility/actions | ~2,197 (renderer.tsx) | json-render `@json-render/core@0.21.0` + `@json-render/react` | Apache-2.0 | LOW: 0.x, Vercel Labs, 9 months old, 233 releases = API churn risk | Good: Zod runtime validation, catalog constraint, npm provenance attestations | Partial: typed registry, dispatch, conditional visibility, dynamic props, action dispatch — but NO evidence model, NO object-graph queries, NO capability authority | ~400–700 | ~700–1,000 | **HARVEST PATTERN** — spike first; full adoption wrong bet today (pre-1.0, no evidence model). Spike success bar: net deletion above ~500 LOC + SSR parity + pinned-version strategy. |
| Ask FYD conversational layer + approval UX | ~4,260 (UI+backend mixed) | assistant-ui `@assistant-ui/react@0.15.22` + `@assistant-ui/ai-sdk` | MIT | HIGH: 2023 vintage, 12.3k stars, prod users (Mastra, LangChain, Browser Use), React 18/19 peers | Good: `safe-content-frame` for untrusted content; approval gates emit events, app decides via `respondToApproval` — execution authority stays server-side | HIGH: thread/composer/message primitives, streaming, typed tool schemas, generative UI render callbacks (evidence cards fit naturally), human-in-the-loop (human tools, execution interrupts, approval gates) → ASK → ANSWER → EVIDENCE → PROPOSED ACTION → APPROVE | ~300–500 | ~1,200–2,000 (chat chrome: thread state, streaming, composer, message rendering) | **ADOPT (scoped)** — strongest fit; UI emits events, PING executes. NEVER Assistant Cloud (PING owns continuity); frontend tools are presentation-only, never carry canonical effects. |
| Ask FYD model/tool transport | ~200–400 (inside ask) | Vercel AI SDK 7 (`ai@7.0.118`) | Apache-2.0 | HIGH: GA major 2026-06-25, Vercel-maintained | Strong: input schema re-validation before tool execution (fail-closed), approval policy re-resolution on replay, opt-in HMAC-signed approvals | HIGH as transport only: `generateText`/`streamText` + `Output.object()`, `tool()` with `inputSchema`, `needsApproval` + `toolApproval` | ~150–300 | ~200–400 | **ADOPT (transport only)** — PING keeps capability registry, authorization, canonical transitions, evidence store. Hard reqs: Node >= 22, ESM-only. Gate high-risk tools on HMAC from day one. |
| Manual visual customization (future/optional) | ~3,373 (customize) | Puck `@puckeditor/core@0.23.0` | MIT | Active: 0.23 current, commits within days, React 18/19, Next App Router recipes | No known CVEs; richtext HTML must be sanitized; editor route behind FYD auth | HIGH (conditional): app-owned components + plain-JSON data (`Data = {content, root, zones}`), headless `<Render>`; Data→SitePatch codec possible — one state model achievable | ~500–700 | ~0 today; avoids ~3–5k bespoke editor later | **REJECT now; designated FUTURE OPTION** — pick nothing until manual editing is a demonstrated need. |
| Manual visual customization | ~3,373 (customize) | Craft.js `@craftjs/core@0.2.12` | MIT | DORMANT: last release 2025-02-14, open issues, reported SWC-minify breakage under Next 15 | No known CVEs; dormancy = latent patch risk; own internal state store | LOW: owns internal state (adapt to its node tree), framework not finished editor | ~500–700 + ~3–5k to build editor UI | ~0 | **REJECT outright** — not a fallback. |
| Rich-text editing | ~3,373 (customize) | Tiptap `@tiptap/react@3.31.3` | MIT (core; paid add-ons out of scope) | Active: 3.31.3 current; enforce floor ≥3.30.6 (two 2026 advisories patched: GHSA-cp6q-959q-f8rh prototype pollution, Markdown-attr DoS) | Good with version floor | HIGH (conditional): headless JSON doc model, SSR-safe via static renderer | ~200–400 | ~0 today | **REJECT now; ADOPT when need materializes** (owner long-form text proves too constrained for plain fields, or Puck adoption drags richtext in — Puck's richtext field is Tiptap-based). |

json-render spike plan (time-boxed, side-by-side, no production commitment): adapter `sitespec-to-jsonrender.ts` (~400–700 LOC, pure function: section → flat spec, evidence grades as props, visibility → `visible` conditions, capability actions → catalog actions calling PING endpoints server-side); register 18 semantic components against catalog (they stay custom); measure adapter LOC vs deleted LOC, determinism (byte-identical spec JSON across runs), binding safety (Zod rejection of malformed specs), visibility propagation, action auth (json-render never executes canonical effects), SSR (Server Component emits spec JSON → client `<Renderer>`), mobile (reimplementation cost via @json-render/react-native), testability (JSON snapshot tests vs component tests). If net deletion < ~500 LOC, verdict stays HARVEST PATTERN.

Scout B's full writeup: [~/workspace/fyd-autonomy/candidate-evaluations-2026-09-28.md](sandbox://workspace/fyd-autonomy/candidate-evaluations-2026-09-28.md)

## Blocked on stack recovery

- json-render spike (FYD SiteSpec → adapter → json-render catalog → SAME Happy Place/Coppersmith experiences; measure adapter LOC, deleted FYD LOC, determinism, binding safety, visibility, mobile, action/capability integration, SSR, testability).
- TWO WORKING PRIVATE URLS: /sites/happy-place, /sites/coppersmith through the blessed private path, one blessed launch path + death instrumentation. Then Nolan tests personally.
- Hostile battery rerun against the INTEGRATED current head after convergence+recovery (SECRET, TENANT, WRONG_JOURNAL, HOLD, LEASE REAPER, VOCABULARY, SSRF, APPROVAL DIGEST, IDEMPOTENCY, REPLAY, RESTART). Source green is not served green.

## Standing

- Do NOT turn the builder into an infrastructure program. Hostile/security gates stay green.
- Corpus: Happy Place + Coppersmith only. FREEZE: ActivityPub, ATProto, campaigns, public-social, new graph infra.
- Metrics: mobile UX, contact discoverability, service discoverability, performance, truthfulness/evidence coverage, time-to-useful-presence.
- Acquisition: current PING stack, Crawl4AI 0.9.4+ security-equivalent, Lightpanda for browser escalation. Crawler output = UNTRUSTED OBSERVATION. DNS→connect race closed before untrusted public URL ingestion, not blocking controlled demo inputs.
- Pig: wake inhibitor while automation/dev/test active; no permanent power-policy change.
- Secret fix (139/139 + 234/234 green) is UNCOMMITTED in the dirty shared workspace: isolate exact diff from 23 unrelated dirty files, re-run focused tests from clean worktree, commit on its own branch. Do not mix.
