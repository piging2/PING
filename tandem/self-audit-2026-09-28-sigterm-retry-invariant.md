# Self-audit 2026-09-27/28 — meta-ai-intel-pass: SIGTERM retry invariant

## Production evidence
- Pass ran 2 prompts. Prompt 1 (`a-weak-website-hunt`, run_id
  `20260928-030430-a-weak-website-hunt`): ok, 14457 bytes, 12 items, pack f630042975.
- Prompt 2 (`b-new-business-radar`, run_id `20260928-030819-b-new-business-radar`):
  the runtime "service restarted" mid-run. SIGTERM delivered; ledger recorded
  outcome=unknown/exit_code=143; signal.log confirmed SIGTERM; sidecar stayed
  status="started" (non-terminal); no answer file existed; job envelope intact.
- Agent hand-reasoned the retry decision: sidecar non-terminal + no answer
  artifact + retriable ledger outcome -> safe to retry; reused the SAME job
  envelope (same job_id == run_id) rather than minting a new job.
- Retry completed ok: 11497 bytes, 8 items, pack 3e6537deb5, ledger exit 0.
- Verified the machinery resolves the pattern correctly:
  brief-lifecycle.latest_run() iterates the ledger reversed (latest line wins),
  so unknown/143 followed by ok/0 resolves to ok; consecutive_contract_failures()
  breaks on infra lines, so the SIGTERM consumed no contract-failure budget.
  reconcile-run-report.sh passed for both runs.

## Invariant (SPECIFY)
An infra-killed run (ledger outcome unknown/infra) is safe to retry iff ALL hold:
1. ledger's latest line for run_id is retriable (not ok, not capture_failed);
2. sidecar status is non-terminal (requested|started);
3. no answer artifact exists (<run_id>.md or .md.CAPTURE_FAILED);
4. the job envelope exists, so the retry reuses the original job_id == run_id.
A retry mints no new job. SIGTERM from ANY trigger (turn-end backgrounding or
runtime service restart) follows the same recovery path; the trigger is irrelevant.

## Automation (TEST + AUTOMATE)
`~/workspace/tandem/retry-safety-check.py <run_id>` encodes the four checks.
Exit 0 = SAFE_TO_RETRY, 1 = NOT_SAFE with a typed reason, 2 = usage error.
7 unit cases pass (fixtures in /tmp/retry-test, ephemeral): production pattern,
ok run, terminal sidecar, answer-exists, missing job, post-retry resolved
(latest-line-wins), no ledger line. Verified against live production state:
both resolved run_ids report NOT_SAFE (outcome-not-retriable:ok).

## Reasoning removed from the agent
Future passes: on unknown/143 (or any infra kill), run retry-safety-check.py
before deciding. If SAFE_TO_RETRY, re-invoke meta-pass.sh with the existing
<run_id>.job.json. Do not hand-derive the sidecar/ledger/artifact checks again.
