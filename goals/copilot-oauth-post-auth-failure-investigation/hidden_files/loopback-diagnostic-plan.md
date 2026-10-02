# Copilot OAuth Loopback Failure: Live Diagnostic Plan

## Status
- GitHub OAuth succeeds (sign-in, Authorize, code issued).
- Failure at `http://127.0.0.1:<PORT>/callback` with ERR_CONNECTION_REFUSED.
- Orphaned CLI lifecycle bug fixed (2026-09-17).
- 54/54 tests green.

## Competing Hypotheses (eliminate with evidence)

A. **CLI process/listener lifecycle** — CLI dies, times out, or is killed before callback.
B. **Listener bind address/interface** — Binds to IPv6, 0.0.0.0, or WSL eth0 instead of 127.0.0.1.
C. **Windows → WSL2 localhost forwarding** — WSL2 fails to forward Windows loopback to WSL2 loopback.
D. **Chrome's handling of the redirect** — Chrome-specific issue with the localhost redirect.
E. **Firewall/network policy** — Windows Firewall or other policy blocks loopback.
F. **CLI callback handler itself** — Listener exists but handler fails.
G. **Post-callback failure** — Callback received but token exchange fails.

## Live Diagnostic Steps (ONE real auth attempt)

### Phase 1: CLI Startup
1. Start `copilot login --web-flow` via authorize.sh (or manually for instrumentation).
2. Record PID: `echo $!` or `pgrep -f "copilot login --web-flow"`.
3. Extract callback port from the authorize URL in /tmp/copilot-webflow.log.
4. Verify process alive: `kill -0 $PID`.

### Phase 2: Listener Verification (before Nolan clicks Authorize)
5. Check listening socket: `ss -tlnp | grep <PORT>` or `netstat -tlnp | grep <PORT>`.
6. Record bind address: 127.0.0.1, ::1, 0.0.0.0, or specific IP.
7. From WSL, probe: `curl -v http://127.0.0.1:<PORT>/callback` (expect 404 or handler response, NOT connection refused).
8. From Windows PowerShell, probe: `Invoke-WebRequest -Uri http://127.0.0.1:<PORT>/callback -UseBasicParsing` (record result).
   - Success (any HTTP status) = Windows→WSL2 forwarding works. Eliminates C.
   - Connection refused = Forwarding broken OR listener not on 127.0.0.1. Distinguish via step 6.

### Phase 3: Live OAuth (Nolan clicks through)
9. Confirm CLI still alive immediately before Nolan clicks Authorize.
10. Nolan signs in to GitHub, clicks Authorize.
11. Capture (safe metadata only):
    - Timestamp of redirect.
    - Whether TCP connection arrived at listener (check CLI log, `ss` output).
    - HTTP status returned (if any).
    - CLI process state after (alive, exited 0, exited non-zero).
12. Do NOT capture: code, state token, cookies, auth headers.

### Phase 4: Elimination
- If Phase 2 step 8 fails but step 7 succeeds: Hypothesis C (forwarding) or B (bind address).
- If Phase 2 step 8 succeeds but Phase 3 fails: Hypothesis D (Chrome) or F (handler).
- If CLI dead at step 9: Hypothesis A (lifecycle).
- If callback arrives but CLI exits non-zero: Hypothesis G (post-callback).

## Boundary Probe (before full OAuth, if needed)

Create a harmless test listener on WSL2 loopback to isolate the network path:
- WSL: `python3 -m http.server <TEST_PORT> --bind 127.0.0.1`
- Windows PowerShell: `Invoke-WebRequest http://127.0.0.1:<TEST_PORT>`
- Windows Chrome: navigate to `http://127.0.0.1:<TEST_PORT>`

This distinguishes Windows→WSL2 forwarding (PowerShell) from Chrome→localhost (Chrome)
without involving the CLI.

## Constraints
- Do NOT route OAuth through Tailscale.
- Do NOT expose callback listener beyond localhost.
- Do NOT capture/print codes, tokens, cookies, credentials.
- Do NOT add retries or fall back to device-code.
- Preserve fresh isolated Chrome profile UX.
