# S8 — SEMANTIC AUDIT: adapter lib/ (events.ts + editor + infrastructure + remaining src)

**Worker:** S8 (semantic audit, MAXIMUM PARALLEL PROGRAM) · **Date:** 2026-09-23 ~20:10 MDT
**Base:** ADAPTER `/home/nolan/projects/ping-constitutional` @ `a69bb68f` (branch `constitutional-convergence-v2`, worktree CLEAN)
**Core consulted:** `/home/nolan/ping` @ `refactor/runtime-authority-convergence` — read-only, no writes, no process touches, no secret values printed.
**Mode:** READ-ONLY. COMMITS CREATED: NONE. All patches below are PROPOSALS (WHY→EVIDENCE→MINIMUM CHANGE→TEST→RESULT); nothing applied.
**Transport:** `ssh -F /home/hatch/.ssh/pig-config pigwsl 'wsl -- bash -s'` (stdin-fed scripts), `git grep` sweeps (tracked files), bounded `sed` reads.

**Block:** `src/lib/events.ts` (incl. `ReplayRepository`) · `src/lib/editor/*` (8 files) · `src/lib/infrastructure/*` (3 files) · remaining `src/lib` not covered by authority-map / S6 / S7.

**Prior art consulted (not re-litigated):** `~/workspace/constitutional-sprint/event/EVENT-FORENSICS.md`, `authority-map/AUTHORITY-MAP.md`, `security/SECURITY-SWEEP.md`, `reachability/REACHABILITY.md`. Authority-map rows #34/#35 (events.ts), #36–#40 (editor), #41 (infrastructure), #43 (ping-api), #45 (classifier-provider), #49 (api/client) already classified these files at file granularity; this pass re-verified the unreachability claims with fresh `git grep` evidence, traced the full mechanism lifecycle DEFINED→…→TESTED per exported mechanism, and verified the known duplicates (serializers) and the known zero-consumer (`ReplayRepository.findAfter`).

---

## 1. Lifecycle traces (per mechanism)

Notation: ✓ proven at that stage · ✗ proven absent · — not applicable. Stages: DEFINED / IMPORTED / CONSTRUCTED / INITIALIZED / STARTED / REGISTERED / CALLED / PERSISTING / READ BACK / RESTARTED / TESTED.

### 1a. `src/lib/events.ts` — HPP Event Logger (284 lines)

| Mechanism | DEF | IMP | CON | INI | STA | REG | CAL | PER | READ | RST | TST | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `logEvent` → `InMemoryEventRepository.append` (write path) | ✓ | ✓ 3 routes | ✓ module singleton | ✓ | — | — | ✓ 3 routes | ✗ memory only, lost on restart | ✗ no read callers | ✗ | ✗ no tests | **LEGACY, half-live**: writes are live from 3 marketing routes; durability is absent by design (header says so honestly) |
| `ReplayRepository` interface (`append/appendMany/findById/findAfter/exists/existsByProvenance`) | ✓ | ✗ no importers | — (interface) | — | — | — | ✗ `findAfter`, `existsByProvenance` zero refs repo-wide | — | — | — | ✗ | **LEGACY, declared-unfulfilled**: "For PING and replay systems" — no PING/replay consumer exists |
| `WebsiteRepository` read half (`getEventsByType/getEventsByEmail/getAllEvents`, `findById/findByType/findByEmail/findAll`) | ✓ | ✓ (same module) | ✓ | ✓ | — | — | ✗ zero callers outside `events.ts` | ✗ (would read memory) | ✗ | ✗ | ✗ | **LEGACY, dead read-half**: implemented, never called |
| `setEventRepository` / `getEventRepository` (swap seam) | ✓ | ✗ no importers | — | — | — | — | ✗ zero callers | — | — | — | ✗ | **LEGACY, dead seam**: "swap with SQLite when npm install is available" never happened |

