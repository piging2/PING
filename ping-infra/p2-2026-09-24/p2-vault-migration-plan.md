# P2: Vault — hold recreation; inventory, durability, migration plan (2026-09-24)

Standing order: CONTINUE HOLDING recreation. This doc completes everything
up to the destructive step, autonomously, without exposing secret values.

## 1. Non-secret dependency inventory (verified)

| question | finding |
|---|---|
| Live writers | NONE. Zero code references to `VAULT_ADDR`, port 8200, or vault clients in workspace source (py/js/ts/sh/yml, excluding agent tool-output noise). |
| Live readers | NONE. `src/lib/secrets/secret-broker.ts` mentions Vault only as a harvested design mechanism in a docstring ("lease/TTL ceilings + revocation kills outstanding handles"); it is not a Vault client. Gateway image `/app` vault hits are orchestration JSON docs, not code. |
| Network | `ping-vault` on `ping_ping_internal`, host :8200 published. Reachable, but nothing calls it. |
| Stored secrets | NONE. Mounts: `secret/` (kv-v2, empty: "No value found at secret/metadata"), `agent-registry/` (custom type `agent_registry`, empty: "No value found"), plus Vault-internal `cubbyhole/`, `identity/`, `sys/`. No secret values were read; only mount names/types and key listings. |
| Note on the earlier probe | The first `kv list -format=json` returned `{}`; the plain `kv list` clarifies: the kv engine is mounted but holds no data. The `agent-registry/` mount is a leftover custom engine (likely a PING agent-registration experiment), also empty. |
| Bearer-token handling | Per standing memory, gateway bearer tokens are re-resolved via SSH env and never written to files; Vault was never in that path. |

Conclusion: **ping-vault is a running, secret-free, in-memory dev server with zero
dependents.** Nothing in the fleet reads from or writes to it. (An empty
custom `agent-registry/` mount exists; it holds no keys.)

## 2. Durability requirements

* Current: `command: ["server", "-dev"]` → **inmem storage**. ANY container
  restart, recreation, host reboot, or OOM kill **irreversibly wipes all
  Vault content**. The three mounted volumes (`ping_ping_vault` →
  `/vault/data`, plus anonymous `/vault/file`, `/vault/logs`) receive no
  writes; they are dead weight.
* Required for production use: `storage "raft"` (or `"file"`) with a real
  config file, persistent volume, unseal material handled outside the
  container, and a backup/restore procedure. Dev mode must never hold
  anything that cannot be re-created from another source.

## 3. Export / backup procedure (current state)

Because storage is inmem and the kv tree is empty, there is nothing to
export. The honest procedure, for the record, once Vault holds real data:

1. Authenticate with the root/operator token (from the Secure Vault, never
   chat/files).
2. `vault kv list -recursive secret/ > inventory.txt` (names only).
3. For snapshot-capable storage: `vault operator raft snapshot save
   /vault/data/raft.snap` (raft) — or stop-the-world file copy for
   `storage "file"`.
4. Copy the snapshot off-host (Pig → local) and record its SHA-256.
5. No backup automation exists today (consistent with the MC
   `risk:no-pig-db-backup` finding: no /opt/ping/backups, no timers).

## 4. Migration plan (dev → durable)

Goal: `ping-vault` runs production storage with zero secret loss.

1. **Pre**: re-run the inventory in section 1 (confirm still empty, still no
   consumers). Record `docker inspect` of the live container.
2. **Write config** `/vault/config/vault.hcl` (raft):
   `storage "raft" { path = "/vault/data" }`, `listener "tcp"`
   on 8200, `api_addr`, `cluster_addr`, `disable_mlock` as appropriate.
   Mount the config read-only into the container.
3. **Recreate** the container WITHOUT `-dev`, with `cap_add: [IPC_LOCK]`,
   same ports/volumes/networks, and the FIXED healthcheck
   (`CMD-SHELL: VAULT_ADDR=http://127.0.0.1:8200 vault status`) from the
   reconstructed compose.
4. **Initialize**: `vault operator init` (1 key / 1 share is the current
   dev-equivalent posture; record who holds the unseal key and root token:
   Secure Vault, never chat).
5. **Unseal**, verify `sealed: false`, verify the fixed healthcheck flips
   the container to healthy.
6. **Re-point** the one intended consumer pattern: nothing today; the
   secret-broker lane owns first real adoption.
7. **Prove**: kill and restart the container; assert data survives
   (write a canary kv entry pre-restart, read it post-restart, delete it).

## 5. Rollback

* Before step 3, the old container config is saved (inspect dump).
* Rollback = recreate with the old `["server","-dev"]` command. Because the
  old storage was inmem and verified empty, rollback loses nothing that is
  not already ephemeral. Rollback does NOT recover anything written
  between migration and rollback; the canary procedure bounds that window
  to minutes.

## 6. Restart proof plan

* Post-migration: `docker restart ping-vault`, then assert:
  `seal-status.sealed == false` (raft auto-unseal is NOT configured; with
  shamir seal the operator must unseal after every restart — record this as
  an operational cost), canary kv entry readable, docker health = healthy.
* Document the unseal-after-restart runbook (who, with what key, from
  where). Without it, the first host reboot seals Vault and every future
  consumer fails closed.

## 7. Why recreation is still on HOLD

The migration's step 3 (recreation) is the destructive/durability-affecting
step: it wipes the inmem backend. Today that wipes nothing of value
(sections 1–3 prove it), so the blast radius is zero — but the standing
order is explicit (recreation HOLD, Nolan-level decision per the
reconstructed compose warning), and the unseal-after-restart operational
cost plus "who adopts Vault first" are genuine decisions, not engineering
details.

**The one exact decision** (in p2-decisions.md): authorize recreating
ping-vault with raft/file durable storage now (zero data at risk, verified),
or keep the dev-mode hold and accept that any restart wipes Vault
unknowingly.

## 8. Immediate safe fix available (no recreation)

The false `unhealthy` is a probe bug (CLI defaults to https, dev server
speaks http). It cannot be fixed without recreation (healthcheck is
create-time config), so it rides along with the migration decision above.
The MC `incident:vault-health-probe` correctly reflects this today.
