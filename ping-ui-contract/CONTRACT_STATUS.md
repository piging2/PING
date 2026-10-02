# Contract status: maturity x stage, per surface

Maturity (backend proof): PROVEN / BUILT_NOT_LIVE / EXPERIMENTAL / DIRECTION / UNPROVEN / FALSIFIED / UNKNOWN.
Stage (implementation): HARVESTED / CONTRACT_DEFINED / IMPLEMENTED / WIRED / RUNTIME_VERIFIED / DEPLOYED.
The axes are never collapsed. A surface can be IMPLEMENTED while its backend claim is UNPROVEN.

| Surface | Maturity | Stage | Evidence |
|---|---|---|---|
| packages/schemas (17 schemas + envelope helpers) | PROVEN | IMPLEMENTED | 55 contract tests pass; validators fail closed on missing proof metadata |
| packages/api-client PublicPingClient | PROVEN (routes) | IMPLEMENTED | op table revised 2026-09-17 against the static route inventory: public GETs only (health, ops health/drift/dashboard/system, governance stats, constitution, /mc/, /mc/scheduler); auth-only routes removed to AuthenticatedPingClient; /events/stats and /events/recent removed as unevidenced. Incapability tests pass against stub transport; not WIRED to a live gateway from this host. SENSITIVE_PUBLIC exposure classification still pending (ADR boundary E) |
| packages/api-client AuthenticatedPingClient | PROVEN (routes) | IMPLEMENTED | auth GETs only (missions, events, event ancestry, correlation). Removed: /events/stats, /events/recent (never evidenced), listTenantMissions tenant param (implied unproven scoping). Token redaction tested; read-only per ACTIVE ADR 6.1 and Nolan 2026-09-17 |
| docs/gateway-route-inventory-2026-09-17.md | UNKNOWN (static archaeology; production posture per-route conflicts preserved) | HARVESTED | 56 routes compiled 2026-09-17 from captured evidence only; no live gateway read from this host; /mc/* enumeration conflicted (R-5); ORCA routes quarantined as synthetic |
| docs/route-projection-matrix.json | PROVEN (mechanical derivation) | CONTRACT_DEFINED | 56 rows: route -> authority -> backend maturity -> projection contract -> client -> UI surface -> stage. PARTIAL replaced with UNKNOWN (vocabulary rule). Zero rows WIRED |
| packages/api-client OperatorPingClient | BUILT_NOT_LIVE | IMPLEMENTED | gap-labeled intents; zero gateway calls issued for unwired mutations (tested) |
| apps/mission-control automation-health | PROVEN | RUNTIME_VERIFIED | executed 2026-09-17 against real workspace evidence: 5 action-truth rows, 1167 ledger rows, 28 reconciliation gaps, 20 cron defs, capability registry |
| apps/mission-control intent-ledger viewer | PROVEN | RUNTIME_VERIFIED | executed 2026-09-17: 440 intents, terminal dispositions from OBSERVATION terminal fields and reconciliation outcomes |
| apps/mission-control mission list/detail | PROVEN (backend) | IMPLEMENTED | builders tested against gateway-shaped fixtures; live gateway read unavailable from this host (Pig SSH unreachable; CLOUD AGENT -> PIG = UNREACHABLE proves nothing about gateway health). Gate 1 WSL probe plan recorded (docs/wsl-probe-plan-2026-09-17.md); until it runs, mission reads stay IMPLEMENTED, not WIRED |
| apps/mission-control mission window | PROVEN (backend) | IMPLEMENTED | Run layer gap-labeled; no run_id fabricated (tested) |
| apps/mission-control approval queue | PROVEN (backend) | IMPLEMENTED | PENDING_HUMAN renders with SNIPPET_APPROVED dispatch gap labeled (tested) |
| execution-attempt identity | DIRECTION | CONTRACT_DEFINED | APPROVED 2026-09-17 by Nolan (docs/decision-execution-identity-2026-09-17.md). Forensics: IdentityAuthority is dormant/bypassed on the live path (zero live capabilities). Proposed formula for Nolan's review (docs/execution-identity-proposal-2026-09-17.md): sha256(EXECUTION:mission_id:attempt_ordinal:worker_name)[0:16], minted by MissionRuntime at assign(). NOT implemented. run.json stays gap-labeled; UI never generates execution identity |
| intent ontology | DECIDED | CONTRACT_DEFINED | APPROVED 2026-09-17 (docs/decision-intent-ontology-2026-09-17.md): action-level intent_id and pass/run aggregate are distinct concepts (EXECUTION -> INTENT(S) -> ACTION(S) -> RESULT -> EVIDENCE); no union. run_id-as-execution-identity is a hypothesis pending code proof |
| packages/schemas operation-result | DIRECTION | IMPLEMENTED | canonical operation-result interpretation (transport/execution/persistence/verification); PROVEN_COMPLETE derived only from satisfied proofs; three backend success shapes preserved, never normalized. interpretOperationResult tested |
| proof ladder | APPROVED | IMPLEMENTED | DECLARED -> IMPLEMENTED -> REACHABLE -> WIRED -> EXECUTED -> PERSISTED -> VERIFIED -> REPLAYABLE (docs/proof-ladder.md); requiredProofRungs maps stages to rungs; the emit() {status:'ok'} false-success defect is a P0 violation of this ladder |
| SNIPPET_APPROVED routing | UNPROVEN (broken path) | HARVESTED | gate logic PROVEN via harness; ordinary dispatch path missing (SNIPPET_APPROVED absent from EVENT_MISSION_MAP and MISSION_WORKER_MAP). P0 fix proposal ready (docs/fix-proposal-snippet-approved-2026-09-17.md); application requires authorized host with backend worktree access |
| emit() persistence false-success | UNPROVEN (false success) | HARVESTED | emit() returns {status:'ok'} when the INSERT was skipped on a null pool (proven in code). P0 proof-ladder violation; fix proposal ready (docs/fix-proposal-emit-persistence-2026-09-17.md); application requires authorized host with backend worktree access |
| ADR_UI_BOUNDARY_AND_PROJECTION_CONTRACT | ACTIVE | DEPLOYED | Nolan approved 2026-09-17; activation section 0 records the four resolutions and boundaries A-J |

## Not implemented (explicit)

- run_id instrumentation (runtime-owned; UI must not generate it)
- tenant.ping.v1.json authoring (DIRECTION; not authored by UI)
- per-principal namespace entitlement (syntax validation only; no isolation claims)
- scheduler execution history (does not exist anywhere)
- SNIPPET_APPROVED ordinary-path dispatch (harness path only)
- direct REPLAY_VERIFY mission creation (mutation gap-labeled)
- route-by-route classification of /ops/dashboard SENSITIVE_PUBLIC fields for public exposure
- live /mc/* route-table verification from this host (enumeration conflicted R-5)
- live gateway read for any route from this host (Pig SSH unreachable; all reads remain fixture-backed)
- apps/web migration into the workspace (separate decision; public repo stays separate short term)
- no premature packages: auth, telemetry, config, icons (none created)

## Removed as unevidenced (2026-09-17, route inventory reconciliation)

- AuthenticatedPingClient.getEventStats (/events/stats: no route evidenced)
- AuthenticatedPingClient.getRecentEvents (/events/recent: no route evidenced)
- AuthenticatedPingClient.listTenantMissions tenant query param (implied per-tenant scoping the backend does not prove)
- PublicPingClient wrapping of /missions and /events families (auth-only per inventory)
