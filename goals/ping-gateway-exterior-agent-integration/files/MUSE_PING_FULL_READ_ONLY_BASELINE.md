# MUSE x PING: Full Read-Only Infrastructure Baseline

**Date:** 2026-09-12 (Saturday, MDT)
**Method:** Five parallel read-only recon sweeps over SSH (`muse-ssh@100.79.154.43` via `hatch-egress-proxy:3130`) plus live gateway probes from the cloud runtime. Zero writes performed: nothing created, modified, deleted, restarted, or reconfigured during the audit.
**Constraint honored:** READ ONLY throughout. Broken things were documented, not fixed. Dormant infrastructure was preserved, not cleaned.
**Author:** Pigi (Muse), synthesized from five subagent evidence reports.

**Label key used throughout:**
- **OBSERVED** — directly verified by command output, file read, or live probe this session
- **INFERRED** — strong inference from observed evidence, stated with reasoning
- **UNKNOWN** — could not be verified within read-only scope

---

## 1. Executive summary

The machine ("Pig", Windows 11 Pro, 24 cores, 64GB RAM) hosts a layered system: Nolan's dev desktop, a Docker Desktop Linux VM running ~13 containers, and the canonical PING repository at `C:\Users\nolan\PING`. The exterior-agent gateway (`ping-gateway`, image `curious-squid-gateway:latest`) is running and reachable from the cloud over Tailscale, and both Muse credential levels authenticate and execute capabilities end to end. That is the good news, and it is real: OBSERVED today from this runtime.

Three findings dominate everything else:

