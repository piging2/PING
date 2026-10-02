# CURRENT REALITY MAP: ORCA/Mission Control convergence sprint

Phase 1 (T+0 to T+2) read-only deliverable. Produced 2026-09-27 ~20:05 MDT by the integration coordinator from six bounded read-only worker traces plus independent re-verification of load-bearing claims. Worker reports are hypotheses; claims below marked [V] were re-verified by the coordinator from clean reads, [W] are worker-reported (file/line cited), [A] are audit-document sourced (second-hand).

No speculative boxes. UNKNOWN is explicit everywhere it applies.

## 0. Repository reality (the single most important finding)

[V] **~/workspace is itself the PING monorepo.** Branch `p0/approval`, HEAD `b96e7d2` ("P0 W4: harvest ApprovalRequest primitive + proposal validator + approval CLI"), remote `origin = https://github.com/piging2/PING`. Every "key directory" (fyd-product-lane, fyd-autonomy, mission-control, orca, orca-adapter, tenant-os, authorities, ping-core-lane, scheduler, orchestration, jev, fyd-dogfood) is a plain monorepo subdirectory, not a separate repo.

[V] Main worktree dirty state: **0 staged / 11 unstaged / 1664 untracked**. Phase 2 must treat main as heavily dirty; no converge-from-dirty without reobservation.

