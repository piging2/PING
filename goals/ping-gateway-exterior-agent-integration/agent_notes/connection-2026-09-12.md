# Cloud agent to gateway: connection proven (2026-09-12)

## What was proven from the cloud runtime
- SSH: `muse-ssh@100.79.154.43` via `hatch-egress-proxy:3130`, key `~/.ssh/id_ed25519`. Works.
- Gateway Level 1: `GET /capabilities/discover` -> agentId `muse`, profile 1. Works.
- Gateway Level 2: `GET /capabilities/discover` -> agentId `muse-level-2`, profile 2. Works.
- Live capability: `POST /capabilities` `fs.list` on `/app/workspace/muse` -> 200, authorization granted.

## How to re-authenticate in future sessions
- Bearer tokens live in the `ping-gateway` container env on the pig. Re-resolve via SSH: `docker exec ping-gateway env` (muse-ssh has docker access).
- Network path from cloud: `http_proxy=http://hatch-egress-proxy:3130` then `http://100.79.154.43:8080`.
- NEVER write tokens to files, memory, or chat. Resolve transiently per session.

## Remaining
- Wire PING artifacts, invariants, and schemas into the outreach pipeline (future work).
