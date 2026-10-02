# Gate 1 probe plan: WSL execution record template

**Status:** PLANNED, awaiting execution from an authorized machine. This is an empirical probe, not an architectural decision. There is nothing to decide except to run it.

## What the cloud host proved

`CLOUD AGENT -> PIG = UNREACHABLE`. The egress proxy closes SSH to 100.79.154.43, so no container-env read, no Bearer <redacted>, and no loopback HTTP to the Pig's gateway is possible from this host. That establishes only an access limitation. It does NOT establish `PING GATEWAY = DOWN`. Maturity classifications are NOT degraded on this basis: mission reads remain IMPLEMENTED, not WIRED, which is the correct classification either way.

## The four claims to establish, in order

```
1. NETWORK REACHABILITY
        |
        v
2. GATEWAY HEALTH
        |
        v
3. AUTH BOUNDARY
        |
        v
4. AUTHENTICATED PRODUCTION READ
```

The expected 401 is useful evidence: `anonymous GET /events -> 401` proves the auth boundary is intact. Then `muse L1 credential -> authenticated GET /events -> 200 + valid contract` proves the read path is wired.

## Credential rules (absolute)

- The L1 credential is resolved on the Pig/runtime at execution time only.
- Never copy the token into a prompt, into docs, into a commit, or into evidence.
- Evidence records exactly: `principal: muse`, `credential_source: exterior_agent_credentials`, `authentication: PASS|FAIL`, `secret_material_recorded: false`.

## Safe probe sequence

See `docs/gateway-access-requirement.md` for the exact ordered sequence (health first, public reads, anonymous auth-boundary check, then authenticated reads). No POST probes. Never run Pig-dependent verification in the ~7am and ~4pm MT commute windows.

## On success

Record, per route: METHOD, PATH, AUTH SURFACE, AUTHORITY, REQUEST SCHEMA, RESPONSE SCHEMA (sanitized), NAMESPACE BEHAVIOR, CAPABILITY REQUIREMENT, PROOF STATUS. Then promote the corresponding route-projection-matrix rows from IMPLEMENTED to WIRED, with per-route evidence_ref entries. One auditable commit per promotion batch.
