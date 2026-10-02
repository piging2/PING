# Phase 13: Proposed Commit Allowlist (2026-09-17)

**Status:** PROPOSAL ONLY. Nothing was committed, pushed, merged, reset, or otherwise
mutated. Git was used read-only (`worktree list`, `status`, `diff`, `log`, `show`,
`ls-tree`, `cat-file`, `rev-parse`). No live runtime files were edited, no services
restarted, no database writes made. No credential values appear anywhere in this
document. No em dashes are used in this document.

**Worker:** Phase 13 subagent, 2026-09-17 ~06:28 to ~07:00 MDT.
**Inputs read:** phase2 drift reconciliation, phases3-6 P0 fixes, phase8 exterior
wiring, phase9 append-only hardening, phase10 backup/restore, phase0 credential
rotation, phase1 evidence manifest, sprint report.

## Current repo state (verified live this pass)

- `/home/nolan/ping`: branch `constitutional-convergence-v2` @ `099927152`,
  15 modified + 6 untracked porcelain lines, no staged changes, HEAD unchanged.
  Branch working-tree blob hashes for all six phase 3-6 files match the
  phases3-6 report exactly (85969ec7, 518a698c, d4550677, bf6f2cfa->bc992a9c,
  51a883f0, e8d76c2f). Sibling Phase 12 certification is active on this host;
  execution of this allowlist should wait for it to finish.
- Six worktrees registered, all HEADs unchanged from the Phase 1 manifest.
- `43a6cd2e4` (capability_authority.js source commit) verified present in the
  object store; blob sha256 `ff0eaeb8...` confirmed (LF).
- `/home/nolan/projects/ping` (website): branch `main` @ `f6386ee`,
  16 modified + 5 untracked paths, HEAD unchanged.

## Correction established in this pass

The phases3-6 report's note that the branch `knowledge_promoter.js` (7406f6d09)
"reads payload.confidence and emits KNOWLEDGE_PROMOTED" does not reproduce in
the current tree. The branch file at `ping-runtime/knowledge/knowledge_promoter.js`
(sha256 `7406f6d09...`, clean vs HEAD) already approves at confidence 1.0,
rejects at 0.2, and emits no `KNOWLEDGE_PROMOTED` event, which matches the live
behavior the report describes. No drift, no commit needed for this file. The
report's parenthetical appears to describe an older state.

## Line-ending rule for the whole series

Live files are CRLF; branch files are LF. Normalize CRLF to LF on the way in
for every committed file (the capability_authority.js restore per the Phase 2
verdict, and all live-derived bytes). Node is line-ending agnostic, so the
rebuilt image is unaffected. For files where the branch working tree already
equals live modulo line endings, the executor must re-verify with a
line-ending-insensitive diff against a fresh live extract before committing.

---

## Proposed commits

### C1: security: restore live exterior-agent authorization boundary + per-principal namespace ACL

- **Files (3):**
  1. `gateway/capability_authority.js` (NEW; blob restored from commit
     `43a6cd2e4`, sha256 `ff0eaeb8...`, LF normalized per the Phase 2 verdict)
  2. `ping-runtime/canonicalization/canonicalization_service.js` (branch
     working tree, blob `85969ec7`; executor verifies semantic identity vs
     live `08747d1c` with line-ending normalization)
  3. `gateway/routes/ingest.js` (branch working tree, blob `518a698c`;
     executor verifies vs live `fedd0b2b`)
- **Source worktree:** `/home/nolan/ping` (main worktree); file 1 from the git
  object store (`43a6cd2e4`, reachable via
  `refs/remotes/windows-preserve/constitutional-convergence-v2`).
