# Phase 0 inventory — Reader 3/3: cross-cutting concerns (delivered 2026-09-26 ~19:10 MDT)

Environment note from the reader: /home/nolan/ping and /home/nolan/projects/ping do not exist in the sandbox; it mapped PING canonical to ~/workspace (git remote github.com/piging2/PING, crx-runtime monorepo) and FYD repo to ~/workspace/fyd-build (git repo, src/fyd). Canonical live runtime code (ping-runtime/, /app/gateway/) runs on the Pig; local evidence comes from dated snapshots/copies.

## 1. Approval / proposal paths

**a) FYD owner digest-pinned proposals — LIVE (demo), most complete proposal path in either repo**
- ~/workspace/fyd-build/src/fyd/owner/apply.ts: REQUEST → interpretRequest → proposeSitePatch → BEFORE/AFTER preview → approval → applySitePatch → persist + regenerate
- ~/workspace/fyd-build/src/fyd/proceduralize/patch.ts: proposeSitePatch() builds canonicalized body with proposalDigest (sha256, volatile keys excluded); only an approved digest is applied
- ~/workspace/fyd-build/src/fyd/owner/store.ts: decisions persist to data/owner-intent-<slug>.json OUTSIDE the graph (observed world never mutated; regeneration replays decisions deterministically)
- ~/workspace/fyd-build/src/fyd/owner/demo-owner.ts: capability gating via can(): closed list site.propose | site.approve | field.visibility.change; every entry/proposal/approval/apply appended to owner-seam.log
- Authority: owner approves a digest. Demo auth only, explicitly not production ("PING identity is the eventual production boundary"). Verify-gate route (~/workspace/fyd-promote-work/src/app/api/fyd/claims/[resourceId]/verify/route.ts) uses same demo-owner-mode gate (typed 403 demo_owner_mode_required, fail-closed)
- Classification: KEEP (FYD product lane owns it). WIRE: Mission Control should project this approval, not rebuild it.

**b) PING capability authorization — LIVE on Pig, fragmented locally**
- Canonical: /app/gateway/capability_authority.js (Pig-only; no local copy). Authority for "may agent A invoke capability C" (referenced in ~/workspace/orca-workstream-d/external_agent_adapter.js:20)
- authorizeWorkOrder() / issueWorkOrder() / verifyResultEnvelope() / recordVerifiedResult() in ~/workspace/orca-workstream-d/external_agent_adapter.js (405 lines): single decision "may PING issue work order W delegating capability C to external agent A under constraints K?" Fail-closed; unknown agent → DENIED. Copies at ~/workspace/orca-adapter/vendor/external_agent_adapter.js and ~/workspace/tenanos-wave/swarm-20/reference/external_agent_adapter.js
- orca control loop AUTHORIZE stage (~/workspace/orca-remediation/orca_control_loop.js, OBSERVE→PLAN→AUTHORIZE→DELEGATE→MONITOR→VERIFY) has broken imports (../../ping-runtime/... and ./policy/... don't exist in this checkout) — stale
- Classification: WIRE (dedupe to one adapter; canonical is the Pig copy). orca_control_loop.js: RETIRE or MERGE (stale wiring).

**c) Nolan-facing escalation (SI-03) — LIVE**
- ~/workspace/fyd-autonomy/escalation-log.jsonl + escalation-record-template.md — grill-20 classifier before any question reaches Nolan. KEEP.

**d) Release promotion — different concern, LIVE**
- ~/workspace/oracle-release-gates.md + laneC/release-certify.js — deployment certification (7 gates: sourceSha → securityNegatives). Release approval, not runtime approval. KEEP, don't conflate.

**e) Mission Control approval UI — PROJECTION ONLY, controls deliberately withheld**
- ~/workspace/mission-control/STATE.md (2026-09-24): six API routes live on :3100; "Controls withheld by law (no witnessed mutation yet): request reconciliation, hold, resume after reconciliation, cancel future work, RETRY NOW." Approvals are NOT STARTED as an MC surface.
- Verdict: PING has authorization (capability/work-order) and FYD has proposal/approval (digest-pinned owner apply). MISSING: unified "proposed state transition → review → approve/deny → execute → canonical event". → WIRE existing pieces; do not invent a new ApprovalAuthority.

