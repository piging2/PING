# Recovery Protocol

## The rule

Replay is decision replay, NEVER mutation replay. Recovery never
re-issues a platform call for an intent whose external effect is
unknown; it reads external state first and acts on what the read
shows.

## reconcile()

`PassHarness.reconcile(batch_id)` runs at the end of every pass. It
walks the journal's open intents:

1. Intents in ELIGIBLE / INTENT_CREATED / QUEUED / SAFE_RETRY /
   FAILED_RETRYABLE with no live lease are re-driven through
   scheduling (circuit + budget + lease + invariants still apply).
   If the circuit is still open, the intent parks at DEFERRED.
2. Intents in ATTEMPTING / UNKNOWN / DISPATCHED / VERIFYING
   (interrupted mid-flight) go to VERIFYING: one read-after-write
   verification read against external state.
   - Read shows the effect present -> VERIFIED_SUCCESS, receipt
     ok=true. No second mutation.
   - Read shows absence -> one bounded retry (SAFE_RETRY) for
     idempotent actions only, attempt counter incremented; the retry
     is chained inside the same reconcile so one call fully resolves.
   - Read fails (outage) -> UNKNOWN, persisted to
     `unknown-persisted.jsonl` with NO `ok` boolean. UNKNOWN stays
     UNKNOWN until a later read resolves it.

## Crash points proven (tests/test_04_failure_injection.py)

Real `os._exit` kills in a subprocess, then reconcile in a fresh
process against the file-backed fixture:

- Kill after DISPATCHED, before execute: reconcile verifies absence,
  retries once, VERIFIED_SUCCESS, exactly one mutation.
- Kill after the ATTEMPTING journal write, before the adapter call:
  same path, exactly one mutation for the intent.
- Kill after success, before verify: reconcile reads presence,
  VERIFIED_SUCCESS, zero new mutations.
- Timeout after success: verification read confirms,
  VERIFIED_SUCCESS, exactly one mutation per intent.
- Lying adapter (claims success, never mutated): verification fails,
  FAILED_TERMINAL, receipt ok=false, zero server-side mutations.
- Verification-read outage: pass COMPLETE, UNKNOWN persisted with no
  `ok` field, no receipt claims a terminal.

## Operator recovery

- SAFE_MODE file present: passes refuse to mutate (verdict SAFE_MODE).
  Exits only on an explicit, recorded operator action
  (`exit_safe_mode`).
- Circuit OPEN: no execution until half-open; operator-directive pin
  holds OPEN past the cooldown ("offline diagnostic first, no more
  live-budget burn").
- Stuck leases: leases carry TTLs and are reclaimable after expiry;
  reconcile releases the lease it holds on every path.