- **Test receipts:** Phase 2 report component 1 (live fail-closed
  `CapabilityAuthority.authorize()` at line 230, unknown agents denied, agent
  profile allowlist, wired live at `gateway_runtime.js:416-418`; agent-exec
  REPORT phase 10 forensics). Phases3-6 report Phase 3, 12/12: 9/9 ACL matrix
  (401s, 403 on malformed/unauthorized namespaces, 200 on entitled, implicit
  resolution persisted as `core::owner`, idempotent re-emit) plus the
  `/ingest` principal-spoofing fix (spoof reproduced then denied with 400,
  legit ingest 201). Receipt events: `d12284b6...`, `2a56b0ec...`,
  `ecfab03d...`, `0d0579d1...` (spoof repro), `9926b75e...` (legit).
- **Dependencies:** none.
- **Excluded:** all `.env` files (never committed); no secret values in these
  files (agent IDs in the entitlement map are principals, not secrets).

### C2: runtime: event-boundary wiring + retry-reclaim durability

- **Files (4):**
  1. `gateway/routes/events.js` (from
     `worktrees/oracle-assembly/oracle-assembly-patches/gateway/routes/events.js`,
     sha256 `6f1abebb`, byte-identical to live)
  2. `gateway/bootstrap/gateway_runtime.js` (TARGET: the current live file;
     executor re-extracts it, verifies it contains both the `/events`
     `canonicalizationService` wiring and the `namespaceEntitlements` block,
     normalizes CRLF to LF, runs `node --check`. Fallback if the live file
     cannot be cleanly verified: the `oracle-assembly-patches` copy
     `880d0d06` plus the phase 3 `namespaceEntitlements` block inserted at the
     canonicalization-service options. This file adopts release-tree content
     that is newer than the branch: exterior auth middleware, `/capabilities`
     routes, missions auth middleware. See decision 2.)
  3. `ping-runtime/orchestration/mission_runtime.js` (HEAD baseline plus the
     verified delta from
     `workspace/ping-overnight/drift-sources/mission_runtime.js.delta-vs-HEAD.diff`:
     `failWithRetry()` WHERE-clause hardened to include `retry_pending`, plus
     new `reclaimRetryPending()`)
  4. `ping-runtime/orchestration/mission_scheduler.js` (current branch file,
     blob `51a883f0`, plus ONLY the Arrow 1b hunk from
     `workspace/ping-overnight/drift-sources/mission_scheduler.js.delta-vs-HEAD.diff`;
     the two pre-existing `originator` lines are EXCLUDED, see decision 3)
- **Source worktrees:** `worktrees/oracle-assembly` (files 1, 2);
  `/home/nolan/ping` main worktree (files 3, 4, constructed from verified diffs).
- **Test receipts:** event-boundary REPORT, Phase 1 live matrix (malformed
  namespace 403, missing auth 401, missing field 400, unknown type 422,
  service 503, idempotent replays, `/ingest` unaffected; boundary receipt
  `5e24e593...`). Phases3-6 report P0-5, 12/12 (fail-once-then-succeed reaches
  `completed` with attempt 2; bounded exhaustion dead-letters exactly once;
  no re-execution loop; reclaim idempotent when nothing due).
- **Dependencies:** C1 (this `gateway_runtime.js` requires
  `../capability_authority` at line 106).
- **Excluded:** the branch working tree's pre-existing stale
  `gateway_runtime.js` variant content (db_guard references, old route
  wiring, comment-only normalization); the two `originator` deployment-drift
  lines (decision 3).

### C3: knowledge: node provenance preservation + approval-family mission routing

- **Files (2):**
  1. `gateway/routes/knowledge.js` (branch working tree, blob `d4550677`;
     executor verifies vs live `e0a99568`)
  2. `ping-runtime/orchestration/event_to_mission_bridge.js`, phase 5 hunk
     only (`SNIPPET_APPROVED` / `SNIPPET_REJECTED` / `AI_RESPONSE_ACCEPTED` /
     `AI_RESPONSE_REJECTED` to `{ missionType: 'KNOWLEDGE_PROMOTE', priority: 2 }`;
     intermediate blob `bf6f2cfa`)
