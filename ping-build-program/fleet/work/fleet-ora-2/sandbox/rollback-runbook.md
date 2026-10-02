# Rollback runbook (fleet-ora-2, 2026-09-24)
Owner: Nolan (PING Social). Host: ping-core-01. Scope: config/topology changes and
image rollbacks. The live baseline is never touched by the worker; every procedure
below is owner-executed. Evidence preservation is built into every rollback.

## 0. Universal pre-rollback (every procedure)
1. `docker ps --format '{{.Names}} {{.Image}} {{.Status}}' > /opt/ping/backups/pre-rollback-$(date +%F).txt`
2. `docker logs <container> > /opt/ping/backups/<container>-pre-rollback.log 2>&1` (evidence)
3. Never use `docker rm -f` on a crashed container before copying its logs.

## 1. Gateway rollback between candidate digests (3c5d280dd <-> 84486f056)
- Roll forward: `docker stop ping-gateway && docker rm ping-gateway`
- Roll back: re-run the ORIGINAL create command with the prior image pin:
  `docker run -d --name ping-gateway --restart unless-stopped <prior flags> ping-gateway:candidate-84486f056@sha256:467af2dabc081dd09a8f26560ab8320073320005030bd3767afa8b40eadd970e`
- Byte-identical baseline: the image digest IS the baseline; `docker images --digests`
  must show the prior digest after rollback. (Live drill is owner-executed; worker
  verified both digests are present on the host.)
- Evidence: keep the replaced container's logs per step 0.

## 2. Postgres restore rollback (1952/1953)
- The store-loss drill proved restore: 5,000/5,000 rows, digest chain verified,
  238 ms RTO (sandbox evidence). Engine-specific `pg_restore` on staging is the followup.
- Rollback of a BAD restore: the pre-restore dump is kept; restore it the same way.
  Never restore over the only copy.

## 3. Config-change rollbacks (each is: add flag -> rollback = remove flag, restart)
| change | add | rollback |
|---|---|---|
| memory limits (1963) | `--memory=1g` (pg/qdrant), `--memory=2g` (gateway) | remove flag, recreate container |
| healthchecks (1964) | `--health-cmd / --health-interval` | remove flags |
| log rotation (1965) | `--log-opt max-size=10m --log-opt max-file=5` | remove flags |
| loopback-only ports (1966) | `-p 127.0.0.1:5432:5432` | revert to prior binding |
| depends_on healthy (1967) | compose `depends_on: condition: service_healthy` | revert to plain depends_on |
- Each rollback is a container recreate (images unchanged), so byte-identical
  baseline = same image digest, which is verified after every recreate.

## 4. .env change rollback (1962, names only)
- Keep the prior `.env` as `.env.<date>.bak` before any change; rollback = restore
  the backup file and recreate affected containers. Values are never read by the worker.

## 5. ollama latest-tag decision rollback (1968)
- Decision record: the tag is REJECTED for pulls; the digest pin is the mitigation.
- Rollback of the decision = re-adopting :latest: NOT RECOMMENDED; documented here
  so the decision is reversible with full context.

## 6. Image prune rollback record (1969)
- Pruning is DESTRUCTIVE-adjacent: images are re-pullable by digest from the lockfile,
  so rollback = `docker pull <pin>` for each pruned image. Record pruned digests first.

## 7. Evidence preservation on every rollback (case 2)
- Crashed/exited containers are kept (`docker ps -a`) until their logs are archived.
- `docker logs` archived to /opt/ping/backups/ BEFORE any `docker rm`.
- The pre-rollback state file (step 0) is the forensics index.

## 8. Compose rollback (1955)
- compose.proposed.yaml does not exist yet; when it does, rollback = `git checkout`
  the prior version + `docker compose up -d`. Hand-run topology rollback = re-running
  the recorded `docker run` commands from the topology doc (to be written from the
  live `docker inspect` output).

## 9. Rollback never resurrects deliberately removed containers
- Every procedure recreates named containers from digest pins; no procedure runs
  `docker start` on a removed container or replays stale `docker ps -a` state.
- If an operator deliberately removed a container, rollback does not bring it back:
  the runbook only restores the DECLARED topology (3 containers + their pins).
  Anything outside the declared topology requires an explicit new decision.

## 10. Rollback audit trail
Every rollback appends one JSON line to `/opt/ping/backups/rollback-audit.jsonl`:
`{"at":"<UTC>","by":"<operator>","action":"<what>","from_digest":"<sha256>","to_digest":"<sha256>","reason":"<why>","pre_rollback_state":"<path to step-0 file>","logs":"<path to archived logs>"}`.
Who (operator), when (UTC), which digest (from/to) are mandatory fields; a rollback
without the audit line is incomplete.

## 10. RTO budget (2026-09-24 addition)
- Gateway rollback between the two candidate digests: RTO <= 5 minutes
  (stop, verify digest, start, /health 3/3).
- Postgres restore from pg_dump: RTO <= 30 minutes.
- Qdrant reindex/re-embed: RTO <= 60 minutes.
- Rollback time is MEASURED (start/end timestamps in the JSONL audit entry) on
  the first real execution; until then the budget is a design target.

## 11. Explicit stop conditions (2026-09-24 addition)
Stop the recovery procedure immediately (do not proceed to the next step) when:
1. The post-step verification FAILS twice in a row (same check, same result) -
   escalate to the owner instead of retrying a third time.
2. A digest does not match the expected baseline (digest-pin-lockfile.json) -
   do not start a container from an unverified image.
3. Data is at risk: any step that would delete a volume, drop a database, or
   overwrite a backup without a verified replacement in hand.
4. Evidence would be destroyed: never remove a crashed container or rotate logs
   before the evidence archive step completes.
5. The RTO budget is exceeded by 2x - switch from recovery to the degraded-mode
   plan (partial-dep-loss.md) and notify the owner.
