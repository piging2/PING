# PING CORE INTERROGATION — Investigator C: Executors (Q7, Q8, Q9)

Date: 2026-09-30. Reader/falsifier pass. No builds, no patches, no proposals.
Method per question: QUESTION -> CURRENT CLAIM -> REACHED PATH -> EVIDENCE -> COUNTEREVIDENCE -> VERDICT -> SMALLEST CONSEQUENCE. After every answer: the falsifying observation is stated.

Live probes in this pass were performed against the Pig (pigwsl-exec, 2026-09-30 ~14:30-15:00 MDT): :3100 served from /home/nolan/projects/ping-fyd-converged, FYD journal gateway :18200, and file reads of operator-provisioned stores.

---

# Q7: Can any executor manufacture its own authority?

## QUESTION
Can any executor manufacture its own authority? Hostile-test every handoff: worker -> grant; grant -> tenant; mission -> work order; work order -> capability; connector -> effect; ORCA -> executor; TenantOS -> placement; Mission Control -> action. Try self-attestation, tenant substitution, actor substitution, replayed grants, stale grants, mismatched correlation IDs, capability escalation, forged result envelopes.

## CURRENT CLAIM (the mental model under test)
The exterior-agent path is guarded by a single grant decision (ExternalAgentAdapter.authorizeWorkOrder), tenants are derived from authenticated caller keys never the request body, result envelopes are verified against issued work orders, and Mission Control is a read-only projection that never mutates truth.

## REACHED PATH
- `~/workspace/orca-adapter/vendor/external_agent_adapter.js` (435 lines, read in full) — the canonical adapter.
- `~/workspace/mission-control/lane-d/adapter-call.js` (143 lines) — the shim.
- `~/workspace/mission-control/mission_intent.py` — the Python front door model (AuthenticatedContext, resolve_tenant, check_agent_entitlement).
- Mission Control :3100 routes (live on the Pig): `src/app/api/mc/dispatch/route.ts` + `_lib/mc-dispatch.ts`, `_lib/mc-dispatch-identity.ts`, `_lib/mc-tenant-gate.ts`, `src/app/api/mc/approvals/route.ts`, `src/app/api/mc/missions/route.ts`.
- `~/workspace/ping-infra/connectors/src/` (executor.ts, registry.ts, types.ts).
- FYD journal gateway :18200 (live probe) + `server.mjs`.
- TenantOS hostile proof 2026-09-25 (`~/workspace/lane-c/tenantos-hostile-proof-2026-09-25.md`).

## EVIDENCE

### Handoff 1: worker -> grant — ENFORCED (PROVEN here)
`authorizeWorkOrder({agentId, capability, namespace, constraints})` in external_agent_adapter.js:
- unknown agent -> `{granted:false, reason:'Unknown exterior agent'}`;
- `blockedExternal` (codex dormant per owner 2026-09-28) -> deny;
- `PENDING_AUTH` profiles -> deny;
- capability not in `allowedCapabilities` -> deny;
- namespace fails `NAMESPACE_RE` (`^(core|tenant)::[a-z0-9_.-]+$`) -> deny;
- constraints must be an object and may only tighten relative to profile max; `no_canonical_events` and `no_mission_state_writes` are hard-required true.
The grant is computed PING-side from the registry profile. The worker supplies only the request fields; nothing in the worker's output (prompt, envelope, self-report) can widen the grant. **Self-attestation cannot manufacture a grant on this path.** The adapter also holds no event identity and defers event emission to the UER via `recordVerifiedResult` (worker self-report recorded as `effect_unknown`, never clean success — code comment at adapter: "worker self-report is a claim, not verification, O5").

