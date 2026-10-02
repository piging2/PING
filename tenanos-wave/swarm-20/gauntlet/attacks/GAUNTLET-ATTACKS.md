# GAUNTLET ATTACK CATALOG

Every scenario runs the full tenant loop (mission.js) with one fault injected.
Each attack gets a fresh `GAUNTLET_TENANT` so objective identity never
collides. Expected exit codes are asserted by `run-attacks.sh`; 14/14 passed
2026-09-24 (after the attack-10 identity-binding fix; see Attack 10 notes).

Conventions: `99-escalate.json` = escalated (exit 3), `99-close.json` =
closed (exit 0), `99-fatal.json` = fatal (exit 2).

| # | Attack | Injection | Expected | Proves |
|---|---|---|---|---|
| 01 | honest-again | none (fresh tenant baseline) | exit 0, `99-close.json` | Baseline: t1 authorize->issue->dispatch->verify->record, t2 causation-linked, both VERIFIED, memory candidates justified, mission-control snapshot, CLOSE. |
| 02 | crash | `GAUNTLET_FAULT=crash` (worker exits 7, no envelope) | exit 3 | Protocol failure (no parseable envelope) escalates, never fabricates a result. Evidence: `dispatch-t1-a1.json` (exit_code 7). |
| 03 | slow-timeout | `GAUNTLET_FAULT=slow` (hangs past watchdog) | exit 3 | Dispatcher watchdog kills the attempt; timeout becomes an HONEST failed envelope ("no success fabricated"); retry budget exhausts; escalate. No unrecorded-effect path (no marker). |
| 04 | malformed-envelope | `GAUNTLET_FAULT=malformed` (envelope missing required fields, wrong-typed status) | exit 3 | `verifyResultEnvelope` rejects; `VERIFICATION_FAILED` is non-retryable; escalate. RESULT != VERIFIED OUTCOME enforced by the real gate. |
| 05 | wrong-agent | `GAUNTLET_FAULT=wrong-agent` (envelope names `agent_id: someone-else`) | exit 3 | Envelope agent binding rejected at verification; impostor output cannot be recorded. |
| 06 | effect-then-timeout | `GAUNTLET_FAULT=effect-then-timeout` (marker written, then hang) | exit 3 + `reconcile-required.json` | **Attack 10.** Timeout AFTER a possible external effect: the unit takes FAILED and the run escalates RECONCILIATION_REQUIRED. No retry, no success, no clean failure. RETRY != IDEMPOTENCY. |
| 07 | mcp-removed | `GAUNTLET_MCP_MODE=removed` | exit 3 | Tool outage surfaces as an honest worker `failed` envelope (code `MCP_SERVER_REMOVED`); retried, budget exhausts, escalate. The harness does not hide infrastructure failure as success. |
| 08 | mcp-malformed | `GAUNTLET_MCP_MODE=malformed-result` (tool returns `{wrong_shape:true}`) | exit 3 | Malformed tool result is reported honestly as worker failure, not coerced into success; budget exhausts; escalate. |
| 09 | memory-stale | `GAUNTLET_MEMORY_MODE=stale` (v1 superseded by v2) | exit 0 | Superseded facts are excluded from the active context pack (`excluded_stale: [mem-old]`); the current fact grounds the run. |
| 10 | memory-contradictory | `GAUNTLET_MEMORY_MODE=contradictory` (requires vs forbids UPPERCASE, no supersession chain) | exit 3 | Irreconcilable contradiction escalates BEFORE planning; the planner never grounds work on contradiction. |
| 11 | memory-cross-tenant | `GAUNTLET_MEMORY_MODE=cross-tenant`, `GAUNTLET_REQUEST_TENANT=tenant-b` | exit 0 | Cross-tenant retrieval DENIED fail-closed (`memory-denied.json`); the run proceeds with an empty permitted set. Denial is correct behavior, not a failure. |
| 12 | capability-revoked | `GAUNTLET_CAPABILITY_REVOKED=text.transform` | exit 3 | Mid-run authority revocation denies at the pre-check with the real gate's denial shape; `classifyDelegation` -> REQUIRES_HUMAN_APPROVAL. The real adapter module is never mutated. |
| 13 | dedup-self-test | `GAUNTLET_SELF_TEST_DEDUP=1` | exit 0 | Re-recording a verified result returns `deduplicated: true` with the same event_id (`result-t1-dedup-check.json`): logical_id dedup = ON CONFLICT DO NOTHING semantics. |
| 14 | budget-exhausted | `GAUNTLET_MAX_WORK_ORDERS=1` (t2 exceeds budget) | exit 3 | Durable budget enforced by mechanism: t1 consumes the only slot; t2 -> REQUIRES_HUMAN_APPROVAL (`control_loop:bounds:maxWorkOrders`). Bounds are not expandable by the loop. |

## Attack 10 fix note (2026-09-24)

The first matrix run exposed that the RECONCILIATION_REQUIRED guard never
fired: the worker writes `side-effect-<issued-work-order-id>.marker` under
the ADAPTER-minted id, but mission.js checked
`side-effect-<durable-id>.marker` under the harness durable id — the two
identities differ by design (durable id wins for restart rediscovery; adapter
id binds the envelope). The guard now checks the issued id, and the rerun
writes `reconcile-required.json` on attempt 1 with no retry dispatched.

## Not yet covered

- Coordinator-lease contention (exit 5): needs two live processes; manual only.
- Durable cancellation (exit 4): `cancel.requested` marker path untested in the matrix.
- Startup reconciliation of a lost RUNNING attempt (dispatcher dead, no
  rendezvous -> re-authorized as new attempt): covered by code, not yet driven
  in the matrix.
