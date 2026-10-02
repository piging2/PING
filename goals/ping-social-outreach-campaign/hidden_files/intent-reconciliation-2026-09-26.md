# Stale intent reconciliation — 2026-09-26 ~12:15 MDT (Stream E)

Source: `action-intent-ledger.py list-unknown` showed 47 open intents, zero in flight.
Reviewed each class against the five dispositions: effect proven / effect absent /
superseded / capture failed closed / genuinely unknown. Closed only with evidence.

## Class A — 42 Facebook likes, pass fb-20260924-175129 → GENUINELY UNKNOWN (left open)

- Stage EXECUTION, state UNKNOWN_EXECUTION, no observation/finalize/reconciliation.
- Intent ts 2026-09-24T17:51:38Z (~52h stale at review). Dispatch died with no
  result/progress collection.
- Per-post like presence is UNPROVABLE via authorized surfaces:
  `post reactions read` returns summary counts only (no per-user reactor list).
  The Pig-side progress lines were the only evidence channel and are gone.
- Standing rule (Nolan): this dispatch remains UNKNOWN; must never be retried
  or inferred FAILED.
- Decision: DO NOT reconcile/close. Leaving them open preserves the ledger
  `refuse` block on those exact post URLs (the never-re-engage guard has no
  records for them since no outcomes were ever recorded, so the ledger block is
  the only thing preventing re-targeting of possibly-already-liked posts).
- UNKNOWN stays UNKNOWN.

## Class B — 5 X follows, pass x-20260926-011741 → SUPERSEDED (reconciled NOT_ATTEMPTED)

- Accounts: @RealTommyMello @AizikZimerman @WilsonCompanies @thehvacjack @tone2k18.
- Only the intent records exist (stage ACTION_INTENT_DURABLE); NO execution
  record was ever written. Pass died between write-intents and mark-execution.
- The identical 5 follows were executed and driver-verified in pass
  x-20260926-111436 (~05:14 MDT): 5 EXECUTED outcomes recorded
  (x-follow-outcomes-20260926-111436.json), 5 guard records written
  (2026-09-26T12:53:09Z).
- Reconciled each intent_id as NOT_ATTEMPTED via `action-intent-ledger.py
  reconcile`, resolved_by stream-e-intent-reconciliation-20260926, with reason
  "superseded" and the evidence above. No external effect occurred under the
  01:17 intent_ids; the end state is proven under the 05:14 intents.
- Post-reconciliation: `list-unknown` = 42 open (all Class A). Verified.

## Net

- Open intents: 47 → 42. All remaining 42 are Class A, deliberately open.
- No intents were deleted. No outcomes were inferred.
