# PING Backup Naming Convention (proposal)

Problem the current set shows: artifacts are dated 2026-09-16 but were
created 2026-09-17T02:26:35Z. A reviewer cannot tell whether the date is the
backup's content date, creation date, or local vs UTC.

## Proposed convention

All dates are UTC at creation time, format YYYYMMDDTHHMMSSZ. All names are
lowercase, dash-separated, no spaces.

- Postgres: `pgdata-backup-<UTC>.sql.gz`
  Example: `pgdata-backup-20260917T022635Z.sql.gz`
- Qdrant snapshots: `qdrant-snapshots-<UTC>/` directory, containing the
  snapshot files as produced by Qdrant (`<collection>-<collection>-<id>-<ts>.snapshot`).
  Do not rename Qdrant's own files; the directory carries the convention.
- Source tree: `ping-source-clean-<UTC>.tar.gz`
- Restore guide: `RESTORE-<UTC>.md`
- Checksum manifest: `CHECKSUMS-<UTC>.sha256`, produced with
  `sha256sum <artifacts> > CHECKSUMS-<UTC>.sha256` immediately after creation.

## Placement

One directory per backup set: `/opt/ping/releases/<UTC>/` containing all
artifacts plus the restore guide and checksum manifest. The current flat
layout (`/opt/ping/releases/*.sql.gz` next to dated dirs) should migrate to
this on the next authorized backup run.

## Companion metadata

Each set directory gets a `MANIFEST.json` with: utc_created, host, artifacts
(name, bytes, sha256), live counts at backup time (ping_events,
ping_missions, table count, qdrant points per collection), pg_dump flags,
qdrant version, and the operator (human or cron name). This is the
machine-readable form of what BACKUP_MANIFEST.md is today in prose.

## Constraints this convention must respect

- Never include credentials, .env files, *.key, *secret*, *credential*,
  *.bak in the source tarball (case-insensitive audit before finalizing,
  as Agent F did).
- pg_dump flags stay `--no-owner --no-acl` so restores do not depend on
  live role names.
- Dates never use local time, so MDT/MST changes cannot create ambiguity.
