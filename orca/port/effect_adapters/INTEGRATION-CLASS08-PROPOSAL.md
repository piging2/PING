# INTEGRATION-CLASS08-PROPOSAL.md — REVIEW-REQUIRED

Status: PROPOSAL ONLY. This document proposes a concrete patch to
`~/workspace/outreach/send-batch.py`. It is NOT applied. No live change is
made by this lane. Review by the parent orchestrator (and Nolan where the
human boundary applies) is required before any integration work begins.

## What exists today

`send-batch.py` already has an UNVERIFIED branch: when the send CLI returns
ok but the Gmail Sent verification fails, the batch stops with "check sent
mail before re-sending". Re-send today is a human decision outside the
script. The eligibility checker (`send-eligibility.py`) already runs before
every `+send`.

## Proposed patch (pseudocode, not applied)

In `send-batch.py`, replace the manual UNVERIFIED branch with an adapter
call:

```python
# after a +send whose Sent verification failed (receipt unverified):
from orca_adapter_bridge import class08_probe_and_decide  # new shim module

decision = class08_probe_and_decide(
    op_input={
        "missionId": run_id,            # the batch run id (caller-supplied)
        "channel": "email",             # | "fb_dm" | "form"
        "recipient": addr,              # normalized inside the adapter
        "actionType": action,           # cold | followup-f1 | followup-f2 | review-triggered | dm | form-submit
        "touchSeq": touch_seq,         # from the pipeline row
        "contentHash": sha256(approved_body),
    },
    attempt_window={"after": run_date, "before": run_date},
    context={
        # consumed, not modified, by the adapter:
        "eligibilityExitCode": <exit code from the pre-send send-eligibility.py run>,
        "openIntent": <bool: unresolved intent for this op in action-intent-ledger>,
        "touchCount": <int: touches already sent to this recipient>,
        "followupLadderActive": <bool>,
        "actionType": action,
    },
)

if decision["decision"] == "SAFE_TO_RETRY":
    # re-run the SAME frozen content through the normal pre-send gates
    # (eligibility + caps), then +send once, then verify again.
    continue_with_resend(decision["evidence"])
elif decision["decision"] == "RECOVER_SUCCEEDED":
    mark_sent_with_evidence(decision["evidence"]["messageId"])
elif decision["decision"] == "RECOVER_FAILED":
    mark_failed(decision["evidence"])          # terminal, do not retry
else:  # HOLD_UNKNOWN
    halt_batch(decision["holdReason"])        # human (Nolan) reconciles
    emit_hold_record(decision)                # EFFECT_UNKNOWN + EFFECT_HELD
```

The bridge (`orca_adapter_bridge.py`) shells out to a small node runner
that loads `class_08_message_execution.js`, runs `probe()` with real deps
(`hatch_gws_cli gmail +triage`, the thread reader, the local form-state
reader), then `retryPredicate()` via `adapter_core.evaluatePredicate()`,
and finally `escalateHold()` / `recordOutcome()` once the A6 foundation
lands (until then the shim emits marked JSON lines; no canonical state).

## Invariants the patch must preserve (acceptance criteria)

1. The pre-send gates (eligibility exit 0, caps, no open intent) still run
   before EVERY `+send`, including adapter-authorized retries.
2. A retry never carries reworded content: the resend uses the identical
   frozen snapshot (same contentHash), so the op key still matches.
3. The follow-up ladder cap (max 3 touches) is enforced inside the
   predicate; the patch must not bypass it with a manual resend path.
4. HOLD halts the batch and pages a human; there is no silent auto-resume.
5. `send-eligibility.py`, `engagement-guard.py`, `action-intent-ledger`,
   and `send-batch.py`'s existing send flow are consumed, not modified,
   except for the single UNVERIFIED-branch call site described above.

## Open questions for review

- Where does the bridge live: inside `~/workspace/outreach/` (near the
  machinery) or on the Pig (near the CDP thread reader)? The FB DM thread
  reader needs the Pig's headed Chrome; the Gmail probe can run anywhere
  with the CLI.
- Should the hold record also append to `eligibility-discrepancies.jsonl`
  when the hold reason is exit 2, so the existing reconciliation flow
  picks it up? (Recommended: yes.)
- Attempt indexing: the first adapter-authorized retry is attempt 1 under
  `deriveAttemptKey`; the ledger must store attempt keys alongside op keys.