- **Source worktree:** `/home/nolan/ping` (main worktree).
- **Test receipts:** phases3-6 report Phase 4 (`POST /knowledge/nodes` with
  `nodeId=p4-test-node-003`, `sourceEventId=e96f5306...`,
  `correlationId=p4-2026-09-17-c` persisted verbatim; GET round-trip
  identical). Phase 5 (source event `ce4d6ee1...`; `SNIPPET_APPROVED`
  `b6816f11...` to mission `6e8c020c8acbb9f9` `KNOWLEDGE_PROMOTE`, completed,
  deterministic ID predicted exactly; node `p5-test-node-001` approved at
  confidence 1.0).
- **Dependencies:** C2 (the scheduler `MISSION_WORKER_MAP`
  `KNOWLEDGE_PROMOTE: 'knowledge-promotion'` entry that makes the routing
  dispatch).

### C4: replay: direct REPLAY_VERIFY event routing

- **Files (1):**
  1. `ping-runtime/orchestration/event_to_mission_bridge.js`, phase 6 hunk
     only (`REPLAY_VERIFY: { missionType: 'REPLAY_VERIFY', priority: 1 }`;
     blob `bf6f2cfa` to `bc992a9c`)
- **Source worktree:** `/home/nolan/ping` (main worktree).
- **Test receipts:** phases3-6 report Phase 6 (direct `REPLAY_VERIFY`
  `7a47ce6e...` to mission `af3758af637bd983`, completed, assigned to
  `replay`; `REPLAY_COMPLETED eaeb82ef...` with `verified=true`,
  `reason=kernel_verified`; idempotency: re-emit returned the same event ID,
  mission count stayed 1).
- **Dependencies:** C3 (same file, sequential hunks).

### C5: agents: ExternalAgentAdapter package (canonical placement, unwired)

- **Files (5, all NEW, relocated from `worktrees/agent-exec/external-agent/`
  to `external-agent/` at the repo root on `constitutional-convergence-v2`):**
  1. `external-agent/external_agent_adapter.js` (sha256 `521e516a...`)
  2. `external-agent/external_agent_adapter.test.js` (`0f95ef87...`)
  3. `external-agent/WORKORDER_SCHEMA.json` (`3bca1cfe...`)
  4. `external-agent/RESULT_SCHEMA.json` (`8ccf84e2...`)
  5. `external-agent/BOUNDARY.md` (`0a20be8a...`)
- **Source worktree:** `worktrees/agent-exec` (branch `sprint/agent-exec`).
- **Test receipts:** agent-exec REPORT (18/18 fail-closed adapter tests);
  phase8 report (18/18 re-passed on the Pig immediately before the proof run;
  isolated end-to-end: mission `685ec6160f9d3862` `EXTERIOR_TASK` completed
  through the real scheduler/dispatch path, real Hermes execution, 7 canonical
  events, result envelope sha256 `3f76edca...`, zero exterior-emitted events).
- **Dependencies:** none (inert until wired; no routing authority is created
  by this commit).
- **Excluded:** `ping-runtime/workers/exterior_agent_worker.js` (not yet
  authored; proposed follow-up, decision 6); the `EXTERIOR_TASK` map entry and
  `canonical_workers.js` registration (ready-pending-restart; needs the
  transport decision, since `hermes.exe` is Pig-native and the Oracle gateway
  is Linux ARM64).
- **Open:** canonical require path (repo-root `external-agent/` proposed;
  decision 6).

### C6: oracle: canonical compose + append-only invariant + backup paperwork

- **Worktree/branch:** `worktrees/oracle-assembly` on branch `main` @
  `5b102c664` (PROPOSED placement; see decision 5).
- **Files (8):**
  1. `infrastructure/oracle/docker-compose.oracle.yml` (modified in working
     tree, sha256 `5163084e...`; the canonical compose)
  2. `infrastructure/oracle/append-only-invariant.sql` (NEW; byte copy of
     `workspace/ping-overnight/event-boundary/trigger-append-only-v2.sql`)
  3. `infrastructure/oracle/bootstrap.sh` (modified: new Step 8 post-boot
     hook installing the invariant after the gateway is healthy, per phase9
     section 8; existing Steps 1-7 confirmed present this pass)
  4. `infrastructure/oracle/backup/RESTORE_VERIFICATION_PROCEDURE.md` (NEW)
  5. `infrastructure/oracle/backup/BACKUP_MANIFEST.md` (NEW)
  6. `infrastructure/oracle/backup/NAMING_CONVENTION.md` (NEW)
  7. `infrastructure/oracle/backup/RETENTION_POLICY.md` (NEW)
  8. `infrastructure/oracle/backup/restore-verify.sh` (NEW; the exact script
     that ran the isolated restore test)
