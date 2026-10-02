# LANE 4 - SECURITY POSTURE REVIEW - EVIDENCE ARCHIVE - 2026-09-23

Strictly read-only. No credential/secret value was viewed, stored, copied, or transmitted
at any point. Method: key NAMES, line numbers, perms, counts, value-lengths, and
placeholder-classification only. Two pipeline redactions occurred in transit
(compose values rendered as `<redacted>`); treated as redaction events, not data.
Re-verified with value-free classification afterward.

## F1. CREDENTIAL HYGIENE

### F1a. Literal POSTGRES_PASSWORD in C:\Users\nolan\PING\docker-compose.yml - CONFIRMED
- File: /mnt/c/Users/nolan/PING/docker-compose.yml, line 40, `postgres` service env block
  (lines 37-40: POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD).
- Classification: LITERAL-VALUE-IN-FILE (no ${...} interpolation), value length ~12 chars
  (measured as length metadata only; value redacted in transit, never viewed).
- mtime 2026-09-01. Which DB it belongs to: UNCONFIRMED (presumed stale ping-postgres
  on 5433, per Lane A open question 3 - still open).
- CORRECTION to the "777" framing: /mnt/c is drvfs WITHOUT metadata support
  (verified: chmod 600 on a probe file was silently ignored, probe cleaned up).
  The 777 is a filesystem artifact, not a real permission. Real Windows ACLs
  (icacls, read-only): Pig\nolan:(F), NT AUTHORITY\SYSTEM:(F),
  BUILTIN\Administrators:(F), Pig\CodexSandboxUsers:(RX). So the literal password is
  readable by Nolan, admins, SYSTEM, and any process in CodexSandboxUsers (RX) -
  narrower than "world", still a genuine exposure (sandbox/agent processes can read it).

### F1b. C:\Users\nolan\PING\.env "777" - CONFIRMED as stated, severity DOWNGRADED
- Same drvfs artifact applies; real ACL identical to above (Nolan/SYSTEM/Admins F,
  CodexSandboxUsers RX).
- Content: 0 active assignments, 7 commented template lines (CRLF). No live secrets.
  Risk is future misuse (a world-writable-looking file invites later credential drops),
  not current exposure.

### F1c. /home/nolan/ping-gateway-src/gateway/.env.muse 755 - CONFIRMED, sharpest file-perm finding
- Real ext4 perms (not drvfs): 755, nolan:nolan, mtime 2026-09-11.
- 2 ACTIVE assignments: MUSE_LEVEL_1_KEY, MUSE_LEVEL_2_KEY. World-readable live keys.

### F1d. ping-vault dev mode - CONFIRMED not a secret store
- `docker inspect` Cmd: `server -dev`. Env names include VAULT_DEV_ROOT_TOKEN_ID.
- Logs: 32 lines matching 'root token', 24 matching 'unseal key' (counts only).
- Dev-mode Vault is unsealed by definition and prints its root token at startup.

### F1e. MUSE key ownership/rotation - UNKNOWN (still open)
- No owner, no rotation record found. .env.muse mtime 2026-09-11 (no rotation since).
- NEW - semantics RESOLVED from source (was Lane A open question 1/2):
  /home/nolan/ping-gateway-src/gateway/exterior_auth_middleware.js lines 80-120:
  `const museKey = process.env.MUSE_LEVEL_1_KEY || this._generateApiKey();`
  `const museLevel2Key = process.env.MUSE_LEVEL_2_KEY || this._generateApiKey();`
  with 'environment' vs 'generated' source tracking. These ARE the gateway API auth keys.
  Mission rows show originator=api:muse-level-2, consistent.

### F1f. Broad env scoping on ping-qdrant - CONFIRMED
- Secret-ish env names: GITHUB_APP_PRIVATE_KEY_PATH, GITHUB_APP_WEBHOOK_SECRET,
  GOOGLE_CREDENTIALS, GOOGLE_TOKEN, HF_TOKEN, HUGGINGFACE_HUB_TOKEN, POSTGRES_PASSWORD,
  QDRANT_API_KEY, QDRANT__SERVICE__API_KEY. Container is unhealthy/unused (dormant),
  but the shared-env-injection pattern stands. (open-webui's OPENAI_API_KEY /
  WEBUI_SECRET_KEY are correctly scoped to that container.)

### F1g. Duplicated .env on Oracle - CONFIRMED
- /opt/ping/.env and /opt/ping/infrastructure/oracle/.env: identical 10-key sets,
  both 600 ubuntu:ubuntu. Drift bait.
- .env.bak-20260921-p0rotate (mtime 2026-09-17) and .env.bak-20260917 (mtime 2026-09-15):
  names do not match mtimes; stale password copies accumulating.

### F1h. /opt/ping/gateway/root_private_key.pem 664 - CONFIRMED (122 bytes, ubuntu:ubuntu)

