# Self-audit 2026-10-01: capture_failed terminal labels vs post-hoc passing revalidation

## What the run saw (production evidence, this pass)

Today's b-new-business-radar brief produced three runs, all non-ok:

1. `20261001-030650-b-new-business-radar` — exit 3, outcome capture_failed
   ("answer presence validation failed: prompt-only/empty/malformed capture (no numbered business list)")
2. `20261001-090412-b-new-business-radar` — exit 3, outcome capture_failed (same note)
3. `20261001-150443-b-new-business-radar` — exit 143, outcome unknown,
   classification terminated_by_signal_TERM (tool-service restart SIGTERMed the
   pass mid-flight ~90s in; no answer file exists)

Post-hoc revalidation of runs 1 and 2 with the SAME presence validator
(`~/workspace/tandem/validate-meta-answer.py`, invoked as meta-pass.sh invokes it):

- run 1: `answer chars: 12435, numbered items: 10`, exit 0
- run 2: `answer chars: 12105, numbered items: 10`, exit 0

Both `.md.CAPTURE_FAILED` artifacts contain genuine 10-business numbered lists
in the brief's expected shape (numbered "Business - Town - Trade" headers with
recognized labeled fields: Contact / Evidence new / Weak signal / Verification).

## Invariant (specified from this evidence)

A terminal capture_failed label does NOT imply the persisted artifact is empty
or prompt-only. The presence validator can reject at run time (VRC=3) while the
durable artifact passes the same validator later. The likely mechanism is a
pull race: meta-pass.sh pulls the Pig answer file while the worker is still
streaming it (raw bin `/tmp/meta-raw-<slug>.bin` incomplete at validation
time), and the artifact is completed afterward — but the state machine is
terminal, so the content is evidence-only forever.

## What was NOT done (deliberately)

The two files were NOT promoted into distillation or business extraction.
The result-state machine is terminal and the research contract is the sole
pass/fail gate; nothing here lowers its bar. The files remain evidence-only
per the capture_failed_closed transitions already stamped by
mark-distill-closed.sh.

## Recommended machinery (for the dev lane, human-gated)

1. Log the raw-pull byte count (and pull timestamp) into the runs.jsonl line at
   validation time, so a later agent can distinguish "validator saw 0 bytes
   because the pull raced" from "validator saw full bytes and rejected them".
2. Add a HUMAN-GATED revalidation path: a capture_failed artifact that
   post-hoc passes presence validation gets flagged for human review, never
   auto-promoted. Promotion would require Nolan's approval, same as quarantine
   lifting.
3. Consider a re-pull-before-fail-closed step in meta-pass.sh: if the validator
   returns VRC=3 on a raw pull smaller than the previous poll's size, wait and
   re-pull once before stamping terminal capture_failed.

## Test (unit cases for whoever implements)

- Case A: raw pull of 200 bytes, artifact later 12,435 bytes, validator passes
  post-hoc -> flagged human-review, not auto-promoted.
- Case B: raw pull equals artifact size, validator rejects both -> terminal
  capture_failed, no flag.
- Case C: genuine prompt-only capture -> terminal capture_failed, no flag.

Recorded by meta-ai-intel-pass, 2026-10-01 ~09:10 MDT. No machinery changed;
note only.
