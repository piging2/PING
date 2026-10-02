# Regression Rerun Report — current HEAD 1995f0a59

- Date: 2026-09-19 ~14:18-14:30 MDT
- Lane: regressions (READ-ONLY + test execution)
- Worktree: /home/nolan/worktrees/constitutional-convergence-authority-law, branch constitutional-convergence-authority-law
- HEAD: 1995f0a59 (feat(events): collision-safe event identity with canonical-hash witness); parent f4bf5304a (feat(orchestration): durable event→mission reconciliation)
- Execution plane: Pig WSL via ~/workspace/pig/pigwsl-run.sh
- Scope rule: no worktree file was edited or created; zero new files in the worktree (verified via git status before/after — dirty set identical). Scratch DBs were created on scratch-only PG containers and dropped afterward; PG credentials were read from container env on the Pig and never written to any file.

## Suites run (all exit 0 except the known CORR-8 case)

| Suite | Command / file | Result | Baseline | Verdict |
|---|---|---|---|---|
| P0B pass-after | ping-runtime/orchestration/tests/pass_after_m1.js (PING_TEST_PG_URL -> fresh scratch DB `regress_p0b` on lanej-scratch-pg 127.0.0.1:15442; DB created then dropped) | 48/48, "PASS-AFTER PROVEN" | 48/48 | HOLD |
| P0B routing-law guard | ping-runtime/orchestration/tests/test_routing_version.js (shipped in f4bf5304a; ran as bonus) | PASS (version=2026-09-19.1, entries=28) | n/a (not baselined) | PASS |
| priority-bridge | gateway/test_priority_bridge_integration.js | 49/49 | 49/49 | HOLD |
| correlation-chain | gateway/test_correlation_chain.js | 12/13, CORR-8 fails ("Should dispatch exactly 1 event", 0 !== 1) | 12/13, known pre-existing CORR-8 failure | HOLD (same known failure) |
| phase12 collision+duplicate law | tests/event-authority-convergence/phase12_collision_duplicate_law.js (w1a-scratch-pg 127.0.0.1:15439, PGPASSWORD from container env) | 54/54 | 54/54 | HOLD |
| phase13 fanout exactly-once | tests/event-authority-convergence/phase13_fanout_exactly_once.js | 31/31 | 31/31 | HOLD |
| phase14 ordering | tests/event-authority-convergence/phase14_ordering.js | 21/21 | 21/21 | HOLD |
| phase9 model-B proof | tests/event-authority-convergence/phase9_model_b_proof.js | 32/32 | 32/32 | HOLD |
| phase20 replay-context-pack | tests/event-authority-convergence/phase20_replay_context_pack.js | 39/39 | 39/39 | HOLD |
| convergence invariants | tests/event-authority-convergence/convergence_invariants.js | 67/67 | 67/67 | HOLD |

Total re-verified: 48 + 49 + 12 + 54 + 31 + 21 + 32 + 39 + 67 = 353 passing assertions; 1 known pre-existing failure (CORR-8); 0 new failures.

## New failures

None. Every rerun matched its baseline exactly, including the known pre-existing CORR-8 correlation-chain failure (same failure, same message as baseline).

## Skipped / not independently rerunnable

1. "Collision test suite (30/30 on real PG)": no committed file at HEAD matches this description. The 1995f0a59 commit adds no new test file; it only adjusts two static checks in phase12_collision_duplicate_law.js (C6 wording for generateIdWithDigest + canonical_hash witness re-read). The closest committed collision coverage is phase12 itself (54/54 on real PG), which was rerun and holds. No ad-hoc collision script was found in /tmp on the Pig or in the worktree (tracked or untracked). Recommendation: if the 30/30 run was an ad-hoc pass-after script, commit it or record its path; otherwise treat phase12 as the canonical collision regression.
2. Full eval harness (baseline 82/85, 3 pre-existing EVAL-006 failures): out of scope for this lane; not rerun. No evidence of change.
3. Full gateway boot: not attempted (dockerode not installed; another lane is resolving that). Noted per task; no new information.

## Caveats

- Other-lane dirty state was present during all runs (5 modified files: gateway_runtime.js, test_witness_w2_versioning.js, capability_registry.json, mission_runtime.js, canonical_workers.js; 4 untracked paths). The two dirty files reachable from the rerun suites are mission_runtime.js (Lane J completion-requires-emission invariant, confined to complete() and gated on this._eventRuntime) and canonical_workers.js (ObservationWorker subject-identity fallback; ReplayWorker fail-closed completeness). Assessment: pass_after_m1.js constructs MissionRuntime with eventRuntime: null, so Lane J's change is inert there; phase9/phase13/phase12 all still pass, so no observable contamination. Rerun is therefore representative of HEAD for the tested paths, but strictly the runs exercised "HEAD + other-lane dirty state", not a pristine HEAD checkout.
- The `pg` npm module is absent from the worktree (no node_modules); tests were run with NODE_PATH=/tmp/node_modules using the shared pg 8.23.0 install in /tmp. No worktree writes were needed.
- Scratch DB hygiene: `regress_p0b` (my own) was dropped after the P0B run. The w1a harnesses self-drop their scratch DBs ("scratch database dropped" confirmed in logs). Pre-existing unrelated DBs on w1a (conv12_*, conv13_*, lane_c_test, p17_boot) were left untouched.

## Verdict

Both local commits still hold at current HEAD. P0B durable event→mission reconciliation: 48/48 (plus routing-law guard PASS). Collision-safe identity: covered by phase12 at 54/54 including the new generateIdWithDigest / canonical-hash-witness static checks. All other rerun suites (priority-bridge 49/49, correlation-chain 12/13 with the known CORR-8 failure, phase9 32/32, phase13 31/31, phase14 21/21, phase20 39/39, convergence_invariants 67/67) match baselines exactly. Zero new failures; nothing to patch.

Raw logs (Pig /tmp, ephemeral): /tmp/pig-regression/{pass_after_m1,phase9,phase12,phase13,phase14,phase20,convergence_invariants}.log
