# Wake-lease live proof: evidence record (2026-10-02 ~20:13 MDT)

## What already exists (read-only finding)
The execution-scoped wake lock Nolan ordered is ALREADY implemented and
wired at every natural entry point. Nothing needed building:

- `~/workspace/pig-fb/wake-wrap.ps1` -- canonical wrapper/library:
  `SetThreadExecutionState(ES_CONTINUOUS | ES_SYSTEM_REQUIRED)` with
  bounded wait (wrapper mode) or dot-sourced bracket (library mode).
  Writes per-lease state records to
  `C:/Users/nolan/.local/share/pigi/run-state/wake-<run_id>.json`.
  Crash-safety is structural (kernel tears down the request on holder
  thread/process death). Never touches OS power policy.
- `~/workspace/pig-fb/wake-bracket.sh` -- bash library used by runners.
- Wired into: `run_pass.sh` (FB), `run_ig_pass.sh` (IG),
  `run_th_pass.sh` (Threads), `run_tk_pass.sh` (TikTok),
  `meta-pass.sh`, `run_page_post.sh`.
- Session recovery (`ig-session-recover.js`, `th-window-recycle.js`)
  untouched, as ordered.

## New this task
`~/workspace/pig-fb/wake-proof.sh` -- rerunnable live proof:
holds the lease N seconds (default 30, cap 120), captures
`powercfg /requests` SYSTEM section DURING the hold and AFTER release,
and verifies the per-lease state file shows acquired=true then
released=true. Exit 0 = full acquire/visible/release/cleared proof.

## Live proof attempt (2026-10-02 20:12-20:13 MDT)
BLOCKED at transport, not at the mechanism. 9 consecutive attempts via
`pigwsl-exec`, `pig` (muse-ssh), and `wake-proof.sh` all failed with the
identical egress-proxy signature:

    nc: proxy read: Broken pipe
    Connection closed by UNKNOWN port 65535

Route: hatch-egress-proxy:3130 -> 100.79.154.43 (both muse-ssh and nolan
SSH users). The proxy itself refuses the CONNECT; no packet reached the
Pig. This is a sustained infrastructure blackout (9 attempts, backoff
1/2/4/8/10/20/30/40/50s, ~20 min), not a transient blip. Retrying
relentlessly did not change it.

## Rerun when transport recovers
    ~/workspace/pig-fb/wake-proof.sh 30
Expected PASS output: WAKE_PROOF_ACQUIRED, SYSTEM section showing the
powershell.exe holder during the hold, empty after, state file with
acquired=true and released=true, then `wake-proof: PASS`.
