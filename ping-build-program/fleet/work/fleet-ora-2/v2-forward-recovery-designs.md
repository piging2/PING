# Oracle forward-recovery design artifacts — 20 real findings (fleet-ora-2, 2026-09-24)

Owner for all fixes below: Nolan (PING Social), operator of the Oracle host (ping-core-01, 129.146.60.17).
Design date: 2026-09-24. All findings verified read-only on the live host; nothing was changed.
Principle: forward recovery (fix forward, preserve evidence) is preferred over rollback wherever rollback
would destroy the evidence needed to understand the failure.

---

## F1. qdrant TCP-only healthcheck gap (no HTTP version check)
Verification: ping-qdrant docker healthcheck = `timeout 5 bash -c 'cat < /dev/null > /dev/tcp/localhost/6333' || exit 1`
(TCP connect only). Qdrant natively exposes /healthz ("healthz check passed") and /readyz ("all shards are ready"),
both verified responding. The container healthcheck does not use them.
Forward fix (owner: Nolan, 2026-09-24): replace the healthcheck with
`CMD-SHELL, curl -sf http://localhost:6333/readyz || exit 1` (readyz covers shard readiness; healthz is the
lighter alternative). Apply on next container recreate; no data migration needed. Evidence preserved: none
at risk (healthcheck change is metadata-only).
Monitoring gap (named): "healthcheck green while qdrant degraded" — TCP-open does not imply serving.
Closed in design: alert on /readyz != "all shards are ready" via the gateway's qdrant component status
(already reported in /health); add a 1m staleness alert on the embedding projection lag.
Rehearsal (scratch clone): recreate qdrant container with the new healthcheck; stop qdrant's shards
artificially (pause container), confirm healthcheck flips to unhealthy within 45s; resume, confirm recovery.

## F2. node 18.20.8 in the live gateway vs repo engines 24.x drift
Verification: `docker exec ping-gateway node --version` = v18.20.8; gateway Dockerfile = `FROM node:20-alpine`.
Live runtime does not match the declared build image (and repo engines target 24.x): the running container
was built from a different Dockerfile generation than the checked-in one.
Forward fix (owner: Nolan, 2026-09-24): (1) decide the canonical node line (recommend 22 LTS: 18 is EOL-adjacent,
24 is too new for some deps); (2) pin `FROM node:22-alpine` + `"engines": {"node": "22.x"}` in package.json;
(3) rebuild gateway image, deploy as a new candidate, promote only after the chaos harness passes.
Evidence preserved: keep the 18.20.8 image digest on record (it is the current baseline; do not delete until
the candidate is certified).
Monitoring gap: "runtime version drift invisible" — nothing compares live `node --version` against the
declared engines field. Closed in design: gateway /health gains a `runtime.node` field; a daily check diffs
it against package.json engines and pages on mismatch.
Rehearsal (scratch clone): build candidate on node:22-alpine, run the event-ingress chaos harness, promote.

## F3. qdrant 67MB snapshot staleness (09-17)
Verification: /opt/ping/releases/qdrant-snapshots-2026-09-16/knowledge-...-2026-09-17-02-26-36.snapshot
(67,375,104 bytes), 7 days old at check time; no newer snapshot exists.
Forward fix (owner: Nolan, 2026-09-24): schedule weekly qdrant snapshots via the qdrant API
(POST /collections/knowledge/snapshots) to a dated directory; retain 4 weeks; verify each snapshot by
restoring to a scratch qdrant and counting points vs the live collection. Evidence preserved: the 09-17
snapshot is retained as the last-known-good restore point until the new schedule produces two verified
snapshots.
Monitoring gap: "snapshot staleness invisible" — no alert on snapshot age. Closed in design: daily check
"newest snapshot age < 8 days" else page; snapshot verification result recorded per run.
Rehearsal (scratch clone): restore the 09-17 snapshot to scratch qdrant, diff point counts vs live.

