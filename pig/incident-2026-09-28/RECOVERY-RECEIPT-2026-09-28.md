# RECOVERY RECEIPT — 2026-09-28 (post-reboot recovery with death instrumentation)

Authority: Nolan's ~06:12 MDT recovery order. Killer attribution = UNKNOWN, accepted; investigation stood down.
Wake inhibitor: PIG-RUN-WAKELOCK holder active for the recovery session (released at end). Power policy untouched.
Death instrumentation: /home/nolan/3100-lifecycle-watch.sh (PID 19760) + /home/nolan/3100-lifecycle.log. PROVEN WORKING: captured the complete 06:06:04 blessed restart (LAUNCH-EVIDENCE old_pids=19818 → DEATH-CERTIFICATE with full chain → READY-EVIDENCE + LISTENER_APPEARED pid 23046).

## Per-boundary records

### B1 WINDOWS HOST
BEFORE: rebooted 05:24 (forced reset per Nolan). ACTION: observation only. AUTHORITY: recovery order. EXPECTED: host up. OBSERVED: up; WSL uptime 2680s (~05:28 start). HEALTH: UP. FAILURE: none.

### B2 DOCKER (actual engine)
BEFORE: autostart configured but failed to launch post-reboot (zero processes); Nolan manually launched ~05:55. ACTION: verified the ENGINE (not GUI): `docker version`. AUTHORITY: recovery order. EXPECTED: API responding. OBSERVED: client=server=29.5.3; 17 containers, 9 running. IDENTITY: Docker Engine 29.5.3. HEALTH: engine healthy. FAILURE: none. NOTE (pre-existing, not a regression): ping-vault reports "unhealthy" because its healthcheck runs `vault status` over HTTPS while vault listens on HTTP; the vault process is running and doing core work. Autostart-failure root cause still UNKNOWN; config change deferred pending Nolan's auth.

### B3 WSL BOUNDARY
BEFORE/ACTION: boundary check. OBSERVED: responsive, IP 172.21.65.209 (unchanged). HEALTH: UP. FAILURE: none.

### B4 PERSISTENCE (authoritative Postgres)
BEFORE: ping-postgres Up 12 min. ACTION: pg_isready + `SELECT 1` as crx_user on crx_runtime. OBSERVED: accepting connections; SELECT 1 = 1. IDENTITY: role crx_user, db crx_runtime (role "postgres" does not exist; pre-existing). HEALTH: HEALTHY. FAILURE: none.

