# Oracle Live State: Phases 9-12 (Constitutional Convergence Program)
Date: 2026-09-19 ~06:15 MDT. Investigator: field subagent, cross-agent evidence.
Mode: read-only first; backup authorized; no stack mutation performed.
Host: 129.146.60.17 (ping-core-01). Oracle SSH from Pig WSL, key auth.

## Phase 9: Rediscovery

| Item | Live value |
|---|---|
| Hostname | ping-core-01 |
| uname | Linux ping-core-01 6.17.0-1020-oracle #20-Ubuntu SMP Sat Jul 25 00:52:17 UTC 2026 aarch64 |
| Docker | 29.1.3, build 29.1.3-0ubuntu3~24.04.2 |
| Docker Compose | 2.40.3+ds1-0ubuntu1~24.04.1 |
| git | 2.43.0 |
| Compose project | `oracle`, status running(3) |
| Compose config | /opt/ping/releases/bce92787b0da631ed9218e2255607562c9dff731/ping-oracle-clean-snapshot/infrastructure/oracle/docker-compose.oracle.yml |
| Compose working_dir label | /opt/ping/releases/bce92787b0da631ed9218e2255607562c9dff731/ping-oracle-clean-snapshot/infrastructure/oracle |
| Compose config-hash label | c50530c0c76328e74aa57d70997e2302ea8447261ac3a56f1f3cf35aae1397e8 |
| Network | oracle_ping_internal (bridge) |
| Volumes | oracle_pgdata -> /var/lib/postgresql/data (RW), oracle_qdrant_storage -> /qdrant/storage (RW) |

### Per-container table

| Container | Image | Image ID | Created | Status | Ports | Restart | Privileged | User | Mounts | Docker.sock mount |
|---|---|---|---|---|---|---|---|---|---|---|
| ping-gateway | oracle-gateway | sha256:8400deecf2a93be276339492b71ebb2ea2a768b565b0d0752a2dd2fe005e48c5 | 2026-09-17T12:59:38Z | Up 47h (healthy) | 127.0.0.1:8080->8080 | unless-stopped | false | root (empty User) | none | NO |
| ping-postgres | postgres:17-alpine | sha256:18cfe3ef5e6815560c98237d6216d1e5119702fb0f3894c8785dd58b8bbe5d73 | 2026-09-17T11:42:30Z | Up 2d (healthy) | 127.0.0.1:5432->5432 | unless-stopped | false | (image default) | oracle_pgdata RW | NO |
| ping-qdrant | qdrant/qdrant:v1.7.0 | sha256:ff1639878418c0572f50a7e1314874e399537eb97e6d2f42d6b987a07a2c4c4f | 2026-09-17T01:53:11Z | Up 2d (healthy) | 127.0.0.1:6333-6334->6333-6334 | unless-stopped | false | (image default) | oracle_qdrant_storage RW | NO |

Gateway env var NAMES (never values): QDRANT_URL, QDRANT_HOST, POSTGRES_PORT, NODE_ENV, QDRANT_PORT, POSTGRES_PASSWORD, POSTGRES_DB, OLLAMA_BASE_URL, POSTGRES_HOST, POSTGRES_USER, LOG_LEVEL, PATH, NODE_VERSION, YARN_VERSION. Secrets arrive as container env from /opt/ping/.env (mode 0600, owner ubuntu). Live CMD: `node gateway/server.js` (ENTRYPOINT docker-entrypoint.sh).
Source revision: no .git inside the image; deployment marker is the release dir name bce92787b0da631ed9218e2255607562c9dff731 (clean-snapshot era); image digest above is the pin.

## Phase 10: What code is actually running

Evidence source: docker exec read-only inspection of /app inside live ping-gateway (container built 2026-09-17T12:59:38Z).

Bootstrap: `gateway/server.js` instantiates `bootstrap/gateway_runtime.js`. That file requires BOTH runtimes:
- line 15: `const { CanonicalEventEnvelope } = require('../canonical_event_envelope');`
- line 72: `const { UnifiedEventRuntime } = require('../../ping-runtime/events/unified_event_runtime');`

