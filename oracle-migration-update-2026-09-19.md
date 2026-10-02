---

## Oracle Migration Update - 2026-09-19 17:55 MDT (verification-first pass)

Operator steering 17:52 MDT: prioritize VERIFICATION over installation. Nolan's 06:12 correction confirmed live; the 17:50 directive's "no /opt/ping" premise was FALSIFIED by direct probe. Nothing was installed, transferred, or recreated. All evidence labels: VERIFIED / INFERENCE / UNKNOWN / BLOCKED.

### Oracle Host Provisioning
- VERIFIED: ping-core-01 (129.146.60.17), aarch64, Ubuntu 24.04, 5.8 GB RAM, 45 GB disk (51% used, 22 GB free).
- VERIFIED: Docker 29.1.3 and git 2.43.0 already installed and working. Prerequisite installation SKIPPED (nothing missing).
- VERIFIED: /opt/ping exists (deployed snapshot, .env, backups, releases). ubuntu has NOPASSWD sudo. Access via Pig-hop SSH (direct cloud to Oracle blocked by egress proxy; Pig to Oracle key auth proven).

### ARM64 Compatibility Matrix
- VERIFIED arm64-native: oracle-gateway:latest, ping-gateway-converged:phase18-arm64-a2c2626ce, postgres:17-alpine, qdrant/qdrant:v1.7.0, node:24-alpine.
- temporalio/auto-setup:1.24.0 image present locally; temporal service behind `temporal` profile: PRESERVED_INACTIVE.
- ghcr.io/berriai/litellm:main-latest NOT pulled; litellm behind `litellm` profile: PRESERVED_INACTIVE.
- No QEMU/emulation used or needed. No REQUIRED service lacks ARM64 support.

### Remote Source Deployment
- VERIFIED: the running stack was deployed from /opt/ping/releases/bce92787b0da631ed9218e2255607562c9dff731/ping-oracle-clean-snapshot (compose project "oracle"), NOT from /opt/ping/infrastructure/oracle/docker-compose.oracle.yml.
- The snapshot compose is NEWER than /opt/ping's copy: adds qdrant healthcheck, marks temporal Optional behind profile, adds gateway healthcheck + QDRANT_URL env.
- INFERENCE: /opt/ping/infrastructure/oracle/docker-compose.oracle.yml is a stale copy; refresh from the snapshot compose before any future redeploy from /opt/ping.
- No source transfer performed (source already on-box). NO COMMIT made for deployment.

### Remote Compose Validation
- VERIFIED: `docker compose -f infrastructure/oracle/docker-compose.oracle.yml config` runs CONFIG_OK on Oracle. Warnings only: LITELLM_API_KEY unset, obsolete `version` attribute.

### Remote Native Build
- Not required: every active image is already arm64-native and running. No build performed, no per-service build results to record.

### Oracle Resource Budget
- VERIFIED: 5 containers, ~380 MB total (ping-gateway 131 MB, p18-gateway 119 MB, p18-scratch-pg 60 MB, ping-postgres 43 MB, ping-qdrant 28 MB). Host: 934 MB used, 4.9 GB available. Disk: 23 GB / 45 GB (51%).
- Smallest real slice active: postgres + gateway + qdrant. Temporal / LiteLLM / scheduler NOT started. Core PING comes first; no model/vector/workflow services started.

### PostgreSQL Persistence Proof
- VERIFIED volumes: oracle_pgdata -> ping-postgres (db crx_runtime, user ping); oracle_qdrant_storage -> ping-qdrant; p18_pgdata -> p18-scratch-pg (db p18_staging, user p18).
- VERIFIED: 28 tables in crx_runtime incl. ping_events (2225 rows), ping_missions (419+ rows), canonical_events (0 rows), exterior_agent_credentials, event_processing.
- No `docker compose down -v` / volume prune / system prune executed or needed.

### Canonical Runtime Proof
- VERIFIED end to end 2026-09-19 23:53 UTC: POST /events with Bearer api:muse-level-2 -> ExteriorAuthMiddleware (fail-closed, DB-backed) -> CanonicalizationService.canonicalizeAndEmit -> UnifiedEventRuntime.emit -> ping_events row 068458666915b2176c5a2e23051cc95c75296c1b3525353a061aa2769fcab632 (SYSTEM_HEALTH_CHECK, source api:muse-level-2, namespace core::owner).
- VERIFIED live mission chain after gateway restart: MISSION_CREATED -> MISSION_ASSIGNED -> MISSION_STARTED -> MISSION_COMPLETED -> LINEAGE_CREATED. Mission 83aebc999a20ab01: CLASSIFICATION_CREATE, completed, worker=classification, created_by=event-to-mission-bridge.
- VERIFIED wiring in gateway/bootstrap/gateway_runtime.js: UnifiedEventRuntime (line 510), MissionRuntime (572), WorkerRuntime (576, 8 canonical workers registered), EventToMissionBridge (671, EVENT_MISSION_MAP subscriptions), MissionScheduler dispatches via MISSION_WORKER_MAP.
- Old Python polling path: zero Python containers running; Python scripts exist in snapshot only as source. PRESERVED_INACTIVE. No second canonical authority.

### Restart Recovery Proof
- VERIFIED: `docker restart ping-gateway` -> /health 200 after restart; pre-restart proof event still present in ping_events; new POST /events succeeded post-restart (event ba1968e41d5bac13b9f6c8fbb739e26150530c72a135b7788265b9e518131c82). PostgreSQL volume untouched.
- BLOCKED (not yet tested): PostgreSQL container restart persistence; VM reboot recovery (reboot is Nolan's call).

### Python Adapter Status
- PRESERVED_INACTIVE. No Python adapter service wired into the Oracle compose; old direct-SQL polling architecture NOT reactivated. Constitutional PING is persistent first.

### Service Classifications
- ping-gateway (oracle-gateway, :8080, healthy): ACTIVE_EXECUTOR - canonical authority runtime (Gateway -> UnifiedEventRuntime -> ping_events -> bridge -> missions -> workers -> evidence).
- ping-postgres (oracle_pgdata): ACTIVE_EXECUTOR - canonical journal store.
- ping-qdrant (oracle_qdrant_storage): DERIVED_SERVICE - vector projection, knowledge collection present, /collections ok.
- p18-gateway + p18-scratch-pg (:18080, /health 503): PRESERVED_INACTIVE experiment - ad-hoc docker run (no compose labels), separate scratch DB. Left untouched.
- temporal, litellm, scheduler: PRESERVED_INACTIVE (profiles / not started).
- Promotion Python runtime: PRESERVED_INACTIVE (source present, not wired).

### Remaining P0 / Next
1. PostgreSQL container restart persistence test (safe: volume oracle_pgdata preserved; restart only the container).
2. VM reboot recovery test - needs Nolan's explicit word (do not reboot unilaterally).
3. PostgreSQL password rotation before production certification - Nolan decision (existing P1).
4. Decide fate of the p18 experiment stack (unhealthy :18080, harmless, untouched) - Nolan decision.
5. Refresh the stale /opt/ping/infrastructure/oracle/docker-compose.oracle.yml from the newer snapshot compose before any redeploy from /opt/ping.
6. Local storage lane untouched per directive (separate agent owns it); convergence worktree read-only only.
