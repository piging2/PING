# TenantOS Backend Archaeology + Sharpened Plan
Date: 2026-10-01 ~18:00 MDT. Mode: READ-ONLY. No build, launch, restart, patch, commit, wiring, or state mutation performed.
Scope per Nolan 2026-10-01 ~17:47 MDT: TenantOS = make PING itself a perfectly operated tenant. PING = substrate + first/dogfood tenant. FYD = customer-facing product. Mission Control = operating surface (projection, never authority). No hypothetical customer tenants, no customer PII, no tenant proliferation. `tenant = PING` is sufficient; generality = no PING-specific semantic hacks.

## 1. Estate map: where TenantOS code actually lives (Pig-verified)

All repo/branch/process claims below were verified via pigwsl-exec on 2026-10-01 ~17:48-17:55 MDT. The Pig tunnel dropped at ~17:56; nothing after that point was re-verified. Layer tags: REPO (branch tip) vs SERVED (container/process) vs LIVE (running now).

### 1a. `/home/nolan/ping` @ `testing/ladder-2026-09-30` @ `23e15f622` (REPO)
Backend runtime tenancy (JS/Python). Tenant branches present (all local, none pushed):
`fyd/tenantos-integration-2026-09-24`, `lane-b/tenant-dispatch-threading`,
`lane-o/tenantos-integration`, `p1/tenant-spoof-ingress-fix`,
`workerB/tenantos-vector-filter`, `workerH/tenantos-vecpg-merge`.

### 1b. `/home/nolan/projects/ping` @ `fyd/builder-harvest-trackc-2026-09-28` @ `f94bba39` (REPO)
Website/FYD tree. Tenant wave branches present (all local, none pushed):
`tenanos-wave/integration @ 51d4a187` + 10 unit branches (P-20260923-001/012/089/091/092/095/098/100/103/104-105).

### 1c. `/home/nolan/projects/ping-fyd-converged` @ `fyd/convergence-2026-09-28` @ `300c9c91` (REPO + SERVED)
This tree IS the served Mission Control: next-server v15.5.24 on :3100 (pid 46070, cwd verified), reachable at http://100.79.154.43:3100/mission-control.

### 1d. Served/live processes (LIVE)
- `ping-gateway` container, up 23h, image `ping-gateway:repair-cert-20260924` — PREDATES the entire W-series and lane B. Served gateway has NO tenant binding.
- `ping-postgres`, `ping-qdrant` (healthy), `ping-redis`, `ollama`, others — up 35h.
- FYD journal gateway: node on :18199 (pid 850), cwd `/home/nolan/projects/ping/tools/fyd-journal-gateway` — the proven copy.

### 1e. Repo re-verification (Nolan, 2026-10-01 ~17:47)
Remote FYD not verifiable via connected GitHub; PING remote main = initial commit only; CRX remote = older constitutional-object-model line. Local Pig state is fresher but: local != integrated != deployed != served. Every claim above carries its layer tag.

## 2. Implementation inventory: what exists, what state it's in

### A. Backend runtime tenancy (/home/nolan/ping)
| Piece | State | Notes |
|---|---|---|
| `ping-runtime/runtime/tenant_registry.js` (TenantRegistry, Postgres-backed, mounted `/tenants`) | PARTIAL, LIVE DEFECT | Docstring claims "central authority"; reality is an unauthenticated write surface (register/delete with no auth). `auth_token_hash` column has zero consumers. No route consults it for authorization. |
| `ping-runtime/canonicalization/namespace_binding.js` ("requested wins iff bound") | WORKING in harness, LATENT as identity | Hostile suite 15/15 on the integration branch. Bindings STATIC, hardcoded in `gateway_runtime.js:448-458` (tenant::hpp, 7 sources). Zero non-test `bindSource` callers. |
| `ping-runtime/runtime/tenant_capability_grant.js` (W5 validator) | EXISTS, UNWIRED | Typed grant validator, explicitly NOT an authority ("Grant issuance belongs to the TenantOS Customer API (future)"). Zero live imports. One test file. |
| `gateway/routes/tenants.js` | LIVE DEFECT | No auth middleware; anyone can register/delete tenants. |
| W-series: W3 `ping_missions.tenant_id` immutable+idempotent, W6 `ping_events.tenant_id` validated at emit, W4 worker emission tenant pin | IN REPO, NOT SERVED | Served container predates all of it. |
| Lane B `lane-b/tenant-dispatch-threading @ 1822d5fae` | COMMITTED, UNMERGED, UNDEPLOYED | Scheduler threads `mission.tenant_id` into dispatch event; POST /missions derives namespace from validated tenant_id, stamps `created_by` from `req.authenticatedAgent`. 5/5 tests. |
| `gateway/exterior_auth_middleware.js` | PARTIAL | Bearer -> `req.authenticatedAgent` (muse L1, muse-level-2 L2). Lane B wired consumption for missions. |

