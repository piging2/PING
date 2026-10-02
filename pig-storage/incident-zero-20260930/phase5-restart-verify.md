# Incident Zero — Phase 5: Restart and Prove the Organism
Date: 2026-09-30. Worker: Phase 5 subagent (depth 2).
Status: IN PROGRESS — blocked on Pig tailnet outage since ~13:24Z (see §8).

## 1. Pre-boot state (direct route, no WSL cold-boot)
- 12:33Z: `wsl -l -v` → Ubuntu Stopped, docker-desktop Stopped, no vmmemWSL. **Respawner did NOT beat me** — Phase 4's end state was intact.
- C: free not re-measured pre-boot (Get-CimInstance quoting failed; skipped as non-essential).

## 2. WSL boot — PASS
- 12:33:17Z: `wsl.exe -d Ubuntu` via direct SSH route. `wsl -l -v` → Ubuntu **Running**.
- `df -h /` → /dev/sdd 1007G total, 85G used, 872G avail (9%). Sane.

## 3. Docker backend — PASS (with significant incident, see §7)
- The Docker Desktop Windows GUI was NOT alive after `wsl --shutdown` (process gone, no pipe).
- `Start-Process Docker Desktop.exe` in session 0 launched the backend (12:33:32Z) but the Electron renderer crashed at 12:49:22Z ("renderer process has gone unexpectedly: crashed, exitCode -1") and the backend died with it.
- Headless `com.docker.backend.exe` (launched via Start-Process, sanctioned Docker component, no reinstall/reset) boots the engine and serves the API, but **dies ~4–6 min after launch** with distros flipping to Stopped and a zombie vmmemWSL left behind. Root cause unidentified; no WER crash, backend log just stops mid-healthy-serving.
- Fix that worked: launched `Docker Desktop.exe` **in Nolan's interactive console session (session 1)** via scheduled task `\DDBoot6` (InteractiveToken, cloned from the proven `\PigiPopBrowser` pattern). GUI stable since 13:13:31Z, backend stable, engine up.
- `docker ps` responding: YES (13:16:50Z). Windows npipe `dockerDesktopLinuxEngine` present.

## 4. Containers — PASS 11/11 Up
All started via `docker start <name>` (no compose in phase4 log). `ping-postgres` auto-started via its restart policy; the other 10 started manually.

| # | Container | Status |
|---|---|---|
| 1 | qwen3-tts-service | Up |
| 2 | ping-gateway | Up |
| 3 | ping-postgres | Up |
| 4 | ping-qdrant | Up (healthy) |
| 5 | cosyvoice-tts | Up |
| 6 | ping-redis | Up (healthy) |
| 7 | ping-vault | Up (unhealthy) — matches pre-shutdown state (was UNHEALTHY before Phase 4 too) |
| 8 | ollama | Up |
| 9 | brain-postgres | Up |
| 10 | brain-qdrant | Up |
| 11 | open-webui | Up (healthy) |

## 5. brain-postgres source truth — PASS
- `SELECT 1` → 1
- ping_events = **2546** ✓ (matches Phase 1)
- ping_missions = **502** ✓
- knowledge_nodes = **230** ✓
- Event read proof: latest rows returned (e.g. MISSION_CREATED / OBSERVATION_CREATED, namespace core::system, 2026-09-29).

## 6. PING gateway :8080 — CONDITIONAL PASS
- `/health` RESPONDS with detailed JSON (HTTP 503 aggregate).
- Component detail: gateway=healthy, generated_artifacts=healthy, integrations=healthy (3/3), event_runtime=healthy, canonicalization=healthy, qdrant=healthy; **event_governance=degraded** (54/108 NAMESPACE_VIOLATION rejections — the jev-shadow "No owner defined for namespace 'jev'" condition; Jev is a standing shadow sensor, pre-existing app-level condition, out of scope to heal); embedding=not_initialized.
- `/events` → 401 (auth layer live — the watchdog's healthy signal; event routes are NOT 503ing).
- Gateway is functionally alive: EventBridge polling, ClassificationWorker classifying, missions bridging (observed in logs).
- Verdict: probe responds; aggregate 503 is driven by the pre-existing jev namespace-governance condition, not by the restart.

## 7. FYD :3100 — PASS
- Restarted ONLY via `/home/nolan/start-3100.sh` from non-PTY ssh (stdio on /home/nolan/3100.log). Script reported healthy: `/sites/happy-place` → 200, next-server PID 1112.
- Process env verified: **NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1** ✓, FYD_BUILD_SHA=a8957e3fc2f1e3eb5552a67cc3cab66003d7f19c ✓.
- Served build identity (`/api/readyz`): buildId=**CTfvku8OQWWqrG8pKnSy7**, commitSha=**a8957e3fc2f1e3eb5552a67cc3cab66003d7f19c**, builtAt=2026-09-29T18:50:10.815Z. (Phase 4 recorded no pre-shutdown build identity; this is the new baseline.)
- Approve-path probe: POST /api/fyd/customize {action:"parse", siteId:"happy-place", ...} → **400 typed `unsupported`** with honest capability message, `"demo":true`. The **403 demo_owner_mode_required gate did NOT fire** → flag live and 127.0.0.1 recognized as private host. The parse action is read-only (no persistence, no owner action per the route contract); full approve would journal to :18200.
- readyz reports ok:false — "customize: demo gateway unreachable at http://127.0.0.1:18200/ (ECONNREFUSED)". The convergence-tree journal gateway (:18200) has no sanctioned launcher (only start-18199.sh exists; :18199 IS running, PID 850). :18200 was not in the phase4 restart list; starting it would be new scope. The :3100 serve path itself (sites, customize parse, mission-control) is green.

## 8. Mission Control — PASS
- GET http://127.0.0.1:3100/mission-control → **HTTP 200**.

## 9. Transport outage — RESOLVED
- Pig tailnet dropped ~13:24Z–13:34Z (~10 min): both transports → `nc: proxy read: Broken pipe / Connection closed by UNKNOWN port 65535`. Sandbox internet fine; tailscale wrapper reported Connected. Pig-side network drop (WiFi-only machine; known Modern Standby wedge pattern) or egress proxy failure. Self-recovered 13:34:50Z.
- Post-outage re-check (13:35Z): all 11 containers still Up (17–21 min uptime), backend+GUI stable, :3100 serving. Nothing was mid-write at drop time.

## 9. Out-of-scope items — untouched
ping-postgres :5433 (running, part of the 11), Vault consumers, Hermes, Oracle box, SSH-key-in-dangling-volume question, CosyVoice model-choice question. The respawner anomaly: NOT observed this phase (pre-boot state was clean; one spontaneous Ubuntu Running→? transition at ~12:57Z with no backend present is noted but unattributed).

## Overall
**ORGANISM: HEALTHY.** All 11 containers Up via sanctioned paths; source-truth row counts match Phase 1 exactly (2546/502/230); gateway serving and processing; :3100 restarted via the sanctioned script only with demo-owner flag live and the approve path probed; /mission-control 200. Two known-not-restart-damage conditions: (1) gateway /health aggregate 503 from the pre-existing jev namespace-governance condition (event routes live, auth live); (2) /api/readyz ok:false because the :18200 convergence journal gateway has no sanctioned launcher and was not in the phase4 restart list — the :3100 serve path itself is green. One open infrastructure item for Nolan/the parent: Docker Desktop's headless backend dies ~4–6 min after launch in session 0; the GUI in session 1 is stable — the sanctioned restart path for future Docker cold starts should prefer the session-1 scheduled-task route. A ~10-min Pig tailnet drop (~13:24–13:34Z) self-recovered; all state verified intact afterward.
