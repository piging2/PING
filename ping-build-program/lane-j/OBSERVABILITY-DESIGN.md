# Lane J — Run Observability Design

**Status:** design v1 + working prototype in `prototype/`.
**Question it answers:** WHY DID FYD CHANGE, without reading logs manually.
**Constitutional position:** connector data is OBSERVATION. Run records are
OPERATIONAL metadata about how observations were acquired. They live in the
operational store and link INTO the canonical event spine; they never enter
it. (Phase0 forensics is still open; the default holds unless Phase0 rules
run records belong in the spine, which would contradict the spine's
source-truth semantics, so the default is expected to stand.)

## 1. What PING already has (reuse, never duplicate)

| Exists | Where | Lane J reuses it how |
|---|---|---|
| Fetch lifecycle + terminal states (NOT_STARTED/STARTED/SUCCEEDED/FAILED/OUTCOME_UNKNOWN), `fetch_attempt_id`, checkpoint = highest CONTIGUOUS watermark, opaque provider watermarks, typed FULL_RESYNC, idempotency keys, failure taxonomy list, provenance envelope, cost/rate governor | lane BCQ contract (v1.0 draft), `src/fyd/acquisition/acquisition-adapter.ts` | Run records CONSUME these IDs and states. Lane J defines no new fetch states, no new checkpoint semantics, no new taxonomy codes. |
| JSONL-append audit pattern: env-configurable dir, fail-soft writes, sink hook for tests, no secrets in the log, redact helper | `src/fyd/identity/audit.ts` | The run ledger uses the identical write pattern. Same failure philosophy: a ledger write never fails the run. |
| Lineage walk SOURCE BYTES -> OBSERVATION -> EVIDENCE -> OBJECT FIELD -> SITESPEC BINDING -> RENDERED CLAIM -> ASK FYD ANSWER | `src/fyd/lineage/tracer.ts` (lane N) | Run records store the join keys (`observation_ids`, `evidence_refs`, `claim_ids`). Lane J never re-implements lineage; `why_changed` queries hand off to lane N's tracer at the observation boundary. |
| Temporal diff (added/removed/changed with before/after claims), conflict records, dependency index object -> sections, snapshot store | `src/fyd/refresh/` (diff.ts, conflict.ts, dependency-index.ts, snapshot-store.ts) | Change lists and conflict lists in the RunRecord reuse these record shapes. |
| Constitutional dashboard metrics | `src/lib/metrics.ts` | Different job. No overlap; lane J does not touch it. |

**Gap confirmed by read-only search:** `src/fyd/refresh/run-t2.ts` runs an
observation pass, persists snapshots, prints a JSON report to stdout, and
records nothing durable about the run itself. The run is not a first-class
object anywhere in PING. That is the hole lane J fills.

**Ecosystem verdict:** OpenTelemetry evaluated, REJECTED for the run ledger.
Kill reasons: (a) weight dwarfs value (SDK + collector for an append-only
ledger); (b) OTel answers "how slow / how often", not "which run changed
this field and why"; (c) spans cannot join run -> observation -> lineage
without a parallel identity system, which would duplicate lane N. If PING
later needs request tracing across services, OTel can sit above this ledger;
the ledger's run_id is a valid trace correlation key. Import decision: NONE.
Code we do not need to write: a tracing backend.

## 2. RunRecord schema (v1)

One JSON object per connector/ingestion run. Field names are snake_case to
match the JSONL house style (`audit.jsonl` uses `at`, `event`, `identityId`;
the ledger uses full snake_case for new fields and keeps `at` for the write
timestamp).

