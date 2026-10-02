# LANE-CHAOS R2: Chaos Probe Report

Date: 2026-09-23 (MDT). Lane: LANE-CHAOS second re-dispatch (session b199a5b3).

**Ownership note:** the canonical `~/workspace/fyd-factory/chaos/CHAOS-REPORT.md` path is owned
by the still-running LANE-CHAOS re-dispatch 71/85 (one writer per file, coordinator redirect).
This report is the R2 re-dispatch deliverable and does not supersede or edit that file.

## Scope and constraints honored

- All probes ran locally in this sandbox under `~/workspace/fyd-factory/chaos/` (scripts
  prefixed `r2-`, scratch in `work-r2/`). The Pig was never touched, never slept, never loaded:
  no chaos test slept the Pig or ran anything on it.
- The repo was never touched (no reads via wsl-run.sh were even needed; nothing was committed,
  no working tree modified).
- No external consequential actions: no network, no sends, no posts, no purchases. The only
  kills were SIGKILL/SIGTERM against the probe's own worker PIDs.
- No em dashes were used in this report.

## Suite verdict: PASS (40 checks, 0 failures)

| Probe | Target machinery | Verdict | Checks |
|---|---|---|---|
| P1 duplicate job safety | `compilation/` queue (real `enqueue.js` + protocol-faithful runner) | PASS | 11/11 |
| P2 worker crash recovery | mission `results.jsonl` appender contract | PASS | 7/7 |
| P3 corrupt cache entry | digest-addressed artifact cache (incremental trust model) | PASS | 8/8 |
| P4 source change mid-run | incremental invalidation (mirrors `incremental/proof/inc_proof.py`) | PASS | 5/5 |
| P5 drop targets | appender target destruction | PASS | 5/5 |
| P6 flaky upstream + crash mid-batch | 500/429/timeout/DNS + SIGKILL mid-batch | PASS | 4/4 |

Reproduce: `~/workspace/fyd-factory/chaos/r2-run-all.sh` (runs P1..P6, writes
`work-r2/<pN>/verdict.json` per probe).

---

## P1: duplicate job safety (same job twice -> one execution) : PASS 11/11

- **DETECTED:** The same job was submitted twice through three routes: (a) duplicate
  `enqueue.js` submission with identical fixtures/seeds; (b) two runner processes racing one
  pending job; (c) a winner runner SIGKILLed mid-worker followed by resume.
- **DIAGNOSED:** Without dedup, (a) would double manifest lines or resurrect done jobs;
  without an atomic claim, (b) would double-execute; without idempotent results, (c) would
  leave two committed results or a wedged `running` job.
- **MITIGATED:** (a) `enqueue.js` keys jobs by `job_id = sha256(fixture_id:seed)` and preserves
  existing records verbatim. (b) Per-job atomic claim via `mkdir` + `O_EXCL` owner file
  (`r2-runner.ts`, porting `queue-runner.ts`'s manifest protocol: tmp+rename writes, stale
  `running` -> `pending` recovery, `done` + result file = never re-run). Losers join and
  execute nothing. (c) Stale claims (dead owner pid) are reclaimed; re-execution is
  content-identical because the worker's result is a deterministic digest.
- **FIX:** The claim protocol in `r2-runner.ts` (the durable factory fix is: keep the
  `job_id` dedup at enqueue, keep `done`+result as the no-op condition, add atomic
  per-job claims wherever two dispatchers can contend).
- **TESTED:** `r2-probe-p1-dup.sh`: P1a ran real `enqueue.js` 3x (duplicate + added seed);
  P1b raced two runners; P1c killed the winner mid-worker then resumed.
- **VERIFIED:** Duplicate enqueue left the manifest byte-identical with `done` statuses
  preserved (diff clean); added seed added exactly 1 job. Race: `exec.log` has exactly 1
  line, 1 result file, job `done`, loser logged "executed nothing". Crash+resume: exactly 1
  committed result, `done`, and the re-executed digest equals the clean-run digest
  (`03cca9c9017c...` both runs). Sequential re-run of a drained queue executed nothing.
