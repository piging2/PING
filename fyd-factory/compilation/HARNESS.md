# FYD Graph-Compilation Harness

Final design document. Harness version 1.2.0. Last verified 2026-09-24.

## 1. Purpose

One job starts from a fixture object graph and runs the REAL FYD pipeline:

```
generateSiteSpec -> validateSiteSpec -> render-context builder -> deterministic second compile
```

The object graph is the canonical center. Everything downstream (spec digests,
validation digests, render digests) is derived from it and bound to it by hash.
The harness measures the pipeline, it does not reimplement it.

## 2. Non-goals and hard boundaries

* Read-only against the Pig repo (`/home/nolan/projects/ping`, branch
  `fyd-factory`). The harness never modifies, commits, or writes into the repo.
  It imports repo modules and reads fixture files only.
* No external actions: no network calls, no messages, no posts, no purchases.
* Synthetic fixtures are test data. They are marked `synthetic: true` /
  `testing_only` in the corpus and must never be presented as real businesses.
* The harness is a measurement and compilation-queue system, not a publishing
  system. Compiled outputs stay in result files.

## 3. Reconciled pipeline facts (verified 2026-09-24)

These were established by direct inspection, not assumed:

* `buildRenderContext` is exported at `src/fyd/components/renderer.tsx:187`.
  It is the production render path: called by the site-serving clients
  (`src/app/build/[siteId]/build-client.tsx`,
  `src/app/sites/_shared/site-client.tsx`) and by `src/fyd/lineage/tracer.ts`.
* `buildSemanticRenderModel` (`src/fyd/sitespec/render-model.ts:100`) had no
  non-test callers. The harness uses `buildRenderContext`.
* Plain `tsx` import of `renderer.tsx` fails with `Unexpected token '.'`
  (it transitively imports `object-circle.module.css`). The worker installs a
  CommonJS `require.extensions[".css"]` stub inline. A standalone
  `--import css-hook.mjs` hook was also verified working
  (see probes below); the inline stub is used because it has fewer moving parts.
* Workers launch with `--tsconfig=/home/nolan/projects/ping/tsconfig.json`
  so `@/` alias resolution does not depend on the process CWD.

### CSS / alias probes (exact commands, run on the Pig 2026-09-24)

All run from `/home/nolan/projects/ping` with
`node_modules/.bin/tsx` (4.23.12), Node v22.23.2:

| # | Command | Result |
|---|---------|--------|
| 1 | `tsx -e "import('.../src/fyd/components/renderer.tsx')..."` | FAIL: `Unexpected token '.'` (CSS import) |
| 2 | `tsx --import /home/nolan/fyd-compile-harness/runner/css-hook.mjs -e "import('.../renderer.tsx')..."` | OK |
| 3 | `tsx --import <hook> -e "import('@/fyd/sitespec/schemas.ts')..."` | OK (tsx auto-discovers tsconfig.json from CWD) |
| 4 | `tsx --tsconfig=/home/nolan/projects/ping/tsconfig.json --import <hook> -e "import('@/fyd/sitespec/schemas.ts')..."` | OK |

The worker uses probe 4's shape (explicit `--tsconfig` + inline CSS stub).

## 4. Layout

Local (durable):

```
~/workspace/fyd-factory/compilation/
  runner/
    lib.ts           # shared: hashing, canonical JSON, mutations, metrics schema,
                     # HARNESS_VERSION, computePipelineCodeVersion
    job-worker.ts    # warm batch worker: runs the real pipeline per job
    queue-runner.ts  # queue: manifest, dispatch, finalization, resume, G1/G2
    enqueue.js       # manifest generator (fail-closed on relative pig paths)
    rollup.js        # metrics aggregation over results/*.json
    chain-proof.ts   # digest-chain liveness proof (title/phone edits)
  queue/             # manifests (local copies) + results jsonl (local copies)
  results/           # pulled result files per run
  reports/           # rollup JSON per run
  shard-fixtures/    # 50 fixtures staged for the shard runs
  HARNESS.md         # this file
```