```jsonc
{
  "schema": "ping.run_record/v1",
  "run_id": "run-website-20260923-0042",
  // deterministic: connector + date + per-(connector,tenant) sequence.
  // NOT random: replayable, sortable, gap-detectable (see section 7).

  "at": "2026-09-23T19:40:02.118Z",        // ledger write time (writer clock)
  "connector_id": "website",
  "connector_version": "0.3.1",
  "tenant_id": "t_happy_place",
  "principal": "platform-operator",        // who authorized this run
  "trigger": "routine-poll",
  // routine-poll | owner-requested | freshness-triggered | reconciliation
  // | backfill | manual | webhook

  "started_at": "2026-09-23T19:39:41.002Z",
  "finished_at": "2026-09-23T19:40:01.940Z",
  "duration_ms": 20938,                   // measured locally, not derived
  "status": "SUCCEEDED",
  // SUCCEEDED | PARTIAL | FAILED | OUTCOME_UNKNOWN | ABORTED
  // PARTIAL: some streams failed, checkpoint advanced on contiguous wins.

  "checkpoint_in": "etag:W/\"a91f\"",
  "checkpoint_out": "etag:W/\"c44b\"",
  "checkpoint_verified": true,             // pure-function check, section 7
  "resync": false,                         // true only on typed FULL_RESYNC

  "streams": [
    {
      "stream_id": "pages",
      "mode": "incremental",               // full_refresh | incremental | webhook | poll
      "records_read": 3,
      "records_emitted": 3,
      "checkpoint_out": "etag:W/\"c44b\""
    }
  ],

  "observations": {
    "discovered": 14,                     // claims extracted from source bytes
    "emitted": 14,                        // passed sanitization, entered pipeline
    "accepted": 12,                       // became evidence (new or confirming)
    "rejected": 1,                        // failed a gate; see rejections[]
    "unchanged": 11,                      // accepted but matched current state
    "changed": 1                          // accepted and altered an object field
  },

  "rejections": [
    {
      "observation_id": "obs-website-2026-09-23T19-39-44-001Z",
      "claim_id": "9f2ac41d0b77e1c3",
      "code": "SCHEMA_CHANGED",            // lane-K FAILURE-TAXONOMY v1.0.0 (closed set, imported from taxonomy.mjs)
      "detail": "field 'hours' arrived as nested object, schema expects string; quarantined with raw payload",
      "evidence_ref": "sha256:7d3a…"       // raw payload kept, never dropped
    }
  ],

  "changes": [
    {
      "observation_id": "obs-website-2026-09-23T19-39-44-002Z",
      "claim_id": "b81e02ff77aa19c4",
      "entity_id": "biz_happy_place",
      "field": "hours",
      "kind": "changed",                   // added | removed | changed
      "before": "Mon-Fri 8am-5pm",
      "after": "Mon-Fri 7am-6pm, Sat 8am-12pm",
      "before_event_id": "evt_9c21…",       // canonical spine links (when mapped)
      "after_event_id": "evt_a77e…",
      "confidence": "DIRECT"
    }
  ],

  "conflicts": [
    {
      "entity_id": "biz_happy_place",
      "field": "phone",
      "sources": ["website", "facebook"],
      "status": "open",
      "surface_text": "Website says (555) 010-2030; Facebook says (555) 010-7741."
    }
  ],

  "fetch_attempts": [
    {
      "fetch_attempt_id": "fa-20260923-0042-001",
      "seq": 1,                            // ordering key independent of clock
      "url": "https://happy-place-platform.vercel.app/",
      "terminal_state": "SUCCEEDED",       // BCQ vocabulary
      "taxonomy_code": null,               // set only on FAILED / OUTCOME_UNKNOWN
      "http_status": 200,
      "bytes": 48210,
      "duration_ms": 812,
      "retries": 0,
      "watermark_seen": "etag:W/\"c44b\"",  // feeds the contiguity check
      "rate_limited": false
    }
  ],

  "rate_limits": {
    "provider_calls": 3,
    "quota_units": 3,
    "limited": false,
    "retry_after_hits": 0,
    "budget_remaining_pct": 97.4
  },

  "bytes": { "inbound": 48210, "stored_raw": 48210 },
  "cost": { "usd": 0.0, "quota_cost": "3 page fetches" },
  "ai_tokens": {
    "input": 0, "output": 0, "model": null,
    "purpose": null                        // e.g. "extraction", "classification"
  },

  "errors": [
    // every error carries exactly one lane-K taxonomy code. Empty on success.
    // { "code": "TIMEOUT", "message": "…", "recoverable": true, "attempt_ref": "fa-…" }
  ],

  // Links INTO canonical truth (never duplicated into the record):
  "observation_ids": ["obs-website-…-001Z", "obs-website-…-002Z"],
  "evidence_refs": ["evt_9c21…", "evt_a77e…"],

  // Tamper-evidence + provenance of the record itself:
  "run_digest": "sha256:…",               // over canonical JSON minus this field
  "writer": { "name": "ping-run-ledger", "version": "1.0.0", "host": "pig-wsl" },
  "prior_ledger_gap": false,               // true if a seq number is missing (section 7)
  "clock_skew_detected": false
}
```