## F4. postgres 09-19 dump staleness
Verification: /opt/ping/backups/ping-postgres-2026-09-19.dump (368,338 bytes, 5 days old); the 09-16 full
backup (pgdata-backup-2026-09-16.sql.gz, 160KB) is 8 days old. No automation; one-shot manual dumps.
Forward fix (owner: Nolan, 2026-09-24): nightly pg_dump (custom format) + weekly base backup, both to
/opt/ping/backups with date stamps, retain 14 daily / 4 weekly; each backup verified by restore to scratch
postgres + event-digest chain check. Evidence preserved: existing dumps retained until the new schedule
has two verified cycles.
Monitoring gap: "backup staleness invisible". Closed in design: daily check "newest verified backup < 26h"
else page; backup size anomaly alert (a 368KB dump for a production DB is itself a signal worth checking).
Rehearsal (scratch clone): restore the 09-19 dump to scratch postgres, verify digest chain.

## F5. disk pressure trajectory (17G of 45G used, 4.088 GB reclaimable images)
Verification: df shows 45G total, 17G used (39%), 28G avail. Reclaimable: ollama 6.99GB (no consumer),
old gateway candidates ~3.6GB, node:18/20-alpine, build cache. (Exact 4.088GB figure from the regen scan;
order-of-magnitude confirmed.)
Forward fix (owner: Nolan, 2026-09-24): (1) remove ollama/ollama:latest IF no consumer is planned (decision:
Nolan — 7GB is the single biggest win); (2) keep only the current + previous gateway candidate;
(3) `docker image prune` + builder prune monthly via cron; (4) set journald SystemMaxUse (see F16) and
logrotate (see F17) to cap the growth side. Evidence preserved: record removed image digests in the
ops log before pruning.
Monitoring gap: "disk growth has no trajectory alert". Closed in design: weekly df trend recorded;
alert at 70% and 85% with the top-5 consumers listed; the gateway /health gains a disk component.
Rehearsal (scratch clone): n/a (reclaim is the fix); verify `docker system df` after prune on the live
host during a maintenance window (prune is safe: only removes unused images).

## F6. p18-scratch-pg leftover container (exit 0, 4 days old)
Verification: `p18-scratch-pg Exited (0) 4 days ago` in docker ps -a. Scratch from an earlier investigation,
never cleaned up.
Forward fix (owner: Nolan, 2026-09-24): `docker rm p18-scratch-pg` and its anonymous volumes
(`docker volume ls -f dangling=true`). Then adopt the rule: scratch containers are named
`scratch-<purpose>-<date>` and removed in the same session that creates them. Evidence preserved:
it exited 0; capture `docker logs p18-scratch-pg` to the ops log before removal in case it holds
investigation notes.
Monitoring gap: "scratch resource leaks invisible". Closed in design: weekly `docker ps -a` audit;
alert on any exited container older than 48h.
Rehearsal: n/a (removal is the fix; verify no volume still referenced first).

## F7. ollama 6.99 GB image with no consumer container
Verification: ollama/ollama:latest 6.99GB present; no ollama container exists (docker ps -a).
Forward fix (owner: Nolan, 2026-09-24): DECISION REQUIRED (Nolan): (a) keep ollama as a planned embedding
backend -> then deploy it as a real service with healthcheck and resource limits, or (b) remove the image
and reclaim 7GB. Do not leave a 7GB image in limbo. Evidence preserved: record the digest before removal.
Monitoring gap: "unused image bloat invisible". Closed in design: monthly `docker system df` report;
alert on any image >2GB with zero containers for >30 days.
Rehearsal: n/a; the decision is the fix.

## F8. unattended-upgrades enabled with no operator coordination
Verification: systemctl is-enabled unattended-upgrades = enabled; APT::Periodic::Unattended-Upgrade "1".
The host can reboot or restart services after a kernel/library upgrade with no operator involvement.
Forward fix (owner: Nolan, 2026-09-24): (1) set `Unattended-Upgrade::Automatic-Reboot "false"`;
(2) restrict upgrades to security-only; (3) upgrades apply during Nolan's maintenance window only,
announced in the ops log. Evidence preserved: dpkg logs retained (they are the audit trail of what
changed and when).
Monitoring gap: "unattended change invisible". Closed in design: daily diff of installed security
upgrades into the ops log; alert on any automatic reboot.
Rehearsal (scratch clone): simulate an upgrade that restarts docker; verify containers come back
(restart policy unless-stopped) and the gateway re-passes /health.