Evidence:
- Write callers (exact): `src/app/api/kit/webhook/route.ts:39` (`logEvent(eventType as any, …)` — note the `as any` cast: webhook eventType is NOT type-checked against `HPPEventType`), `src/app/api/newsletter/subscribe/route.ts:53` (`logEvent("NewsletterSignup", …)`), `src/app/api/resources/download/route.ts:30` (`logEvent("GuideDownloaded", …)`). Verified via `git grep -n 'logEvent' -- 'src/app/api/**/*.ts'`.
- `git grep -ln 'ReplayRepository\|findAfter\|existsByProvenance\|setEventRepository\|getEventRepository' -- '*.ts' '*.tsx'` → **only `src/lib/events.ts`**. Zero replay consumers: **CONFIRMED** (the known claim).
- `git grep -n 'getEventsByType\|getEventsByEmail\|getAllEvents\|findById\|findByType\|findByEmail\|findAll'` excluding `events.ts` and the unrelated `authority-loader.ts` generic `findById` helper → **zero hits**. Dead read-half: **CONFIRMED**.
- `SCHEMA_VERSION` / `HPPEvent` referenced only in `src/types/events.ts` + `src/lib/events.ts`: type surface is self-contained; nothing else in the repo consumes the HPP event types.
- No `__tests__` under or referencing `src/lib/events.ts`. Identity: `crypto.randomUUID()` v4 (events.ts:229). Ordering: array insertion order, no sequence column. Provenance idempotency exists in code (`existsByProvenance`) but is only exercised via `append`'s internal check.

### 1b. `src/lib/editor/*` — dormant event/sequence stack (8 files, 2085 lines)

| Mechanism | DEF | IMP | CON | INI | STA | REG | CAL | PER | READ | RST | TST | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `EventStore`/`EventBus`/`EventSystem` singletons + `eventBuilder` (event-system.ts:144–671) | ✓ | ✗ no external importers; only `command-pattern.ts` dynamic-imports them inside never-called methods | ✗ module singleton never loads (no importer → module never evaluated) | ✗ | ✗ | ✗ | ✗ | ✗ (delegates to DurableEventStore = memory) | ✗ | ✗ | ✗ | **DORMANT**: internally coherent, externally unreachable |
| `SequenceAuthority` (`sequenceAuthority`, sequence-authority.ts:115) | ✓ | ✓ editor-internal only (`command-pattern`, `durable-event-store`, `event-system`, `placement-graph`) | ✗ never loads externally | ✗ | ✗ | ✗ | ✗ | ✗ (counter in memory) | ✗ | — (`reset()` exists, untested) | ✗ | **DORMANT**; name claims "One Canonical Sequencing Model" but owns no live sequence — the live journal's sequencing is the external gateway's (authority-map gap, unchanged) |
| `DurableEventStore` (`durableEventStore`, durable-event-store.ts:208) | ✓ | ✓ editor-internal only | ✗ never loads externally | ✗ ("No persistence loading - in-memory only") | ✗ | ✗ | ✗ | ✗ **in-memory only** | ✗ | ✗ | ✗ | **DORMANT + FAKE COMPLETION**: the NAME promises durability; the constructor comment admits in-memory-only. Header: "Constitutional Law: Event Store Must Be Durable" |
| `CommandExecutor`/`commandBuilder` (command-pattern.ts:558–559) | ✓ | ✗ external refs only in `canonical-editor-service.ts` (itself dormant) | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | **DORMANT** |
| `CanonicalEditorService` (`canonicalEditorService`, canonical-editor-service.ts:252) | ✓ | ✗ **zero importers repo-wide** | ✗ module-level `getInstance()` never runs | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | **DORMANT**: the whole "UI emits intents → canonical commands" boundary has no UI |
| `PlacementGraphManager` (`placementGraph`, placement-graph.ts:375) | ✓ | ✓ editor-internal only | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | **DORMANT** |
| editor `SlotRegistry` (`slotRegistry`, editor/slot-registry.ts:124) | ✓ | ✓ **one** external importer: `src/components/editor/editable-slot.tsx:13` | — | — | — | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | **DORMANT (branch-stranded)**: the single external edge dangles — see below |
| `ValidationResult`/`ValidationFailure` (validation-result.ts) | ✓ | ✓ editor-internal | ✗ | — | — | — | ✗ | — | — | — | ✗ | **DORMANT** |

The single dangling edge, traced to the end:
- `src/components/editor/editable-slot.tsx` imports `{ slotRegistry, SlotRegistration, SlotConstraints }` from `@/lib/editor/slot-registry` (line 13).
- `git grep -l 'components/editor' -- '*.ts' '*.tsx'` → **zero hits**. No page, route, or component imports `editable-slot.tsx`. It is a leaf with no parent: branch-stranded.
- All editor→editor dynamic imports (`import('./event-system')`, `import('./command-pattern')`, `import('./slot-registry')`, `import('./placement-graph')` in canonical-editor-service.ts:69/88/89/110/179, command-pattern.ts:325/335/336/396/404/418/479, event-system.ts:293/294) are **intra-subgraph**; no external `import()` reaches the editor from any route/page. Verified via `git grep -n "import("` filtered for `editor`.
- No `__tests__`, no `*.test.*` under `src/lib/editor/`.
- The internal machinery is coherent (EventStore delegates to durableEventStore; EventBus notifies listeners without storing; `EventSystem.replay` folds onto projections via placementGraph/slotRegistry; `commandToEvent` lazily imports eventBuilder to dodge a circular dep) — it is a complete, self-consistent, never-loaded machine.

