# Mission Control -> FYD website wiring: seam proposal

**Date:** 2026-09-27 ~11:45 MDT · **Status:** PROPOSED — implementation staged locally, Pig-side apply queued
**Order:** Nolan, ~11:20 MDT 2026-09-27 — wire Mission Control into the PING FYD website ASAP. Nolan gives more guidance when he reaches the Pig.
**Hard freeze:** the :3200 served tree/branch is NOT altered until after the 19:00 MDT adjudication verdict or Nolan's explicit word. All work below is on a future wiring branch; nothing here touches served bytes.

## 1. Architecture fact (locally confirmed)

`/home/nolan/projects/ping` is ONE Next.js app serving both surfaces (confirmed by `mission-control/STATE.md`, 2026-09-24: "Lives in the PING website repo ... served on the private :3100 surface at /mission-control" + "Regression: /sites/happy-place and /sites/coppersmith-plumbing still 200"):

- **:3100** = main checkout. Operator surface: `/mission-control`, `/api/mc/*` (Lane D dispatch plane), plus `/sites/*`.
- **:3200** = worktree `/home/nolan/worktrees/design-sprint-visual-v1`, branch `design/sprint-visual-v1`, next-server v15.5.24. Serves the same `/sites/*` routes from the sprint's visual branch. Pinned HEAD `9c8c21939eff073a5b87817e4ef1674d9aabebc5`; build `6QmE00XdDC5Sa_Lrobgt0`.

Consequence: the wiring is **same-origin** if (and only if) the design branch contains the Lane D routes. If it does not, the new surface calls the :3100 origin (see §6, Case B).

## 2. Ends grounded

### 2a. Mission Control dispatch plane (Lane D, 2026-09-26)

Source: `~/workspace/mission-control/LANE-D-DISPATCH.md` (full ledger) + local tree copy `~/workspace/lane-p01/tree/src/app/api/mc/` (route sources; byte-identity vs the Pig-side deployed checkout is UNVERIFIED-LOCAL — Pig transport PROXY_FAILED since ~11:16 MDT).

