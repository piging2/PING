# Post-recovery reconciliation — 2026-09-27 ~12:47-13:00 MDT

Coordinator: recovery-reconcile (parent: main agent).
Outage: 11:11-12:47 MDT (~3.5h), Tailscale CONNECT tunnel failure at hatch-egress-proxy:3130 (proxy TCP OK, empty CONNECT response, SSH never reached). Pig state during outage: UNKNOWN (never proven down).

## 1. Transport stability: STABLE

Three layered health checks ~90s apart, all PIG_REACHABLE:
- 18:48:37Z: TCP_OK / TUNNEL_OK / SSH_OK (OpenSSH_for_Windows_9.x)
- 18:50:13Z: same
- 18:51:24Z: same
Plus: `echo PIG_OK` via pigwsl-exec.sh OK; Windows-only SSH WIN_OK. Not a flake.

## 2. Remote state (read-only)

- Containers (all running): ping-postgres (24h), ping-gateway (22h), ping-qdrant (24h, healthy), ping-redis (24h, healthy), ping-vault (24h, running but **unhealthy**), ollama, brain-postgres, open-webui. No OOM evidence; WSL uptime 12:12 (no reboot during outage).
- Live journal is brain-postgres/ping_runtime: 2,536 ping_events, latest 2026-09-27 14:18:04 UTC (08:18 MDT). Zero FYD_SITE_OVERLAY events (FYD-036 finding stands). ping_missions: 497 rows. mission_events / mission_executions / canonical_events: 0 rows.
- crx_runtime (ping-postgres container): 739 ping_events, ALL processed=false, latest 2026-09-16. Stale/abandoned store.
- Headed browser SURVIVED: 111 chrome processes, CDP 9223/9225/9226/9227 all OPEN from Windows side, Chrome 153.0.8010.53. (WSL-side 127.0.0.1 CDP checks read CLOSED; expected per workspace AGENTS.md — WSL cannot reach Windows-bound CDP.)
- Qdrant: no published host ports; container-to-container only. Not probed further.

## 3. Outage-cause diagnosis (Pig side, per Nolan's 12:49 order)

- Tailscale adapter: Up (100 Gbps). `tailscale status` shows self node 100.79.154.43 healthy.
- Windows Application + System logs, 11:00-13:00 MDT: zero Tailscale/Tcpip/DNS/NetworkProfile events.
- Tailscale ipn logs (LOCALAPPDATA\Tailscale\*.txt): empty files.
- Conclusion: NO Pig-side evidence of cause. Failure signature (proxy TCP OK, CONNECT empty/broken pipe, SSH never reached) plus earlier flapping (PIG_OK 11:05, PROXY_FAILED 11:16) points at the egress-proxy-to-tailnet path on our side or a transient tailnet data-plane issue that left no Windows trace. Cause NOT provable from available evidence. Honest verdict: UNKNOWN cause, Pig-side clean.
- Hardening ordered by Nolan (job-scoped reversible tunnel keepalive; never another 11:11-style outage; no global never-sleep, no reboot, no firewall changes): NOT YET DESIGNED. Needs a parent-level design decision.

## 4. UNKNOWN reconciliation

- FB pass 128: RECONCILED. Result file job-20260927-132904.json.result.json existed in the Pig inbox and was collected; ledger shows 267 pass records, 89 EXECUTED, 0 FAILED. Worker completed all 89 actions after the 09:25 MDT observation. Fate: all EXECUTED.
- FB pass 130: preserved at ~/workspace/outreach/fb130-curated-job.json (36 likes + 19 comments), NOT_ATTEMPTED, never dispatched. Owned by the 2-hour facebook-engagement-pass schedule. Not dispatched by this coordinator.
- FB inbox now: collect cron unblocked; job-20260927-132904 already collected. No other uncollected result/progress files from the outage window.
- Instagram: 2 UNKNOWN_EXECUTION intents (ig-20260927-011324, like + comment). NOT retried. Blocker stands: Nolan must re-login on the Pig (browser Phase A logged out; two restoration attempts already failed).
- X: 5 follow intents ACTION_INTENT_DURABLE (x-20260927-151400). NOT retried.
- Older: 42 facebook UNKNOWN_EXECUTION from fb-20260924-175129 (Sept 24). Pre-existing; deliberate `reconcile` subcommand territory, not auto-retried.

## 5. LIVE DEFECTS OBSERVED (first-broken-boundary candidates for the P0 sprint)

D1. **jev-shadow failure loop (happening NOW).** Gateway log 18:52:42Z: ClassificationWorker classifies CLAIM_CREATED, EventToMissionBridge mints missions, WorkerRuntime fails every one: "jev-shadow: emit JEV_DECISION_EVALUATED failed — No owner defined for namespace 'jev'". Missions 70e962a9d257c6dc, a5dc21a36107b0a5 (retry_pending), c1f73355ec675fa2, 4369c58ed3fd7513 observed failing. The execution spine is broken for this worker class today.
D2. **Bridge re-fires for 2-day-old missions (event duplication).** The 12:52 MDT bridge events reference mission IDs created 2026-09-25 (4369c58ed3fd7513 completed, others retry_pending/created). Either the bridge reprocesses stale claims or mission IDs are recycled. One of Nolan's listed ugly cases (event duplicates). Mechanism not proven; needs archaeology.
D3. **Reaper-vs-HOLD design gap** (workspace AGENTS.md, open, needs Nolan): lease expiry re-dispatches HOLD missions ~60s later = automatic retry of unknown-outcome missions. Directly violates P0.7.
D4. **ping-vault unhealthy** (running, 24h). Unknown impact; not investigated (out of reconciliation scope).
D5. **crx_runtime journal abandoned**: 739 events, all unprocessed, last write 9/16. If any worker still reads it, it reads 11-day-stale truth.

## 6. MC wiring branch + staged UI patch: HELD (do not apply)

Parent task steps 4-5 (fresh Pig-side branch, port the 4-file staged MC->FYD UI patch, build + serve-verify) were NOT executed. Reason: Nolan's P0 AUTONOMY SPRINT order (2026-09-27 ~12:53 MDT) supersedes — P0.1 "stop building UI until dispatch is real", P0.2 "archaeology before writing". The staged patch (mission-control pages for happy-place/coppersmith-plumbing, mc-api.ts, tenant-mission-control.tsx) remains staged and untouched at ~/workspace/goals/ping-agent-execution-stack/hidden_files/mc-fyd-wiring-2026-09-27/. No branch created, no Pig-side writes, :3200 untouched (frozen until 19:00 adjudication), HPP original untouched.

## 7. Still needs Nolan

- Instagram re-login on the Pig (2 UNKNOWN intents blocked on it; browser Phase A logged out).
- P0 sprint human-boundary items per the doctrine: the first mission's owner approval (APPROVE/DENY on the exact proposal digest), reaper-vs-HOLD design word, FYD-037 live-gateway marker (hard hold), FYD-036 product scope.
- Tunnel-keepalive hardening design (his order; no design exists yet).
- The 42 Sept-24 facebook UNKNOWNs and 5 X follows: deliberate reconcile vs. leave — operator call, not taken.
