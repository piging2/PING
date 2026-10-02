# W2-REDTEAM Checkpoint — adversarial review of W2-IMPL-STATE and W2-IMPL-SAFETY

**Lane:** W2-REDTEAM (ORCA FINISH Wave 2). **Status:** ATTACK PLAN recorded 2026-09-23 19:37 MDT.
**Posture:** READ-ONLY w.r.t. both worktrees (`/home/nolan/ping-orca-state`, `/home/nolan/ping-orca-safety`). Never edit their code; file findings. No commits anywhere. No production systems.
**Worktrees readable:** verify read access on first poll.

## Binding inputs absorbed
- `~/workspace/orca-finish/wave1/mechanism-map/ORCA-MECHANISM-MAP.md` (all 22 records; records 1,2,3,6,7,8,10,11,16 relevant).
- `~/workspace/crx-autonomous-missions/redteam/verdicts.jsonl` (23 verdicts) + README section 4 hardening corrections.
- **5 load-bearing findings (NON-NEGOTIABLE):** GRAPHITI-BITEMPORAL-INVALIDATE, oa-approval-scope-fingerprint, MEMORYBANK-EBBINGHAUS, oa-tool-invocation-ledger, MEM0-EXPIRATION. Directly load-bearing for these lanes: **oa-approval-scope-fingerprint (rank 2: argument smuggling under cached grants, stale-grant revocation bypass)** and **oa-tool-invocation-ledger (rank 4: planned/dispatched/completed conflation, worker-fabricated completions permanently vouched)**.

## Modules under review

**W2-IMPL-STATE** (`/home/nolan/ping-orca-state`, branch `orca-finish/state`):
- S1. Migration `sql/migrations/<seq>_orca_execution_state.sql`: `orca_runs`, `orca_attempts`, `orca_work_packets`, `orca_dependencies`, `orca_checkpoints`, `orca_effects`.
- S2. `lib/orca/orca_run_transitions.js`: pure transition table, `apply(from, event) -> to`, throws ErrIllegalTransition.
- S3. `lib/orca/orca_ready_set.js`: pure ready-set query (rows in, ready packets out).
- S4. `lib/orca/orca_attempt_identity.js`: `makeAttemptId`, `parseAttemptKey`, `assertRoutable`.
- S5. Tests `test/orca/` (transitions, ready-set diamond fixture, idempotency constraint).
- S6. `STATE-LAYER.md` rationale doc.

**W2-IMPL-SAFETY** (`/home/nolan/ping-orca-safety`, branch `orca-finish/safety`):
- F1. `orca_worktree.js` (O-3 direct reuse: create/archive, per-run branch, archive-to-`_shipped`/`_killed`, ErrEmptyBase).
- F2. `orca_fanout_guardrails.js` (max depth, max concurrency, per-run budget; over-cap requeues).
- F3. `orca_outcomes.js` (outcome vocabulary; UNKNOWN requires evidence citation; blind retry of UNKNOWN throws).
- F4. `orca_approval.js` (approval binds principal + proposal digest sha256(canonical args) + operation + args + target + scope + expiration + preconditions; single-writer resume CAS; anti-smuggling, anti-self-approval, execution-time revocation checks).
- F5. `orca_capability_gate.js` (per-call check via existing CapabilityAuthority; default deny; ambiguous denial).

## Attack plan — concrete vectors per module

### Against S1 (migration/schema)
- **A1 Cross-run leakage:** Do `CHECK`/`UNIQUE` constraints allow `orca_checkpoints`/`orca_attempts` reads scoped to run A to be returned for run B? Attempt: insert attempt rows with `(run_id=R_A, mission_id=M_B)` mismatches; verify any cross-join exposure in their ready-set SQL variant.
- **A2 Second-authority:** Does any table duplicate a `ping_events` or MissionRuntime field (e.g. own `status` that can disagree with journal)? Flag every column that is a control truth rather than a projection. Red-team baseline: orka-single-control-authority SURVIVES; any independent commit path in their schema is FAIL.
- **A3 Tenant isolation:** Is `tenant_id NOT NULL` present on ALL six tables, and are uniqueness constraints scoped to tenant (e.g. effect idempotency key unique per `(tenant_id, idempotency_key)` not globally)? Attempt: same idempotency key in two tenants must not collide (or must be scoped) — whichever way, verify the contract is stated and enforced.
- **A4 Secret handling:** Does the schema force prompt/input into a column (secret-bearing) vs by-reference/digest? Any `TEXT` column named `prompt`, `input`, `args` without a redaction rule is a finding.
- **A5 Migration safety:** Run the migration against a scratch PG (if available locally; else `pg_tmp`? — document which). Test upgrade-then-downgrade; an irreversible migration without a documented rollback is P1. Also test: migration re-run idempotency (CREATE TABLE IF NOT EXISTS vs plain CREATE).
- **A6 Lease TOCTOU:** `lease_expires_at` without fencing-token monotonicity lets a stale holder's write win. Verify the claim CAS references `fencing_epoch` monotonically.