## F9. gateway 1.82 GB image bloat (full repo COPY plus npm install --no-save typescript leftovers)
Verification: ping-gateway:candidate-3c5d280dd = 1.82GB for a node gateway (typical: <300MB).
Forward fix (owner: Nolan, 2026-09-24): multi-stage Dockerfile: (1) builder stage with full COPY +
npm ci; (2) runtime stage `FROM node:22-alpine` copying only dist/, package.json, production
node_modules; (3) .dockerignore excluding docs/, archive/, *.backup, test fixtures; (4) remove the
`npm install --no-save typescript` pattern (typescript belongs in devDependencies of the builder stage).
Target: <350MB. Evidence preserved: keep the 1.82GB image until the slim candidate passes the chaos harness.
Monitoring gap: "image bloat invisible". Closed in design: CI-style check on every gateway build —
fail the build if image >500MB; record image size per release in the ops log.
Rehearsal (scratch clone): build the slim image, run the full chaos harness + restart-semantics drill.

## F10. single-host fate sharing (all three containers on one 1-vCPU VM)
Verification: ping-gateway, ping-postgres, ping-qdrant all on ping-core-01 (uptime shows 1 vCPU class host;
load average near zero but no headroom for failover).
Forward fix (owner: Nolan, 2026-09-24): accept single-host for now (cost decision: Nolan), but (1) make
backups off-host (see F18 — this is what makes single-host survivable); (2) document the recovery runbook:
new host + install docker + restore postgres dump + restore qdrant snapshot + start gateway = RTO target;
(3) rehearse the runbook quarterly on a scratch VM. Evidence preserved: the runbook rehearsal log IS the
evidence that recovery works.
Monitoring gap: "no failover, no runbook". Closed in design: quarterly runbook rehearsal scheduled;
RTO measured each time and trended.
Rehearsal (scratch VM): full runbook rehearsal from backups; measure RTO.
## F11. gateway exit-137 death of ping-gateway-candidate (SIGKILL, forensics preserved)
Verification: `ping-gateway-candidate Exited (137) 35 hours ago` in docker ps -a. Exit 137 = SIGKILL
(OOM-killer or manual docker kill).
Forward fix (owner: Nolan, 2026-09-24): (1) capture forensics BEFORE removing: `docker logs`,
`dmesg | grep -i oom`, container inspect (OOMKilled flag); (2) if OOMKilled=true -> this is F14's
smoking gun: set memory limits + investigate the leak (heap snapshot on next occurrence);
(3) if manual kill -> record who/when in the ops log. Evidence preserved: the exited container is
KEPT until forensics are captured; do not `docker rm` it blind.
Monitoring gap: "container deaths leave no trace". Closed in design: alert on any container exit != 0;
auto-capture logs+inspect+dmesg snippet to the ops log on every non-zero exit.
Rehearsal (scratch clone): reproduce OOM with a memory limit + load; verify forensics capture fires.

## F12. gateway exit-137 death of ping-gateway-prev-84486f056 (SIGKILL, forensics preserved)
Verification: `ping-gateway-prev-84486f056 Exited (137) 2 days ago`. Same 137 pattern as F11, different
candidate generation — suggests a recurring cause, not a one-off.
Forward fix (owner: Nolan, 2026-09-24): treat F11+F12 as one incident: two SIGKILLs in 3 days on gateway
candidates. Same forensics-first procedure as F11; correlate timestamps with load/traffic and with
unattended-upgrades activity (F8). If OOM: the gateway has a memory growth issue — heap profiling on the
candidate before promotion becomes a promotion gate. Evidence preserved: both containers kept until the
common cause is identified.
Monitoring gap: same as F11 (no exit alerting, no auto-forensics).
Rehearsal (scratch clone): load-test the candidate to OOM under a memory limit; verify the promotion
gate (heap profile + chaos harness) catches it.

