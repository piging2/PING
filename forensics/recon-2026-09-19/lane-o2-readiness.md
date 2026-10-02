# LANE-O (second pass): Oracle Readiness Forensics, 2026-09-19
**Lane:** O | **Mode:** read-only, environment-only. NO install, NO deploy, NO host mutation, NO secret reads (no private key material accessed; one probe output carried a live credential in passing, its value is recorded nowhere in this file).
**Method:** read-only SSH probes via pigwsl-run.sh (BatchMode, short scripts), plus local Pig WSL git checks. Starting point: lane-o-oracle-gates.md (Phase 1); key facts re-verified live 2026-09-19 ~19:30 MDT.

## SSH
REACHABLE. `ssh -o BatchMode=yes -o ConnectTimeout=12 ubuntu@129.146.60.17`, key auth, sudo NOPASSWD confirmed (earlier pass), no password prompts.

## ARM64
CLEAR. aarch64, Neoverse-N1 (OCI Ampere class), Ubuntu 24.04 kernel 6.17.0-1020-oracle. Live empirical proof this pass: postgres:17-alpine, qdrant/qdrant:v1.7.0, and a node 20-alpine-based gateway image all run healthy on arm64 on this host. Phase 1 Docker Hub v2 API checks (postgres:15-alpine, node:24-alpine, python:3-alpine, python:3.11-slim, alpine:latest, redis:7-alpine, qdrant/qdrant, hashicorp/vault, ollama/ollama, temporalio/auto-setup) all arm64 READY; still valid, not re-fetched this pass. No amd64-only image in either the live or the planned path. /dev/nvidia* absent: GPU-less, unchanged.

## HOST
- hostname ping-core-01, 5.8Gi RAM (756Mi used with the live stack running, 5.0Gi available), / 45G total, 19G used, 26G free (42%), uptime 3 days.
- Docker 29.1.3 (build 29.1.3-0ubuntu3~24.04.2), Compose 2.40.3 plugin, git 2.43.0.
- Provenance of the "unexpected" presence (this was Phase 1 item 8, now closed): all three came from official Ubuntu 24.04 apt packages (docker.io, docker-compose-v2, git) installed 2026-09-15 03:56 UTC per apt history.log and file birth times. Legitimate package install, not a hand-drop; who invoked apt is not recorded, but the source is the Ubuntu archive.
- Docker/Git reliability bar unchanged: presence on the box is not trust in their outputs; the deployment uses them only as transport.

## Live state found on the host (major new fact vs Phase 1)
A live Oracle deployment exists on the host, NOT authored by this lane and not in the Phase 1 plan:
- 3 containers, all Up and healthy: ping-gateway (oracle-gateway, 36h), ping-postgres (postgres:17-alpine, 38h), ping-qdrant (qdrant/qdrant:v1.7.0, 47h). Compose project `oracle`, network `oracle_ping_internal` (172.20.0.0/16).
- Config path (from compose labels): /opt/ping/releases/bce92787b0da631ed9218e2255607562c9dff731/ping-oracle-clean-snapshot/infrastructure/oracle/docker-compose.oracle.yml. Environment file /opt/ping/.env, permissions 0600 ubuntu:ubuntu (correct).
- Gateway image oracle-gateway: digest sha256:8400deecf2a93be276339492b71ebb2ea2a768b565b0d0752a2dd2fe005e48c5, arm64, built 2026-09-17T12:59Z, node 20.20.2 base, Args [node, gateway/server.js]. This is the earlier snapshot pipeline (ping-oracle-clean-snapshot), NOT the constitutional-convergence-v2 compose.
- Backups present: /opt/ping/releases/RESTORE-2026-09-16.md, pgdata-backup-2026-09-16.sql.gz, qdrant-snapshots-2026-09-16/, ping-source-clean-2026-09-16.tar.gz.
- This live stack owns ports 8080/5432/6333, volumes oracle_pgdata and oracle_qdrant_storage, and the compose project name `oracle`. Any deployment of the certified convergence path must account for coexistence; see BLOCKER.