Pig (execution):

```
/home/nolan/fyd-compile-harness/
  runner/            # pushed copies of the files above (+ css-hook.mjs)
  fixtures/pilot-fixtures/   # 10 core fixtures
  fixtures/shard/            # 50 fixtures (10 core + 40 hostile)
  queue-pilot20/ queue-killtest/ queue-shard-a/ queue-shard-b/  # manifests + locks
  results-pilot20/ results-killtest/ results-shard-a/ results-shard-b/
  results-*.jsonl    # canonical append-only terminal records
```

## 5. Job identity

`job_id = sha256(fixture_id + ":" + seed)` (hex). The `":"` separator is
deliberate: without it, fixture `a1` + seed `23` and fixture `a12` + seed `3`
would hash identically. `lib.ts:jobIdFor` and `enqueue.js` implement the same
formula; they must never diverge.

## 6. Manifest schema (v1.2.0)

One JSON object per line:

```json
{
  "job_id": "sha256 hex",
  "fixture_id": "batch-a-plumber.json",
  "seed": 7,
  "fixture_path": "/home/nolan/fyd-compile-harness/fixtures/shard/batch-a-plumber.json",
  "status": "pending | running | done | failed",
  "attempts": 0,
  "isolate": false,
  "quarantined": false,
  "publish_seq": 0,
  "done_seq": null,
  "updated_at": "iso",
  "last_error": null
}
```

* `status` has exactly four values. Quarantine is a flag
  (`status:"failed", quarantined:true`), not a fifth status. The queue selector
  never picks quarantined jobs. (Pre-1.2.0 manifests that used
  `status:"quarantined"` are migrated on read.)
* `attempts` is dispatch-based: incremented on EVERY dispatch, including the
  successful one. The worker receives the incremented attempt. Three
  dispatches without success quarantines the job.
* `publish_seq` (G2) is the input generation, incremented at claim time
  before the worker spawns. `done_seq` records the `dispatch_seq` accepted at
  publication.
* `fixture_path` must be absolute (enqueue fails closed on relative paths;
  a relative path once caused 20/20 ENOENT crashes in a pilot).

## 7. Execution model

* One runner per manifest (lock file with stale-lock takeover; `--concurrency`
  other than 1 is a fatal error). Throughput scales through independent shard
  manifests, never through concurrent writers on one manifest.
* Warm batch worker: one `tsx` process per batch (cold start ~1.5-2s
  dominates; the pipeline itself is ~1-5ms per job warm). Batch size is
  configurable; 5 was used for pilots.
* Worker protocol: the runner spawns the worker with a batch JSON file; the
  worker emits exactly one delimited `RESULT {job_id, outcome, wall_ms}` line
  per finished job on stdout. Result files are the record of truth; the
  runner ignores all other stdout.
* Result files are written atomically (temp + rename). No partial files.
* Per-job inactivity timeout: the startup allowance covers worker boot and the
  first RESULT; every parsed RESULT resets the clock. A worker quiet longer
  than `--job-timeout-ms` is SIGKILLed and its missing members are retried
  individually (`failed` + `isolate`, so one poison job never sinks a batch
  twice). There is no batch-wide timeout: a slow-but-progressing batch is
  never killed.

## 8. Idempotency, resume, and the JSONL appender contract

Kill/resume is the normal operating mode, not an edge case:

1. Claim before execute: `publish_seq` increments and the manifest marks the
   job `running` BEFORE the worker spawns.
2. One terminal record per JSONL line; single `O_APPEND` write per record.
3. Append happens BEFORE the manifest's terminal transition. A kill between
   append and mark is safe: resume re-appends, and duplicate-safe consumption
   (below) collapses it.
4. On startup the runner repairs a torn trailing JSONL record (truncates
   bytes after the last newline).