- **Source worktrees:** `worktrees/oracle-assembly`; paperwork sources from
  `workspace/ping-overnight/phase10/`.
- **Test receipts:** phase9 report (full matrix: UPDATE/DELETE/TRUNCATE denied
  live, INSERT and ON CONFLICT idempotency intact, fresh-init scratch test
  passed, live row count unchanged at 1380). Phase10 report (isolated restore
  VERIFIED: Postgres 31 tables, 1153/221 rows matching the artifact payload;
  Qdrant 13 points green; teardown clean; manifest count discrepancy flagged).
- **Dependencies:** none.
- **Excluded:** `backup-cron.sh` (disabled-by-default triple-gate automation;
  excluded pending decision 8); `docker-compose.oracle.yml.pre-canonical-20260916`
  (stale pre-canonical copy); `oracle.env.template` (secret-adjacent template,
  kept out of this series); `schema.sql` (stale relative to live; separate
  decision); `multiruntime-proof/` (proof evidence, not assembly);
  `ping-oci-queue.timer` (still disabled); all Oracle backup artifacts and the
  1.1 GB FALSIFIED tarball (data, never committed).

### C7: python: production capability adapter + capabilities (unwired)

- **Files (6, all NEW, from `worktrees/python-prod/prod/` to `prod/` at the
  repo root on `constitutional-convergence-v2`):**
  1. `prod/python_prod_adapter.cjs` (sha256 `c52cac95...`)
  2. `prod/dlq_authority.cjs` (`38bc4c4b...`)
  3. `prod/lib/ids.cjs`
  4. `prod/capabilities/ping_canonical_hash.py`
  5. `prod/capabilities/ping_flaky.py`
  6. `prod/capabilities/ping_always_fail.py`
- **Source worktree:** `worktrees/python-prod` (branch `sprint/python-prod`).
- **Test receipts:** python-prod REPORT phase 7 (44/44 assertions from live
  Postgres rows; mission `bfe815990337e45d`; `PYTHON_CAPABILITY_VERIFY`
  `27482dbd...`; determinism and idempotency verified). Phases3-6 report P0-5
  (12/12; the phase 8 retry defect this adapter exposed is fixed and proven).
- **Dependencies:** none (inert until registered).
- **Excluded:** `prod/run_phase7.cjs`, `prod/run_phase8.cjs` (test drivers);
  `prod/results-phase7.jsonl`, `prod/results-phase8.jsonl`,
  `prod/dlq-phase8.jsonl` (test-scoped data); `prod/capabilities/__pycache__/`
  (generated).
- **Open:** canonical registration (`EVENT_MISSION_MAP` /
  `MISSION_WORKER_MAP` entries + `canonical_workers.js` entry) is a separate
  follow-up commit; decision 7.

### C8: website: surgical upgrade + receipt-backed truth updates

- **Repo:** `/home/nolan/projects/ping`, branch `main` @ `f6386ee`
  (separate repository, separate history, per the standing website rules).
- **Files (21):** the full current working-tree delta: 16 modified
  (`src/app/newsletter/page.tsx`, `src/app/page.tsx`,
  `src/app/technology/page.tsx`, `src/components/newsletter-signup.tsx`,
  `src/components/ping-wordmark.tsx`, `src/components/site-footer.tsx`,
  `src/config/brand.v1.json`, `src/config/brand.v1.main.json`,
  `src/config/media.v1.json`, `src/config/media.v1.main.json`,
  `src/config/seo.ts`, `src/lib/api/client.ts`,
  `src/lib/authority-loader.ts`, `src/lib/infrastructure/audit.ts`,
  `src/lib/infrastructure/auth-manager.ts`,
  `src/lib/infrastructure/controller.ts`, `src/lib/strings.ts`) plus 5
  untracked (`public/images/ping-social-logo.png`, `research/`,
  `src/components/architecture/`, `src/components/maturity-label.tsx`).
