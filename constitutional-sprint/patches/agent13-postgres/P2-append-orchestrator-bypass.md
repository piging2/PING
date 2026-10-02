# P2 — Close the `append_orchestrator` hash-chain bypass on `repository_events`

**Status:** PROPOSED ONLY (live core source — not applied). **No new canonical database created.**

## WHY

`gateway/append_orchestrator.js:91` performs a raw

```sql
INSERT INTO repository_events (event_id, object_id, event_type, sequence, payload, timestamp)
VALUES ($1, $2, $3, $4, $5, NOW())
```

that bypasses the kernel `EventRepository.appendEvent` (`runtime/kernel/event_repository.js:117`),
the component that owns the per-object hash chain (`RuntimeID`, `PreviousEventHash`,
`CanonicalEventHash`, `ReducerHash`, `WitnessHash`, `ReplayHash`, `chain_root` — columns present in
the live table, evidence: `pg-schema.out`). Any row written through the bypass has NULL chain
fields, silently breaking the hash-chain invariant that the replay story
(`repository_events(object_id, sequence)` per-object replay, EVENT-FORENSICS §2E) depends on.
Today the table is empty in the live DB (0 rows), so no corruption has occurred yet — the fix is
preventive.

## EVIDENCE

- Bypass: `/home/nolan/ping/gateway/append_orchestrator.js:91` (INSERT column list =
  `event_id, object_id, event_type, sequence, payload, timestamp` — no chain columns).
- Canonical writer: `/home/nolan/ping/runtime/kernel/event_repository.js:117` (INSERT includes the
  chain columns; `:93,159,181,189` are the chain-aware readers).
- Live table `brain-postgres.ping_runtime.repository_events` has all 20 columns including
  `runtimeid, previouseventhash, canonicaleventhash, reducerhash, witnesshash, replayhash, chain_root`
  (evidence: `pg-schema.out`), and 0 rows (`SELECT COUNT(*)`).
- Other kernel writers route through the authority:
  `ping-runtime/agents/agent_memory_authority.js:617,646,675,703,731`,
  `ping-runtime/agents/distributed_desktop_agents.js:579,607,635,663,691`,
  `gateway/automatic_mission_generator.js:595,624,653`,
  `gateway/continuous_replay_authority.js:588,616,647,675`.

## MINIMUM CHANGE

Option A (preferred — single writer): replace the raw INSERT in `append_orchestrator.js:91` with
a call to the kernel `EventRepository.appendEvent` (same signature the agent authorities use),
deleting the hand-rolled SQL. The orchestrator already runs inside the gateway process where the
repository is constructed.

Option B (if the orchestrator must stay decoupled): keep the SQL but add a post-insert
chain-integrity assertion — after INSERT, read back `(object_id, sequence)` and verify
`PreviousEventHash` links to the prior row's `CanonicalEventHash`; on mismatch, move the row to
`repository_dead_letters` (`gateway/dead_letter_authority.js:154` already owns that table) and
raise. This converts silent corruption into a loud, quarantined failure.

Either option must be accompanied by a regression test: append two events for one `object_id`
through the orchestrator path and assert `PreviousEventHash(n) == CanonicalEventHash(n-1)`.

Note: the same file's purpose should be reviewed — if `append_orchestrator.js` exists only to
duplicate `EventRepository`, Option A effectively deletes the duplication (constitutional rule of
one: one writer owns the chain).

## TEST

Regression test (new, in the core's JS test lane):

1. Through the orchestrator path, append event A then event B for the same `object_id`.
2. Assert both rows exist with contiguous `sequence`.
3. Assert `B.previouseventhash == A.canonicaleventhash` and both `canonicaleventhash` values are
   non-null well-formed sha256 hex.
4. (Option B only) Simulate a chain break (hand-insert a row with a wrong `previouseventhash`
   directly) and assert the orchestrator's next append raises and the bad row lands in
   `repository_dead_letters`.

Run against a scratch database, never the live one. Today the test would pass vacuously for
Option A only if the orchestrator is rewired; for the current code, step 3 fails (NULL chain
fields) — that failing assertion IS the bug demonstration.

## RESULT

Not executed (live-core source change is out of scope for Agent 13; the sprint worktree (a) is the
FYD adapter repo and contains no event machinery to patch). Expected result: exactly one writer
owns the `repository_events` hash chain, and the replay invariant becomes enforceable rather than
conventional.
