# REF - Threads Executor

How engagement actually reaches Threads, and what the skill's executor
boundary holds.

## Deployment pattern (live)

`~/workspace/pig-fb/run_th_pass.sh`:
1. Authority gate (hold check, fail-closed).
2. scp the job JSON to the Pig.
3. The Pig worker (`th-engage.js`) opens its OWN browser window via
   `Target.createTarget` (newWindow) on the Pig's CDP :9226.
4. Result JSON printed back; the runner parses it.

Live targeting (from `th-engage.js`):
- Like button: `div[role=button]` containing an svg with title
  "Like" or "Unlike". "Unlike" means already-liked -> report
  `already`, never click.
- The worker never touches the user's tabs.

## Adapter protocol (the boundary contract)

`schemas/adapter-protocol.schema.json`. Job in:
`{job_id, account, action, target, batch_id}`.
Result out: `{ok, action_taken, already, external_effect,
note, flag?, infra?}`. The fixture (`fixtures/fake_threads_executor.js`)
speaks the same protocol, including the adversarial modes:
`FAKE_LIE`, `FAKE_TIMEOUT_AFTER_SUCCESS`, `FAKE_OUTAGE`,
`FAKE_AUTH_EXPIRED`, `FAKE_FLAG`, `FAKE_EMPTY`. `FAKE_THREADS_STATE`
is the fake platform's world; `fixtures/fake_threads_reads.py` reads
it back for verification.

## Pig operational lessons (from `~/workspace/AGENTS.md`, binding)

- Killing the local `pigwsl-exec` wrapper does NOT stop the remote
  command: kill remotely (`pkill -f`) and verify before relaunching.
- Never run two mutating remote commands against the same target
  concurrently.
- `pigwsl-exec` strips literal single-quoted substrings: construct
  quotes programmatically or avoid them.
- scp can flake ("proxy read: Broken pipe") while pigwsl-exec works:
  stage Pig-ward with `pig-put` (sha-verify), launch via pigwsl-exec.

## Why the Pig, not an API

There is no public Threads write API for engagement on this account.
`threads-cli` is a read surface; `publish-post` is for posts and needs
approval, not for likes. The CDP browser worker is the proven path.
