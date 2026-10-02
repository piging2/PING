# The ok-Boolean Lesson (reference)

Source of truth: AGENTS.md, "X ledger outcomes-file schema"
(2026-09-29, pass x-20260929-1206), verified 2026-10-01.

## What happened

`action-intent-ledger.py record-outcomes` derives the terminal label as
`EXECUTED if o.get("ok") else FAILED`: it reads the `ok` boolean, NOT
an `outcome` string. An outcomes file with `"outcome": "EXECUTED"` but
no `ok` field recorded terminal=FAILED for genuinely executed actions.
The evidence fields were still truthful and the guard records were
still correct, but the label erred fail-safe.

## The machine rules this lesson establishes

1. Every outcome receipt MUST carry an explicit boolean `ok` field.
   `OUTCOME_OK_BOOLEAN_REQUIRED` raises on any receipt missing it.
2. UNKNOWN outcomes go to a SEPARATE stream (`unknown-persisted.jsonl`)
   with NO `ok` field at all, so no reader can misderive a FAILED
   label for them. UNKNOWN = do not dispatch. UNKNOWN stays UNKNOWN.
3. No receipt may claim canonical success without verification:
   `NO_CANONICAL_SUCCESS_WITHOUT_VERIFICATION`. Success is declared
   only after a read-after-write verification read confirms the
   external state changed.

## This skill's usage

- `OutcomeReceipt` (schemas/outcome-receipt.jsonl) requires `ok: boolean`.
- `execute_intent` in `bin/x_orchestrator.py` writes receipts only after
  the verification read; a verification read outage writes to
  `unknown-persisted.jsonl` with no `ok` field.
- `assert_ok_boolean_present` in `bin/x_invariants.py` enforces rule 1.
- The behavioral suites cover both directions: test_04 proves the
  lying-adapter case records FAILED_TERMINAL with `ok: false`, and the
  read-outage case persists UNKNOWN with no `ok` field.
