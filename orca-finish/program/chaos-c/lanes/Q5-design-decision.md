# Lane note: Q5 — cross-run idempotency-key aliasing: design decision

**To:** impl lanes (orchestrator / idempotency) + Nolan (decision) | **From:** CHAOS-C Q5 | **Date:** 2026-09-24
**Status:** FINAL — evidence probes P5.1-P5.3 complete 2026-09-24

## Proven behavior (chaos-a probe-3e615e67, LOCAL ACCIDENT, now a deliberate probe)
`packets.idempotency_key` is globally UNIQUE. The same key delivered in a NEW
run returns the PRIOR run's packet: `new_packet` returns `(prior_packet_id,
False)` and audits `packet.dedup_hit`. The mechanism works exactly as
specified. The open question is semantic: **what does the key name?**

- If the key names the *intent* ("mow lawn at 123 Main"), cross-run dedup is
  correct: a retry after run A completed should return A's result, not
  re-execute (P5.3, the legitimate case).
- If the key names a *run-local task* and a producer reuses it with a
  DIFFERENT payload, run B is silently aliased to run A's work: B receives
  A's `result_ref` for a payload it never submitted (P5.1). The store cannot
  tell these apart — it never compares payloads on the dedup path.
- Blast radius (P5.2): if the caller ignores `is_new=False` and claims the
  returned packet while run A's packet is still ENQUEUED, run B completes run
  A's packet under B's run_id: `packet.run_id=A`, `completion.run_id=B`. Two
  runs lay claim to one packet. The API makes this easy — a foreign
  `packet_id` guarded by a single boolean.

## Options
1. **Run-scoped keys**: `UNIQUE(run_id, idempotency_key)`. Same key in a new
   run = new packet. Kills aliasing completely. Destroys the legitimate
   cross-run retry case (P5.3): a redelivery after run A completed would
   re-execute. Key becomes meaningless outside its run.
2. **Global keys with payload-hash-bound collision semantics** (RECOMMENDED):
   keep global `UNIQUE(key)`; on dedup, compare the canonical payload hash.
   Match -> return prior result (idempotent replay, today's P5.3 behavior
   preserved). Mismatch -> explicit COLLISION signal (distinct from a benign
   dedup hit): return existing packet, `is_new=False`, `collision=True`,
   preserve first-writer payload (chaos-a proved reject-and-preserve 24/24).
   Callers can then distinguish "your exact work already done" from "this key
   is taken by different work" instead of silently aliasing.
3. **Key namespaces**: producers scope keys (`run:{run_id}:{k}` for run-local,
   `global:{k}` for cross-run intents); the store enforces option-1 semantics
   inside the `run:` namespace and option-2 inside `global:`. Strongest
   structural fix; requires producer discipline (key hygiene per MC-4).
4. **Key TTL/expiry**: dedup only within a window; afterwards the key is
   reusable. Weak: reintroduces the race exactly at the expiry boundary, and
   "how long" is a new magic constant.

## Recommendation (evidence below when probes land)
Adopt option 2 in the store (payload-hash comparison + explicit collision
signal — small, additive, no schema break beyond an optional payload-hash
column), and option 3 as producer guidance (namespace run-local keys; the
existing MC-4 rule — uuid-suffix keys per invocation — already implements it).
Rationale: option 2 preserves the proven-safe replay case, converts silent
aliasing into an explicit, auditable collision, and matches the already-proven
reject-and-preserve collision behavior. Option 1 is safe but lossy; option 4
trades one hazard for another.

## Evidence (TEST)
- P5.1 `probe-14021ef2` (SURVIVED, TEST, conf 0.96): same key, different payload, prior run completed -> run B silently receives run A's result (`aliased_to_prior_result=True`). Mechanism as designed; semantics undecided.
- P5.2 `probe-2fc1fe39` (DUPLICATED, TEST, conf 0.94): caller ignores `is_new`, claims run A's still-ENQUEUED packet, completes under run B -> `packet.run_id=A` vs `completion.run_id=B` (`diverged=True`). Two runs lay claim to one packet.
- P5.3 `probe-b4762c92` (SURVIVED, TEST, conf 0.96): same key + byte-identical payload redelivered in a new run -> prior result returned, no re-execution (`reexecution_avoided=True`). The case a redesign must preserve.
