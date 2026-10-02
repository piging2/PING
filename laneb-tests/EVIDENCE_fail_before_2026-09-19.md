# LANE B fail-before evidence — SEC-001 / SEC-002 (2026-09-19)

Lane: B (tenant registry + /mc business-data security). Worktree:
`/home/nolan/worktrees/constitutional-convergence`, branch
`constitutional-convergence-v2`, HEAD `395b9759ee4fb6067303d4775f4f14699d7dc705`.

## 1. Objective-1 result: source-proven current state

**ERA-R (live tree `~/ping-gateway-src/gateway/bootstrap/gateway_runtime.js`):**

| Mount | Line | Auth |
|---|---|---|
| `/events` | 790 | `exteriorAuthMiddleware.middleware()` |
| `/context` | 791 | NONE |
| `/api/v1/repository` | 792 | NONE |
| `/system` | 793 | NONE |
| `/canonical-events` | 794 | `exteriorAuthMiddleware.middleware()` |
| **`/tenants`** | **795** | **NONE — SEC-001** |
| `/deployments` | 796 | NONE |
| `/runtime` | 797 | NONE |
| `/ingest` | 798 | `exteriorAuthMiddleware.middleware()` |
| `/missions` | 915 | `exteriorAuthMiddleware.middleware()` |
| `/ai` | 918 | `exteriorAuthMiddleware.middleware()` |
| `/connectors` | 920 | `exteriorAuthMiddleware.middleware()` |
| **`/mc`** | **921** | **NONE — SEC-002** |

**ERA-C (this worktree, `gateway/bootstrap/gateway_runtime.js`, 169 lines):** no
authentication mechanism exists anywhere in the tree — zero hits for
`exteriorAuthMiddleware`, `authenticatedAgent`, `exterior_agent_credentials`.
`/tenants` is served via `_buildPgHandlers` line 109
(`'/tenants': routes.tenants(services.tenantRegistry)`, reached through the
`_pgRoute` indirection at line 137); `/mc` is mounted at line 155
(`this._app.use('/mc', routes.missionControl({...}))`). Both public.

**Mechanism reused:** `ExteriorAuthMiddleware`
(`~/ping-gateway-src/gateway/exterior_auth_middleware.js`): Bearer API key →
`exterior_agent_credentials` lookup → agent identity on `req.authenticatedAgent`;
401 `MISSING_AUTH` / `INVALID_CREDENTIAL`; fail-closed; in-memory degraded mode
when Postgres is down. Ported to `gateway/exterior_auth_middleware.js` with one
deliberate security divergence from the ERA-R copy: generated key material is
never logged (ERA-R prints generated keys to stdout; the port redacts them —
never expose secret values).

## 2. Endpoint classification (current → target)

Target for all 35: **AUTHENTICATED**. AUTHORIZED / NAMESPACE_SCOPED deliberately
not introduced: TEN-001 (no agent↔tenant binding exists anywhere) is a genuine
operator decision for Nolan, not a patchable defect. All endpoints are READ_ONLY
(all GET) except the /tenants mutations.

### /tenants (`gateway/routes/tenants.js`) — 6 endpoints, all PUBLIC today

| Endpoint | Mutating? | Data | Today | Target |
|---|---|---|---|---|
| POST /tenants | MUTATING | creates tenant row | PUBLIC | AUTHENTICATED |
| GET /tenants | READ_ONLY | tenant registry listing | PUBLIC | AUTHENTICATED |
| GET /tenants/:id | READ_ONLY | tenant record | PUBLIC | AUTHENTICATED |
| PUT /tenants/:id | MUTATING | updates tenant row | PUBLIC | AUTHENTICATED |
| DELETE /tenants/:id | MUTATING | removes tenant row | PUBLIC | AUTHENTICATED |
| POST /tenants/:id/heartbeat | MUTATING | writes heartbeat | PUBLIC | AUTHENTICATED |

### /mc (`gateway/routes/mission_control.js`) — 29 endpoints, all PUBLIC today, all READ_ONLY