### B. TS wave kit (`tenanos-wave/integration @ 51d4a187`)
10 units: jest config, sandbox profiles, MemoryCandidate schema, decision-budget, tenant boundary kit (tenant-context/namespace-binding/tenant-scope/bridge-tenant), run-state vocab, context-pack assembler, bootstrap record, attempt fencing, webhook HMAC + resource-download auth (104/105, Nolan-reserved, written only). Tests green (tenant-kit 14/14). **Zero live callers on any served branch.** Library only.

### C. Website-layer tenancy (/home/nolan/projects/ping, FYD branch)
- `src/config/tenant.ping.v1.json` — PING tenant config ("platform code + tenant configuration + content; a second tenant is a new tenant.*.v1.json plus content, never a fork").
- `src/types/tenant.ts`, `src/lib/tenant-config.ts` (AuthorityLoader-based).
- `src/fyd/tenant/` — `tenant-context.ts` (hard boundary contract, typed `TenantContextError`, fail-closed, refusal never null/[]) + `scoped-stores.ts` (tenant-scoped wrappers over the REAL FYD stores: Ask FYD visitor-answer, object graph, owner store, customize overlays) + `__tests__`.
- State: landed on the FYD branch. Adversarial proof status unverified in this pass.

### D. FYD journal gateway (`/home/nolan/projects/ping/tools/fyd-journal-gateway/server.mjs`)
**LIVE on :18199.** Tenant isolation PROVEN: 39/39 (6 suites) + hostile live probes green 2026-09-25. `fyd-site:<tenant_id>` aggregates, `tenant_required`/`tenant_mismatch` fail-closed, zero-disclosure request_id binding. This is the strongest reached tenant implementation in the estate.
- PATH DIVERGENCE (small defect): a stale copy sits at `/home/nolan/workspace/fyd-journal-gateway/` (events.jsonl Sep 30, server.mjs Sep 24). MC reads the workspace path -> "journal overlays unreadable" DEGRADED. Live gateway writes to the projects/ping path.

### E. mc-approval tenant binding (P0-2, SERVED)
In the served MC tree (`300c9c91`): `mc-approval/approval_request.py` binds tenant at proposal creation (immutable record field, tenant-scoped dedup + id minting), `authorize_approval_transition` refuses WAITING->APPROVED on tenant-less records, `--tenant` CLI flag, 14 hermetic tests green. Ported to `/home/nolan/projects/ping` as `f94bba39`. **WORKING on served :3100.**

### F. Mission Control projection (SERVED :3100)
`/api/mc/missions` returns records with `tenant` (**populated: `"tenant::ping"` — the dogfood tenant IS stamped**), `capability: null`, `work_order_id: null`, `reconciliation_state: null`, `agent: null`. The projection schema already anticipates Nolan's chain fields; population is the gap. MC does NOT yet project: ORCA PROPOSED / AUTHORIZED / PLACEMENT / WORKER REPORTED / INDEPENDENTLY VERIFIED / REMAINS UNKNOWN.

