# PING migration — morning report

Date: 2026-09-16. Window: 2026-09-15 ~20:00 MDT to ~21:05 MDT (core migration complete; night-watch continues).

Date: 2026-09-16. Window: 2026-09-15 ~20:00 MDT to morning. Branch: `night-shift-2026-09-15` (main untouched, nothing pushed).
Objective: finish the migration, eliminate fragmented spaghetti, make the specs mechanically true, leave the system substantially more coherent, testable, reproducible.

Classification key: PROVEN (evidence: file, commit, test, command, output, or runtime observation) / PARTIALLY PROVEN / UNPROVEN / FAILED.

## Claim ledger

### Gateway
| Claim | Verdict | Evidence |
|---|---|---|
| Dead routes (mcp.js, connectors.js) had zero callers and were safe to archive | PROVEN | Repo-wide grep, zero callers; `node -e require` failed MODULE_NOT_FOUND on both; commit `59ddede3` |
| Gateway no longer crashes on missing bootstrap | PROVEN | Guarded require in `gateway/constitutional_runtime.js`; live boot on port 18083: `/health` 200, `/healthz` 503 degraded with reason, `/initialize` 200 degraded; test `gateway/tests/runtime_degraded.test.js` ALL PASS (coordinator re-ran) |
| `/healthz` reports honest component-level state | PROVEN | Returns initialized/degraded/reason/components; observed in live boot output |
| dashboard.js was dead and is now archived | PROVEN | Unmounted, zero callers, `require` threw MODULE_NOT_FOUND (missing `route_middleware`); `git mv` + commit `128119da`; 4 gateway suites re-ran green after |
| Gateway reaches healthy (`/healthz` 200) | UNPROVEN | Correctly out of scope: no sanctioned TS build exists (repo tsconfig covers only `runtime/replay/**` + `tests/**`), compiled bootstrap needs `pg` (not installed for gateway), healthy needs live PG + full service graph. Honest-degraded is the correct tonight state |

### Determinism
| Claim | Verdict | Evidence |
|---|---|---|
| Event identities are content-addressed (7 sites) | PROVEN | Commit `719b53ce`; `grep -c Date.now()` = 1 (justified clock seed), `Math.random()` = 0; `tests/event-sourcing-determinism.test.ts` 7/7 green (coordinator re-ran via tsc + `node --test`) |
| Same input + fixed clock => same IDs; different payload => different ID | PROVEN | Covered by the 7 tests above |
| Scheduler worker/queue/task IDs are deterministic | PROVEN | Commit `a70d9f86`; new `constitutional-compiler/deterministic-ids.ts` consumer adapter; `tests/scheduler_determinism.test.js` 108/108, `worker_port` 42/42, `worker_replay` 53/53 (coordinator re-ran) |
| Idempotency-key bug fixed | PROVEN | `idempotency-manager.ts` dropped the `Date.now()` suffix that made every key unique so `check()` could never match; in `a70d9f86` |
| Sweep: 26 identity sites replaced, 4 dead generators deleted | PROVEN | Decision list in `a70d9f86` message; coordinator re-ran the 3 suites green |
| Workstream C's "tsc clean on all 27 files" | FAILED | Coordinator tsc run found TS2304 dangling `SequenceIdGenerator` refs in 3 engine files; repaired by coordinator commit `e794da25` (3 deletions, field was unused); post-fix tsc clean for those files |

### Marketing compiler
| Claim | Verdict | Evidence |
|---|---|---|
| 8-pass pipeline implemented (story -> planner -> campaign -> mission -> execution -> replay -> evidence -> knowledge) | PROVEN | 5 commits `961a3b21`..`067d3270`; 16 files in `constitutional-compiler/marketing-compiler/`; 19/19 tests green (coordinator re-ran); mission-graph pass inspected by coordinator (real logic, throws on bad input) |
| Passes 1-3 are real deterministic logic, not stubs | PROVEN | Keyword classifier, per-channel playbooks, content-addressed graph; tested per-pass |
| Thin spots honestly labeled | PROVEN | Replay = structural dry-run, knowledge = sha256 feature vector labeled `embeddingModel: 'sha256-features-v1'`, divergences appended to spec |
| End-to-end sample business intent runs | PROVEN | Sample driver: story -> 8 tactics -> 15-node graph -> 8 missions -> 8 executions (40 steps) -> replay 8/8 -> evidence -> knowledge, IDs stable across runs |