5. Consumption is duplicate-safe by `job_id`: the last valid terminal record
   wins.
6. Write failures are explicit and typed, never silent success.

Crash recovery on startup: `running` -> `pending`; `done` without a result
file -> `pending`; `done` whose result is not a CURRENT hit (section 9)
-> `pending` with a logged reason. The idempotent pre-check before every
batch adopts result files written by a dead runner's orphan worker without
re-executing them (proven in the pilot: 5 orphan-written files adopted,
20/20 checksums and mtimes identical after resume).

## 9. G1: transform code version (stale-code rejection)

`pipeline_code_version` is SHA-256 over every `.ts`/`.tsx` file under
`/home/nolan/projects/ping/src/fyd`, computed at worker AND runner startup.
It is deliberately conservative (UI-only changes force recomputation; that is
safer than stale-code hits). An unreadable source tree is fatal.

* Every emitted record binds the version it was computed under.
* The cache identity is `(job_id, pipeline_code_version, harness_version)`.
* A HIT is served only when all three match. Any mismatch demotes the job to
  `pending` and re-runs it, with a logged reason
  (e.g. `harness_version 1.1.0 != 1.2.0`).

Live proof (2026-09-24): the killtest queue's 10 `done` jobs with v1.0.0
results were demoted at startup and re-run under v1.1.0; later the pilot20
queue's 20 `done` jobs with v1.1.0 results were demoted and re-run under
v1.2.0. In both cases zero stale results were served.

Observed code version: `bec90864d8ed3b98ca352a164e60ab27fee7fcbdef2b89b152`
(prefix `bec90864d8ed`). It changes if any lane edits `src/fyd`, which is
exactly the invalidation signal it exists to provide.

## 10. G2: entity publication fence (stale-generation rejection)

Two valid concurrent generations for one job must not resolve by
last-writer-wins. The fence is compare-and-set on the input generation:

* Dispatch claims `dispatch_seq = ++publish_seq` before the worker spawns.
* The worker binds `dispatch_seq` into its result record.
* Finalization accepts a result only when harness version matches, code
  version matches, and `rec.dispatch_seq === manifest.publish_seq`.
  The accepted generation is stored as `done_seq`.
* A late write from an older generation (orphan worker, retried dispatch)
  fails the CAS: it is explicitly rejected (`stale publish rejected`), never
  marked done, never appended. The job is requeued and the next dispatch
  bumps `publish_seq` past the stale write.
* A result file is canonical for a `done` job only when
  `rec.dispatch_seq === manifest.done_seq` (verified in pilots: 0 mismatches).

## 11. G3 / P4: digest chain (honest dependency shape)

Every stage result records the digests of the child artifacts it consumed,
and each parent digest binds those child digests:

```
plan:     fixture bytes -> fixture_digest -> graph_digest
spec:     graph_digest  -> spec_digest (+ spec_digest_b; determinism
                           requires spec_digest == spec_digest_b)
validate: spec_digest   -> findings_digest = digest({spec_digest, findings})
render:   (spec_digest, graph_digest) -> render_digest
           = digest({spec_digest, graph_digest, ctx})
```

The chain is honest about what actually depends on what (established by live
proof on `batch-a-plumber.json` and `hostile-franchise-food.json`, both
`ALL CHECKS PASS`):

* Owner title is spec-visible: a title edit moves fixture, graph, spec,
  second spec, findings, and render digests.
* Phone is NOT embedded in canonical SiteSpec: a phone edit moves fixture,
  graph, and render digests, while spec and findings digests correctly stay
  stable. The graph/facts digest, not the spec digest, is the authoritative
  source-change signal. No false dependencies are invented.

Progress-synchronized fault injection (from LANE-CHAOS-R2) is standing policy:
timing-sensitive coordination synchronizes on victim progress markers (e.g.
"5 committed result files"), never on blind sleep. Polling may use bounded
waits, but the trigger is victim progress.