1. **The gateway is talking to the wrong database.** Its Postgres env points at `host.docker.internal:5432`, which from its network resolves to `brain-postgres` (an unrelated stack's DB), while the intended `ping-postgres` sits on host port 5433 on networks the gateway cannot reach. This is the strong-INFERRED cause of the "password authentication failed for user ping_user" degraded mode: no durable audit, no knowledge/event search, several route families returning 503 stubs.
2. **The gateway's credential-denial control is dead code in effect.** Denied-path patterns like `secrets/*` are anchored against the absolute canonical path, so they never match. Probed live: `fs.read` of `secrets/probe.txt` returned granted:true. Impact is bounded by workspace isolation, but the documented protection does not work.
3. **The running gateway is not what `main` describes.** Canonical `main` holds a stub gateway; the operational implementation (capability authority, auth middleware, workspace registry) exists only as uncommitted files in an opencode worktree on branch `constitutional-convergence-v2`. The security boundary currently has no git home. Related: the image bakes the entire 570MB PING tree into `/app`.

Supporting findings: sshd reaches the cloud only via Tailscale (firewall Private-profile rule; LAN is Public, so LAN SSH is blocked). `muse-ssh` is currently a full admin (troubleshooting leftover), which also flips the effective authorized_keys file to the administrators path. The C: drive is at 3.7% free. The gateway has no restart policy (every reboot kills exterior access until manual restart) and binds 0.0.0.0. Unauthenticated gateway surfaces exist beyond `/capabilities` (notably POST `/ai/*`, `/connectors` sync/oauth). The canonical repo shows heavy sprawl (100+ audit MDs, 72% of tracked files are node_modules, no root .gitignore) but was not touched.

Nothing in this report was changed. The execution queue at the end lists the highest-leverage fixes with the minimum change for each, awaiting explicit authorization.

---

## 2. Exact environment and provenance

### Machine (OBSERVED)

| Fact | Value |
|---|---|
| Hostname | PIG |
| OS | Microsoft Windows 11 Pro, version string 10.0.26200.9445, build 26200 |
| CPU | 24 logical processors |
| RAM | ~63.7 GB total, ~33.5 GB free at audit time |
| Disk C: | ~444 GiB used, **18.6 GB free (~3.7%)** — capacity watch item |
| Tailnet address | 100.79.154.43/32 (Tailscale adapter, NLA category Private) |
| LAN address | 192.168.1.5/24 (Wi-Fi, NLA category Public) |

### Key software (OBSERVED)

| Component | Version / state |
|---|---|
| OpenSSH Server | OpenSSH_for_Windows_9.5, LibreSSL 3.8.2; service Running, Automatic, as LocalSystem |
| Docker | Client 29.5.3; Server Docker Desktop 4.79.0, Engine 29.5.3, linux/amd64 (Linux containers), containerd v2.2.5, runc 1.3.6 |
| Tailscale | tailscaled.exe running (PID 9040) under Nolan's user session; `tailscale` CLI not queryable as muse-ssh (daemon owned by `Pig\nolan`, 401 via CLI) |
| Node (gateway image) | 24.18.0 on node:24-alpine |

### Provenance of the running gateway (OBSERVED)

- **Container:** `ping-gateway`, created 2026-09-12T14:57:30Z, started 2026-09-12T16:07:05Z (manual restart after Windows reboot)
- **Image:** `curious-squid-gateway:latest` (created 2026-09-12T14:57:09Z); layers: node:24-alpine → apk add git → npm install (775MB layer) → npm install pg express → `COPY . .` (570MB, entire build context) → mkdir workspace → EXPOSE 8080
- **Source:** worktree `C:\Users\nolan\.local\share\opencode\worktree\a0b0bfa71232ff53146749a3cad1f1b9013dc3e9\curious-squid`, branch `constitutional-convergence-v2`; gateway code at `gateway/` (434 files, 390 .js). Source mtimes match image build time (hardening changes are in the running image). Worktree git log unreadable as muse-ssh ("dubious ownership", owner `Pig\nolan`; not bypassed per read-only rule)
- **Canonical repo:** `C:\Users\nolan\PING`, HEAD `6e359a268d08ea0910bb0e3283bed15681c6b24f` on `main` (2026-07-31, ~6 weeks old), remote `origin https://github.com/ngesk2/crx-runtime.git` (repo's canonical name is crx-runtime; "PING" is the project name). Main is ahead of origin/main by 1 unpushed commit
- **Critical provenance gap:** the operational gateway implementation files (`gateway/capability_authority.js`, `gateway/routes/capabilities.js`, `gateway/workspace_registry.js`) are **untracked (`??`) working-tree files** in the worktree. Canonical `main`'s `gateway/` is a stub ("Minimal SystemAuthority for integration", zeroed state). The deployed security boundary has no git home

---

## 3. Architecture map

```
Cloud runtime (this agent)
  |  SSH: ProxyCommand nc -X connect -x hatch-egress-proxy:3130 %h %p
  |  HTTPS: http_proxy=http://hatch-egress-proxy:3130
  v
hatch-egress-proxy:3130  (HTTP CONNECT tunnel; internals UNKNOWN, behavior PROVEN)
  v
100.79.154.43  (Tailscale adapter, Private profile)
  |
  +-- :22  -> sshd.exe (LocalSystem) -> cmd.exe as pig\muse-ssh (admin token, High integrity)
  |         Firewall: inbound TCP/22 ALLOW on Private profile only.
  |         LAN (Public) cannot reach :22. Internet cannot (NAT, no public IP).
  |
  +-- :8080 -> com.docker.backend port-forward -> bridge 172.17.0.6:8080
                -> ping-gateway container -> node gateway/server.js
                -> GatewayRuntime (express) -> ExteriorAuthMiddleware (/capabilities only)
                -> CapabilityAuthority -> workspace /app/workspace/muse (volume muse-workspace)
                -> Postgres: INTENDED ping-postgres, ACTUAL brain-postgres (misdirected, auth fails)
                           -> degraded in-memory mode
```

**Control hierarchy (intended):** PING constitutional authority → gateway/governance → isolated workspace → execution. **OBSERVED status:** the gateway enforces workspace isolation and fail-closed authz on `/capabilities`; canonical PING is not writable through the gateway (OBSERVED: canonical repo integrity checks pass; no gateway route maps to it). SSH admin rights are physically real but are NOT authorization to mutate PING; the audit performed zero writes.

---

## 4. Capability map (gateway)

Four distinct categories, kept separate: **implemented** (code wired) vs **registered** (discover lists it) vs **authorized** (profile allowlist) vs **verified** (remotely tested).

Agent profiles: **muse (L1)** and **muse-level-2 (L2)**. Both share the same workspace `/app/workspace/muse` (no inter-agent isolation; OBSERVED).

| Capability | Implemented | Registered | Authorized | Verified |
|---|---|---|---|---|
| fs.list | YES | YES | L1+L2 | YES (remote, incl. today by cloud agent) |
| fs.read | YES | YES | L1+L2 | YES |
| fs.write | YES | YES | L1+L2 | YES |
| fs.patch | YES | YES | L1+L2 | NO |
| repo.inspect | YES | YES | L1+L2 | NO |
| git.status / diff / log | YES | YES | L1+L2 | YES |
| git.commit | YES (`git add .`, identity `Muse Agent <muse@ping.local>`) | YES | L2 | YES |
| git.branch | PARTIAL (code only LISTS; discover advertises "Create Git branch") | YES | L2 | NO |
| git.checkout | YES but param mismatch (discover: `branchName`, code reads `parameters.branch`) | YES | L2 | NO |
| git.push | NO (throws, requires PROMOTION; correctly fail-closed) | YES as DISABLED | none | N/A |
| process.list | STUB (hardcoded empty `{"components":[]}` in degraded mode) | YES | L1+L2 | NO |
| service.inspect | STUB (same) | YES | L1+L2 | NO |
| knowledge.search | Code exists; **execution fails "KnowledgeGraph not available"** (PG-gated) | YES as IMPLEMENTED | L1+L2 | NO (authorized but non-functional) |
| event.search | Same PG gate (INFERRED same failure) | YES | L1+L2 | NO |
| logs.read | NO | YES as NOT_IMPLEMENTED (honest) | none | N/A |
| command.run / test.run / build.run | NO (`_routeExecution` throws fail-closed) | YES as NOT_IMPLEMENTED | none | N/A |

**Registry drift (OBSERVED):** discover metadata is hardcoded, not derived from code, and has already drifted (git.branch behavior, git.checkout param name, knowledge.search availability).

**Denied paths BROKEN (OBSERVED via live probe):** patterns like `secrets/*` are anchored `^secrets/.*$` against the absolute canonical path (`/app/workspace/muse/secrets/...`), so they never match. `fs.read` of `secrets/probe.txt` and `.env` returned `granted:true`, HTTP 200 (failed only at the FS read step). Impact is bounded by workspace isolation, but the documented credential-protection control is ineffective as written.

**Request path (OBSERVED from code):** HTTP in → express.json (100KB body limit) → CORS (reflects request origin; comment claims wildcard removed but behavior is effectively wildcard) → route → (only on `/capabilities`: auth middleware → 401 MISSING_AUTH/INVALID_CREDENTIAL) → CapabilityAuthority.execute → authorize (fail-closed: unknown agent deny → profile allowlist → scope/repoId/workspace check → canonical-repo protection → denied paths → size/timeout limits) → capability router → sanitized-error response.

**Unauthenticated surfaces (OBSERVED via live probe):** auth middleware is mounted ONLY on `/capabilities`. Everything else is unauthenticated: `/capabilities/health` (200, discloses agent IDs muse/muse-level-2), `/capabilities/stats` (500 in degraded; would leak usage stats with PG), `/constitution`, `/governance/*`, `/ops/*`, `/health` (503 with component details), `/connectors` (200, inventory+health), `/connectors/:name/oauth/url` + `/callback` (unauthenticated OAuth initiation), POST `/connectors/:name/sync` (unauthenticated, side-effecting; not triggered), `/ai/*` including POST `/ai/chat`, `/ai/embed`, `/ai/select` (wired; ollama down so they fail today, still an unauthenticated LLM-proxy surface). PG-dependent routes return 503 stubs in degraded mode.

---

## 5. Privilege map

| Principal | Privileges (OBSERVED) | Notes |
|---|---|---|
| `pig\muse-ssh` (SSH) | BUILTIN\Administrators (group owner), High mandatory integrity label, full elevated token | Troubleshooting leftover; every SSH session runs elevated. Infrastructure fact, not authorization to mutate PING |
| Gateway agent `muse` (L1) | fs.list/read/write/patch, repo.inspect, git.status/diff/log, process.list, service.inspect, knowledge.search, event.search within `/app/workspace/muse` | Observe plus workspace write; knowledge/event search non-functional (PG) |
| Gateway agent `muse-level-2` (L2) | L1 plus git.branch/checkout/commit | Controlled git mutation; push disabled |
| Docker access via SSH | Full `docker` CLI as admin | Can inspect all containers/images/volumes; could exec; did not |
| Tailscale CLI as muse-ssh | None (401; daemon owned by `Pig\nolan`) | Limits Tailnet introspection over SSH; not a vuln |
| `muse-ssh` account flags | Active, never expires, "Password required: No", password expires 10/24/2026 | Blank-password console logon possible; network blank-password logons blocked by Windows default policy; SSH password auth disabled server-side. Flagged for hardening, not changed |

**Do-not-collapse reminder:** physically accessible (nearly whole machine) vs technically executable (arbitrary commands would run; only read-only probes were run) vs gateway-authorized (advertised capabilities in one workspace) vs policy-authorized (read-only for this audit) vs constitutionally permitted (canonical PING not writable via gateway) vs actually verified (everything marked OBSERVED above).

---

## 6. Network and access map

### Interfaces (OBSERVED)
- Tailscale adapter: 100.79.154.43/32, fd7a:115c:a1e0::2733:9a2c, fe80::c95d:f637:68f3:9a07; NLA **Private**; DNS suffix tail10c39b.ts.net
- Wi-Fi: 192.168.1.5/24, gateway 192.168.1.1; NLA **Public**
- vEthernet (Default Switch): 172.20.160.1; vEthernet (WSL): 172.21.64.1; Ethernet disconnected
- tailscaled.exe listens on 100.79.154.43:34879 and [tailnet-IPv6]:36008 (purpose UNKNOWN, likely internal peer/serve API)

### Listener to process map (OBSERVED)
| Port | Bind | Process |
|---|---|---|
| 22 | 0.0.0.0, [::] | sshd.exe (37340) |
| 3000, 3001, 5432, 5433, 6333, 6334, 8080, 11434 | 0.0.0.0, [::] and [::1] | com.docker.backend.exe / wslrelay.exe (Docker Desktop port forwarding) |
| 2179 | ::, 0.0.0.0 | vmms (Hyper-V) |
| 7679 | ::1 | GoogleDriveFS |
| 50851 / 62869 / 59580 / 59586 / 60064 | 127.0.0.1 | Devin.exe / OpenCode.exe / windsurf language server / python hermes_cli (loopback dev tooling) |
| 135, 445, 5357, 4966x | various | standard Windows system services |

Port semantics (INFERRED from container attribution): 8080 gateway, 5432 brain-postgres, 5433 ping-postgres, 6333/6334 qdrant, 11434 ollama, 3000 crx-ui-next, 3001 open-webui.

### Reachability matrix
| Service | Cloud via proxy | Pig localhost | LAN | Internet |
|---|---|---|---|---|
| sshd :22 | PROVEN | PROVEN | BLOCKED (firewall Private-only rule; LAN is Public) | BLOCKED (NAT, no public IP) |
| gateway :8080 | PROVEN (discover + live fs.list) | PROVEN (health 200) | UNKNOWN (binds 0.0.0.0 via docker; firewall posture for 8080 not fully mapped; do not assume) | Assumed blocked (NAT); not probed |
| :5432/5433/:6333/:11434/:3000/:3001 | NOT TESTED | UNKNOWN (binding proven, no probe) | UNKNOWN | UNKNOWN |

### Firewall (OBSERVED)
Enabled inbound Allow rules relevant: `OpenSSH SSH Server (sshd)` (TCP/22, Private profile only), `Docker Desktop Backend` (x2), `Tailscale-Process`, `Tailscale-In` (x2). No explicit port-8080 rule; gateway's published 8080 is covered by the Docker Desktop Backend rules (INFERRED, strong; port provably reachable). Private and Public profiles ON, BlockInbound/AllowOutbound. No PING-specific rules. No PING/docker/SSH-related scheduled tasks exist (schtasks query returned zero matches; empty result is a real result).

---

## 7. Filesystem and project map (key locations)

| Path | What it is | State |
|---|---|---|
| `C:\Users\nolan\PING` | Canonical PING repo (crx-runtime) | 301 files + 82 dirs top level, ~286MB; HEAD 6e359a26 (2026-07-31); 1,051 changed/untracked paths in working tree; 22,964 tracked files (72% node_modules); no root .gitignore |
| `C:\Users\nolan\.local\share\opencode\worktree\a0b0bfa71232ff53146749a3cad1f1b9013dc3e9\curious-squid` | Opencode worktree holding the OPERATIONAL gateway | Branch constitutional-convergence-v2; gateway impl files untracked; 128 changed paths |
| `C:\Users\nolan\PING-promotion` | Worktree on constitutional-trunk-promotion | Exists; not inventoried deeply |
| `C:\Users\muse-ssh` | SSH user profile | Contains only `.ssh\authorized_keys`; otherwise empty |
| `C:\ProgramData\ssh` | OpenSSH server state | Host keys, sshd_config (modified today 11:12), `administrators_authorized_keys` (the effective auth file), sshd.pid |
| `C:\Users\nolan\CascadeProjects\constitutional-runtime\brainos\orchestration\constitutional\canonical_state\schema.sql` | Constitutional schema | Bind-mounted into ping-postgres as initdb script (OBSERVED mount) |
| Docker volume `muse-workspace` | Gateway workspace | `/app/workspace/muse`; contains .git + test-persistence.txt |

**Secret-bearing locations (names only, values never read):** `C:\Users\nolan\PING\.env`, `.env.local`, `secrets/`, `credentials/client_secret.json`, `keys/root_private_key.pem`, `gateway/root_private_key.pem`, `secrets/github/`; worktree `gateway/.env.muse`; `C:\Users\nolan\.aws/`, `.azure/`, `login.json`, `temp_key.key`; container env of ping-gateway (`MUSE_LEVEL_1_KEY`, `MUSE_LEVEL_2_KEY`, `POSTGRES_PASSWORD`, readable via docker inspect by any docker user).

---

## 8. Docker topology (OBSERVED)

Engine: Docker Desktop 4.79.0, Engine 29.5.3, linux/amd64. Disk: 30 images / 84.6GB; 13 containers (7 running) / 4.6GB; 39 volumes (11 active) / 41.4GB; build cache 48.6GB. `wsl -l -v` reports no installed distributions while Linux containers run (backend detail UNKNOWN).

### Containers
| Name | Image | Status | Ports | Networks | Class |
|---|---|---|---|---|---|
| ping-gateway | curious-squid-gateway:latest | Up 2h | 8080→8080, restart `no` | bridge (.6) | PING exterior gateway |
| ping-postgres | postgres:15-alpine | Up 2h (healthy) | 5433→5432, unless-stopped | constitutional-runtime_ping_internal, curious-squid_ping_internal | PING intended constitutional DB |
| brain-postgres | postgres:15-alpine | Up 2h | 5432→5432, unless-stopped | bridge (.2) | Unrelated brain stack |
| brain-qdrant | qdrant/qdrant:latest | Up 2h | 6333-6334 | bridge, compose_brain_internal, ping-shared | Unrelated brain stack |
| ollama | ollama/ollama | Up 2h | 11434 | bridge, ping-shared | Shared LLM runtime |
| crx-ui-next | crx-ui-next:latest | Up 2h (healthy) | 3000→3000 | bridge (.3) | Unrelated CRX UI |
| open-webui | ghcr.io/open-webui/open-webui:main | Up 2h (healthy) | 3001→8080 | crx-digestion-worker_default | Unrelated chat UI |
| ping-qdrant | qdrant/qdrant:latest | Created, never started | — | (intended ping_ping_internal) | PING dormant |
| ping-redis | redis:alpine | Created, never started | — | ping_ping_internal | PING dormant |
| ping-vault | hashicorp/vault:latest | Created, never started | — | ping_ping_internal | PING dormant |
| ping-ollama | ollama/ollama:latest | Created, never started | — | ping_ping_internal | PING dormant |
| ping-worker-runtime | ping-worker-runtime (local) | Exited 255, 11d ago | — | constitutional-runtime_ping_internal | PING dormant/broken |
| qwen3-tts-service | qwen3-tts-docker-qwen3-tts:latest | Exited 255, 4h ago | 5000→5000 | bridge | Unrelated broken experiment (13GB image) |

### Images (notable)
`curious-squid-gateway:latest` (in use) vs `ping-gateway:latest` (same size, no container uses it, superseded tag); `temporalio/auto-setup:latest` present with NO temporal container; `crx-gateway:1.0.0` + `:latest` with no running container; `gateway-test:latest`; postgres 16 and 18-alpine unused; redis:7-alpine unused; `worker-runtime:latest` vs `ping-worker-runtime:latest` (two similar local builds).

### Volumes
Compose-labeled generations: `constitutional-runtime_*`, `curious-squid_*`, `ping_*` (each with ping_postgres/ping_qdrant sets), `compose_*`, `crx-digestion-worker_*`, `crx_ollama-data`. Unlabeled: `muse-workspace` (gateway), `pgdata`, `qdrant_storage` (owning containers UNKNOWN, likely from removed containers). INFERRED: three compose project generations (`ping` → `constitutional-runtime` → `curious-squid`); only the constitutional-runtime postgres volume is live.

### Networks
bridge (172.17.0.0/16: brain-postgres, crx-ui-next, ollama, brain-qdrant, ping-gateway), constitutional-runtime_ping_internal (172.23: ping-postgres), curious-squid_ping_internal (172.22: ping-postgres), ping_ping_internal (172.24: empty, dormant stack's intended home), compose_brain_internal, ping-shared, crx-digestion-worker_default, crx_crx-network (empty), ai-network (empty), qwen3-tts-docker_default (empty).

### Critical data-path finding (OBSERVED + INFERRED strong)
Gateway env: `POSTGRES_HOST=host.docker.internal`, `POSTGRES_PORT=5432`. From a bridge-network container on Docker Desktop Windows, that resolves to the Windows host's port 5432, published by **brain-postgres**, NOT ping-postgres (5433, on internal networks the gateway cannot reach). This is the likely cause of the "password authentication failed for user ping_user" degraded mode. `ping-postgres` is running and healthy but unreachable from the gateway by both network and port. Its initdb mount carries the constitutional schema (`.../canonical_state/schema.sql`), confirming it is the intended DB.

---

## 9. SSH topology

**Client path (OBSERVED):** `ssh -p 22 -i ~/.ssh/id_ed25519 -o BatchMode=yes -o ConnectTimeout=15 -o "ProxyCommand=nc -X connect -x hatch-egress-proxy:3130 %h %p" muse-ssh@100.79.154.43`. Client OpenSSH_9.6p1. Remote shell cmd.exe. The proxy hop is INFERRED to be an HTTP CONNECT tunnel (behavior proven; internals UNKNOWN).

**Server (OBSERVED):** `C:\Windows\System32\OpenSSH\sshd.exe`, Running, Automatic, LocalSystem, PID 37340, listening 0.0.0.0:22 and [::]:22.

**Effective config (OBSERVED, raw `sshd_config`; `sshd -T` returned empty over this channel, a cosmetic quirk):**
```
StrictModes no
PubkeyAuthentication yes
AuthorizedKeysFile    .ssh/authorized_keys
PasswordAuthentication no
Subsystem    sftp    sftp-server.exe
AllowUsers muse-ssh
LogLevel DEBUG3
Match Group administrators
       AuthorizedKeysFile __PROGRAMDATA__/ssh/administrators_authorized_keys
```

**Critical topology finding (OBSERVED + INFERRED, high confidence):** because muse-ssh is in BUILTIN\Administrators, the `Match Group administrators` block applies, so the effective authorized-keys file is `C:\ProgramData\ssh\administrators_authorized_keys`, NOT `C:\Users\muse-ssh\.ssh\authorized_keys`. Both files contain the hatch key (fingerprint `SHA256:JjeruGidlC9g1h5Xg8GAenVqVYDQJhtZeqZEAt6ueJA`, verified via ssh-keygen -lf on both), so auth succeeds either way. Most of today's debugging targeted the user-profile file, which is currently irrelevant while the account holds admin membership. If muse-ssh were removed from Administrators, the effective path flips back to the user-profile file (which also holds the correct key, so auth would survive).

**Auth model:** pubkey-only in effect (`PasswordAuthentication no`; `kbdinteractiveauthentication yes` is INFERRED harmless on Windows as it maps to disabled password auth). `AllowUsers muse-ssh` single-user restriction. ACLs on both authorized_keys files are clean (Administrators/SYSTEM/muse-ssh only). `AllowTcpForwarding yes` / `AllowAgentForwarding yes` at defaults.

**Leftovers from today's debugging (OBSERVED, not changed):** `LogLevel DEBUG3` (verbose auth logging), `StrictModes no`.

**Anomaly on record:** `sshd.exe -d -p 2222` once printed `get_passwd: lookup_sid() failed: 1332` at startup before any connection arrived; service context resolved the account fine throughout. Root cause UNKNOWN; not reproduced (would require stopping the running service; out of read-only scope).

---

## 10. PING constitutional boundary analysis

**Canonical repo state (OBSERVED):** `C:\Users\nolan\PING` (git: crx-runtime), HEAD 6e359a26 on main, 2026-07-31. 22,964 tracked files (72% node_modules), 1,051 changed/untracked paths in working tree, 17 local branches (3 on remote), 6 worktrees, 6 stashes. README.md is one line (`# crx-runtime`).

**Declared authority map:** `constitutional.lock` enforces "Law 017" (one owner per concern): Authority→`runtime/kernel/authorities`, Identity→`runtime/kernel/identity`, Replay→`runtime/kernel/replay`, Projection→`runtime/kernel/projection`, Evidence→`runtime/evidence`, Registry/Compiler→`constitutional-compiler`, Runtime→`runtime`. The lockfile itself notes drift (missing knowledge/graph.py, missing runtime/kernel/registry).

**Subsystem map (OBSERVED from docstrings/headers):** `runtime/` (declared canonical executable runtime per SOURCE_OF_TRUTH.md 2026-09-11; `runtime_kernel.py` "single constitutional scheduler"), `runtime/kernel/` (authorities, identity, replay [TS: canonical_event_envelope.ts, canonical_hash_authority.ts], projection, execution, governance, repository, scheduler, state, witness, workers, commit-service, events, leases, mission, knowledge, providers, capabilities, config), `constitution/` (CANONICALIZATION_LAW.md, HASH_LAW.md, LINEAGE_LAW.md, POLICY_LAW.md; `laws/` subdir EMPTY, a ghost), `database/` (2 SQL migrations), `certification/` (hashes, reports, vectors; tests/corpus has real replay vectors), root schemas `event_envelope_schema.json` / `evidence_envelope_schema.json`.

**Boundary verdict (INFERRED, high confidence):** the intended hierarchy (constitutional authority → gateway/governance → isolated workspace → execution) is structurally present in the gateway's authorization code (fail-closed, explicit repo mapping, canonical-repo protection, path containment with realpath). It is NOT verifiably connected to the live constitutional runtime: the gateway runs in degraded in-memory mode, knowledge/event search fail, audit is not durable, and the canonical Python/TS runtime was not observed running anywhere (no process inventory of it performed; UNKNOWN). The gateway is a genuine governance boundary for its advertised surface, but it currently governs against in-memory state, not the constitutional authorities.

**Sovereignty notes:** canonical PING is not writable through the gateway (OBSERVED: integrity checks pass; no route maps to it). SSH admin rights do not constitute authorization to mutate it (respected: zero writes). The gateway image bakes a full copy of the PING tree at `/app` (570MB COPY), which is a second physical copy of canonical source inside a network-reachable container (read-only exposure; noted, not acted on).

---

## 11. Social and application-access inventory (Muse-side, read-only)

What this agent can already reach without new logins or new OAuth scopes:

| Service | Access | Read-only? | Notes |
|---|---|---|---|
| Gmail | Connected (connector) | Yes for reads; sends are the outreach channel (capped 10/day UTC) | Primary outreach + reply detection |
| Google Calendar | Available via skill | Reads observed working | Event research |
| Instagram (`nolanpigi`) | Cloud browser session, stable | Likes/comments only per Nolan's "not yet" rule; no DMs, follows, posts | Pass 6 done 2026-09-12, no warnings |
| Facebook | Cloud browser sessions (expire within ~2h; auto re-login flow exists) | Likes/comments/DMs only while session alive | facebook-session-watch cron every 2h; laptop-browser route pending (Nolan's weekend project) |
| Messenger CLI | Available | Contact-restricted | Not a DM channel for prospects |
| Spotify | Connector exists | Yes | Unrelated to outreach |
| social.search | Works (IG/Threads/FB public posts) | Yes | Signal discovery, labeled signal/unverified/confirmed |
| PING gateway (L1/L2) | Bearer auth proven from cloud runtime | Capability-scoped (workspace fs, git, repo inspect) | Tokens in container env; re-resolvable via SSH; never persisted |
| Pig SSH | `muse-ssh`, admin token | Policy: read-only unless Nolan authorizes a write | Full shell + docker CLI |
| Quo (phone platform) | Referenced as comms platform; no verified agent access path | UNKNOWN | Would be useful for call logging later |

No new services were logged into and no new OAuth scopes authorized during this audit. Potentially useful later (needs Nolan's call): Quo access for call/reply logging, PING Social Facebook Page admin for follow-invites (URL still pending from Nolan), Google Workspace (in progress per Nolan).

---

## 12. Discovered strengths

1. **The exterior-agent loop genuinely works end to end** (OBSERVED today from the cloud): SSH in, gateway auth at both levels, capability discovery, live fs.list, workspace persistence across a Windows restart, git commit on a normalized main branch, canonical PING untouched.
2. **Fail-closed authorization design** in the gateway: unknown agents denied, user-supplied repoId/workspace rejected against the registry, canonical repo explicitly protected, path containment with realpath, sanitized errors.
3. **Network posture for SSH is sound**: Tailscale-only reachability via Private-profile firewall rule; LAN and internet blocked (OBSERVED rule + NLA categories + NAT).
4. **The intended constitutional DB exists and is healthy**: ping-postgres running, carrying the constitutional schema initdb mount. The data layer is ready; only the gateway's pointer is wrong.
5. **Provenance is traceable**: image build time matches source mtimes; hardening changes confirmed in the running container.
6. **Documentation discipline on the gateway side**: prior reports (baseline, post-restart verification, SSH issue) exist and were accurate enough to build on.

## 13. Discovered weaknesses

1. Gateway Postgres misdirection (degraded mode; no durable audit; knowledge/event search dead; route families 503).
2. Denied-path control ineffective (regex anchored to absolute path; never matches).
3. Broad unauthenticated gateway surface beyond `/capabilities` (AI POSTs, connector sync/oauth, ops, governance, health disclosing agent IDs).
4. Running gateway has no git home (operational code untracked in a worktree; canonical main holds a stub).
5. Gateway restart policy `no` + binds 0.0.0.0 (availability + surface).
6. `muse-ssh` is a full admin with "Password required: No" (leftover; decision needed).
7. sshd leftovers: LogLevel DEBUG3, StrictModes no.
8. C: at 3.7% free (48.6GB build cache, 13GB broken TTS image, dormant volumes).
9. Capability registry drift (hardcoded discover metadata vs code).
10. Canonical repo sprawl: 100+ audit/report MDs, 72% node_modules tracked, no root .gitignore, nested unregistered git repos in knowledge/ and vos/, empty placeholder dirs, 7 gateway system_authority variants, tmp debris, encoding-mangled filenames.
11. Broken container references in root Dockerfile (HEALTHCHECK/CMD invoke a file that never existed in any branch).
12. Port collision smell: commit-service and gateway both default to 8080.
13. Gateway image bakes full 570MB PING tree (build hygiene; also a second copy of canonical source in a networked container).
14. Auth footgun: missing env keys would generate random keys printed to docker logs; no constant-time key comparison; unbounded in-memory audit array; requestId from timestamp hash (not replay-deterministic).
15. Duplicate backing services (two postgres, two qdrant, two ollama definitions; only one of each live) and three compose project generations with parallel volume sets.
16. `tailscale` CLI unusable as muse-ssh (observability gap, minor).

## 14. Contradictions

1. **Deployed vs canonical**: the running gateway (full capability boundary) vs `main`'s gateway (stub). What runs is not what `main` describes.
2. **Discover vs code**: git.branch advertised as "Create Git branch" but only lists; git.checkout param name mismatch; knowledge.search registered IMPLEMENTED but errors at runtime.
3. **Comment vs behavior**: gateway CORS comment claims "Remove wildcard CORS" while code reflects request origin (effectively wildcard).
4. **Lockfile vs reality**: constitutional.lock declares single owners; notes its own drift (missing modules).
5. **Two postgreses**: gateway env says one thing (host.docker.internal:5432), the healthy constitutional DB is another (5433, unreachable networks).
6. **sshd -T empty** over this channel while the service demonstrably enforces its config (cosmetic, but an observability wrinkle).
7. **The 1332 startup anomaly** vs flawless service-context account resolution (unexplained; documented, not reproduced).

## 15. Stale documentation

- `ARCHITECTURE.md` describes a Google Drive website-sync pipeline (a different era).
- SOURCE_OF_TRUTH.md (2026-09-11) references a `schema/` dir that does not exist; AGENT.md points to `knowledge/authoritative/UCIA-CONSTITUTION-v1.0.md` (nonexistent; content at `knowledge/derived/UCIA_v1.0.md`).
- Root Dockerfile HEALTHCHECK/CMD reference `runtime/replay/src/constitutional_self_check.ts`, which never existed in any branch.
- Pig-side execution reports describe SSH as "blocked" (true at the time; now superseded: SSH works).
- `gateway/package.json` name `crx-gateway` v1.0.0 (legacy CRX naming).
- Worktree branch name (`opencode/curious-squid`) vs actual branch (`constitutional-convergence-v2`).

## 16. Missing pieces

- Durable Postgres-backed audit and credential store (degraded mode).
- Adversarial test suite for the gateway's security invariants (path traversal, symlink, encoding, authz bypass).
- HTTP hardening: rate limiting, request schema validation, bounded responses, honest CORS.
- Request/response replay determinism (requestId is a timestamp hash).
- Git home for the operational gateway implementation.
- Root .gitignore and a decision on committed build artifacts.
- A runbook for the gateway (current launch is an imperative docker run living in shell history).
- Tailnet peer/ACL visibility from the service account path.
- Process inventory of any live PING runtime (Python/TS) beyond the gateway.

## 17. Dormant infrastructure worth preserving (do not clean without explicit say-so)

- `ping-qdrant`, `ping-redis`, `ping-vault`, `ping-ollama` (created, never started; the intended backing-services stack on `ping_ping_internal`).
- `ping-worker-runtime` (exited 255; may hold useful failure evidence).
- `temporalio/auto-setup:latest` image (no container; temporal was clearly planned).
- `ping-gateway:latest` image tag (superseded but may be a rollback candidate).
- `archive/` legacy authorities/constitution/graphs/migrations in canonical PING.
- 6 git stashes and 17 local branches (unpushed work).
- Anonymous volumes `pgdata`, `qdrant_storage` (owners unknown; may hold data).
- The opencode worktrees (calm-garden, eager-moon, kind-comet) beyond curious-squid.

## 18. High-leverage next actions (minimum change for each; authorization required)

1. **Fix gateway Postgres pointer.** Minimum: attach `ping-gateway` to a network reaching `ping-postgres` and correct `POSTGRES_PORT` to 5433 (container recreate with corrected env). Ends degraded mode: durable audit, knowledge/event search, PG route families. (Alternative minimum: formally accept degraded mode and stop treating PG-backed features as available.)
2. **Fix denied-path matching.** Minimum: anchor patterns to the workspace-relative path instead of the absolute canonical path. Small code change, rebuild, re-probe. Makes the documented credential protection real.
3. **Scope gateway authentication.** Minimum: apply the auth middleware (or an explicit public-route allowlist) to non-`/capabilities` routes, at least the POST surfaces (`/ai/*`, `/connectors/:name/sync`, oauth initiation) and `/ops`, `/governance`; strip agent IDs from `/capabilities/health` or put it behind auth.
4. **Gateway availability + surface.** Minimum: recreate with `--restart unless-stopped` and publish 8080 on the Tailscale interface only.
5. **sshd leftovers.** Minimum: `LogLevel DEBUG3` → `INFO`, `StrictModes no` → `yes`, restart sshd service. Separate decision: keep or remove muse-ssh's Administrators membership (auth survives removal; both key files already hold the hatch key), and set a password or disable blank-password logon on the account.
6. **Give the gateway a git home.** Minimum: commit the worktree's operational gateway files to a new branch (never main) so the security boundary has provenance; tag the image to the commit.
7. **Disk pressure.** Minimum: `docker builder prune` (reclaims ~21GB) and remove the broken 13GB qwen3-tts image; revisit before C: fills.
8. **Registry truthfulness.** Minimum: correct discover metadata to match code (git.branch lists-only, git.checkout param `branch`, knowledge/event search PG-gated).
9. **Image hygiene.** Minimum: add `.dockerignore` so the full PING tree is not baked into the gateway image; rebuild.
10. **Dormant stack decision.** Start the `ping-*` backing stack, or leave dormant; either way, record the decision. (Temporal image with no container deserves the same call.)
11. **Repo hygiene (canonical).** Minimum: add root `.gitignore` to stop the bleeding (node_modules, dist, .pyc, .env). Deeper cleanup (sprawl, nested repos, HEAD binary pollution) is a separate, larger decision.

## 19. Evidence and commands used (all read-only)

Windows/SSH/network: `ver`, `Get-ComputerInfo`, `net user`, `net localgroup administrators`, `whoami /groups`, `Get-Service`, `sc qc sshd`, `schtasks /query`, `netsh advfirewall firewall show rule name=all`, `netstat -ano` + tasklist mapping, `ipconfig`, `Get-NetIPAddress`, `tailscale status` (401, documented), `sshd -T` (empty; documented), direct read of `C:\ProgramData\ssh\sshd_config`, `ssh-keygen -lf` on both authorized_keys files, `Test-NetConnection`, `wmic`/Get-PSDrive disk checks, top-2-level dir listings of PING/worktree/muse-ssh/ProgramData/ssh.

Docker: `docker version`, `docker ps -a`, `docker images`, `docker volume ls`, `docker network ls`, `docker system df`, `docker inspect` (ping-gateway, networks, volumes), `docker logs --tail 60 ping-gateway`, `docker image inspect curious-squid-gateway:latest`, `wsl -l -v`.

PING repo: `git status/log/branch/worktree list/remote -v/stash list` (with `-c safe.directory`), dir listings, header reads of runtime_kernel.py, constitutional.lock, SOURCE_OF_TRUTH.md, package manifests, schema files; `git log --all` for the never-existing HEALTHCHECK file.

Gateway: source reads (server.js, gateway_runtime.js, capability_authority.js, workspace_registry.js, routes/capabilities.js, auth middleware, Dockerfile, package.json), live probes from cloud runtime (`GET /capabilities/discover` L1+L2, `POST /capabilities` fs.list/fs.read incl. secrets/probe.txt and .env, `GET /capabilities/health`, `/constitution`, `/connectors`, `/ai/*`, `/ops/*`, `/governance/*`).

## 20. Confidence register

- **High:** machine identity and resources; SSH path, effective config, and firewall posture; docker inventory (containers/images/volumes/networks); gateway container/image/provenance; both gateway credential levels authenticating from the cloud; fs/git capability execution; denied-path bypass (live probe); unauthenticated surfaces (live probe); repo git state and structural maps; secret-bearing locations (names only).
- **Medium:** gateway→brain-postgres as the degraded-mode cause (network path observed; credential-mismatch mechanism inferred strong); Match-block admin file being the consulted authorized_keys (both files hold the key; indistinguishable without debug logs); subsystem purpose descriptions (from docstrings/headers, not execution); proxy internals (behavior proven, internals unknown).
- **Low/UNKNOWN:** adversarial robustness of path containment; Tailscale peers/ACLs/exit nodes; purpose of tailscaled's tailnet-bound ports; root cause of the 1332 startup anomaly; whether any PING runtime process runs beyond the gateway; whether `ping-runtime/` is dead code; full ghost-import inventory; contents of stashes and nested repo histories; LAN/internet reachability of :8080 and other docker-published ports.

---

*End of baseline. No changes were made to produce it. The execution queue in section 18 awaits explicit authorization, item by item.*
