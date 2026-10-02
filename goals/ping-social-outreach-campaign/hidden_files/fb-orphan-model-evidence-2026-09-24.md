# Facebook Orphan Model: implementation evidence (2026-09-24)

P1 lane per Nolan's directive: keep the intent ledger (it worked); separate dispatch from collection.

## What changed

- `pig-fb/run_pass.sh`: dispatch ONLY. Guard -> refuse -> write-intents (DURABLE) -> scp job + pinned worker code -> mark EXECUTION (only after successful scp) -> launch detached Pig worker -> require numeric worker PID -> write durable dispatch record to `pig-fb/jobs/<pass_id>.json` -> return receipt immediately. Exits 2 on in-flight worker (probe rc=1) or probe failure (rc=2). Never waits for the pass. The old reaper block is gone; the old false-UNKNOWN ordering (EXECUTION before delivery) is fixed.
- `pig-fb/collect_pass.sh` (new): 15m collector. Lists `job-*.result.json` + `job-*.progress.jsonl` in the Pig inbox (CR bytes stripped), downloads each file not in `.collected-results`, records OBSERVATIONS via ledger `record-outcomes` (per-action EXECUTED/FAILED; NOT_ATTEMPTED for proven non-execution; abort reason recorded), marks the file collected ONLY after the ledger write. Progress consumed incrementally via the `.collected-progress` sidecar (complete lines only; torn final lines skipped until complete). Marks the sibling progress file complete after a terminal result is collected. Never launches or retries anything. Stale-dispatch watchdog (24h, warns; 7d, skips) for workers that died before writing anything.
- `pig-fb/fb-worker-probe.sh` (new): matches `fb-engage/engage.js`, `fb-engage/fb-unfollow.js`, `meta-ask.js` on the fb profile. rc=0 clear, rc=1 worker in flight (PID on stdout), rc=2 probe failed/unknown. Probe failure is never treated as clear.
- `pig-fb/engage.js`: terminal result JSON now carries `pass_id`; after each completed action (and on abort) appends one JSON line with seq/type/url/ok/note/ts to `<job>.progress.jsonl`, fsync'd before close.
- `outreach/engagement-guard.py`: added `FB_MEDIA_RE` (`/(?:videos|reel|photo)/(\d{6,})`) and `FB_WATCH_RE` (`/watch/\?[^#\s]*v=(\d{6,})`), wired into all post-ID extraction paths. `outreach/action-intent-ledger.py` imports both from the guard (single shared regex owner). Guard dedups by exact URL and refuses past re-engagement within 180d.
- `pig-fb/browser-lock.sh`: `FB_BROWSER_LOCK_DIR` test override (production default unchanged).
- Cron: `facebook-engagement-collect` created (every 15m, owner goal:ping-social-outreach-campaign, first run Thu 2026-09-24 12:05:42 MDT). `facebook-engagement-pass` body rewritten for dispatch semantics (dispatch returns immediately; collection asynchronous; in-flight exit-2 semantics; EXECUTION-after-delivery ordering).
- `AGENTS.md` orphan-reaper entry replaced with the orphan-model entry (2026-09-24).

## Simulation proofs (fake Pig inbox + stub SSH/scp, isolated ledger; /tmp/fb-sim)

1. Probe failure: `FB_SIM_PROBE=fail` -> receipt `fb_worker_probe_unknown`, exit 2, zero job records, zero launches.
2. In-flight worker: `FB_SIM_PROBE=pid:12345` -> `fb_worker_in_flight` with PID, exit 2, zero launches. No second worker while one runs.
3. Happy-path dispatch: 5 eligible, 5 intents DURABLE, 5 EXECUTION (only after scp), receipt JSON with pass_id `fb-20260924-174836` and worker PID, job+engage.js landed in fake inbox, job record written. Returned in <1s (no pass wait).
4. SIGKILL mid-pass (3 progress lines, no result file): collector recorded exactly 3 observations (2 EXECUTED, 1 FAILED), 2 intents left open (fail closed, no auto-retry), sidecar offset 3.
5. Collector SIGKILLed mid-run 5x (exit 137 each, 6 result files / 18 intents with 0.4s downloads): partial collection across the kills, final runs completed. 18 intents, 18 observations, max 1 and min 1 observation per intent, 0 duplicates, each result file marked collected exactly once.
6. Abort: 1 EXECUTED + 1 NOT_ATTEMPTED ("worker aborted on checkpoint/block before reaching this action").
7. `progressLog` extracted verbatim from engage.js and run in node: 3 lines, seq ordered, pass_id stamped, one fsync'd JSONL line per action.
8. Torn progress line (no trailing newline): not consumed until completed; picked up on the next run. Collector with Pig list failure: soft exit 0, retries next interval.

## Bugs found by the simulation and fixed

- `if ! probe; then RC=$?` captured the inverted status (0), misreading in-flight as unknown. Now captures the exit code on its own line.
- Stub lib did not define `$PIG` (production scripts legitimately use it); stub made faithful. `pig-retention.sh` bypasses `PIG_SSH_LIB` and did real SSH in the sandbox; added `FB_RETENTION` seam to run_pass.sh.

## Not done live (by design)

- No live dispatch proof: launching a real worker while the 2h cron owns dispatch could duplicate workers. Deploy by letting the next scheduled `facebook-engagement-pass` run dispatch normally (it will ship the new engage.js via the pinned scp), then watch the collector close the intents.
- The Pig's headed Chrome was never touched; no browser was killed or relaunched.
- No token or secret values anywhere in this artifact or the code.
