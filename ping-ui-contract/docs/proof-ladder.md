# Proof vocabulary: operational ladder

Approved 2026-09-17 (Nolan). This ladder is the epistemic discipline behind every maturity and stage claim in this repository. It is NOT introduced as an enum set; the mechanical vocabulary remains the five maturity values and six implementation stages. This document defines what each rung means so that claims like "implemented" or "wired" cannot silently skip rungs.

## The ladder

```
DECLARED
   |
   v
IMPLEMENTED        code exists that could perform the operation
   |
   v
REACHABLE          the code path is addressable from an authorized caller
   |
   v
WIRED              the call is actually connected end to end (not a stub)
   |
   v
EXECUTED           the operation ran
   |
   v
PERSISTED          the result was durably recorded (see persistence rule)
   |
   v
VERIFIED           the record was read back and checked
   |
   v
REPLAYABLE         the operation can be reproduced and re-proven
```

## The persistence rule (P0)

No required write may report successful completion when the persistence operation was skipped. A transport-level acceptance is not proof of persistence. Evidence: `UnifiedEventRuntime.emit()` returns `{status:'ok'}` even when the INSERT was skipped on a null pool. That return value proves ACCEPTED, not PERSISTED. Any UI projection deriving "complete" from it violates UI CLAIM <= BACKEND PROOF.

## How it maps to the contract vocabulary

- IMPLEMENTED (stage) requires at least DECLARED + IMPLEMENTED rungs.
- WIRED (stage) requires REACHABLE + WIRED rungs: an actual connected call.
- RUNTIME_VERIFIED (stage) requires EXECUTED + PERSISTED + VERIFIED rungs.
- A stage claim that skips rungs is proof inflation and fails the mechanical validator's spirit: a surface may not render as WIRED because code exists (that is IMPLEMENTED), and may not render as verified because it ran (that is EXECUTED without PERSISTED/VERIFIED).

## How the validator enforces it

The operation-result interpretation (`operation-result.json`, `interpretOperationResult`) decomposes every result into four independent statuses:

- `transport_status`: accepted | rejected | unknown
- `execution_status`: ran | failed | not_run | unknown
- `persistence_status`: persisted | skipped | unknown
- `verification_status`: verified | unverified | unknown

The UI projection derives `PROVEN_COMPLETE` only when the operation's required proofs exist: for a write, that means executed AND persisted AND verified. Any required dimension unknown or skipped makes PROVEN_COMPLETE false and the projection renders the gap. This is the mechanical form of "command accepted != state mutation proven".