### B5 GATEWAY (ping-gateway :8080)
BEFORE: Up 9 min. ACTION: /health probe. OBSERVED: / → 200; /health → 503 overall, components: gateway healthy, generated_artifacts healthy (5), integrations healthy (3/3: posthog/email/sms), qdrant healthy; DEGRADED (pre-existing): event_governance (417 NAMESPACE_VIOLATION — jev-shadow has no owner for namespace 'jev', expected per Nolan's jev config), embedding not_initialized. HEALTH: serving; degraded components pre-existing, not reboot regressions. FAILURE: none blocking.

### B6 JOURNAL IDENTITY (:18199)
BEFORE: PID 19311. ACTION: identity probe. OBSERVED: {"ok":true,"service":"fyd-journal-gateway","journal":"fyd-demo-journal@8d6956c1caca"}. HEALTH: healthy. FAILURE: none.

### B7 FYD RUNTIME (:3100, one blessed path)
BEFORE: running from blessed path (06:06:04 watchdog restart via /home/nolan/start-3100.sh). ACTION: full proof, no restart (server already blessed; avoid churn). OBSERVED: PID 23046 on :3100; HEAD 0264d517ea53358d9246ddbbba66bb9dd0beb0d4 (dirty 144, pre-existing — never touched); BUILD_ID DqZQX-gQgkpciv6rpLgG3; NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1 live in process env; / → 200; /api/health → 200; /sites/happy-place → 200; /sites/coppersmith → 307 → /sites/coppersmith-plumbing → 200. HEALTH: healthy. FAILURE: none.

### B8 MISSION CONTROL
ACTION: probe gateway mission routes. OBSERVED: /missions → 401 (alive, auth-enforced); MissionScheduler active in gateway logs. HEALTH: serving, auth boundary intact. FAILURE: none.

### B9 ASK FYD
ACTION: POST /api/fyd/ask/happy-place (trusted route; flat route correctly 308s). OBSERVED: 200, ok:true, answerClass="SUPPORTED DIRECTLY", answerState="KNOWN", tenantId="happy-place", citation [1]; evidence-bounded. HEALTH: healthy. FAILURE: none.

### B10 DEMO SITES (served path)
Happy Place /sites/happy-place → 200. Coppersmith /sites/coppersmith → 307 → /sites/coppersmith-plumbing → 200. Both serving. FAILURE: none.

### B11 TAILSCALE REACHABILITY (repaired)
BEFORE: portproxy rule present (100.79.154.43:3100 → 172.21.65.209:3100) but NOT forwarding post-reboot (refused from Windows side and tailnet). ACTION: netsh delete + add v4tov4 for :3100 with the exact same definition (:3105/:3107 untouched). AUTHORITY: recovery order B11. EXPECTED: forwarding restored. OBSERVED: Windows-side 100.79.154.43:3100 → 200; tailnet via proxy: / → 200, /sites/happy-place → 200, /sites/coppersmith → 200 (followed). IDENTITY: tailnet 100.79.154.43, WSL 172.21.65.209. HEALTH: private path restored for Nolan's hands-on testing. FAILURE: none. ROLLBACK: rule definition recorded above; delete+re-add is idempotent.

### B12 BROWSER PROOF
HTTP served-path proofs complete (B10 + B11 tailnet). Live-browser screenshot proof requires a browser task; subagent cannot operate one — delegated to parent.

### B13 RESTART / REPLAY PROOF
Restart: the 06:06:04 blessed restart IS the proof (instrumented end-to-end; see header). No further restart performed on the healthy production server. Replay: hostile battery rerun below.

### B14 HOSTILE BATTERY (served current head)

SERVED-PATH BATTERY (suites/live-attack.mjs vs live :3100, PID 23046): GREEN.
- happy-place: ALL PASS (L1-proof-question-200, L1-answer-class-contract, L1-every-citation-classified, L1b-no-demo-in-multiple-evidence, L2-ungrounded-refuses, L4-tenant-mismatch-refused; L3-hide skipped, no fixture env).
- coppersmith-plumbing: ALL PASS (same 5/5, L3 skipped).

Per-category verdicts (SECRET, TENANT, WRONG_JOURNAL, HOLD, LEASE REAPER, VOCABULARY, SSRF, APPROVAL DIGEST, IDEMPOTENCY, REPLAY, RESTART):
- SECRET: NOT RERUN (secret P0 fix is floating uncommitted; not in served head; live secret probing against prod is out of scope).
- TENANT: PASS (served L4: body tenant vs route tenant → 400 tenant_mismatch, both sites).
- WRONG_JOURNAL: PASS on identity (:18199 = fyd-demo-journal@8d6956c1caca, correct).
- HOLD: NOT RERUN (constitutional; no HOLD-crossing action taken during recovery).
- LEASE REAPER: OPEN / KNOWN (reaper-vs-HOLD design gap documented in ~/workspace/AGENTS.md; needs Nolan's design word; not a recovery action).
- VOCABULARY: FAIL / KNOWN-OPEN. B1 (DIRECCT_FACT), B2 (empty class), B3 (TYPO_CLASS), B6 (unknown future class), H9 (members visibility), R1 (demo content) reproduced on current HEAD by the 37-check offline suite (31/37). Queued for generic fix per Nolan's ~06:12 decision; NOT fixed in this recovery task. Served-path L1b (R1 shape) did not trigger live, but the fail-open code paths remain in served code.
- SSRF: NOT RERUN (state per prior: IMPROVED/TESTS PASS, DNS-rebinding honestly open).
- APPROVAL DIGEST: PASS at unit level (src/fyd/customize jest 130/130 on current head, includes stale-guard/digest tests); served approve path NOT attacked (would pollute the demo journal Nolan is about to test).
- IDEMPOTENCY: PASS at unit level (same 130/130); served NOT attacked (same reason).
- REPLAY: PASS at unit level (same 130/130); served NOT attacked (same reason).
- RESTART: PASS (06:06:04 blessed restart fully instrumented; :3100 healthy since).

WRITE-BOUNDARY GATE (scripts/fyd-hostile-gate.mjs): 3/13 — STALE HARNESS, cannot verdict the current head. Findings: (1) gate hardcodes "94 passed" but the suite is now 130/130 (all pass); (2) the journal gateway now REQUIRES ?tenant= on GET /events (400 tenant_required) but the gate omits it; (3) gateway dedupe-test 6/7 failures are the same tenant-contract drift. The battery needs updating for the tenant-hardening changes (security-lane work, not recovery work). Log: /tmp/gate-run-20260928.log (Pig /tmp, ephemeral).

OVERALL: recovery complete; hostile battery NOT fully green (VOCABULARY known-open, write gate stale). NOT READY per the task's green-battery condition.

## 03:41 classifier fix (small, in-flight completion)
~/workspace/pig/pig-health.sh: removed the evidence-free HOST_ASLEEP default. Slow-SSH-blackhole now classifies UNKNOWN_REACHABILITY_FAILURE with honest evidence text. Fail-before fixture ~/workspace/pig/antifragility/tests/test-host-sleep-classifier.sh now PASSES (was FAIL). No downstream restart logic branches on the old label (machine.reachable FAIL→STALE; both non-healthy). Scope kept minimal: 2 edits.