## F13. wedged gateway with no healthcheck (container Up, event loop wedged)
Verification: ping-gateway has NO docker healthcheck (null) and the earlier server.js /health variant
only checked postgres. A wedged event loop (Up, not serving) is invisible to docker.
Forward fix (owner: Nolan, 2026-09-24): add a docker healthcheck that exercises the event loop:
`CMD-SHELL, node -e "fetch('http://localhost:8080/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"`
or curl equivalent — a healthcheck that requires the loop to process a request. Interval 30s, retries 3,
start-period 60s. Evidence preserved: none at risk (metadata-only change); the wedged-state forensics
(request latency histogram from the gateway logs) should be captured if it recurs.
Monitoring gap: "Up != serving". Closed in design: the healthcheck above plus an external
synthetic probe (cron on the host or an external monitor) hitting /health every 60s and alerting on
3 consecutive failures; alert on p99 /health latency > 2s (wedging shows up as latency first).
Rehearsal (scratch clone): wedge the event loop deliberately (blocking handler), verify the healthcheck
flips to unhealthy and the container gets restarted by policy.

## F14. OOM-kill risk under load (no memory limits anywhere, 0 swap)
Verification: Memory=0/CPU=0/PidsLimit unset on all three containers; host swap = 0; host RAM 5903MB.
Under load, the kernel OOM-killer picks a victim — possibly postgres (data loss risk) — with no warning.
Forward fix (owner: Nolan, 2026-09-24): set explicit limits: gateway Memory=2g, postgres Memory=2g,
qdrant Memory=1.5g (tune after one load cycle); PidsLimit=512 each; keep swap at 0 (swap on a DB host
hides pressure; limits are the control). With limits, exhaustion becomes a typed container OOM
(restart policy revives it) instead of a host-wide kill lottery. Evidence preserved: none destroyed
by setting limits; record the chosen values and the reasoning in the ops log.
Monitoring gap: "memory pressure invisible until the kill". Closed in design: alert at 80% of each
container's limit (docker stats scrape every 60s); alert on any OOMKilled=true event with auto-forensics
(see F11).
Rehearsal (scratch clone): drive load past the gateway's 2g limit; verify typed OOM + auto-restart +
no postgres victim.

## F15. cold-boot ordering race (gateway starts before postgres is ready; no depends_on live)
Verification: all three containers RestartPolicy=unless-stopped; docker+containerd enabled; but the
containers were hand-run (F19) with no compose file, so no depends_on/ordering exists. On reboot,
gateway can start before postgres accepts connections.
Forward fix (owner: Nolan, 2026-09-24): (1) check in a compose.yaml with depends_on + healthcheck-based
`condition: service_healthy` for postgres and qdrant (see F1/F19); (2) gateway already retries DB
connections at startup? VERIFY in code — if not, add startup retry with backoff (this is the forward
fix that makes ordering races harmless even without compose). Evidence preserved: none at risk.
Monitoring gap: "boot order invisible". Closed in design: on every boot, record container start order
+ time-to-ready per service (docker events) into the ops log; alert if gateway reports healthy before
postgres does.
Rehearsal (scratch clone): reboot the scratch host; verify gateway waits (or retries) and reaches
healthy after postgres; record the ordering evidence.

## F16. journald slow fill (432 MB, no SystemMaxUse cap)
Verification: `journalctl --disk-usage` = 440.1M; /etc/systemd/journald.conf has `#SystemMaxUse=` (commented).
Unbounded growth on a 45G disk.
Forward fix (owner: Nolan, 2026-09-24): set `SystemMaxUse=500M` and `MaxRetentionSec=30day` in
/etc/systemd/journald.conf; `systemctl restart systemd-journald`. This caps the slow fill without
losing recent forensics. Evidence preserved: journals are retained 30 days; vacuum only beyond the cap.
Monitoring gap: "log growth invisible until disk pressure". Closed in design: the weekly disk-trend
check (F5) includes journald usage; alert if journald > 400M.
Rehearsal: n/a (config change; verify with `journalctl --disk-usage` after 24h that the cap holds).

