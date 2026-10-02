# LANE 16: GITHUB INTELLIGENCE — Mechanisms for Agent Execution Durability

Wave 1, PING Autonomy Grand Challenge. Research / falsification / harvest only.
No implementation code.

RESTORATION: this file restores the original 2026-09-24 harvest of 12 mechanisms.
An off-brief duplicate worker overwrote the original with an unrelated report
(riverqueue, go-redsync, in-toto, kombu); that content is entirely discarded here.
Re-harvest date: 2026-09-23/24. Every mechanism below was re-verified in actual
source, cloned fresh, at the pinned HEAD SHAs listed. This re-harvest covers only
the 12 accepted mechanisms; the 23 rejections in the original report were not
re-derived and are NOT restored (they would require re-running the harvest funnel,
not reconstruction from memory).

Pinned SHAs are HEAD commits at read time. They pin the lineage of each mechanism
(the code that proves the mechanism exists), not a vendored dependency.

Reuse grades used:
- DIRECT_REUSE: license permits copying and the mechanism is test-covered and
  self-contained.
- ADAPT: license permits copying but the mechanism needs shaping, has a known
  unproven gap, or carries a caveat.
- PATTERN_ONLY: do not copy code (license forbids it, or the fit is loose); re-
  implement the pattern from the description.

## Source repos