## 12. Metrics schema (per result record)

* `outcome`: COMPILED | COMPILED_WITH_WARNINGS | VALIDATION_FAILED |
  RENDER_FAILED | CRASH
* `failure_stage`, `error_type` (typed, e.g. `plan:load_failed`,
  `worker:job_inactivity`), `error_detail` (truncated, never a silent empty)
* `stage_ms.{plan,spec,validate,render}`, `wall_ms`: fractional milliseconds
  via `performance.now()` (warm stages genuinely run under 1ms)
* `peak_memory_bytes`: RSS high-water mark; `peak_heap_bytes` alongside
* `determinism_match`: spec_digest == spec_digest_b (two independent
  compiles of the same graph)
* `graph_rooted`: spec owner resolves into the graph (no spec without a graph)
* Counts: objects, relationships, pages, sections, warnings/errors/info,
  `unbound_claim_count` (spec claims not resolving against the graph),
  `hidden_object_count`
* `unsafe_url_count`: `javascript:`/`vbscript:`/`data:text/html:` URLs in the
  OUTPUT spec; `input_unsafe_url_count`: same census on the INPUT fixture
* `mutation_ops`: every applied mutation, recorded
* `attempts`: the dispatch attempt that produced this record
* `fixture_digest`, `graph_digest`, `spec_digest`, `spec_digest_b`,
  `findings_digest`, `render_digest` (section 11)
* `pipeline_code_version`, `harness_version`, `dispatch_seq` (sections 9, 10)

The compilation envelope is the record itself:
`{graph_digest, spec_digest, ...}`. No canonical `FYDSiteSpec` graph-digest
property was found in the repo, and none is invented; the harness envelope
carries the invariant without changing Pig schema.

## 13. Mutations (deterministic, seeded; seed 0 = baseline)

Seeded RNG (`mulberry32`); every op recorded on the record:

1. Shuffle object/relationship insertion order (the generator sorts by id,
   so this must be a no-op on output digests).
2. Drop optional fields (descriptions, non-phone fields).
3. Duplicate a service-like public object, plus its inbound relationships
   with deterministic IDs (`<rel-id>-dup-<seed>`), so the duplicate is
   reachable exactly the way the original was.
4. Hostile injection on the PUBLIC BUSINESS object (not just objects[0], so
   unsafe website/hours values land where the projection reads them):
   `javascript:` website, RTL override in description, conflicting hours.

## 14. Pilot evidence (2026-09-24)

### Pilot A: exactly-20 kill/resume (harness v1.1.0)

* 10 fixtures x seeds {0,7} = 20 jobs.
* Fault injection synchronized on victim progress: killed with SIGKILL after
  exactly 5 committed result files (checksums snapshotted), mid-queue at
  15 done / 5 pending. (An earlier attempt failed honestly: relative fixture
  paths caused 20/20 ENOENT crashes and the kill landed after a fast drain.
  enqueue now fails closed on relative `--pig-fixtures-dir`.)
* A dead runner's orphan worker finished the last 5 files post-kill.
* Resume: the idempotent pre-check adopted the 5 orphan files without
  re-executing them. Final: 20 done, 20 unique job_ids, 20 result files,
  20/20 sha256 checksums AND mtimes identical pre/post resume (zero rewrites),
  results.jsonl 20 lines / 20 unique job_ids, all bound to
  `pipeline_code_version=bec90864d8ed`, all `dispatch_seq == done_seq`.

### Pilot B: 40-job queue with G1 demotion (v1.0.0 -> v1.1.0)

* 40 jobs; 10 done with v1.0.0 results when the runner was killed mid-queue.
* Resume under v1.1.0: startup demoted all 10 stale dones with logged
  reasons (`harness_version 1.0.0 != 1.1.0`), re-ran them, drained 40 done.
* Final: 40/40 COMPILED, one code version, one harness version, 0 stale
  served. (This queue's first run predated results-jsonl wiring, so its jsonl
  holds exactly the 40 v1.1.0 terminal records.)

