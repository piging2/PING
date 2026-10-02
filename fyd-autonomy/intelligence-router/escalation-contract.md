# Escalation contract — enforced fields for every paid invocation

Source: `~/workspace/fyd-autonomy/intelligence-escalation-router.md`.
If these fields cannot be populated: DO NOT ESCALATE.

## The 11 required fields

1. **TASK_ID** — unique id for this invocation; links the ledger line, the
   evidence pack, the model output, and the verification result.
2. **WHY_AI_IS_NEEDED** — what cognition is being bought that Tier 0
   (deterministic software) cannot provide.
3. **WHY_HEADLESS_WAS_INSUFFICIENT** — what Tier 1 (headless/Copilot labor)
   already tried and why it did not resolve the task.
4. **CHEAPER_ATTEMPTS** — the Tier 0/1/2 attempts made, with evidence
   (test output, grep results, failed patches). "None" is not acceptable
   above Tier 2.
5. **EXPECTED_OUTPUT** — the exact shape wanted: diagnosis / plan /
   invariants / patch spec / test spec / risks. Premium models THINK;
   they do not do implementation labor.
6. **MAX_INPUT** — token cap on the evidence sent. Premium models receive
   problem + invariants + relevant code + test evidence + failed attempts,
   NEVER the whole repo.
7. **MAX_OUTPUT** — token cap on the completion (keeps cost bounded and
   outputs scorable).
8. **MAX_COST** — per-call USD ceiling from live-catalog pricing; the call
   is not issued if the estimate exceeds it.
9. **MODEL_TIER** — 2 (free/near-free) or 3 (premium), with the tier
   classification recorded (task type, risk, context size, reasoning need,
   tool need, multimodal need, expected value, prior failures).
10. **RESULT** — the model's output, stored verbatim with its run file.
11. **VERIFICATION** — how the output was checked: deterministic tests the
    implementation must pass, and their outcome. THE MODEL DOES NOT DECLARE
    ITS OWN WORK CORRECT.

## Enforcement

- The benchmark runner (`~/workspace/fyd-autonomy/benchmark/run.py`)
  refuses to issue a call without task_id, model, tier, max_input,
  max_output, and a ledger line carrying all eleven fields' substance.
- The cost ledger (`cost-ledger.jsonl`, schema:
  `cost-ledger.schema.json`) is append-only; the runner halts before any
  call that would push `running_total_usd` over the authorized cap.
- After implementation by the cheap agent: deterministic tests decide
  truth. Record their pass/fail in VERIFICATION.