Wiring in live bootstrap (gateway_runtime.js):
- Line 477-478: `canonicalEventEnvelope = new CanonicalEventEnvelope(this._storage, ...)` + `initialize()` (creates canonical_events table). Passed into AIWorkspaceAuthority, ReviewAuthority, CustomerAuthority, ProjectAuthority, business_profile adapter. Routes: `/canonical-events` (createCanonicalEventRoutes) mounted.
- Line 510-516: `unifiedEventRuntime = new UnifiedEventRuntime({...})` + `initialize()`. Passed as `eventRuntime` to MissionRuntime, EventBridge, embedding service subscriptions, `/events` route, `_seedBusinessEvents`.
- Line 557-566: EventBridge polls `repository_events` + `canonical_events` and feeds into UnifiedEventRuntime, every 5s.

Write paths found in live (non-test, non-bak) code inside the container:
- `ping-runtime/events/unified_event_runtime.js:148`: `INSERT INTO ping_events (event_id, event_type, source, timestamp, payload, metadata, namespace) ... ON CONFLICT (event_id) DO NOTHING`.
- `gateway/canonical_event_envelope.js:174`: `INSERT INTO canonical_events (...) ON CONFLICT (tenant_id, sequence) DO NOTHING`.
- `gateway/append_orchestrator.js:91`: `INSERT INTO repository_events` but the file is NOT required by live bootstrap (only referenced by authority_registry.js and a dormant-classifications doc). NOT on the live emit path.
- `gateway/constitutional_event_sourcing.js:439`: `INSERT INTO constitutional_events` but NOT wired into live bootstrap; the table does not exist in the database.

Identity scheme of live UnifiedEventRuntime.emit(): event_id = SHA-256 hex of JSON.stringify({eventType, source, [namespace], [logical_id|payload]}). Deterministic content hash, NO PostgreSQL sequence/nextval, NO sequence column (ping_events has no sequence column).

CanonicalEventEnvelope.getNextSequence(): `SELECT COALESCE(MAX(sequence), 0) + 1 FROM canonical_events WHERE tenant_id = $1`. NOT nextval.

### Decisive database evidence (read-only psql via deployment env, 2026-09-19)

Event-related tables in public schema: canonical_events, event_outbox, event_processing, mission_events, ping_events, repository_events. constitutional_events: table does not exist.

| Table | Rows |
|---|---|
| ping_events | 2182 |
| canonical_events | 0 |
| repository_events | 0 |
| event_outbox | 0 |
| event_processing | 0 |
| mission_events | 0 |

ping_events columns: event_id varchar(64) PK, event_type, source, timestamp, payload jsonb, metadata jsonb, namespace, processed, created_at. Sample event_ids are 64-char hex hashes; sources observed: mission-runtime, lineage; namespaces: core::system, core::owner.

### Phase 10 determination

HYBRID code on disk, SINGLE effective write path. The live Oracle gateway runs UnifiedEventRuntime -> ping_events as the canonical event path for all live traffic (2182 rows, hash-identity, no sequence). CanonicalEventEnvelope -> canonical_events is present in code, instantiated, and wired into authorities and routes, but has produced ZERO rows: it is dormant plumbing, not a live authority. repository_events and constitutional_events have no live writers. This is the OLDER clean-snapshot pipeline (pre-constitutional-convergence-v2): neither live runtime matches the certified PostgreSQL-nextval Event Authority (certified on PostgreSQL 15 scratch; live envelope uses MAX(sequence)+1; live runtime uses SHA-256 content identity). Not the old main direct-SQL runtime, not the promotion Python runtime (python files exist in /app but live CMD is node), not the constitutional runtime.

## Phase 11: Security inspection (env var NAMES only; no values printed)