### G. Capability + execution machinery (PING existing)
- `ping-runtime/connectors/capability_registry.js` — capability->provider->entry + reverse index, wired via `createConnectorRoutes`. WORKING.
- `runtime/authorities/execution_authority.py` — single authority for execution transport; `ExecutionAdapter` protocol; `SubprocessExecutionAdapter`. WORKING (Python plane).
- `MissionScheduler` -> `WorkerRuntime.dispatch` (dispatch-only by design). UNKNOWN-outcome reconciliation (`_reconcileUnknown`, MISSION_RECONCILE_HOLD). `DeadLetterAuthority` wired, never exercised.
- `WorkOrder`: exists ONLY in Temporal adapter files (`temporal/workflows/mission_workflow.js`, `temporal/activities/mission_activities.js`, `context/context_integration.js`). Adapter-level concept, not a first-class PING type.
- **Placement machinery: ABSENT.** No (tenant, capability) -> eligible execution target decision exists anywhere. This is the core TenantOS gap under the sharpened scope.
- Event authority: `UnifiedEventRuntime.emit` is the sole admission choke point (KEEP; do not touch).
- Identity: 8 competing implementations (known debt). Nolan froze identity work — DO NOT TOUCH.

## 3. Authority-overlap assessment
- **TenantRegistry**: claims centrality, is a write surface. Risk LOW if treated as registry; the docstring claim should be corrected when the file is next touched. No consumer treats it as authority today.
- **Three namespace binders** (JS live binder / TS wave binder / journal-gateway bindings): same policy, different layers, no shared authority. Under tenant=ping scope: ONE binder on the live path (JS). TS wave kit stays PARKED on its branch as mechanism reference. Converge-or-kill: KILL the duplication by parking, not by porting.
- **tenant_capability_grant.js**: explicitly not an authority (validator). No overlap. The missing piece is grant ISSUANCE — a design decision for Nolan, not an emergent property.
- **No second orchestrator / scheduler / queue / worker framework / event bus** found in any TenantOS code. The hard prohibitions hold in the current tree.
- **Identity**: frozen debt, out of scope.

## 4. Four operational tests, reframed for tenant = PING (dogfood)

1. **Isolation** — Journal gateway: PASS (39/39 + hostile). Backend events/missions: PARTIAL in repo (W3/W6 + lane B), FAIL on served container (pre-W-series image; ping_events rows carry no tenant_id). Vector layer: FAIL (no tenant_id on points, no Qdrant auth, single global config) — Q-T-01 DEFERRED under sharpened scope (no second tenant; do not build for hypothetical tenants).
2. **Identity** — Ingress binding: PARTIAL (hostile-green in harness; static hardcoded bindings; no credential->principal->tenant chain — `auth_token_hash` unused). `tenant::ping` IS stamped on served MC missions. For tenant=ping-only operation, operator-provisioned static bindings are sufficient; the gap matters only if a second real tenant appears (held off).
3. **Capability enforcement** — CapabilityRegistry: WORKING. Grant validator: EXISTS, UNWIRED. Grant issuance: ABSENT (future by design). Served missions show `capability: null` — no capability is required or recorded on missions today. Verdict: PARTIAL.
4. **Private/public boundaries** — FYD-010 (Ask FYD leaking private owner fields): OPEN -> FAIL until adversarially proven. Journal gateway: PASS (zero-disclosure). `src/fyd/tenant` scoped-stores: landed, adversarial proof UNKNOWN. Pre-launch PII rule holds: no real business PII in the system.

## 5. Scoped work plan: TenantOS backend for PING betterment
Sequence per Nolan: visual integration -> MC real PING cockpit -> ORCA BUG-0001/real mission -> TENANTOS PING capability + placement -> FYD owner loop -> Ask FYD evidence + privacy.
Each item carries: FYD CURRENT / PING EXISTING / HARVESTABLE / DUPLICATION RISK / SMALLEST DELTA / NEEDS NOLAN.

