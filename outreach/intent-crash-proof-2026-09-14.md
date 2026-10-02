# Action-without-observation: crash proof (2026-09-14)

## Objective

Close the highest-priority execution seam: SELECT to BROWSER ACTION to
WORKER DIES to NO LOG to NEXT PASS SEES NOTHING to SAME ACTION MAY BE
SELECTED AGAIN. Prove with a REAL restart that a worker death between
action intent and outcome observation is (a) visible, (b) blocks automatic
re-execution of every external commitment type, and (c) is clearable only
by a deliberate reconciliation act.

## Lifecycle states (Nolan's exact directive)

ACTION_INTENT_DURABLE -> EXECUTION -> OBSERVATION -> FINALIZATION

Terminal states: EXECUTED, FAILED, UNKNOWN_EXECUTION, NOT_ATTEMPTED.

- ACTION_INTENT_DURABLE: one intent record per planned action, appended
  BEFORE the browser worker is invoked. Never mutated afterwards.
- EXECUTION: the action has been handed to the worker. Appended BEFORE
  delivery (scp / browser-task start) so a crash between marking and
  delivery still fails closed. From this point, a missing OBSERVATION
  means the external commitment may or may not have happened.
- OBSERVATION: the worker's evidence was recorded. Terminal is EXECUTED
  (ok=true), FAILED (attempted, did not take effect, ok=false), or
  NOT_ATTEMPTED (worker proves it never acted: logged-out session, CDP
  attach failure, abort before the action, pre-flight failure).
- FINALIZATION: an EXECUTED outcome was durably recorded in the
  engagement history (guard record). Terminal EXECUTED.
- UNKNOWN_EXECUTION: derived, not written. An intent that reached
  EXECUTION with no OBSERVATION from a pass that is no longer running.
  It blocks automatic re-execution of that (account, platform, action)
  until a deliberate reconciliation resolves it as EXECUTED (requires
  --history-recorded plus evidence) or NOT_ATTEMPTED (requires stated
  reason, evidence, resolved-by).

UNKNOWN_EXECUTION must never silently retry an external commitment:
like, comment, post, DM, email, form submit. The ledger's action
vocabulary covers all six; write-intents refuses unknown actions.

## Method

A REAL worker subprocess (`fake_worker.py`, mimics the engage.js
contract: per-action "started" heartbeat before the delay, per-action
outcome after) is SIGKILLed mid-flight: after action 1's outcome is
written, during action 2's execution window, before action 2's outcome.
The observer is dead too: record-outcomes is never run. Then next-pass
selection runs as a GENUINELY NEW process (setsid, new PID, new process
group, fresh env carrying only the sandbox overrides; the ledger file is
the only state it can see).

Fixture data only. Sandbox engagement-log copies (ENGAGEMENT_GUARD_DIR)
and a sandbox ledger (ENGAGEMENT_INTENT_LEDGER). The production ledger
`~/workspace/outreach/action-intent-ledger.jsonl` was never touched and
does not exist; no live engagement or outreach pass ran.

Harness: `~/workspace/outreach/test-action-intent-ledger.sh` (re-runnable).
Result on 2026-09-14: PASS=38 FAIL=0.

## What was proven

1. write-intents appended 5 intents (like, comment, post, dm, email), all
   ACTION_INTENT_DURABLE, before any worker involvement.
2. mark-execution moved all 5 to EXECUTION before delivery.
3. The worker (real subprocess, pid 7484) was SIGKILLed with 2 actions
   started per its heartbeat; its partial result file held 1 outcome and
   complete=false.
4. Next-pass selection as a genuinely new process (selector pid 7547)
   returned eligible=0, refused=5; every refusal carried state
   UNKNOWN_EXECUTION with intent id, timestamp, pass id, and the
   truthful reason including "will not auto-retry". Refused actions:
   comment, dm, email, like, post. No commitment type was silently
   retried.
5. Same-pass restart (new process, same pass_id) was NOT blocked:
   eligible=5 (in-flight work is not unknown).
6. list-unknown showed the 5 open intents as UNKNOWN_EXECUTION: the
   reconciliation inbox.
7. Deliberate recovery: the reconciler inspected the worker's partial
   result file and ran record-outcomes on it (a human/agent act, never
   automatic). Action 1 closed as OBSERVATION/EXECUTED; after a sandbox
   guard record and finalize it reached FINALIZATION/EXECUTED; the
   guard then reported ALREADY_ENGAGED.
8. Actions 3 (post) and 4 (dm), never started per the heartbeat, were
   reconciled as NOT_ATTEMPTED with stated evidence; a new-process
   refuse then found them eligible again.
9. Action 2 (started, no outcome) and action 5 (email, unverified) stayed
   UNKNOWN_EXECUTION and stayed blocked in a new-process refuse: the
   mid-flight boundary fails closed exactly where knowledge ends.