### 1c. `src/lib/infrastructure/*` — (3 files, 1079 lines)

| Mechanism | DEF | IMP | CON | INI | STA | REG | CAL | PER | READ | RST | TST | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `InfrastructureController` / `getInfrastructureController` (controller.ts:50,368) | ✓ | ✗ zero importers | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | **UNREACHABLE** |
| `runInfrastructureAudit` / `printAuditReport` (audit.ts:347,404) | ✓ | ✗ zero importers | — | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | **UNREACHABLE** |
| `checkAuthStatus` / `initiateGoogleOAuth` / `exchangeAuthCode` / `validateCredentialStorage` (auth-manager.ts) | ✓ | ✗ zero importers | — | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | **UNREACHABLE** |

Evidence:
- `git grep -l 'lib/infrastructure' -- '*.ts' '*.tsx'` → **zero hits** (the known claim, re-verified).
- Dynamic imports inside are intra-subgraph (`controller.ts:166` → `./audit`) or third-party (`googleapis`); no external root ever loads any of the three modules.
- History: all three date to the initial harvest commit `f6386ee1` (2026-09-16, "Initial PING website: independent TenantOS tenant site"); the only later touch `dba78c15` (2026-09-21) changed **1 comment line per file** ("Happy Place Automation Platform" → "PING Infrastructure") — cosmetic rebrand, no functional wiring. Verified via `git show dba78c15 -- src/lib/infrastructure/`.
- Present on ALL branches checked (`main`, `fyd-deploy`, `fyd-factory`, `constitutional-convergence-v2`) from the same initial commit: inherited TenantOS harvest, never adopted by this repo's lineage.
- No tests.

### 1d. Remaining `src/lib` — zero-external-reference sweep

Two-pass method: (1) basename `git grep` excluding self + `__tests__`; (2) exact module-name `git grep -l` excluding self-file. Both agree. Dynamic-import scan found no external `import()` of any of these. All date to the harvest era (spot-checked via `git log`).

| Module | Refs outside self | Notes |
|---|---|---|
| `src/lib/estimate-engine.ts` | 0 | Header claims "authoritative execution path for all estimates… No duplicate estimators." Nothing estimates through it. Name overclaims (FAKE authority by assertion). |
| `src/lib/interview-engine-v3.ts` | 0 | V3 signal-based interview engine; no callers. |
| `src/lib/interview-questions-v3.ts` | 0 | Not even imported by `interview-engine-v3.ts`. |
| `src/lib/kit-adapter.ts` | 0 | `KitAdapter implements MarketingProvider`; header says "emits canonical events". The LIVE kit path is `src/lib/kit.ts` (imported by newsletter/subscribe + resources/download routes); `kit-adapter.ts` + `marketing-provider.ts` (imported only by kit-adapter) are the dead abstraction pair. Divergent-kit-path note. |
| `src/lib/main-authority-loader.ts` | 0 | "Loads configuration from Aug 3 baseline (main) for Workbench preview" via `require('@/config/media.v1.main.json')` — references config baselines; unreferenced. |
| `src/lib/materialization-state-machine.ts` | 0 | P1-7 materialization lifecycle state machine; unreferenced (`materialization-recovery.ts` is the live-adjacent one — relationship not traced, flagged as gap). |
| `src/lib/ping-api.ts` | 0 | Authority-map #43 DORMANT (`Observation` interface); re-verified zero importers. |
| `src/lib/sentiment/classifier-provider.ts` | 0 | Authority-map #45 UNREACHABLE (`ClassifierFactory`/`ClassifierManager`); re-verified. Its internal `import('./classifier')` is intra-subgraph. |
| `src/lib/system-status.ts` | 0 | "Monitors runtime state of integrations" — nothing reads it. |
| `src/lib/wizard-persistence.ts` | 0 | localStorage wizard autosave; no wizard imports it. |
| `src/lib/workbench-ordering.ts` | 0 | Workbench photo-ordering overlay; no workbench imports it. |