| Check | Finding | Classification |
|---|---|---|
| 8080/5432/6333/6334 exposure | All bound to 127.0.0.1 only (docker ps + ss) | SAFE |
| SSH :22 on 0.0.0.0 | Open; PasswordAuthentication no (60-cloudimg-settings.conf); PermitRootLogin prohibit-password; single RSA key in ubuntu authorized_keys; ~/.ssh has no private keys | SAFE |
| Host firewall | ufw not installed; iptables INPUT: default ACCEPT but effective chain allows established/icmp/lo/tcp-22 then REJECT | SAFE (basic host firewall present) |
| Docker socket in app containers | /var/run/docker.sock mounted in 0 of 3 containers | SAFE |
| Container privileges | privileged=false on all 3; gateway runs as root user inside container | NEEDS HARDENING (gateway as root) |
| Mounted sensitive paths | Only data volumes (oracle_pgdata, oracle_qdrant_storage). Gateway has no mounts. | SAFE |
| Secret injection | /opt/ping/.env mode 0600 owner ubuntu; consumed as compose env_file. Container env carries POSTGRES_PASSWORD etc, visible via docker inspect to any docker-group user (ubuntu is in docker group) | NEEDS HARDENING (inspect-readable secrets; standard compose pattern, no leak observed) |
| /opt/ping/gateway/root_private_key.pem | 122 bytes, world-readable (664), not mounted into any container | NEEDS HARDENING (chmod 600; orphan key material) |
| Backup file /opt/ping/backups/ping-postgres-2026-09-19.dump | Created 644 by umask | NEEDS HARDENING (recommend chmod 600; no credential columns observed in dump scope) |
| 127.0.0.1:33081 listener | No visible process; loopback-only | UNKNOWN (low risk; loopback-bound, cannot identify owner from Oracle) |

No CRITICAL items found. Nothing was changed; no CRITICAL exposure existed that warranted an isolated fix. The 664 pem and 644 backup are hardening items for the convergence deployment, not stack-breaking.

## Phase 12: Backup / recovery point (authorized, non-destructive)

- Postgres volume: oracle_pgdata (named volume, /var/lib/postgresql/data RW).
- Database name: crx_runtime (from pg_restore header; never printed or stored credential values).
- Credential mechanism: deployment's own container env (POSTGRES_USER / POSTGRES_DB expanded inside ping-postgres; no values read, printed, or written anywhere).
- Backup command used: `docker exec ping-postgres sh -c 'exec pg_dump -h /var/run/postgresql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > /opt/ping/backups/ping-postgres-2026-09-19.dump` (custom format, gzip).
- Backup path: /opt/ping/backups/ping-postgres-2026-09-19.dump
- Size: 368338 bytes. Header check: PGDMP magic present.
- Verification: `pg_restore --list` in a scratch postgres:17-alpine container with the backups dir mounted read-only, container removed after (--rm). Result: 211 TOC entries, 31 TABLE DATA sections, archive created 2026-09-19 12:10:26 UTC, dbname crx_runtime, compression gzip. VALID.
- Restore command for reference: `pg_restore -h <host> -U <user> -d <target_db> /opt/ping/backups/ping-postgres-2026-09-19.dump` (custom format; target DB must exist; use --clean cautiously, never against the live stack without Nolan's word).
- Current image IDs: gateway sha256:8400deecf2a93be276339492b71ebb2ea2a768b565b0d0752a2dd2fe005e48c5; postgres sha256:18cfe3ef5e6815560c98237d6216d1e5119702fb0f3894c8785dd58b8bbe5d73; qdrant sha256:ff1639878418c0572f50a7e1314874e399537eb97e6d2f42d6b987a07a2c4c4f.
- Current compose config path: /opt/ping/releases/bce92787b0da631ed9218e2255607562c9dff731/ping-oracle-clean-snapshot/infrastructure/oracle/docker-compose.oracle.yml
- Current source revision marker: release dir bce92787b0da631ed9218e2255607562c9dff731; compose config-hash c50530c0c76328e74aa57d70997e2302ea8447261ac3a56f1f3cf35aae1397e8; no .git inside the image.

Never run (and not run): docker compose down -v, docker volume rm, docker volume prune, docker system prune. No volume, container, or file was deleted. The stack was not restarted.

## Caveats

- DB reads used the deployment's own env inside ping-postgres via the local socket; no credential values were observed, printed, or stored.
- Pig-side helpers: /tmp/oracle/{q,q2,q3}.sql, qwrap.sh, bkup.sh, verify.sh (ephemeral, local VM only). Remote: /tmp/{q.sql,q2.sql,q3.sql,qwrap.sh,bkup.sh,verify.sh,inspect3.json,restore-list.txt} on the Oracle host (ephemeral scratch, no secrets).
- Live Oracle evidence (container code + DB rows) takes precedence over prior reports; it matches the prior clean-snapshot model.