## 2. Human-in-the-loop

**Exists, staged but not deployed: the HOLD invariant**
- ~/workspace/f01-fix/mission_runtime.js (2026-09-24): running → hold — outcome uncertain, execution MAY have produced an external effect. HOLD is terminal for automatic machinery (no auto-retry, no reaper reclaim, no dispatch, no lease renewal; lease expiry NEVER returns hold to created). Exit only via reconcileHold() with evidence to exactly: SUCCEEDED / FAILED (failure proven, never a timeout) / SAFE_TO_RETRY / continued HOLD. "TIMEOUT != FAILED, always."
- Evidence: ~/workspace/f01-fix/HOLD_REAPER_EVIDENCE.md — 21/21 tests green, no commit, no push, no gateway cutover → EXPERIMENTAL/staged
- Companion: ~/workspace/orca/unknown-outcome-experiments/ — 12-point SIGKILL chaos matrix (2026-09-24) against effect_reconciler.js on the Pig (feat/orca-unknown-outcome-port, Pig-only): EFFECT_DISPATCHED/SUCCEEDED/FAILED/UNKNOWN/RECONCILED/HELD events, ping_effect_ledger write-ahead idempotency gate, sweepUnknown on restart
- Journal event types MC_HOLD_RAISED / MC_HOLD_CLEARED in ~/workspace/mission-control/emit.py — LIVE vocabulary
- FYD product HITL: owner preview→Apply/Cancel — LIVE in demo
- MISSING: any general "pause mid-run awaiting a human decision, then resume" outside HOLD and owner-apply. Classification: WIRE (f01-fix needs gateway cutover — Nolan's call per promotion boundary; MERGE f01-fix with Pig-only A6 reconciler).

## 3. Durable resume / checkpoints

- Mission table (Postgres): convergence-zoom-2026-09-19/lane-d-execution/pig-src/ping-runtime/orchestration/mission_runtime.js (Pig snapshot 2026-09-19; canonical live on Pig) — LIVE, survives restart; reclaimRetryPending() reaps retry_pending; lease reaper catches orphaned assigned
- Objective durable store (atomic files): ~/workspace/orca-remediation/objective-runtime.js → PING_DATA_ROOT/objectives/ — STAGED, deterministic ids, atomic temp+rename, startup reconciliation
- Journal (append-only): ~/workspace/fyd-journal-gateway/ (events.jsonl, server.mjs) — LIVE on Pig (18199 overlay events per MC STATE.md); local copy 14-line sample
- MC_CHECKPOINT events: ~/workspace/mission-control/emit.py (MC_EVENT_TYPES) — LIVE vocabulary
- Intent ledger (append-only): ~/workspace/outreach/action-intent-ledger.jsonl via outreach/action-intent-ledger.py — LIVE
- FYD refresh snapshots: ~/workspace/fyd-build/src/fyd/refresh/snapshot-store.ts (plain JSON, diffable) — LIVE (FYD lane)
- Owner intent store: ~/workspace/fyd-build data/owner-intent-<slug>.json — LIVE (FYD lane)
- Verdict: PING HAS durable resume primitives (mission table + journal + objective store). MISSING: end-to-end "resume after worker interruption" proven for a real FYD mission. → WIRE, then prove with dogfood.

## 4. Timeouts, cancellation, retries

- Claim lease: mission assign() sets lease_until = NOW()+60s in same conditional UPDATE as claim (steal-proof); scheduler renews on each poll; reaper resets only expired unrenewed leases. LIVE (Pig).
- Retries: failWithRetry() — max 3 attempts, 5s backoff, retry_pending rows re-enter only through conditional claim. reclaimRetryPending() backoff-gated. LIVE (Pig). f01-fix adds retry_eligibility as structural dispatch gate. STAGED.
- Timeouts: orca control loop bounds (180s dispatcher, 10-min work-order deadline, max 2 orders/run, 2 attempts) — stale file; AGENT_PROFILES.md sets absolute ISO deadline per work order, late results invalid and non-retryable. Per-stage timeouts as general scheduler mechanism: MISSING → ADAPT (deadline field on mission/stage rows, enforced by scheduler).
- Cancellation: objective-runtime.js has durable cancellation (recordCancellation() + cancel.requested file signal). Mission table has NO cancel path and NO CANCELLED status (created→assigned→running→completed/failed→archived). → ADAPT (add cancelled terminal state + cancel API; never auto-retry cancelled work).
- Idempotency keys: PRESENT in 4 places — mission_id = sha256(missionType:event_id) with ON CONFLICT DO NOTHING (LIVE); ping_effect_ledger INSERT ON CONFLICT DO NOTHING (Pig-only A6); emit.py content-derived mc-bf- event ids refusing duplicates (LIVE); per-operation idempotencyKey projected by MC but null pending reconciler contract (STATE.md). → WIRE the last one.

## 5. Typed outcomes

- Mission statuses (Pig-live): created | assigned | running | completed | failed | archived (+ retry_pending via F-01; + hold via staged f01-fix)
- f01 outcome enum (staged): UNKNOWN | SUCCEEDED | FAILED | SAFE_TO_RETRY with retry_eligibility, reconciliation_required, effect_count
- Outreach intent ledger (LIVE): EXECUTED | FAILED | UNKNOWN_EXECUTION | NOT_ATTEMPTED terminals; fail-closed
- A6 effect events (Pig-only): EFFECT_DISPATCHED | EFFECT_SUCCEEDED | EFFECT_FAILED | EFFECT_UNKNOWN | EFFECT_RECONCILED | EFFECT_HELD
- Gaps vs brief vocabulary: TIMED_OUT exists as concept ("TIMEOUT != FAILED, always"); CANCELLED and BLOCKED have no mission-table representation; WAITING_APPROVAL is UI label only. → WIRE existing enums; ADAPT CANCELLED (and optionally BLOCKED). Do NOT invent a fifth vocabulary — MERGE f01 + A6 into one.

## 6. Agent profiles / bounded context

- ~/workspace/orca-workstream-d/AGENT_PROFILES.md + external_agent_adapter.js — profiles for cloud-subagent, hermes, ollama, copilot (identities 1-4), codex, opencode: transport, invocation, allowedCapabilities, maxConstraints, input/output/evidence contracts, timeout (deadline), retry semantics, workspace requirements, status LIVE/PENDING_AUTH. Validated by validate_dispatcher_profiles.js. Mirrors CapabilityAuthority's profile shape. 7 LIVE profiles.
- Budget: copilot quota gating EXTERNAL to envelope (dispatcher checks remaining ≥ cost + reserve; pickQuotaNumbers/isQuotaStale fixed 2026-09-26). No generic per-agent token/time budget field in profile schema.
- Deterministic context compiler: ~/workspace/tandem/build-context-pack.py — versioned (content-hash), cached packs from authoritative sources. But research-brief-scoped (Meta AI delegation), not the general Mission+Stage+objects+relationships+evidence+capabilities+visibility compiler. WorkOrder input embedded inline; context_pack_id rides the result envelope.
- → WIRE the profile registry (dedupe copies). ADAPT the smallest general context compiler from build-context-pack.py + WorkOrder input contract. ADAPT secret references.

## 7. Scoped secrets

No secret-reference mechanism exists. Current mechanism is exclusion, not scoping: external_agent_adapter.js "No secrets handled"; AGENT_PROFILES.md "broker resolves credentials at the process boundary, never inside a WorkOrder"; copilot broker resolves broker-side, only identityUsed in evidence. → Genuinely MISSING. ADAPT smallest: named secret references in profile/WorkOrder resolved at execution boundary (generalize the broker pattern), never values in context.

## 8. Sandboxes

- Present (transport-level): Codex exec --sandbox read-only --ephemeral; Hermes --safe-mode; copilot broker process boundary. KEEP.
- Absent: containers/jails; programmatic per-run worktree isolation MISSING — worktrees used manually but nothing mints mission_id/run_id/agent_id/worktree/base SHA/result SHA/diff/tests automatically. → ADAPT smallest worktree-per-run mechanism with lineage in mission/objective store.

## 9. Subagents / handoffs

- Spawning owned by Muse runtime, not PING code. PING side: authorizeWorkOrder → dispatcher spawns → 8-field result envelope → verifyResultEnvelope → recordVerifiedResult → WORKER_COMPLETED/WORKER_FAILED canonical events. No PING-native spawn API; "dispatcher" in AGENT_PROFILES.md is the agent runtime.
- Observability: ~/workspace/agents/<uuid>/tool-output/ (1452 sessions); journal MC_AGENT_AUTHORIZED; Mission Control /api/mc/agents projects Mission/Run/Operation/Attempt/Effect/Idempotency Key/Current State/Last Evidence/Reconciliation State/Retry Eligibility/Criticality/Authority Requirement per operation.
- No PING-native subagent-to-subagent handoff protocol beyond runtime parent/child delivery. → KEEP (runtime owns spawn/handoff; PING owns authorization + evidence).

## 10. Wake leases / execution leases

- Per-run scoped wake inhibition: ~/workspace/pig-fb/wake-wrap.ps1 (2026-09-25) — LIVE, SetThreadExecutionState(ES_CONTINUOUS|ES_SYSTEM_REQUIRED), kernel auto-releases on crash, wake-<run_id>.json state files, scp'd per dispatch, never touches OS policy.
- FYD lane wake lock: ~/workspace/fyd-lane/wake-lock-run.ps1 + wake-lock-policy.md (2026-09-21) — LIVE on Pig, older PowerCreateRequest mechanism, superseded in practice by wake-wrap.ps1.
- Sprint-scoped holder: ~/workspace/pig/sprint-wakelock-acquire.sh / -release.sh — LIVE (24h sprint, 20% battery guard).
- DB execution lease: lease_until/claimed_at on ping_missions — LIVE (Pig).
- Verdict: PING HAS scoped wake leases (per-run) and execution leases (DB claim). MISSING: unified wiring — "mission starts → acquire execution lease; mission finishes/cancels → release." → WIRE (hook wake acquire/release into mission claim/complete/fail; canonicalize on wake-wrap.ps1, RETIRE fyd-lane script as default).

## Duplicates

1. mission_runtime.js × 4 — Pig snapshot (convergence-zoom-2026-09-19, 2026-09-19), ce002/src/, f01-fix/ (adds HOLD + retry_eligibility, uncommitted), pig-transfer-tmp/ (pre-fix). Canonical = Pig /home/nolan/ping. MERGE f01-fix forward; retire rest.
2. external_agent_adapter.js × 3 — orca-workstream-d/ (ORCA port), orca-adapter/vendor/, tenanos-wave/swarm-20/reference/. Plus stale consumer orca_control_loop.js with broken imports. MERGE to one (Pig's proven copy wins).
3. Unknown-outcome machinery × 3 vocabularies — f01-fix (hold/reconcileHold, local), A6 effect_reconciler.js (EFFECT_* events, Pig-only), outreach intent ledger (UNKNOWN_EXECUTION, different domain). First two = same concern, two implementations → MERGE into one outcome model before wiring.
4. Wake scripts × 3 — wake-wrap.ps1 (current), fyd-lane/wake-lock-run.ps1 (older), pig/sprint-wakelock-* (complementary). RETIRE fyd-lane as default.
5. Context packs — tandem/build-context-pack.py (research) vs brief's general compiler: narrow instance to generalize, not a duplicate.

## Does NOT exist (explicit)

1. No unified proposed-transition → review → approve/deny → execute path (pieces exist, unwired)
2. No CANCELLED mission status, no mission cancel API
3. No per-stage timeouts in scheduler
4. No secret-reference scoping (exclusion-only)
5. No programmatic per-run worktree isolation
6. No general deterministic context compiler
7. No BLOCKED/WAITING_APPROVAL as persisted mission states
8. effect_reconciler.js and A6 chaos subject: Pig-only, not in local repos
9. No local copy of capability_authority.js (Pig /app/gateway/ only)