Also verified: `src/lib/api/client.ts` (`ReplayResult`, authority-map #49) — replay fns have zero importers (authority-map claim stands, not re-grepped in depth; out of my block's core).

### 1e. Verified duplicates / divergences (the known items)

**D1 — Two canonical-JSON serializers, divergent `undefined` handling — VERIFIED.**
- `canonicalizeJson` (`src/lib/ping/dev-signer.ts:44`): `.filter(([, v]) => v !== undefined)` — drops undefined-valued keys. `{a: undefined, b: 1}` → `{"b":1}`.
- `canonicalize` (`src/lib/ping/ask-composer.ts:55`): no filter; `canonicalize(undefined)` → `"null"`. `{a: undefined, b: 1}` → `{"a":null,"b":1}`.
- Same logical input → different bytes → different sha256. The first signs the LIVE `bff-envelope@1` social envelopes (envelope.ts:17) and derives live owner-event content-hash IDs (owner-events.ts:31 via transition-id.ts:16); the second verifies the LIVE projection `graphDigest` (ping-object-source.ts:33,228-241) and the site-patch digest law (ask/envelope.ts:28,37). Both are CANONICAL_LIVE in their lanes; the divergence is real, not theoretical. Third variant `canonicalizeSpec` (fyd/builder/canonical.ts) strips volatile `*At` keys — different purpose, defensible, but a third "canonical bytes" implementation. (Authority-map Overlap 3, independently re-verified at the code level.)

**D2 — Two `SlotConstraints` interfaces, convergent content — VERIFIED.**
- `src/lib/editor/slot-registry.ts:14` and `src/lib/editor/command-pattern.ts:121`: byte-identical 5-field definitions (`aspectRatio, responsive, focalPointEnabled, minWidth, compressionPreset`). `event-system.ts` imports from `command-pattern`; `editable-slot.tsx` imports from `slot-registry`. Same concept, two definitions, currently agreeing — a merge waiting to happen, not yet a conflict.

**D3 — Two slot registries — VERIFIED.**
- `src/lib/slot-registry.ts` (top-level): `RegisteredSlot{id, route, page, …}`, imported by `src/components/visual-slot.tsx`, which is imported by `src/components/before-after-slider.tsx` and `src/components/service-card.tsx` (marketing components — liveness of those pages not traced in this pass).
- `src/lib/editor/slot-registry.ts`: `SlotRegistration{slotId, page, component, slotName, constraints, elementType}`, dangling via `editable-slot.tsx`.
- Different shapes, different consumers, same name. Flagged for S6/S7 or a follow-up: is the top-level one live?

**D4 — Phantom-import hunt in-block — CLEAN.** Every `from` in `src/lib/events.ts`, `src/lib/editor/*`, `src/lib/infrastructure/*` resolves (`@/types/events` exists; all `./` siblings exist). No referenced-but-nonexistent modules in my block. (Core-repo phantoms — `require('../gateway/adapter_compiler')`, empty `runtime/replay/` — belong to REACHABILITY.md §C4/C5, out of scope.)

---

## 2. Shared-record rows

Columns: DOMAIN / COMPONENT / CLAIM / EVIDENCE / CALLER / CALLEE / WRITER / READER / AUTHORITY / CLASSIFICATION / CONFIDENCE / BROKEN BOUNDARY / DEPENDENCIES / AFFECTS AGENTS.

**R1.** DOMAIN: event · COMPONENT: `src/lib/events.ts` `logEvent`→`InMemoryEventRepository.append` · CLAIM: "HPP marketing event log; durable store to be added later" · EVIDENCE: 3 route callers (`kit/webhook:39`, `newsletter/subscribe:53`, `resources/download:30`); header WARNING "NOT SUITABLE FOR PRODUCTION"; `crypto.randomUUID()` v4 ids; array-insertion ordering, no sequence · CALLER: the 3 routes · CALLEE: `repository.append` · WRITER: the 3 routes · READER: none · AUTHORITY: none (no sequencing/hash authority; explicitly pre-constitutional) · CLASSIFICATION: **LEGACY** (half-live) · CONFIDENCE: HIGH · BROKEN BOUNDARY: durability boundary openly unimplemented (honest, not broken); TYPE boundary weakened by `eventType as any` cast in kit webhook · DEPENDENCIES: `@/types/events` · AFFECTS AGENTS: event-forensics — the HPP log MUST NOT be conflated with the PING journal; replay — there is no replay here.

**R2.** DOMAIN: event · COMPONENT: `ReplayRepository` interface (`src/lib/events.ts:41`) · CLAIM: "For PING and replay systems. Exposes only append and cursor-based iteration" · EVIDENCE: `git grep` for `ReplayRepository|findAfter|existsByProvenance|setEventRepository|getEventRepository` → only `events.ts` itself; zero consumers repo-wide · CALLER: none · CALLEE: none · WRITER: — · READER: — · AUTHORITY: none · CLASSIFICATION: **LEGACY** (declared-unfulfilled) · CONFIDENCE: HIGH · BROKEN BOUNDARY: the name+docstring promise a PING/replay integration that does not exist — a reader could mistake this for the replay seam · DEPENDENCIES: none · AFFECTS AGENTS: replay, event-forensics — do not treat as the replay interface.

**R3.** DOMAIN: event · COMPONENT: `WebsiteRepository` read half (`getEventsByType/getEventsByEmail/getAllEvents`, `src/lib/events.ts:268-284`) · CLAIM: query API for website/admin · EVIDENCE: zero callers outside `events.ts` (verified; `authority-loader.findById` hits are an unrelated generic helper) · CALLER: none · CALLEE: none · WRITER: — · READER: none · AUTHORITY: none · CLASSIFICATION: **LEGACY** (dead read-half) · CONFIDENCE: HIGH · BROKEN BOUNDARY: none · DEPENDENCIES: none · AFFECTS AGENTS: none (informational).

**R4.** DOMAIN: event/sequence · COMPONENT: editor `EventStore`/`EventBus`/`EventSystem` (`src/lib/editor/event-system.ts:144-462`) + `eventBuilder` · CLAIM: "Constitutional Law 10: Commands Produce Events"; canonical emission point · EVIDENCE: zero external importers; only `command-pattern.ts` dynamic-imports (dormant); module singletons never load · CALLER: none live · CALLEE: `durableEventStore`, `sequenceAuthority`, `placementGraph`, `slotRegistry` (all intra-subgraph) · WRITER: none · READER: none · AUTHORITY: asserts sequence authority via `SequenceAuthority` — owns nothing live · CLASSIFICATION: **DORMANT** · CONFIDENCE: HIGH · BROKEN BOUNDARY: asserts constitutional law over a stack with no subjects; "canonical event emission point" names a role nothing fills · DEPENDENCIES: editor subgraph only · AFFECTS AGENTS: execution-adapter — the command→event pattern here is NOT the live command path (live path is gateway-side).

**R5.** DOMAIN: sequence · COMPONENT: `SequenceAuthority` (`src/lib/editor/sequence-authority.ts:115`) · CLAIM: "One Canonical Sequencing Model… the only way to generate sequences in the system" · EVIDENCE: referenced only by 4 editor files; never loaded externally; counter is process memory · CALLER: none live · CALLEE: none live · WRITER: — · READER: — · AUTHORITY: none (self-declared) · CLASSIFICATION: **DORMANT** · CONFIDENCE: HIGH · BROKEN BOUNDARY: **name claims canonical sequencing while the live journal's sequencing authority is the external gateway** (authority-map's open gap) — a future reader could wire to this thinking it is the sequence authority · DEPENDENCIES: none · AFFECTS AGENTS: identity/sequence convergence — exclude from candidacy explicitly.