- Evidence: `work-r2/p1/` (`manifest.jsonl`, `race/exec.log`, `race/results/`, `crash/`,
  `verdict.json`).

## P2: worker crash recovery (kill -9 mid-append) : PASS 7/7

- **DETECTED:** A worker appending mission results was SIGKILLed mid-append in two ways:
  (A) deterministic torn write (half a record, fsync, self-SIGKILL at seq 37 of 60);
  (B) external `kill -9` at an arbitrary moment (seqs 1..200).
- **DIAGNOSED:** A kill landing inside `write()` leaves a partial line with no trailing
  newline. A naive resume would either choke on invalid JSON, duplicate records, or lose
  the torn record's seq.
- **MITIGATED:** Appender contract (`r2-appender.ts`): one record = one `write()` + fsync +
  close (open-by-path per record); startup always repairs the tail by truncating bytes after
  the last `\n` (atomic tmp+rename) and counting repaired bytes; resume continues from
  max committed seq + 1; a checkpoint sidecar records believed-committed seq.
- **FIX:** The contract above, proposed as the standard the factory's mission appenders
  (`missions/*/shard-*/results.jsonl`, which do not exist as code yet) must implement.
- **TESTED:** `r2-probe-p2-crash.sh`: scenario A then resume; scenario B then resume.
- **VERIFIED:** (A) rc=137, torn tail present, resume rc=0, 93 torn bytes repaired.
  Final files: scenario A = 60 records, scenario B = 200 records; independent python
  verification: every line valid JSON, seqs exactly 1..N, zero duplicates, zero gaps.
- Evidence: `work-r2/p2/` (`A/results.jsonl`, `B/results.jsonl`, `verify.log`, `verdict.json`).

## P3: corrupt cache entry (one bad digest -> detected, not trusted) : PASS 8/8

- **DETECTED:** One committed artifact's bytes were flipped mid-file (owner object
  `cw-biz-01`, 25-entry content-addressed store built from the real clearwater fixture
  with the real `lib.ts` canonical digest).
- **DIAGNOSED:** A cache that trusts bytes without re-verifying would serve corrupt data
  to every downstream consumer with a valid-looking digest.
- **MITIGATED:** Verify-on-read (`r2-cache.ts`): `sha256(bytes)` must equal the committed
  digest on every read. Mismatch -> entry moved to `quarantine/<digest>.corrupt` with a
  reason file, fresh bytes recomputed from source, committed, and only the verified fresh
  bytes served. Corrupt bytes are never returned.
- **FIX:** Verify-on-read plus quarantine as the cache's read path (matches the
  incremental harness's digest-addressed trust model).
- **TESTED:** `r2-probe-p3-cache.sh`: clean read-all, corrupt, read-all, healed read-all.
- **VERIFIED:** Exactly 1 entry detected and recomputed; quarantine holds 1 `.corrupt`
  file + 1 reason file; `recompute_calls=1`; `served_corrupt=false` across all 25 entries;
  post-heal read-all is clean with zero recomputes.
- Evidence: `work-r2/p3/` (`store/artifacts/`, `store/quarantine/`, `after.json`, `verdict.json`).

## P4: source change mid-run (re-run invalidates correctly) : PASS 5/5

- **DETECTED:** The source phone was edited (`(970) 555-0142` -> `(970) 555-0143`)
  mid-pass through a 9-node stage graph (OBJECT -> SECTION -> PAGE -> SPEC, dependency
  shape mirrored from `incremental/proof/inc_proof.py`).
- **DIAGNOSED:** Nodes processed before the edit served stale cache hits (their inputs
  still matched the pre-edit source). A single pass would commit stale digests silently.
  First probe run also exposed a real modeling bug: parent outputs did not bind child
  digests, so PAGE/SPEC digests were blind to subtree changes (fixed, see Findings).
- **MITIGATED:** The runner snapshots the source digest at pass start and re-reads it per
  node; any divergence marks the pass DIRTY and triggers validation passes to fixpoint
  against the final source. No stale digest survives in the committed baseline.
