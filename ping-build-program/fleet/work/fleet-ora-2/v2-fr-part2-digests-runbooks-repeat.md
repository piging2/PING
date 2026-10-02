# Forward-recovery artifacts, part 2: baseline digests, runbooks with stop conditions, repeat-test specs
(fleet-ora-2, 2026-09-24. Owner: Nolan (PING Social). Companion to v2-forward-recovery-designs.md.)

## A. Expected baseline digests (case 7, ORA-2301..2310 — findings F1..F10)

"Post-recovery digest matches the expected baseline" means: after the forward fix is applied and the
service restored, the listed artifacts MUST hash/match the pre-recorded baseline. Any mismatch = FAIL
(evidence destroyed or state corrupted). Baselines are recorded BEFORE the fix is applied.

- F1 (qdrant healthcheck): baseline = sha256 of the qdrant collection point count + `sha256sum` of the
  09-17 snapshot file. Post-recovery: point count identical, snapshot file untouched (healthcheck change
  is container-metadata-only; data must be bit-identical).
- F2 (node drift): baseline = image digests of the running gateway (sha256:4aa9d7...) + `node --version`
  output + sha256 of /opt/ping/gateway package.json. Post-recovery (candidate promoted): NEW baseline
  recorded for the candidate (node 22.x, new digest); the OLD baseline retained as the rollback reference.
  Digest "match" here means: the promoted candidate's recorded baseline is internally consistent
  (engines == runtime == Dockerfile base), not that it equals the old one.
- F3 (qdrant snapshot): baseline = sha256 of the 09-17 snapshot file + live point count. Post-recovery:
  old snapshot file digest unchanged (retained), plus sha256 of the first NEW scheduled snapshot and its
  verified point count.
- F4 (postgres dump): baseline = sha256 of the 09-19 dump + row counts of the event/observation tables.
  Post-recovery: dump file digest unchanged (retained); new automated dump verified by restore + digest
  chain check.
- F5 (disk pressure): baseline = `df` output + `docker system df` output captured pre-prune. Post-recovery:
  reclaimed bytes >= the pre-identified 4.088 GB target; no running container's layer digest changed
  (prune removes only unused images — verify with `docker images` digest list diff).
- F6 (scratch container): baseline = `docker logs p18-scratch-pg` captured to the ops log + volume list.
  Post-recovery: container and its dangling volumes gone; `docker ps -a` shows no `p18-scratch-pg`.
- F7 (ollama image): baseline = image digest of ollama/ollama:latest recorded in the ops log (owner decision
  point). Post-recovery: EITHER image still present with a running consumer container (decision: keep),
  OR digest recorded + image removed (decision: drop). No silent third state.
- F8 (unattended-upgrades): baseline = md5sum of /etc/apt/apt.conf.d/20auto-upgrades and 50unattended-upgrades
  before the change. Post-recovery: config files match the NEW intended content exactly (diff against the
  checked-in desired state); `systemctl is-enabled` output recorded.
- F9 (image bloat): baseline = digest + size of the 1.82GB image. Post-recovery: slim candidate image
  digest + size (target <350MB); chaos harness log showing the candidate passes; old image retained until
  promotion, then its digest recorded in the ops log before removal.
- F10 (single-host): baseline = the recovery runbook document hash + the off-host backup manifest
  (sha256 per backup file). Post-recovery (quarterly rehearsal): rehearsal log with measured RTO;
  digest "match" = the restored scratch VM's service digests (postgres row counts, qdrant point counts,
  gateway /health payload shape) equal the live baselines.

## B. Recovery runbooks with explicit stop conditions (case 8, ORA-2311..2330)

Each runbook: trigger, steps, explicit STOP conditions (abort the runbook if any fires — continuing past a
stop condition risks evidence destruction, which is the FAIL criterion).

- F11/F12 (exit-137 forensics): trigger = container exit 137. Steps: 1) `docker inspect` (record OOMKilled),
  2) `docker logs` to ops log, 3) `dmesg | grep -i oom` with timestamp correlation, 4) classify (OOM vs
  manual kill vs upgrade). STOP: if the container has already been removed (forensics gone — do NOT
  reconstruct from memory; record "forensics lost" and move to prevention); if dmesg shows OOM kills of
  postgres (escalate: data-integrity check first, gateway second).
- F13 (wedged gateway): trigger = /health timeout with container Up. Steps: 1) capture `docker stats`
  + gateway logs tail, 2) restart container, 3) verify /health within 60s. STOP: if restart does not restore
  /health within 5 min (do NOT loop restarts — escalate to candidate rollback); if postgres/qdrant also
  unhealthy (the wedge may be downstream — fix downstream first).
- F14 (OOM-kill under load): trigger = OOMKilled=true or 80%-of-limit alert. Steps: 1) identify the victim
  and the growth curve (docker stats history), 2) restart victim, 3) if gateway: capture heap snapshot
  before restart if possible. STOP: if the victim is postgres (run data-integrity check before restart);
  if kills recur within 1h (do NOT keep restarting — take the service degraded and investigate the leak).
- F15 (cold-boot race): trigger = post-reboot gateway unhealthy. Steps: 1) check postgres/qdrant readiness,
  2) wait-or-retry per the startup-retry fix, 3) verify /health. STOP: if postgres itself failed to start
  (fix postgres first — gateway retries are pointless); if the host is still booting services (wait).