**R6.** DOMAIN: event · COMPONENT: `DurableEventStore` (`src/lib/editor/durable-event-store.ts:208`) · CLAIM: name + header "Event Store Must Be Durable… for replay sovereignty" · EVIDENCE: constructor comment "No persistence loading - in-memory only for now"; `clear()` wipes all; no serialization · CALLER: none live · CALLEE: none · WRITER: — · READER: — · AUTHORITY: none · CLASSIFICATION: **DORMANT** · CONFIDENCE: HIGH · BROKEN BOUNDARY: **FAKE COMPLETION — the name asserts durability the implementation explicitly disclaims** · DEPENDENCIES: none · AFFECTS AGENTS: replay — do not cite as a durable store.

**R7.** DOMAIN: execution · COMPONENT: `CommandExecutor`/`commandBuilder` (`src/lib/editor/command-pattern.ts:558-559`) · CLAIM: command→event execution · EVIDENCE: external refs only in dormant `canonical-editor-service.ts`; `execute()`/`executeBatch()` never called · CALLER: none live · CALLEE: `eventSystem` (dynamic, dormant) · WRITER: — · READER: — · AUTHORITY: none · CLASSIFICATION: **DORMANT** · CONFIDENCE: HIGH · BROKEN BOUNDARY: none · DEPENDENCIES: editor subgraph · AFFECTS AGENTS: execution-adapter.