| Mechanism | Repo | HEAD SHA (read 2026-09-23/24) | License |
|---|---|---|---|
| M1, M2, M3 | github.com/agent-ship/agent-ship | 16f42960a29b5e4ce141d745a4416ceb87d3bfe1 | Apache-2.0 (LICENSE file verified) |
| M4, M5, M10 | github.com/balyakin/pgrelay | 7608ac3ca126dc06c3420fafdcbc69e327978362 | MIT (LICENSE file verified) |
| M6, M7 | github.com/robertziel/python_workflows_queue | cc5a9bbff87f025c1e1cc59f5352d410810277d5 | AGPL-3.0 (LICENSE file verified; the README's MIT badge is stale) |
| M8, M9 | github.com/davccavalcante/alkaline | 1a3f8077b3e49a76e3130b404201120f97b482c1 | Apache-2.0 (LICENSE file verified) |
| M11 | github.com/ercross/recond | f54e73346bef9c75359278362e33559dd28e343c | MIT (LICENSE file verified) |
| M12 | github.com/shivay00001/merkle-dag-store | 4e0ff38b1370c24ef95a677e32f35f2268162327 | MIT (declared in pyproject.toml; no LICENSE file present in repo) |

---

## M1. Deterministic tool-idempotency key

REPO: agent-ship/agent-ship (Apache-2.0)
SOURCE: packages/agentship-core/src/agentship/primitives/idempotency.py
SYMBOLS: idem_key(thread_id, node_id, tool_name, args), canonical_json, _FIELD_SEP

sha256 of thread_id, node_id, tool_name, and canonical_json(args) joined with the
ASCII Unit Separator (\x1f). canonical_json uses json.dumps with sort_keys=True,
compact separators, ensure_ascii=True, so the key is stable across argument key
order and byte-identical across processes and workers. The module docstring states
this is the ONE shared formula: the checkpoint tool_ledger and the durable
tool_idempotency_keys table both look up by the byte-identical value, so a resumed
or reclaimed run never re-fires a tool side effect.

TESTS: packages/agentship-core/tests/test_idempotency.py, 17 tests, including
test_stable_across_arg_key_order, test_no_field_boundary_collision,
test_deterministic_over_many_runs, test_matches_the_documented_formula.

REUSE: DIRECT_REUSE. Pure function, no I/O, no clock, no model.

## M2. Write-ahead intent ledger with verify-on-resume

REPO: agent-ship/agent-ship (Apache-2.0)
SOURCE: packages/agentship-core/src/agentship/primitives/idempotency.py
SYMBOLS: LedgerEntry (status "pending" | "done"), IdempotencyLedger (lookup/record
protocol), DictLedger, call_once

call_once(ledger, key, fn, idempotent): unseen non-idempotent call writes
LedgerEntry(status="pending") BEFORE the side effect fires (the write-ahead), then
records "done". On resume, a "pending" entry NEVER re-fires blindly; it calls
fn.verify() to check whether the side effect already landed, records "done" with
the verified result, and returns it. A recorded "done" entry returns the stored
result without calling fn at all. If fn raises, the "pending" marker survives so a
later resume takes the verify path.

TESTS: packages/agentship-core/tests/test_idempotency.py includes
test_write_ahead_records_pending_before_side_effect,
test_pending_entry_verifies_not_refires,
test_crash_between_write_and_ledger_then_resume_verifies.

REUSE: ADAPT. Their own docs flag the end-to-end proof as unproven: the
conformance matrix marks the durable-resume cell explicitly xfail,
conformance/test_engine_conformance.py,
test_durable_resume_after_kill with
@pytest.mark.xfail(reason="P11: durable resume", strict=False, run=False). The
unit-level mechanism is test-covered; the full kill-and-resume loop is not.

## M3. Single-owner advisory lock

REPO: agent-ship/agent-ship (Apache-2.0)
SOURCE: packages/agentship-core/src/agentship/thread_lock.py
SYMBOLS: ThreadLock (async context manager), advisory_key, InMemoryThreadLock,
resolve_thread_lock

Session-level Postgres advisory lock held on its own dedicated connection
(autocommit=True), acquired non-blocking with SELECT pg_try_advisory_lock(%s).
The (tenant_id, thread_id) pair maps to a signed 64-bit int via blake2b digest
(digest_size=8, big-endian signed), because Postgres advisory-lock functions
take a bigint; the fields are joined with \x1f so ("a","bc") and ("ab","c") can
never collide into one lock key. A losing worker fails fast with ThreadBusyError
rather than stalling. Released with pg_advisory_unlock plus connection close on
exit. Explicitly NOT a transaction-level xact lock and NOT the checkpointer's
connection, because a xact lock spanning a whole run would defeat checkpoint-
per-node durability. resolve_thread_lock gives the PG lock when a conninfo is
configured and the in-process fallback otherwise.

TESTS: packages/agentship-core/tests/test_thread_lock.py, including
test_second_acquire_same_thread_raises_busy,
test_lock_is_independent_of_other_connections,
test_no_field_boundary_collision.

REUSE: DIRECT_REUSE. Both phases (P02 checkpointing, P09 durable /tasks) consume
this single module; there is no second lock implementation in the repo.

## M4. SKIP LOCKED multi-queue claim with atomic lease stamp

REPO: balyakin/pgrelay (MIT)
SOURCE: src/pgrelay/repositories/job_sql.py
SYMBOL: claim_jobs_statement()

One statement does it all: lock the target queues (FOR UPDATE on pgrelay_queue),
compute free slots per queue from concurrency_limit minus current leased count,
pick pending jobs per queue with FOR UPDATE OF j SKIP LOCKED ordered by
priority DESC, available_at, created_at, then UPDATE the picked rows to
status='leased' with locked_by=worker_id, locked_until=now()+lease, and
attempt_count+1, RETURNING the claimed rows. The claim, the lease stamp, and the
attempt increment are atomic: no two workers can see the same row.

TESTS: tests/test_claim.py (8 tests).

REUSE: ADAPT. Postgres-specific SQL text (SQLAlchemy text() clause); the claim
shape (queue locking plus concurrency slots) is pgrelay's, so the statement must
be reshaped to PING's own job schema rather than copied verbatim.

## M5. Expired-lease recovery sweep with attempt history

REPO: balyakin/pgrelay (MIT)
SOURCE: src/pgrelay/repositories/job_sql.py
SYMBOL: RECOVER_EXPIRED_LEASES_SQL

One CTE: picks leased rows whose locked_until < now() (FOR UPDATE SKIP LOCKED),
re-queues them to status='pending' (or 'dead_letter' when attempt_count hit
max_attempts), clears locked_by/locked_until, stamps last_error_type and
last_error_message with 'lease_expired', and INSERTs a pgrelay_attempt row per
recovered job with status 'lease_expired' recording worker_id, attempt_number,
and the expired lease timestamp. The sweep both re-queues dead-worker jobs and
writes the attempt history that makes the recovery auditable.

TESTS: tests/test_worker_process_recovery.py,
test_killed_worker_process_http_job_is_recovered: starts a real worker
subprocess, waits for the first HTTP request, calls process.kill() on it
(SIGKILL on POSIX), waits past lease expiry, starts a second worker, and asserts
the job reaches "succeeded". This is the SIGKILL-proven recovery test. Also
tests/test_expired_lease.py.

REUSE: ADAPT. Lease durations, batch sizes, and the attempt-history schema are
pgrelay's; the sweep shape (reclaim expired leases, write attempt record) is the
reusable part.

## M6. Scoped lease renewal daemon

REPO: robertziel/python_workflows_queue (AGPL-3.0)
SOURCE: queue_workflows/claim_worker.py (class LeaseRenewer); queue_workflows/ingest_store.py (renew_ingest_lease)
SYMBOLS: LeaseRenewer.start/_renew_once, renew_ingest_lease

A daemon thread pushes lease_expires_at out every interval while a job runs. The
renew UPDATE is scoped to WHERE id = %s AND claimed_by = %s AND status =
'running', so a renew can never clobber a row that a reclaim sweep handed to a
different worker: if the row is no longer mine, rowcount is 0 and the renew
silently stops extending. The class docstring states the invariant verbatim:
"Scoped to id AND claimed_by so a reclaim that handed the row to another worker
is NOT clobbered." Ingest jobs go through the same scoping via
ingest_store.renew_ingest_lease; the table name is validated against a fixed
allowlist.

TESTS: tests/test_node_queue_lease.py, tests/test_lease_reclaim_sweep.py.

REUSE: PATTERN_ONLY. AGPL-3.0 forbids copying into PING's codebase; re-implement
the scoped-renew invariant (id plus claimed_by in the WHERE clause) from this
description.

## M7. Dead-worker supervisor daemon

REPO: robertziel/python_workflows_queue (AGPL-3.0)
SOURCE: queue_workflows/worker_supervisor.py
SYMBOLS: select_bounces, parse_map, tick; env QUEUE_WORKFLOWS_SUPERVISOR_MAP

Per-host supervisor that consumes the orchestrator's dead-worker flag (stale
heartbeat while a running job is still owned). Design properties: report-only by
default, with no label-to-container map it only logs what it would bounce and
touches nothing; ownership is exactly the map's keys so a box only restarts its
own containers, never cross-host; a per-(host,queue) cooldown (default 300s)
stops restart storms; the bounce action is injectable (queue_workflows.set_worker_bounce)
so systemd/k8s/custom APIs plug in; a fresh heartbeat clears the flag, making the
loop self-terminating. The decision seam is pure: select_bounces(flagged rows,
label map, now, cooldown, last_bounced) does no I/O and takes the clock as a
parameter, so it is unit-tested with a virtual clock.