### Against S2 (transition table)
- **B1 Illegal transitions:** Fuzz `apply(from, event)` across all state×event pairs; any illegal pair that does NOT throw is a finding. Especially: `OUTCOME_UNKNOWN -> SUCCEEDED` (the UNKNOWN→SUCCESS conversion path), `SUCCEEDED -> STARTED` (resurrection), terminal states accepting further events.
- **B2 UNKNOWN honesty:** Is there ANY transition or helper that maps OUTCOME_UNKNOWN to a retry/success? `OUTCOME_UNKNOWN -> STARTED` must throw or be absent; retry must go through a reconciliation event with evidence, never a bare transition.
- **B3 Completeness:** Every terminal state must have no outbound edges; enumerate to prove.

### Against S3 (ready-set query)
- **C1 Dependency forgery:** Can a packet be ready when a dep is OUTCOME_UNKNOWN (not terminal-success)? The contract says "deps terminal-success AND packet not terminal AND no unresolved conflicting effect". Verify the OUTCOME_UNKNOWN dep blocks readiness.
- **C2 SQL vs pure divergence:** If they ship both a pure function and a PG SQL variant, run the diamond fixture through both; any divergence is a finding (two truths).
- **C3 Two-writer on one unit:** ready-set is read-only, but check they don't embed a claim/lease acquisition inside it (claim must be a separate CAS).

### Against S4 (attempt identity)
- **D1 Bearer semantics:** `assertRoutable` must reject IDs that look like capabilities; verify docs/tests assert IDs are never accepted as auth. Attempt: present an attempt ID as a lease holder token — must fail.
- **D2 Uniqueness:** journal unique constraint on attempt key present in migration (cross-check with S1).
- **D3 Predictability:** UUIDv7 is time-ordered; verify they don't claim unguessability they don't have (low severity unless they use IDs as interrupt/resume secrets).

### Against S1+S2+S4 combined
- **E1 Forged completion:** What stops a worker from writing SUCCEEDED for work it didn't do? Trace the write path: is there writer-identity binding on status transitions (DBOS-STEP-RECORDING hardening: step records written only by owner's identity)? If the transition layer is pure and the DB layer has no writer check, that's a NEEDS-HARDENING with exact fix (row-level writer check / controller-owned settlement).
- **E2 Forged checkpoint:** Can worker W2 write a checkpoint for run R owned by W1? Check checkpoint table for writer/lease-holder binding.

### Against F1 (worktree)
- **W1 Collision:** two runs, same repo — verify isolated trees; verify kill archives data before unregister (data-loss check: archive AFTER prune is a P0 data-loss finding).
- **W2 Empty-base guard:** ErrEmptyBase fires when base is empty — verify test exists.
- **W3 Symlink escape:** repo root symlink resolution — does `create` resolve symlinks before deriving paths? Attempt path traversal via crafted run ID (e.g. `run_id = "../../evil"`); branch name `orca/<runID>` with unsanitized runID is a command-injection/PATH finding (P0).
- **W4 Orphan reclamation:** does archive/prune leave stale git registry entries on crash mid-archive? (Partial — flag if unhandled.)

### Against F2 (fan-out guardrails)
- **G1 Cap bypass:** controller-enforced, not parent-enforced — verify the check cannot be skipped by a parent calling spawn directly. Over-cap must requeue, never drop and never silently spawn.
- **G2 Depth accounting:** depth incremented exactly once per delegation level; verify no double-count or reset that lets infinite recursion through.
- **G3 Budget TOCTOU:** per-run budget checked before spawn; concurrent spawns racing the budget check — is there an atomic decrement? If pure functions only, flag the missing atomicity as NEEDS-HARDENING (documented as controller responsibility).

