# SWARM-20 CHECKPOINT (2026-09-24 ~02:00 UTC)

Mission: autonomy gauntlet — end-to-end adversarial proving ground for the
autonomous tenant loop, with pinned, provenance-recorded dependencies so
gauntlet results are reproducible.

## Prior worker (pre-restart) completed
- `gauntlet/mission.js` — full loop harness (intent->...->close), exit codes mirror orca_control_loop.js.
- `gauntlet/lib/harness.js` — synthetic doubles (event runtime w/ logical_id dedup, memory store, MCP registry, durable ObjectiveStore, mission-control snapshot).
- `gauntlet/lib/worker.js` — synthetic worker stub with 6 fault modes.
- `gauntlet/lib/real_modules.js` — loads the pinned REAL PING modules.
- `vendor-pinned/` — 6 byte-exact module copies + PROVENANCE.md (source: `/home/nolan/worktrees/orca-autonomy`).
- `reference/` — 5 source-module reference copies for diagnosis.
- NOT completed: the pin set was incomplete (missing transitive closure), the harness had never run (evidence/ empty), attacks/ empty, GAUNTLET-MISSION.md missing.

## This worker completed (2026-09-24 ~01:40-02:00 UTC)
1. **PROVENANCE typo fix**: recovery_decisions.js recorded hash was a 63-char transcription typo (missing leading `e`); corrected to `eedcdb2...`.
2. **Pin closure completion**: `canonical_object.js` requires `../authorities/canonical_authority.js` etc. Pinned 8 more files (3 ping-runtime authorities, 3 kernel authorities, constitutional_clock, physical_clock_adapter) from the SAME worktree; hashes added to PROVENANCE.md.
3. **Harness bug fix (fatal)**: `authorizeWithRevocationCheck` was `async`, but `classifyDelegation` calls it synchronously — every delegation denied with "Authorization denied: undefined". Made the pre-check sync (renamed entry to `delegateRun`). First real gauntlet run: exit 0.
4. **Attack-10 guard fix**: the RECONCILIATION_REQUIRED check used the durable work-order id for the marker filename, but the worker writes under the issued (adapter) id — the guard never fired and the loop retried a possibly-effected work order. Fixed to check the issued id; rerun writes `reconcile-required.json` on attempt 1 with zero retries.
5. **Proven**: honest run exit 0; restart-idempotency (same objective re-run detects COMPLETED, issues nothing, exit 0); 14/14 attack matrix as expected (see attacks/GAUNTLET-ATTACKS.md, run via `run-attacks.sh`, evidence in `evidence/attack-*/`).
6. **Docs**: `GAUNTLET-MISSION.md` (env table mission.js references), `attacks/GAUNTLET-ATTACKS.md` (14-scenario catalog), this checkpoint.

## Not done / next
- Coordinator-lease contention (exit 5), durable cancellation (exit 4), and lost-RUNNING-attempt startup reconciliation are code-covered but not driven in the matrix.
- Repo promotion of the harness under `src/tenanos/gauntlet/` (per the harness non-compete note) is a COORDINATOR decision — NOT staged as a proposal by this worker, because vendoring the pinned copies into src/tenanos/ would duplicate repo code (competing implementation). If promoted, promote harness+lib only and require the real modules at test time.

## Files changed by this worker (all inside swarm-20/gauntlet/, no src/tenanos/** changes)
- vendor-pinned/PROVENANCE.md (hash fix + closure table)
- vendor-pinned/{ping-runtime/authorities,runtime/kernel/authorities,infrastructure}/ (+8 files)
- mission.js (async-authorize fix, attack-10 id fix)
- run-attacks.sh (new), GAUNTLET-MISSION.md (new), attacks/GAUNTLET-ATTACKS.md (new), evidence/*/ (run evidence)