- **Test receipts:** `website/HOMEPAGE_REPORT.md`,
  `website/TRUTH-UPDATE-2026-09-16.md`, `website/TRUTH_MATRIX.md`
  (sprint receipts: dev server recompile clean, `/` and `/technology` 200,
  matrix mirrored byte-identical); tonight's phase receipts where the site
  mirrors them.
- **Dependencies:** none.
- **Classification:** NEEDS Nolan's explicit word. This is his marketing
  surface and he edits copy himself; site claims must stay inside the BUILT
  column of the 2026-09-17 repo audit (agents EXPERIMENTAL, business graph
  direction, multi-runtime convergence unbuilt).

---

## Proposed order

1. C1 (security: capability authority + namespace ACL)
2. C2 (runtime: event boundary + retry reclaim; depends on C1)
3. C3 (knowledge: node provenance + approval routing; depends on C2)
4. C4 (replay: REPLAY_VERIFY routing; depends on C3)
5. C5 (agents: ExternalAgentAdapter package; independent)
6. C7 (python: production adapter; independent)
7. C6 (oracle: compose + append-only + backup paperwork; independent, other worktree/branch)
8. C8 (website; independent, other repo)

C5, C6, C7, C8 may land in any order relative to each other and to C1-C4.

## Approval classification (recommendation; nothing executes)

Standing rule from the sprint and the alignment synthesis: nothing commits
without Nolan's explicit word. Within that, the recommendation is:

- **Blanket authorization candidate (mechanical, live-verified,
  byte-identical or verified-delta sources, test-receipted):** C1, C3, C4,
  C5, C7, and within C2 the `events.js`, `mission_runtime.js`, and
  `mission_scheduler.js` landings.
- **Explicit per-commit word required:** C2's `gateway_runtime.js` (a
  constructed file adopting release-tree content newer than the branch; see
  decision 2), C6 (branch placement decision, new bootstrap step, backup
  paperwork scope), C8 (marketing surface).

## Decisions Nolan must make (numbered)

1. **Authorize the series at all.** Standing rule: nothing commits without his
   explicit word. Recommendation: blanket-authorize the mechanical set;
   per-commit word for C2's gateway_runtime.js, C6, and C8.
2. **gateway_runtime.js adoption scope.** Adopt the full live file as
   canonical (recommended; it is what is running, the branch is behind on
   exterior auth, /capabilities routes, and missions auth middleware) vs
   apply only the narrow deltas to the branch file (leaves the rest of the
   live-ahead-of-repo drift unresolved).
3. **The two `originator` lines in mission_scheduler.js.** Proposed
   classification: pre-existing deployment-lineage drift, DROP from the
   canonical branch (no consumer, no test coverage); the next branch-built
   image normalizes live. Alternative: adopt them into canonical.
4. **Rebuild authority.** Declare the reconciled `constitutional-convergence-v2`
   branch the sole rebuild authority: future gateway images build from clean
   branch checkouts only, never from hand-edited release trees; the stale
   on-box `/opt/ping/gateway` tree is archived out of every rebuild path;
   the releases tree becomes a deploy log, not a source. This is what stops a
   future rebuild from silently losing the P0 fixes.
5. **Oracle assembly placement.** Keep `infrastructure/oracle` on `main`
   (oracle-assembly worktree) vs consolidate it under
   `constitutional-convergence-v2`.
6. **ExternalAgentAdapter placement and wiring.** Confirm repo-root
   `external-agent/` as the canonical path (or name another); authorize
   authoring `ping-runtime/workers/exterior_agent_worker.js` and the
   follow-up wiring commit (`EXTERIOR_TASK` map entry + `canonical_workers.js`
   registration), which is blocked on the transport decision: `hermes.exe` is
   Pig-native, the Oracle gateway is Linux ARM64.
