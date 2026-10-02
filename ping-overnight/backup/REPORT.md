# Agent F - Backup Remediation Report (overnight PING convergence sprint)
Date: 2026-09-16 ~20:25-20:28 MDT (02:26-02:28 UTC 2026-09-17)
Classification: **VERIFIED**

Agent B proved the on-box 1.1GB snapshot tarball is corrupt (truncated gzip) and holds no live
data. This report covers the creation of a real data-plane backup set. All operations were
READ-ONLY against live services: no container restarted, no volume touched, no file deleted,
no commit made. The corrupt tarball was left untouched per sprint law.

## Access path
cloud VM (/home/hatch) -> `ssh -F ~/.ssh/pig-config pigwsl 'wsl -d Ubuntu -- bash -s'` ->
`ssh -o BatchMode=yes -o ConnectTimeout=15 -o StrictHostKeyChecking=no ubuntu@129.146.60.17`
Live host: ping-core-01 (aarch64), project `oracle`, containers ping-postgres / ping-qdrant /
ping-gateway all healthy. PG user/db resolved from the live container env: user=`ping`,
db=`crx_runtime`. The password was used only inside the container's own environment
(`export PGPASSWORD="$POSTGRES_PASSWORD"` within `docker exec`); no credential was printed,
logged, or written anywhere.

## 1. PostgreSQL pg_dump - VERIFIED
Exact command (on Oracle):
`docker exec ping-postgres sh -c 'export PGPASSWORD="$POSTGRES_PASSWORD"; pg_dump -U "ping" -d "crx_runtime" --no-owner --no-acl' | gzip -9 > /opt/ping/releases/pgdata-backup-2026-09-16.sql.gz`
- Result: DUMP_OK, 160927 bytes, `gzip -t` PASS
- sha256: `10e315c3ef2570e210149db95b6f57ad4268b6a4816d37764a9bc40875d8f51e`
- Live table inventory (read-only SELECTs): 31 public tables, including `ping_events` (1158 rows)
  and `ping_missions` (222 rows). Full list: agent_workspaces, ai_workspace_results,
  canonical_events, capability_requests, commits, customers, deployment_registry, event_outbox,
  event_processing, execution_graphs, exterior_agent_credentials, google_reviews,
  graph_node_states, hpp_project_artifacts, hpp_projects, knowledge_edges, knowledge_nodes,
  mission_events, mission_executions, ping_bridge_cursors, ping_events, ping_missions,
  repository_dead_letters, repository_events, repository_objects, repository_snapshots,
  repository_store_migrations, review_flags, runtime_registry, telemetry_metrics, tenant_registry
- Dump file contains all 31 `CREATE TABLE` entries, including `public.ping_events` and
  `public.ping_missions` (verified via zcat + grep).

## 2. Qdrant snapshot - VERIFIED
- Qdrant reachable at http://127.0.0.1:6333 (port published from ping-qdrant). No restart.
- Collections: exactly one, `knowledge`.
- `POST /collections/knowledge/snapshots` -> `knowledge-7722890700902776-2026-09-17-02-26-36.snapshot`
- Downloaded via `GET /collections/knowledge/snapshots/<name>` to
  `/opt/ping/releases/qdrant-snapshots-2026-09-16/knowledge-knowledge-7722890700902776-2026-09-17-02-26-36.snapshot`
- Size: 67375104 bytes (> 0 verified). Points in collection at snapshot time: 13.

## 3. Clean source tarball - VERIFIED (after one correction)
Source: `/opt/ping/releases/bce92787b0da631ed9218e2255607562c9dff731/ping-oracle-clean-snapshot`
Excludes: `.git`, `node_modules`, `.env`, `*.key`, `*secret*`, `*credential*`, `*.bak*`
(all case variants), the old corrupt tarball.
- First build passed `gzip -t` but a listing audit found 12 files with UPPER-case SECRET/CREDENTIAL
  in their names (docs like `CREDENTIAL_SURVIVABILITY_MATRIX.md`, `SECRET_MANAGEMENT.md`,
  `SECRET_AUDIT_REPORT.json`); tar `--exclude` patterns are case-sensitive, so they slipped through.
  Rebuilt with case-complete excludes.
- Final: 26628632 bytes, `gzip -t` PASS,
  sha256 `962beb7c53385c6771dd2197fbca86ac4f67867d9477cab81564d7aba8cb3ed6`,
  2902 entries, listing audit: 0 hits for `.env` (exact), `secret`, `credential`, `.key`, `.bak`
  (all case-insensitive). No `.pem`/`.p12`/private-key-style names present.
- Note: the excluded SECRET/CREDENTIAL files were documentation about secret management, not
  actual secrets, but they are out of the tarball per the exclusion rule.

## 4. Restore README - written
`/opt/ping/releases/RESTORE-2026-09-16.md` describes isolated restore for each artifact
(temp postgres:17-alpine on 127.0.0.1:15433 with temp volume + generated creds, per Agent B's
safe procedure; temp qdrant:v1.7.0 on 127.0.0.1:16333 with snapshot recover; source extract to
/tmp + diff, never overlay live). Explicitly forbids live ports/volumes/container names.

## Artifacts (on Oracle, /opt/ping/releases/)
- pgdata-backup-2026-09-16.sql.gz (158K)
- qdrant-snapshots-2026-09-16/knowledge-knowledge-7722890700902776-2026-09-17-02-26-36.snapshot (64M)
- ping-source-clean-2026-09-16.tar.gz (26M)
- RESTORE-2026-09-16.md

## Observations for the coordinator
- ping-gateway showed "Up 5 minutes" at 02:26 UTC while postgres was "Up 31 hours": the gateway
  was restarted by something/someone shortly before this run. I did not restart anything.
- Residual DR gap: the backup set lives on the same host as production. Copy it off-host
  before it counts as real DR. No backup automation exists yet; this was a one-shot.
  Recommend a nightly pg_dump + Qdrant snapshot cron as the morning follow-up.
- Lesson recorded: GNU tar `--exclude` is case-sensitive; secret-name excludes need all
  case variants (or a case-insensitive file-list approach).
