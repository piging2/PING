
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

## Pig WMI worker-launch quoting (2026-09-26, learned in FB unfollow batch)
- run_unfollow.sh / run_pass.sh build a remote PowerShell snippet in an UNQUOTED bash heredoc (`<<EOF` inside `$( )`) and send it via `powershell -EncodedCommand`. In that heredoc, `\"` survives as `\"` to PowerShell, and PowerShell (whose escape char is the backtick, not backslash) rejects it with "Missing ')' in method call" -> worker_launch_failed. Fix: plain `"` in the file (the `\$` escapes for PowerShell variables are unaffected and still required). Verified: `\"` fails deterministically on the Pig, `"` launches (WMI PID returned, full batch ran).
- Do NOT add backtick-quoted text inside that heredoc (e.g. in comments): an unquoted heredoc performs command substitution, so backticks execute and an unbalanced `"` inside them breaks bash parsing of the whole script ("unexpected EOF while looking for matching"). Keep heredoc comments backtick-free.
- Same one-line fix applied to run_pass.sh (identical latent line) on 2026-09-26; both pass `bash -n`.

## Multi-stream lanes: serialize commits on a shared branch (2026-09-24, PING waves)
- Two commit-sweep incidents in one wave (FL-20260924-206/207): concurrent streams on the shared lane branch swept each other's staged files. Rule for future waves: per-stream worktrees OR strictly serialized commits. Never bare `git commit`; always `git status` first, explicit pathspecs, commit only your stream's files.
- Treat single-shot bridge listings as suspect without corroboration; re-verify deadness claims redundantly (a phantom bridge output was caught this wave by redundant verification).
- Reaper-vs-HOLD design gap (open, needs Nolan): after a HOLD record, mission leaves _processing, lease expires, reapExpiredLeases resets to created and re-dispatches ~60s later. That is an automatic retry of an unknown-outcome mission. Do not deploy the stuck-running watchdog until the design word lands.

## C:/Windows/Temp is volatile for Pig-side wrappers (2026-09-26, X follow pass)
- x-follow-run.ps1 vanished from C:/Windows/Temp between the 05:14 and 09:14 passes (Temp cleanup or reboot), causing the follow batch's first attempt to log bogus rc=0 with "The argument ... does not exist" — no follow performed. Same volatility class as the 2026-09-25 Hermes Temp loss. Other x-*.ps1 wrappers (like/comment/discover) survived this time; loss is per-file, not all-or-nothing.
- Lesson: treat a missing-wrapper error as an infra incident, not a pass failure: kill the driver, reconstruct from the family pattern (NODE_PATH + portable node + driver JS path), scp it back, and verify with a no-arg invocation (expect the driver's usage exit code) before re-running. Keep a local reconstruction source; consider persisting Pig-side wrapper copies under ~/workspace/pig-fb/ so rebuilds are copies, not reconstructions.
- The reconstructed x-follow-run.ps1 adds explicit `exit $LASTEXITCODE` (fixes the 2026-09-15 exit-code swallowing bug for this wrapper) and a bounded 10-min wait on the x-engage.lock one-driver lock. Reconstruction source: /tmp/x-follow-run.ps1 (ephemeral).

## Pig SSH hang recovery (2026-09-27, Mission I)
- A pigwsl SSH attempt hung 4 minutes with no output; kill + retry with `BatchMode=yes` connected instantly. If an SSH invocation hangs silently (no banner, no error), do not wait: kill it and retry with `-o BatchMode=yes`. Consider making BatchMode=yes the default for non-interactive Pig probes.

## Pig node path rules (2026-09-28, outreach round 156)
- Run the portable Windows node as `/mnt/c/Users/nolan/.local/share/pigi/node-v22.23.2-win-x64/node.exe` but pass the SCRIPT path as a `C:/Users/...` Windows-style path. Windows node mangles a `/mnt/c/...` script arg by prepending `C:\` (module-not-found); a `C:/...` script path resolves fine. Keep single-quoted inner args inside the `wsl -- bash -c "<cmd>"` wrapper (CMD-safe), and stage message files Pig-side (stdin-fed ssh + byte-count verify) before send scripts read them.

## Pig SSH quoting for redirects inside bash -c (2026-09-29, L1-ACQ)
- Two working forms, do not mix them. Form 1 (documented 2026-09-24): inner command in SINGLE quotes, CMD-escaped operators: `ssh pigwsl 'wsl -- bash -c '"'"'echo x ^>^> /tmp/f'"'"''` — CMD sees the operators (single quotes mean nothing to CMD) so `^>`/`^|`/`^&^&` are required.
- Form 2 (verified 2026-09-29): outer ssh command in single quotes, inner `bash -c` in DOUBLE quotes: `ssh pigwsl 'wsl -- bash -c "echo x >> /tmp/f"'` — CMD honors double quotes for redirection, so `>>`, `|`, `&&` pass through to bash UNESCAPED. Caret-escaping inside the double quotes produces literal `^` garbage in bash.
- Mixing (caret escapes inside double quotes) silently corrupts: chunks landed as `<base64tail> ^` fragments. For base64-chunk file transfer, Form 2 with `>>` unescaped plus a byte-count verify after `base64 -d` is the proven pattern (see ~/workspace/l1-acq/pig-push.sh).