7. **Python adapter registration.** Authorize the follow-up registration
   commit (bridge/scheduler map entries + `canonical_workers.js` entry) or
   keep the adapter committed but unwired.
8. **Backup automation.** Keep `backup-cron.sh` out of the repo and disabled
   (current), commit it inert (triple-gated, disabled by default), or
   authorize enabling it (`/opt/ping/.backup-automation-enabled` plus the env
   gate) with an off-host destination decision.
9. **Playbook artifacts.** Defer `playbook/PLAYBOOK_SPEC.md` and the runners
   until the playbook-revision human decision (recommended) vs commit now as
   inert tooling.
10. **Website commit.** Land the 21-file working tree as one commit on the
    website repo (his call; he edits marketing copy himself).
11. **CRLF to LF normalization on the way in** (recommended; confirm no
    Windows-only consumer depends on CRLF bytes).
12. **Least-privilege runtime role** (phase 9 follow-up: the `ping` role is a
    superuser, so it can `DROP TRIGGER`). Separate, larger track; not in this
    series; needs his call.

## Residual: deliberately left OUT and why

- **Proof and evidence artifacts** (`workspace/ping-overnight/*`: phase
  reports, drift-sources evidence copies, JSONL results, /tmp scratch):
  stay in the workspace, never in the repo.
- **Test-scoped data:** python `results-*.jsonl`, `dlq-phase8.jsonl`, run
  drivers, `__pycache__/`; phase 8 `/tmp/phase8` harness files (ephemeral).
- **Stale artifacts:** the 1.1 GB FALSIFIED tarball
  (`/opt/ping/ping-oracle-clean-snapshot.tar.gz`, preserved on Oracle, never
  committed); `docker-compose.oracle.yml.pre-canonical-20260916`;
  `multiruntime-proof/` (proof evidence); `oracle.env.template`.
- **Disabled automation:** `backup-cron.sh`, `ping-oci-queue.timer`
  (untouched, still disabled).
- **Recovery bundles on Oracle:** `.env.bak*`,
  `*.bak-agent-a-20260916*` (stay on the host; the three live `.env` copies
  are never committed anywhere).
- **Pre-existing dirty state unrelated to the sprint** (needs its own
  disposition, excluded from every commit above): `.env.base`,
  `gateway/bootstrap/wiring.js`, `gateway/end_to_end_verifier.js`,
  `gateway/generated/deployment_generator.js`,
  `gateway/generated/deployment_manifest.json`, `gateway/launch_bg.ps1`,
  `gateway/launch_bg2.ps1`, `gateway/start_bg.js`, `gateway/test_pg_init.js`,
  `gateway/bootstrap/db_guard.js` (untracked). The branch's stale
  `gateway_runtime.js` variant content beyond the ACL block is superseded by
  C2's adoption.
- **Playbook worktree files** (`playbook/PLAYBOOK_SPEC.md`, runners):
  deferred to decision 9.
- **agent-smoke worktree:** untouched per standing order.
- **Live DB test residue** (e.g. mission `73e08f46f843beb2` stuck in
  `retry_pending`, `test.*` namespaces): runtime data, not repo content; the
  owning unit can clean it after the fix lands.
- **Registry `missing_implementation` tree-relative label correction:**
  flagged in phase 2; the holding file was not identified in this pass, so it
  is a doc follow-up, not a commit file.

## Execution notes for the parent (when authorized)

- Wait for the sibling Phase 12 certification to finish before any executor
  touches the repo or live systems.
- Executor re-verifies every hash named above at execution time; any mismatch
  fails closed and the commit does not land.
- `node --check` every constructed or restored JS file before commit.
- Never `git push`, never touch `main`/`master` on the PING repo, never
  reboot the Pig, never restart services as part of landing these commits.
- The gateway picks up the reconciled code on the next branch-built image
  rebuild, which is itself gated on decisions 2 and 4.
