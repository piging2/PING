# CORE INTERROGATION — Investigator D: Deployment & Autonomy (Q10, Q11, Q20)

Investigator: subagent 96e24fcb (reader/falsifier). Date: 2026-09-30 ~14:12-15:05 MDT.
Charter: ~/workspace/goals/ping-agent-execution-stack/files/PING-CORE-INTERROGATION-2026-09-30.md
Method per question: QUESTION -> CURRENT CLAIM -> REACHED PATH -> EVIDENCE -> COUNTEREVIDENCE -> VERDICT -> SMALLEST CONSEQUENCE.
No new authorities, stores, writers, coordinators, or registries proposed. Nothing built.

Live probes in this pass (all timestamped 2026-09-30 ~14:15-15:00 MDT, America/Denver):
- Pig WSL via ~/workspace/bin/pigwsl-exec (reachable, healthy)
- `docker inspect ping-gateway` (Pig): image ping-gateway:repair-cert-20260924, digest sha256:4472c543484e120f03095fd4276a8326e0db31ffe4701a35caf9ffb5c17379f2
- Pig gateway /health via WSL->Windows route: HTTP 200, body overall "unhealthy" (gateway healthy; event_governance degraded; embedding not_initialized)
- Pig gateway /events without bearer: HTTP 401 (bearer enforced globally)
- brain-postgres/ping_runtime.ping_events: 2580 rows, newest 2026-09-30 18:14:51 UTC
- Mission Control :3100: /mission-control 200, /api/health {"status":"ok"}; served dir /home/nolan/projects/ping-fyd-converged, branch fyd/convergence-2026-09-28, HEAD 03dff1b761e1bb9774f9467eaa4a3da139227332, .next/BUILD_ID e1Bc9QdeXywnDhCwZDQJa, next-server PID 68073 started 12:31
- Deployed gateway code read directly from the running container (/app/...)

---

## Q10: Can we answer "what software is running right now?" without archaeology?

### CURRENT CLAIM
runtime-manifest.json (generated 2026-09-19, worktree /home/nolan/ping @ 88c9651be) plus the deployment-convergence records (DEPLOYMENT-MAP, COLLISION-PASS, ORACLE-RETIREMENT, OWNER-DECISIONS, all 2026-09-30) describe what is deployed and serving.

### REACHED PATH
Started from live served requests on each plane, then traced backwards: served request -> process/container -> image digest -> source commit -> build identity -> configuration identity -> registry identities -> served bytes -> observed behavior. Cross-checked every link against the manifest and the records.

### EVIDENCE (live, this pass)

**Plane 1: Pig gateway (the one live canonical journal)**
| Link | Value (live-probed) |
|---|---|
| Served request | GET /health -> 200 (body: overall "unhealthy"); GET /events (no bearer) -> 401 |
| Process/container | `ping-gateway`, Up ~7h, Docker CMD node gateway/server.js |
| Artifact digest | sha256:4472c543484e120f03095fd4276a8326e0db31ffe4701a35caf9ffb5c17379f2 (docker inspect, live) |
| Build tag | ping-gateway:repair-cert-20260924 |
| Source commit | NOT recoverable from any live surface on this plane (see counterevidence) |
| Configuration identity | Bearer enforced globally (ExteriorAuthMiddleware); DB = brain-postgres/ping_runtime; required generated registries loaded at boot (capability_resolver throws if missing) |
| Registry identities | gateway/generated/{capability,event,workflow,deployment_manifest,state_machine}_registry.json, hash computed at load |
| Served bytes | /app = image layers, digest-pinned |
| Observed behavior | 2580 journal rows; 5s MissionScheduler poll active; event_governance degraded; embedding not_initialized |

