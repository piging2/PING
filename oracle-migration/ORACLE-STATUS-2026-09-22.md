# Oracle Migration — Status 2026-09-22 (~16:35–17:15 UTC)

## What was "critical"
- **Disk pressure (the recurring theme):** Oracle was at **80%** (36G/45G, 8.9G free) — the informational threshold, "again" after the 09-20 Pig C: crisis and Oracle's own 83% reading on 09-20. Not 95%-critical, but the highest-pressure resource and the correct thing to hit first.
- **Not critical:** memory (4.8G available), CPU (load 0.2), inodes (9%), all four containers healthy, no OOM evidence, /health healthy on both gateway ports.

## Reclamation (all reversible, high-confidence only) — disk 80% → 56%
| Action | Reclaimed |
|---|---|
| /tmp cleanup: 4 image tarballs (512776de5, 6a8d5bf83, 9d3b22566, 84486f056 — all redundant, images loaded in docker) + ping-head worktree (161M) + ping-head.tgz + gw-refactor-deploy.tar | ~1.73 GB |
| journal vacuum (--vacuum-size=500M; journals went back to Aug 8) | ~3.2 GB (3.6G → 424M) |
| btmp truncate (437MB, `lastb` showed 0 valid records — brute-force noise) | 437 MB |
| docker builder prune -a | 2.42 GB |
| docker image prune (dangling) | 443 MB |
| docker rmi postgres:15-alpine (unused; live is 17-alpine; refs only in Sep-15 snapshot docs) | 408 MB |
| docker rmi ghcr.io/oracle/oci-cli:latest (no container, no script refs) | 1.33 GB |
| **Total per df** | **~11 GB (36G → 25G used; 8.9G → 20G free)** |

Post-reclamation verification: both gateways /health healthy, all containers up, restarts=0.

## Deliberately NOT touched (with reasons)
- **ollama/ollama:latest (6.99GB):** gateway code requires `OllamaProvider` as the default AI provider and `OLLAMA_BASE_URL=http://host.docker.internal:11434` is set. Potential runtime dependency — removal failed the confidence bar.
- **ping-gateway:candidate-84486f056:** the accepted proven baseline image. Explicit do-not-touch.
- **oracle-gateway:rollback-20260919, :certified-20260919:** names suggest deliberate retention policy.
- **Other superseded gateway images (~8GB docker-reclaimable):** rebuildability from source unverified → below the autonomous bar. Flagged for a later call.
- **/opt/ping/releases (2.7G), snapshot tar (1.1G):** legitimate backups (Oracle is for backup/recovery).
- **ping-gateway-candidate (:8081):** running; intent unclear → open question below.

## Baseline vs live reality (provenance gap — must be reconciled)
- Accepted baseline: source 84486f056, image `ping-gateway:candidate-84486f056` (sha256:467af2da…), ORACLE_RUNTIME_PROVEN + ORACLE_RESTART_PROVEN.
- **Live reality:** both `ping-gateway` (:8080) and `ping-gateway-candidate` (:8081) run **`ping-gateway:candidate-3c5d280dd`** (sha256:4aa9d7f6…), started 2026-09-21T12:03–12:05Z, restarts=0, healthy 26h+. The baseline container (`ping-gateway-prev-84486f056`) exited 26h ago.
- There is **no record in my context of the 3c5d280dd promotion**, and `deployment_registry` in postgres is **empty** (0 rows). Both gateways have **identical env** → both point at the same DB (latent two-writer concern; `canonical_events` is currently 0 rows, so no active writes).
- The 84486f056 image is preserved in docker (rollback intact).

## Runtime Distribution v1 milestone
- Keep-off inventory (read-only) completed: no git repos on Oracle; source trees total ~10M (`/opt/ping/gateway` 6.6M, `ping-runtime` 3.4M); audit artifacts in `/opt/ping/releases` (2.7G); `p18-oracle-staging` (218M, Sep-19 leftover); no `runtime-manifest.json` exists yet.
- Milestone remains **GATED** per its own sequencing (forensics completed 09-18 per records; reachability/persistence/closure verification is source-lane work, not Oracle ops). No stripping performed — correct per the hard gate.

## Open question (the one thing needing Nolan's call)
> On 2026-09-21 ~12:05 UTC the live gateway moved from the accepted baseline image (candidate-84486f056) to candidate-3c5d280dd with no promotion record I can find, and a second identical candidate container was left running on :8081 against the same database. **Is 3c5d280dd the new accepted baseline (updating the provenance record), and should the :8081 candidate be stopped to restore single-writer?** Recommended default: accept 3c5d280dd as the new live baseline (healthy, 26h uptime, restarts=0) and stop :8081 after your confirm. Consequence of choosing wrong: certifying an undocumented build, or leaving a latent dual-writer if event traffic resumes.

## Evidence
Raw assessment + reclamation logs: `~/workspace/oracle-migration/evidence-2026-09-22/` (assessment-raw.txt, assessment2–7-raw.txt, reclaim-raw.txt, reclaim2-raw.txt, final-raw.txt).

## Decision executed 2026-09-22 ~10:05 MDT (Nolan: "do oracle nowwwwww")
- **3c5d280dd accepted as the new live baseline.** Basis: 28h uptime, restarts=0, /health 200 on both ports pre-change. Provenance gap recorded honestly: no promotion record found in context, deployment_registry empty (0 rows) at check time. The 84486f056 image is retained in docker as rollback.
- **ping-gateway-candidate (:8081) stopped.** Both gateways ran identical image/env against the same DB (crx_runtime); canonical_events was 0 rows so no dual-writer damage occurred. No active connections to :8081 and no workspace consumer references it. Stop is reversible (container + image retained); restart with `docker start ping-gateway-candidate` if ever needed.
- Post-change: :8080 /health 200, :8081 connection refused (expected), postgres+qdrant healthy, disk steady at 56% (25G used / 20G free).
- **Still open (not done in this pass):** ~6.5GB docker-reclaimable superseded gateway images. Rebuildability from source still unverified, so removal stays below the autonomous bar. Next step is either verify rebuildability or get an explicit call.
