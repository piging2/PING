# Environmental limitation investigation — 2026-09-13

Goal: what actually prevents full-throttle orchestration authority mode
(agents autonomously discovering, inspecting, delegating, executing,
verifying, recovering, projecting, continuing work with minimal human
intervention), without violating the constitutional boundary.

Method: read-only. Tested where cheap (SSH probe, gateway HTTP probe via
egress proxy, cron/subagent/process listings, docs). No system state changed.

Confirmed working (not constraints, but load-bearing facts):
- Cron workers run with the full agent toolset (SSH, files, subagents).
  Proven by the 2026-09-13 15:04 meta-ai-intel-pass run, which SSHed to the
  Pig and ran meta-pass.sh unattended.
- SSH to the Pig works: key auth as muse-ssh@100.79.154.43 via
  hatch-egress-proxy:3130, ~1.4s round trip measured 2026-09-13.
- The PING gateway is directly reachable from this environment over HTTP
  through the egress proxy: 2026-09-13 probe of
  http://100.79.154.43:8080/ops/status returned HTTP 500 in 0.3s
  (the 500 is the known pre-existing /ops/status defect; the network path
  is proven).
- Files, cron definitions, and memory persist across compaction/restarts;
  the workspace is shared by all agents on this machine.

## Constraint table

| # | Constraint | Category | Evidence | What would change if resolved |
|---|-----------|----------|----------|-------------------------------|
| 1 | Parent cannot see a subagent's live progress. `subagent.list` shows status/timing/last-activity only; a quiet child may be stuck or inside one long tool call — indistinguishable. No partial outputs; results arrive only at completion. | CONVENIENCE | Tool contract: "Running entries include how long the agent has been running and how long since its last activity. A quiet agent is not proof it is stuck; it may be inside one long tool call." | Tighter supervision, faster stuck-detection, less timeout over-provisioning. Workaround exists: children write progress files the parent polls. |
| 2 | Subagents do not inherit the transcript; every delegation needs a full briefing assembled by the parent. | CONVENIENCE | System prompt: children "don't inherit your transcript." Partially mitigated by existing patterns (tandem/build-context-pack.py). | Cheaper delegation; less briefing overhead and less context dropped per spawn. |
| 3 | Delegation depth is capped: my children (depth 2/2) cannot spawn their own. Trees must fan out from the parent. | CONVENIENCE | Runtime context: depth=1, max_depth=2; "your subagents cannot spawn their own." | Deeper autonomous decomposition without parent fan-out becoming the bottleneck. |
| 4 | Only the parent/root can run browser tasks; subagents cannot launch or operate them. | CONVENIENCE | System prompt: "Generic subagents cannot operate a live browser or launch browser tasks." Workaround covers the real workload: the Pig's headed Chrome is driven via SSH/CDP scripts, which any agent can run. | Delegation trees could include web work below the parent instead of routing all of it through one agent. |
| 5 | No direct child-to-child channel. Coordination goes via parent relay (`subagent.send` is async and queues behind the child's current work unless `interrupt=true`) or via shared files. | CONVENIENCE | subagent.send semantics in tool description; filesystem is shared. | Lower-latency multi-agent teamwork; less parent relay load. |
| 6 | Pig access is per-invocation SSH (fresh handshake each call, ~1.4s measured). No persistent session. | CONVENIENCE | pig-ssh.sh opens a new connection per call; probe 2026-09-13 completed in 1.4s. | Lower per-call overhead for chatty Pig interactions. |
| 7 | Known SSH/PowerShell fragility modes: stdin hangs on non-interactive SSH, UTF-16 misdecode of even-length UTF-8, never rewrite a script while bash executes it. | CONVENIENCE | Two live breakages documented in AGENTS.md 2026-09-13; workarounds established (scp for byte-exact transfer, BOM-strict decode). | Fewer exotic transfer failures; less tribal knowledge required to operate the Pig path. |
| 8 | The whole Pig-dependent stack (gateway, Postgres, CDP Chrome, Meta AI research, FB engagement) has no fallback when the Pig or Docker is unhealthy. | REAL BLOCKER | 2026-09-13: Docker Desktop daemon died (157GB VHDX, C: 7.3GB free); every gateway/Meta/FB path depends on the Pig. No redundant path exists from here. | Autonomous operation survives Pig outages instead of halting the entire intelligence loop. |
| 9 | Disk pressure on the Pig (C: 7.3GB free, ~1.5%) already killed Docker once and threatens Postgres/gateway persistence. Predictive hygiene decided but not implemented. | REAL BLOCKER | 2026-09-13 Docker I/O-error incident; decision recorded (shared box + predictive hygiene, <200 lines, surgical) but not executed. | Eliminates the observed kill-vector for the whole Pig stack. |
| 10 | Cron run history can record false success: worker self-reports are trusted. | REAL BLOCKER | 2026-09-13 15:04 meta-ai-intel-pass: `cron.runs` shows "succeeded" claiming an 18.7KB / ~32-business answer file; the process was actually SIGTERMed (exit 143) and no file was captured. | Unattended runs become trustworthy: scheduler records reflect verified artifacts, not claims (CLAIMED SUCCESS != CAPTURED ARTIFACT != VALIDATED RESULT). |
| 11 | Cloud-side termination orphans Pig-side work with no reconciliation (SSH child killed, Chrome tab left behind, ledger sidecar stuck at "started" until hand-fixed). | CONVENIENCE | Same 15:04 incident; mitigations exist (idempotent job envelopes, CDP watchdog). | No manual ledger repair after kills; cleaner resume semantics. |
| 12 | VERIFIED gate is human-only by design: "then a human invokes this script. Nothing calls it automatically." | ARCHITECTURAL PREFERENCE | tandem/mark-verified.sh header; `--by` records who authorized. | The VERIFY→emit→PING loop could close unattended — at the cost of the deliberate human truth-gate. |
| 13 | External sends pause for Nolan's approval; cold email capped at 10/day UTC. Approval is the real volume limiter. | ARCHITECTURAL PREFERENCE | Standing rules in AGENTS.md/MEMORY.md and alignment synthesis. | Fully hands-off outreach volume — trading away deliverability and safety control. |
| 14 | Gateway bearer tokens must never persist; resolved at runtime from the Pig container env per invocation. | ARCHITECTURAL PREFERENCE | Standing rule ("never write them to files, memory, or chat"); emit-observation.py resolves via `docker exec ping-gateway printenv` each run. Note: auth is checked against Postgres `exterior_agent_credentials`, not the env seed — rotation must update DB rows. | Simpler direct-access patterns, at the cost of the credential-hygiene posture. |
| 15 | Zero read/query tooling exists for PING from here — only the emit POST path. The network path for reads is proven but unused. | NOT YET USED | Repo grep: only tandem/emit-observation.py touches the gateway (POST). No GET/projection script exists. Direct HTTP via egress proxy proven 2026-09-13. | Any agent could query/project PING state without new infrastructure; the read side is the missing half of the loop. |
| 16 | Meta AI has no API; the only path is the Pig's headed Chrome via CDP (cloud browser is org-blocked from meta.ai). | CONVENIENCE | AGENTS.md Meta AI tandem entry; first successful capture 2026-09-13 after the morning breakage. | Faster, less fragile research leg; fewer moving parts per intel pass. |
| 17 | Cloud browser sessions die within minutes (Facebook); the working path is the Pig's headed Chrome + watchdog + ensure-cdp.sh. | CONVENIENCE | AGENTS.md: FB flags fresh cloud profiles (zero cookies persist); PigiFBLogin task + chrome-cdp-watchdog.ps1 verified working 2026-09-13. | Less session babysitting — though the workaround is already operational. |
| 18 | Cron scheduling limits: no conditional firing, no start/end dates, loose timing (±minutes), default 3600s per-job timeout. | CONVENIENCE | cron tool schema; scheduling-and-watching.md: "Timing is loose... give or take minutes." | Precise event-driven firing instead of polling; less wasted wake-ups. |
| 19 | In-flight work is delivered to the spawning session; behavior on hard session/VM restart for in-flight subagents is not empirically established. Files/crons/memory persist; design for file-based handoffs. | CONVENIENCE | Workspace persistence proven across restarts; compaction preserves the session (observed in the parent transcript). | Crash-proof delegation with guaranteed handoff of partial work. |
| 20 | Fresh agents get no automatic capability/path index; discovery is manual (directory listing, memory search). pig-capabilities.json exists as a machine contract, but the parent must point each child at it. | CONVENIENCE | System prompt + shared-filesystem reality. | Faster child ramp-up; less briefing boilerplate per spawn. |

## Net assessment

Nothing in the environment prevents agents from doing the work — cron
workers have the full toolset, SSH and the gateway path are proven, and
the filesystem is shared. The binding constraints on full-throttle
autonomy are: (a) Pig/Docker/disk as a single point of failure with no
fallback (rows 8–9); (b) untrustworthy run records after failures
(row 10); (c) deliberate human gates on truth promotion and external
sends (rows 12–13), which are choices, not breakages; and (d) the
missing PING read side (row 15) — the network path exists and is
proven, it simply has never been used. Everything else is friction
with a known workaround.
