# Exact access requirement for live verification of the PING gateway

Compiled from captured evidence only. Nothing here was probed live. No credential values appear anywhere; the credential rules from the task are honored.

## Host and port

- The gateway runs in the `ping-gateway` container on Nolan's Pig workstation.
- Port: 8080. The container logs show `Gateway running on http://0.0.0.0:8080`.
- Base URL from an authorized environment: `http://localhost:8080` on the Pig loopback (verified: `GET http://localhost:8080/health` returned 200 on 2026-09-17, PHASE0 report).
- Second authorized path: `http://100.79.154.43:8080` over Tailscale from an authorized machine (gateway observed live on that address 2026-09-12, PHASE4 record).
- Live image: `curious-squid-gateway:phase4-eventauth6`, built from the curious-squid worktree, NOT canonical main (promoting canonical main would drop the auth boundary; interop audit sec 11).

## Transport path (SSH config)

From this cloud host: Pig SSH FAILS. The egress proxy closes CONNECT to 100.79.154.43, so no SSH session, no `docker exec`, no loopback HTTP, and no credential resolution is possible from here. This is a hard stop, not a retry problem.

From WSL on Nolan's laptop (the working route):
- `~/workspace/pig-fb/oracle-ssh.sh -s` over SSH, then read-only `docker exec ping-gateway cat <path>` (used 2026-09-17 to extract the live mission_runtime.js and mission_scheduler.js; PROVENANCE.md).
- Equivalent: `nolan@100.79.154.43 -> wsl -u nolan` then grep/sed/cat/git read-only probes (thread 6 access note).
- Checked-in helpers: `~/workspace/pig-fb/pig-ssh.sh` (`pig_ssh`, `pig_scp`) via `nc -X connect -x hatch-egress-proxy:3130`, Ed25519 key, `BatchMode=yes`, host key pinned to `~/workspace/pig/known_hosts` (fail-closed on rotation), `ConnectTimeout` 25s.
- cmd.exe on the Pig is the remote shell: single quotes break; payloads go as base64 UTF-16LE `-EncodedCommand` or double-quoted strings; stdin-piped reads hang, so payloads travel as arguments, never stdin.

## Credential resolution path (no values)

- Bearer tokens live only in the `ping-gateway` container environment on the Pig.
- Resolution path: over SSH, `docker exec ping-gateway printenv` (or equivalent env read), extract the Bearer for the needed principal at runtime, use it in the Authorization header of the probe, and never write it to a file, memory, chat, or logs. `emit-observation.py` does exactly this (resolves at runtime, POSTs to the Pig loopback through SSH).
- Auth truth is the Postgres `exterior_agent_credentials` table, not the container env (per the pipeline record). Principals evidenced: agent_id `muse` (L1 "Observe") and agent_id `muse-level-2` (L2 "Workspace Write").
- For read-only probes the L1 principal is sufficient. The L2 principal is only needed if a probe must exercise a level-2 write, which the safe sequence below avoids.

## Safe read-only probe sequence

Run all of this from WSL on Nolan's laptop (or another Tailscale-authorized machine). Order matters: prove health first, then public reads, then the auth boundary, then authenticated reads. Never POST anything.

1. `GET http://localhost:8080/health` (public). Expect 200 when healthy. If it returns 503 or connection-refused, stop: the gateway is degraded or mid-startup (see degraded semantics below) and no further reading is meaningful.
2. Public reads, in any order: `GET /ops/health`, `GET /ops/dashboard`, `GET /ops/system`, `GET /ops/drift`, `GET /governance/stats`, `GET /constitution`, `GET /mc/scheduler`. All expect 200. Known-broken (do not treat as regressions): `/ops/status` -> 500, `/constitution/graph` -> 503, `/runtime/fingerprint` -> 500 as of 2026-09-13.
3. Auth-boundary check (anonymous): `GET /events` must return 401. If it returns 200, the event auth boundary has regressed. (The Pig watchdog uses exactly this: 401 on /events = healthy boundary.)
4. Authenticated reads with the L1 Bearer resolved on the Pig: `GET /events` (list), `GET /events/:id/descendants` for a known event id, `GET /missions`. Expect 200 with JSON.
5. Optional unauthenticated read: `GET /orchestration/engine` (was 200 unauthenticated 2026-09-13). If it now returns 401, that means the hardening-build auth has been deployed; record the change.

What the sequence deliberately excludes: every POST. POST /events emits into ping_events and re-dispatches handlers even on duplicate payloads (dedup prevents double persistence but not handler re-dispatch). POST /missions creates real missions. POST /orchestration/* mutates the in-memory engine and can trigger the autonomous loop's fabricated outputs. No write probe is safe without Nolan's explicit approval of that specific write.

## Degraded semantics to expect while probing

- When Postgres is reachable: normal responses as above.
- When Postgres is down but the gateway is up: the mounts /events, /context, /api/v1/repository, /system, /canonical-events, /tenants, /deployments, /runtime, /ingest return 503 `{error:'Postgres unavailable', degraded:true}` (proven code at gateway_runtime.js:692-700).
- During startup failure (the 2026-09-17 crash loop): the gateway never completes startup, /health is connection-refused, and the logs may contain ephemeral degraded-mode API keys that were generated but never usable. They were destroyed with the container recreate; no action needed if seen again beyond noting the incident.

## What cannot be done from this cloud host

- SSH to the Pig (100.79.154.43): the egress proxy closes the connection. So from here there is no `docker exec`, no container-env read, no Bearer resolution, and no HTTP to `localhost:8080` (that loopback is the Pig's, not this host's).
- Consequence: live verification of every route in route-inventory.md must be delegated to an environment with Pig access (WSL on Nolan's laptop), following the sequence above. This inventory stays STATIC until such a run happens.
- Note on timing: the Pig drops around 7am and 4pm MT (Nolan's commute). Do not schedule or retry Pig-dependent verification in those windows; wait 10 minutes after a first failure before any retry.