### Handoff 2: grant -> tenant — NOT FULLY ENFORCED (PARTIAL / FALSIFIED as hard boundary)
Two layers:
(a) The adapter itself does NOT check tenant entitlement. `authorizeWorkOrder` validates the namespace *shape* only (`tenant::<id>`). It accepts any tenant string from any caller. The adapter trusts its caller (PING); a direct `node adapter-call.js authorize` invocation on the Pig with `namespace: 'tenant::victim'` is granted if agent/capability/constraints pass. Tenant binding lives in the route, not the adapter.
(b) The MC dispatch route binds tenant from a server-side caller-key registry (`x-mc-caller-key` -> {agent_id, tenant, entitled_tenants}); a body tenant that disagrees is refused (`tenant_mismatch`, 403). Good design — but **the registry file does not exist on the Pig** (`/home/nolan/workspace/mission-control/dispatch-identities.json` absent), so every dispatch POST currently returns 503 `identity_unavailable` (verified live). The surface is armed but keyless; the fail-closed is accidental (missing provisioning), not tested provisioning.
(c) The GET read path (`mc-tenant-gate.ts`) is explicitly NOT authorization: "a caller asserting `x-mc-tenant`... asserting another tenant's id gets that tenant's view. This stops accidental cross-tenant reads... but it is NOT authorization against a deliberate loopback caller." The code is honest; the boundary is asserted-tenant, not authenticated-tenant.