### Pilot C: v1.2.0 re-run of pilot A

* All 20 v1.1.0 dones demoted (`harness_version 1.1.0 != 1.2.0`) and re-run.
* 20/20 COMPILED, `dispatch_seq=2` (second generation), `attempts=1` on all
  (dispatch-based accounting), 0 determinism mismatches, chain complete,
  0 output unsafe URLs, stage latencies p50: plan 1.02ms, spec 0.48ms,
  validate 0.09ms, render 0.49ms.

### Rollup reports (local)

* `reports/pilot20-rollup.json` (v1.1.0 kill/resume evidence)
* `reports/killtest-rollup.json` (40-job G1 demotion evidence)
* `reports/pilot20-v12-rollup.json` (v1.2.0 evidence)

## 15. Shard plan: 2 workers, 500 jobs each, deterministic

* 50 fixtures: 10 validated core (4 batch-A trades, 4 batch-B, Clearwater
  plumbing demo, professional consultancy) + 40 hostile corpus fixtures
  (all marked synthetic/testing_only).
* Shard A: 50 fixtures x seeds 0-9 = 500 jobs.
  `queue/manifest-shard-a.jsonl` (staged on the Pig at
  `queue-shard-a/manifest.jsonl`).
* Shard B: 50 fixtures x seeds 10-19 = 500 jobs.
  `queue/manifest-shard-b.jsonl` (staged at `queue-shard-b/manifest.jsonl`).
* Zero job_id overlap between shards (verified: 500 + 500 unique, 0 shared).
* One warm worker per shard; independent manifest + results dir per shard
  (`results-shard-a/`, `results-shard-b/`, `results-shard-a.jsonl`,
  `results-shard-b.jsonl`). No cross-shard coordination needed because job
  identity includes fixture ID and seed.
* 1,000 jobs toward the 5,000-job target. Remaining 4,000: shards C-F on the
  same pattern (seeds 20-29, 30-39, 40-49, 50-59) once A/B validate.

Launch (one per shard, independent shells):

```bash
cd /home/nolan/projects/ping
node_modules/.bin/tsx --tsconfig=/home/nolan/projects/ping/tsconfig.json \
  /home/nolan/fyd-compile-harness/runner/queue-runner.ts \
  --manifest /home/nolan/fyd-compile-harness/queue-shard-a/manifest.jsonl \
  --results-dir /home/nolan/fyd-compile-harness/results-shard-a \
  --results-jsonl /home/nolan/fyd-compile-harness/results-shard-a.jsonl \
  --runner-dir /home/nolan/fyd-compile-harness/runner \
  --job-timeout-ms 120000 --concurrency 1 --batch-size 10 --stall-ms 2000
```

(Shard B identical with `-b` paths.)

Expected per-shard wall time: ~500 jobs at ~2ms warm + worker startups
(~2s per batch of 10 = ~100s) + stalls. Order of minutes, not hours.

## 16. Known limits and next steps

* The transform code version is conservative: any `src/fyd` edit invalidates
  all cached results. Correctness first; a finer dependency map is future work.
* Hostile fixtures may produce VALIDATION_FAILED/RENDER_FAILED/CRASH
  outcomes by design; the failure taxonomy in rollup.js reports them honestly.
* G2's late-file-overwrite question: an orphan worker can still write a
  result file after terminal publication, but the file is never served
  (CAS on `dispatch_seq == done_seq` fails) and the next startup scan
  detects the mismatch. A dedicated two-generation race proof with progress
  synchronization is still queued.
* Torn-tail JSONL repair and duplicate-safe consumption are implemented and
  code-reviewed; a dedicated torn-write kill proof is still queued.
* Typecheck: `scratch/typecheck.sh` is strict and preserves tsc's real exit
  code (`set -o pipefail`; an earlier version masked failures through `head`).
