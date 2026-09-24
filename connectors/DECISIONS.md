# Connectors lane decisions (2026-09-24)

## D1: MCPServer recorded as UNWIRED-BY-DESIGN (not wired this lane)

- What: `MCPServer` (interface + `BaseMCPServer`, `FilesystemMCPServer`, etc.) exists in source at `~/worktrees/ping-oracle-deploy/constitutional-compiler/runtime/mcp/` (Pig) and as `ping_mcp_server.py` in the Oracle clean snapshot's `mcp/`.
- Verified unwired: zero references in the running gateway image (`ping-gateway:devin-boundary2`, /app), zero consumers in the Oracle snapshot's gateway/scheduler/orchestration, zero mentions in `docker-compose.oracle.yml`, and the gateway's `healthAuthority` registers only: gateway, generated_artifacts, integrations, event_governance, event_runtime, canonicalization, qdrant, embedding.
- Decision: record as UNWIRED-BY-DESIGN. Wiring it means gateway code changes + image rebuild + production redeploy, which is outside this lane's safe/reversible scope and presupposes a product decision (does PING want MCP exposure on the gateway at all?).
- Next: needs a Nolan/coordinator product call. If yes, the wiring point is `healthAuthority.registerHealthCheck('mcp', ...)` in `gateway/bootstrap/gateway_runtime.js` plus route(s) for the MCP transport.

## D2: ping-vault healthcheck NOT fixed live (recreation would destroy data)

- The probe `["CMD","vault","status"]` false-negatives because the CLI defaults to `https://127.0.0.1:8200` while this `vault server -dev` instance speaks plain HTTP. The service is healthy (initialized, unsealed, API 200).
- The container runs `-dev` = **inmem storage**. Any recreation (required: Docker healthchecks are immutable) wipes all vault contents.
- Decision: do NOT recreate. Fixed probe definition recorded in `ping-compose.reconstructed.yml` (commented with the warning) for use AFTER vault gets durable storage and a data migration plan. That migration is a Nolan-level decision.
- Note: dev-mode vault is explicitly not for production (HashiCorp). If vault becomes load-bearing, it needs `-dev` removed + raft/file backend first.

## D3: gateway NOT cut over to compose yet (definition ready, validated)

- The live gateway (`ping-gateway`, created 2026-09-16 via `docker run`, restart=unless-stopped) has no compose service definition and no Docker healthcheck.
- `ping-gateway.compose.yml` (this dir) reconstructs it faithfully from `docker inspect`, adds the node-based `/health` probe (proven 200 live), and validates with `docker compose config` (GW_CONFIG_OK 2026-09-24).
- Decision: do NOT cut over now. The 2026-09-23 promotion decision will replace the running image (`devin-boundary2`, pre-P0-gate) with the certified candidate (`jev/verdict-authority-hardening @ fffe99f7a4174cc694c65c9ac1b0b00b4332bf2f`); recreating the deprecated deployment now is churn. Cut over AT PROMOTION TIME with the certified image via `GATEWAY_IMAGE=... docker compose -f ping-gateway.compose.yml up -d`; rollback = down + re-run the recorded `docker run`.

## D4: ping-qdrant vs brain-qdrant (discovery 2026-09-24)

- The production gateway's `QdrantAdapter` uses `QDRANT_URL=http://host.docker.internal:6333`, which routes to **brain-qdrant** (the holder of host port 6333), NOT ping-qdrant. ping-qdrant's `-p 6333:6333` binding was never effective (`docker ps` showed `6333/tcp` exposed-only; `docker port` empty) and any network (re)programming for it failed on the conflict.
- ping-qdrant was also found network-detached; v3 cutover recreated it WITHOUT the dead port binding, WITH the fixed `/healthz` probe, reattached to `ping_ping_internal`, same volume+env. Proven healthy by `qdrant-healthcheck-invariant.sh` (4/4).
- Open question for the coordinator: what consumes ping-qdrant (`constitutional_memory` collection) today? If nothing, it is a candidate for decommissioning (volume preserved) to remove the confusion of two qdrants.