**Plane 2: Oracle (retired today, read-only)**
| Link | Value |
|---|---|
| Served request | None (retired). /health reachable: gateway healthy, PG services not_initialized (per retirement record) |
| Source commit | cc6856c (lane-1 forensics PROVED event files byte-identical) |
| Build tag | ping-gateway:candidate-3c5d280dd |
| Artifact digest | sha256:4aa9d7f669bcd46ddfdf81e3baaf519bb3b3338d585e535b975d7f865cd0f8f2 (recorded in retirement record, not re-verified this pass) |
| Deployment | ping-core-01 (129.146.60.17), container `ping-gateway`, restart unless-stopped |
| Configuration identity | Read-only enforced at DB boundary: ALTER ROLE ping ... SET default_transaction_read_only = on (reversible, one statement; binds even superuser for the app's connection pattern) |
| Observed behavior | INSERT -> ERROR: cannot execute INSERT in a read-only transaction; SELECT count(*) -> 2557 (journal sealed, newest row 2026-09-21 12:05:37 UTC) |

**Plane 3: Mission Control :3100**
| Link | Value (live-probed) |
|---|---|
| Served request | GET /mission-control -> 200; GET /api/health -> {"status":"ok"} |
| Source commit | 03dff1b761e1bb9774f9467eaa4a3da139227332 (live git HEAD in served dir) |
| Branch | fyd/convergence-2026-09-28 |
| Build | BUILD_ID e1Bc9QdeXywnDhCwZDQJa (live .next/BUILD_ID) |
| Deployment | Pig WSL, next-server PID 68073, started 12:31 |
| Served bytes | /home/nolan/projects/ping-fyd-converged/.next |
| Observed behavior | 200s; projection reads the FYD file journal, no read path to PING postgres (Writer C finding, unchanged) |

### COUNTEREVIDENCE
1. runtime-manifest.json is 2026-09-19 @ 88c9651be. It describes NEITHER deployed plane: Oracle's image is byte-identical to cc6856c, the Pig image is repair-cert-20260924. COLLISION-PASS-2026-09-30 explicitly marks the manifest STALE/HOLD. The manifest is source-truth archaeology, not deployed truth.
2. The deployment-convergence records go stale within hours. Writer C recorded MC build CTfvku8OQWWqrG8pKnSy7 @ a8957e3f at ~12:00 MDT; live probe at ~14:50 MDT shows build e1Bc9QdeXywnDhCwZDQJa @ 03dff1b7 ("MC: read-only MarketingOS projection over the live PING journal", one commit ahead, a8957e3f is its ancestor). Somebody rebuilt/redeployed :3100 between 12:00 and 12:31 and no record I can find names that build.
3. No live surface maps the Pig gateway's image digest to a source commit. (Lane-1 did the byte-identity proof for Oracle->cc6856c; no equivalent proof exists in the records for repair-cert-20260924.) The chain has a hole at exactly "source commit" for the one live journal plane.
4. The gateway does not log HTTP ingress (153,837 log lines, zero containing "POST" or "/events"), so served-request evidence cannot be reconstructed from logs after the fact.

### VERDICT: PARTIAL
The chain CAN be closed per plane, but ONLY by live interrogation (docker inspect + served-dir git HEAD + BUILD_ID + journal queries), never from the manifest or the records alone. There is no single surface that answers "what software is running right now" without archaeology, and the records that try go stale within hours. SOURCE TRUTH (git branches) and DEPLOYED TRUTH (container digests, BUILD_IDs) diverge silently; nothing reconciles them automatically. The Oracle retirement is the one closed chain in the system, because it was sealed deliberately today with digest, row count, and read-only proof recorded together.

### SMALLEST CONSEQUENCE
Treat runtime-manifest.json as historical evidence, not a deployment descriptor. Any future claim of the form "X is deployed" must cite a live probe with a timestamp (image digest, BUILD_ID, git HEAD in the served dir). Do not extend the manifest; do not build a deployment registry. The falsification-grade habit is: probe, don't cite.

### What observation would prove this answer wrong?
A single live endpoint on each plane returning {image digest, source commit, build id, config hash} that agrees with runtime-manifest.json without any manual digging. If the manifest matched live state on all three planes, the verdict would be PROVEN instead of PARTIAL.

---

## Q11: What is actually autonomous today?

### CURRENT CLAIM
PING has live mission machinery (MissionScheduler, WorkerRuntime, ClaimWorker, KnowledgePromoter) and a large Muse cron fleet; the system acts on schedules and timers.

### REACHED PATH
Inventoried every recurring/scheduled/self-triggered process I could reach: the deployed gateway's in-process loops (read from the running container), the Oracle host timers (per retirement record), and the Muse cron fleet (cron.list + one cron body read). For each: trigger, authority, input truth, executor, external effects, verification, retry semantics, UNKNOWN semantics, human boundary, durable residue. Applied the charter's test: a cron running unattended is not autonomy by itself.

### EVIDENCE

**A1. MissionScheduler 5s poll loop (Pig gateway, deployed image) — GENUINELY AUTONOMOUS, CURRENTLY PATHOLOGICAL**
- Trigger: setInterval 5000ms, in-process (mission_scheduler.js:124-125, read from the live container).
- Authority: MissionScheduler + MISSION_WORKER_MAP; lease semantics in mission_runtime.js.
- Input truth: ping_missions rows (status created / retry_pending).
- Executor: WorkerRuntime.dispatch, matched on worker eventTypes.
- External effects: worker actions. Currently observed: jev-shadow worker attempts JEV_DECISION_EVALUATED emits, all failing ("No owner defined for namespace 'jev'").
- Verification: mission status transitions (created -> assigned -> running -> completed/failed).
- Retry semantics: BROKEN. 3 CLASSIFICATION_CREATE missions from 2026-09-25 sit in retry_pending with retries stuck at 1, cycling fail -> retry -> dispatch forever. 57,894 jev-shadow failure lines in the container log (~1.1/sec sustained). No mission has ever reached a terminal 'failed' state (status counts: completed 484, created 28, retry_pending 3; zero 'failed' rows), so the retry-exhaustion/DLQ path never fires.
- Starvation: 25 CLAIM_GENERATE missions sit in 'created' (11 from today's ingest pass at 17:46 UTC, 14 older). Zero [ClaimWorker] execution lines in the log window. getPending() is LIMIT 3 ordered by priority DESC, created_at ASC; the 3 zombie retry missions perpetually occupy the dispatch slots, so the claim missions have never been attempted, 2.5+ hours after admission.
- UNKNOWN semantics: lease expiry -> reapExpiredLeases resets to created -> re-dispatch ~60s later (automatic retry of unknown-outcome missions; the HOLD design gap noted in AGENTS.md workspace law).
- Human boundary: Nolan's owner decisions; the stuck loop has no human in it and no alert fired.
- Durable residue: ping_missions rows; 153k+ log lines of repeated failures.

**A2. EventBridge poll loop (gateway's own)** — no-op per the Oracle retirement pre-change probe. Trigger exists, effect is zero. Not autonomy, just a heartbeat-shaped loop.

**A3. Oracle host systemd timers (pg-backup, qdrant-snapshot, "routine")** — housekeeping: daily sealed pg dumps with sha256 sidecars, qdrant snapshots. No PING-semantic decisions, no external effects beyond backups. Scheduled maintenance, not autonomy.

**A4. Muse cron fleet (agent runner, 60+ jobs)** — unattended execution of human-authored policy. PING-relevant members:
- `ping-page-daily-post-side` (daily 08:21): NOW INCLUDES the /ingest producer step (step 6, added 2026-09-30): pulls facebook-cli insights, transfers JSON to the Pig, runs the producer wrapper with SKIP fallback. This is the scheduled acquisition trigger (see Q20).
- `page-insights-scheduled-proof-20261001` (runonce 2026-10-01 09:00): read-only observer, no effects by design.
- `ops-watch-gateway` (5m): asserts Oracle retirement state (container absent/renamed, journal sealed); alert-only.
- Engagement passes (facebook/instagram/threads/x, 2h): real external effects (likes, comments, follows, DMs) but executed under Nolan's standing ceilings, guards, and holds. The policy is human; the execution is machine.
- `heartbeat` (30m), feed pulses, ops watches: infrastructure/observation, no PING-semantic effects.
- Classification: these are ATTENDED AUTONOMY (human-set policy, machine-executed), distinct from PING's in-process autonomy (A1). A cron is not autonomy merely because it runs unattended; most of the fleet executes verbatim human directives with no machine judgment in the loop.

**A5. The scheduled /ingest producer** — NOT autonomous yet. No Pig crontab entry exists; the producer code is not on the served line (absent from both the Pig working tree and the gateway image); tomorrow's 08:21 cron run will hit SKIP_PRODUCER_NOT_ON_SERVED_LINE. Scheduled execution is unproven by design ("observe, do not rescue").

### COUNTEREVIDENCE
- Against "the mission machinery is healthy autonomy": the only continuously-active autonomous behavior in PING's own runtime is a stuck retry loop; the productive path (CLAIM_GENERATE -> ClaimWorker -> CLAIM_CREATED) has zero executions in the observable window despite 25 waiting missions.
- Against "crons = autonomy": the fleet's bodies are verbatim human policy (e.g., the daily-post cron's 6-step marketing procedure). The machine judges nothing; it executes.
- For A1's autonomy being real: the scheduler undisputedly acts without human trigger (57,894 unattended failure lines prove it). The autonomy is real; its current behavior is the pathology.

### VERDICT: PARTIAL
Real unattended execution exists at two layers, but they are different things. PING-internal autonomy (A1) is genuine and currently pathological: a hot fail-retry loop starving productive work, with broken retry accounting (retries stuck at 1, no terminal 'failed' state ever reached). The Muse cron layer is attended autonomy: it runs unattended but judges nothing. The scheduled acquisition producer is not autonomous at all yet. "Autonomous" as a single label for this system would be false precision.

### SMALLEST CONSEQUENCE
The first broken autonomy boundary is the zombie retry loop: 3 five-day-old CLASSIFICATION_CREATE missions cycling forever while 25 CLAIM_GENERATE missions starve. That needs a human decision (cancel/fix the missions or fix failWithRetry's accounting), not a new scheduler. Do not build retry machinery; the machinery exists, its accounting is broken.

### What observation would prove this answer wrong?
ping_missions showing the 25 CLAIM_GENERATE missions transitioning to completed (or terminal failed), and the 3 retry_pending missions reaching a terminal state instead of cycling. Sustained productive dispatch would falsify "currently pathological"; a second independent autonomous decision loop (one that originates a decision no human pre-scripted) would falsify the "crons judge nothing" claim.

---

## Q20: Can PING acquire reality without a human carrying observations into it?

### CURRENT CLAIM
OPERATING_SPEC.md (2026-09-30 forensic pass): "POST /ingest (routes/ingest.js:48,53 -> canonicalizeAndEmit -> emit -> INSERT) is the live canonical door with ZERO live production callers (chain breaks at routes/ingest.js:31). Only external observations reaching ping_events are hand-carried via POST /events by agent scripts (tandem/emit-observation.py:502) and the FYD BFF."

### REACHED PATH
Re-verified against CURRENT source and DEPLOYED state: (1) read the producer branch code on the Pig (forensics/ingest-producer-20260930 @ 5ab16aba); (2) queried the live Pig journal for the producer's admissions; (3) inspected the deployed gateway's logs for /ingest traffic; (4) read the collector cron body; (5) checked the Pig working tree and gateway image for the producer's presence.

### EVIDENCE — exactly one acquisition path, proven end to end
1. **One source.** Facebook Page account insights API: `facebook-cli pages account-insights` (+ `pages posts list`), page_id 1262592440277855 (PING Social Page). No other source feeds this path.
2. **Collection without a human carrier.** Collector = the `ping-page-daily-post-side` Muse cron agent; provenance block in every admitted event: {"tool": "facebook-cli pages account-insights", "collector": "ping-page-daily-post-side"}, collected_at 2026-09-30T11:42:57-06:00. The data moved from Facebook's API to JSON files by an agent, not by a human hand.
3. **One producer.** metric_ingest_producer.js (372 lines, branch forensics/ingest-producer-20260930 @ 5ab16aba, commit message documents the /ingest seam as the target). Normalizes to schema platform_metric/v1 + UTM taxonomy, fail-closed when nothing extractable, Bearer <redacted> piped from the gateway container env (never in argv/files/logs). POSTs to <gateway>/ingest via postToIngest().
4. **One admission door.** POST /ingest -> canonicalizeAndEmit -> emit -> INSERT. Proven by 11 OBSERVATION_CREATED rows in brain-postgres/ping_runtime.ping_events, created 2026-09-30 17:46:06-17:46:33 UTC (11:46 MDT), each carrying schema platform_metric/v1, page_id 1262592440277855, metrics {reach 53, views 53, unique_viewers 5}, prior-period comparison, and the provenance block. Event IDs are content-derived (re-POST is idempotent).
5. **Proven downstream.** The event->mission bridge fired 11 CLAIM_GENERATE MISSION_CREATED rows wrapping the observations (namespace core::owner, confidence 0.5, correlation_id = original event_id). The full chain OBSERVED -> ADMITTED -> MISSIONED is in the journal.
6. **Proven provenance.** Every row carries tool, collector, collected_at, page_id, schema version, and raw verbatim metric nouns. No invented values (unavailable slots are null).

### COUNTEREVIDENCE (hostile, against my own path)
1. The TRIGGER was human-directed: the deployment-lane operator ran the producer manually at ~11:46 MDT 2026-09-30. No schedule fired it.
2. Zero UNATTENDED callers: the producer is not on the served line (absent from /home/nolan/ping working tree, which sits on forensics/approval-events-20260930 @ 217294506, and absent from the served gateway image). No Pig crontab entry exists. Tomorrow's 08:21 cron run (ping-page-daily-post-side step 6) will hit SKIP_PRODUCER_NOT_ON_SERVED_LINE and continue.
3. The gateway logs nothing at HTTP ingress (zero "POST"/"/events"/"ingest" in 153,837 lines), so log absence cannot prove caller absence; the journal is the only ground truth, and it shows exactly one /ingest-sourced batch.
4. The other 82 OBSERVATION_CREATED rows (provenance.tool NULL) remain hand-carried via POST /events by agent scripts and the FYD BFF, per the standing claim. The acquisition seam did not replace that path; it added one proven batch.
5. The 11 CLAIM_GENERATE missions from this batch are starving (see Q11/A1): acquisition succeeded, autonomous follow-through did not.

### VERDICT: PARTIAL
The acquisition PATH is fully proven end-to-end with embedded provenance: one source (Facebook Page insights), one collector (the daily-post cron agent), one producer (metric_ingest_producer.js), one door (POST /ingest), durable journal rows, downstream missions. The DATA reached PING without a human carrying it. But the TRIGGER was human-directed, and zero unattended production callers exist. The seam is live and manned-once, not unmanned-autonomous. The standing "zero live production callers" claim needs one qualifier: zero unattended callers; one human-directed manual pass is proven.

### SMALLEST CONSEQUENCE
Nonew authority, no AcquisitionAuthority, no crawler platform: the one path exists in a branch and needs only the already-sequenced merge-to-served-line step. The 2026-10-01 08:21 cron run plus the 09:00 read-only observer is the scheduled proof; the observer's truth table will report the first broken boundary (expected tomorrow: producer not on served line -> SKIP). Do not build anything; observe.

### What observation would prove this answer wrong?
OBSERVATION_CREATED rows with provenance.collector set and source metric-ingest-producer appearing in the journal inside a cron window with no human operator action behind them (an unattended admission). Or a second, independent /ingest caller appearing in the journal. Either would move the verdict from PARTIAL toward PROVEN (autonomous acquisition).

---

## Cross-question notes (evidence, not proposals)

1. The three questions converge on one theme: PING's machinery RUNS (scheduler polls, bridge fires, seam admits) but its follow-through is broken or pending (claim missions starve, retry loop spins, producer awaits merge). The gaps are sequencing and repair, not missing subsystems.
2. Timestamps in the Pig gateway's docker log predate the container start by ~7h for the earliest jev-shadow lines (05:57Z vs 13:17Z container start). Likely a Pig host clock jump during today's network wedges; noted as anomaly, not used as evidence.
3. No secrets are recorded in this report. The bearer token and DB credentials were used transiently for live probes and are not reproduced here.
4. Context: a new binding directive landed during this investigation (MEMORY.md 2026-09-30 ~14:18 MDT, NEXT 100 HOURS RE-AIM): MarketingOS is the center of gravity; "wire metrics through existing /ingest seam, no metrics subsystem" (hour 80-100). That directive is consistent with Q20's smallest consequence and changes nothing in these verdicts.