**Secrets rule (lane L boundary):** the record carries counts, never
credentials, tokens, cookies, emails, or raw PII. URLs are fetch targets,
not secrets. The `redactEmail`-style helper applies to any free-text detail
field.

**What the record does NOT carry:** full raw payloads (they live in the raw
byte store, referenced by `evidence_ref` content hash), full claim bodies
(the observation store owns those), or rendered site content (lane O's
dependency index owns the invalidation mapping). The RunRecord is an index
card with verifiable summaries and pointers, not a second copy of the world.

## 3. Storage placement

- **Operational store, not the canonical spine.** Path:
  `<FYD_DATA_DIR>/runs/runs.jsonl`, one canonical-JSON line per finished run,
  appended with the `audit.ts` pattern (mkdir -p, appendFileSync, fail-soft,
  sink hook for tests). Env override `PING_RUNS_DIR`, default
  `./data/fyd-runs`.
- **Atomicity:** the writer appends exactly once, at run finish. There are no
  partial lines. A run that dies mid-flight leaves NO line; the next run for
  the same (connector, tenant) detects the sequence gap and sets
  `prior_ledger_gap: true` (section 7).
- **No separate index file.** The reader builds its index in memory on load
  (runs/day volumes make this trivial; rollup files bound the hot set, see
  section 5). An index file that can drift from the log is a second source
  of truth we refuse to own.
- **Writer is O(1) per run.** Gap detection reads the ledger only on cold
  start; a process-local sequence cache (keyed dir|connector|tenant) makes
  every subsequent `beginRun` file-read-free, updated after each append
  (prototype, measured: 5,020 runs in 1.1s, 0.22ms/record). Caveat:
  two writer processes sharing one ledger dir need an atomic sequence
  issuer (lock or single writer); the standing design is a single-writer
  scheduler, and the reader always reads the file, never the cache.
- **Raw payloads** stay in the existing raw byte store keyed by content hash
  (`evidenceHash` in `AcquiredObservation`). The run record references them;
  it never embeds them.
- **Join contract (proposed to lanes N/BCQ):** observations carry `run_id`;
  the RunRecord carries `observation_ids`. The join is a lookup in both
  directions. Canonical event IDs go in `evidence_refs` once Phase0 maps the
  authority; until then the field holds observation-derived refs and the
  schema version stays v1.

## 4. Query surface (minimal, sufficient)

Implemented in the prototype as `runq` (`prototype/runq.mjs`). Five queries,
no more, each answering one operator question:

1. **`runs({connector_id, tenant_id, from, to, status})`**
   Runs by source + time. Answers: "what has the website connector done this
   week?" Returns run_id, trigger, status, started/finished, counts, cost.

2. **`changes(run_id)`**
   What changed in run X. Returns the `changes[]` list with before/after,
   entity, field, confidence, and the canonical event links.

3. **`why_rejected(observation_id)`**
   Why was observation Y rejected. Returns the rejection entry: taxonomy
   code, human detail, and the `evidence_ref` to the quarantined raw payload.
   A rejection with no entry is itself a defect the verifier flags.

4. **`cost({connector_id, from, to, group_by})`**
   Cost / tokens / bytes by source over time. Sums `cost.usd`,
   `ai_tokens.input/output`, `bytes.inbound`, `rate_limits.provider_calls`,
   grouped by day (default) or connector. Feeds lane M's budget watch.

5. **`why_changed(entity_id, field, at?)`**
   WHY DID FYD CHANGE. Resolution order: (a) find the latest RunRecord whose
   `changes[]` touches (entity, field); (b) return the run summary + the
   change entry (before/after, confidence, trigger); (c) hand the
   `observation_id` to lane N's lineage tracer for the full
   source -> rendered-claim walk; (d) hand the (entity, field) to lane O's
   dependency index for the regenerated sections. Lane J owns (a)+(b); it
   calls, never re-implements, (c)+(d).

