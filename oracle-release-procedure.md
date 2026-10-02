# Oracle Release Procedure (Sustainable, 2026-09-20)

This encodes the proven mechanism from the 84486f056 promotion. It is not a new framework. It is the smallest sustainable version of what actually worked.

## Principle

SOURCE GREEN is not DISTRIBUTION GREEN is not BUILD GREEN is not RUNTIME GREEN is not RESTART GREEN.
Certification advances only through actual evidence.

## Steps

### 1. EXACT SOURCE

- Repo: /home/nolan/ping (via Pig WSL bridge, never direct cloud mutation)
- Record: branch, HEAD SHA, `git status --porcelain`, `git worktree list`
- Rules: explicit staging only, never `git add -A`, never sweep unrelated WIP
- Tag candidate as `ping-gateway:<short-sha>-arm64`, never reuse a prior candidate tag

### 2. ISOLATED PUBLIC-PULL CONFIG

Problem: normal Docker config uses `credsStore: desktop.exe` which fails on Pig WSL with "A specified logon session does not exist."

Mechanism (preserve this, do not weaken credentials):

- Create isolated config dir: `/tmp/docker-isolated/config.json` containing `{}`
- Do not modify or delete the stored Docker credential configuration
- Use for anonymous pulls of public base images only: `DOCKER_CONFIG=/tmp/docker-isolated`
- Proven: `node:18-alpine` pull digest `sha256:8d6421d663b4c28fd3ebc498332f249011d118945588d0a35cb9bc4b8ca09d9e`

This removes the need for Nolan to nurse Docker credentials for future releases.

### 3. DISTRIBUTION CLOSURE

Before building, verify the build context contains the runtime closure:

- `/app/gateway`
- `/app/ping-runtime`
- `/app/runtime`
- `infrastructure/physical_clock_adapter.js`
- `GENERATION_MANIFEST.yaml`
- `database/` SQL files

Failure classes this catches: FL-016 (native build dependency), FL-017 (missing adapter), FL-019 (missing manifest), FL-020 (missing SQL), FL-021 (JSONB assumption). Prefer one general closure check over five special scripts.

### 4. ARM64 BUILD

Via Pig bridge (`~/workspace/pig/pigwsl-run.sh`, never via `pigwsl-run.sh` wrapper confusion; use `~/workspace/pig-fb/oracle-ssh.sh` for Oracle):

```
cd /home/nolan/ping && DOCKER_CONFIG=/tmp/docker-isolated docker buildx build --platform linux/arm64 -f infrastructure/oracle/Dockerfile.gateway -t ping-gateway:<short-sha>-arm64 --load .
```

Record build output tail, especially npm vulnerabilities and native module results.

### 5. IMAGE ID / DIGEST

- Record `docker images --no-trunc` image ID (sha256)
- Record buildx manifest list digest from build output
- Example (84486f056): image ID `sha256:467af2dabc081dd09a8f26560ab8320073320005030bd3767afa8b40eadd970e`

### 6. CERTIFICATION

Run against the actual built artifact and live Oracle:

- Gate B: distribution closure present, module resolution works
- Gate I: ARM64 image runs
- Gate J: source SHA plus image ID plus build host recorded (provenance, not just digest)
- P0: null pool fails closed, exact duplicate idempotent, same-ID collision fails closed

Do not promote on SOURCE GREEN alone.

### 7. ORACLE PROMOTION

- `docker save ping-gateway:<short-sha>-arm64 -o /tmp/ping-gateway-<short-sha>-arm64.tar`
- `scp -o ConnectTimeout=20 /tmp/ping-gateway-<short-sha>-arm64.tar oracle:/tmp/` (Oracle at 129.146.60.17 via `~/workspace/pig-fb/oracle-ssh.sh`)
- On Oracle: `docker load -i /tmp/ping-gateway-<short-sha>-arm64.tar`
- Swap: stop and rename current `ping-gateway` to `ping-gateway-rollback-<short>`, start new as `ping-gateway` with tag `ping-gateway:candidate-<short-sha>`
- Preserve rollback image `8400deecf2a9` untouched, plus stopped rollback containers

### 8. RUNTIME PROOF

- `GET /health` returns healthy
- `event_runtime` healthy
- PostgreSQL running, Qdrant healthy
- Write canonical event, read back from `ping_events`
- Exact duplicate returns ok, row count remains 1

### 9. RESTART PROOF

- Controlled `docker restart ping-gateway`
- Returns to healthy without manual intervention
- Record restart count and logs

## What not to do

- Do not reuse `candidate-84486f056` for another build
- Do not mutate the promoted image
- Do not debug by accumulating speculative changes directly on Oracle
- If candidate fails: PRESERVE EVIDENCE -> ROLLBACK -> FIX OFFLINE -> RECERTIFY

## Machine-specific assumptions removed

- Oracle IP and SSH path via `~/workspace/pig-fb/oracle-ssh.sh`, not hardcoded in multiple places
- Pig WSL bridge via `~/workspace/pig/pigwsl-run.sh` with `< /dev/null` for stdin safety
- Isolated Docker config path is a variable, not a one-off /tmp hack (still /tmp but documented)

Future work: encode steps 3 and 6 as one general distribution/runtime certifier reusing existing test infra, not five special-case scripts.