**HTTP surface** (`src/app/api/mc/dispatch/route.ts`):

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/mc/dispatch` | Catalog: `{ok, as_of, agents[], tenants, constraints, prompt_max, deadlines_seconds, adapter_shim}`. Agents only from the live adapter; `claim` is `PROVEN` (ollama) or `PROTOTYPE` (identity_1..4). |
| POST | `/api/mc/dispatch` | Witnessed dispatch. Body: exactly `{prompt, agent, capability, tenant}` (all strings). |
| GET | `/api/mc/missions` | Mission list (journal projection). No tenant filter — caller filters. |
| GET | `/api/mc/missions/[id]` | Mission detail; 404 `{ok:false, error:'unknown_mission'}` on honest miss. |

**Fail-closed validation (before any event or side effect):** prompt 1–2000 chars (400 `bad_prompt`); agent in `['ollama','identity_1','identity_2','identity_3','identity_4']` (403 `agent_denied`; identity_5..10 have no adapter profile at all — denied at two layers); agent profile LIVE in the adapter (else 403 `agent_denied`); tenant in `['happy-place','coppersmith-plumbing']` (400 `bad_tenant`); capability in the agent's adapter `allowedCapabilities` (400 `bad_capability` / 403 `capability_denied`); namespace `tenant::<id>` matches `/^(core|tenant)::[a-z0-9_.-]+$/`.

**Lifecycle:** `authorizeWorkOrder` → (deny: 403 + `MC_AGENT_DENIED`, state DENIED, never FAILED) → `issueWorkOrder` → `MC_MISSION_CREATED` / `MC_RUN_QUEUED` / `MC_EXECUTION_STARTED` / `MC_AGENT_AUTHORIZED` → 4 artifacts (`prompt.txt`, `workorder.json`, `context.json`, `result.json`, sha256 via `MC_ARTIFACT_PUBLISHED`) → execute via the agent's proven transport → 8-field envelope (`work_order_id`, `context_pack_id`, `agent_id`, `capability`, `status`, `output`, `evidence`, `error`) → `verifyResultEnvelope` → terminal `MC_RUN_SUCCEEDED` / `MC_RUN_FAILED` / `MC_RUN_UNKNOWN`.

**First-class UNKNOWN:** deadline expiry, broker blocked/timed-out, work-order issue failure, or envelope verification failure → `MC_RUN_UNKNOWN` with `reconciliation_state: "RECONCILIATION IN PROGRESS"`. Timeouts never render as FAILED. UI must render the mandated string `OUTCOME UNKNOWN — RECONCILIATION IN PROGRESS`.

**Fixed constraints** (server-derived, not caller-supplied): `{read_only:true, no_writes:true, no_network:true, no_canonical_events:true, no_mission_state_writes:true}`. Deadlines: ollama 180s, identity_1..4 600s. Response carries `output_digest` only — raw output lives in the `result.json` artifact.

**Proven:** real bounded dispatch via SpineDryRunObserverAdapter; duplicate-attempt race falsifier passed. **UNPROVEN:** Hermes-backed dispatch (not in the Lane D slice — excluded from v1). Live timeout→UNKNOWN firing is code-present, not live-fired. identity_1..4 broker transports are `PROTOTYPE`, zero spend in Lane D.

**No idempotency key on POST:** re-POSTing creates a NEW mission. The UI must never blind-retry; it surfaces the mission and lets the operator decide.

**Tenant is caller-supplied** (no authenticated-context derivation in the HTTP route, unlike `mission_intent.py`). The FYD website therefore passes tenant explicitly from its own fixed SITE_ID and never exposes it as user input.

### 2b. FYD website surface (:3200)

- Routes `/sites/happy-place`, `/sites/coppersmith-plumbing`: separate static paths, dynamic render. Tenant = **hardcoded `SITE_ID` constant per page file** (`"happy-place"` / `"coppersmith-plumbing"`); no `[tenant]` dynamic segment. `compilePublicSite(SITE_ID)` → `getVerifiedPublicProjection(siteId, "anonymous")`.
- Three experiences: **visitor** (the served :3200 projection — v3-polish verified), **owner** ("Customize with FYD": `/build/[siteId]` OwnerPanel, demo-owner-mode-gated panels, `/o/[objectId]/manage`), **engineering/trust lab** (no authorized surface today; dead 6-tab `demo-owner-console.tsx` is a candidate host).
- Existing API: `/api/fyd/ask[/[siteId]]`, `/api/fyd/why-this`, `/api/fyd/claims/*`, `/api/fyd/projection`, `/api/fyd/objects/*`, `/api/fyd/customize`.

## 3. The seam (chosen design)

**New namespaced pages, zero existing files touched:**

- `src/app/sites/happy-place/mission-control/page.tsx` — server component, `SITE_ID = "happy-place"`, renders the tenant-bound client.
- `src/app/sites/coppersmith-plumbing/mission-control/page.tsx` — server component, `SITE_ID = "coppersmith-plumbing"`, renders the tenant-bound client.
- `src/app/sites/_shared/mc-api.ts` — typed fetch helpers for the MC API (catalog, dispatch, mission get/list).
- `src/app/sites/_shared/tenant-mission-control.tsx` — `"use client"` tenant-bound dispatch panel. Self-contained (own Badge/Card/JSON renderers; no imports from `src/app/mission-control`).

**Tenant binding:** the page's fixed `SITE_ID` is passed as the `tenant` field of every POST and as the client-side filter for the mission list. It is rendered as a badge, never as an editable input. This matches the existing per-site page pattern and closes the caller-supplied-tenant gap by construction.

**API base:** the client takes `apiBase` (default `""` = same origin). Case A (design branch has `/api/mc/*`): works with no config. Case B (it does not): set `NEXT_PUBLIC_MC_API_BASE` to the :3100 origin at build time; the code path is identical. Which case holds is the first Pig-side check (§7.1).

**v1 surface behavior:**
- Agent picker built ONLY from `GET /api/mc/dispatch` catalog (never hardcoded); default `ollama` when present (only acceptance-proven, zero-spend transport); `PROTOTYPE` claim shown next to identity_1..4.
- Capability picker from the selected agent's `allowedCapabilities`.
- Prompt textarea with client-side `prompt_max` guard (server enforces 1–2000).
- Dispatch → mission row selected → poll `GET /api/mc/missions/[id]` every 5s until terminal (`SUCCEEDED|FAILED|UNKNOWN|DENIED`).
- Status badges + mandated `OUTCOME UNKNOWN — RECONCILIATION IN PROGRESS` string for UNKNOWN.
- Mission list filtered to the page's tenant.
- Fail-closed rendering: catalog failure → error string, no form; 403 → `DENIED (not failed)` + reason; 503 → adapter-unavailable message. No blind re-POST (no idempotency); "dispatch another" only clears the form for a deliberate new mission.
- **Not linked from visitor nav.** The pages are reachable by URL; link placement (owner experience vs trust lab) is queued on Nolan's Pig-side guidance (§7.3). Zero changes to visitor/owner rendering in v1.

**What v1 does NOT do:** no new event types (MC_* family only), no new store (journal is the store), no new authority (the adapter owns every grant/deny), no Hermes, no identity_5..10, no dispatch from the visitor projection, no FYD state writes (missions live in the MC journal).

## 4. Why this seam is safe

- **Additive:** 4 new files, 0 existing files modified. The visitor projection, owner panels, and projection pipeline are untouched.
- **Namespaced:** everything lives under `src/app/sites/*/mission-control` + `src/app/sites/_shared/` (mc-prefixed module names). No route collisions.
- **Tenant-scoped:** tenant is a compile-time constant per page, allowlisted server-side, namespaced `tenant::<id>` in every work order and journal event.
- **Authority-preserving:** the FYD side is a dumb caller. All grant/deny decisions stay in `ExternalAgentAdapter`; all execution records stay in the existing journal; the 8-field envelope is verified by the adapter, not the UI.
- **Fail-closed:** every API failure mode has a defined render; UNKNOWN is never collapsed to FAILED; DENIED is never rendered as failure.

## 5. Implementation (staged)

Staged locally at `~/workspace/goals/ping-agent-execution-stack/hidden_files/mc-fyd-wiring-2026-09-27/patch/` as a patch tree mirroring `src/app/...` paths, ready to apply to a Pig-side wiring branch:

- `patch/src/app/sites/_shared/mc-api.ts` — typed MC API client (catalog/dispatch/missions/detail), `apiBase` resolution from `NEXT_PUBLIC_MC_API_BASE`.
- `patch/src/app/sites/_shared/tenant-mission-control.tsx` — tenant-bound dispatch panel.
- `patch/src/app/sites/happy-place/mission-control/page.tsx` — server wrapper (`SITE_ID = "happy-place"`).
- `patch/src/app/sites/coppersmith-plumbing/mission-control/page.tsx` — server wrapper (`SITE_ID = "coppersmith-plumbing"`).
- `patch/APPLY.md` — Pig-side apply procedure (queued on transport).

Not yet done (needs Pig): branch creation, `tsc`, `next build`, served-byte verification, any serve change.

## 6. Alternatives considered

- **Tab in `/build/[siteId]` OwnerPanel:** near-zero touch (one import + tab entry), tenant from the existing `siteId` param. Rejected for v1: `/build` is the golden customer route under active sprint redesign; placement needs Nolan's owner-experience guidance. Viable v2 once he weighs in.
- **Tab in the engineering/trust lab:** most architecturally aligned (BRIEF: "SEPARATE, DO NOT DELETE"), but the lab has no authorized surface in the served HEAD — the host doesn't provably exist. Revisit when the lab lands.
- **Reusing `src/app/mission-control`'s DispatchPanel directly:** rejected — it takes no tenant prop (tenant is a user dropdown there) and importing across surfaces couples the wiring branch to the operator UI. The tenant-bound panel duplicates ~200 lines deliberately to keep the seam one-directional.

## 7. Queued items

### 7.1 On Pig transport recovery (PROXY_FAILED since ~11:16 MDT; backoff retries running)
1. `git -C /home/nolan/projects/ping worktree list` — confirm the :3100/:3200 worktree map.
2. Check whether branch `design/sprint-visual-v1` contains `src/app/api/mc/*` and `src/app/mission-control` (decides Case A same-origin vs Case B `:3100` base URL).
3. Create wiring branch `design/mc-fyd-wiring-2026-09-27` from the design integration tip. NEVER from or into the :3200 worktree; never touch the :3200 served bytes.
4. Apply `patch/`, `tsc --noEmit`, `next build` to a separate output, byte-verify the new routes serve (ephemeral port or build-output inspection only).
5. Byte-verify `GET /api/mc/dispatch` live catalog before any UI wiring is declared done (adapter registry may differ Pig-side).

### 7.2 On the 19:00 adjudication
- No serve change to :3200 before the verdict. After GO (or Nolan's word), the wiring branch may be proposed for merge into the design integration line — parent's call, not this lane's.

### 7.3 On Nolan's Pig-side guidance
- Link placement: owner experience, trust lab, or operator-known URL only.
- Which mission classes per tenant (v1 offers the catalog as-is; curated task templates are a later step).
- Whether Hermes-backed dispatch enters scope (default NO — UNPROVEN).
- Whether the live-gateway marker / any Pig-side deployment beyond the wiring branch is authorized.

## 8. Boundaries held

No HPP original contact. No pushes. No production merges. No credential exposure or rotation. identity_5..10 DENIED (two layers). No new store, no new authority, no new event types. Fail closed everywhere; UNKNOWN stays UNKNOWN. Burn coordinator's fyd-build surfaces untouched (read-only throughout). :3200 served tree frozen.
