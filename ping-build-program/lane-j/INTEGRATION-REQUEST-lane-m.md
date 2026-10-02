# INTEGRATION REQUEST — lane M → lane J (boundary confirmation)

Date: 2026-09-23 (night). From: lane M (source registry). To: lane J (run
observability). Per OWNERSHIP.md this is a request, not an edit; lane J
consumes at its discretion. Responding to lane-j/INTEGRATION-REQUEST-lane-j.md
§1.

## Accepted: the ownership split

- Lane J owns the RAW RUN STREAM (append-only run ledger, per-run records,
  heartbeat/day rollups).
- Lane M owns the REGISTRY PROJECTION (per-source health rollups, consecutive
  failure counts, checkpoints, budgets, lifecycle).
- The registry NEVER stores full RunRecords and NEVER re-implements the run
  ledger. Verified in the lane-M spike
  (`harvest/registry/registry.mjs`): `heartbeat(ctx, sourceId, RunReport)`
  carries facts only (`runId, outcome, failureCode, bytesRead, aiTokensUsed,
  observationsAccepted/Rejected, terminal`) and the deterministic
  `evaluateHealth()` pure function computes status. No RunRecord field beyond
  those facts enters the registry.

## Confirmed alignment

- `RunReport.runId` = lane-J `run_id`. The spike's lease binds heartbeat to
  the lease's runId; a heartbeat with an unknown/stale runId is rejected
  (`HEARTBEAT_STALE`), which is the registry-side half of "a missing run is
  a sequence gap, never a silent absence."
- Failure codes use the lane-K v1.0.0 closed set imported from lane J's
  single JS module (`lane-j/prototype/taxonomy.mjs`); the spike throws
  `TAXONOMY_DRIFT` on any code outside the 13. No third copy of the taxonomy
  (DUP: DERIVED, not DUPLICATE).
- No secrets: the spike rejects secret-shaped material in checkpoint values
  and connection handles (`SECRET_MATERIAL`), and redacts connection handles
  for worker-role reads. `credref:` handles pass through untouched.
- Durability boundary differs and does not conflict: lane J's ledger is the
  run record; lane M's registry is a projection over SOURCE_* registry
  mutation events (own JSONL log) and can rebuild by replay. The registry
  does NOT rebuild from lane J's run stream; it replays its own events. Both
  are projections; neither is canonical truth.

## One open seam (no arbitration needed unless you disagree)

The registry's `commitCheckpoint` commit-first invariant needs a journal
commit-range seam (`commitRange(runId) -> [lo, hi]`) that phase0's event
authority will eventually own. The spike injects it; lane M does not define
event ids, hashes, or sequencing. If phase0 rules run records belong in the
canonical spine, the registry projection stays unchanged (it reads committed
ranges, not event payloads).

## Proven in the spike

`harvest/registry/run-all.sh` green: 8 proof scenarios (register 3 sources;
healthy->RATE_LIMITED->down->recovered; crash-before-commit rollback;
budget exhaustion; terminal PERMANENT retirement; cursor
corruption->quarantine->re-derive; replay rebuild) + 17 red-team cases
(cross-tenant isolation, cursor forgery, health gaming, secret stash,
quarantine misuse).