**R8.** DOMAIN: execution · COMPONENT: `CanonicalEditorService` (`src/lib/editor/canonical-editor-service.ts:252`) · CLAIM: "UI Does Not Mutate Graph" boundary; single entry point for all editor operations · EVIDENCE: zero importers repo-wide; module-level `getInstance()` never runs; no UI exists to emit intents · CALLER: none · CALLEE: none live · WRITER: — · READER: — · AUTHORITY: none · CLASSIFICATION: **DORMANT** · CONFIDENCE: HIGH · BROKEN BOUNDARY: asserts a UI boundary with no UI on either side · DEPENDENCIES: editor subgraph · AFFECTS AGENTS: none.

**R9.** DOMAIN: state · COMPONENT: `PlacementGraphManager` (`src/lib/editor/placement-graph.ts:375`) · CLAIM: "single source of truth for all asset placements" · EVIDENCE: refs only within editor files · CALLER: none live · CALLEE: `sequenceAuthority` (dormant) · WRITER: — · READER: — · AUTHORITY: none · CLASSIFICATION: **DORMANT** · CONFIDENCE: HIGH · BROKEN BOUNDARY: "single source of truth" for placements nothing places · DEPENDENCIES: editor subgraph · AFFECTS AGENTS: none.

**R10.** DOMAIN: ui-registration · COMPONENT: editor `SlotRegistry` + `src/components/editor/editable-slot.tsx` · CLAIM: "Constitutional Law 3: Components Register Themselves" · EVIDENCE: exactly one external edge (`editable-slot.tsx:13` → editor `slot-registry`); `git grep -l 'components/editor'` → zero; the edge dangles · CALLER: none · CALLEE: editor `slotRegistry` · WRITER: — · READER: — · AUTHORITY: none · CLASSIFICATION: **DORMANT** (branch-stranded) · CONFIDENCE: HIGH · BROKEN BOUNDARY: none · DEPENDENCIES: none · AFFECTS AGENTS: none.

**R11.** DOMAIN: infrastructure · COMPONENT: `src/lib/infrastructure/{auth-manager,audit,controller}.ts` · CLAIM: "Central service for managing all business infrastructure" (Google/GitHub/Vercel/Stripe/…) · EVIDENCE: `git grep -l 'lib/infrastructure'` → zero; harvest commit `f6386ee1` 2026-09-16 on all branches; only touch since = 1-line comment rebrand `dba78c15`; no tests · CALLER: none · CALLEE: none (`./audit`, `googleapis` are intra-module) · WRITER: — · READER: — · AUTHORITY: none · CLASSIFICATION: **UNREACHABLE** · CONFIDENCE: HIGH · BROKEN BOUNDARY: none (never wired; honestly inert) · DEPENDENCIES: none · AFFECTS AGENTS: security — if this is ever wired, it shells to OAuth popups and reads env credentials; treat as unreviewed-new-code on first use.

**R12.** DOMAIN: normalization · COMPONENT: `SlotConstraints` ×2 (`editor/slot-registry.ts:14`, `editor/command-pattern.ts:121`) · CLAIM: (implicit) one slot-constraint shape · EVIDENCE: byte-identical 5-field definitions; `event-system.ts` imports from `command-pattern`, `editable-slot.tsx` from `slot-registry` · CALLER: — · CALLEE: — · WRITER: — · READER: — · AUTHORITY: none · CLASSIFICATION: **DUPLICATE** (convergent, not yet conflicting) · CONFIDENCE: HIGH · BROKEN BOUNDARY: none today; silent divergence risk if one is edited · DEPENDENCIES: editor subgraph · AFFECTS AGENTS: none.

**R13.** DOMAIN: canonical-bytes · COMPONENT: `canonicalizeJson` (`dev-signer.ts:44`) vs `canonicalize` (`ask-composer.ts:55`) · CLAIM: both produce "canonical JSON" · EVIDENCE: A drops `undefined` values (`.filter`), B serializes them as `null`; code read at both sites; both live in their lanes (A: bff-envelope@1 signing + owner-event IDs; B: graphDigest + site-patch digest law) · CALLER: A ← `fyd/social/envelope.ts`, `transition-id.ts`, `owner-events.ts`, `ping-object-reader.ts`; B ← `ping-object-source.ts`, `fyd-tenant-graph.ts`, `ask/envelope.ts` · CALLEE: — · WRITER: — · READER: — · AUTHORITY: gateway runtime holds canonicalization authority; these are client-side mirrors · CLASSIFICATION: **DUPLICATE/CONFLICTING** · CONFIDENCE: HIGH · BROKEN BOUNDARY: **conflicting normalization** — same input with `undefined` → different digests across lanes; a digest minted under A will not verify under B · DEPENDENCIES: signing/attestation paths · AFFECTS AGENTS: identity, event-forensics — convergence must pick ONE undefined policy.

