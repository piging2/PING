# Approved architecture decision: intent is NOT one canonical object

**Status:** APPROVED by Nolan 2026-09-17. This is a decided architecture question. It supersedes the open status of question 2 in `backend-forensic-questions.md`.

## Decision

The two things currently called "intent" are distinct concepts. Do NOT union them.

## The two levels

**Level A: Action Intent.** The specific intended operation. Identity: `intent_id` (per-action). Answers: "what action is intended?" Examples: write file X, send request Y, promote snippet Z, update projection P. This is the atomic/action-level object, recorded in `action-intent-ledger.jsonl` with lifecycle ACTION_INTENT_DURABLE -> EXECUTION -> OBSERVATION -> FINALIZATION.

**Level B: Execution/Pass aggregate.** What happened during this execution/pass. Identity: `run_id` in `action-truth.jsonl` (pass-level). This is not an intent; it is an aggregate of intents.

## The model

```
EXECUTION
   |
   +-- INTENT(S)
         |
         +-- ACTION(S)
               |
               +-- RESULT
                     |
                     +-- EVIDENCE
```

Unioning them now would erase the semantic distinction between "what was intended" and "what happened during the pass".

## Open hypothesis (investigated, not decided)

`run_id` in action truth may be conceptually trying to represent the missing execution/pass identity, i.e. it may correspond to the newly approved first-class execution identity. This is a hypothesis only. The rule is:

- Prove the semantics from code evidence first.
- Do NOT simply rename `run_id` to `execution_id`.
- If the semantics match (one run_id = one authorized execution/pass, stable across attempts, attributable), the mapping can be proposed to Nolan as a contract change. If they do not match, keep the concepts separate.

## Contract status

- The intent-ledger viewer keeps projecting Level A (`intent_id`) with terminal dispositions.
- Pass aggregates (`run_id`) are displayed as aggregates, never relabeled as execution identity.
- Maturity: PROVEN (both representations exist and are evidenced). The union question is DECIDED: no.