All five are pure functions over the JSONL file. No server, no database, no
new infrastructure. If query volume ever demands it, the same functions run
against the rollup files with identical shapes.

## 5. Sampling, rollup, retention

High-frequency sources (webhooks, tight pollers) must not drown the store.
Policy:

- **Hot tier (0-90 days):** full RunRecords, queryable by all five queries.
- **Heartbeat collapse:** a run with `changed == 0`, `conflicts == []`,
  `errors == []`, and status SUCCEEDED is a heartbeat. Heartbeats collapse
  per (connector, tenant, hour) into one rollup line:
  `{run_ids: [first…last], count, bytes_inbound_sum, ai_tokens_sum,
  cost_sum, duration_ms_min/max/avg, checkpoint_in_first, checkpoint_out_last}`.
  Only runs with changes, conflicts, errors, or non-success status keep full
  records past collapse. Collapse is a pure function of raw records, rerun
  any time.
- **Warm tier (90 days - 13 months):** per (connector, tenant, day) aggregates
  with the same shape as heartbeat lines, plus retained full records for any
  run that changed, conflicted, or errored. Raw heartbeat lines demoted to
  cold.
- **Cold tier (13+ months):** per (connector, tenant, month) aggregates kept
  indefinitely. Nothing is ever deleted: evidence is immutable, and the
  ledger is evidence about evidence. "Retention" here means query-tier
  demotion, not erasure.
- **Budgets:** sustained >10k runs/day from one connector triggers an
  operator alert via lane M (health signal, not a J-side kill switch). The
  ledger never drops a run to save space; it collapses heartbeats.

## 6. Worked example: the hours change

Business: Happy Place Carpentry (`biz_happy_place`), website connector,
routine 6h poll.

1. **Run.** `run-website-20260923-0042` starts, `checkpoint_in =
   etag:W/"a91f"`. Three page fetches, all SUCCEEDED. Extraction finds 14
   claims; 12 accepted, 11 unchanged, 1 changed, 1 rejected (SCHEMA_CHANGED,
   hours arrived nested on a sub-page; quarantined).
2. **Change.** The `hours` claim normalizes to "Mon-Fri 7am-6pm, Sat
   8am-12pm", differing from the current "Mon-Fri 8am-5pm". Diff emits
   kind=changed with before/after. Observation `obs-website-…-002Z`
   accepted with confidence DIRECT (provider asserts about itself).
3. **Checkpoint.** Contiguous success across all attempts;
   `checkpoint_out = etag:W/"c44b"`, `checkpoint_verified = true`.
   `run_digest` computed; single atomic append to `runs.jsonl`.
4. **Answer time.** Operator (or Ask FYD audit view) asks: why did the
   site's hours change? `why_changed("biz_happy_place", "hours")` returns:
   run-website-20260923-0042, routine-poll, 2026-09-23 19:39 UTC, change
   entry (before/after), observation_id, evidence_refs to the canonical
   events. The observation_id hands to lane N's tracer, which walks source
   bytes -> rendered claim; the (entity, field) hands to lane O's dependency
   index, which names the regenerated sections/pages. Total path:
   run record -> observation -> lineage -> regen targets. No log reading.

The prototype (`prototype/demo.mjs`) replays exactly this scenario against
synthetic data and prints the `why_changed` answer.

## 7. Red-team

### 7a. A run that lies about its checkpoint
Threat: a buggy or compromised writer records `checkpoint_out` beyond what
its attempts actually achieved, causing the next run to skip records.

Defense, two layers:
1. **Tamper-evidence, not tamper-proof.** `run_digest` is sha256 over the
   canonical record. It proves the record was not altered AFTER writing; it
   does not prove the writer told the truth. Stated honestly: the digest
   binds the writer to its claims.
2. **Self-verifying records.** `verifyRunRecord(record)` is a pure function
   that recomputes, from `fetch_attempts[]` alone, the highest contiguous
   watermark using BCQ's contiguity rule (attempts ordered by `seq`;
   checkpoint advances only past contiguous SUCCEEDED attempts carrying
   watermarks; a FAILED/OUTCOME_UNKNOWN attempt stops advancement; attempts
   after a gap do not count). If the recomputed watermark !=
   `checkpoint_out`, the verdict is `CHECKPOINT_INCONSISTENT` and the record
   is quarantined for operator review; downstream schedulers must treat its
   checkpoint as untrusted and re-derive from attempts or re-run.
   A liar is caught by its own evidence because the attempts list is the
   finer-grained truth. The prototype includes a lying run and the verifier
   flags it.