**R14.** DOMAIN: ui-registration · COMPONENT: top-level `src/lib/slot-registry.ts` vs editor `src/lib/editor/slot-registry.ts` · CLAIM: both are "the" slot registry · EVIDENCE: different shapes (`RegisteredSlot{id,route,page}` vs `SlotRegistration{slotId,page,component,…}`); top-level imported by `visual-slot.tsx` ← `before-after-slider.tsx`, `service-card.tsx` · CALLER: (top-level) visual-slot · CALLEE: — · WRITER: — · READER: — · AUTHORITY: none · CLASSIFICATION: **DUPLICATE** (name collision) · CONFIDENCE: MEDIUM (liveness of before-after-slider/service-card on served pages not traced) · BROKEN BOUNDARY: none proven · DEPENDENCIES: marketing components · AFFECTS AGENTS: S6/S7 or follow-up — determine if the top-level chain is live.

**R15.** DOMAIN: various · COMPONENT: 11 zero-ref modules (estimate-engine, interview-engine-v3, interview-questions-v3, kit-adapter, main-authority-loader, materialization-state-machine, ping-api, sentiment/classifier-provider, system-status, wizard-persistence, workbench-ordering) · CLAIM: various ("authoritative execution path", "emits canonical events", …) · EVIDENCE: two-pass `git grep` (basename + exact module name) → 0 external refs each; no external `import()`; harvest-era · CALLER: none · CALLEE: — · WRITER: — · READER: — · AUTHORITY: none · CLASSIFICATION: **UNREACHABLE** · CONFIDENCE: HIGH · BROKEN BOUNDARY: name-overclaim in at least 2 (estimate-engine "authoritative… No duplicate estimators"; kit-adapter "emits canonical events") — assert authority over paths nothing uses · DEPENDENCIES: none live · AFFECTS AGENTS: capability — do not treat estimate-engine as the estimate path; the live kit path is `kit.ts` directly.

---

## 3. Proposals (WHY → EVIDENCE → MINIMUM CHANGE → TEST → RESULT) — NOT APPLIED

**P1 — Relabel `DurableEventStore`.**
WHY: the name asserts a durability property the code explicitly disclaims; a future worker will cite it as the durable store. EVIDENCE: R6 (`durable-event-store.ts` constructor comment "No persistence loading - in-memory only for now"). MINIMUM CHANGE: rename class/file to `InMemoryEventStore` (or keep name + add `/** NOT DURABLE — in-memory only; name is historical */`), updating the 3 intra-editor import sites. TEST: `git grep -l 'durableEventStore\|DurableEventStore'` → only editor files updated; `tsc --noEmit` on the editor dir if a harness exists. RESULT: no live behavior change (nothing imports it); removes a FAKE-completion trap. Per "classify history, never delete": rename preserves the code, fixes the claim.

**P2 — Collapse the duplicate `SlotConstraints`.**
WHY: two definitions of one concept; silent-divergence risk. EVIDENCE: R12. MINIMUM CHANGE: keep `command-pattern.ts:121` as canonical, replace `editor/slot-registry.ts:14-20` with `export type { SlotConstraints } from './command-pattern'` (or a re-export). TEST: `git grep -n 'interface SlotConstraints'` → 1 hit; typecheck editor dir. RESULT: no behavior change (shapes identical today).

**P3 — Document the HPP log's non-role; decide the dead read-half.**
WHY: `ReplayRepository`'s docstring ("For PING and replay systems") invites conflation with the PING journal; the `WebsiteRepository` read half has zero callers. EVIDENCE: R2, R3. MINIMUM CHANGE (docs-only): header note on `events.ts` — "HPP marketing log; NOT the PING event store; `findAfter` has no consumers; read methods unwired." Optionally delete `getEventsByType/getEventsByEmail/getAllEvents` if no admin surface is planned — coordinator decision. TEST: `git grep` confirms no callers before/after. RESULT: kills the conflation vector without touching the 3 live `logEvent` calls.

**P4 — Honestly label the editor stack as an unadopted prototype.**
WHY: 8 files assert "Constitutional Law N" over a machine nothing loads; the assertions are load-bearing-sounding but vacuous. EVIDENCE: R4–R10. MINIMUM CHANGE: add a one-paragraph header to `src/lib/editor/README.md` (new file, docs-only): "Unadopted TenantOS-harvest prototype; zero importers from src/app; not bundled; constitutional-law headers describe intent, not enforcement." No code changes. TEST: none (docs). RESULT: future readers stop treating it as live law. (Deletion is NOT proposed — classify history, never delete; and it costs zero bundle bytes since nothing imports it.)

