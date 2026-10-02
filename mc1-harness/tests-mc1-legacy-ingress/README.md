# MC-1 LegacyIngressAdapter certification harness

Reproducible preservation of the 2026-09-18 MC-1 certification
("LegacyIngressAdapter repair; certify ingress to `ping_events`").

## What it proves

A legacy ingress row in `canonical_events` is carried by
`LegacyIngressAdapter` through `UnifiedEventRuntime.emit()` into `ping_events`,
with:

- durable ingress↔canonical correlation (forward and reverse),
- provenance preservation (original event id, source, timestamp, metadata,
  sequence, tenant, claimed actor, event version, causation, correlation),
- tenant namespace handling (`tenant::<id>`, `core::system` fallback,
  fail-closed on malformed tenants),
- explicit allowlist + default-deny capability behavior
  (registered types take the normal path; unknown/unsafe callers fail closed
  loudly; boolean bypass flags grant nothing; forged capabilities rejected),
- deterministic rejection of unprocessable rows (F7 depth vector),
  retryable transient failures, no head-of-line blocking, no cursor state,
  idempotent re-poll, and reconciled state counts.

The suite makes **85 assertions** (IDs `MC1-001`..`MC1-085`), grouped:

| Group | Coverage |
|---|---|
| T1 | happy path: 3 rows, provenance, tenant, forward/reverse correlation |
| T2 | idempotent re-poll (no duplicates, no cursor) |
| T3 | deterministic rejection (70-deep payload), no silent loss, no head-of-line block |
| T3b | transient failure → RETRYABLE → RETRY_EXHAUSTED, exactly one canonical row |
| T4 | 5 rows across 3 fresh adapter instances, no cursor table |
| T5a | direct `emit()` of an unregistered type rejected, nothing persisted |
| T5b | registered type accepted via the normal (no-exception) path |
| T5c | boolean bypass flags grant nothing; forged capability rejected; genuine capability grants the narrow exception |
| T5d | adapter without the capability fails closed (default-deny) |
| T6 | malformed tenant rejected, never silently collapsed |
| T7 | state counts reconcile; stats shape |

## Prerequisites

- Node.js (recorded version on the original run: __NODE_VERSION_TBD__; plain
  node, no build step). Check with `node --version`.
- The `pg` npm package resolvable by node (`npm install pg` in a scratch
  dir, or `NODE_PATH` pointing at a directory containing `pg`).
- A reachable PostgreSQL. Defaults assume `localhost:5433` (the port used
  for the original certification, production PG sits on 5432 there).
- A role with `CREATEDB` for setup/teardown. The suite itself runs as
  `MC1_PGUSER`, which may be an unprivileged role.

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `MC1_PGHOST` | `localhost` | Postgres host |
| `MC1_PGPORT` | `5433` | Postgres port |
| `MC1_DBNAME` | `mc1_legacy_ingress_scratch` | scratch database name |
| `MC1_SETUP_USER` | `$MC1_PGUSER` | role used for `createdb`/schema/grants (needs `CREATEDB`) |
| `MC1_SETUP_PASSWORD` | `$PGPASSWORD` | password for the setup role |
| `MC1_PGUSER` | `$MC1_SETUP_USER` | role the suite runs as (may be unprivileged) |
| `MC1_PGPASSWORD` | `$PGPASSWORD` | password for the suite role |

No credentials are stored in this directory. Passwords travel only via
environment variables (never written to disk by these scripts).

## Run it

```sh
cd tests/mc1-legacy-ingress

# 1. Configure (example: two roles, mirroring the original certification)
export MC1_PGHOST=localhost MC1_PGPORT=5433
export MC1_SETUP_USER=postgres MC1_PGUSER=mc1_cert MC1_DBNAME=mc1_legacy_ingress_scratch
read -rsp 'postgres password: ' MC1_SETUP_PASSWORD; export MC1_SETUP_PASSWORD; echo
read -rsp 'mc1_cert password: ' MC1_PGPASSWORD; export MC1_PGPASSWORD; echo

# 2. Provision fresh state (creates scratch DB, applies schema, grants rights)
./setup.sh

# 3. Run the assertion suite
node run-cert.js

# 4. Remove all scratch state
./teardown.sh
```

Expected output ends with:

```
CERT_PASS 85 assertions
```

and teardown ends with:

```
TEARDOWN_OK: scratch database 'mc1_legacy_ingress_scratch' is gone.
```

Any failure prints `FAIL MC1-<nnn>: <name> — <detail>` and exits non-zero;
a harness-level crash prints `CERT_FAIL` with the error.

## Files

- `run-cert.js` — the 85-assertion suite (plain node, `assert` + `crypto` +
  `pg`). Resolves the repo root from its own location; all PG config is
  env-driven.
- `schema.sql` — `canonical_events` DDL (the ingress surface). Verbatim from
  the attested 2026-09-18 run.
- `setup.sh` — creates the scratch DB, applies `schema.sql`, grants the
  suite role rights (including on tables `runtime.initialize()` creates later).
- `teardown.sh` — drops the scratch DB and verifies absence.
- `README.md` — this file.

## Provenance and limits

Reconstructed 2026-09-18 from the original certification script
(`~/workspace/mc1-evidence/02-mc1-cert.js`), which was attested 85/85 against
a scratch database on the same day and then deleted with its database, role,
and temporary scripts. The assertion sequence is unchanged; hardcoded paths
and credentials were replaced with repo-relative resolution and env config.

This harness re-proves the *behavior* of the adapter code in the working
tree. It does not certify production data, and it must not be pointed at
production: setup/teardown only ever touch `MC1_DBNAME`.