- **FIX:** Mid-pass change detection + revalidate-to-fixpoint in `r2-invalidate.ts`;
  parent outputs bind child digests.
- **TESTED:** `r2-probe-p4-invalidate.sh` with progress-synchronized edit injection.
- **VERIFIED:** Change detected (`dirtied=true`, first seen at node index 4, 3 passes to
  fixpoint). Final baseline: exactly the phone-dependent chain changed
  (`OBJECT:cw-biz-01`, `SECTION:home:hero:0`, `SECTION:home:contact:3`, `PAGE:home`,
  `SPEC:site`); the 4 unaffected nodes are byte-identical cache hits; committed baseline
  reflects the final source.
- Evidence: `work-r2/p4/` (`run-log.json` with per-node hit/recompute events, `diff.json`,
  `verdict.json`).

## P5: drop targets : PASS 5/5

- **DETECTED:** The entire results directory was `rm -rf`'d while the worker was mid-run
  (synchronized on 10 committed records, not blind sleep).
- **DIAGNOSED:** With a held-open fd, writes would go to an orphaned inode silently; with
  open-by-path, the next record hits ENOENT. Either way the pre-drop records are gone:
  the loss must be typed and the resume must not claim false completeness.
- **MITIGATED:** Per-record open-by-path -> ENOENT becomes typed exit 3 (`target_gone`),
  never silent. Resume recreates the target, compares checkpoint vs file tail, and any
  gap is written explicitly to the gaps log (`GAP_DETECTED` with expected/actual/lost).
- **FIX:** Per-record durable commits + checkpoint sidecar + explicit gap log.
- **TESTED:** `r2-probe-p5-drop.sh`: mid-run drop, typed-error proof, resume, gap unit test.
- **VERIFIED:** Worker exited 3 on the drop; unwritable target gives typed `mkdir_failed`
  at exit 3; resume converged to valid JSONL with seqs exactly 1..120 in one incarnation;
  checkpoint-ahead-of-file unit case logged `GAP_DETECTED lost=30` explicitly.
- Evidence: `work-r2/p5/` (`resume_verify.log`, `gap/results.jsonl.gaps.jsonl`, `verdict.json`).

## P6: flaky upstream (500/429/timeout/DNS) + crash mid-batch : PASS 4/4

- **DETECTED:** A 40-mission batch ran against a deterministic fault schedule (500s,
  429 with Retry-After, timeouts, DNS errors; mission 25 always fails) and the worker was
  SIGKILLed after mission 17.
- **DIAGNOSED:** Unbounded retry would storm a struggling upstream; an exhausted mission
  recorded as a crash would abort the batch; resume without skip-ahead would duplicate
  missions 1..17.
- **MITIGATED:** Bounded retries (max 3 attempts, short backoff, 429 honors Retry-After);
  exhausted missions recorded as typed `FAILED` with `error_type` (batch continues);
  resume skips already-recorded mission ids; torn-tail repair on startup.
- **FIX:** The retry/typed-failure/resume-skip policy in `r2-flaky.ts`.
- **TESTED:** `r2-probe-p6-flaky.sh`: kill mid-batch, resume to completion.
- **VERIFIED:** All 40 missions recorded exactly once; mission 25 = `FAILED`, attempts 3,
  `error_type=upstream:e500`; attempt counts match the fault schedule exactly
  (e.g. `%10==7` -> 3 attempts, `%10==3` -> 2); total upstream calls 61 (bounded, well
  under the 120 ceiling); valid JSONL throughout.
- Evidence: `work-r2/p6/` (`results.jsonl`, `verify.log`, `verdict.json`).

---

## Guarantees the factory can now claim

### GUARANTEE 1: duplicate safety

Submitting the same job twice produces exactly one execution. Three layers, each proven:

1. Enqueue layer (real `compilation/runner/enqueue.js`): `job_id = sha256(fixture_id:seed)`;
   duplicate submission adds zero manifest lines and preserves terminal statuses
   (byte-identical manifest on re-submission, proven by diff).
