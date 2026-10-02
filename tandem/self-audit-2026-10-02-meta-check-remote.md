# Self-audit: meta-ai-intel-pass 2026-10-02 09:04 UTC (03:04 MDT pass)

## What the agent had to reason about
Phase A: b-new-business-radar, run_id 20261002-090415-b-new-business-radar,
pack e822089dd9. Contract checks compatible (prospect-list objective +
business-list OUTPUT CONTRACT; brief towns within standing geography); job
envelope written and run. Exit 2, outcome infra, classification
"worker_failed rc=1": Pig-side meta-ask.js FATAL
browserType.connectOverCDP timeout 30000ms (ws URL retrieved from the Pig's
127.0.0.1:9223, ws connect timed out). No answer file; sidecar status infra,
verification/ping_ingestion not_attempted; ledger last_verified_state
infra_terminal, resumable true.
- No second prompt: step-2b rule (first run non-ok -> no second prompt).
- Rotation does not advance on a failed run; b-new-business-radar stays
  eligible to retry next pass (next-brief.py already re-derives it; lifecycle
  state PENDING, not TERMINAL_FAILURE).
- STAY-ON rule: CDP-timeout worker failure is a retry-not-disable condition;
  schedule stays enabled, logged, next pass retries. No account
  restriction/checkpoint signal; no throttle signal.
- The agent then reached for the body's STAY-ON diagnostic ("If Meta AI is
  logged out on the Pig, run meta-check.js to confirm") and ran it as bare
  `node ~/workspace/pig-fb/meta-check.js` on the scheduler VM. It failed
  with MODULE_NOT_FOUND (playwright-core) and, worse, would have checked the
  wrong host's loopback anyway: meta-check.js targets the Pig's 127.0.0.1:9223
  and the Pig's node_modules. Zero diagnostic signal, one wasted step.
- Reconciler: MISSING/MISSING/n/a -> match; run reported as FAILED (infra).
- Phase B/C: distill-sweep --select --cap 5 -> selected [], eligible 0,
  queue 131, engine-ingested excluded 70. No stale-breach items.
- Phase D: no new quarantine recommendations; c-review-complaint-signals
  remains QUARANTINED and past next_retry_eligible_at
  (2026-09-24T12:45:00Z) — retry-eligible, lift requires Nolan's approval.
- event-spool ship: SPOOL_EMPTY, nothing pending.

## Invariant specified
meta-check.js is a Pig-side diagnostic. It must be executed ON the Pig via
the pig-fb SSH transport (pig_ssh_wake EncodedCommand, portable Windows
node, script at C:/Users/nolan/.local/share/pigi/fb-engage/meta-check.js),
never as bare `node` on the scheduler VM. WHEN: only when a run's failure
classification suggests a possible session-auth issue (login-wall signals,
throttle-scan hits); never for explicit CDP-down infra, where the
classification is already sufficient (precedent: this note's 2026-09-27
predecessor).

## Test (bisection, all against the live Pig 2026-10-02 ~09:20 UTC)
Payload = PowerShell via pig_ssh_wake (UTF-16LE base64 EncodedCommand).

| # | payload shape | result |
|---|---------------|--------|
| 1 | `Set-Location '<dir>'` only | OK rc=0 |
| 2 | `exit 7` only | OK rc=7 |
| 3 | set-location + `& node --version` | OK rc=0 |
| 4 | `& node --version` + `exit $LASTEXITCODE` | OK rc=0 |
| 5 | set-location + `& node --version` + `exit $LASTEXITCODE` | OK rc=0 |
| 6 | `& node '<script>'` + `exit $LASTEXITCODE` | OK rc=1, meta-check.js ran, FATAL CDP timeout |
| 7 | set-location + `& node '<script>'` (no exit line) | OK rc=1, meta-check.js ran, FATAL CDP timeout |
| 8 | set-location + `& node '<script>'` + `exit $LASTEXITCODE` (newline-joined) | FAIL rc=255 "exec request failed on channel 0", 7/7 attempts |
| 9 | shape 8 with double quotes instead of single | FAIL rc=255 |
| 10 | shape 8 with `exit 99` instead of `exit $LASTEXITCODE` | OK rc=99 |
| 11 | shape 8 statements joined with `;` on one line | OK rc=1, meta-check.js ran, FATAL CDP timeout |
| 12 | 824-char b64 (long comment + `exit 3`) | OK rc=3 (length hypothesis falsified) |

Transport quirk: the exact newline-joined 3-statement shape in row 8
deterministically fails at the SSH exec layer while every 1- and 2-line
subset succeeds; the semicolon-joined equivalent works. Mechanism unknown;
length falsified as the cause (row 12). The wrapper uses the row-11 form.

End-to-end test of the automation: `bash meta-check-remote.sh` ->
exit 1, FATAL browserType.connectOverCDP timeout on stderr. This
independently confirms the pass's infra classification (Pig CDP substrate
down, not a Meta AI session logout): the ws URL is retrievable but the
connect times out, identical signature to the failed meta-ask.js run.

## Automation
`~/workspace/pig-fb/meta-check-remote.sh` (new, executable): scp-pins
meta-check.js to the Pig, runs it via pig_ssh_wake with the portable
Windows node, propagates rc (0 = JSON verdict on stdout; 1 = Pig-side
FATAL on stderr; 2 = infra). Header encodes the WHEN rule and the
transport-quirk warning. The body's "run meta-check.js" step now has exactly
one correct invocation; the bare-node failure mode is unreachable through
the wrapper.

## Reasoning removed from the agent
"How do I run meta-check.js, and should I?" -> answered by machinery: run
`bash ~/workspace/pig-fb/meta-check-remote.sh`, and only when the failure
classification is a possible session-auth issue. No future pass needs to
rediscover the Pig-side execution requirement, the playwright-core
dependency location, or the newline-payload transport quirk.