### Against F3 (outcomes)
- **O1 UNKNOWN→SUCCESS:** grep the module for any path converting OUTCOME_UNKNOWN to SUCCEEDED/STARTED without reconciliation evidence. The kill-list rank-16 hardening: boundary must be externally observable ack, unknown records cite last-observed evidence, recovery never re-submits past-boundary prompts.
- **O2 Blind retry:** calling retry/requeue on an UNKNOWN effect must throw; verify test.
- **O3 Timeout classification:** timeout-after-possible-effect must yield OUTCOME_UNKNOWN, never FAILED. Verify their test asserts this.

### Against F4 (approval) — the sharpest edge (rank 2, NON-NEGOTIABLE)
- **P1 Argument smuggling (LIVE EXPLOIT):** write a PoC against their test suite: obtain approval for `send_email(to=alice@corp, body=X)` (or their equivalent tool), then invoke with `to=attacker@evil, body=exfiltrated` reusing the cached grant. The digest binding (sha256 of canonical args) must make this throw. If their "canonical args" serialization is not canonical (key order, whitespace, number formatting), craft a semantically-different-args/same-digest collision attempt or a semantically-same/serialization-different bypass.
- **P2 Stale grant after revocation:** grant issued under policy v3; bump policy to v4 (revoke); execute under the old grant. Must be denied (execution-time re-check, not grant-time). If their check only validates at grant time, P0.
- **P3 Self-approval:** agent approves its own proposal (principal == approver). Must be structurally refused. Attempt both direct and via role-confusion (approver field spoofed).
- **P4 Resume CAS:** two writers resume the same interrupt; second must be rejected by single-writer CAS. Attempt replay of a consumed resume token.
- **P5 Cached-grant argument smuggling variant:** approval for scope `send_email` cached (if they implement scope-tier grants at all) then different recipient. Per mechanism-map record 11: same scope fingerprint => same tool target, NEVER same authorization target. If they implement scope-level caching without argument binding for sensitive tools, FAIL.
- **P6 Interrupt ID predictability:** if interrupt/resume IDs are sequential or guessable, an attacker can forge resume commands. Must be unguessable (per rank-7 hardening).
- **P7 Policy-version binding:** grant carries policy version; execution validates against current version. Missing = P0.

### Against F5 (capability gate)
- **K1 Default deny:** call with no grant, unknown tool, expired lease, revoked grant, wrong role, wrong scope — all must deny. Ambiguous denial must not leak tool existence (denial message must not distinguish "no such tool" from "not authorized").
- **K2 Second authority:** it must CALL the existing CapabilityAuthority, not reimplement minting. If it mints its own grants, that's a second authority (FAIL per orka-single-control-authority).
- **K3 TOCTOU:** grant valid at check time, revoked before tool dispatch — is there a handler-start binding / re-verification? Flag per MCP-M26 hardening if absent.

### Cross-cutting
- **X1 Second-authority creation (constitutional):** any new table/code that competes with `ping_events`, MissionRuntime, or a constitutional authority (identity minting, canonicalization) instead of projecting/consuming it. The impl-state lane already records "identity/canonicalization minting authority belongs to convergence sprint" as DEPENDENCY — verify they don't mint identities themselves in the meantime (local UUIDv7 gen for tests is fine; production minting is not).
- **X2 Secret handling:** IDs must not be capabilities; no bearer tokens in rows; no raw prompts with secrets persisted.
- **X3 Lease expiry mid-work:** lease expires while worker is mid-side-effect; recovery must classify UNKNOWN, not hand the lease to a new worker that re-executes. Attempt the race in tests if they have lease tests.
- **X4 Determinism:** any randomness in decay/expiry/grant decisions must be seeded+logged or absent.

## Poll schedule
- Poll `~/workspace/orca-finish/wave2/impl-state/CHECKPOINT.md` and `~/workspace/orca-finish/wave2/impl-safety/CHECKPOINT.md` every ~15 min; review each landing promptly; append findings below incrementally with timestamps.
- Also spot-check worktree file listings (read-only `git log`/`ls`) to catch landed code the checkpoint hasn't mentioned yet.

## Finding format
`[HH:MM] FINDING <module> <SEVERITY> — <title>` / exploit or PoC / exact file:line / required fix / verdict impact.

## Verdict scale per module
- SURVIVES: every applicable attack defeated as specified; invariants named.
- NEEDS-HARDENING: core sound; exact fix stated; without it, traced harm occurs.
- FAILS: cannot achieve stated purpose; no reasonable fix within its shape.

## Integration GO / NO-GO (per lane, final)
- GO: all modules SURVIVES, or NEEDS-HARDENING findings have exact fixes the lane has committed to (verify fix landed before GO).
- NO-GO: any unresolved P0, or any FAILS module, or any load-bearing (rank 1-5) hardening missing.