## MINIMUM STACK
Confirmed as defined in Phase 1 section 6, with one change forced by the live state: M0 = postgres + gateway + worker-runtime + redis. Empirical this pass: postgres:17-alpine and qdrant:v1.7.0 are arm64-fine live, so the plan may also pin postgres:17-alpine (matches live precedent) or 15-alpine (matches repo compose); recommend matching the certified compose and the certified SHA's schema pin, not the incidental live stack. Phases M0/M1/M2 and the deferral list (Temporal, Neo4j, ClickHouse, NATS, ollama until proven need, ui-next last) stand.
- Repo state check (Pig WSL): HEAD still 84da2d40c9dae3c4f7c6070845e073b1471d245a, same as Phase 1. DIRTY TREE: modified CERTIFICATION.md, CONTRADICTIONS.md, evals/constitutional-runtime/EVAL-006_double_completion_prevention.js; untracked evidence/ and tests/mc1-legacy-ingress/. A certified deployment must record dirty_tree=true or pin a clean SHA; deploying a dirty tree silently is forbidden.
- The two Phase 1 native-dependency blockers STAND in the repo tree: gateway/package.json still pins tree-sitter ^0.21.1 (no linux-arm64 prebuild; gateway/Dockerfile still lacks a toolchain) and @temporalio/* still present (glibc-linked core-bridge on musl Alpine). Workaround choices W1/W1 from Phase 1 are still the recommended remediations and are NOT yet applied. Note: the LIVE oracle-gateway image (node 20 base) sidestepped these in some way outside this lane's knowledge; do not assume the live image's build recipe is the certified recipe.

## IMAGE GATES
Minimum stack: postgres:15-alpine arm64 READY; node:24-alpine arm64 READY; python:3-alpine arm64 READY; redis:7-alpine arm64 READY (all Docker Hub API-verified Phase 1). Deferred set: python:3.11-slim READY; qdrant/qdrant latest/v1.7.0 arm64 READY (v1.7.0 empirically healthy on host); hashicorp/vault READY (no linux/musl concern for the image itself); ollama/ollama latest arm64 READY, CPU-only (no nvidia device on host, nvidia reservation must be dropped); temporalio/auto-setup arm64 READY (brain profile only; NOT in M0). Live host adds empirical proof for: postgres:17-alpine, qdrant:v1.7.0, node:20-alpine (all healthy arm64). Blockers are build-time (tree-sitter, temporalio musl), not image-availability.

## MEMORY BUDGET
Empirical, live, this pass (docker stats): ping-gateway 135.2MiB, ping-postgres 47.1MiB, ping-qdrant 22.1MiB = ~205MiB total for the three live services. Host: 5.8Gi total, 756Mi used, 5.0Gi available.
- M0 estimate: postgres ~200MB (worst case, observed 47), gateway ~500MB (worst case, observed 135), worker-runtime ~60MB, redis ~30MB. Sum worst case ~800MB, observed equivalent ~225MB. Either way far under budget.
- M1 adds witness/replay/projection workers (~60MB each, same stdlib pattern). M2 adds qdrant (observed 22MB), mission-control (python:3.11-slim, ~200-400MB worst case). Everything through M2 stays under ~1.5GB worst case.
- Challenge every dependency: ollama (~2.7GB image, multi-GB model) and a 14b default model are EXCLUDED from the budget until an AI route is actually exercised; Temporal excluded; the full compose.yaml service set is not the plan. Conclusion: memory is not the constraint; the discipline is.

## DISK BUDGET
- / 45G total, 19G used, 26G free. `docker system df`: images 8.85GB total with 6.73GB reclaimable (unused images: oci-cli 1.33GB, node:24-alpine 232MB, temporalio/auto-setup 1.24GB, plus dangling), build cache 5.17GB (2.93GB reclaimable), volumes 138.6MB. Note: none of this reclaim was executed (read-only pass).
- M0 fresh-image estimate: postgres:15-alpine ~300MB, gateway on node:24-alpine ~232MB base plus app layers (live oracle-gateway 1.87GB is the old snapshot build; a fresh build-base build will differ), python:3-alpine ~50MB, redis:7-alpine ~40MB. Total new pull/build ~1-3GB. Existing 26G free plus ~6.7GB reclaimable gives ample headroom. No disk risk for the minimum stack.

## NETWORK
- All service ports bind 127.0.0.1 only: 8080 (gateway), 5432 (postgres), 6333/6334 (qdrant). iptables INPUT: default ACCEPT with RELATED/ESTABLISHED allow, tcp/22 NEW allowed, final REJECT all; ufw is NOT installed (command not found). Public ingress is effectively closed at the port-binding layer, not at the firewall: there is no packet filter default-deny (iptables policy is ACCEPT). Risk is low today because nothing listens on 0.0.0.0 except 22 and rpcbind (111); a future service publishing 0.0.0.0 would be exposed. Pre-deploy runbook item: verify no 0.0.0.0 publish, or set a default-deny.
- Compose topology (Oracle slice): services on dedicated bridge `oracle_ping_internal`; inter-service via DNS names (postgres, qdrant, gateway). No docker.sock mounts observed in the live gateway inspect (Mounts empty, good). No public ports except where the operator explicitly approves.

## PERSISTENCE
Live precedent on the host: named volumes oracle_pgdata (postgres) and oracle_qdrant_storage (qdrant), 138.6MB used across volumes, surviving 36-47h of uptime. Minimum-stack requirement: named volumes pinned in the Oracle compose for postgres data (and qdrant storage when M2 activates); never anonymous volumes, never host-path binds for data. Verify volume ownership/permissions at deploy time; record volume names in the provenance manifest.

## BACKUP
Existing mechanism on the host (designed and previously executed by another lane, not executed by this lane): pg_dump --no-owner --no-acl gzipped (2026-09-16 set: 160927 bytes, sha256 10e315c3ef2570e210149db95b6f57ad4268b6b6a4816d37764a9bc40875d8f51e, 31 public tables, ping_events=1158, ping_missions=222); qdrant collection snapshots (knowledge collection, 13 points); source tarball ping-source-clean-2026-09-16.tar.gz (sha256 recorded, 2902 entries, scrubbed of .env/secret/credential/.key/.bak by listing check). All artifacts in /opt/ping/releases/. This is a proven pattern to reuse, not reinvent.

## RESTORE
Designed and documented on the host in /opt/ping/releases/RESTORE-2026-09-16.md (read read-only this pass; no secrets recorded in it): every restore path is ISOLATED, never into live targets. Procedures: pg restore into a temp volume + temp postgres:17-alpine container on 127.0.0.1:15433 with generated credentials, then verify table/row counts; qdrant restore into a temp container on 127.0.0.1:16333 via snapshots/recover API, then verify point count; source restore extracts to /tmp and diffs, never overlays live paths, and .env is recreated from the canonical oracle.env.template plus live on-box values. The restore guide names explicit isolation invariants (never restore into live ports 5432/6333/8080, live volumes, or live container names). Status: design PROVEN by documentation and prior execution; this lane did not re-execute anything.

## BLOCKER
1. Coexistence with the live Oracle stack. The host already runs a healthy compose project `oracle` (gateway on 8080, postgres on 5432, qdrant on 6333; volumes oracle_pgdata, oracle_qdrant_storage). Deploying the certified convergence minimum stack as-is would collide on ports, project name, and possibly volume names. Options: (a) retire the live stack first after backup verification (needs operator decision; the live stack is not certified work and its owner is unclear), or (b) deploy the new stack on distinct ports/volumes/project name (safer, but two postgreses and two gateways complicate the ladder evidence). This needs an operator decision before Phase 2.
2. Upstream certification: the two native-dependency blockers (tree-sitter no linux-arm64 prebuild on Alpine without toolchain; @temporalio/* glibc binary on musl) are UNREMEDIATED in the repo tree, and the tree is DIRTY. Nothing deploys until certification clears the remediation choice and pins a clean SHA.
3. Secrets path: unresolved (Phase 1 item 10). How Postgres credentials and API keys reach the host and how the operator approves them is still open. The live stack used /opt/ping/.env (0600); the certified path must not copy the live credential.

## NEXT MUTATION (prepared, not executed)
Install gate NOT crossed. When authorized (SSH VERIFIED + ARM64 gates pass + minimum stack defined + persistence path defined + backup/rollback plan defined + no upstream blocker), the first mutation sequence is: (1) decide coexistence per BLOCKER 1; (2) apply the tree-sitter/temporal remediations to the gateway build (Phase 1 W1/W1); (3) transfer the certified source (tarball or git archive of the certified SHA, sha256-recorded) to the host; (4) write the provenance manifest (template in Phase 1 section 5) with source SHA, digests, config/schema/event/witness eras; (5) `docker compose -p oracle-conv up -d` (distinct project name if coexistence demands it) with the minimum stack only; (6) run the health probes (gateway /health, qdrant /readyz, pg_isready) and claim DEPLOYMENT_READY only on green evidence; (7) verify the backup job writes a fresh set before any data-dependent stage.