### F1i. NEW - compose.yaml for the running "ping" project is MISSING from disk
- `docker compose ls`: project "ping" running(3), config C:\Users\nolan\PING\compose.yaml.
- `ls` + `find` on /mnt/c/Users/nolan/PING: no compose.yaml/compose.yml anywhere.
  (Only docker-compose.yml, 2026-09-01, exists.)
- The containers (qdrant/redis/vault) keep running, but `docker compose` cannot
  recreate or reconfigure them. Recovery/durability gap.

## F2. BACKUP (durability = Lane 3; security angles only)
- No verified backup of live brain-postgres/ping_runtime: CONFIRMED (no backup files
  in the data dir; only unverified pg_dump.sql copies inside repos).
- NEW security angle: /opt/ping/releases/pgdata-backup-2026-09-16.sql.gz is 664
  (group/other-readable) and UNENCRYPTED (gzip, not encryption). Any local user on the
  Oracle host can read the full DB dump. Same 664 on the source tarball.
- F1i compounds recovery risk for the Pig aux services.

## F3. UNKNOWN PROBER on Oracle PG - exact lines pulled
```
2026-09-21 11:46:43.969 UTC [929]   FATAL:  database "ping" does not exist
2026-09-21 11:46:47.590 UTC [936]   FATAL:  database "ping" does not exist
2026-09-21 12:00:34.485 UTC [1616]  FATAL:  role "postgres" does not exist
2026-09-21 12:00:34.532 UTC [1623]  FATAL:  role "postgres" does not exist
2026-09-21 12:00:34.582 UTC [1629]  FATAL:  role "postgres" does not exist
2026-09-21 12:01:03.928 UTC [1693]  FATAL:  password authentication failed for user "ping"
2026-09-22 14:02:50.178 UTC [70821] FATAL:  database "ping" does not exist
2026-09-22 14:03:03.842 UTC [70836] FATAL:  role "postgres" does not exist
2026-09-22 16:03:37.106 UTC [76228] FATAL:  database "ping" does not exist
2026-09-22 16:03:37.161 UTC [76234] FATAL:  database "ping" does not exist
2026-09-22 16:36:07.440 UTC [77699] FATAL:  database "ping" does not exist
2026-09-22 16:39:52.640 UTC [77864] FATAL:  database "ping" does not exist
2026-09-22 16:55:57.110 UTC [78580] FATAL:  database "ping" does not exist
```
- Count note: coordinator said "13 FATAL lines on 2026-09-22". I found 13 total in the
  9/21-9/23 window: 6 on 9/21, 7 on 9/22. Discrepancy reported honestly; the 9/21
  cluster (incl. the password-failed line, which Lane A did not list) is new context.
- Source IP: UNKNOWABLE from current logs. log_connections=off, log_disconnections=off,
  log_line_prefix='%m [%p]' (no %h). Zero "connection received" lines in window.
- pg_hba (read-only, unchanged): local + 127.0.0.1/32 + ::1 = trust (all DBs/users);
  everything else = scram-sha-256. Same on brain-postgres (PG-001 confirmed both planes).
- Inference: the password-failed attempt (user "ping", correct username, wrong password)
  MUST have come via non-loopback (else trust would have skipped password auth) - i.e.,
  from a container on the bridge network during the deploy window (11:24Z .env rotation,
  11:25-12:05Z container swap). The wrong-db/role attempts are "guess the obvious"
  (db "ping", role "postgres") from the host shell, where trust would have admitted them
  had they named the real db/user (crx_runtime/ping).
- Assessment: MISCONFIGURED CLIENT / human guessing defaults, NOT an external scanner.
  PG binds 127.0.0.1:5432 only (ss-confirmed); no password-spray pattern; attempts die
  at db/role lookup. 9/21 cluster aligns with deploy-window churn; 9/22 cluster
  (7 attempts over ~3h, 08:02-10:55 MDT) looks like intermittent manual guesses.
  Confidence: high it is not external; moderate on human-vs-script. No evidence of
  data access. No action taken (no pg_hba change, no blocks).

## F4. ORCA WATCH CRON - confirmed ABSENT (deferred = true)
- Pig WSL: no crontab; /etc/cron.d only e2scrub_all; systemd timers all stock.
- Oracle: no crontabs dir; /etc/cron.d only e2scrub_all; timers stock + OCI monitoring.
- Muse scheduler cron.list (incl. disabled): no orca job among 40+ schedules.

