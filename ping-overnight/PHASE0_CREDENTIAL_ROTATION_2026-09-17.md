# PHASE0 Credential Rotation Report — 2026-09-17

**Status:** COMPLETE. PostgreSQL credential rotation finished coherently. All proofs pass.
**Rotation window:** 2026-09-17 ~11:35 UTC (worker) through ~11:55 UTC (recovery).
**Author:** Pigi (recovery + certification). Original rotation worker: credential-rotation subagent.

## Outcome

The `ping` database role password was rotated. All four credential locations now cohere on the
new password (verified by SHA256 hash comparison, values never printed):

| Location | State |
|---|---|
| PostgreSQL role `ping` (DB `crx_runtime`) | new password |
| `/opt/ping/.env` | new password |
| `<projdir>/.env` (compose project dir, the file compose actually reads) | new password (updated during recovery) |
| `/opt/ping/infrastructure/oracle/.env` | new password (updated during recovery) |
| `ping-gateway` container env | new password (container recreated) |

Hash prefix (all five): `1c241a9ee041832b`. Old-password backups retained with mode 600:
`/opt/ping/.env.bak-20260917` (worker), `<projdir>/.env.bak-rot2-20260917`,
`/opt/ping/infrastructure/oracle/.env.bak-20260917`.

## What actually happened

1. The rotation worker completed the database `ALTER ROLE` and updated `/opt/ping/.env`
   (mtime 11:42 UTC), then was still in its gateway-recreate/health-poll phase when its
   session was reclaimed. Two orphaned worker shells were killed during diagnosis.
2. The gateway kept crash-looping (`password authentication failed for user "ping"`) because
   the container still carried the OLD password in its environment. `docker restart` does not
   re-read env files; a container recreate is required.
3. Root cause found during recovery: compose reads its `.env` from the **project directory**
   (`.../infrastructure/oracle/.env` under the releases tree), NOT `/opt/ping/.env`.
   The worker updated only `/opt/ping/.env`. Two additional `.env` copies still held the old
   password. A plain `docker compose up -d` also did not recreate the gateway (no config
   change detected); `--force-recreate` was required.
4. Recovery: backed up and updated the two missed `.env` files to the new password,
   then `docker compose -f <compose-file> -p oracle up -d --no-deps --force-recreate gateway`.
   Postgres and Qdrant were not touched (both stayed up; Qdrant untouched for 10h).

## Proofs (all pass)

1. **Postgres health, new password:** `SELECT 1` over TCP with the new password returns `1`.
2. **Gateway reconnect + health:** `GET http://localhost:8080/health` returns `200`;
   container state `running`.
3. **Authenticated request:** `POST /events` with a live Bearer token
   (`agent_id=muse`) returns `200` with canonical
   `event_id=3586f5ee8176bb708bfd4d4d4733f3e89a3ac2ab2c21d228b4db9e8cf3f80692`
   (`OBSERVATION_CREATED`, namespace `tenant::rotation-proof`).
4. **Canonical persistence:** that `event_id` is present in `ping_events` with the correct
   type and namespace.
5. **MissionRuntime functional:** `ping_missions` readable (257 rows); zero
   `Postgres unavailable` lines in the fresh gateway logs.
6. **Qdrant unaffected:** collection `knowledge` intact with 30 points; Qdrant never restarted.

Boundary behavior observed during proofs (pre-existing, working as designed):
malformed namespace `test.rotation` was denied with `403 Invalid namespace`
(must be `core::<name>` or `tenant::<id>`); unknown `event_type` was denied with `422`.

## Security incident: ephemeral degraded-mode keys (CONTAINED)

During the crash-loop diagnosis, gateway logs printed two generated in-memory degraded-mode
API keys. Assessment:

- The keys were generated only because Postgres was unreachable during failed startups.
- The gateway never completed startup in that state (`Gateway failed to start`); `/health`
  returned connection-refused throughout. The keys were never usable externally.
- The crashed container (and its logs containing the keys) was destroyed by the
  `--force-recreate`. Current gateway logs contain zero key material.
- No rotation of those keys is needed: they were ephemeral, never valid against a running
  server, and no longer exist anywhere. They are unrelated to the PostgreSQL credential
  and were not touched.

## Operational lessons recorded

- Oracle-side diagnostic scripts must start with `set +e`: the SSH chain runs bash with
  errexit inherited, so any failing command silently kills the script.
- Never use `docker exec -i` inside a script fed via stdin: it consumes the rest of the
  script as the container's stdin. Use `docker exec ... </dev/null`.
- `psql -v var=...` with `:'var'` interpolation did not substitute in `-c` SQL strings in
  this environment (worked in `\echo` meta-commands). Hex passwords with direct
  single-quote interpolation avoid the issue entirely.
- A deployment can have several live `.env` copies; only the compose project-dir `.env`
  affects recreated containers. All copies were reconciled here.

## Constraints honored

No credential value printed in any output, log, or this report. No Git operations.
No destructive database operations (only `ALTER ROLE ... PASSWORD`). Postgres and Qdrant
data untouched. Pending playbook revision `194a2b85bde957ed` and orphan node
`4917265ee67e678c` untouched. Minimum services restarted (gateway only, via recreate).

## Files changed (Oracle host)

- `/opt/ping/.env` (worker; new password)
- `/opt/ping/releases/.../infrastructure/oracle/.env` (recovery; new password)
- `/opt/ping/infrastructure/oracle/.env` (recovery; new password)
- Three `.bak*` backups (600), listed above.

## Exact next action

Phase 0 is certified complete. Proceed to Phase 3 (per-principal namespace ACL matrix).
No rollback needed. No further credential action required.