---

## Findings log (append incrementally)

- 19:37 MDT: plan written. Both siblings at START/PLAN, no code landed yet. First code poll scheduled ~19:52 MDT.
- 19:39 MDT: worktree read check: `/home/nolan/ping-orca-state` and `/home/nolan/ping-orca-safety` do NOT exist on this machine (paths are Pig-side; lanes create them via pigwsl-run.sh in their step 2). Review surface until then = their notes dirs + CHECKPOINT.md files. If worktree code is needed, use read-only `pigwsl-run.sh 'git -C <wt> log/show'` (never edit).
- 19:40 MDT: background poller started (proc_fe4511d29e18): 4 polls × 15 min watching both siblings' CHECKPOINT.md checksums; landings appended to this file automatically.

## EXPANDED SURFACE (added 2026-09-23 ~19:55 MDT, parent directive)
Primary integration target: branch `feature/orca-autonomy` @ `ae55b77ff`
(worktree `/home/nolan/worktrees/orca-autonomy`, READ-ONLY, Pig-side).
Reviewed via read-only `pigwsl-run.sh git show/grep` + local staging copies
(`~/workspace/orca-remediation/`, `~/workspace/orca-workstream-d/`, 2026-09-18;
re-verified critical claims against branch tip with `git show ae55b77ff:`).
Modules: `ping-runtime/external-agent/external_agent_adapter.js` (tip),
`orca/control-loop/orca_control_loop.js` + `objective-runtime.js` +
`hermes_dispatch.py` (tip-verified for findings below), `orca/control-loop/policy/`.

### Findings — branch integration target
- [19:55] FINDING BR-A1 **P1** — Second WORKER_COMPLETED emission path (forged-completion class).
  `gateway/bootstrap/gateway_runtime.js:885` (`_seedBusinessEvents`, called
  unconditionally at PG-service init :631, no dev gate) emits WORKER_COMPLETED
  for `seed_mission` via `SystemEmitter.workerCompleted` → raw `this._er.emit`,
  bypassing `recordVerifiedResult` and all verification. No logical_id/dedup key
  → one fabricated completion per gateway boot lands in the canonical journal
  and is counted by `orca/measurements/measure.js`. Falsifies the "only path is
  recordVerifiedResult" invariant. Exact fix: dev-gate `_seedBusinessEvents`
  (default off), remove the workerCompleted seed line, or emit a distinct
  `WORKER_COMPLETED_SEED` type excluded from measurements; make seed idempotent.
- [19:58] FINDING BR-A2 **P1** — Cross-attempt result-envelope replay (EXPLOIT DEMONSTRATED).
  `verifyResultEnvelope` (tip :375+) has no attempt binding: result schema has
  no `attempt` field, verification never checks it; `work_order_id` is stable
  across attempts by design; `resultIdentity` hashes attempt into the dedup key
  so a replay does NOT dedupe — it emits a SECOND WORKER_COMPLETED.
  PoC `redteam/poc/attempt-replay.js` vs verbatim tip adapter: attempt-1
  `completed` envelope re-presented as attempt 2 → VALID, result_ids differ
  (c6b4d885… vs a31c585…), no dedup. Exact fix: require
  `result.attempt === workOrder.attempt` in verification (bind attempt in the
  envelope echo); reject on mismatch.
- [19:58] FINDING BR-A3 **P2** — No verified-vs-claimed grading on the canonical event
  (rank-4 hardening `oa-tool-invocation-ledger` applies). `recordVerifiedResult`
  emits WORKER_COMPLETED with no grading; PoC shows fabricated output verifies
  structurally. Downstream (measurements, follow-up policy) reads the event as
  "work done". Exact fix: add `verification:{structural:true, semantic:'worker-asserted'}`
  to event payload/metadata.
