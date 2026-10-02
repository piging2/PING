# P2: decision surfaces (2026-09-24)

Three decisions. Each is stated exactly; everything else in the lane is
done or deliberately held.

## D1 (Vault): authorize the durable-storage recreation — YES or NO

**Exact action:** recreate `ping-vault` WITHOUT `["server","-dev"]`, with a
raft (or file) storage config, persistent volume, and the fixed healthcheck
(`CMD-SHELL: VAULT_ADDR=http://127.0.0.1:8200 vault status`), per
p2-vault-migration-plan.md sections 4–6.

**Evidence attached:**
* Vault holds NO SECRETS: `secret/` kv empty, custom `agent-registry/` mount
  empty, storage is inmem; zero code writers/readers (verified by codebase
  + container + env scan). Only mount names/types and key listings were
  read; no secret values touched.
* Recreation wipes only the inmem backend, which is already wiped on every
  restart. Data-at-risk: zero.
* Cost of YES: one container recreation; operator must unseal after every
  future restart (shamir) until auto-unseal exists; "who adopts Vault first"
  becomes a real question for the secret-broker lane.
* Cost of NO: keep the hold; accept that any restart/reboot wipes Vault
  silently and the false `unhealthy` keeps masking real failures.

**Recommendation:** YES, in a bounded window, because the blast radius is
provably zero today and every week of delay keeps a fake-unhealthy dev
server as the fleet's "secret store". But the standing HOLD order names
Nolan, so this waits for his word regardless of the evidence.

## D2 (CosyVoice): keep `cosyvoice-tts` up, or stop it to reclaim ~1.8 GiB

**Exact action (if stop):** `docker stop cosyvoice-tts`. Reversal:
`docker start cosyvoice-tts` (seconds). No data loss: models and scripts
are host binds.

**Evidence attached:**
* Recreated 2026-09-24 06:30 MDT (today) — someone stood it up this morning.
* Zero production consumers (verified); Nolan's paused voice-cloning rig.
* 1.787 GiB RAM, 0.01% CPU on a 31 GiB host.

**Recommendation:** KEEP IT UP (default). Stopping would fight this
morning's deliberate recreation. Revisit only if the host is memory-
pressured or Nolan says the voice work is dead.

## D3 (Healthchecks): authorize a bounded maintenance window for postgres/ollama probes

**Exact action:** recreate `ollama`, `ping-postgres`, then `brain-postgres`
with the healthchecks in p2-healthchecks-postgres-ollama.md (pg_isready /
/dev/tcp probes). Order: ollama first, brain-postgres last.

**Evidence attached:**
* All three have NO healthcheck today; docker health is signal-free for them.
* Recreation = brief downtime: ollama ~30–90s; brain-postgres seconds–1 min
  during which the LIVE gateway cannot reach its DB.

**Recommendation:** approve ollama + ping-postgres anytime (low blast
radius); schedule brain-postgres with the gateway watched. No outage will
be manufactured without this authorization.

---

Non-decisions (recorded, no action needed):
* Host 5432: `brain-postgres` is the sole owner; no collision; no claimant
  to reject. Guard documented in p2-postgres-5432-reconciliation.md.
* `ping-qdrant`: classified decommission candidate; deletion NOT authorized
  (needs D-level approval beyond this lane).
* Mission Control patch: spec written (p2-mission-control-patch.md); apply
  needs the :3100 restart go-ahead, which rides with D3's window or its own.
