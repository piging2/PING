# CHAOS-C: Slow-Query / Redelivery-Storm / Key-Aliasing — Certified Results

**Lane:** CHAOS-C | **Assignment:** ORCA FINISH PROGRAM — FOLLOWON-QUEUE.md Q3, Q4, Q5 (Q1/Q2 belong to CHAOS-B, not duplicated)
**Isolation:** proven 2026-09-24 before Q3, re-proven before Q4, re-proven before Q5 (ISOLATION_PROVEN each time; DB path inside chaos-c scratch, zero banned production identifiers, socket-monkeypatched mini-pass, strace audit of all writes). No production system touched; no shared branch committed. File-backed SQLite behavioral harness (CHAOS-A harness + slow-query injection primitives). A5 worktree sources absent on this host — see CHECKPOINT.md.
**Certified:** 2026-09-24 | **Ledger:** `evidence/probe-records.jsonl`

## 1. Verdict summary (certified)

11 raw probe records (1 superseded — section 6), 10 valid. 10,016 counted missions in valid records (20,009 deliveries actually executed; P4.2's 10k deliveries sit in its superseded record, section 6).

| Verdict     | Records | Meaning |
|-------------|---------|---------|
| SURVIVED    | 7       | mechanism held under the slow/kill/dupe/alias |
| DUPLICATED  | 2       | FC-4: deposed worker's late writes won the packet row; P5.2: cross-run aliasing when caller ignores is_new |
| LOST-STATE  | 1       | FC-5: deposed worker's stale checkpoint became newest |

Mean confidence 0.949 (min 0.93). New broken boundaries observed: post-reclaim write fencing (FC-4), checkpoint writer fencing / restore selection (FC-5), cross-run packet ownership (P5.2 blast radius).

## 2. Certified probe table

| Suite | Probes | Result |
|-------|--------|--------|
| Slow-query (`probes/run_slowquery.py`): 2-5s injected latency into commit/checkpoint writes | 5 | P3.1 SURVIVED (TERM mid-slow-commit: atomic rollback, clean reclaim), P3.2 SURVIVED (KILL mid-slow-checkpoint: partial row rolled back), P3.3 DUPLICATED (FC-4), P3.4 LOST-STATE (FC-5), P3.5 SURVIVED (benign control) |
| Redelivery storms (`probes/run_redelivery_storm.py`): 64 threads | 2 | P4.1 SURVIVED: 10k dupes x 1 key -> 1 packet, 9,999 dedup hits (99.99%), p50 25.7ms / p99 185.4ms, 0 UNIQUE-race slips. P4.2 SURVIVED (after correction, section 6): 1k keys x 10 dupes -> 1,000 packets, 9,000 true dedup hits (90.00%), 0 UNIQUE-race slips |
| Key aliasing (`probes/run_key_aliasing.py`) | 3 | P5.1 SURVIVED: same key + different payload across runs -> silent aliasing PROVEN (mechanism as designed; semantics undecided). P5.2 DUPLICATED: caller ignores is_new -> packet.run_id=A vs completion.run_id=B. P5.3 SURVIVED: same key + identical payload -> safe replay, no re-execution |

## 3. What survived (regression bar for impl)

- **Kills mid-slow-write are clean.** SIGTERM inside a 3s commit txn: atomic rollback, zero torn rows, reclaim finishes exactly once. SIGKILL 3s before a checkpoint commit: the partial row vanishes, the last fully-committed checkpoint stays latest. Slowness does not weaken kill atomicity.
- **Benign timeout + kill path stays exactly-once** (P3.5 control): the NEW windows in FC-4/FC-5 require the slow worker to SURVIVE the timeout, not to die.
- **Dedup fence at volume.** 20,000 deliveries across the two storms: every key maps to exactly one packet row; **zero UNIQUE-constraint races slipped a duplicate** (the P0 tripwire never fired). The `INSERT`-or-`IntegrityError` + `UNIQUE(idempotency_key)` mechanism is sound under 64-thread contention on this store.
- **Idempotent effect keys and write-once completions held everywhere**, including inside the double-recovery probes: 1 effect row, 1 completion row even when two workers raced. The corruption in FC-4/P5.2 was confined to unfenced row writes and cross-run ownership, never the effect/completion fences.
- **Legitimate cross-run replay works** (P5.3): same key + identical payload in a new run returns the prior result without re-executing. Any redesign must preserve this.

## 4. What did not survive (generic failure classes + design decision)

### FC-4: deposed worker's late writes are not fenced by reclaim (DUPLICATED)
- Supervisor timeout (1s) fires during worker-A's 5s logical commit; worker-B reclaims, completes, emits the fenced completion (result:worker-B); A wakes and its UNCONDITIONAL `set_packet` overwrites the packet row (result:worker-A). Packet row and completion fence disagree; readers of the two tables see different winners.
- `attempt_seq` is bumped by reclaim but no write checks it. Epoch fencing protects coordinator reigns, not rows from a slow previous holder.
- Repro: `fixtures/fc4-deposed-late-write.py` (exit 0). Lane note: `lanes/FC-4-lane-note.md`.
- Fix: `UPDATE ... WHERE packet_id=? AND claimed_by=? AND attempt_seq=?`; `rowcount=0` = deposed, stop writing, fail closed.

### FC-5: stale checkpoint from a deposed worker becomes newest (LOST-STATE)
- Worker-A's 5s checkpoint commits AFTER B's reclaim + B's own checkpoint and wins `max(checkpoint_id)`; restore from latest would resurrect pre-reclaim state and hide B's progress. Digests prove integrity, not currency; the stale checkpoint is well-formed and digest-valid.
- Repro: `fixtures/fc5-stale-checkpoint-newest.py` (exit 0). Lane note: `lanes/FC-5-lane-note.md`.
- Fix: stamp `(writer_id, claim_fencing)` on checkpoint rows; restore accepts only checkpoints matching the current claim. One fencing discipline covers FC-4 and FC-5.

### Q5 design decision: cross-run idempotency-key aliasing
- **Proven:** the same global key in a new run returns the prior run's packet. Different payload (P5.1): run B silently receives run A's `result_ref` for a payload it never submitted — the store never compares payloads on the dedup path. Caller ignoring `is_new` (P5.2): run B claims run A's still-ENQUEUED packet and completes it under B — `packet.run_id=A` vs `completion.run_id=B`.
- **Options enumerated** (`lanes/Q5-design-decision.md`): (1) run-scoped keys — kills aliasing but destroys the legitimate cross-run retry case; (2) **global keys with payload-hash-bound collision semantics (RECOMMENDED)** — match returns prior result (P5.3 preserved), mismatch emits an explicit COLLISION distinct from a benign dedup hit, first-writer preserved (chaos-a proved reject-and-preserve 24/24); (3) key namespaces as producer guidance (the MC-4 uuid-suffix rule already implements it); (4) key TTLs — trades the hazard for an expiry-boundary race.
- **Recommendation:** adopt option 2 in the store (small, additive: payload-hash comparison + explicit collision signal) with option 3 as producer guidance. Rationale: preserves the proven-safe replay case, converts silent aliasing into an explicit auditable collision, matches already-proven collision behavior. This is a decision for Nolan/impl lanes, not a mechanism bug.

## 5. Failure pipeline disposition

- **Local accidents** (2): (a) P4.2 first attempt hit `sqlite3.OperationalError: database is locked` — 64-thread pile-up on one SQLite file exceeded the 30s busy_timeout; probe-harness infra, fixed with bounded retry on transient lock errors (insert-or-dedup is idempotent, so retry is safe; the FC-2 lesson applied to the probe itself). (b) The retry wrapper converted 4 committed-but-un-audited creations into counted dedups, misclassifying P4.2 as DUPLICATED — corrected by forensic re-read (`probe-424c36ea-corr`, section 6); the UNIQUE fence never slipped.
- **Generic classes** (FC-4, FC-5): repro + fixture + lane note done; memory candidates MC-5, MC-6 in `memory-candidates.md`; requeued to impl lanes via `lanes/`.
- **Design decision** (Q5): proven + options enumerated + recommendation with evidence; memory candidate MC-7; `lanes/Q5-design-decision.md` names the owning decision (Nolan/impl lanes).

## 6. Superseded records

1. `probe-424c36ea` (redelivery-storm P4.2): misclassified DUPLICATED by the probe-side retry accounting artifact (section 5b). Superseded by `probe-424c36ea-corr` (SURVIVED): 1,000 keys -> exactly 1,000 packet rows, 0 dup-key rows, 0 UNIQUE-race slips, true dedup-hit rate 90.00% (1,000 creations + 9,000 duplicates). The P0 tripwire (nonzero double-applies) never fired in either storm.

## 7. Memory candidates

`memory-candidates.md`: MC-5 (fence post-claim writes on the claim), MC-6 (checkpoint writer identity; never restore max(id) blindly), MC-7 (payload-hash-bound collision semantics for idempotency keys). Each in problem/scope/evidence/mechanism/fix/test/version/applicability/counterexample form, for the parent agent to file.

## 8. Source-specific confidence limitations (unchanged from CHAOS-A)

All claims are TEST evidence from the scratch behavioral harness. Confidence 0.95 in the failure CLASSES (implementation-independent: unfenced post-reclaim writes, writer-less checkpoints, and key-scope ambiguity are design properties, not SQLite properties); confidence that the real implementation contains them is UNKNOWN until source-specific probes run on the Pig.