10. Worker-evidence semantics: ok=true -> EXECUTED; ok=false -> FAILED;
    logged-out result -> NOT_ATTEMPTED; pre-flight --not-attempted ->
    NOT_ATTEMPTED; timeout with no report -> left open (UNKNOWN_EXECUTION).
11. Reconciliation guards: unknown intent id refused; double
    reconciliation refused; EXECUTED without --history-recorded refused;
    empty reason/evidence/resolved-by refused; --not-attempted without
    --reason refused; unknown action refused at write-intents.
12. Corrupt ledger tail: refuse exited 3 with no eligible output (fail
    closed until an operator inspects).
13. Append-only: the pre-reconciliation snapshot was a byte-prefix of the
    ledger after reconciliations (2812 bytes intact, +2 reconciliation
    records). No record was mutated.
14. Wrapper rehearsal: run_pass.sh with a stubbed Pig (CDP down) emitted
    the exact result JSON contract on stdout and closed the intent as
    OBSERVATION/NOT_ATTEMPTED via mark-execution + record_not_attempted.

## Architectural test (8 conditions)

1. Real failure exists: worker death between browser action and logging
   leaves the next pass blind; the same like/comment/post/DM/email can be
   selected and executed twice.
2. Existing guard/history did not fix it: the guard only knows completed,
   durably recorded engagements; it cannot distinguish NOT_ATTEMPTED
   from EXECUTED_BUT_UNOBSERVED.
3. Missing seam: durable intent BEFORE browser execution (ACTION_INTENT_
   DURABLE), an explicit EXECUTION handoff, and OBSERVATION records with
   terminal states, so UNKNOWN_EXECUTION is a derived, visible state.
4. Patch preserves PING as the authority and the engagement guard/history
   as the engagement record: the ledger owns execution state, never
   business facts; FINALIZATION requires the guard record.
5. Demonstrated with a real mission shape: a real worker subprocess,
   real SIGKILL mid-flight, and next-pass selection as a genuinely new
   process reading only the ledger file.
6. Removing the patch reproduces the failure: without write-intents /
   mark-execution there is no record of the dead worker's actions, so
   refuse has nothing to block and the next pass re-selects them.
7. Concrete business-agent failure unblocked: the Marketing Business
   Agent is the first real routing consumer ("what is the next justified
   action for this business?"). Without truthful execution state its
   routing function cannot distinguish NOT_ATTEMPTED from EXECUTED_BUT_
   UNOBSERVED, so it either re-selects an already-executed external
   commitment (double like/comment: account action-block risk, the exact
   failure the guard was built to prevent) or abandons a never-attempted
   action (lost opportunity). The ledger gives the agent a queryable,
   truthful execution state per (account, platform, action): check,
   list-unknown, and refuse are its routing inputs.
8. Auditable by a fresh agent from artifacts alone:
   - State machine and record types: the module docstring of
     ~/workspace/outreach/action-intent-ledger.py.
   - Wiring order (refuse -> write-intents -> mark-execution ->
     deliver -> record-outcomes): ~/workspace/pig-fb/run_pass.sh and the
     step 4b/5b/6/12 bodies of the instagram cron file plus the ACTION
     INTENT paragraph of the facebook cron file.
   - The crash proof: re-run ~/workspace/outreach/test-action-intent-
     ledger.sh; it needs only fixture data and prints PASS/FAIL.
   - Reconciliation protocol: list-unknown / reconcile --help output.
   - Identity matching (one implementation): imported from
     ~/workspace/outreach/engagement-guard.py, never duplicated.

## Caveats

- FINALIZATION is a caller-run step after the engagement guard has
  durably recorded the observed action in the markdown engagement
  history. run_pass.sh records worker observations but does not itself
  append the guard record.
- An intent at OBSERVATION/EXECUTED is no longer unknown but is not
  terminal-EXECUTED until finalize runs.
- EXECUTED reconciliation requires --history-recorded plus evidence, but
  the ledger trusts that explicit assertion rather than independently
  parsing the history.
- A malformed JSONL tail fails closed (exit 3) until an operator
  inspects it.
- Recovered orphan worker result files are evidence, but associating
  them with old intents is a deliberate reconciler act, never automatic.
- No script in the system calls reconcile; only a human or an agent
  acting deliberately does.

## Files

- ~/workspace/outreach/action-intent-ledger.py (lifecycle ledger)
- ~/workspace/outreach/fake_worker.py (fixture worker for the proof)
- ~/workspace/outreach/test-action-intent-ledger.sh (the proof harness)
- ~/workspace/pig-fb/run_pass.sh (refuse, write-intents, mark-execution,
  record-outcomes wiring)
- crons/hourly/instagram-engagement-pass__interval@3h.md (same wiring
  for the IG path)
- crons/hourly/facebook-engagement-pass__interval@6h.md (ACTION INTENT
  paragraph)
