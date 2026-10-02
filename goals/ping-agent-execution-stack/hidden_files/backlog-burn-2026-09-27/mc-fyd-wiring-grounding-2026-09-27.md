# MC → FYD website wiring — grounding brief (recon, READ-ONLY)

Date: 2026-09-27 ~11:30 MDT. Worker: recon subagent (read-only; no writes outside this file, no branches, no commits, no Pig access, no HPP original contact).

Objective (Nolan, top priority): wire Mission Control's bounded dispatch capability into the PING FYD website surface. Detailed guidance pending from Nolan at the Pig. Standing interpretation: additive + namespaced only; tenant-scoped (happy-place / coppersmith-plumbing); the :3200 served tree is frozen until the 19:00 adjudication verdict or Nolan's word.

## 1. Mission Control dispatch surface (mapped)

### 1a. Lane D HTTP entrypoint (TypeScript, Next.js route)

Local copy: `~/workspace/lane-p01/tree/src/app/api/mc/dispatch/route.ts`
(canonical: `/home/nolan/projects/ping/src/app/api/mc/dispatch/route.ts` on the Pig — see LANE-D-DISPATCH.md; Pig transport PROXY_FAILED at ~11:16 MDT, so the Pig copy is UNKNOWN/unverifiable from here).

- `GET /api/mc/dispatch` → dispatch catalog: agents (from the live adapter via the shim; `ollama` PROVEN, `identity_1..4` PROTOTYPE; `identity_5..10` absent/DENIED), `tenants: ['happy-place','coppersmith-plumbing']`, constraints, `prompt_max: 2000`, deadlines.
- `POST /api/mc/dispatch` with JSON `{prompt, agent, capability, tenant}` → witnessed dispatch:
  1. Fail-closed validation: prompt 1..2000 chars; agent ∈ `SLICE_AGENTS` (`ollama`, `identity_1..4`); tenant ∈ `SLICE_TENANTS`; capability ∈ agent's adapter allowlist; namespace `tenant::<tenant>` must match `/^(core|tenant)::[a-z0-9_.-]+$/`.
  2. `adapterCall('authorize', {agentId, capability, namespace, constraints: FIXED_CONSTRAINTS})` → denial emits `MC_MISSION_CREATED` + `MC_AGENT_DENIED`, returns 403 (mission state DENIED, never FAILED).
  3. `adapterCall('issue', {...})` → work order; failure → `MC_RUN_UNKNOWN` (503).
  4. Lifecycle events → artifacts (prompt.txt, workorder.json, context.json published with sha256) → execute via agent transport (ollama `POST 127.0.0.1:11434/api/generate` qwen2.5-coder:1.5b; identity_1..4 via `copilot-broker/dispatch-task.js` with quota pre-check, fail-closed).
  5. 8-field result envelope → `adapterCall('verify', ...)` → terminal event.
