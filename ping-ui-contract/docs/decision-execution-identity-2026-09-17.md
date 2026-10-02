# Approved architecture decision: first-class execution-attempt identity

**Status:** APPROVED by Nolan 2026-09-17. This is a decided architecture question, not an open forensic question. It supersedes the open status of question 1 in `backend-forensic-questions.md`.

## Decision

PING gets a first-class identity for an execution attempt. This does not create another identity hierarchy, another event identity, or another orchestration engine. It names one thing: the concrete attempt that performed a mission's work.

## The identity chain (do not collapse)

```
EVENT            What happened?
  |
  v
MISSION          What work did PING decide should happen?
  |
  v
EXECUTION        Which concrete attempt performed that work?
  |                (one execution = one authorized assignment)
  |
  +-- INTENT(S)  What action(s) were intended?
        |
        v
      ACTION(S)
        |
        v
      RESULT
        |
        v
      EVIDENCE / WITNESS / LINEAGE
```

Each layer answers a different question. Collapsing execution into mission destroys attempt-level lineage: with only `mission_id`, three attempts (worker crash, lease expiry, success) all read as the same history.

## Ownership

MissionRuntime at `assign()` time. The transition

```
PENDING MISSION -> MissionRuntime.assign() -> EXECUTION ATTEMPT EXISTS
```

is the moment PING constitutionally authorizes a particular attempt, so the runtime creates the identity there. Not the UI. Not the worker. Not Codex, Hermes, the scheduler independently, or any exterior agent. The UI projection schema (`run.json`) stays gap-labeled until the runtime owns this identity; the UI never generates execution identity.

## Authority path

`IdentityAuthority -> canonical execution identity`. Nolan's constraint: inspect existing IdentityAuthority capabilities FIRST, then propose the minimal deterministic formula consistent with it (conceptually: mission identity + attempt ordinal + assignment semantics). Do NOT invent random UUIDs. Do NOT implement the exact formula yet; the formula proposal goes to Nolan for review. The authority hierarchy matters more than the particular hash format.

## What the identity carries

Each execution result carries:

- `mission_id` (the mission it served)
- `execution_id` (the attempt; authority-generated)
- `principal` (who/what was authorized)
- `worker_id` (which executor performed it)
- `attempt` (ordinal)
- `causation_id` / `correlation_id` where the existing schemas permit

Executor identity (JS, Python, Codex, Hermes, Oracle, local, future cloud) remains metadata. One execution model; many executors.

## Contract status

- Execution identity: DIRECTION, awaiting runtime implementation.
- `run.json` remains a gap-labeled projection; no implementation may populate it from inferred data.
- The route-projection matrix records execution identity as DIRECTION with implementation stage CONTRACT_DEFINED.

## Why this matters beyond lineage

First-class execution identity is the connective tissue for the multi-runtime architecture: many hands (JS, Python, Codex, Hermes, Oracle, cloud workers) may perform work while PING reconstructs exactly who did what, for which mission, under which authority, with what evidence. Without it, cross-runtime evidence cannot be attributed.
