# Oracle Blocker Fix, Track D2 continuation (2026-09-18)

Worker: ORACLE-BLOCKER-FIX. All five Oracle deployment blockers fixed on a fresh
deployment branch. No pushes, no main commits, harvest-12h and forensics worktrees untouched.

## Branch

- Worktree: `/home/nolan/worktrees/ping-oracle-deploy` (new, on the Pig)
- Branch: `oracle/deploy-2026-09-18`, based on local `main` at `5b102c664`
  ("Add canonical project resolver and fix Docker Windows dependency").
  Local main is ahead of `origin/main`; the branch has NO upstream configured (nothing pushed).
- Working tree CLEAN. 7 local commits, all unpushed.

## Commits (full SHAs, oldest first)

1. `c84f42d14932d06a8f18a7e3e76bcfedbde15484` infra(oracle): port canonical compose, drop worker/scheduler per contract
2. `a6e05963f6415c8d71660231c7fc69436e9b65bd` fix(oracle): add H9 gateway Dockerfile (node:20, ARM64 tools, exec CMD)
3. `1c018a0e9bf49b53bac3565aaa44efa34eb5b7a0` fix(oracle): postgres applies schema.sql on first init, fail-closed password
4. `e3337353d72b10fbb44011fdd2d4becf8c081170` fix(oracle): fail-closed POSTGRES_PASSWORD on temporal, gateway, litellm
5. `c42a11482aa1f88e7932ee2753465ebfc0c0cc2b` fix(oracle): gateway build repoint at H9 Dockerfile, pinned image name, host-gateway for Ollama
6. `005d6ee867b1bc52b8378b69a94237667df51fb0` fix: root dev compose no longer hardcodes POSTGRES_PASSWORD
7. `d6d2a474f6a12a46babc3c2e7540e98b675c77f9` fix(oracle): bootstrap defaults to main branch; template notes for image tag and host-gateway

## Files changed

- `infrastructure/oracle/docker-compose.oracle.yml` (B1, B2, B3, B4)
- `infrastructure/oracle/Dockerfile.gateway` (new, B1; single-file port of H9 commit `88e389722` from `sprint/harvest-12h`, read via git object only, worktree untouched)
- `infrastructure/oracle/oracle.env.template` (new, ported; B4 note + `PING_IMAGE_TAG` doc)
- `infrastructure/oracle/bootstrap.sh` (B5)
- `docker-compose.yml` (root dev compose, B2 literal)

## Per-blocker verdicts