### P0. Dogfood tenant identity = tenant::ping (operator-provisioned, no new authority)
- FYD CURRENT: mc-approval binds tenant at proposal creation (served, green). Journal gateway binds `fyd-site:<tenant_id>` (live, proven).
- PING EXISTING: `namespace_binding.js` (hostile 15/15); static bindings in `gateway_runtime.js:448-458`; `tenant::ping` already stamped on served MC missions.
- HARVESTABLE: lane B `POST /missions` namespace-derivation + `created_by` stamping (committed, unmerged).
- DUPLICATION RISK: none — extends the existing binder.
- SMALLEST DELTA: move the static binding table from hardcoded `gateway_runtime.js` lines into operator-provisioned config (env/file); keep "requested wins iff bound". Merge lane B (adjacent hunks, no overlap with lane A).
- NEEDS NOLAN: gateway container rebuild/redeploy (served image predates everything). Merge itself is reversible.

### P1. Capability into the mission path (populate the chain's missing links)
- FYD CURRENT: tenant bound at proposal creation; capability gate on POST /api/mc/approvals (`92108239`).
- PING EXISTING: CapabilityRegistry (working, wired); `tenant_capability_grant.js` validator (unwired); mission records carry `capability: null`.
- HARVESTABLE: Talos pattern (model proposes, deterministic system authorizes) — mechanism only, no code copied; map Talos grant shape against W5 before any issuance design.
- DUPLICATION RISK: none if the validator stays a validator. Do NOT create a CapabilityAuthority — the registry + validator + existing approval boundary are the enforcement points.
- SMALLEST DELTA: require/record `capability` (from the existing registry vocabulary) at mission creation/dispatch; validate against `tenant_capability_grant` for tenant=ping; stamp on the mission row; MC projects the existing `capability` field (populate the null).
- NEEDS NOLAN: mission schema/field change (capability column); grant-issuance shape (future, not this item).

### P2. Placement: (tenant, capability) -> eligible execution target (the core TenantOS build)
- FYD CURRENT: none.
- PING EXISTING: ExecutionAuthority + ExecutionAdapter protocol; MissionScheduler -> WorkerRuntime.dispatch; worker registry.
- HARVESTABLE: MatrixClaw external-runtime boundary (mechanism: core owns session/control, runtime owns process/thread; adapter normalizes) — derive from the existing ExecutionAdapter contract, do not copy.
- DUPLICATION RISK: HIGH if done wrong — this must NOT become a scheduler, queue, or worker framework. It is a pure deterministic function consulted by the existing scheduler before dispatch.
- SMALLEST DELTA: `placementFor(tenant, capability) -> eligible execution target + reason`, recorded on the mission (`WHERE TENANTOS PLACED IT`), then the existing authorized dispatch path runs unchanged. HOST != OWNER: placement records the host; ownership stays with PING authority. PLACEMENT != IDENTITY: placement never mints identity. PROVIDER != CAPABILITY: the registry's capability->provider mapping is the input, not the decision.
- NEEDS NOLAN: placement eligibility design (what makes a target eligible); the first live placement run.

### P3. Reconciliation + independent verification (close the epistemic loop)
- FYD CURRENT: mc-approval authorize/refuse transitions (typed, no state change on refuse).
- PING EXISTING: UNKNOWN-outcome reconciliation (`_reconcileUnknown`, MISSION_RECONCILE_HOLD); DeadLetterAuthority (wired, never exercised); mission records carry `reconciliation_state: null`, `work_order_id: null`.
- HARVESTABLE: ClawDesk/ForkScout/POLO mechanisms (leases, attempt numbers, orphan detection) — strengthen existing, do not replace.
- DUPLICATION RISK: none — exercises reached code.
- SMALLEST DELTA: exercise the DLQ on a bounded mission set; populate `reconciliation_state` and `work_order_id` on missions; MC projects both. Verifier role distinct from worker (PROVISIONING RECEIPT != EFFECT VERIFICATION). PLAN != AUTHORIZATION != ATTEMPT != RESULT != EFFECT != VERIFICATION != OUTCOME rendered separately in MC.
- NEEDS NOLAN: no (read-model + existing machinery), unless DLQ exercise touches production missions — then yes.