[W] 43 registered worktrees; **22 are stale** (9 under /home/nolan/worktrees/, 13 under /tmp/ (directories gone; `git worktree prune --dry-run` confirms removable; not pruned, read-only task). Live external worktrees include /home/hatch/falsify-consequence-55b5d89, /home/hatch/repair-consequence, /home/hatch/worktrees/{audit-beyond-backlog-2026-09-19, gap1-F2-absorb-floats, mc-budget-repair, mc-pass-migration-proof, refalsify-budget}, .worktrees/* and track-a/* families. 8 detached-HEAD worktrees, all clean.

### Standalone repos (not monorepo), local

| Path | Branch | HEAD | Remote | Note |
|---|---|---|---|---|
| fyd-build (+2 worktrees) | fyd-025-semantic-determinism | 841825c | none | FYD build lane; local-only |
| ping-ui-contract | main | 22b9a97 | none | UI contracts; contains second mission-control app |
| demo-sites | master | fd3ff9e | none | Demo templates + 12 redacted demo sites |
| fyd-factory/hpp-clone | master | 4d3e3c5 | none | HPP parallel clone (design-sprint reference; read-only by policy) |
| trackc-tenant-backup/tenant-prep/demo-sites | master | fd3ff9e | none | Duplicate copy of demo-sites |
| tenanos-wave/swarm-17/.applycheck2 | (HEAD unreadable) | unknown | none | UNKNOWN scratch |

### Pig-side repos (live SSH read 2026-09-27 ~19:25 MDT, transport OK)

| Path (/home/nolan/) | Branch | HEAD | Origin | Note |
|---|---|---|---|---|
| workspace | mc/sprint-integration-2026-09-27 | d571362 | github.com/piging2/PING | PING monorepo, MC sprint tip; heavily dirty (920/17/91067, bulk artifacts); contains 6d80db4, b7bfbcd |
| ping | lane-b/tenant-dispatch-threading | 1822d5fae | ngesk2/crx-runtime.git | TenantOS Lane B; HEAD is the cited commit |
| projects/ping | fyd/sprint-integration-2026-09-24 | a8ed5103 | git@github.com:piging2/fyd.git | FYD repo; contains 42f81d53 (MC dispatch UI/API slice); live MC journal + missions code live here |
| fyd-projection-harness | master | 7ec906d | none | FYD projection harness v3 |
| projects/happy-place-platform | devin/hpp-ping-boundary | 6dd11bed | trishnikitha-art/happy-place-platform.git | HPP parallel clone (read-only) |
| projects/constitutional-runtime, projects/CRX_REMOTE, crx-swarm/crx-runtime-main | various | various | ngesk2/crx-runtime.git | CRX archaeology material |

[W] Cited-commit verification (all four previously-unverified claims now confirmed present): 6d80db4 (orca adapter) in /home/nolan/workspace; 1822d5fae = HEAD of /home/nolan/ping; 42f81d53 (MC dispatch) in /home/nolan/projects/ping; b7bfbcd (harness 9/9) in /home/nolan/workspace.

[V] Live services on Pig: :3100 LISTEN (next-server, pid 42194), :3200 LISTEN (pid 26533); /home/nolan/start-3100.sh exists; hermes-bridge exists at C:\Users\nolan\hermes-bridge\ (existence only).

[W] Name collisions local-vs-Pig (demo-sites, fyd-build, ping-ui-contract) are at identical SHAs, no divergence observed.

Third-party reference clones (read-only, not sprint-owned): ~14 agent-framework + ~9 durable-exec + assorted harvest clones locally; ~60 research/harvest clones on Pig. Not individually status-scanned.

## 1. Runtime / executor implementations

| Concept | Finding | Verdict |
|---|---|---|
| MissionRuntime | 3 byte-identical copies (orca-finish/program/orca-{a,c}/src, orca-b/probes/vendor); real logic (pg ping_missions, claim/lease/complete) but 0 live importers, vendored original absent | DEAD (all 3) |
| MissionScheduler | 5 byte-identical copies; real logic (5s poll, WorkerRuntime injection, retry/dead-letter) but 0 production importers | DEAD (all 5) |
| WorkerRuntime | No definition anywhere in allowed paths; name-mentions only | UNKNOWN (vocabulary only) |
| ExecutionAuthority | No local implementation; documented Pig-side only | UNKNOWN locally |
| ExecutionAdapter | `orca-adapter/vendor/external_agent_adapter.js` (428 LOC, 8+ live importers, reconciled Hermes path, effectState) | REAL (winner); workstream-d 405-LOC copy STALE/DEAD |
| ContainerExecutionAdapter | Falsified; does not exist | STRUCK from vocabulary |
| Hermes executor | `orca-adapter/adapter.js` dispatchHermes (1106 LOC, live-proven 2026-09-26) + `bin/prompt-hermes.sh` transport | REAL |
| Dispatch front door | `mission-control/mission_intent.py` (1386 LOC, validate→authorize→dispatch→observe, bypass detection; young, no prod caller) vs `mission-control/lane-d/adapter-call.js` (thin shim, live TS caller in lane-p01) | REAL (both), convergence item |
| Executor registry | None found | UNKNOWN |

[V] mission_intent.py functions confirmed at lines: validate 327, authorize 468, dispatch 626, observe 998, submit 1044.

## 2. Event spine: THE CENTRAL DIVERGENCE

[V] **There are two live event stores, not one.**

- Store 1: `ping_events` (Postgres). [A] Single production writer is `ping-runtime/events/unified_event_runtime.js:246` (Pig repo /home/nolan/ping) with `ON CONFLICT (event_id) DO NOTHING` + a semantic-collision fail-closed check (audit: AUTH-CONV-06; prior nested-JSON bug fixed in 0c798f488). Direct Pig-side source verification was in flight at map time; treat the exact line numbers as audit-sourced until rebound.
- Store 2: `~/workspace/fyd-journal-gateway/events.jsonl` (JSONL, 34KB, 7 MC_MISSION rows, last write 2026-09-27 01:47 UTC). [V] Live writers that **bypass UER entirely**: `mission-control/emit.py` (direct file append, confirmed), `fyd-journal-gateway/server.mjs` POST /events (called by fyd-product-lane customize route = P0 approve path).
- [V] **The P0 mission replay's 15/15 "journal events" went through Store 2, not `ping_events`.** The sprint's "one canonical path" (MC → runtime → UER → governance → ping_events) is UNPROVEN for the mission lanes.
- [V] **UNKNOWN writer**: zero workspace files reference `MC_MISSION_INTENT` outside the journal itself. The writer of the MC_MISSION_* rows is not visible from this VM (prime suspect: Pig-side Lane D, /home/nolan/projects/ping).
- Other writers: FYD social envelopes → ping_events via PING gateway (LIVE, governed); orca-adapter recordVerifiedResult → ping_events via injected eventRuntime (LIVE consumer, fail-closed if not injected); ConstitutionalEventBus (legacy `events` table): zero live instantiations, LEGACY/DEAD; convergence-lane3 UER copy: TEST-ONLY; ~10 dormant direct writers (audit): DEAD.
- [V] Outbox: UNKNOWN (none found; emit.py writes directly). Advisory lock: UNKNOWN (ApprovalStore is single-writer JSON, no cross-process lock, documented last-writer-wins race).

## 3. Capability authorities

| Candidate | Verdict |
|---|---|
| /app/gateway/capability_authority.js (Pig gateway) | REAL (out of local lane) |
| orca-adapter `authorizeWorkOrder` (vendored gate: AGENT_PROFILES, identities 1-4 allow / 5-10 deny, grant-before-issue) | REAL, fail-closed |
| fyd-product-lane `grants.ts` viewer grants | REAL but separate domain (explicitly NOT executor authority) |
| fyd-product-lane owner-mode/capability.ts | STUB (demo only; header forbids production use) |
| MissionControlPermissionAuthority | Does not exist (correctly: forbidden by directive) |

## 4. Mission Control surfaces

Local (`mission-control/staging/mc`, REAL but limited): /today, /agents, /graph, /object, /trace-forward, /search. [W] Hostile trace of /today proves it reads live files (journal gateway, fleet ledger, cron.d, git status) and **cannot answer running/needs-me/failed/proposed for missions**; it is not a mission-state window.

[V] Duplicate mission-control: `./mission-control` (monorepo) vs `./ping-ui-contract/apps/mission-control` (separate repo); convergence item.

[W] The real mission-state window (/api/mc/missions, /dispatch, run projection from journal) is **Pig-only** (/home/nolan/projects/ping, :3100); not verifiable from this VM.

## 5. Tenant / identity binding: FIRST-BROKEN-BOUNDARY CANDIDATE

- [W] Server-side construction REAL: `fyd-product-lane/src/fyd/tenant/tenant-context.ts:93` requireTenantContext(); Python `mission-control/mission_intent.py:190-220` AuthenticatedContext + resolve_tenant() refuses disagreeing body tenant; but **no verified-session production constructor** (known issue file confirms).
- [V] Known issue recorded: ~/workspace/fyd-autonomy/tenant-ingress-identity-issue.md.
- Body-supplied tenant still trusted in 4 places: legacy flat ask route (body siteId), journal gateway POST /events write side, Lane D dispatch on Pig (body tenant vs allowlist), proposal siteId (body-claimed; owner-gating is the check).
- [W] Hostile tests already proved it live: **T3**: forged tenant-victim intent issued a real work order; **T2**: ApprovalRequest has no tenant field at all.
- TenantOS (`~/workspace/tenant-os`): [W] compose-only, spec explicitly forbids new authority classes. No own authorities.

## 6. PING primitive authorities

| Primitive | Authoritative implementation | Enforcement |
|---|---|---|
| identity | [A] `runtime/kernel/authorities/identity_authority.js`: generateSpineEventId() (Pig repo; audit: zero crypto.randomUUID on enforced path) | Audit-sourced; direct source rebind pending |
| events | [A] UER (above) | Audit-sourced; direct source rebind pending |
| objects | UNKNOWN: no ObjectAuthority/ObjectStore found | n/a |
| relationships | UNKNOWN | n/a |
| capabilities | (see §3; Pig gateway authority REAL) | n/a |
| evidence | UNKNOWN: no EvidenceAuthority; witness_chain.js is an unwired writer, not an authority | n/a |
| private context | UNKNOWN: context_retrieval_authority.js unwired, zero requirers | n/a |

[V] Identity-bypass grep (local allowed paths, excl. tests): exactly one hit (the audit's own assertion of zero production randomUUID). No bypass found locally.

## 7. FYD mission machinery (P0 chain code)

[V] Full chain REAL in code: mission_intent.py (submit 1044) → `fyd-product-lane/src/fyd/ask/site-patch.ts` (draftSitePatchProposal 229, sign 286, verify 309) → `src/app/api/ping/proposal/route.ts` → `ping-object-reader.ts:1297` submitProposal (server-side digest re-verify, owner-gating) → `mission-control/proposal_record.py` (mint_proposal_id → p0prop-<sha16>) → `mission-control/approval_request.py` (proposal_digest 119, authorize_approval_transition 310, exact-digest binding; 68/68 tests per worker) → `fyd-product-lane/src/fyd/customize/apply-layer.ts:115` applyPresentationIntent (governed OBJECT_UPDATED on owner approval).

[V] Digest: sha256-canonical-json-v1 pinned (site-patch.ts:271); verified TS-side and Python-side.

Live P0 record: proposal p0prop-ac04480a6d1809fd @ WAITING_APPROVAL; **APPROVED 2026-09-27 ~20:06 MDT by Nolan's continuous autonomy directive (exact-digest binding)**. Awaiting execution (first execution result after this map).

Ask FYD live path (independent, 2026-09-27 ~17:45 MDT): supported → answered with citations + source URL; private-adjacent → public-evidence only; out-of-domain → honest UNKNOWN ("I do not have evidence for that in the current context, so I will not guess").

## 8. Lifecycle arrows: reached vs UNKNOWN

Chain: IDENTITY → INTENT → MISSION → RUN → EXECUTION ATTEMPT → AUTHORITY/CAPABILITY → EXECUTOR → STRUCTURED RESULT → ARTIFACT+EVIDENCE → PROPOSED TRANSITION → CAPABILITY EVALUATION → EXACT APPROVAL → UER → GOVERNED ping_events → PROJECTOR → PROJECTION → RESULT → REPLAY → NEXT.

| Arrow | Status | Evidence |
|---|---|---|
| IDENTITY → INTENT | PARTIAL | requireTenantContext REAL (FYD); MC front-door AuthenticatedContext unwired; T3 forgery proven |
| INTENT → MISSION → RUN | REACHED (code) | mission_intent.py submit/validate/authorize/dispatch/observe REAL; P0 mission mc-m-c5b2c89b4ff7 reached WAITING_APPROVAL |
| RUN → EXECUTION ATTEMPT | PARTIAL | Attempt fields exist per P0 replay; durable attempt identity not proven as a store |
| AUTHORITY/CAPABILITY → EXECUTOR | REACHED (adapter path) | authorizeWorkOrder → dispatchHermes live-proven 2026-09-26 |
| EXECUTOR → STRUCTURED RESULT | REACHED | Envelope extraction + verified outcome; effectState recorded |
| RESULT → ARTIFACT+EVIDENCE | PARTIAL | MC_ARTIFACT_PUBLISHED rows exist; lineage chain not proven end-to-end |
| → PROPOSED TRANSITION | REACHED | draftSitePatchProposal + proposal_record REAL |
| → CAPABILITY EVALUATION | REACHED | authorizeWorkOrder / owner-gating REAL |
| → EXACT APPROVAL | REACHED (code) | authorize_approval_transition exact-digest binding; approval now granted for p0prop-ac04480a6d1809fd |
| APPROVAL → UER → ping_events | UNKNOWN | P0 events went to JSONL store, bypassing UER; no proof this arrow is reached |
| → PROJECTOR → PROJECTION | PARTIAL | FYD projection harness exists (Pig); Ask FYD reads served projection |
| → RESULT → REPLAY | REACHED (P0 scope) | 15/15 replay verified through WAITING_APPROVAL |
| REPLAY → NEXT | UNKNOWN | No autonomous next-work selection proven |

## 9. Duplicate clusters needing Phase 2 decisions

1. **Event stores**: `ping_events` (UER, canonical) vs `fyd-journal-gateway/events.jsonl` (live, bypassing). Sanction-as-feeder or decommission. P0.
2. **Dispatch front door**: mission_intent.py (rich, no prod caller) vs lane-d/adapter-call.js (thin, live TS caller). One must win.
3. **mission-control dirs**: monorepo `./mission-control` vs `ping-ui-contract/apps/mission-control`.
4. **Hermes dispatch**: adapter.js (proven) vs remediation hermes_dispatch.py (crash-safe rendezvous; harvest the feature).
5. **Identity authorities**: generateSpineEventId vs legacy generateEventId (payload IDs) vs 3 sibling authority files.
6. **Worktree sprawl**: 22 stale local registrations + ~130 Pig registrations, many prunable; 8 detached-HEAD worktrees.

## 10. First-broken-boundary candidates (priority order)

1. **Tenant/identity forgery (T3 proven live)**: forged tenant-victim intent issued a real work order; ApprovalRequest has no tenant field. P0.
2. **Second event store bypassing UER**: mission lanes write canonical-looking events to JSONL, never UER/ping_events. P0.
3. **No WorkerRuntime implementation** named in architecture but unwired/undefined. P0 unknown-effect ownership gap.
4. **HOLD treated as dispatchable by lease reaper** (locked directive item 3): the reaper must be patched at the authority-owning layer; reconciler owns movement out of HOLD. P0.
5. **ApprovalStore race** (single-writer JSON, no cross-process lock) + no tenant field. P0.
6. **MC cannot answer "what is running"**: operating plane without a canonical mission window. P1.
7. **No outbox, no advisory locking** in the mission/journal path. P1.
8. **Object/relationship/evidence/private-context primitives UNKNOWN**: TenantOS composes primitives it cannot bind. P1.

## 11. Standing caveats

- Worker reports cite file contents they read; only [V] items were independently re-read. Nothing was run beyond read-only probes and one replay (P0 events).
- Pig-side lines (UER identity_authority, UER ON CONFLICT, MC dispatch routes) rest on the sovereignty audit + live directory listing; the direct source rebind was in flight at map time.
- The 43-worktree count, 1664-untracked monorepo state, and Pig dirty state were observed 2026-09-27 ~19:20-19:30 MDT and are already stale; reobserve before acting.
- No em dashes used in this document per Nolan's rule.
- Workspace AGENTS.md corroboration (read 2026-09-27 ~20:05 MDT): reaper-vs-HOLD gap already documented 2026-09-24 (reapExpiredLeases resets HOLD missions to created and re-dispatches ~60s later); :3100 restarts only via /home/nolan/start-3100.sh with NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1 verified live.

END OF PHASE 1 REALITY MAP.
