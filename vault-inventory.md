# Vault Inventory (non-secret only) — 2026-09-24

## Status

- Container `ping-vault`: Up 2 days, **unhealthy** (healthcheck `vault status` failing).
- Mode: **dev server** (VAULT_DEV_ROOT_TOKEN_ID, listen 0.0.0.0:8200). Dev mode
  is in-memory by default.
- Volumes: `ping_ping_vault` → /vault/data (rw). Note: dev server does not
  persist secrets to this volume by default — treat as non-durable.
- Port 8200 published on host.

## Secret categories (types only, no values)

KV v2 engine mounted at `/ping`. Secret paths the codebase reads
(`runtime/constitutional/secret_adapter.py`, class SecretAdapter):

- openai (API key)
- anthropic (API key)
- google (API key)
- postgres (password + connection config)
- qdrant (API key)
- jwt (signing key)
- google_drive (OAuth/client secret)
- generic path/key accessor

Auth: AppRole (`ping-app` role) per setup_vault.py; token auth in dev.

## Consumers and restart-survival

Consumers (via `get_secret_adapter()`):
- `runtime/retrieval/retrieval_service.py`
- `runtime/projection_worker/constitutional_projection_worker.py`
- `runtime/configuration.py` (postgres password, qdrant key)
- `runtime/adapters/google_drive/google_drive_ingestion_adapter.py`

Restart-survival: **all reads fall back to environment variables**
(`SecretAdapter._fallback_to_env`). A vault restart or total data loss does
NOT break consumers — they degrade to env. The vault is effectively
vestigial today: dev-mode, unhealthy, in-memory, with env as the live path.

## Verdict

Vault migration/recreation: HOLD (per directive). No values read, no
recreation attempted, no migration implemented. If the vault is ever
decommissioned, the env-fallback path means zero consumer breakage — but
that decision is a future wave, not this one.