- Terminals: `MC_RUN_SUCCEEDED` (valid + completed), `MC_RUN_FAILED` (transport failure = prompt never delivered, or agent-reported failure), `MC_RUN_UNKNOWN` (deadline exceeded, broker blocked/timed-out, or envelope fails verification; always with `reconciliation_state: "RECONCILIATION IN PROGRESS"`). Timeouts never render as FAILED.
- Deterministic ids: `mission_id = 'mc-m-' + sha256('mission|agent|tenant|capability|promptDigest|ts')[0:12]`; `run_id = <mission>-r1`; `execution_id = <mission>-x1`; `context_pack_id = 'mc-ctx-<mission>'`.
- Journal write path: `appendDispatchEvent()` in `~/workspace/lane-p01/tree/src/app/api/mc/_lib/mc-dispatch.ts` → appends to `JOURNAL_PATH = '/home/nolan/workspace/fyd-journal-gateway/events.jsonl'` (the MC journal; sandbox mirror exists at `~/workspace/fyd-journal-gateway/events.jsonl`). Event envelope: `{event_id, timestamp, event_type, aggregate_id: 'mc:mission:<mission_id>', aggregate_type: 'mc_mission', event_data: {mission_id, run_id, execution_id, agent, tenant, capability, context_pack_id, ...}}`. Strictly-increasing per-mission acceptance timestamps (+1ms bump on ties). Duplicate event_id → `duplicate-skipped`.
- Constants: `SLICE_AGENTS = ['ollama','identity_1','identity_2','identity_3','identity_4']`; `SLICE_TENANTS = ['happy-place','coppersmith-plumbing']`; `PROMPT_MAX = 2000`; `DEADLINES = {ollama: 180, identity_1..4: 600}`; `FIXED_CONSTRAINTS = {read_only: true, no_writes: true, no_network: true, no_canonical_events: true, no_mission_state_writes: true}` — the contract hard-requires `no_canonical_events` and `no_mission_state_writes`: **the agent never emits events; PING (the route) is the only emitter.**
- Adapter shim: `ADAPTER_SHIM = '/home/nolan/workspace/mission-control/lane-d/adapter-call.js'` — thin transport to the EXISTING `ExternalAgentAdapter` (`profiles` / `authorize` / `issue` / `verify`). **The shim does NOT exist in the sandbox** (verified: no `adapter-call.js` anywhere local); it is Pig-side only. A real dispatch cannot be executed from this VM.
- Mission projection: `GET /api/mc/missions` re-projects the journal on every request (`projectMissions()` in mc-dispatch.ts); replay-safe (byte-identical across consecutive projections).

### 1b. Python front door (MissionIntent contract — the adapter seam)

`~/workspace/mission-control/mission_intent.py` (commit 470745b, branch `mc/sprint-integration-2026-09-27`):

- `submit(intent, agent_id, constraints, executor, journal_file=None, adapter_dir=None, node_bin="node", auth_ctx=None)` — full contract: validate → authorize → dispatch → observe. `auth_ctx` required. Returns result dict; duplicate idempotency key returns the original record without re-dispatching; denials raise `IntentAuthorizationError` after the denial is observed; executor crashes → `ExecutorOutcomeUnknown` after `MC_LANE_UNKNOWN`; revocation checked BEFORE authorize (zero dispatch on revoked key).
- `AuthenticatedContext(agent_id, tenant, principal=None, entitled_tenants=None)` — the tenant is authoritative from the authenticated context; `resolve_tenant()` refuses a body tenant that disagrees; `check_agent_entitlement()` fail-closes on missing entitlement. `entitled_tenants` defaults to empty (fail closed).
- `namespace_for(tenant)` → `"tenant::<tenant>"`.
- `observe(stage_events, journal_file=None)` — emits canonical events via the spine's emit path; `event_type` must be a registered `MC_*` type (raises ValueError otherwise).
- Journal envelope (via `~/workspace/mission-control/emit.py::emit_event`): `aggregate_id = 'mc:lane:mission-intent'` (`INTENT_LANE = "mission-intent"`), `aggregate_type = 'mc_lane'`; `JOURNAL_FILE` env `MC_JOURNAL_FILE`, default `~/workspace/fyd-journal-gateway/events.jsonl`.
- Terminal vocabulary: `MC_LANE_COMPLETED` (only success terminal), `MC_LANE_FAILED`, `MC_LANE_UNKNOWN` (+ `MC_WORK_ORDER_ISSUED`, gate events). A terminal is trusted only when it chains to a preceding `MC_WORK_ORDER_ISSUED` for the same work order, tenant, idempotency key, and intent digest (`_terminal_verified`).

### 1c. Reference adapter (the seam to copy)

`~/workspace/mission-control/frontdoor_adapters.py`:

