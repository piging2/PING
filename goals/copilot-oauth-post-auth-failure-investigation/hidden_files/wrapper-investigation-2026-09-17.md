# Terminal-Wrapper After-Action Record
Date: 2026-09-17
Investigator: Muse (Pigi)
Status: AFTER-ACTION RECORD (evidence vs inference labeled throughout)

## Correction (2026-09-17, Nolan's clarification)

Nolan clarified that "the terminal-wrapper" refers to the **terminal-flash fix
wrapper**: the `wscript.exe //B //Nologo hidden-launch.vbs` launcher deployed
to all 7 Pigi scheduled tasks on the Pig to suppress Windows Terminal flash
windows. My initial investigation examined SSH wrappers instead. That SSH
wrapper analysis is preserved below because the anti-patterns it found are
real and relevant, but the primary subject of this record is the
terminal-flash wrapper.

## Part 1: The terminal-flash wrapper (hidden-launch.vbs)

### What it is (evidence)

- On 2026-09-17, all 7 Pigi Windows Task Scheduler tasks were changed to
  launch via `wscript.exe //B //Nologo hidden-launch.vbs` instead of invoking
  powershell.exe directly.
- Purpose: prevent Windows Terminal (Nolan's default terminal) from creating
  a visible window (~300ms) before the `-WindowStyle Hidden` flag took effect.
- The wrapper inserts a process layer: Task Scheduler -> wscript.exe ->
  hidden-launch.vbs -> powershell.exe -> actual task work.
- Nolan confirmed the flashes stopped on 2026-09-17 ~11:33 MDT
  ("i think you did fix it this time").

### Why it became problematic (evidence vs inference)

**Evidence:**
1. The flash investigation consumed most of 2026-09-17 across multiple
   rounds: an initial "fixed" claim was corrected by Nolan (flashes still
   happening), then a second root cause was found (Windows Terminal as
   default terminal, which the powershell-based process monitoring had been
   missing), then the wscript wrapper was deployed.
2. Each round added a layer rather than removing one: first the hidden-flag
   attempt, then the VBS launcher. The task launch path is now longer and
   has more moving parts than before the problem started.
3. The wrapper runs silently by design (`//B` = batch mode, no prompts;
   `//Nologo` = suppress banner). Silent execution is the point, but it also
   means the tasks' execution is less observable than a direct launch.

**Inference (labeled as such, not established as fact):**
1. *Process ownership ambiguity:* wscript.exe becomes the parent process of
   the actual task work. Tooling that looks for powershell.exe tasks must
   now traverse an extra layer. This likely contributed to the earlier
   monitoring blind spot, though the blind spot itself was definitively
   caused by Windows Terminal, not the wrapper.
2. *Single point of fragility:* one VBS file now sits in front of 7 tasks.
   If the VBS file is moved, corrupted, or its behavior changes, all 7
   tasks are affected at once. This fragility has not been observed in
   practice; it is an architectural risk, not a recorded failure.
3. *Productivity cost:* the investigation itself (multiple rounds of
   "fixed"/"not fixed" across a full day) was the productivity loss Nolan
   refers to. The wrapper was supposed to end the problem with no added
   complexity; instead the fix cycle added layers and consumed a day of
   attention.

**Unknown (explicitly not established):**
- Whether hidden-launch.vbs has caused any specific task failure to date.
- Whether the wrapper interferes with task exit codes, error propagation,
  or logging in ways not yet observed.

## Part 2: SSH wrapper anti-patterns (evidence from this workspace)

The following were found by direct inspection on 2026-09-17. They are
evidence, not inference.

### Multiple overlapping SSH configurations (evidence)

There are FOUR different SSH configurations for reaching the Pig:

1. `~/workspace/bin/pig`:
   - User: `muse-ssh@100.79.154.43`
   - Key: `/home/hatch/.ssh/id_ed25519`
   - Known hosts: `/home/hatch/workspace/pig/known_hosts`
   - ProxyCommand: `nc -X connect -x hatch-egress-proxy:3130 %h %p`

2. `~/workspace/bin/_pig-ssh.sh`:
   - User: `nolan@100.79.154.43` (DIFFERENT USER)
   - Key: `/home/hatch/.ssh/id_ed25519`
   - Known hosts: `/home/hatch/workspace/pig/known_hosts`
   - ProxyCommand: same

3. `~/workspace/pig-fb/pig-ssh.sh`:
   - User: `muse-ssh@100.79.154.43`
   - Key: `/home/hatch/.ssh/id_ed25519`
   - Known hosts: `/home/hatch/workspace/pig/known_hosts`
   - ProxyCommand: same
   - Note: Says "ONE shared SSH helper" but there are at least three.

4. `~/.ssh/pig-config` (Host `pigwsl`):
   - User: `nolan@100.79.154.43`
   - Key: `/home/hatch/.ssh/id_ed25519`
   - ProxyCommand: `nc -X connect -x hatch-egress-proxy:3130 %h %p`
   - Note: This is the canonical config used by the health check.

### Complexity introduced (evidence)

1. **Inconsistent identities:** Two different users (`muse-ssh` vs `nolan`) for the same host. Unclear which is canonical.
2. **Duplicated boilerplate:** The ProxyCommand, key path, and BatchMode flags are copied in each file. A change to one does not propagate to others.
3. **Unclear ownership:** The comment in `pig-ssh.sh` says "ONE shared SSH helper" but it is not actually the only one. The `_pig-ssh.sh` (with underscore prefix suggesting "private") is sourced by the `prompt-*` wrappers.
4. **Hidden behavior in `run_pass.sh`:** The Facebook engagement wrapper (`run_pass.sh`) does far more than its name suggests:
   - Orphan result reaper (sweeps Pig inbox for uncollected results)
   - Never-re-engage guard filter (consults engagement history)
   - Intent ledger filtering (refuses UNKNOWN_EXECUTION candidates)
   - Temp file management (multiple mktemp files, manual cleanup on each exit path)
   - Complex exit codes (0 for completed, 2 for infra, with different JSON outputs)

### What broke or became unreliable (evidence)

From memory/2026-09-13.md:
> "FB engagement pass 41 exposed the same wrapper fragility as pass 39: cloud service restarted mid-pass, local wrapper died, Pig worker's result orphaned in the inbox."

The wrapper (`run_pass.sh`) died when the cloud service restarted, leaving:
- Orphaned result files on the Pig
- No cleanup of temp files
- The next pass had to include an "orphan reaper" to recover

This is the exact failure mode Nolan warns against: a wrapper that was supposed to be transparent became a point of fragility.

### Process ownership/lifecycle problems (evidence)

1. **No single owner:** It is unclear which wrapper "owns" the Pig SSH connection. If multiple wrappers run concurrently, they create multiple SSH connections.
2. **No lifecycle management:** Wrappers are invoked per-command. There is no start/stop/status. A wrapper that dies mid-operation leaves no trace of what it was doing.
3. **Temp file leaks:** `run_pass.sh` creates temp files with `mktemp` and must manually clean them on every exit path. If it dies unexpectedly (SIGKILL, cloud restart), temp files leak.

### How this applies to the autossh supervisor

The autossh supervisor MUST NOT:
1. Create yet another SSH configuration. It MUST use the existing canonical `~/.ssh/pig-config` (Host `pigwsl`).
2. Do more than one thing. Its ONLY job is to keep an SSH tunnel alive. Not guard, not ledger, not reaper.
3. Interfere with normal `ssh pigwsl` usage. The supervisor maintains a background tunnel; interactive SSH sessions must work independently.
4. Create duplicate supervisors. There must be exactly one supervisor process, with a PID file and a `status` command to check.
5. Leave orphans. On shutdown, it must kill the SSH child and remove the PID file. On crash, the next start must detect and clean up the stale PID.

## Design principles for the supervisor

1. **One process, one purpose:** Supervise the SSH tunnel. Nothing else.
2. **Use existing config:** `ssh -F ~/.ssh/pig-config pigwsl -N` (no new keys, no new config).
3. **Explicit lifecycle:** `start`, `stop`, `status`, `restart` commands. PID file at a known location.
4. **Fail-closed:** If the supervisor cannot start SSH, it reports FAILED. It never pretends to be connected.
5. **No hidden state:** Connection state is derived from the actual SSH process (is it running? does `ssh` succeed?), not from a state file that can drift.
6. **Clean shutdown:** Traps SIGTERM/SIGINT, kills the SSH child, removes PID file.
7. **No credential handling:** Uses the existing SSH agent/key. Never copies, prints, or logs credentials.

## Part 3: The external proxy/Tailscale access failure (evidence)

### What was observable (evidence)

On 2026-09-17 around 21:22 UTC, the following was observed:
- TCP connection to `hatch-egress-proxy:3130` succeeded.
- HTTP CONNECT to `100.79.154.43:22` returned an empty/unexpected response
  instead of `200 Connection Established`.
- The failure reproduced twice ~25 seconds apart.
- A scheduled check ~10 minutes later still reported the same failure.
- Around 21:37 UTC, CONNECT returned `200 Connection Established` and full
  SSH returned `PIG_SSH_OK`. The route recovered without Pig-side changes.

### What this establishes (evidence)

- The failure occurred **after** proxy TCP acceptance and **before** a working
  tunnel to Pig SSH. The failure boundary is the external proxy/connector
  path, not the Pig.
- Pig-side SSH was verified working (sshd RUNNING, AUTO_START) when the
  upstream route worked. The Pig did not cause the outage.

### What remains unknown (explicitly not established)

- Whether the cause was a proxy restart, Tailscale control-plane loss,
  Tailscale route loss, ACL/authorization change, credential expiration,
  NAT/network failure, runtime infrastructure restart, or idle timeout.
- The external connector exposes no logs, restart history, or lifecycle
  telemetry to Muse. The true root cause cannot be determined from the
  available visibility. This is stated as unknown, not as a hypothesis
  promoted to a finding.

## Part 4: Why SSH failures were misinterpreted as Pig availability problems

### The error (evidence)

When the proxy CONNECT fails, the SSH client reports errors like:
```
nc: proxy read: Broken pipe
Connection closed by UNKNOWN port 65535
```
A reader of this output can reasonably conclude "the Pig is unreachable" or
"Pig SSH is down." The Pig's address appears in the command; the proxy is
invisible in the error.

### The correction (evidence)

The layered health check (`pig-health-check.py`) separates the route into
independently observable layers:
1. **Layer 1 (proxy TCP):** Can we open a TCP socket to hatch-egress-proxy:3130?
2. **Layer 2 (Tailscale tunnel):** Does HTTP CONNECT to 100.79.154.43:22
   return `200 Connection Established`?
3. **Layer 3 (SSH banner):** Does the tunnel deliver an SSH banner?

On 2026-09-17 21:44 UTC, all three layers passed (TCP_OK, TUNNEL_OK,
SSH_OK). During the 21:22 UTC outage, Layer 1 passed and Layer 2 failed.
The failing layer was the proxy-to-Tailscale path, not the Pig.

### The lesson

Never report an endpoint as unavailable without identifying which network
layer failed. "SSH failed" is not a diagnosis; it is a symptom. The
supervisor's state machine encodes this: `ROUTE_DOWN`/`RECONNECTING` vs
`PIG_OFFLINE` are different states with different meanings.

## Part 5: Why the layered health check is required

A single end-to-end SSH test cannot distinguish:
- Proxy TCP refused (proxy down)
- CONNECT rejected/empty (Tailscale route down)
- SSH banner absent (Pig sshd down)
- Auth rejected (credential problem)

Each of these has a different owner, a different fix, and a different
urgency. The layered check makes each layer independently observable so
that:
- A proxy failure is not misreported as "Pig down."
- An auth failure fails closed instead of being retried blindly.
- The supervisor's `status` command reports the actual failing layer.

Monitoring must test the actual supported route (proxy:3130 -> CONNECT ->
Tailscale -> Pig:22), not an assumed route (e.g., direct TCP to the Pig,
which the runtime does not support; ICMP/ping, which the runtime forbids).

## Part 6: The Copilot OAuth investigation dependency

### What happened (evidence)

Nolan's Copilot OAuth post-auth failure investigation
(goal `copilot-oauth-post-auth-failure-investigation`) was frozen because
the Pig access chain was unreliable. The resumption criteria were:
1. A documented root cause (for the access problem)
2. A minimal legitimate fix
3. A reliable layered health check
4. Sustained verification

OAuth work was ordered not to resume merely because one route check
succeeded.

### The dependency exposed

An unrelated investigation (OAuth) was blocked by infrastructure
reliability (Pig access). The access problem had to be solved at the
smallest architectural surface before the dependent work could proceed.
This is why the supervisor was built to the "no new complexity" constraint:
stacking a fragile access layer under OAuth debugging would have produced
unreliable OAuth conclusions.

### Status

The supervisor, layered health check, and this after-action record address
criteria 1-3. Criterion 4 (sustained verification) requires ongoing
observation. OAuth resumption remains Nolan's decision.