## F17. /var/log growth (454 MB)
Verification: `du -sh /var/log` = 462M.
Forward fix (owner: Nolan, 2026-09-24): audit the top consumers (`du -sh /var/log/*`), ensure logrotate
covers them with size caps (e.g. `size 100M`, `rotate 4`, `compress`), and route container logs through
docker's json-file driver with `max-size=50m max-file=3` (or journald driver). Evidence preserved:
compress-then-rotate keeps history; nothing is deleted unread.
Monitoring gap: same as F16. Closed in design: log-size check folded into the weekly disk-trend alert.
Rehearsal: n/a (config change; verify sizes after one rotation cycle).

## F18. backup gap: one-shot on-host-only backups (09-16, 09-19), no automation
Verification: backups exist only in /opt/ping/backups and /opt/ping/releases on the same host;
single-host fate sharing (F10) means a host loss = backup loss. No automation, no verification.
Forward fix (owner: Nolan, 2026-09-24): (1) automate nightly postgres dumps + weekly qdrant snapshots
(see F3/F4); (2) copy every backup OFF-HOST (Nolan's decision on destination: options are the Pig,
object storage, or a second VM); (3) verify each backup by restore-to-scratch + digest check.
Evidence preserved: the existing 09-16/09-19 artifacts are retained as seed restore points.
Monitoring gap: "backup health unknown". Closed in design: daily "newest VERIFIED backup age" check;
a backup only counts when its restore verification passed.
Rehearsal (scratch VM): full host-loss simulation — rebuild from off-host backups only; measure RTO.

## F19. config drift: hand-run docker containers vs checked-in compose artifacts
Verification: no compose file found on the host (/opt/ping has config/, database/, gateway/, etc., but
no compose.yaml defining the three containers); containers were started by hand with flags that exist
only in shell history.
Forward fix (owner: Nolan, 2026-09-24): (1) write the compose.yaml that reproduces the CURRENT live
configuration exactly (image digests, env, volumes, ports, restart policies, healthchecks from F1/F13,
resource limits from F14, depends_on from F15); (2) verify it by `docker compose config` diff against
`docker inspect` of the live containers; (3) all future changes go through the compose file (checked
into version control); hand-run changes are forbidden. Evidence preserved: the live inspect output is
the baseline the compose file must reproduce — capture it before migration.
Monitoring gap: "drift between live and declared". Closed in design: weekly `docker compose config`
vs live-inspect diff job; alert on any divergence.
Rehearsal (scratch clone): bring up the full stack from the compose file alone on a clean host;
verify /health healthy and data intact.

## F20. secrets exist only on the host (/opt/ping/.env values not in any artifact)
Verification: /opt/ping/.env exists (mode 600, ubuntu:ubuntu) with the live values; no secret artifact
exists anywhere else. Host loss or disk failure = secret loss = unrecoverable services.
Forward fix (owner: Nolan, 2026-09-24): (1) Nolan creates an off-host encrypted backup of the secrets
(Nolan's choice of custody: sealed envelope / password manager / encrypted USB — his decision, recorded);
(2) document the secret inventory (WHICH secrets exist, not their values) in the runbook so recovery
doesn't discover missing pieces mid-incident; (3) never commit secrets to any repo (pre-commit hook
scanning for .env patterns). Evidence preserved: values never leave the host except into Nolan's
chosen encrypted custody. NOTE: secret VALUES were never read during this investigation (only file
metadata); the canary content of this finding is the custody gap, not any value.
Monitoring gap: "secret custody unverified". Closed in design: quarterly "can we still decrypt the
off-host backup" check (without exposing values); alert if the check fails.
Rehearsal: tabletop only — walk the runbook's secret-restore steps without touching live values.

---

## Cross-finding notes
- The highest-leverage fixes: F14 (memory limits), F19 (compose file), F18 (off-host backups), F1 (qdrant
  healthcheck). These four close the most failure modes per unit of effort.
- F11+F12 (two exit-137s) + F14 (no memory limits) + F8 (unattended-upgrades) form one incident cluster:
  investigate together, not separately.
- Nothing in this document required touching the live host. All verification was read-only.