- [20:00] FINDING BR-A4 **P1** — Coordinator split-brain on lock-session loss
  (priority attack #2). Advisory lock acquired once on dedicated lockClient
  (tip :1098), never re-validated during the run; `pgConfig` sets no keepalive;
  on session drop PG releases the lock silently and the loop keeps dispatching.
  A second coordinator can acquire the claim → duplicate delegation (the A6
  failure mode, un-fixed in this dimension). Control mutations
  (`updateWorkOrder` filesystem writes, `eventRuntime.emit`) carry no
  epoch/fencing token, so a deposed coordinator's late writes are NOT rejected —
  violates mechanism-map record 14's required invariant. Exact fix: re-assert
  `pg_try_advisory_lock` before each dispatch (fail closed on loss); add a
  fencing epoch to control mutations or a lock watchdog that aborts the run.
- [20:00] FINDING BR-A5 **P2** — Evidence-tampering (priority attack #4).
  `save()` is plain writeFileSync; evidence JSONs (observe/plan/policy/
  prohibition/acceptance/reconcile/close) are not digest-bound to any canonical
  event. `99-close.json` cites event_ids but no evidence-manifest digest enters
  the journal; post-hoc edits are undetectable. Exact fix: include a sha256
  manifest of the evidence dir in the close/escalate path (canonical
  EVIDENCE_MANIFEST event or close-event metadata).
- [20:01] FINDING BR-A6 **P2** — Latent: redispatch-after-DISPATCH_LOST safety
  rests on read-only capabilities, not on reconcile logic. `reconcileRunningWorkOrder`
  re-authorizes lost attempts with no capability check; `pidAlive` only checks
  the WSL dispatcher PID while the Windows-side Hermes worker may survive.
  No-duplicate-side-effects holds ONLY because every AGENT_PROFILES entry
  requires read_only/no_writes/no_network. If any profile ever allows writes,
  the orphan race becomes P0. Exact fix: assert read-only capability set before
  re-authorizing a lost attempt (else escalate); link the invariant in code.
- [20:01] FINDING BR-A7 **P2** — `reserveWorkOrderBudget` two-file non-atomicity.
  `budget_reservations.json` written before `objective.json`; crash between →
  reservation exists but counter not incremented → budget under-counted by one.
  Exact fix: single-file reservation record, or derive used-count from the
  reservations file.
- [20:01] FINDING BR-A8 **P2** — `registerObjective` re-entrancy silently ignores
  new opts (same intent, different maxWorkOrders/constraints → old record kept,
  no warning). Stale-config trap. Exact fix: warn/log on opts mismatch.
- [20:01] FINDING BR-A9 **P2** — `acceptRendezvousResult` stamps
  `attempt: dwo.attempt_count || 1` (current counter) instead of the attempt that
  produced the result; the dispatcher already records `attempt_id` in rendezvous
  metadata. Combined with BR-A2, misattribution verifies clean. Exact fix: use
  `result.attempt_id`, reject on mismatch with `last_attempt_id`.
- SURVIVES (verified): rendezvous drop collection is attempt-gated
  (`orca-rendezvous-<attemptId>.json`, collect only for `last_attempt_id`) —
  stale-orphan overwrite analyzed, holds; lock acquisition itself is atomic
  (single `pg_try_advisory_lock`, loser exits before any write); reconcile
  ordering lock→reconcile→dispatch; `hermes_dispatch.py` atomic rendezvous
  write (mkstemp+os.replace); deadline enforcement on reconciled results is
  fail-closed (VERIFICATION_FAILED); deprecated synthetic engine emits only to
  its private disconnected EventQueue (no canonical emissions); retired vendor
  adapter copy (`_retired-vendor-2026-09-18/`) has zero importers — inert.
- Caveat: `orca/control-loop/policy/` (orac_policy.js, orca_status_model.js)
  reviewed by reference only (not in local staging copies); the 10-state ledger
  enforcement claim rests on the inventory, not on my read. Re-verify before GO.
[01:35] POLL: baseline snapshot taken (iterations=4, cadence=900s).
[01:50] POLL: LANDING DETECTED (poll 2/4). Checkpoint diff:
1c1
< 95f520a8042c2400f4d168ad2b1a56ca  /home/hatch/workspace/orca-finish/wave2/impl-state/CHECKPOINT.md
---
> 08566ab04efbbe898d7d931db60be002  /home/hatch/workspace/orca-finish/wave2/impl-state/CHECKPOINT.md
[02:05] POLL: LANDING DETECTED (poll 3/4). Checkpoint diff:
1,2c1,2
< 08566ab04efbbe898d7d931db60be002  /home/hatch/workspace/orca-finish/wave2/impl-state/CHECKPOINT.md
< 40d323562c036da74a4c09b2136f20d9  /home/hatch/workspace/orca-finish/wave2/impl-safety/CHECKPOINT.md
---
> 5df232dbc4ae9a2ee14e0b477cb2f146  /home/hatch/workspace/orca-finish/wave2/impl-state/CHECKPOINT.md
> 037e9ecf0ade048b16b2c86e4f84e459  /home/hatch/workspace/orca-finish/wave2/impl-safety/CHECKPOINT.md
