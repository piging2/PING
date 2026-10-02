# CHAOS-C memory candidates (for the parent agent to file)

Format: problem / scope / evidence / mechanism / fix / test / version /
applicability / counterexample.

## MC-5 (FC-4): fence every post-claim write on the claim the writer holds

- **problem:** A worker that is slow (not dead) across a supervisor timeout
  keeps writing after being deposed; its unconditional writes overwrite the
  recovery's writes. Reclaim bookkeeping (`claimed_by`, `attempt_seq`) is
  recorded but never enforced as a write predicate.
- **scope:** Any orchestrator with supervisor-timeout reclaim + worker writes
  that do not predicate on claim ownership. The slow path (2-5s commit
  latency) opens the window; the fast path never reaches it.
- **evidence:** TEST, conf 0.93. CHAOS-C probe-3d136850 (DUPLICATED):
  5s slow finalize, reclaim at 1s, B completes + emits fenced completion
  (result:worker-B); A's late unconditional set_packet writes
  result:worker-A. Packet row and completion fence disagree. Fixture:
  `program/chaos-c/fixtures/fc4-deposed-late-write.py` (exit 0).
- **mechanism:** `UPDATE packets ... WHERE packet_id=?` with no
  `claimed_by`/`attempt_seq` predicate. The deposed worker's write is
  indistinguishable from the owner's.
- **fix:** `UPDATE ... WHERE packet_id=? AND claimed_by=? AND attempt_seq=?`;
  `rowcount=0` means "deposed, stop writing" — fail closed, never retry the
  write. Apply to packet status/result writes, checkpoint inserts, and any
  other post-claim row write. The completions table's `INSERT OR IGNORE` is
  the model: the fence lives in the write, not in the caller's belief.
- **test:** Re-run `fc4-deposed-late-write.py` against the fixed write path:
  expect A's late write to affect 0 rows and the packet row to keep
  result:worker-B (probe becomes SURVIVED).
- **version:** Observed in the CHAOS-C behavioral harness (SQLite re-proof of
  A5/A6 mechanism-map records 1,6,7,8,9,14), 2026-09-24. Whether the real
  implementation predicates its post-reclaim writes is UNKNOWN until
  source-specific probes run.
- **applicability:** Any claim/reclaim design (leases, fencing tokens,
  attempt counters) where the reclaim updates bookkeeping but writers don't
  check it. PG advisory-lock coordinators, K8s leader election with lease
  objects, queue consumers with visibility timeouts.
- **counterexample:** Fencing only the coordinator epoch does not fix this:
  the deposed party is a worker, not a coordinator. Epoch fencing protects
  reign transitions, not rows from a slow previous holder.

## MC-6 (FC-5): checkpoints must carry writer identity; restore must not take max(id) blindly

- **problem:** A slow checkpoint from a deposed worker can commit after the
  recovery's checkpoint and become the newest row; restore from latest then
  resurrects pre-reclaim state and hides the recovery's progress (silent
  LOST-STATE with a healthy-looking chain).
- **scope:** Any checkpoint/restore design where restore selects
  `max(checkpoint_id)` and checkpoint rows lack writer/fencing identity, and
  where a writer can survive (slow) past its deposition.
- **evidence:** TEST, conf 0.93. CHAOS-C probe-3731b5d8 (LOST-STATE): A's 5s
  checkpoint commits after B's reclaim + B's checkpoint; latest row is A's
  stale `{"phase":"slow-C2"}`. Fixture:
  `program/chaos-c/fixtures/fc5-stale-checkpoint-newest.py` (exit 0). Kills
  are clean (SIGKILL mid-checkpoint rolls back); the window needs the writer
  to SURVIVE.
- **mechanism:** `latest_checkpoint` = `ORDER BY checkpoint_id DESC LIMIT 1`
  with no writer check. Digest verification proves integrity, not currency.
- **fix:** Stamp `(writer_id, claim_fencing/attempt_seq)` on every checkpoint
  row; restore accepts only checkpoints whose fencing matches the packet's
  current claim (quarantine, don't trust, the rest). Optionally fail the slow
  writer's commit closed with the same `WHERE claimed_by=? AND
  attempt_seq=?` predicate — one fencing discipline covering MC-5 and MC-6.
- **test:** Re-run `fc5-stale-checkpoint-newest.py` with writer-stamped
  checkpoints: expect restore to select B's checkpoint and flag A's as
  deposed (probe becomes SURVIVED).
- **version:** Same as MC-5.
- **applicability:** Any resume-from-checkpoint system with concurrent or
  successive writers (stream processors, saga orchestrators, ML training
  checkpoints under preemption).
- **counterexample:** Digest verification does not help: the stale checkpoint
  is well-formed and digest-valid. The defect is selection, not corruption.
  Refusing `checkpoint_id < max` (stale-refusal) does not help either: the
  stale write has the LARGEST id.

## MC-7 (Q5): idempotency keys need payload-hash-bound collision semantics, not silent aliasing

- **problem:** A globally-unique idempotency key reused across runs with a
  DIFFERENT payload silently aliases the new delivery to the prior run's
  work: the caller receives the old `result_ref` for a payload it never
  submitted. The store never compares payloads on the dedup path, so it
  cannot distinguish "retry of the same intent" from "different intent,
  reused key".
- **scope:** Any idempotency store with cross-run (or cross-tenant) global
  key uniqueness where producers can reuse keys with different payloads.
- **evidence:** TEST, conf 0.94-0.96. CHAOS-C P5.1 (SURVIVED, mechanism as
  designed): same key, different payload, prior run completed -> run B
  silently receives run A's result. P5.2 (DUPLICATED): caller ignores
  `is_new=False`, claims run A's still-ENQUEUED packet, completes under run
  B -> `packet.run_id=A` vs `completion.run_id=B`. P5.3 (SURVIVED): same key
  + identical payload -> safe replay, no re-execution (the case to preserve).
  Origin: chaos-a probe-3e615e67 local accident (key reused across probe
  invocations deduped against the earlier run — correctly, per the mechanism).
- **mechanism:** `new_packet` returns `(existing_packet_id, False)` on
  `UNIQUE` violation without comparing the new payload to the stored one;
  the only guard against cross-run use is the caller checking `is_new`.
- **fix:** (store) compare canonical payload hash on the dedup path: match ->
  return prior result (idempotent replay preserved); mismatch -> explicit
  COLLISION signal distinct from a benign dedup hit (`collision=True`,
  first-writer payload preserved — chaos-a proved reject-and-preserve 24/24).
  (producer guidance) namespace run-local keys (`run:{run_id}:{k}`), i.e. the
  existing MC-4 rule: uuid-suffix keys per invocation.
- **test:** Re-run P5.1 against the fixed path: expect `collision=True` and
  no silent aliasing; re-run P5.3: expect unchanged safe replay.
- **version:** Same as MC-5.
- **applicability:** Webhook dedup stores, payment idempotency keys, exactly-
  once queue consumers — anywhere a key's scope (intent vs run-local task) is
  ambiguous and producers are fallible.
- **counterexample:** Pure run-scoped keys (`UNIQUE(run_id, key)`) also fix
  the aliasing but destroy the legitimate cross-run retry case (P5.3): a
  redelivery after run A completed would re-execute. Key TTLs trade the
  hazard for an expiry-boundary race.