### P4. MC PING cockpit (projection only, never authority)
- FYD CURRENT: served MC at :3100 from `ping-fyd-converged`.
- PING EXISTING: `/api/mc/missions` (tenant populated; capability/work_order_id/reconciliation_state null); `/api/mc/today` (DEGRADED: journal overlays unreadable).
- HARVESTABLE: Wayland/AgentArk/MyAgens UX questions (mechanism only).
- DUPLICATION RISK: none — projection only.
- SMALLEST DELTA: (a) fix the journal path divergence: MC reads `/home/nolan/workspace/fyd-journal-gateway/events.jsonl` (stale Sep 30); live gateway is at `/home/nolan/projects/ping/tools/fyd-journal-gateway/` — point MC at the live path; (b) populate capability/work_order_id/reconciliation_state from P1-P3; (c) add the epistemic rows per mission: WHAT PING WANTED / EVIDENCE USED / ORCA PROPOSED / AUTHORIZED / CAPABILITY REQUIRED / PLACEMENT / EXECUTED BY / WORKER REPORTED / INDEPENDENTLY VERIFIED / OUTCOME / REMAINS UNKNOWN / LEARNED.
- NEEDS NOLAN: MC :3100 rebuild/redeploy (served tree).

### P5. FYD-010 adversarial privacy proof (the PII gate)
- FYD CURRENT: `src/fyd/tenant/scoped-stores.ts` landed; Ask FYD evidence-bounded (recovered ~13:38 2026-10-01).
- PING EXISTING: journal gateway zero-disclosure binding (proven).
- SMALLEST DELTA: adversarial suite — a PUBLIC VIEWER attempts to retrieve PRIVATE/PING_ONLY/OWNER fields via Ask FYD, object graph, and projections; every attempt must fail closed with typed refusal (never null/[]). This is the release criterion Nolan set.
- NEEDS NOLAN: the verdict lifts the PII hold (his call). The test itself is autonomous.

### P6. Park/kill decisions (converge or kill one)
- TS wave kit (`tenanos-wave/integration`): PARK on branch. Do not wire into served paths.
- `tenant_registry.js`: keep as REGISTRY; correct the "central authority" docstring claim when next touched. `/tenants` unauthenticated writes: add auth or remove from served gateway — NEEDS NOLAN (auth design).
- Qdrant per-tenant (Q-T-01): DEFER with reason (no second tenant under sharpened scope). Revisit only when a second real tenant exists.
- Identity debt (8 implementations): FROZEN per Nolan. Do not touch.

### P7. Learning (never a new AI authority)
- PING EXISTING: `feedback_contract.js`; outcome-ledger `propose-learning` (CANDIDATE only, no promote path by design).
- SMALLEST DELTA: NONE NOW. When VERIFIED OUTCOMES accumulate: PATTERN -> CANDIDATE -> SUPPORT SET -> CONFIDENCE/APPLICABILITY -> PROPOSAL -> EXISTING AUTHORIZATION -> DETERMINISTIC POLICY, using the existing approval boundary. Objective: move judgment MODEL-REQUIRED -> MODEL-ASSISTED -> DETERMINISTIC DEFAULT + MODEL ESCALATION only when evidence justifies it.
- NEEDS NOLAN: the promotion boundary design, when outcomes exist to promote.

## 6. Needs-Nolan's-word register (nothing below is approved)
1. Gateway container rebuild/redeploy (served image predates W-series + lane B).
2. MC :3100 rebuild/redeploy.
3. Mission schema/field changes (capability, work_order_id, reconciliation_state).
4. Placement eligibility design + first live placement run.
5. `/tenants` route auth design (or removal from served gateway).
6. FYD-010 verdict -> PII hold lift.
7. Any push of tenant branches (all local-only today).
8. Vector-layer tenancy design (deferred; his call when a second real tenant arrives).

## 7. Caveats
- Pig tunnel dropped ~17:56 MDT; the MC missions route source file was not read (find timed out). The `/api/mc/missions` field assessment rests on the live API response, which is the stronger evidence anyway.
- Served-gateway internals (pre-W-series) were assessed from the image tag + prior lanes' findings, not a fresh container inspection.
- `src/fyd/tenant` test status was not re-run (read-only task).
- No customer tenants were fabricated at any point; every generality claim is about the absence of PING-specific hacks, per the scope.