### B1: Image builds / compose repoint, FIXED
- Before: gateway service built `dockerfile: gateway/Dockerfile` (node:18-alpine, shell-form CMD). H9's fixed Dockerfile (`infrastructure/oracle/Dockerfile.gateway`: node:20-alpine, python3/make/g++, exec-form `CMD ["node", "server.js"]`, real docker builds exit 0, assertions 7/7) existed only on `sprint/harvest-12h` (commit `88e389722`, NOT in main). Compose repoint unstarted.
- After: Dockerfile.gateway ported into the deployment branch; compose gateway build repointed to `infrastructure/oracle/Dockerfile.gateway` (context `../../` = repo root, matching the Dockerfile's `COPY gateway/` layout); `image: ping-gateway:${PING_IMAGE_TAG:-latest}` pinned for the native Oracle build. Scheduler/worker stay absent per contract (canonical port, commit 1); contract preserved.
- Evidence: `docker compose config` renders `dockerfile: infrastructure/oracle/Dockerfile.gateway` and `image: ping-gateway:latest`.

### B2: Hardcoded POSTGRES_PASSWORD, FIXED (with a correction to the original report)
- Investigation: the oracle compose on main never had literal passwords; all four references were already `${POSTGRES_PASSWORD}` interpolations. The REAL hardcoded literal was root `docker-compose.yml` line 40 (`POSTGRES_PASSWORD=<literal>`, dev "Constitutional Replay Kernel" compose). Track D2's "lines 164 and 46" citation appears to have been a redaction artifact.
- After: every password reference is fail-closed. Oracle compose (postgres, temporal `POSTGRES_PWD`, gateway, litellm `DATABASE_URL`) uses `${POSTGRES_PASSWORD:?<message>}`; the root dev compose literal was replaced with the same fail-closed form. A post-patch sweep confirmed zero remaining literal secret assignments (key names only, no values exfiltrated).
- Evidence: `docker compose config` exit 0 with password set; exit 1 with the message "POSTGRES_PASSWORD is required - set it in the .env file next to this compose file" when unset.

### B3: schema.sql never applied, FIXED and proven
- Before: postgres service had no initdb mount; `infrastructure/oracle/schema.sql` sat unused.
- After: `- ./schema.sql:/docker-entrypoint-initdb.d/01-schema.sql:ro` added to the postgres volumes.
- Evidence: throwaway `postgres:17-alpine` container with the exact mount ran initdb; logs had zero ERROR lines and `information_schema` showed 6 tables created in `public`. Container removed afterwards. (Initdb runs only on first init with an empty `pgdata` volume, which is the fresh-Oracle-VM case.)

### B4: host.docker.internal Ollama default, FIXED
- Before: `OLLAMA_BASE_URL: ${OLLAMA_BASE_URL:-http://host.docker.internal:11434}`; the default does not resolve on Linux Docker, and there was no mapping.
- After: gateway service gets `extra_hosts: ["host.docker.internal:host-gateway"]` (Docker 20.10+), so the default resolves to the host gateway on the Oracle VM; still overridable via `OLLAMA_BASE_URL`. Template documents the mapping and the `PING_IMAGE_TAG` variable.
- Evidence: rendered config shows `host.docker.internal=host-gateway` under extra_hosts.

### B5: bootstrap.sh stale branch default, FIXED
- Before: `PING_BRANCH="${PING_BRANCH:-constitutional-trunk}"` (line 12), a stale branch; clone/checkout would fail or land on the wrong ref.
- After: default is `main`, the deployment source.

### BONUS (Track E): event_governance.js NAMESPACE_RE inline copy, NOT APPLICABLE
- Verified on the deployment source: no `event_governance.js` exists anywhere in the tree, and `NAMESPACE_RE` appears in zero `.js` files (the canonicalization commit `0b946984b` lives on `sprint/harvest-12h`, not in main, and main's `ping-runtime/canonicalization/` does not exist). Nothing to fix; no drift on this source.

## Validation

- `POSTGRES_PASSWORD=dummy-test-value docker compose -f infrastructure/oracle/docker-compose.oracle.yml config` -> exit 0 (Docker Compose v5.1.4). Only warnings: unset `LITELLM_API_KEY` (profile-gated, expected) and obsolete `version` attribute (pre-existing).
- Unset password -> exit 1 with the fail-closed message (proven twice).
- Real initdb run of `schema.sql` on `postgres:17-alpine`: 0 errors, 6 tables.
- No ARM64 image builds were run on the Pig per instructions; Oracle builds natively later.

## What remains (transfer / build phases)

1. Transfer `/home/nolan/worktrees/ping-oracle-deploy` (or the branch) to the Oracle VM; real owner/Nolan call on transport.
2. On Oracle: create `.env` next to the compose file with `POSTGRES_PASSWORD` (and `LITELLM_API_KEY` if the litellm profile is used), then native `docker compose build` / `up -d`.
3. Native ARM64 `docker build` of the gateway image on Oracle was NOT run here (per instructions); H9's x86 build evidence (exit 0, 7/7 assertions) stands, ARM64 build happens on the target.
4. Out of scope, noticed while in there: `infrastructure/oracle/systemd/ping-worker.service` and `ping-scheduler.service` still reference compose services `worker`/`scheduler` that the canonical compose removed, and `bootstrap.sh` step 5 tells the operator to `systemctl start ... ping-worker ping-scheduler`. If the systemd path is the intended deployment path, those units need a decision (parent's call; I left them untouched per the scheduler contract).
5. `CascadeProjects/infra/docker-compose.yml` uses `${POSTGRES_PASSWORD:-crx_dev_password}` (weak default); not the Oracle deployment path, left as-is, flagged here.