Business/customer data (default NOT PUBLIC):
`/dashboard`, `/business/who-needs-followup` (lead ids, estimate amounts,
unanswered review texts), `/business/stalled-estimates` (amounts, sent_to
emails), `/business/pending-reviews` (review text, customer_id),
`/business/ai-recommendations`, `/business/today-work`,
`/business/unpaid-invoices` (amounts, sent_to emails),
`/business/at-risk-projects` (project names, customer_ids), `/business/marketing`
(lead descriptions, 5-star review texts), `/inbox` (raw events), `/queues`,
`/queues/:eventType`, `/activity`, `/missions/active`, `/missions/pending`,
`/missions/stats`, `/missions/:id/trace` (full causal chain), `/knowledge`,
`/replay/stats`, `/witness/stats`, `/replay/trace/:correlationId`,
`/dead-letters`, `/dead-letters/stats`, `/dead-letters/:id` (failed-job payloads).

Internal operational data (also not public): `/system` (AI/connector health,
worker/scheduler/bridge stats, memory usage — note: NO `requirePG` guard),
`/bridge`, `/event-mission-bridge`, `/scheduler`, `/workers` (all four: NO
`requirePG` guard either).

## 3. Live read-only reproduction (no mutations performed)

Against the running Pig gateway, GET only:

```
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/mc/business/who-needs-followup  -> 200
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/tenants                        -> 200
```

Business-intelligence payload and tenant registry listing are served without any
credential. Write-side exposure (POST/PUT/DELETE /tenants) follows from source:
all six routes share the same unauthenticated router (the audit's accidental
probe demonstrated POST once; not repeated here per the no-live-mutation rule).

## 4. Fail-before test run (pre-fix tree, this commit's tests)

`node tests/security/test_mount_wiring_contract.js` — **0 passed, 4 failed**:

```
FAIL ExteriorAuthMiddleware module is required by gateway_runtime.js
FAIL ExteriorAuthMiddleware is instantiated and initialized
FAIL SEC-001: /tenants handler is wrapped in exterior auth (not public):
     '/tenants': routes.tenants(services.tenantRegistry),
FAIL SEC-002: /mc mount carries exterior auth middleware (not public):
     '/mc' app.use line is not in auth-wrapped form
```

## 5. Post-fix proof (handoff diff applied to a /tmp COPY of gateway_runtime.js;
   worktree file untouched — Lane A sequences the real apply)

- `node /tmp/vcf2.js` (contract assertions vs fixed copy): **5 passed, 0 failed**,
  including "all 8 other pg-handler entries intact" (no collateral change).
- `node --check` on the fixed copy: parses.
- `NODE_PATH=/tmp/laneb-test/node_modules node tests/security/test_tenants_mc_auth.js`:
  **107 passed, 0 failed** — all 35 endpoints × (unauth→401, wrong key→401,
  valid key→authorized), plus business-payload and authorized-mutation spot checks,
  against the REAL route modules + REAL middleware composed exactly as the
  proposed mount lines.
- `node tests/security/test_exterior_auth_middleware.js`: **8 passed, 0 failed**
  (missing/invalid/expired/inactive key → 401; valid → identity attached;
  last_used_at written; in-memory degraded mode).

## 6. What was NOT done (boundaries honored)

- No mutating requests against live surfaces (no POST/PUT/DELETE probes).
- No production/Oracle state touched; all tests use isolated fakes.
- No changes to `gateway/bootstrap/gateway_runtime.js` (shared with Lane A);
  the fix is delivered as `tests/security/HANDOFF_gateway_runtime_auth_diff.md`.
- No new auth framework invented; no tenant authority invented (TEN-001 stays
  open for Nolan).
- Adjacent public surfaces (`/context`, `/api/v1/repository`, `/system`,
  `/deployments`, `/runtime`, `/api/v1/ollama`, `/knowledge` POST) noted in the
  handoff doc as out-of-scope follow-ups, not fixed here.
- Probe-row cleanup (FL-20260919-AUDIT-001): the task context records the row as
  already removed; no action taken by this lane.
