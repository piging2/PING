# Health Truth Audit: /health (2026-09-20)

Directive: make every health statement correspond to something actually proven. Do not redesign observability. Fix misleading claims.

## What was audited

- `gateway/health_authority.js` (117 lines, singleton `healthAuthority`)
- `gateway/api_controller.js` `getHealth()` delegates to `healthAuthority.getHealth()`
- Live Oracle `GET /health` output from 2026-09-20 ~18:47 MDT

## Finding 1: empty check set claims healthy (the known backlog item)

`getHealth()` starts with `status: 'healthy'` and iterates `this._healthChecks`. If zero checks are registered, it returns `{status: 'healthy', components: {}}` without flipping to unhealthy.

That is the misleading claim: healthy with nothing proven. The backlog note "/health may claim healthy when HealthAuthority is absent" is really "healthy when no checks are registered."

Minimal fix (no redesign): if `this._healthChecks.size === 0`, return `status: 'unknown'` (or `unproven`) with an explicit note. This makes the absence of evidence visible instead of claiming health. One conditional, no new framework.

## Finding 2: live Oracle health is substantive

The live output shows real component checks, not empty:

- gateway: uptime plus memory breakdown (rss, heap)
- generated_artifacts: 5 artifacts
- integrations: 3/3 healthy with per-integration detail
- event_governance: stats
- event_runtime: 28 handlers, emitted/persisted/deduplicated/dispatched/failed counters
- canonicalization: boundary name
- qdrant: version 1.7.0
- embedding: model nomic-embed-text, 19 subscribed, vector size 768

These correspond to actual runtime state, not static claims. No fix needed here.

## Finding 3: what health does NOT prove

- `status: healthy` does not prove PostgreSQL is writable, only that checks passed. The promotion proved writability separately via event write plus readback.
- Zero event counters after restart are runtime counters, not durability proof. Durable history is in PostgreSQL, not in the health payload.

No change needed, but callers should not treat health as durability evidence. This aligns with Nolan's law: HEALTH != PROCESS EXISTS is a step, but HEALTH != DURABILITY is the sharper form.

## Action

Documented as audit only. The one-line fix for the empty-check case belongs in the convergence lane with a fail-before test, not as a hot patch on Oracle. Oracle was not modified.