### Handoff 3: mission -> work order — ENFORCED against replay (PROVEN with one caveat)
The dispatch route mints `missionId = 'mc-m-' + sha256('mission|agent|tenant|capability|promptDigest|idempotencyKey')[0:12]` — no clock anywhere. Before any adapter call it runs `findPriorMission(missionId)` over the FYD journal JSONL: terminal prior -> `duplicate_suppressed` (no re-dispatch); in-flight prior -> 409 HOLD (never blind re-dispatch). **Replayed grants are neutralized**: a byte-identical replay returns the original record; a replay of an in-flight mission is refused. Caveat (the code's own comment): the idempotency key is hashed into the mission id but not persisted in the MC_MISSION_CREATED event_data, so an audit cannot prove which key produced a mission.

### Handoff 4: work order -> capability — ENFORCED at decision layer (PROVEN), SOFT at execution layer (PARTIAL)
Dual check: the route checks `profile.allowedCapabilities.includes(capability)` AND the adapter re-checks (its denial is authoritative). **Capability escalation fails at the decision layer.** At the execution layer, constraints are enforced by rendering them into the worker prompt ("caveat-1 closure", prompt-level) plus Hermes `--safe-mode` (env vars `HERMES_SAFE_MODE=1`, plugin discovery skipped — NOT an OS sandbox, verified 2026-09-26) and copilot-broker tasks with prompt-level `read_only/no_writes/no_network`. A compromised or careless broker executor is not OS-constrained by PING. So: the grant cannot be widened, but the executor's actual behavior inside its grant is prompt-governed, not sandbox-governed.

### Handoff 5: connector -> effect — NOT REACHED (unwired)
`~/workspace/ping-infra/connectors` implements `ConnectorExecutor`: registry lookup -> health gate -> receipt INTENT_RECORDED -> lease claim -> adapter execute() with vault+lease -> credential-leak scan -> OBSERVED receipt -> lease release; the executor NEVER retries. There is **no per-call grant decision**: any code holding a ConnectorExecutor instance may execute any registered connector. Health gating is the only gate. But the whole tree search found **zero production callers** of this framework — it is framework-only, not wired to any live path. Hostile test verdict: nothing to hostile-test; the boundary exists in code only.

### Handoff 6: ORCA -> executor — ENFORCED that ORCA holds no grant power (PROVEN)
The ORCA control loop (`~/workspace/orca-dispatch-test/orca_control_loop.js`, witnessed run 2026-09-18) states its posture in its header: ORCA observes state it does not own, **never emits canonical events itself**, delegates through `authorizeWorkOrder`/`issueWorkOrder`, executes nothing. Verified: the loop spawns the Hermes subprocess and extracts the envelope from stdout via brace-matching, then calls `adapter.recordVerifiedResult({eventRuntime, result, workOrder, invokedAgentId, verifiedAt})`. Forged envelopes die in `verifyResultEnvelope`: work_order_id/context_pack_id/capability must match the issued order; `invokedAgentId` must equal both `workOrder.agent_id` and `result.agent_id`; completed/failed consistency enforced; deadline enforced; verification failure is non-retryable and "can never reach canonical event authority" (comment). Mismatched correlation IDs: `verify` does NOT check `correlation_id` — it is passed through on the envelope/journal but unverified; a correlation-id mismatch is observable in the journal, not blocking. Timeout case: the loop fabricates a dispatcher-side envelope — status `failed`, evidence labeled "dispatcher-side timeout report, not worker output" (never success). **Executor cannot manufacture authority; the worst a hostile executor achieves is a denied envelope and an escalation.**

### Handoff 7: TenantOS -> placement — NOT REACHED / UNKNOWN
No "placement" decision point (where tenant work executes / which tenant owns an action) was found in any TenantOS artifact searched. The lane-c hostile proof (2026-09-25, live probes against the :8080 gateway) found vector isolation FAIL (unfiltered Qdrant scroll returned other-tenant secrets) and postgres isolation FAIL (cross-tenant UPDATE succeeded), PASS only on the FYD journal gateway (`tenant_required`/`tenant_mismatch` 400s). Live today: :18200 POST requires `Authorization: Bearer <FYD_JOURNAL_WRITE_TOKEN>` (verified: `write_auth_denied` without it) and GET requires a tenant (400 without). The FYD journal gateway enforces tenant scoping on its own seam; no TenantOS placement authority exists as a reached mechanism. (Also consistent with the 2026-09-30 14:18 re-aim: no cloud placement is being built.)

### Handoff 8: Mission Control -> action — FALSIFIED as read-only (PROVEN mutation paths)
Mission Control has TWO live mutation paths on :3100 (listener is `*:3100`, all interfaces; `middleware.ts` has NO auth on any route):
1. `POST /api/mc/approvals` — **unauthenticated**. Accepts `approver` from the body, defaulting to the literal string `'nolan:demo-owner'`. Runs the canonical `approval_cli.py decide`: digest must match (tamper detection, not authorization — the digest and the full proposal body are readable via the unauthenticated GET view). On approve emits `MC_APPROVAL_APPROVED` into `/home/nolan/workspace/fyd-journal-gateway/events.jsonl` and mutates `/home/nolan/projects/ping/var/mc-approvals.json`. The store contains a REAL decision: `p0prop-ac04480a6d1809fd | APPROVED | FYD presentation patch: Emergency Services section on the Happy Place homepage (home:Services:2) | nolan:owner`, decided 2026-09-28, with a real site effect. **An unauthenticated tailnet caller can manufacture an owner-attributed approval.** Approver identity is a self-asserted string; the store cannot distinguish Nolan's decision from anyone else's.
2. `POST /api/mc/dispatch` — key-gated (`x-mc-caller-key` from a server-side registry; tenant derived, never from body; body-tenant mismatch refused). Currently every call fails closed with 503 `identity_unavailable` because the registry file was never provisioned on the Pig (verified live). The UI DISPATCH tab is mounted and offers the form.

## COUNTEREVIDENCE (to the claim "no executor can manufacture authority")
- The approvals route has no authentication and a self-asserted `approver` field; the digest "tamper detection" is publicly readable, so it is not an authorization boundary. A real owner-attributed decision with real site effect was recorded through this path.
- The adapter's `authorizeWorkOrder` trusts its caller for the tenant namespace (shape-only check); the tenant-entitlement enforcement sits in the route layer, bypassable by direct `adapter-call.js` invocation on the Pig.
- The GET tenant gate self-documents that it is not authorization against a deliberate caller.

## VERDICT: PARTIAL
The exterior-agent grant path is airtight at the decision layer (self-attestation, capability escalation, replayed grants, forged envelopes all fail closed in code, proven by reading the enforcing functions). But the question "can ANY executor manufacture authority" fails on the Mission Control approvals path: an unauthenticated HTTP caller can manufacture an owner-attributed APPROVED decision with real downstream effect. And the tenant entitlement check is route-layer, not authority-layer.

## FALSIFYING OBSERVATION
Show me a live `POST /api/mc/approvals` approve for a real proposal that is refused for a caller that cannot present a Nolan-held secret, or show the route rejecting a body-claimed approver. Absent that, the manufactured-approver verdict stands. (Similarly for tenant: show `authorizeWorkOrder` itself refusing a tenant the caller is not entitled to.)

## SMALLEST CONSEQUENCE
Record the two facts in the standing law where the "read-only projection" claim lives: (1) MC approvals POST is a live, unauthenticated mutation that self-asserts approver identity; (2) tenant entitlement is enforced at the MC route layer, not in the adapter. Do not redesign; the dispatch path is already fail-closed by the missing registry.

---

# Q8: What exactly is ORCA?

## QUESTION
Strip away its name. For every behavior ORCA performs, identify the semantic owner beneath it. Is it planner / policy evaluator / reconciler / mission generator / delegation controller / execution authority / scheduler? If ORCA disappeared, which PING semantics disappear and which merely lose automation?

## CURRENT CLAIM (the mental model under test)
ORCA is variously described as an autonomous mission controller, a planner, and a delegation layer. The 2026-09-30 14:18 binding re-aim now defines ORCA as a concept/primitive to harvest — OBJECTIVE -> OBSERVE -> PLAN -> AUTHORIZE -> ACT -> VERIFY -> LEARN -> NEXT — explicitly NOT a product or a parallel sovereign runtime.

## REACHED PATH
- `~/workspace/orca-dispatch-test/orca_control_loop.js` (the section-20 vertical slice; witnessed run 2026-09-18) and `~/workspace/orca-remediation/orca_control_loop.js`.
- `~/workspace/orca/` docs (effect classes, unknown-outcome experiments).
- `~/workspace/autonomous-missions/ORCA-ARCHAEOLOGY-2026-09-23.md` (this covers orca-cli, the EXTERNAL Go project — a naming collision; none of that code is PING's ORCA).
- The recon doc `~/workspace/forensics/recon-2026-09-19/agent-f-temporal-orca-approval.md` (two ORCA implementations).
- The converged present: `AGENT_PROFILES` ORCA dispatcher families in `external_agent_adapter.js` (cloud-subagent, hermes, ollama, copilot identity_1..4), the MC dispatch route, the MC UI "Control law" text.
- Live: NO orca process is running on the Pig (`ps -ef | grep -i orca` empty).

## EVIDENCE — per-behavior decomposition (implementation 2, the real one; implementation 1's ExecutionEngine is a certified A0 facade with `executor: null`, deprecated)

| ORCA behavior | Code | Semantic owner beneath it |
|---|---|---|
| OBSERVE | `observe()`: `MissionRuntime.getStats/getPending/getActive`, direct `SELECT` on `ping_events`/`ping_missions`, `fetch('http://127.0.0.1:8080/health')` | MissionRuntime (mission authority); UER/`ping_events` (event journal); the gateway itself. ORCA owns nothing read. |
| PLAN | `buildPlan()`: hardcoded single-task plan template; task-2 derived from observed state at follow-up time | None beneath. Coordinator intelligence (the loop author's logic). In the witnessed runs the plan shape was fixed; judgment was human/model-authored, not a PING semantic. |
| AUTHORIZE | `adapter.authorizeWorkOrder(...)` | ExternalAgentAdapter — sole grant owner. ORCA makes no grant decision. |
| ISSUE work order | `adapter.issueWorkOrder(...)` | ExternalAgentAdapter. ORCA supplies the request fields only. |
| ACT / dispatch | `dispatchHermes()` subprocess spawn; prompt construction `buildWorkerPrompt()` | Worker transports (Hermes bridge, Ollama HTTP, copilot broker). ORCA holds the prompt template; execution belongs to the worker. |
| MONITOR | poll-with-deadline loop (`DISPATCH_TIMEOUT_MS`) | None beneath. Orchestration logic in the loop script. |
| VERIFY | `extractEnvelope()` + `adapter.verifyResultEnvelope()` / `recordVerifiedResult()` | ExternalAgentAdapter (verification); UER (canonical event emission). ORCA performs extraction; the verdict belongs to the adapter and the journal. |
| ASSESS / FOLLOW-UP | `assessAndFollowUp()`: conditional task-2 from verified output, retry-or-escalate | None beneath. Coordinator logic. |
| BOUNDS | `MAX_WORK_ORDERS=2, MAX_ATTEMPTS=2`, 180s dispatcher timeout, 10-min work-order deadline | None beneath. Operator policy encoded as constants. |
| RETRY/ESCALATE | `Escalation` class; re-issue same task through the authorized path | ExternalAgentAdapter (re-authorize per attempt). ORCA decides when; the grant is re-made each time. |

The MC UI's "Control law" text confirms the current converged posture: "Request reconciliation, hold, resume after reconciliation, and cancel future work are withheld until the ORCA port lane wires a witnessed mutation for them" — i.e., ORCA-the-concept does NOT currently perform reconciliation, hold, resume, or cancel. "RETRY NOW is never offered for unknown consequential effects."

## Answer to the role list
- Planner: only in the thinnest sense (fixed plan template; follow-up conditioned on verified output). The intelligence was human/model-authored. NOT a planning authority.
- Policy evaluator: NO. Defers entirely to `authorizeWorkOrder`.
- Reconciler: NO. Witnessed reconciliation mutations are explicitly withheld.
- Mission generator: NO. (`gateway/automatic_mission_generator.js` is a separate gateway component.)
- Delegation controller: YES. This is the accurate name: observe -> plan -> authorize -> delegate -> monitor -> verify -> assess, with bounded autonomy.
- Execution authority: NO. Never emits canonical events; the header comment and the witnessed runs prove it.
- Scheduler: NO. MissionRuntime/MissionScheduler (lease, claim, reap) owns scheduling; ORCA never claims missions.

## If ORCA disappeared — which semantics disappear, which merely lose automation?
- Disappear: the closed autonomous delegation loop as an entity (the one process that strings observe->plan->authorize->act->verify->assess together with bounded-autonomy constants). No live ORCA process exists today, so this is already the de-facto state; the MC dispatch route covers the same authorize->issue->verify handoff on demand.
- Merely lose automation: everything else. Observation (MissionRuntime/`ping_events` reads), grant decisions (ExternalAgentAdapter, callable directly via `adapter-call.js`), work-order issuance, envelope verification, evidence artifacts (plain JSON files + journal events), bounded retry policy. No canonical PING truth — no event, mission, grant, identity, or evidence semantic — is owned by ORCA. The adapter, the mission runtime, the journal, and the workers all survive it.

## COUNTEREVIDENCE
- The name "ORCA" is also used for the external orca-cli Go project (a coding-agent runner) and for the ORCA dispatcher families registered in the adapter. Neither is PING's ORCA; conflating them inflates ORCA's apparent scope.
- The old ExecutionEngine (`ping-runtime/orchestration/execution/engine.js`) was labeled ORCA and was a facade (`executor: null`). Any claim of ORCA capability must name which implementation; the facade's A0 certification does not describe the control loop.
- ORCA's "PLAN" could be mistaken for planning intelligence; in the only proven-live implementation it was a fixed template with the real judgment done by the human/model that authored the run.

## VERDICT: PROVEN
ORCA is a delegation controller: orchestration automation over existing authorities, owning no grant, no event emission, no scheduling, no reconciliation. It is intelligence-shaped automation (the loop), not authority. Its disappearance costs the closed loop's automation, not any PING truth semantic. This is consistent with the 2026-09-30 binding re-aim: ORCA is a concept/primitive to harvest (OBJECTIVE -> OBSERVE -> PLAN -> AUTHORIZE -> ACT -> VERIFY -> LEARN -> NEXT), not a product and not a parallel sovereign runtime.

## FALSIFYING OBSERVATION
Show me a canonical `ping_events` row whose writer is an ORCA process, or a grant/deny verdict produced by ORCA code rather than by `ExternalAgentAdapter.authorizeWorkOrder`, or a mission-state transition owned by the control loop. Any one of those would prove ORCA holds authority, falsifying this verdict. (The witnessed 2026-09-18 run showed the opposite: zero writes during observe; all events via `recordVerifiedResult`.)

## SMALLEST CONSEQUENCE
Keep using the re-aim's primitive vocabulary (the loop as a named pattern) and stop treating "ORCA" as a component that could own state. Nothing to build; nothing is missing — the converged MC dispatch route already exposes the same handoff on demand.

---

# Q9: What exactly is Mission Control?

## QUESTION
Prove whether every field displayed by Mission Control (:3100) can be derived from canonical state. For every displayed field: SOURCE? OWNER? DERIVATION? FRESHNESS? UNKNOWN BEHAVIOR? CAN UI MUTATION CHANGE TRUTH?

## CURRENT CLAIM (the mental model under test)
Mission Control is a skeptical projection over proven backend state: every badge says how the number was produced, UI CLAIM <= BACKEND PROOF, and it never mutates truth.

## REACHED PATH
- Live :3100 on the Pig: Next.js app at `/home/nolan/projects/ping-fyd-converged` (served via `/home/nolan/start-3100.sh`, listener `*:3100`).
- The MC page: `src/app/mission-control/page.tsx` (1221 lines) + `marketingos-panel.tsx`; tabs TODAY / AGENTS / BUSINESSES / WEBSITES / TECHNOLOGY / SEARCH / DISPATCH / MARKETING.
- API routes: `src/app/api/mc/today`, `agents`, `graph`, `object`, `trace-forward`, `technology`, `search`, `missions`, `missions/[id]`, `approvals`, `dispatch`, `marketingos`, `marketingos/missions`; libs `mc-tenant-gate.ts`, `mc-dispatch.ts`, `mc-dispatch-identity.ts`, `mc-ping-journal.ts`, `mc-marketingos.ts`.
- Live probes: GET/POST on the routes, 2026-09-30 ~14:30-15:00 MDT.

## EVIDENCE — per-tab field provenance

### TAB: TODAY (`/api/mc/today`)
| Displayed field | Source | Owner | Derivation | Freshness | Unknown behavior | UI mutation changes truth? |
|---|---|---|---|---|---|---|
| services / degraded | `localhost:18199` health + `:3100/api/health` (4s timeout fetch) | the two servers | direct read | request time | fetch fail -> DEGRADED badge | NO (reads) |
| happening / changed | FYD journal gateway `GET /events/FYD_SITE_OVERLAY` (:18199) | FYD journal gateway (JSONL store, `events.jsonl`) | recent events projected | request time | unreachable -> null, shown as degraded | NO |
| failed | `~/workspace/ping-build-program/fleet/ledger.jsonl` tail | fleet writer(s) | verdict-key regex classify; timeouts -> "OUTCOME UNKNOWN", never FAILED | file mtime | missing file -> "OUTCOME UNKNOWN — NO RECORD" | NO |
| needsAuthority | `~/workspace/GRILLING-BRIEF.md` "ACTIVE QUESTIONS" section parsed | Nolan (author) | markdown parse | file mtime | missing section -> null | NO |
| willHappenNext | cron.d job files | cron operator | listing | request time | absent -> empty | NO |
| repoState | `git status` of the served repo | git | direct read | request time | — | NO |
| prototype | static text | page author | none | build time | labeled PROTOTYPE | NO |

### TAB: AGENTS (`/api/mc/agents`)
| Field | Source | Notes |
|---|---|---|
| Operations (mission/run/operation/attempt/effect/idempotencyKey/currentState/lastEvidence/reconciliationState/retryEligibility/criticality/authorityRequirement) | ORCA port-lane contract fields; values null/PROTOTYPE until the lane wires them | Displayed as "pending ORCA port contract" when null. Honest about unwired. |
| Scheduled agents | cron.d | request-time listing |
| Live processes | `ps -eo comm,args` filtered to node/python/next-server/tsx | request-time observation |
| Withheld controls | static list ("Request reconciliation, hold, resume... withheld") | labeled PROVEN as a statement of withholding |
| fleet ledger verdicts | `fleet/ledger.jsonl` with the truth-display law (timeout never -> FAILED) | file read |

### TAB: BUSINESSES (`/api/mc/graph`, `/api/mc/object`, `/api/mc/trace-forward`)
| Field | Source | Notes |
|---|---|---|
| objectCount/relationshipCount/provenanceKinds/predicates/ownerCorrectedCount/meta | `@/fyd/data/fyd-tenant-graph` server module (FYD tenant graph) | digest-verified tenant graph + journal overlays; reverse trace rendered value -> object -> claim -> evidence -> source; forward trace via eventId |
| tenant graph | FYD tenant graph store (per-site) | OWNER: FYD graph builder; fresh at request |

### TAB: WEBSITES
Static links to `/sites/happy-place` and `/sites/coppersmith-plumbing` plus a statement that safe actions (propose edit, correct fact, hide fact) live behind owner authority on the object experience. No live data.

### TAB: TECHNOLOGY (`/api/mc/technology`)
| Field | Source | Notes |
|---|---|---|
| claimLegend | static vocabulary | every field carries PROVEN/OBSERVED/DERIVED/UNKNOWN/STALE/CONFLICTING/PROTOTYPE/UNWIRED |
| tree nodes | `docker inspect` of `ping-gateway`, `ping-postgres`; service health URLs (`:8080/health`, `:18199/`, brain-postgres reachability) | OBSERVED per host, request time; cross-host evidence explicitly not smuggled |
| postgresBackup detail | bounded filesystem search (`/opt/ping/backups`, `/var/backups`, systemd timers, `*.dump` find) | OBSERVED if found, UNWIRED if absent |
| incidents/risks | derived from observed state (DERIVED claim) | request time |
| backlog objects | static trace records naming concrete missing backends + owning authority + shortest real path | PROTOTYPE, not fake controls |

### TAB: SEARCH (`/api/mc/search`)
Routes to the MarketingOS projection: reads the LIVE canonical journal, Pig plane `brain-postgres` / `ping_runtime.ping_events` (+ `ping_missions`, `knowledge_nodes`), through `mc-ping-journal.ts` which enforces **read-only** at two layers: a `query()` guard that throws on anything not starting with SELECT/WITH, and the pg driver option `-c default_transaction_read_only=on`. Credential from the live `ping-gateway` container env at runtime (not returned to callers). Fail-closed: journal unreachable -> 503, never an invented empty state. **This is the one path that reads canonical state and is provably read-only.**

### TAB: DISPATCH (`/api/mc/dispatch`)
- GET: catalog from the adapter profiles (`adapter-call.js profiles`), tenants, constraints — projection over the adapter. NO mutation.
- POST: the witnessed dispatch analyzed in Q7. Appends `MC_*` lifecycle events to `/home/nolan/workspace/fyd-journal-gateway/events.jsonl` (the FYD demo journal — NOT the canonical postgres `ping_events`), publishes prompt/work-order/context/result artifacts to `/home/nolan/workspace/mission-control/artifacts/`, and executes the agent via its proven transport (Ollama local; copilot broker identities 1-4 with quota gating). **UI mutation changes truth: it creates journal events, files, and runs real agents (external effects: quota spend, subprocess execution).** Currently fail-closed 503 (no caller registry provisioned).

### TAB: MARKETING (`/api/mc/marketingos`, `/api/mc/marketingos/missions`, `marketingos-panel.tsx`)
Projection `projectMarketingOS(objective, mission_id, canonical_state, as_of)` over the read-only canonical journal path. No mission_id -> honest empty state with zero journal access. **Read-only; no mutation path found.**

### The second mutation path: TAB-agnostic `POST /api/mc/approvals`
(Analyzed in Q7 handoff 8.) Unauthenticated POST records a terminal APPROVED/DENIED decision in `/home/nolan/projects/ping/var/mc-approvals.json` (a side store, not canonical) and emits `MC_APPROVAL_APPROVED`/`MC_APPROVAL_DENIED` into the FYD journal JSONL. Approver is a self-asserted body string defaulting to `'nolan:demo-owner'`. A real approval (`p0prop-ac04480a6d1809fd`, APPROVED, `nolan:owner`, 2026-09-28) drove a real FYD presentation patch. The digest "tamper detection" is readable via the unauthenticated GET, so it is change-detection, not authorization.

## The "canonical state" question, precisely
Mission Control reads from MANY backends, only one of which is the canonical PING journal (`brain-postgres`/`ping_runtime.ping_events`, read-only via `/api/mc/search` and `/api/mc/marketingos`). The rest are operational surfaces: the FYD journal gateway (:18199/:18200, a separate JSONL deployment), the FYD tenant graph, fleet ledger JSONL, cron.d, `ps`, `GRILLING-BRIEF.md`, `git status`, docker. The MC_* dispatch/approval events are written to the FYD journal JSONL, which is NOT the canonical postgres journal — Mission Control does not write to `ping_events` at all (verified: no INSERT path in any MC route; the one canonical-journal module is read-only with a driver-level read-only transaction).

## COUNTEREVIDENCE (to "Mission Control is a pure skeptical projection")
1. `POST /api/mc/approvals` is a live, unauthenticated mutation that records owner-attributed decisions with real downstream effect. The claim "Mission Control never mutates mission state" (phase-24 forensics, about MissionCards) does not describe the current :3100 surface.
2. `POST /api/mc/dispatch` is a live, armed control surface that creates missions, runs agents, and writes journal events + artifacts. Its current refusal is due to missing key provisioning, not a read-only design.
3. The approvals side store (`mc-approvals.json`) is an alternate operating record the UI writes to — not derived from canonical state.
4. `:3100` listens on `*:3100` (all interfaces), not loopback; the mc-tenant-gate's "loopback" trust model does not match the listener. `middleware.ts` has no authentication.

## VERDICT: PARTIAL
Every displayed field was traced to a real backend source, and the read paths are genuinely skeptical (badges, UNKNOWN-first, timeouts never rendered as FAILED, cross-host evidence not smuggled, read-only canonical-journal access with a driver-level read-only guard). But "Mission Control never mutates truth / is never an alternate operating database" is FALSIFIED: two live mutation paths exist, one unauthenticated with a self-asserted approver identity, and the approvals side store is a writable record the UI owns. Mission Control is a skeptical projection AND an authorized control surface; the control surface is where the risk lives.

## FALSIFYING OBSERVATION
Show me that `POST /api/mc/approvals` and `POST /api/mc/dispatch` are unreachable from the served :3100 build (removed routes, or auth middleware requiring a Nolan-held secret), and that `mc-approvals.json` is no longer written by any UI path. Then the pure-projection verdict would hold. Today's live probes show the opposite.

## SMALLEST CONSEQUENCE
Correct the standing description where it says Mission Control is read-only: it is a projection with two armed mutation paths (approvals: unauthenticated, self-asserted approver; dispatch: key-gated, currently unprovisioned/fail-closed). No redesign proposed; the facts are recorded for the owner to disposition.

---

# Compact verdict table (per question)

| Question | Verdict | One-line evidence anchor | Falsifying observation |
|---|---|---|---|
| Q7: Can any executor manufacture its own authority? | PARTIAL | Adapter grant path is airtight (fail-closed authorize/verify in `external_agent_adapter.js`); but `POST /api/mc/approvals` is unauthenticated with self-asserted `approver` and a real APPROVED decision on record (2026-09-28). | A live approvals POST refused without a Nolan-held secret, or adapter-level tenant entitlement checks. |
| Q8: What exactly is ORCA? | PROVEN | ORCA = delegation controller (OBSERVE->PLAN->AUTHORIZE->ACT->VERIFY->ASSESS loop over existing authorities); never emits canonical events; no live ORCA process on the Pig; disappearance costs automation, not truth. | A canonical `ping_events` row written by ORCA, or a grant verdict produced by ORCA code rather than the adapter. |
| Q9: What exactly is Mission Control? | PARTIAL | Every displayed field traces to a real backend (mapped per tab; canonical journal read-only via driver-level read-only guard); but two live mutation paths exist (approvals POST unauthenticated; dispatch POST key-gated, currently 503-unprovisioned) and `mc-approvals.json` is a UI-writable side store. | Both mutation routes removed or auth-gated, and the approvals store no longer UI-writable. |

# Notes for the coordinator
- The forensic starting point (ClaimWorker, KnowledgePromoter, mission machinery) was not needed: the reached runtime authority for the executor questions is the ExternalAgentAdapter + the MC routes, both read directly.
- `~/workspace/orca/` effect-classes and unknown-outcome experiment docs exist but are docs/experiments, not live authority; not relied upon.
- No new authorities, stores, writers, or registries were proposed or created. This file is read-only findings.
