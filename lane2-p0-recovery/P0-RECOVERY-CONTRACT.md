# LANE 2 transplant-ready contract: P0-4 / P0-5 / P0-6 / P0-7

Written 2026-09-19 ~19:25 MDT WITHOUT repo access (worktree blocked, see FAILURE_LEDGER.md FL-20260919-P04-LANE2-001).
This is a CONTRACT for the lane that gets repo access, not a forensics report. All file references are
UNVERIFIED PLACEHOLDERS. Do not promote any of them to evidence without inspecting the code.

## Verified BEFORE-state (sources cited, no invention)

From FL-20260919-ORACLE-007 (live Oracle observation, 2026-09-19 ~19:03 MDT):
1. Gateway booted while postgres was still initializing and fell into IN-MEMORY DEGRADED MODE
   (CapabilityAuthority / ExteriorAuth / Postgres all degraded).
2. During degraded startup it printed GENERATED API KEYS into container logs.
3. The gateway does NOT retry Postgres after entering degraded mode; it stays degraded until restarted.
4. Health endpoint still served (200) while degraded; verification required grepping logs for "degraded"
   because /health 200 alone was insufficient.
5. Generated credentials in degraded-boot `docker logs` history are ephemeral (in-memory only) but logged.

From task background (premise, to be proven against code by the executing lane):
- Refactored composition (commit bb63da5ec) chooses in-memory degraded mode at startup when Postgres
  is unreachable, never retries, still reports healthy on the health endpoint.
- Constitutional requirement: CANONICAL STORAGE UNAVAILABLE must NOT become CANONICAL SYSTEM HEALTHY.

## P0-7 characterization matrix (BEFORE = verified observation; AFTER = required contract)

| Scenario | PROCESS LIVENESS | READINESS | DEGRADED STATE | CANONICAL WRITE ALLOWED? | STORAGE AUTHORITY | RECOVERY ACTION |
|---|---|---|---|---|---|---|
| A Postgres healthy at boot | alive | READY | none | yes | Postgres/ping_events | none |
| B Postgres unavailable at boot (BEFORE) | alive | reports healthy (false) | in-memory degraded, no retry, keys logged | ambiguous / must be NO | in-memory masquerading | none (stays degraded until restart) |
| B (AFTER, required) | alive | NOT_READY | explicit degraded, never presented as canonical | NO: canonical writes rejected | Postgres declared UNAVAILABLE; in-memory storage labeled NON-CANONICAL | bounded retry with backoff |
| C Postgres becomes available after failed boot (BEFORE) | alive | NOT_READY/degraded | degraded persists | NO | in-memory | restart only |
| C (AFTER, required) | alive | eventually READY, exactly-once transition | spine initialized exactly once on first successful connect | only after READY | Postgres | retry succeeds -> initialize canonical DB-dependent spine exactly once -> READY; later connects are no-ops |
| D Postgres disappears after READY (BEFORE) | alive | unknown (not traced) | unknown | must be NO | Postgres unreachable | unknown |
| D (AFTER, required) | alive | NOT_READY/DEGRADED | explicit | NO: canonical path fail-closed per existing authority semantics | Postgres declared UNAVAILABLE | bounded retry; do NOT silently fall back to in-memory canonical writes |

## P0-5 recovery state machine (required)

STARTING -> DB unavailable -> NOT_READY/DEGRADED -> bounded retry with backoff -> DB available ->
initialize canonical DB-dependent spine EXACTLY ONCE -> READY.

Duplicate-initialization prohibition (prove with an exactly-once guard + test):
- no duplicate UnifiedEventRuntime
- no duplicate event handlers
- no duplicate MissionScheduler
- no duplicate EventToMissionBridge
- no duplicate workers
- no duplicate pollers
- no duplicate route mounting

FAIL-CLOSED alternative (if safe late initialization is impossible with the current lifecycle):
DB unavailable -> gateway remains NOT_READY, process may stay alive for retry, canonical writes rejected,
reconnect eventually initializes once. NEVER represent in-memory fallback as canonical persistence.

## P0-6 secret-logging policy (required)

- Remove secret-VALUE logging at the generation site and every adjacent startup/error path
  (tokens, credentials, authorization headers, raw credential-bearing objects).
- Do NOT replace with a reversible encoding.
- Logs may carry safe metadata only: credential identifier, namespace, creation outcome,
  non-secret fingerprint IF existing policy permits.
- Required test: capture startup logs on the degraded/failure path; assert the generated key value
  is absent. Regression-scan adjacent paths for equivalent secret logging.
- If any logged credential found is still valid: report CREDENTIAL ROTATION REQUIRED without printing it.
- Stop future logging first; rotation assessment second.

## P0-4 forensics checklist (for the executing lane, BEFORE patching)

With exact file:line evidence determine:
1. where the Postgres connection fails;
2. who chooses degraded mode;
3. what storage becomes in-memory;
4. which endpoints remain available in degraded mode;
5. whether canonical events can be accepted in degraded mode;
6. what health/readiness reports;
7. whether later Postgres recovery is observable;
8. whether any in-memory state can be mistaken for canonical truth.
Constraint: do not invent a broad health framework if the existing HealthAuthority can express this.

## Handoff notes

- Commit structure: leave changes UNCOMMITTED; central assembler commits (one-writer rule). Never
  git add, especially not ping-runtime/orchestration/generate_*.js, stable_payload.js, GENERATOR_DETERMINISM.md.
- Do not modify Oracle. Do not touch CERTIFICATION.md, CONTRADICTIONS.md, evals/ modified files.
- Never print secret values in reports, commit messages, or chat.
- Test evidence required per P0-9 items 4-10 in the final report (executing lane's responsibility).