TESTS: tests/test_worker_supervisor.py, including
test_never_bounces_unmapped_when_map_empty,
test_cooldown_suppresses_repeat_bounce, test_tick_report_only_without_map.

REUSE: PATTERN_ONLY. AGPL-3.0 forbids copying; re-implement the report-only
default, the pure select_bounces seam with injected clock, and the cooldown gate.

## M8. Injected deterministic clock with journaled RNG

REPO: davccavalcante/alkaline (Apache-2.0)
SOURCE: src/clock.ts (manualClock, mulberry32), src/types.ts (RngEvent)
SYMBOLS: manualClock, systemClock, RngEvent (type 'rng', kind, value)

manualClock({start, seed}) returns a controllable Clock: time only moves on
advance()/set(), random() is a seeded mulberry32 stream, uuid() is a
deterministic counter rendered as a UUID-shaped string, so two runs with the
same seed produce byte-identical histories. Every clock read is journaled as a
history event of type 'rng' (src/types.ts: "A recorded clock read, replayed
verbatim so time and randomness are stable across replays"), carrying kind and
value; replay feeds the recorded values back instead of calling the RNG.

TESTS: tests/clock.test.ts; also exercised across tests/engine.test.ts and
tests/replay.test.ts via the manual clock.

REUSE: PATTERN_ONLY. The mechanism is TypeScript-bound and embedded in
alkaline's engine; PING needs the pattern (injected clock, seeded PRNG, counter
UUIDs, journal reads as replayable events), not this code.

## M9. historyDivergence determinism debugger

REPO: davccavalcante/alkaline (Apache-2.0)
SOURCE: src/replay/index.ts
SYMBOL: historyDivergence(left, right)

Pure function: walks two histories index by index comparing stableStringify of
each event, returns the index of the first divergence, or -1 when one history
is a prefix of the other (including equal histories). No I/O, no clock, no
state. The docstring describes the debugger this builds on: record a
known-good history, compare a fresh replay against it, get the exact divergence
index.

TESTS: tests/replay.test.ts (historyDivergence(0 on first-event divergence,
-1 on equal histories)).

REUSE: DIRECT_REUSE. Trivially portable pure function.

## M10. Enqueue dedupe via partial unique index

REPO: balyakin/pgrelay (MIT)
SOURCE: src/pgrelay/repositories/job_sql.py (insert_job_statement)
SYMBOL: the ON CONFLICT clause on pgrelay_job

