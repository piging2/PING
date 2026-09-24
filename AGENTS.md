
## Oracle SSH invocation (2026-09-20, learned from FL-20260920-008)
- `oracle-ssh.sh` (Pig: ~/workspace/pig-fb/oracle-ssh.sh) runs ONLY locally, never via pigwsl-run.sh. Chain: local ssh -F /home/hatch/.ssh/pig-config -> pigwsl -> wsl -> ssh ubuntu@Oracle. The -F config path exists only on the WSL side; running the script on the Pig hangs or errors. To use from a sandbox: base64-copy it locally, then pipe the script on stdin (`echo '<script>' | ./oracle-ssh.sh -s`); the `-s` form reads the script from stdin, so `< /dev/null` yields empty success. Never pass secrets as arguments (they land in process lists on two machines).

## Pig SSH transport quoting (2026-09-24, learned from S6 worker)
- `ssh -F /home/hatch/.ssh/pig-config pigwsl 'wsl -- bash -c "<cmd>"'` parses through Windows CMD first. Avoid nested double quotes and literal `|` inside the remote command (CMD eats them). Use single-quoted inner strings and `grep -e` instead of alternation. Batch commands via stdin-fed SSH to reduce round trips.

## Windows-side browser proof from WSL (2026-09-24, W-WHYTHIS)
- WSL cannot reach Windows-bound CDP ports or Windows localhost services via 127.0.0.1 (localhost forwarding is not enabled in that direction here). Windows reaches WSL :3100 via the WSL VM IP from `hostname -I` (was 172.21.65.209).
- Reliable proof pattern: portable Windows node (`C:/Users/nolan/.local/share/pigi/node-v22.23.2-win-x64/node.exe`) + fb-engage playwright-core, `chromium.connectOverCDP('http://127.0.0.1:9223')` (house browser), open one tab, screenshot, close the tab. Run node from WSL as `/mnt/c/.../node.exe C:/path/script.cjs`; pass URLs as argv. PowerShell `-File` needs `-ExecutionPolicy Bypass`. Avoid launching a second Windows Chrome with --remote-debugging-port from WSL (pipe FD issue); the house :9223 browser is the sanctioned target.
- Do not launch the Playwright-bundled Linux chromium in this WSL: missing system libs (libnspr4.so).

## WSL spawn does not forward custom env to Windows processes (2026-09-24, ORCA-D U1 experiment)
- WSL node `child_process.spawn()` of a Windows exe does NOT deliver custom `env` vars to the Windows process (proven: `U1_PROBE_VAR=None` on the Windows side). Pass experiment parameters via argv, never env. Marker/output dirs must live where both sides see them (`/mnt/c/...`, never the WSL-only `/tmp`).

## :3100 restart protocol (2026-09-24, W-INFRA, after W-CORRECT Finding 2)
- ALL lanes restart :3100 ONLY via /home/nolan/start-3100.sh, launched from a non-PTY ssh with stdio on files (the script handles setsid + /home/nolan/3100.log). Never restart by hand, never from a PTY.
- The script exports NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1 (Nolan's standing directive: :3100 serves demo-owner tenants only, so demo owner mode is explicitly ON for every restart). Any hand-restart that skips the script risks running without the flag, which 403s the customize approve path.
- After EVERY restart, verify the flag is live before declaring healthy: check the running process env for NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1 and probe the approve path; do not trust the launch command alone.

## Playwright screenshot fix on Windows Chrome via WSL (2026-09-24, FYD mobile proof)
- Launching playwright-core's chromium with executablePath to Windows Chrome and default headless loads pages fine, but `page.screenshot` throws `Protocol error (Page.captureScreenshot): Unable to capture screenshot`.
- Fix: launch with `headless: false` plus `"--headless=new"` in args (plus `--window-size=W,H`); screenshots then work while tap/touch/mobile emulation still function. Chrome CLI `--headless=new --screenshot=` also works for static captures without interaction.
- Also: `npm init -y` now defaults package.json to `"type": "module"`, so `require()` scripts must use a `.cjs` extension; and avoid `$$` inside bash heredocs (PID expansion), prefer `.cjs` files with `page.locator()` over `$$`.

## Multi-stream lanes: serialize commits on a shared branch (2026-09-24, PING waves)
- Two commit-sweep incidents in one wave (FL-20260924-206/207): concurrent streams on the shared lane branch swept each other's staged files. Rule for future waves: per-stream worktrees OR strictly serialized commits. Never bare `git commit`; always `git status` first, explicit pathspecs, commit only your stream's files.
- Treat single-shot bridge listings as suspect without corroboration; re-verify deadness claims redundantly (a phantom bridge output was caught this wave by redundant verification).
- Reaper-vs-HOLD design gap (open, needs Nolan): after a HOLD record, mission leaves _processing, lease expires, reapExpiredLeases resets to created and re-dispatches ~60s later. That is an automatic retry of an unknown-outcome mission. Do not deploy the stuck-running watchdog until the design word lands.