2. Dispatch layer (atomic per-job claim): two runners racing one pending job yield
   exactly one execution record and one result file; the loser joins and executes nothing
   (proven: `exec.log` = 1 line, 1 result file, join notice logged).
3. Completion layer: `done` + result file = never re-run; a drained queue re-run is a
   no-op (proven). Crash between claim and commit converges to exactly one committed
   result with content-identical digest (proven: digest `03cca9c9017c...` identical
   across clean and crash-resumed runs; retry visible in `attempts` accounting).

### GUARANTEE 2: crash recovery

A worker SIGKILLed mid-append resumes with zero lost and zero duplicated records, and
`results.jsonl` stays valid JSONL. Proven two ways: deterministic torn write (half a
record + SIGKILL, 93 torn bytes truncated at startup) and external `kill -9` at an
arbitrary point. Resume repairs the tail, continues from max committed seq + 1, and the
final file holds seqs exactly 1..N with every line valid JSON (independently verified in
python for N=60 and N=200). If the target itself is destroyed, the worker fails typed
(exit 3) and the resume documents the gap explicitly rather than claiming completeness.

## Findings (genuine, from probe failures)

1. **Parent stage outputs must bind child digests.** P4's first run showed PAGE/SPEC
   digests unchanged after a phone edit because their outputs did not include child
   digests. Content-addressed parents that do not bind children are blind to subtree
   changes. Fixed in `r2-invalidate.ts` (matches `inc_proof.py`'s design); re-verified.
   Any factory stage graph should assert this structurally.
2. **Chaos injection must synchronize on victim progress, never on blind sleep.**
   Two harness misses (P5's drop landing before node .ts startup; P4's edit landing
   before the pass under load) produced false passes/failures of the *harness*, not the
   mechanism. Fixed with progress markers and mid-run polling. This is now a standing
   rule for future chaos work in this lane.

## What was real vs modeled (honesty note)

- Real factory machinery exercised: `compilation/runner/enqueue.js` (P1a),
  `compilation/runner/lib.ts` canonical digest (P1b/P1c worker, P3, P4), the clearwater
  fixture bytes (P3), and the `incremental/proof/inc_proof.py` dependency shape and
  invalidation expectations (P4).
- Modeled (protocol-faithful, documented in code): `r2-runner.ts` ports
  `queue-runner.ts`'s manifest protocol because the real runner's worker is bound to the
  Pig repo's pipeline code; `r2-appender.ts` / `r2-flaky.ts` / `r2-cache.ts` /
  `r2-invalidate.ts` define the contracts the factory's mission appenders and caches
  should implement (`missions/*/shard-*/results.jsonl` appenders do not exist as code yet).
- Not proven here: real Pig-repo pipeline stages under chaos (prior attempts died on
  Pig-exec infrastructure timeouts at startup; this lane deliberately avoided that
  path), multi-host clock skew, and adversarial (non-crash) Byzantine writers.

## File inventory

- `~/workspace/fyd-factory/chaos/CHAOS-REPORT-R2.md` (this report)
- `~/workspace/fyd-factory/chaos/r2-run-all.sh` (suite runner)
- `~/workspace/fyd-factory/chaos/r2-probe-p1-dup.sh`, `r2-probe-p2-crash.sh`, `r2-probe-p3-cache.sh`,
  `r2-probe-p4-invalidate.sh`, `r2-probe-p5-drop.sh`, `r2-probe-p6-flaky.sh`
- `~/workspace/fyd-factory/chaos/r2-runner.ts`, `r2-p1-worker.ts`, `r2-appender.ts`, `r2-cache.ts`,
  `r2-invalidate.ts`, `r2-flaky.ts`
- `~/workspace/fyd-factory/chaos/work-r2/` (evidence: per-probe dirs, `verdict.json` files,
  result files, logs)

Prior-attempt artifacts (`chaos_lib.py`, `chaos_c1.py`, `chaos_c2.py`, `worker_c2.py`,
`stage.ts`, `work/`) were not modified.
