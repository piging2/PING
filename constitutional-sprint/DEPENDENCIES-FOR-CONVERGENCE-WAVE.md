# Dependencies for TenantOS Convergence Wave (substrate defects proven by sprint archaeology)

## D1 — LIVE unauthenticated event ingress (PROVEN, P0)
- Path: src/app/api/kit/webhook/route.ts (worktree: ping-constitutional @ a69bb68f)
- Evidence: route accepts POSTed Kit events with NO signature/secret verification; KIT_WEBHOOK_SECRET is declared but never consulted. Anyone can inject forged events into the HPP event log, including subscriber PII.
- Matches convergence Swarm 15's "unauthenticated event ingress" item. Recommended: signature verification + replay protection, or removal if the route is dead.
- Source: constitutional sprint security sweep, ~/workspace/constitutional-sprint/security/SECURITY-SWEEP.md

## D2 — LIVE unauthenticated tag/write + open redirect (PROVEN)
- Path: src/app/api/resources/download/route.ts
- Evidence: unauthenticated POST tags arbitrary Kit subscriber emails, logs email PII, reflects attacker-supplied resourceUrl as downloadUrl (open redirect, no allowlist).

## D3 — demo-owner-mode as sole authorization for owner mutations (dormant by design; misconfiguration risk)
- Paths: src/fyd/owner-mode/gate.ts, api/fyd/customize, api/fyd/objects/[objectId]/overrides, api/fyd/claims/[resourceId]/verify
- Evidence: heavily documented as not-authentication; private-host gate trusts client-controlled Host header; flag is build-time NEXT_PUBLIC_* var. Failure mode: demo flag enabled in a production build.
