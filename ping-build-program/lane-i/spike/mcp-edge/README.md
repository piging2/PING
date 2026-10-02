# MCP edge spike — lane I

Proven 2026-09-23. A real MCP server (stdio) exposing 3 lane-S capabilities as tools,
with the full security boundary: forbidden-registration gate, per-call authorization,
claim-graded envelopes, digest-bound approvals.

## Run

```bash
cd ~/workspace/ping-build-program/lane-i/spike/mcp-edge
npm install          # @modelcontextprotocol/sdk 1.30.1 (MIT) + zod — spike-local only
node proof.mjs       # 19 checks: discovery, authorized/forbidden calls, approval binding
node redteam.mjs     # 10 checks: the 5 mission red-team attacks
MCP_EDGE_PRINCIPAL=visitor node server.mjs   # serve tools over stdio (public tier)
MCP_EDGE_PRINCIPAL=owner   node server.mjs   # serve tools over stdio (owner tier)
```

## Files

- `capabilities.fixture.json` — 4 lane-S-format capability records (3 resolved, 1 candidate)
  modeled on lane S's published format + coppersmith fixture; capabilityIds are real
  sha256(tenantId|kind|channel|endpointIdentity) values.
- `edge.mjs` — protocol-independent boundary: ToolRegistry (forbidden-list gate),
  resolveForPrincipal (lane S R0/R1/R2a/R2b/R4), per-call authorization with TOCTOU
  re-check, claim-graded envelopes, digest-bound single-use approvals (lane T),
  idempotency keys, timeouts, rate-freeze, description sanitization, audit trail.
- `tools.mjs` — one MCP tool per resolved record. Tool identity:
  `ping_<kind>_<channel>`; schema identity: sha256 of the canonical shape.
- `server.mjs` — stdio MCP server. Principal bound at spawn (production: lane-L
  capability handle). Approval is NOT an MCP tool by design (design section 3).

## What it proved

- Tool discovery is principal-scoped; high-sensitivity owner-only capabilities are
  invisible to visitors everywhere including tools/list (no-leak).
- Forbidden calls are denied with the exact lane-S rule; the visitor's direct call
  to an unlisted tool gets a generic protocol "not found" that leaks nothing.
- Consequential tools draft proposals only; approval binds the exact proposal digest
  (single-use, re-resolves the capability first).
- Registration of raw-DB / shell / secret-bearing / duplicate / unresolved tools is
  refused by the edge with typed codes.
- Description injection is sanitized at registration; poisoned result data stays data.

## Not this spike

Live PING wiring (lane F search, OwnerProposal loop, lane-L handles, lane-J audit,
Ed25519 proof signing) — those are the integration NEXTs in lane-i/STATE.md.
No writes were made to the PING repo; the SDK lives only in this directory.