- F16/F17 (journald /var/log): trigger = disk alert or >400M. Steps: 1) identify top consumers, 2) apply
  caps (SystemMaxUse / logrotate / docker max-size), 3) vacuum/rotate. STOP: if the growth is from a
  currently-debugged incident's logs (do NOT vacuum evidence mid-investigation — archive it first).
- F18 (backup gap): trigger = "no verified backup < 26h". Steps: 1) run manual dump+snapshot, 2) verify by
  restore-to-scratch, 3) copy off-host. STOP: if verification fails (do NOT copy an unverified backup
  off-host and call it good — a corrupt backup is worse than no backup because it creates false confidence).
- F19 (config drift): trigger = weekly diff alert. Steps: 1) diff compose config vs live inspect,
  2) determine which side is authoritative (live wins if it carries undocumented hotfixes — record them),
  3) reconcile into the compose file. STOP: if the drift involves secrets or live data volumes (reconcile
  by inspection only; never recreate volumes to "match" the file).
- F20 (secrets): trigger = quarterly custody check fails. Steps: 1) Nolan re-encrypts and re-stores per the
  custody decision, 2) update the runbook's secret inventory (names only). STOP: never transmit secret
  values over chat, email, or unencrypted channels during the fix; if the only copy is the live /opt/ping/.env,
  back it up BEFORE any host work (host loss during the fix would be unrecoverable).
- F1..F10 runbooks (ORA-2321..2330) follow the same pattern: each names its trigger, steps, and the stop
  condition above where the finding overlaps (e.g. F1 healthcheck runbook stops if qdrant data dir shows
  corruption — fix data first; F5 prune runbook stops if any listed image has a running container).

## C. Failure-repeat test specs (case 9, ORA-2331..2350 — all 20 findings)

For each finding: how to reproduce the failure on a scratch clone, and the acceptance criterion proving the
fix prevents recurrence. Execution requires the scratch host (followup); the spec is the deliverable here.

- F1: reproduce = pause qdrant shards (TCP still open, /readyz fails); old healthcheck stays green (bug
  demonstrated). After fix: new healthcheck flips unhealthy within 45s. PASS = flip observed.
- F2: reproduce = build gateway from the checked-in Dockerfile, compare `node --version` vs live 18.20.8
  (drift demonstrated). After fix: CI gate fails any build where runtime != engines. PASS = gate red on
  a deliberately drifted build.
- F3/F4: reproduce = show newest snapshot/dump age > 7d/26h with no alert (gap demonstrated). After fix:
  scheduled job produces a fresh verified artifact; staleness alert fires when the job is disabled.
  PASS = alert fires on disabled job within 26h.
- F5: reproduce = fill disk to 85% on scratch; confirm no alert under current config (gap demonstrated).
  After fix: alert at 70%/85% with top consumers listed. PASS = alerts fire with correct attribution.
- F6: reproduce = create an exited scratch container, wait 48h; confirm no alert (gap demonstrated).
  After fix: weekly audit flags it. PASS = flagged.
- F7: reproduce = list images >2GB with no containers for >30d; confirm no report (gap demonstrated).
  After fix: monthly report lists ollama. PASS = listed with age.
- F8: reproduce = simulate an unattended upgrade restarting docker; confirm containers return but the
  operator was never notified (gap demonstrated). After fix: upgrades are security-only, no auto-reboot,
  and the ops log records every applied upgrade. PASS = log entry exists, no reboot occurred.
- F9: reproduce = build the gateway image from the current Dockerfile; size >500MB (bloat demonstrated).
  After fix: multi-stage build <350MB and the >500MB build gate fails. PASS = gate fails a fat build.
- F10: reproduce = tabletop: host-loss scenario with on-host-only backups; recovery impossible (gap
  demonstrated). After fix: quarterly runbook rehearsal from off-host backups restores all services;
  PASS = measured RTO recorded and within target.
- F11/F12: reproduce = OOM-kill a gateway candidate under load on scratch; confirm no auto-forensics and
  no exit alert (gap demonstrated). After fix: alert fires, logs+inspect+dmesg auto-captured. PASS =
  forensics bundle exists in the ops log.
- F13: reproduce = wedge the event loop on scratch; old state (no healthcheck) shows Up forever (gap
  demonstrated). After fix: healthcheck flips unhealthy, container restarts, /health recovers. PASS =
  unhealthy-to-healthy transition logged.
- F14: reproduce = load past the (new) 2g gateway limit; confirm typed OOM + auto-restart and NO postgres
  victim (fix demonstrated). PASS = only the gateway was OOM-killed, service self-recovered.
- F15: reproduce = reboot scratch host; confirm gateway starts before postgres is ready and (without the
  retry fix) fails (race demonstrated). After fix: gateway waits/retries and reaches healthy. PASS =
  boot-order evidence shows postgres-ready before gateway-healthy.
- F16/F17: reproduce = uncap journald/logrotate on scratch, generate logs; confirm unbounded growth (gap
  demonstrated). After fix: caps hold at the configured maxima over 7 days. PASS = usage <= cap.
- F18: reproduce = delete the only backup copy; confirm no alert and no off-host copy (gap demonstrated).
  After fix: verified backups exist both on-host and off-host. PASS = restore from the OFF-HOST copy
  succeeds on a clean VM.
- F19: reproduce = hand-edit a live container flag on scratch; confirm no drift alert (gap demonstrated).
  After fix: weekly diff job flags the divergence. PASS = alert names the exact diverged field.
- F20: reproduce = tabletop: operator leaves; confirm no one can recover secrets (gap demonstrated).
  After fix: quarterly decrypt-check of the off-host custody passes. PASS = check passes without
  exposing values.
