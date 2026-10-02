# PING Backup Retention Policy (proposal)

Scope: on-host backup sets in /opt/ping/releases/. Off-host copies are a
separate decision for Nolan (none exist yet; none are authorized).

## Proposed retention

- Daily Postgres + Qdrant backup set: keep the last 7 daily sets.
- Weekly set (Sunday): keep the last 4 weekly sets.
- Monthly set (1st of month): keep the last 3 monthly sets.
- Source tree tarball: keep the latest 2 (it changes slowly and is large).
- Anything older is deleted by the (currently disabled) automation script;
  deletion is by set directory only, never by individual file, and never
  touches the live volumes.

## Size math (why this is safe on Oracle)

Current host: 45 GB root disk, 27 GB free at Phase 10 time. One full set is
about 94 MB (pg_dump 0.16 MB + Qdrant snapshot 67 MB + source tarball
27 MB). 7 daily + 4 weekly + 3 monthly = 14 sets worst case, about 1.3 GB
total. Well under 5% of free disk. If the Qdrant snapshot grows past 1 GB,
revisit: switch Qdrant to weekly snapshots and keep dailies for Postgres only.

## Deletion safety rules

- The retention sweeper only deletes directories matching the naming
  convention (`/opt/ping/releases/<UTC>/`); anything not matching is left
  alone for a human.
- Never delete the newest set, even if retention counts say otherwise.
- Log every deletion (set name, bytes reclaimed, timestamp) to
  /opt/ping/releases/retention.log.
- No retention action runs while a restore test is in progress; the script
  uses a lock file at /tmp/ping-backup.lock.

## What retention does NOT cover

- Off-host copies: undefined until Nolan authorizes a destination. When he
  does, the same 7/4/3 ladder applies there.
- The old corrupt 1.1 GB tarball at /opt/ping/ping-oracle-clean-snapshot.tar.gz:
  preserved as-is, excluded from retention, per sprint law.
- Live database rows: append-only trigger stays; retention never deletes
  live data.