### Event spine
| Claim | Verdict | Evidence |
|---|---|---|
| Exactly one durable production store (PG `evidence_events`) | PARTIALLY PROVEN | 5 implementations classified with caller evidence; 2 dead archived (`ef52e12b`); testing double kept. BUT: two writers, two column sets — see below |
| `EventSourcingSystem` and `PostgresAppendStore` are not competing | FAILED (as a cleanliness claim) | Coordinator-confirmed: `event-sourcing.ts:175` INSERTs `(canonical_bytes, metadata)`; `append_store.ts:38` INSERTs a different column set. Same table, two writers. Flagged for a production-rewiring decision; deliberately not touched tonight |
| Adapters are legitimate, not duplicates | PROVEN | `event-runtime/event-store-adapter.ts` was dead (zero callers) -> archived; `adapters/EventStoreAdapter.ts` is testing-only (3 test files) -> kept; rationale in `archive/event-spine-2026-09-15/README.md` |

### CI and cleanup
| Claim | Verdict | Evidence |
|---|---|---|
| CI gate is runnable and green | PROVEN | `.github/workflows/replay-integrity.yml` rewritten (`cd10e385`); 8 suites + forbidden-import grep all exit 0 locally (coordinator re-ran every command); excluded suites named in comments, not hidden |
| CLEANUP_PROPOSAL Phases 1-3 resolved | PROVEN | All 14 files already absent from tree, zero live callers (repo-wide grep); per-file record in `archive/cleanup-2026-09-15/README.md`; honest negative result |
| Pre-existing failures triaged | PROVEN | Workstream G fixed 3 suites (consensus_stats 118/118, event_collision ALL PASS, canonical_json 46/46), documented 4 dead suites with evidence; coordinator added the 3 to the CI gate (`16e08c41`); 11/11 CI suites green |

### Replay engine
| Claim | Verdict | Evidence |
|---|---|---|
| Replay preserves original event IDs | PROVEN (code) | `production-replay-engine.ts:76` `ordering.push(event.eventId)`; coordinator read the 198-line file |
| Replay preserves original timestamps | UNPROVEN | Witness stamps literal `'constitutional-replay'` (lines 101/115); original timestamps not surfaced |
| Derived replay artifacts are deterministic | PARTIALLY PROVEN | `replayId` = sha256(eventCount, first/last hashes) by construction; `verifyDeterminism()` exists but not executed against live PG tonight |

### Preserved prior work
| Claim | Verdict | Evidence |
|---|---|---|
| `fc4c53de` and `88bc51bd` intact and un-regressed | PROVEN | Both in branch history; observation_idempotency + worker_replay suites green on final tree |

## Commits (18 on branch, chronological)
`fb998f64` CodeRabbit config; `81ebe99d` README rewrite; `59ddede3` gateway convergence + startup repair; `cd10e385` cleanup verification + CI repair; `a70d9f86` scheduler determinism + sweep; `719b53ce` event-sourcing determinism; `ef52e12b` event-spine convergence; `128119da` dashboard archive; `961a3b21`, `c7153f25`, `a7d21bbc`, `e263431a`, `067d3270` marketing compiler; `e794da25` coordinator fix for C regression; `44d16b3f` pre-existing test triage; `16e08c41` CI gate expansion to 11 suites; (+ 3 pre-existing: `5df421a5`, `88bc51bd`, `fc4c53de`).

## Test ledger (final tree, coordinator re-ran)
- 11/11 CI suites PASS (merge_gate 10/10, scheduler_determinism 108/108, worker_port 42/42, worker_replay 53/53, consensus_stats 118/118, event_collision ALL PASS, canonical_json 46/46, 4 gateway suites)
- marketing-compiler 19/19, event-sourcing-determinism 7/7
- forbidden-import gate: clean on `dist/runtime/replay`
- Partition overlap check: no file touched by two commits except the archive README (sequential, benign)
- Dead suites documented with evidence (not hidden): tests/benchmark, determinism, witness_equivalence (kernel APIs gone), tests/replay/*.test.ts + 24 constitutional-compiler .ts suites (no runner; reviving needs source-tree import rewrites)

## Decisions for Nolan
1. `evidence_events` dual writer: unify on one writer/column set, or bless both with a contract? (evidence: the two INSERT statements above)
2. CodeRabbit `.coderabbit.yaml` is configured; the GitHub App install is your call.
3. Gateway healthy needs: a sanctioned bootstrap build + `pg` for the gateway + live PG. Say the word and it's the next workstream.
4. `night-watch-cycle` cron still installed (goal:ping-social-brand-launch); remove in the morning per plan.

## Constraints compliance
Branch-only, main untouched, no pushes, no `.env` reads, `fix_codex_config.py` left alone, free-only tools, no Docker/Windows changes, no credential handling. One regression shipped by a worker (C) and caught by coordinator verification before morning. One coordinator note corrected by a worker (G proved consensus_stats never had the exit-0 bug; my earlier reading was a pipe-through-head artifact).
