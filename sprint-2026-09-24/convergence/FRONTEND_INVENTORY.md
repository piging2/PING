# LANE 10: Frontend Inventory & Unification Proposal
**Lane:** 10 (frontend unification) · reader/falsifier · **Date:** 2026-09-25 ~20:10 MDT
**Scope:** read-only survey of `~/workspace` frontend surfaces. FYD worktrees on the Pig were not touched.

---

## 1. Frontend inventory

Verdicts: **REAL** = wired to real backend state with evidence · **PARTIAL** = real code, incomplete wiring · **MOCK** = renders without real backend claims · **BROKEN** = does not compile/run or references nonexistent modules.

| # | Location | Purpose | Verdict | Tech | Key file pointers |
|---|---|---|---|---|---|
| 1 | `~/workspace/mission-control/staging/mc` (+ `STATE.md`) | Operator console: TODAY screen, agents, graph, object trace, search — the human projection over the business operating graph | **REAL (core) / PARTIAL (edges)** | Next.js App Router, React client components, server-side reads | `src/app/mission-control/page.tsx` (549 lines); `src/app/api/mc/{today,agents,graph,object,search,trace-forward}/route.ts`; `STATE.md` records 2026-09-24 ~06:10 MDT live verification (6 routes 200, `next build` + `tsc` clean, `/api/mc/today` PROVEN reading journal :18199, fleet ledger, cron.d, git). page.tsx self-labels: `Badge` with PROVEN/DEGRADED/PROTOTYPE; three `"Not yet wired"` Cards (lines 212, 289, 420) — honest partial, not faked |
| 2 | `~/workspace/ping-ui-contract` | Typed API/UI contract: 17 JSON schemas + envelope helpers, API clients, and Mission Control projection **builders** (approval-queue, automation-health, intent-ledger, mission-list, mission-window). Not rendered UI — data + contract layer for UIs | **REAL** | Node `.mjs`, JSON Schema | `CONTRACT_STATUS.md` (55 contract tests pass; falsification-harvested: routes removed as unevidenced; gap-labeled builders — e.g. approval queue renders `PENDING_HUMAN` with `SNIPPET_APPROVED` dispatch gap labeled; `packages/schemas/src/schemas/*.json`; `packages/api-client/src/{authenticated,operator,public}-client.mjs`; `apps/mission-control/src/*.mjs` |
| 3 | `~/workspace/fyd-product-lane/src/fyd/family` | FYD public-site component family: 13 registered components (Hero, TrustBar, ServiceGrid, ProjectGallery, BusinessStory, ContactCTA, AskFYD, …) with variant registry, section shell, 44px targets, focus rings | **REAL (components) / deployment unverified from workspace** | React + Tailwind, token-driven classes (`bg-surface-content`, `text-text-heading`) | `family/registry.tsx`, `family/family-page.tsx`, `family/surfaces.tsx`, `family/shared.tsx` (BTN_PRIMARY/SECONDARY/GHOST, FOCUS_RING, cx), `family/components/AskFYD.tsx` (76-line floating-entry pill, links to ask target, never embeds chat in public DOM) |
| 4 | `~/workspace/fyd-product-lane/builder/tokens` | Design-token pipeline: intent-named tokens, contrast gate, multi-format output | **REAL** | style-dictionary (W3C DTCG-ish) | `tokens/tokens/{semantic.hpp,component.hpp,motion,media}.tokens.json` (semantic tier names PURPOSE not appearance, e.g. `action.primary`, `surface.raised`, with contrast ratios in descriptions); `formats/fyd-{css-variables,tailwind-theme,ts-tokens}.mjs`; `lib/contrast-gate.cjs`; `out/` |
| 5 | `~/workspace/fyd-build/src/fyd` | FYD spec-driven renderer: `(SiteSpec + ObjectGraph + ViewerContext) -> UI`; deterministic query resolution; viewer visibility policy; Ask FYD evidence-bounded pipeline; safe-link hardening | **REAL** | TS/React, jest | `components/renderer.tsx` (716 lines: "The spec is data… No company-specific hand-layout"), `components/registry.ts`, `visibility/policy.ts`, `ask/{answer,context-builder,visitor}.ts`, `sitespec/safe-link.ts`; tests `components/__tests__/render.test.ts`, `hostile-url.test.ts`, `ask/__tests__/{contract,no-evidence}.test.ts` |
| 6 | `~/workspace/fyd-object-build/src` | Per-object surfaces: portable ObjectCircle doorway (inline → preview card → bottom-sheet dialog), AskObjectPanel chat, `/o/[objectId]` pages, owner overrides API | **PARTIAL** | Next.js App Router; server-only owner store | `fyd/ui/object-circle.tsx` (keyboard operable, reduced-motion honored, actions render ONLY from `view.capabilities`); `fyd/ui/ask-object-panel.tsx`; `fyd/object/owner-store.ts` (server-only, durable JSON per object: "Owner decisions are DURABLE state, not generated cache"); `app/api/fyd/objects/[objectId]/overrides/route.ts` REAL. **Gap inside:** `ask-object-panel.tsx` posts to `POST /api/fyd/ask`, but **no ask route exists in this tree** (`find` for `api*ask*` returned nothing) → Ask panel unwired here |
| 7 | `~/workspace/fyd-lane/lane-b` | Object projection trio: Card (embed), Node (full), Circle reuse; `evidence-chrome.tsx` (EvidenceMark, WhyThis drill-down, CapabilityActions, FactRow, InitialsMark, RelatedRow); anti-invention rules | **REAL (as staging)** | React + jest (renderToStaticMarkup) | `card.tsx`, `node.tsx`, `evidence-chrome.tsx`, `object-projection.ts`, `card-node-projections.test.tsx` (asserts: missing contact → no tel:/mailto: actions; no evidence → value never renders). `transfer-laneb.py` shows these were shipped to the Pig (`/home/nolan/projects/ping/src/fyd/object`) — workspace copy is staging |
| 8 | `~/workspace/fyd-lane/builder/work-phase23/owner-panel.tsx` | Owner change loop: propose (preview only) → approve → receipt; revert through same loop | **PARTIAL** (pattern real, staging) | React client, fetch to real route | Phase machine `idle|proposing|proposed|approving|applied|failed`; `onApprove()` echoes `baseStateDigest`, receipt shows `resultDigest` + `approvedAt` (lines 115–144); "Preview only: nothing is written until you review and approve" (line 237). Fetches `/api/fyd/objects/<siteId>/overrides` — route exists in fyd-object-build (entry 6) |
| 9 | `~/workspace/uilane2` | Command-center/cockpit/chat app (descendant of ui-next) | **BROKEN** | Next.js (incomplete) | `src/app/command-center/page.tsx` imports **16 components that do not exist** (verified: `MissionControlHeader`, `PremiumChatBubble`, `ArchitectureView`, `KnowledgeGalaxy`, `TimeMachine`, `OllamaControlRoom`, … all MISSING from `src/components/`, which contains only `CockpitDashboard.tsx`, `ConstitutionalMixer.tsx`, `DecisionEngine.tsx`). **No `package.json`** in the tree. The sibling evidence `phase24-ui/NotLiveInventory.tsx` classifies these exact component names as `PHANTOM` (calls nonexistent routes; persists edits to local state only) / `UNWIRED` |
| 10 | `~/workspace/phase24-ui` | Orphaned component copies: CockpitDashboard, MissionCards, SemanticMemory, NotLiveInventory, command-center-page | **BROKEN as standalone / orphaned** | React .tsx, no lib dir | `CockpitDashboard.tsx` imports `@/lib/gateway`, which **does not exist** in this dir (no lib/ at all); older 530-line-different duplicate of uilane2's version. Value is archival only — EXCEPT `NotLiveInventory.tsx`, which is a valuable **truth-telling artifact** (documents exactly which surfaces are PHANTOM/UNWIRED and why) |
| 11 | TenantOS frontend | — | **NONE EXISTS** | — | `~/workspace/tenanos-wave` contains **zero** `.tsx` UI files and zero app entry HTML. Only UI-adjacent content: two raw proceduralize HTML fixtures under `scratch/lane-h/fyd/.../raw/`. TenantOS has no frontend; every other product does. (This is the largest product-surface gap found.) |
| 12 | `~/workspace/ui-next` | Historical operator console (26 components, `lib/gateway.ts`, Dockerfile) | **BROKEN / absent** | Next.js 14 | Directory is empty/absent in this workspace. Per `convergence-expansion-2026-09-19/lanes/ui-harvest/REPORT.md` (2026-09-19): "Not deployed: nothing listens on :3000 on the Pig; no compose service references it. Console is source-only today." uilane2 is its broken descendant |
| 13 | `~/workspace/fyd/product-lane/piging2-fyd-a69bb68fc84620a5635e071030cf49a633df7394/src` | Historical FYD snapshot: fyd-circle, object-cards, royal-mirror, ask-object-panel, evidence-state.tsx, fail-closed.tsx | **MOCK / archival** | React + tests | `fyd/ui/{fyd-circle,object-circle,evidence-state,fail-closed}.tsx`; `__tests__/{fyd-circle,object-cards,royal-mirror}.test.tsx`. Superseded snapshots; do not harvest without diffing against live worktree first |
| 14 | `~/workspace/phase20-builder-staging`, `~/workspace/ping-overnight/website` | — | **NO UI** | scripts / markdown | Only harness scripts (`replay_context_pack_builder.js` etc.) and reports (`HOMEPAGE_REPORT.md`, `TRUTH_MATRIX.md`). Not frontends |
| 15 | `~/workspace/demo-sites/sites/{fruita-family-dental,palisade-web-studio}` | Static generated site artifacts (`index.html`, `app.js`, `styles.css`) | **Generated output, not a frontend** | static HTML | Evidence of builder output; not reusable UI code |
| 16 | `~/workspace/fyd-portal-proof` | Proof docs, screenshots, harnesses | **NO UI** | md/json/png | `PROOF.md`, `RAIL-PROOF.md`, shots; verification evidence, not a surface |

**What was NOT inspected (out of scope):** live FYD lanes in `/home/nolan/worktrees/*` (hard constraint); the actual served `:3100` surface (memory records it as the live product).

---

## 2. Reusable pieces catalog

### Design tokens — REAL, strongest foundation piece
- **Source:** `~/workspace/fyd-product-lane/builder/tokens/` — full style-dictionary pipeline.
- **What it gives:** W3C-DTCG-style JSON (semantic tier is intent-named: `action.primary`, `surface.raised`, `text.heading` — names describe purpose, never appearance); primitive tier underneath; `motion.tokens.json`, `media.tokens.json`; a **contrast gate** (`lib/contrast-gate.cjs`) that hard-blocks inaccessible pairings (ratios documented per token, e.g. 9.90:1); three outputs: CSS variables, Tailwind theme, TS tokens.
- **Caveat:** the current token *values* are the HPP warm-neutral craftsman palette (terracotta/amber/teal). Reusable part = the **pipeline + semantic tier + contrast gate**; palettes stay per-brand/product. No second product has adopted this pipeline yet.
- **Family consumption:** `family/shared.tsx` shows the consumption pattern (BTN_PRIMARY/SECONDARY/GHOST, FOCUS_RING, 44px targets) — portable to any React surface.

### Primitive components — PARTIAL (two good kits, no generic lib)
- **FYD family primitives** (`family/shared.tsx`): `cx`, `FOCUS_RING`/`FOCUS_RING_INVERSE`, `BTN_PRIMARY/SECONDARY/GHOST`, `HOOK_LINK`, `TARGET_44`. REAL, but FYD-marketing-styled.
- **Evidence chrome** (`fyd-lane/lane-b/evidence-chrome.tsx`): `EvidenceMark` (state label + receipt/asOf hover + WhyThis drill-down), `FactRow`, `RelatedRow`, `InitialsMark`, `CapabilityActions`. Product-neutral; explicitly shares the Circle's substrate ("No new design language, no per-customer CSS"). **Best evidence-UI harvest candidate.**
- **`ObjectCircle`** (`fyd-object-build/src/fyd/ui/object-circle.tsx`): the doorway primitive — inline → hover preview → bottom-sheet dialog, keyboard-operable, reduced-motion, capability-gated actions.
- **Gap:** no generic component library exists in PING code. Every `button.tsx`/`components/ui` hit in the workspace is third-party harvest (nango, mem0, vercel-ai-sdk demos, repo-mirror) — do not mistake for PING-owned. Any shared foundation needs a small primitives package (button/input/dialog/toast/table) built from the `shared.tsx` pattern, not invented from scratch.

### Object renderer — REAL
- **Source:** `~/workspace/fyd-build/src/fyd/components/{renderer,registry}.tsx` + `visibility/policy.ts`.
- Contract: `(SiteSpec + ObjectGraph + ViewerContext) -> UI`; deterministic query resolution (related sorts by id, feeds newest-first with id tie-break — "Never by insertion or database order"); viewer-scoped graph filtering; missing data ⇒ section absent, never invented; URL hardening (`safe-link.ts`, hostile-url test).
- Projections: `ObjectCard` (embed), `ObjectNode` (full), `ObjectCircle` (doorway) all render the **same** `ObjectProjection` (lane-b test proves triple-projection equivalence on renderToStaticMarkup).

### Evidence UI — REAL, best in class: lane-b chrome
- `EvidenceMark` + `WhyThis` lineage drill-down + `EvidenceStateLabel`; rule: `unknown` claim ⇒ label + Unknown mark, value never rendered; `withheld` ⇒ "Hidden by owner".
- Ask FYD is evidence-bounded (`fyd-build/src/fyd/ask`: citations type `AskFydCitation`; `no-evidence.test.ts` proves honest refusal). Public AskFYD entry is a quiet pill (entry 3), full panel lives on demand.

### Capability invocation — PARTIAL (gating real, invocation wiring thin)
- **Gating is real everywhere:** actions render ONLY from `projection.capabilities` / `view.capabilities` (ObjectCircle, lane-b `CapabilityActions`, evidence-chrome header: "a phone number exposes Call only when the call capability exists").
- Invocation handlers (what happens on click, receipts) are component-local; no shared capability-invocation contract was found. The **conceptual owner** would be the ping-ui-contract `capability.json` schema + operator client — but no UI binds to it yet.

### Proposal/approval UI — PARTIAL (two real patterns, one data builder)
- **Owner change loop** (`owner-panel.tsx`): propose → preview → approve → receipt with digests; fail-closed errors; revert through same loop. This is the pattern to standardize.
- **Approval queue builder** (`ping-ui-contract/apps/mission-control/src/approval-queue.mjs`): renders `PENDING_HUMAN` with the `SNIPPET_APPROVED` dispatch gap labeled — data projection only, no React UI yet. (Mission Control STATE.md notes mutation controls are **withheld by law** until witnessed mutations exist — approval UI must stay read-only/pending until then.)
- CLI-side approval UIs found (`ping-autonomy-challenge/.../letta-code` Ink components) are third-party, not PING's.

### Auth / session handling — GAP
- No frontend auth/session UI found anywhere. `ping-ui-contract/packages/api-client` has `AuthenticatedPingClient` (auth GETs only, token redaction tested, read-only per ADR) — transport-level, not a session/login UI. Mission Control staging routes read server-side with no auth boundary visible. **Any unified foundation needs a session story; none exists today.**

### Command palette, activity streams, agent status — GAPS / orphaned
- **Command palette:** zero hits across the workspace. Gap.
- **Activity streams:** no generic stream component. Closest: Mission Control `/api/mc/today` + `trace-forward` + intent-ledger builder (evidence-backed activity data, no shared stream UI).
- **Agent status:** `MissionCards.tsx`/`CockpitDashboard.tsx` in uilane2/phase24-ui — the dashboard components themselves bind to real gateway shapes now (uilane2's CockpitDashboard rewritten 2026-09-19 to the real `/system/state` shape with "UI truth fix" comments), but the **pages that host them are broken** (entry 9). Salvage the components, delete the pages.

### Truth-labeling convention — REAL, worth standardizing
- `mission-control` page: `PROVEN`/`DEGRADED`/`PROTOTYPE` badges + `"Not yet wired"` cards.
- `phase24-ui/NotLiveInventory.tsx`: `PHANTOM`/`UNWIRED` classification with reasons.
- `ping-ui-contract`: maturity × stage axes (PROVEN/BUILT_NOT_LIVE/EXPERIMENTAL/DIRECTION/UNPROVEN/FALSIFIED/UNKNOWN × HARVESTED/…/DEPLOYED), gap-labeled builders, "UI never generates execution identity".
- One shared vocabulary + one badge set would unify all three.

---

## 3. Proposed shared foundation (no new framework)

**Host the foundation in `ping-ui-contract`-style packages** (the one workspace area that already does typed contracts + tests + explicit maturity vocabulary), NOT a new framework:

**Share:**
1. **Tokens:** `fyd-product-lane/builder/tokens` pipeline + semantic tier + contrast gate. Palettes per product/brand; the semantic tier, build config, and gate are shared. Mission Control currently hardcodes hex in `page.tsx` (`#14141c`, `#2c2c3a`) — migrate it to tokens first; it is the cheapest convergence win.
2. **Primitives package:** `cx`, focus-ring, 44px targets, button variants from `family/shared.tsx` + a small new set (input, dialog, toast, table, badge) built the same way. No invention: start from what exists.
3. **Object renderer + projections:** `fyd-build` renderer/registry + lane-b Card/Node + ObjectCircle. One object, many projections, same substrate.
4. **Evidence chrome:** lane-b `evidence-chrome.tsx` (EvidenceMark/WhyThis/CapabilityActions) as the shared evidence UI; `evidence-state` labels standardized.
5. **API client + schemas:** `ping-ui-contract/packages/{schemas,api-client}` as the only data-access layer frontends may use; frontends never fetch arbitrary routes (this is also how you keep canonical truth out of React state — projections are computed server-side or by tested builders, shipped as props).
6. **Truth labels:** one badge set (`PROVEN/DEGRADED/PROTOTYPE` for screens; `PHANTOM/UNWIRED` for dead surfaces), one rule: timeouts and unknowns render as "unknown / reconciliation in progress", never as failure or fabricated success.
7. **Proposal/approval phase machine:** the `owner-panel.tsx` pattern (propose → preview → approve → receipt, digest-echoed, revert through same loop) as the shared approval interaction; data side from `approval-queue.mjs`.
8. **Capability gating:** keep the rule "actions render only from `projection.capabilities`" as a foundation invariant; add the missing invocation/receipt contract on top of `capability.json`.

**Stays product-specific:**
- FYD public-site family components (Hero, TrustBar, ServiceGrid… — marketing composition for customer sites).
- Mission Control ops composition (TODAY screen, fleet ledger readers, grilling-brief readers, agent tables) — the *data sources* are product-specific; the *chrome* (cards, badges, tables) comes from shared primitives.
- TenantOS: **nothing to converge yet** — needs a first frontend; building it on the shared foundation from day one is the unification opportunity.
- Brand palettes/typography per site (token values), object-layer placement behaviors (EMBEDDED/EDGE/PERSISTENT per Nolan's object-presence law — FYD-specific).

**No-canonical-truth-in-React-state rule (already demonstrated in this codebase):**
- `owner-store.ts`: owner decisions are **server-only durable state** (one JSON per object, separate from source state; "Source re-ingestion… can never erase owner intent"). Client holds only the phase machine (`idle|proposing|…`), never the decision.
- `owner-panel.tsx`: approve echoes `baseStateDigest`/`resultDigest` from the server; the receipt is server-minted evidence, not client state.
- `ping-ui-contract` builders: projections computed outside the UI; UI renders what it is given; `run_id` is explicitly **not** generated by UI ("UI never generates execution identity").
- Mission Control staging routes read live backends server-side; the client page only holds fetch status and honest health badges.
- Foundation rule to write down: **client state = interaction only** (hover, open/closed, form drafts). Anything that must survive a reload or be trusted by another actor lives behind a server route / durable store and arrives as a projection with provenance.

---

## 4. Open questions & candidate gaps (with evidence)

1. **Which FYD code is actually live?** The workspace holds at least five FYD UI generations (fyd-build renderer, fyd-product-lane family, fyd-object-build, fyd-lane lane-b, fyd-margin-layer staging, plus the `fyd/product-lane/piging2-*` snapshot). Live lanes are in Pig worktrees (out of scope). Convergence cannot safely pick "the" renderer without a live-vs-staging map. Evidence: duplicate `ObjectCircle` implementations in `fyd-object-build/src/fyd/ui/object-circle.tsx`, `fyd-margin-layer/staging/src/fyd/ui/object-layer/ObjectCircle.tsx`, and the piging2 snapshot.
2. **TenantOS has no frontend at all** (zero .tsx; §1 entry 11). If TenantOS is a product, this is the biggest UI gap in PING. Decision needed: does it get a first frontend built on the shared foundation, or is it intentionally UI-less?
3. **`/api/fyd/ask` route missing** in `fyd-object-build` while `ask-object-panel.tsx` posts to it (§1 entry 6). Either the route lives elsewhere (live tree?) or the Ask panel is unwired here — needs confirmation before anyone demos it.
4. **Auth/session story absent** (§2). Mission Control staging routes read privileged sources (journal, fleet ledger, cron.d, git) with no visible auth boundary. Before any shared foundation ships, decide: private-surface allowlist, bearer/session, or gateway-owned auth.
5. **uilane2 / phase24-ui / ui-next: delete or salvage?** Recommendation from evidence: salvage `CockpitDashboard.tsx` (2026-09-19 truth-fixed, binds real `/system/state` shape), `MissionCards.tsx`, and `NotLiveInventory.tsx` as a pattern; delete the broken pages and the 16 phantom imports. Needs Nolan's word (destructive).
6. **Capability invocation contract missing** (§2): gating is real, but click → invocation → receipt has no shared contract. The `capability.json` schema exists in ping-ui-contract — is it the intended owner? UNKNOWN.
7. **No command palette, no activity-stream component, no agent-status kit** (§2). Mission Control would be the consumer; build only when a product needs one (YAGNI until then).
8. **Token adoption is single-product.** The token pipeline is the best foundation piece but only the FYD family consumes it. Mission Control hardcodes hex; nothing else uses it. Convergence = migrate consumers, not rebuild tokens.
9. **Who owns `ping-ui-contract` vs `mission-control/staging/mc`?** Two Mission-Control-shaped efforts: typed builders (contract repo) and the staged Next app. They look complementary (builders feed the app), but no file states the relationship. Confirm before unifying.
10. **Staging-vs-live drift:** workspace `staging/` dirs (`mission-control/staging`, `fyd-margin-layer/staging`, `lane-d/staging`) are local copies of Pig-side work. Any convergence decision made from workspace copies must be re-verified against the live trees — per the hard constraint, that verification belongs to a Pig-side lane, not this one.

**Candidate harvest list (do not auto-merge; each needs a Pig-side diff against live):**
- `family/shared.tsx` primitives → shared primitives package seed
- `lane-b/evidence-chrome.tsx` → shared evidence chrome
- `fyd-build` renderer/registry/visibility → shared object renderer
- `fyd-product-lane/builder/tokens` → shared token pipeline
- `ping-ui-contract` schemas/api-client/builders → shared data layer
- `owner-panel.tsx` phase machine → shared approval interaction
- `uilane2` CockpitDashboard/MissionCards (truth-fixed) → Mission Control component salvage
- `phase24-ui/NotLiveInventory.tsx` → pattern for a standing "surface truth" page in the foundation

---
*No files were modified except this report. No backlog writes made. FYD worktrees untouched.*