INSERT INTO pgrelay_job (...) VALUES (...) ON CONFLICT (queue_name,
idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING RETURNING *.
The partial unique index makes dedupe race-safe at the database level: two
concurrent enqueues of the same logical job collapse to one row, no
application-level check-then-insert. NULL keys opt out of dedupe entirely,
so jobs that must never dedupe just omit the key.

TESTS: tests/test_idempotency.py (6 tests), including
test_null_idempotency_key_always_creates_new_jobs.

REUSE: DIRECT_REUSE. A standard Postgres pattern; the exact clause shape is
verified above.

## M11. Three-way reconciliation loop

REPO: ercross/recond (MIT)
SOURCE: reconciler/reconciler.go
SYMBOLS: Reconciler.reconcileOnce, fetchDesiredState, hasDrift

One control loop compares three states: desired deployment metadata fetched from
the git provider, committed on-disk state (state.Manager.LoadDeployed), and
live runtime state (deployer.CurrentRuntimeState). The loop is fail-closed per
phase: any error in fetch, load, or drift observation returns without deploying.
Deploy only runs when hasDrift finds a digest mismatch between committed state
and runtime; metadata itself is validated (image and manifest_digest required,
environment must match). A ticker drives StartPeriodicReconciliation.

TESTS: core loop UNTESTED. The reconciler package contains only
reconciler.go with no test file; tests exist for components
(deployment/strategy_test.go, config/config_test.go, state/local_fs_test.go)
but none exercise reconcileOnce.

REUSE: PATTERN_ONLY. Core loop is untested and the project is a single-host
container deployer, so only the three-state compare shape and the fail-closed
per-phase discipline transfer.

## M12. Content-addressed evidence store with recursive verify

REPO: shivay00001/merkle-dag-store (MIT, per pyproject.toml)
SOURCE: merkle_dag_store.py (single 518-line file)
SYMBOLS: MerkleDAGStore.put, MerkleDAGStore.get, MerkleDAGStore.verify,
CID.from_bytes, HashAlgorithm

put(data, links): hashes the bytes with the configured algorithm (sha256,
sha512, blake2b) to form the CID, returns the existing CID if the block is
already stored (dedupe on put), refuses to link to a nonexistent block
(link-integrity check at write time: ValueError if a linked CID is unknown),
persists with fsync and a SQLite metadata index. verify(cid, recursive=True):
re-hashes the stored bytes and compares to the CID, then recurses into all
linked blocks, so any corruption anywhere in the DAG fails verification.

TESTS: test_merkle_dag_store.py (129 lines).

REUSE: ADAPT, with caveat: this is a single-file demo package (518 lines, no
LICENSE file in the repo, PyPI packaging thin). Fine as the evidence-store
mechanism reference; do not treat it as production-hardened.

---

## 3. Cross-mechanism notes

- M1 feeds M2: the write-ahead ledger is keyed by the deterministic idem_key,
  so the exact same key identifies the intent in the checkpoint, the durable
  table, and the resume-time verify path.
- M3 is the guardrail around M2's resume: only one worker may own a thread, so
  two workers cannot both take the verify path and double-execute.
- M4 plus M5 is the Postgres-queue survival pair: atomic claim with lease
  (M4), expired-lease sweep with attempt history (M5). M6's scoped renew is the
  missing half that keeps a live worker's lease fresh without clobbering a
  sweep's reclaim.
- M7 closes the loop a lease system cannot: a wedged worker that keeps beating
  heartbeats never trips lease expiry, so the supervisor flags and bounces it.
- M8 plus M9 is the determinism debugger pair: journal clock reads as
  replayable events (M8), diff histories with a pure function to find the exact
  divergence point (M9).
- M10 is the enqueue-time complement of M1: M10 dedupes at the database on
  enqueue; M1 dedupes tool execution at the agent layer.
- M11's fail-closed per-phase structure is the same discipline M5 applies to
  recovery: never take the destructive step on a read or observation failure.
- M12 is the evidence sink: every mechanism's audit trail (attempt rows from
  M5, divergence reports from M9, bounce decisions from M7) lands as
  content-addressed, recursively verifiable evidence.

## 4. Scope notes

- The 23 rejections from the original harvest were NOT restored. They existed
  in the original report alongside these 12 mechanisms; this restoration did not
  re-run the discovery funnel and does not reconstruct them.
- Licenses were read from each repo's LICENSE file at the pinned SHA, except
  merkle-dag-store, which has no LICENSE file (MIT declared in
  pyproject.toml). python_workflows_queue is AGPL-3.0; its mechanisms are graded
  PATTERN_ONLY and this file quotes no code from it.
- Two license-adjacent discrepancies found during re-harvest and recorded for
  the record: python_workflows_queue's README badge claims MIT while its
  LICENSE file is AGPL-3.0 (LICENSE file wins); merkle-dag-store's README
  claims MIT with no LICENSE file present (pyproject.toml declares MIT).
