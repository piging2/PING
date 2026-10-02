# ORCA / Mission Control — 24-hour convergence, harvesting & autonomy sprint

Started: 2026-09-27 ~19:18 MDT (Nolan's binding directive, same day).
Objective: FINISH THE REACHED ORCA / MISSION CONTROL OPERATING LOOP, with FYD as the first real client.

## Non-negotiable laws

- FYD FIRST. PING PRIMITIVES SECOND. ECOSYSTEM OPTIONALITY THIRD. SURFACE POLISH AFTER THE SYSTEM WORKS.
- HPP ORIGINAL IS READ-ONLY. No edit, commit, PR, deploy, DB mutation, media write, config change, Vercel action. Harvest patterns only.
- NO NEW AUTHORITY. NO SECOND TRUTH STORE. NO SECOND EVENT BUS. NO NEW ORCHESTRATION FRAMEWORK unless a reproduced defect proves existing machinery cannot express the required invariant. NO AIRUNTIME PROJECT. NO CUSTOMER-SPECIFIC FYD ORCHESTRATION. NO DIRECT PROJECTION MUTATION AS AUTHORITY. NO DIRECT DATABASE INSERT AS EVENT SHORTCUT. NO AGENT OUTPUT BECOMES TRUTH BY ASSERTION. NO TOOL POSSESSION IMPLIES AUTHORIZATION. NO UNKNOWN EFFECT BLINDLY RETRIES. NO IMPLEMENTER SELF-CERTIFICATION. NO WRITE BEFORE REOBSERVATION. NO DELETION OF UNKNOWN WORK. NO NEW FILE MERELY BECAUSE EXISTING STRUCTURE IS INCONVENIENT. THE BEST CURRENT EVIDENCE WINS.
- Governing distinction: mission state ≠ object state; execution ≠ authorization; agent output ≠ canonical truth; projection ≠ canonical truth; Mission Control ≠ canonical truth. Mission Control is the identity-owned operating plane, NOT canonical truth.
- Standing orders still in force: TenantOS stays a tenant-scoped composition of PING primitives (never a second platform/authority). No parallel agents editing the same ownership surface. Lane reports are hypotheses until independently replayed. Source tree ≠ built artifact ≠ served artifact.

## Phase 1 (T+0 to T+2): TOTAL REOBSERVATION — read-only

Map every current worktree: repo, worktree path, branch, HEAD, dirty state, staged state, untracked state, semantic owner, active writer, mission, starting SHA, latest tested SHA, integration target, divergence, known useful unmerged work, UNKNOWN.

Then trace the actual current implementations: MissionRuntime, MissionScheduler, WorkerRuntime, ExecutionAuthority, ExecutionAdapter, ContainerExecutionAdapter, UnifiedEventRuntime, event governance, capability registry, grants/delegation, artifact store, evidence, Mission Control routes, /missions, /mc, tenant scope, identity scope, run history, retry, UNKNOWN reconciliation, worktrees, outbox/advisory-lock work, repository tooling, knowledge/context surfaces.

Deliverable at T+2: ONE CURRENT REALITY MAP. No speculative boxes. Unknown components explicitly marked UNKNOWN.

## Phase 2 (T+2 to T+4): CONVERGENCE DECISIONS

For every duplicate semantic unit choose KEEP / WIRE / MERGE / HARVEST / DELETE-LATER / DEAD / BROKEN / UNKNOWN. Do not delete yet. Identify all importers/callers/runtime consumers first. Pin the selected implementation. Create a falsification plan against the winner and its strongest alternative. Objective: prove why one implementation should become the reached path and prove callers can converge on it without semantic regression.

## Harvesting (permanent first-class lane, all 24h)

Every harvesting mission begins with a concrete question: what existing implementation best satisfies invariant X? Search order: current reached PING → current ORCA → current FYD → other active worktrees → dormant branches → Git history → CascadeProjects/related local repos → pinned external donors → new implementation ONLY if necessary. Record source, repo, path, branch, SHA/version, license, last known caller, reachability, invariant satisfied/failed, tests, dependency cost, authority created?, truth store created?, verdict (KEEP/WIRE/MERGE/HARVEST/DELETE-LATER/DEAD/BROKEN/DUPLICATE/UNKNOWN). Harvest behavior, not names: build behavioral matrices (durable identity, capability integration, structured output, timeouts, cancellation, idempotency, UNKNOWN semantics, artifact refs, evidence refs, event integration, tenant binding, restart, replay, caller reachability). Newest/main/most-tests/most-LOC do not win. Best current evidence wins. Harvesting succeeds when it prevents code.

## 16 rolling lanes (not synchronized teams)

1. Runtime archaeology 2. Dispatch/front-door convergence 3. Capability bypass attacker 4. UER/event spine 5. Executor registry 6. Outcome/idempotency 7. Artifact/evidence lineage 8. Approval/tamper 9. Replay/reconstruction 10. Tenant/privacy attacker 11. Hermes reached-path 12. Jev shadow/calibration 13. FYD pipeline 14. Happy Place visual/product falsifier 15. Coppersmith generalization 16. GitHub/internal/HPP read-only harvester

Every task contract carries: QUESTION, WHY IT MATTERS, STARTING SHA, WORKTREE, READ/WRITE MODE, SEMANTIC OWNER, ALLOWED PATHS, KNOWN EVIDENCE, KNOWN PARALLEL WORK, AUTHORITY BOUNDARY, EXACT ACCEPTANCE PROOF, HOSTILE TEST, FORBIDDEN ACTIONS, RETURN FORMAT. The worker cannot broaden its own scope.

Every implementation gets an independent enemy: writer finishes, separate falsifier attacks. IMPLEMENTER NEVER CERTIFIES ITSELF.

## Escalation

Coordinator handles everything autonomously except: new consequential delegation, publication lacking authority, meaningful spend beyond policy, irreversible/destructive action, new credentials/access, unresolved privacy/security policy, real owner taste where evidence cannot choose. Escalation format: ONE DECISION, ONE PROPOSAL DIGEST, ONE CONSEQUENCE, ONE DEFAULT-SAFE ACTION, APPROVE / DENY / MODIFY.

## Standing open item — RESOLVED 2026-09-27 ~20:02 MDT

Nolan issued the CONTINUOUS AUTONOMY DIRECTIVE (binding). The P0 FYD mission
(proposal p0prop-ac04480a6d1809fd, digest 5c1d873706c14c7c3c7b5ded02bb73924419e4cdf3e17f6dc6bc98795731e7aa)
is APPROVED with exact-transition binding. The 24-hour sprint is now a checkpoint
interval, not a termination condition. Full locked decisions:
~/workspace/orca-mc-sprint/GRILL-LOCKED-2026-09-27.md. Locked execution order:
GO FYD MISSION (exact digest) -> Q-P0-04 WRONG_JOURNAL -> Q-P0-05 SECRET LEAKAGE ->
Q-P0-06 TENANT ISOLATION -> Q-J-01..03 real browser proof -> FYD OWNER JOURNEY ->
RESTART -> REPLAY -> CONCURRENT IDEMPOTENCY -> UNKNOWN RENDEZVOUS KILL ->
RECONCILIATION -> MC TRUTHFUL PROJECTION -> HAPPY PLACE -> COPPERSMITH ->
WORKTREE CONVERGENCE -> PROVEN DUPLICATION RETIREMENT -> NEXT, forever.

## Operational rules for lanes (from ~/workspace/AGENTS.md)

- :3100 restarts ONLY via /home/nolan/start-3100.sh (non-PTY ssh, stdio on files); it exports NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1. After every restart verify the flag is live in the process env and probe the approve path. Never hand-restart.
- WSL cannot reach Windows-bound CDP ports via 127.0.0.1; Windows reaches WSL :3100 via the WSL VM IP from `hostname -I`.
- C:/Windows/Temp is volatile: Pig-side wrappers can vanish; treat missing-wrapper as infra incident, reconstruct from ~/workspace/pig-fb/ patterns.
- WSL node spawn of Windows exes does not forward custom env; pass params via argv.
- Multi-stream lanes: per-stream worktrees OR strictly serialized commits; never bare `git commit` (git status first, explicit pathspecs, only your stream's files).
- PowerShell -File needs -ExecutionPolicy Bypass. Avoid nested double quotes through the ssh/CMD quoting chain.