- `SpineDryRunObserverAdapter` — `MISSION_CLASS = "spine-observe-dry-run"`, `AGENT_ID = "hermes"`, `CAPABILITY = "fixture.read"`, read-only/no-writes/no-network constraints.
- `build_intent(pass_id, passes_dir, ledger_path, actor, auth_ctx)` → intent dict `{mission_class, actor, tenant (from auth_ctx, never a routing parameter), capability, inputs_hash: mi.canonical_inputs_hash(inputs), idempotency_key: "spine-observe:<tenant>:<pass_id>" (tenant is part of the key — cross-tenant disclosure guard), inputs, event_bind}`.
- `submit(pass_id, passes_dir, ledger_path, actor, auth_ctx, journal_file=None)` → builds intent + `_DryRunObserverExecutor` (black-box subprocess of the legacy caller; the front door's `observe()` is the only canonical emission) → `mi.submit(intent, AGENT_ID, CONSTRAINTS, executor, journal_file=..., auth_ctx=...)`.
- `MIGRATED_CLASSES` registry + `is_bypass_illegal(mission_class)` + `detect_bypass(journal_file, mission_class, tenant=None)` — bypass detection: execution events with no covering VERIFIED intent record are violations. A new wiring adapter registers here and gets bypass detection for free.
- **A dispatch call through the front door looks like:**
  ```python
  import mission_intent as mi
  from frontdoor_adapters import <NewAdapter>
  auth = mi.AuthenticatedContext(agent_id="<agent>", tenant="<happy-place|coppersmith-plumbing>",
                                 entitled_tenants={"<tenant>"})
  adapter = <NewAdapter>(...)
  result = adapter.submit(..., actor="<principal>", auth_ctx=auth,
                          journal_file="<mc journal path>")
  ```

### 1d. What the Pig-side dispatch UI already looks like

`~/workspace/lane-p01/tree/src/app/mission-control/page.tsx` — client page with tabs `TODAY | AGENTS | BUSINESSES | WEBSITES | TECHNOLOGY | SEARCH | DISPATCH`; `DispatchPanel` = [New Mission] form (Prompt, Identity/Tenant, Agent, Capabilities) → [Dispatch] → mission list with status badges → detail view. All projected from the journal.

## 2. FYD website tenant surface (mapped)

Canonical repo: `/home/nolan/projects/ping` (Pig). The :3200 served tree is a Pig-side worktree on branch `design/sprint-visual-v1` (per `design-sprint-2026-09-26/adjudication-runbook.md`) — **frozen until the 19:00 verdict or Nolan's word; nothing on this VM serves :3200 right now** (no local listener on 3200/3100). Whether the served tree already contains `api/mc/*` routes: UNKNOWN (Pig down).

Local exemplar tree (website repo shape): `~/workspace/lane-p01/tree/src/app/`:
- `sites/happy-place/page.tsx` and `sites/coppersmith-plumbing/page.tsx` — each declares `const SITE_ID = "<slug>"` and renders via `compilePublicSite(SITE_ID)` from `sites/_shared/` (`site-client`, `spec-pipeline`, `site-metadata`): the page is compiled from the site's PING-backed object graph (canonical projection + applied overlays) through `generateSiteSpec`, then rendered from the declarative spec. **No hand-layout per company; no customer fact hardcoded.** `DemoOwnerMode` owner panel included.
- `sites/_shared/` — shared render pipeline (the additive seam: new shared components or new per-site routes slot in here without touching existing pages).
- `api/mc/dispatch/route.ts` + `api/mc/_lib/mc-dispatch.ts` + `app/mission-control/page.tsx` **already coexist with the tenant sites in this tree** — the "API routes + console page, additive alongside sites/*" pattern has a local working exemplar.

Additive, namespaced integration points (no modification of existing tenant content):
1. New route `src/app/sites/[slug]/mission-control/page.tsx` (or `/mc`) — tenant-scoped console; tenant locked from the route slug.
2. New API route `src/app/api/sites/[slug]/mc/dispatch/route.ts` — validates slug ∈ {happy-place, coppersmith-plumbing}, forces `tenant = slug` into the call to the existing `/api/mc/dispatch` logic.
3. New `DemoOwnerMode` panel section in the tenant site — owner-gated dispatch action.
4. New Python adapter class in `mission-control/` (front-door seam) registered in `MIGRATED_CLASSES` — for dispatches initiated from website-side flows through the Python contract instead of the TS route.

## 3. Journal events a wiring dispatch would mint

**MC lifecycle events (already the dispatch behavior; aggregate `mc:mission:<id>` / `mc:lane:mission-intent`):**
`MC_MISSION_CREATED → MC_RUN_QUEUED → MC_EXECUTION_STARTED → MC_AGENT_AUTHORIZED → MC_ARTIFACT_PUBLISHED ×4 (prompt, work-order, context, result; sha256) → terminal MC_RUN_SUCCEEDED | MC_RUN_FAILED | MC_RUN_UNKNOWN` (+ `MC_AGENT_DENIED` on the 403 path). Every event carries `tenant` in `event_data`; namespace `tenant::<tenant>`.

**FYD overlay events (only if the dispatch's purpose is to change website content):**
`FYD_SITE_OVERLAY` via the FYD-037-guarded emit path `~/workspace/fyd-lane/lane-e/emit-overlay.py`:
- Envelope: `{event_type: "FYD_SITE_OVERLAY", aggregate_id: "fyd-site:<site>", aggregate_type: "fyd_site", event_data: {siteId: "<site>", ops: [...]}}`.
- Op set (fail closed): `set_field`, `add_object`, `add_relationship`, `deactivate_object`. `add_object` stamps `provenance: {kind: "canonical-journal", ref: "pending-emit", ...}`.
- The emit path POSTs to the demo journal gateway (`POST /events` on `~/workspace/fyd-journal-gateway/server.mjs`, Pig-side `:18199`; sandbox copy present but no listener). Pre-flight: exactly one GET on the journal identity endpoint asserting marker `fyd-demo-journal@<derived>`; typed `WRONG_JOURNAL` fail-closed (exit 3) before any POST.
- **CRITICAL — FYD-036 reframe:** the main PING journal (`ping_events`, 2,536 events) holds **zero** `FYD_SITE_OVERLAY` rows for any site; the demo PG is down (`Exited 255`). Minting real Coppersmith overlay history is a **product-scope decision for Nolan**, not an autonomous step. The Happy Place overlay history that exists is the seeded/demo set (`fyd-seed-ovl-*` in the local gateway journal, transcribed from the ask-lane test stub; originals unrecoverable).

## 4. Guarantees: needed vs covered

| Guarantee | Status | Detail |
|---|---|---|
| Digest agreement across the new path (substrate Gap 1) | **NOT COVERED — proposed only** | `substrate-recon-2026-09-27.md` proposes a cross-language conformance fixture/runner (hash-authority.ts as reference vs dump.py float-refusing canonicalize vs TS `sha256hex`). **No implementation found**: no branch, no fixture, no runner anywhere in the workspace. The parent task's "(in flight)" is NOT verified. Risk: MC dispatch digests (`prompt_digest`, `output_digest` via TS `sha256hex`) and projection digests (`graphDigest` via dump.py canonicalize) are different algorithms; any wiring step that cross-checks them is unverified. Mitigation available autonomously: build the Gap 1 conformance fixture as the wiring's first delta. |
| Journal identity for the new event minter (Gap 3) | **IN FLIGHT, UNLANDED** | `~/workspace/fyd-lane/journal_identity.py` drafted (single gateway-address authority + pre-flight, exit 2 `WRONG_JOURNAL`) but **untracked** (not committed); branch `substrate/gap3-journal-identity` exists. NOT adopted by `emit-overlay.py` (which carries its own duplicated `_preflight_journal`) or by `dump.py` / `lane-f-probe.py`. The wiring's minter must adopt `journal_identity.py` or reuse `emit-overlay.py`'s pre-flight — **must not invent a third pre-flight**. |
| Tenant isolation (which tenant's journal gets the events) | **COVERED by existing machinery** | Isolation is payload-scoped, not store-scoped: single shared MC journal + single demo overlay journal; tenant carried in `namespace = tenant::<id>`, tenant-scoped idempotency keys (`spine-observe:<tenant>:<pass_id>` pattern), `tenant` in every MC `event_data`, `aggregate_id = fyd-site:<site>` + `event_data.siteId` for overlays. Wiring rule (from `mi.resolve_tenant`): **the tenant is derived from the site route / authenticated context, never from the request body** — a body tenant that disagrees is refused. |
| Ask FYD evidence boundary (no leak of dispatched content into website-derived citations) | **COVERED** | `~/workspace/fyd-build/src/fyd/evidence/refs.ts::validateEvidenceRef` fails closed: `dangling_evidence_ref` (no observation record backs the ref), `superseded_evidence`, `wrong_snapshot` (`record.sourcePointer` must equal `web:<source_digest>`). Overlay-authored objects carry no website source digest → they refuse, never miscite. Presentation pattern (FYD-038, closed 2026-09-27): `provenance.kind = "overlay-authored"` → `contentClassificationOf` → `DEMO_SYNTHETIC` → rendered "Demo addition" badge with `data-classification="DEMO_SYNTHETIC"`. **Any dispatch-minted website content must carry `overlay-authored` provenance and render the badge; it must never be citable as "Recorded fact from the site data."** |
| Agent-never-emits boundary | **COVERED (contract)** | `FIXED_CONSTRAINTS.no_canonical_events = true`, `no_mission_state_writes = true`. The dispatched agent's output is verified by the adapter; only the route/emitter mints journal events. The wiring must preserve this: website-initiated dispatch → agent runs → adapter verifies → route mints. |

## 5. Wiring options (all additive, namespaced, freeze-respecting)

### Shape A — Tenant-scoped dispatch console (new route; no overlay minting)

- **Touch points:** new `src/app/sites/[slug]/mission-control/page.tsx` rendering the existing `DispatchPanel` pattern with tenant locked to the route slug (tenant selector removed; `tenant = slug` forced server-side); new thin API wrapper `src/app/api/sites/[slug]/mc/dispatch/route.ts` that validates `slug ∈ {happy-place, coppersmith-plumbing}` and delegates to the existing dispatch logic. Zero edits to `sites/*/page.tsx`, `_shared/`, or existing `api/mc/*`.
- **Journal events minted:** MC lifecycle only (`MC_MISSION_CREATED … MC_RUN_*`, aggregate `mc:mission:<id>`, `tenant = slug`). No `FYD_SITE_OVERLAY`. Agent output returns to the operator; never enters the journal as website content.
- **Falsification test:** (1) POST with body `tenant` ≠ route slug → refused (body tenant never trusted). (2) Dispatch for `coppersmith-plumbing` → journal holds the full MC event chain with `tenant: coppersmith-plumbing` and **zero** new `FYD_SITE_OVERLAY` events in the demo journal. (3) Two consecutive `GET /api/mc/missions` projections byte-identical (replay-safe). (4) Served-bytes check on the new route: existing tenant pages byte-identical before/after (no modification).
- **Nolan's word needed:** serving it on the production/:3200 tree (post-19:00 freeze lift); whether the console is owner-gated (`DemoOwnerMode`) or visible; which agents/capabilities the website surface may offer (broker `identity_1..4` = real Copilot quota spend). **Autonomous now:** build in a worktree/branch off the website repo, falsification tests, journal-identity adoption — everything short of touching the served tree.

### Shape B — Dispatch-to-overlay (full wiring: verified agent output becomes website content)

- **Touch points:** (i) new Python adapter class in `mission-control/` (e.g. `FydSiteDispatchAdapter`, mission_class `fyd-site-dispatch`) registered in `MIGRATED_CLASSES` — inherits `mi.submit` contract + `detect_bypass`; or TS-side post-dispatch step in the website repo. (ii) New API route `src/app/api/sites/[slug]/mc/overlay-dispatch/route.ts`: on `MC_RUN_SUCCEEDED` + adapter-verified envelope, converts output to overlay ops (`set_field`/`add_object`) and mints via the `emit-overlay.py` pattern (FYD-037 pre-flight, `journal_identity.py` once landed). (iii) Overlay objects carry `provenance.kind = "overlay-authored"` so the site renders the FYD-038 "Demo addition" badge.
- **Journal events minted:** full MC lifecycle (aggregate `mc:mission:<id>`) **plus** `FYD_SITE_OVERLAY` (`aggregate_id = fyd-site:<site>`, `event_data = {siteId, ops}`, provenance `overlay-authored`).
- **Falsification test:** (1) Mint for `coppersmith-plumbing` → `GET /events/FYD_SITE_OVERLAY` shows the event with `siteId: coppersmith-plumbing`, aggregate `fyd-site:coppersmith-plumbing`. (2) Ask FYD for the site: the new content is refused as website-derived citation (`validateEvidenceRef` → `dangling_evidence_ref`/`wrong_snapshot`), never cited as "Recorded fact from the site data". (3) Rendered tenant page shows exactly one "Demo addition" badge with `data-classification="DEMO_SYNTHETIC"` for the new object; all pre-existing badges unchanged. (4) Wrong-journal probe: point the minter at a stub journal asserting a bogus marker → typed `WRONG_JOURNAL`, zero POSTs. (5) Projection replay: two dumps of the site projection byte-identical modulo `dumpedAt`.
- **Nolan's word needed:** REQUIRED before any real mint — FYD-036 reframed "mint Coppersmith overlay history" as a **product-scope decision**; live-gateway marker deployment is PARKED pending his word; agent/capability allowlist and quota spend for website-initiated dispatches. **Autonomous now:** adapter + route scaffolding in a branch, dry-run falsifiers (scratch journal copies only), `journal_identity.py` adoption, Gap 1 conformance fixture.

### Shape C — Read-only mission observer (zero new emissions; the safe first link)

- **Touch points:** new read-only page/section (e.g. `src/app/sites/[slug]/activity/page.tsx` or a `DemoOwnerMode` panel section) that projects the MC journal filtered by `event_data.tenant = slug` using the existing `projectMissions()` projector. Mirrors the `SpineDryRunObserverAdapter` philosophy (observe, fold, emit nothing). No POST routes, no dispatch capability, no overlay minting.
- **Journal events minted:** **none.** Pure projection of the existing journal. (The observer itself emits nothing — same as the spine dry-run observer.)
- **Falsification test:** (1) The page renders the known acceptance missions for `happy-place` (e.g. `mc-m-63d04f4517f9` from the Lane D proof) with correct status badges. (2) Append a synthetic MC event to a **scratch copy** of the journal → projection changes deterministically; re-project twice → byte-identical. (3) Zero writes: journal file mtime + byte count unchanged across page renders.
- **Nolan's word needed:** only for serving it on the production tree. **Autonomous now:** build + prove in a branch; safe to demo.

## 6. Recommended sequence (for the implementer, once Nolan gives guidance)

1. Land Gap 3's `journal_identity.py` (commit + adopt in `emit-overlay.py`, `dump.py`, `lane-f-probe.py` — kills the duplicated pre-flight) — autonomous, unblocks every minter.
2. Build the Gap 1 digest-conformance fixture (substrate recon's smallest delta) — autonomous; required before any cross-check between MC output digests and projection digests.
3. Ship Shape C (read-only observer) — visible MC→website link, zero risk, proves the tenant-scoped projection path.
4. Ship Shape A (tenant-scoped console) — needs Nolan's word on gating + agent/capability allowlist.
5. Shape B (dispatch-to-overlay) — needs Nolan's product decision (FYD-036 reframe) + live-gateway marker word; build the scaffolding dry-run-only until then.

## 7. UNKNOWNs (fail-closed; not inferred)

- Pig-side current state of `/home/nolan/projects/ping/src/app/api/mc/dispatch/route.ts` and whether the :3200 served tree (branch `design/sprint-visual-v1`) already contains `api/mc/*`: UNKNOWN — Pig transport PROXY_FAILED at ~11:16 MDT; the freshest local evidence is `~/workspace/lane-p01/tree` (may be stale vs the Pig).
- Gap 1 "in flight": NOT VERIFIED — no branch, fixture, or runner found; treat as proposed-only until an implementer lands it.
- `adapter-call.js` (the lane-d shim, `ADAPTER_SHIM`): Pig-side only (`/home/nolan/workspace/mission-control/lane-d/adapter-call.js`); absent from the sandbox. No real dispatch is executable from this VM.
- Which agent/capability set Nolan wants the website surface to expose, and whether website-initiated dispatches may spend Copilot broker quota (`identity_1..4`): needs his word.

## 8. Method note

Read-only: `muse.read`/`muse.exec` (ls, grep, sed, git show/log/ls-tree) only. No file contents modified, no branches created, no commits, no Pig contact attempted (transport down), no HPP original repo/site contact of any kind. This ledger file is the only write.