**P5 — Pick one canonical-JSON undefined policy.**
WHY: R13 — two live lanes mint/verify digests under divergent `undefined` semantics; cross-lane digest verification is broken by construction for inputs containing `undefined`. EVIDENCE: code reads at `dev-signer.ts:44-55` and `ask-composer.ts:55-69`; live callers on both sides. MINIMUM CHANGE: coordinator decision — either (a) make `canonicalize` drop undefined (match A), or (b) make `canonicalizeJson` emit null (match B) + re-verify existing digests/IDs (owner-event IDs and envelope signatures minted under A would change under B — migration-sensitive). TEST: property test — `canonicalize(x) === canonicalizeJson(x)` for a corpus including undefined-valued keys, nested; plus re-run `owner-events.test.ts` (the one REAL PROOF suite touching these bytes). RESULT: one normalization; the "constitutional canonicalizeObject" the envelope.ts header gestures at gets an actual single implementation. NOTE: this touches live signing/ID paths — propose-only; do not apply without the coordinator + a digest-migration plan.

---

## 4. Summary

- **`src/lib/events.ts`: half-live.** `logEvent`→in-memory append is live from exactly 3 marketing routes (kit webhook, newsletter subscribe, resource download); everything else in the file is dead: `ReplayRepository`/`findAfter`/`existsByProvenance`/`setEventRepository`/`getEventRepository` have **zero consumers repo-wide** (known claim CONFIRMED), and the entire `WebsiteRepository` read half (`getEventsByType/getEventsByEmail/getAllEvents`) has zero callers. Durability is absent by honest design. The file's "For PING and replay systems" docstring is the main hazard — it is not the PING event store and never was.
- **`src/lib/editor/*`: dormant, internally coherent, fully unreachable.** 8 files / ~2085 lines asserting constitutional law (commands→events, one sequencing model, durable store) over a machine with zero importers from `src/app`, zero tests, zero dynamic-import roots. The single external edge (`editable-slot.tsx` → editor `slot-registry`) dangles — nothing imports the component. Lifecycle trace: DEFINED ✓, everything after IMPORTED ✗ (except intra-subgraph). FAKE COMPLETION found: `DurableEventStore` is in-memory-only by its own constructor comment.
- **`src/lib/infrastructure/*`: unreachable.** Zero importers; TenantOS harvest from the initial commit on every branch; the only post-harvest touch was a 3-line comment rebrand. Honestly inert.
- **Remaining `src/lib`: 11 more zero-reference modules** (estimate-engine, interview-engine-v3, interview-questions-v3, kit-adapter, main-authority-loader, materialization-state-machine, ping-api, sentiment/classifier-provider, system-status, wizard-persistence, workbench-ordering) — all harvest-era, all confirmed via two-pass grep + dynamic-import scan. Notable: the live kit path is `kit.ts` used directly by routes; `kit-adapter.ts`/`marketing-provider.ts` are the dead abstraction pair.
- **Duplicates verified:** (a) the two canonical-JSON serializers with divergent `undefined` handling — CONFIRMED at code level, both live in their lanes, cross-lane digest mismatch is structural; (b) duplicate `SlotConstraints` interfaces (convergent today); (c) two same-named slot registries with different shapes. **No phantom imports** in-block (all `from` targets resolve).
- **History classification:** everything dormant/unreachable dates to harvest commit `f6386ee1` (2026-09-16) and was never adopted by this repo's lineage on any branch checked. Per standing invariant 6: classified, not deleted. Proposed changes are label/collapse/docs-only (P1–P5), none applied.

## 5. Next adjacent gap

**The top-level `src/lib/slot-registry.ts` → `visual-slot.tsx` → `before-after-slider.tsx` / `service-card.tsx` chain (R14).** It is the one same-named duplicate of the editor registry whose liveness I did NOT close: are `before-after-slider` / `service-card` rendered by any live route/page, and does the VisualSlot registry actually get registrations at runtime? If live, there are two slot-registration systems with one name; if dead, it joins the R15 list. Second, smaller: `materialization-recovery.ts` (live-adjacent) vs `materialization-state-machine.ts` (dead) — same subsystem, split liveness, worth one grep-trace. Third: `src/fyd/owner-mode/attestation-gate.ts` (authority-map #52, zero importers) vs the live `src/fyd/social/attestation-gate.ts` — a name collision between a dead gate and the C4 failure-honesty gate; low risk today, high confusion later.
