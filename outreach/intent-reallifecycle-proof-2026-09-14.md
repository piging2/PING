# ACTION_INTENT lifecycle proof against the REAL Facebook execution path

Date: 2026-09-14 (proof executed 14:04:49 - 14:05:16 MDT)
Prover: subagent, Nolan-authorized real-path proof (priority #4, BUSINESS-AGENT SEAM program)
Prior proof: intent-crash-proof-2026-09-14.md used a fixture worker. This proof uses the real driver.

## The invariant, in one sentence

An intent that reached EXECUTION with no OBSERVATION from a dead pass is refused as UNKNOWN_EXECUTION by the next pass's selection path with a truthful reason, never silently retried, and is cleared only by deliberate reconciliation grounded in worker-side evidence.

## Real path under test (unmodified)

`~/workspace/pig-fb/run_pass.sh` (not modified for this proof), verbatim sequence:

1. Orphan reaper: lists Pig inbox over SSH, pulls uncollected `job-*.result.json` files.
2. `engagement-guard.py filter` (never-re-engage) on the job; fail closed.
3. `action-intent-ledger.py refuse` on the guard-filtered job; fail closed if the ledger is unreadable.
4. `action-intent-ledger.py write-intents` -> one intent record per action, stage ACTION_INTENT_DURABLE, fsync per append.
5. `action-intent-ledger.py mark-execution` -> stage EXECUTION, recorded BEFORE scp/delivery.
6. `ensure-cdp.sh` preflight (SSH probe of CDP :9223 on the Pig).
7. `pig_scp` job to Pig inbox (DELIVERY).
8. One SSH session starts `engage.js` on the Pig with the job (FIRST POSSIBLE BROWSER ACTION).
9. `record-outcomes` from the worker result JSON (OBSERVATION -> EXECUTED / FAILED / NOT_ATTEMPTED).

## The deterministic kill point

Kill between step 5 (EXECUTION durably recorded) and step 7 (delivery). Why the timing is deterministic, not lucky:

- `mark-execution` appends the execution record with a single write plus fsync, then the Python process exits. The very next command run_pass.sh executes is `ensure-cdp.sh`, whose first action is an SSH round trip to the Pig (`pig_ssh` + PowerShell + `Invoke-WebRequest http://127.0.0.1:9223/json/version`). Measured Pig SSH round trips during this proof: ~2.1 s. The earliest `scp` can start is after that probe returns.
- A watcher polled the ledger every 50 ms for an execution record belonging to the proof pass and, on first sight, sent SIGKILL to the entire run_pass.sh process group (children included: ssh, scp, python all die; SIGKILL cannot be caught).
- Observed reaction: 0.0 ms between seeing the execution record and the kill being sent; the record can be at most one 50 ms poll old. So the kill landed within ~100 ms of mark-execution completing, while ensure-cdp.sh's ~2 s probe was still in flight. Delivery was structurally impossible: scp never started.
- Ground truth, independent of timing: the Pig inbox listing before and after the kill is byte-identical. No `job-20260914-200458.json` was ever delivered, no new `job-*.result.json` was created. engage.js only acts on a job file passed to it as an argument; no job file existed, so no browser action could have occurred. If either file had been present, this proof would have been reported unsafe instead of successful.

Safety posture: the candidate was a `like` on PING Social's own Facebook page (never engaged before, guard-eligible). This was deliberate defense in depth: even in the catastrophic case of a late kill, the only possible external commitment would have been a like on Nolan's own page. The kill was not late, so this fallback was never exercised. It is labeled here as a controlled choice, not as part of the invariant.

## Exact commands and outputs

All times UTC (MDT = UTC - 6).

### 1. Baseline (14:04:49 MDT)

```
$ source ~/workspace/pig-fb/pig-ssh.sh && pig_ssh "powershell -NoProfile -Command \
  \"Get-ChildItem 'C:/Users/nolan/.local/share/pigi/fb-engage/inbox' | ForEach-Object { $_.Name }\"" \
  | tr -d '\r' | sort > /tmp/proof/inbox-before.txt
18 files, latest: job-20260914-173030.json + .result.json (11:38 pass). No proof files.
$ ls ~/workspace/outreach/action-intent-ledger.jsonl
No such file (the real ledger had never been written; every real pass so far exited before write-intents).
```

### 2. Proof job and guard dry run (14:04:51 MDT)

```
$ cat /tmp/proof/proof-job.json
{"actions": [
  {"page": "PING Social", "url": "https://www.facebook.com/profile.php?id=61594275542163", "type": "like"}
], "minDelaySec": 60, "maxDelaySec": 120}

$ engagement-guard.py filter --platform facebook --fb-job \
    --in /tmp/proof/proof-job.json --out /tmp/proof/proof-job-guardcheck.json
{"platform": "facebook", "checked": 1, "eligible": 1, "blocked": []}
```

(Dry run omitted --audit, so no audit line was written. The real run below wrote its own.)

### 3. Launch the REAL driver (14:04:58.821 MDT)

```
$ setsid ~/workspace/pig-fb/run_pass.sh /tmp/proof/proof-job.json \
    > /tmp/proof/run-stdout.log 2> /tmp/proof/run-stderr.log < /dev/null &
LAUNCHED pid=10216   (pgid 10216)
```

run_pass.sh was not modified. The job flowed through the real reaper, guard, refuse, write-intents, mark-execution.

### 4. Watcher: kill on first EXECUTION record

```
$ python3 /tmp/proof/watcher.py 10216
{"watcher_start": 1789416300.7287426, "target_pgid": 10216}
{"intent_seen": true, "pass_id": "fb-20260914-200458", "t": 1789416301.2863739}
{"killed": true, "pass_id": "fb-20260914-200458",
 "t_intent_seen": 1789416301.2863739, "t_exec_seen": 1789416301.38759,
 "t_kill_sent": 1789416301.387623, "reaction_ms": 0.0}
```

Driver stderr at death (the complete output; nothing follows mark-execution):

```
[run_pass] guard: eligible=1 blocked=0 (see facebook-engagement.md)
[run_pass] intent-ledger: eligible=1 refused_unknown_execution=0
{"platform": "facebook", "pass_id": "fb-20260914-200458", "written": 1, "skipped_existing": 0, "intent_ids": ["cec44d9f543c42a98ff196e581f6b091"]}
{"platform": "facebook", "pass_id": "fb-20260914-200458", "marked_execution": 1}
```

No ensure-cdp output, no scp, no worker output. Process group 10216 confirmed dead afterward (`ps -g 10216` empty).

Ledger state after the kill (append-only file, 2 records):

```
{"account": "PING Social", "action": "like", "intent_id": "cec44d9f543c42a98ff196e581f6b091", "pass_id": "fb-20260914-200458", "platform": "facebook", "record_type": "intent", "stage": "ACTION_INTENT_DURABLE", "ts": "2026-09-14T20:05:01.271803+00:00", "url": "https://www.facebook.com/profile.php?id=61594275542163"}
{"intent_id": "cec44d9f543c42a98ff196e581f6b091", "pass_id": "fb-20260914-200458", "record_type": "execution", "stage": "EXECUTION", "ts": "2026-09-14T20:05:01.342057+00:00"}
```

No observation record. Exactly the worst moment: EXECUTION durable, OBSERVATION impossible.

### 5. Pig-side zero-action verification (14:05 MDT)

```
$ pig_ssh "powershell -NoProfile -Command \"Get-ChildItem '.../fb-engage/inbox' | ForEach-Object { $_.Name }\"" \
    | tr -d '\r' | sort > /tmp/proof/inbox-after.txt
$ diff /tmp/proof/inbox-before.txt /tmp/proof/inbox-after.txt
INBOX IDENTICAL: no job file delivered, no result file created
```

Zero browser actions occurred: no like, comment, post, DM, or any other on-platform action. Evidence: the inbox is byte-identical (18 files before and after); `job-20260914-200458.json` was never delivered; no new `job-*.result.json` exists; engage.js only executes actions from a job file handed to it, and none existed. The local `.collected-results` ledger and `recovered/` gained nothing (the reaper found no orphans).

### 6. New-process refusal (genuinely new process, pid 10304, fresh environment)

This is the exact next-pass selection step run_pass.sh performs, run as a new OS process with the ledger file as the only carried state:

```
$ action-intent-ledger.py refuse --platform facebook --fb-job \
    --in /tmp/proof/nextpass-job.json --out /tmp/proof/nextpass-filtered.json \
    --pass-id fb-proof-nextpass
{
 "platform": "facebook", "pass_id": "fb-proof-nextpass",
 "checked": 1, "eligible": 0,
 "refused": [{
   "account": "PING Social", "action": "like",
   "url": "https://www.facebook.com/profile.php?id=61594275542163",
   "decision": "BLOCKED", "state": "UNKNOWN_EXECUTION", "stage": "EXECUTION",
   "intent_id": "cec44d9f543c42a98ff196e581f6b091",
   "intent_ts": "2026-09-14T20:05:01.271803+00:00",
   "intent_pass_id": "fb-20260914-200458",
   "reason": "UNKNOWN_EXECUTION: intent cec44d9f reached EXECUTION in pass fb-20260914-200458 at 2026-09-14T20:05:01.271803+00:00 with no OBSERVATION; the external commitment may or may not have happened. Will not auto-retry. Reconcile deliberately before any re-execution."
 }]
}
```

Refused with the truthful state, full provenance, never silently skipped. The filtered job contains zero actions, so a real run_pass.sh would have exited 0 with `all_actions_blocked` before touching the Pig.

`list-unknown --platform facebook` at this point: `{"open": 1, ... "state": "UNKNOWN_EXECUTION", ...}`.

### 7. Deliberate reconciliation from Pig-side evidence (14:05:16 MDT)

Reconciliation is a deliberate act, never automatic. Evidence used: the byte-identical Pig inbox snapshots (job never delivered, result never created, worker never launched) plus the driver stderr ending at mark-execution. Therefore the like provably never executed: NOT_ATTEMPTED, not UNKNOWN_EXECUTION.

```
$ action-intent-ledger.py reconcile --intent-id cec44d9f543c42a98ff196e581f6b091 \
    --outcome NOT_ATTEMPTED \
    --reason "Proof kill: driver SIGKILLed 2026-09-14T20:05:01.387Z after EXECUTION was durably recorded and before any delivery; Pig-side evidence proves the worker never ran, so the like provably never executed." \
    --evidence "Pig inbox snapshots before/after byte-identical (18 files): no job-20260914-200458.json was ever delivered and no new job-*.result.json was created; engage.js was never launched. run_pass.sh stderr ends at mark-execution with no scp/worker output. Baseline and after listings at /tmp/proof/inbox-before.txt and /tmp/proof/inbox-after.txt." \
    --resolved-by "intent-reallifecycle-proof subagent, Nolan-authorized real-path proof 2026-09-14"
```

Appended as record 3 (the ledger is append-only; records 1 and 2 byte-identical, nothing mutated):

```
{"record_type": "reconciliation", "intent_id": "cec44d9f543c42a98ff196e581f6b091", "ts": "2026-09-14T20:05:16.217500+00:00", "outcome": "NOT_ATTEMPTED", ...}
```

Verification after reconciliation:

```
$ action-intent-ledger.py check --platform facebook --account "PING Social" --action like
{"matches": 1, "intents": [{... "state": "NOT_ATTEMPTED", "stage": "FINALIZATION",
  "terminal": "NOT_ATTEMPTED", "provenance": "reconciliation", ...}]}

$ action-intent-ledger.py list-unknown --platform facebook
open = 0

$ action-intent-ledger.py refuse --platform facebook --fb-job \
    --in /tmp/proof/nextpass-job.json --out /tmp/proof/nextpass-filtered2.json \
    --pass-id fb-proof-restore
eligible = 1 refused = 0
```

Eligibility restores correctly after deliberate reconciliation. The ledger ends in a consistent terminal state; the next real pass is unaffected (the reconciled intent is terminal, so refuse will never block on it).

## Real versus simulated: explicit accounting

REAL (production code paths, unmodified):
- `~/workspace/pig-fb/run_pass.sh` executed as-is: reaper, engagement-guard filter, intent-ledger refuse, write-intents, mark-execution.
- `~/workspace/outreach/engagement-guard.py` and `~/workspace/outreach/action-intent-ledger.py`, real append-only ledger at `~/workspace/outreach/action-intent-ledger.jsonl` (created by this proof; previously no real pass had reached write-intents).
- Real SSH to the Pig for the inbox snapshots and the reaper listing; real Pig inbox as ground truth.
- The guard's real side effects: audit line `- GUARD 2026-09-14T20:05:00.914582+00:00 filter facebook: checked=1 eligible=1 blocked=0` in facebook-engagement.md, and pass manifest `facebook-pass-20260914-200500.json`.

CONTROLLED (test harness, not production behavior):
- The SIGKILL itself: a real kill -9, but deliberately induced at the worst moment instead of an accidental crash. The crash it models (driver death between EXECUTION and OBSERVATION) is the documented failure class this machinery exists for.
- The 50 ms ledger watcher (`/tmp/proof/watcher.py`): test-only, /tmp only, not part of the outreach machinery.
- The candidate choice (like on PING Social's own page): a real page and real action type, chosen as defense in depth so that even a late kill could not have produced a harmful external commitment. The kill was not late; this fallback was never exercised.
- The dry-run guard check before launch: same code as the real path, run without --audit so it wrote no audit line (it did write a pass manifest `facebook-pass-20260914-200451.json`; both manifests list the PING Social like as eligible-but-unexecuted, which keeps that page guard-blocked for the rest of today in the fail-closed direction only).

NOT DONE (no theater):
- No fixture worker, no mocked ledger, no simulated refuse. The prior proof's fixture is superseded by this run for the crash-between-EXECUTION-and-OBSERVATION case.
- No browser action of any kind occurred during the proof; verified Pig-side, not assumed.

## 8-condition architectural test result

1. Real failure or business decision: YES. Driver crash between intent and outcome is the documented highest-priority execution seam (pass 41 orphan reaper exists because it happens); silent re-execution of a like/comment risks double engagement and account flags.
2. Existing machinery satisfies it: YES. No new system was built. The proof used only the existing ledger, guard, and driver.
3. Exact causal seam missing: none new. The gap closed is verification: the lifecycle was proven against the real driver rather than a fixture.
4. Preserves PING as the authority: YES. Nothing was written to PING's canonical event store; the ledger is outreach machinery (append-only JSONL), and reconciliation was an append, never a mutation.
5. Demonstrated with a real mission: YES. The real run_pass.sh ran end to end up to the kill point with a real job.
6. Removing it reproduces the observed failure: YES. Without the refuse step, the next pass would re-select the (account, platform, action) and re-execute a possibly-already-executed like with no record of the first attempt.
7. Infrastructure change naming a concrete business-agent failure: no infrastructure change was made.
8. Auditable by a fresh agent from artifacts alone: YES. The ledger file, the run's stderr log, the two inbox snapshots, the guard audit line, and this document reconstruct every step; intent_id cec44d9f543c42a98ff196e581f6b091 ties them together.

## Safety statement

Nothing was unsafe. Zero browser actions occurred, verified Pig-side with byte-identical inbox snapshots. The proof did not run any cron-owned engagement or outreach pass, did not modify run_pass.sh, did not mutate the append-only ledger, and left all state (ledger, guard history, Pig inbox) consistent for the next real pass at 17:26 MDT.