## SWEEP (a) - secret flows into agent execution; Lane A REUSE verdict pressure-test
Flows (names only): .env.muse (755) -> container env at creation -> gateway process;
MUSE keys = gateway API auth (exterior_auth_middleware); tandem emit-observation
resolves its bearer token at runtime from container env, never stored (good);
oracle-ssh.sh documents never-pass-secrets-as-args (good).
Leakage probes (all counts, no values):
- Pig gateway logs (tail 5000): 0 key assignments, 0 provider-key patterns.
- Oracle gateway logs (tail 3000): 0 / 0.
- brain-postgres ping_missions + ping_events JSON: 0 secret-assignment rows.
- Gateway-mounted workspace volume (/app/workspace/muse): 0 files with key assignments.
- ~/workspace assignment scan: hits only in this lane's own probe script.
- ~/workspace provider-key scan: only upstream crewai test fixtures + probe script.
- Memory files mention key NAMES only (no assignments found workspace-wide).
VERDICT: AGREE with Lane A REUSE. Evidence supports "no active leak; current handling
sufficient for a worker plane that grants workers no secrets." A new secrets platform
would fix neither perms, nor committed defaults, nor missing authz. The fix list is
hygiene + ownership + two posture items below (Oracle gateway auth; committed defaults).

## SWEEP (b) - secrets in repos
- piging2/fyd @ a69bb68f (a69bb68fc84620a5635e071030cf49a633df7394, 2026-09-23,
  "Gate owner mutation behind demo-owner-mode"): CLEAN. No provider-key patterns, no
  credential assignments outside docs/examples, no .pem/.key/.p12/.pfx in tree, only
  .env.example tracked, no real .env in any git history, no .github/workflows at all,
  no gitleaks/trufflehog/husky hooks.
- FYD-relevant paths in crx-runtime (tools/fyd-site-projection/dump.py): hits are
  env-PARSING code (startswith checks), benign.
- OUT OF SCOPE but observed (ngesk2/crx-runtime, HEAD):
  * compose.yaml:176: literal POSTGRES_PASSWORD set to an 8-char conventional default
    (the username itself) in a service environment block. Dev default, committed.
  * .env.base (tracked): 8-char weak POSTGRES_PASSWORD default; referenced as env_file
    by 5 compose files (compose.yaml, brainos/* x3, newsletter). Overridden by
    `environment:` entries where present (compose interpolates the rest), but any
    compose file relying on env_file alone would deploy with the weak default.
  * app_container.py, brainos/.../mission_control/app.py: os.getenv reads (benign).
  * .env.mission-control: placeholder (benign). .env.qdrant: empty value (benign).
  * brainos/newsletter doc: 10-char placeholder tokens (benign).
  * SECRET_AUDIT_REPORT.json (x2): audit metadata, benign.
- Pre-deploy secret scan scope: it is Nolan's push-discipline step executed by the
  agent at push time (memory 2026-09-22/23: "secret scan CLEAN" as checkpoint item),
  NOT a repo artifact or CI gate. Covers the FYD working tree at push. Does NOT cover
  crx-runtime, Vercel env vars, or live planes.

## SWEEP (c) - Vercel deploy path enforceability
- vercel.json: no secrets (only SHARP_IGNORE_GLOBAL_LIBVIPS).
- API visibility: GET /v9/projects -> 0 projects; GET /v2/teams -> 403. The connected
  custom.vercel credential cannot see any FYD Vercel project: current Vercel env
  contents are UNAUDITABLE from here, and no API-based guardrail can be built on it.
- Enforcement today: NONE structural. The rule (no Postgres creds, signing keys, Pig
  creds, gateway secrets, provider tokens in Vercel env) lives in Nolan's push
  discipline + agent diligence. No CI, no env-allowlist check, no pre-deploy script
  in package.json (scripts: build, dev, lint, qa:images, reconcile:hashes, start,
  test, ... - no secret scan).
- What would make it enforceable: (1) a Vercel-team-scoped read token for scheduled
  allowlist-diff audits of /v9/projects/{id}/env; (2) a repo-side pre-deploy guard
  script failing on denylisted key names (needs the team token); (3) minimum: a
  checked-in VERCEL_ENV_ALLOWLIST.md so the push-time scan is machine-checkable.

## SWEEP (d) - prober: see F3.

## EXPLOITABILITY SUMMARY (who can reach what)
- Pig (Nolan's machine): CodexSandboxUsers (RX) can READ the literal PG password from
  docker-compose.yml and the live MUSE keys from .env.muse (755). brain-postgres is
  published 0.0.0.0:5432 (LAN-reachable; password is the only control) AND
  trust-on-loopback (any local process = full DB, no password). Gateway 0.0.0.0:8080
  with MUSE-key auth (middleware present).
- Oracle: PG 127.0.0.1:5432, qdrant 127.0.0.1:6333, gateway 127.0.0.1:8080
  (ss-confirmed; no remote path without host compromise). pg_hba trust on loopback =
  host-local process = full DB. NEW: gateway API has NO auth middleware in the
  deployed image (exterior_auth_middleware.js absent; /health and /events return 200
  with no credentials and with a bogus bearer key). Loopback binding is the ONLY
  control on the Oracle gateway API. Divergent posture vs the Pig gateway (key-authed).
- Backups: Oracle pgdata-backup-2026-09-16.sql.gz is 664 + unencrypted; any local
  Oracle user can read the full dump.