Residual risk: a writer that fabricates BOTH attempts and checkpoint
consistently. Mitigation is out of lane J's scope (writer runs inside the
PING trust boundary; lane L's capability model and code review own writer
integrity). Recorded here so the boundary is explicit.

### 7b. Clock skew
Threat: writer host clock jumps; `finished_at < started_at`, or attempt
timestamps fall outside the run window, corrupting duration-based queries
and "latest run" ordering.

Defense:
- `duration_ms` is measured with a monotonic clock at the writer and stored,
  never derived from wall timestamps. Wall timestamps are labels; durations
  are measurements.
- Ordering uses (`started_at`, `run_id` sequence), not wall clock alone.
  The per-(connector,tenant) sequence in `run_id` is assigned by the
  scheduler/ledger, monotonic regardless of clock.
- The verifier flags `clock_skew_detected` when: `finished_at <
  started_at`, any attempt timestamp outside [started_at - 60s,
  finished_at + 60s], or `duration_ms` disagrees with the wall delta by
  more than 2x. Flagged records stay queryable; skew is a field, not a
  rejection. The prototype includes a skewed run; the flag fires.

### 7c. A run record write that fails mid-run
Threat: disk full, permission loss, or crash between run finish and ledger
append. The run happened; the ledger does not know. Silent forensics hole.

Defense (matches the `audit.ts` house philosophy: ledger writes never fail
the run):
1. The writer appends exactly once, at finish. No partial lines exist by
   construction: a torn write is either a complete line or nothing (single
   `write(2)` under PIPE_BUF for typical sizes; larger records go through
   write-temp-then-rename in the production writer).
2. On write failure the writer emits to a sidecar
   `ledger-write-failures.jsonl` (same dir) and to stderr, then returns
   failure WITHOUT failing the run. The run's observations and evidence
   are already durable; only the index card is missing.
3. **Gap detection closes the hole.** `run_id` carries a per-(connector,
   tenant) sequence. Every new run's builder asks the ledger for the last
   sequence; a missing sequence sets `prior_ledger_gap: true` on the new
   record and the reader's `runs()` surfaces gaps explicitly. A missing run
   is therefore a visible, queryable fact, not a silent absence. The
   prototype simulates a dropped write and the next run flags the gap.

What lane J does NOT do: retry the write forever, block the run on the
ledger, or invent a distributed transaction. The ledger is an index, and a
detectable gap beats a blocking write.

## 8. Decisions, kill criteria, optionality

- **Adopted:** house JSONL-append ledger pattern from `src/fyd/identity/audit.ts`
  (fail-soft, env dir, sink hook, no secrets). Mechanism proven in-repo.
- **Adopted:** BCQ fetch states, checkpoint semantics, taxonomy list,
  idempotency keys, provenance envelope. Lane J adds no vocabulary.
- **Rejected:** OpenTelemetry for the run ledger (weight, wrong question).
  Rejected: a second event authority (Phase0 owns the question; J links in).
  Rejected: a separate index DB/file (drift risk; reader builds the index).
  Rejected: embedding raw payloads in run records (duplication; hash refs).
- **Kill criteria for any future dependency here:** license incompatible with
  PING's use; requires canonical authority over events or objects; cannot
  preserve the observation -> run join; weight dwarfs the five queries.
- **Optionality test:** can we replace the JSONL file with SQLite/Postgres
  later, add a new connector, rebuild the rollup, trace any result to
  evidence? Yes to all: the writer/reader/verifier are pure functions over
  line-delimited JSON; storage is a replaceable sink behind the
  `RunLedgerWriter` interface in the prototype.
- **What other lanes must do (integration requests filed in STATE.md):**
  BCQ: `run_id` on the acquisition seam; N: confirm the observation <->
  run join field; K: taxonomy v1.0.0 ADOPTED (prototype/taxonomy.mjs imports the 13 classes from one module; writer enforces, verifier re-checks); M:
  read run summaries instead of duplicating them.
