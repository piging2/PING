# HARVEST REPORT — Lane I: MCP SDKs/frameworks

Date: 2026-09-23. Mode: license + weight, minimal. ADOPT/ADAPT/REJECT per candidate.

## PROBLEM
MCP edge needs JSON-RPC 2.0 framing, protocol-version negotiation, initialize/tools/list/tools/call dispatch, and (for HTTP) auth + rate-limit middleware. Writing this by hand risks spec drift; the MCP spec is a living document.

## PING ALREADY HAS
No MCP server or tooling (verified read-only: only Playwright's own MCP in node_modules; no @modelcontextprotocol in package.json). PING does have the proposal loop, envelope signing, claim grades, visibility policy, and capability verdicts (see MCP-EDGE-DESIGN.md section 1) — the SDK is only needed for protocol framing, not for any authority.

## EXTERNAL CANDIDATES

### 1. @modelcontextprotocol/sdk (official TypeScript SDK, Anthropic/ModelContextProtocol org)
- Version checked: 1.30.1. License: MIT. Weight: 4.3 MB unpacked, 16 runtime deps (zod, ajv, cors, hono, jose, express 5, raw-body, ajv-formats, cross-spawn, eventsource, content-type, pkce-challenge, @hono/node-server, json-schema-typed, eventsource-parser, express-rate-limit, zod-to-json-schema). 80 published versions; actively maintained.
- Mechanism: McpServer + tool registration; transports: StdioServerTransport, StreamableHTTPServerTransport, SSE; auth helpers (jose-based OAuth discovery); express-rate-limit middleware.
- Weight note: core server classes need only zod/json-schema-typed/zod-to-json-schema; express/hono/jose/cors ship as runtime deps even if unused. Tree-shaking limits bundle impact but node_modules still carries them. Acceptable for a gateway service, not for the browser bundle — edge server only.

### 2. fastmcp (TypeScript, v4.20.16)
- License: MIT. Weight: 2.06 MB unpacked, 14 deps INCLUDING @modelcontextprotocol/sdk ^1.24.3, plus execa, yargs, fuse.js, file-type, mcp-proxy, @apidevtools/swagger-parser.
- Mechanism: DX wrapper over the official SDK (CLI scaffolding, auth helpers, OpenAPI->MCP generation, proxying).
- Verdict: it is a superset, not a replacement. Adds execa/swagger-parser attack surface for DX we do not need.

### 3. Hand-rolled JSON-RPC 2.0 (no dependency)
- Mechanism: ~200 lines for initialize/tools/list/tools/call over stdio.
- Verdict: rejects the protocol authority. MCP spec evolves (protocol version negotiation, elicitation, roots, sampling); every spec change becomes PING maintenance. Fails "PING already solves it"? No — PING does not solve protocol conformance. The kill criterion "weight dwarfs value" does not fire against the SDK, but it DOES fire against maintaining our own protocol stack.

### 4. Python MCP SDK / fastmcp (Python)
- Verdict: wrong runtime. PING's edge is TypeScript/Next.js; a Python sidecar adds a process, a serialization boundary, and a second dependency tree. Reject.

## VENDOR VETO GATE (Nolan's standing decision, 2026-09-23)

Applied to the @modelcontextprotocol/sdk adoption recommendation:

| Veto trigger | Fires? |
|---|---|
| Recurring paid dependency | No. MIT, zero cost. |
| Customer-data custody | No. Protocol framing only; no data at rest. |
| Canonical-data dependency | No. PING keeps identity/events/objects/search; edge holds no state. |
| Hard vendor lock-in | No. Open spec (MCP 2026-07-28); transport swappable; hand-rolled fallback always possible. |
| New hosted database | No. |
| New orchestration plane | No. |
| New identity authority | No. |
| New secret surface | No. Auth helpers exist but credential custody stays with lane L; edge holds handles, never tokens. |
| Large runtime dependency | Borderline, does NOT fire: 4.3 MB + 16 deps is moderate for a gateway; core imports need a fraction of it. Recorded as a watch item. |
| Material egress cost | No. |
| Proprietary format difficult to escape | No. JSON-RPC 2.0 + open schemas. |

Gate questions:
- DOES IT REMOVE COMMODITY CODE? Yes: JSON-RPC framing, protocol/capability negotiation, HTTP transport, OAuth discovery, rate-limit middleware.
- DOES IT IMPROVE THE URL -> TRUSTED FYD LOOP? Yes, indirectly: agents can query objects/evidence/propose patches with claim bindings, extending the loop to agent consumers without touching the loop itself.
- CAN WE REMOVE/REPLACE IT? Yes: transports are swappable; the spec is open; a minimal reimplementation is bounded (~200 lines) if the SDK ever becomes a liability.
- DOES PING REMAIN THE AUTHORITY? Yes: SDK owns bytes on the wire, PING owns truth. The edge is stateless by design.
- WHAT DATA DOES IT OWN? None.
- WHAT FAILS IF IT DISAPPEARS? MCP clients lose the tool surface until replaced; canonical state, FYD loop, and all PING functionality are unaffected.
- COST AT 10 / 1,000 / 100,000 FYDs? Zero marginal: it is a library, not a service. No per-seat, per-call, or hosting cost attributable to the SDK itself.

Verdict: small mature library — per Nolan's standing decision this does NOT need CEO approval, but the import into the PING repo still needs the coordinator's convergence decision (recorded in STATE.md NEXT).

## LICENSES
- @modelcontextprotocol/sdk: MIT — compatible.
- fastmcp (TS): MIT — compatible, but rejected on weight/attack-surface grounds.
- Python options: Apache-2.0 / MIT — compatible, rejected on runtime grounds.

## TESTED
- Registry metadata verified 2026-09-23 (version, license, deps, unpacked size) for @modelcontextprotocol/sdk and fastmcp.
- Protocol risk assessed against the spec-version history (80 versions): hand-rolled framing would chase a moving target.
- Synthetic spike (spike/search-objects.mjs) validates the design envelope without the SDK; SDK import is deferred to coordinator approval.

## WINNER / ADOPT-ADAPT-REJECT
- @modelcontextprotocol/sdk: ADOPT for protocol framing (stdio transport default; StreamableHTTP only behind the PING gateway). Scope imports to the server core. Never in the browser bundle.
- fastmcp TS: REJECT (DX wrapper, superset attack surface).
- Hand-rolled JSON-RPC: REJECT (spec-drift liability).
- Python SDKs: REJECT (wrong runtime).

## CODE WE DO NOT NEED TO WRITE
JSON-RPC dispatch, protocol version negotiation, tool schema validation plumbing, SSE/streamable HTTP transports, OAuth metadata discovery, rate-limit middleware.

## MINIMAL PING WRAPPER
One module: tool registrations (6 tools, zod schemas) -> thin adapters calling PING read paths and the OwnerProposal loop -> envelope constructor (claim grades + evidence refs + result digest + optional Ed25519 proof). No PING logic inside the wrapper; it translates, never decides.

## FAILURE TEST
- Feed an injection-bearing synthetic object through all adapters: assert no proposal created/approved/altered (design section 7.2).
- Revoke the lane-L handle mid-session: assert all six tools refuse with AUTH_REQUIRED (lane K taxonomy).
- Kill the SDK process: assert canonical state untouched (edge is stateless).

## PRODUCT CAPABILITY UNLOCKED
Agents (Claude, IDE assistants, automation) can query FYD objects, evidence, and relationships with claim bindings, and can propose site patches/object transitions through the same owner-gated loop as humans — without ever touching canonical state.

## BYTES-DEPENDENCY COST
4.3 MB unpacked + 16 runtime deps (transitive more), gateway-server-only. Zero at runtime cost; zero marginal cost at any FYD scale.

## CREDENTIAL NOTE (Nolan's standing decision 1, 2026-09-23)
No live credentials in this lane tonight. The auth model (design section 3) uses lane-L capability handles; the connect flow (CONNECT SOURCE -> permissions explained -> OAuth PKCE -> callback -> custody -> capability inventory) is QUEUED FOR MORNING. Nolan picks which real account gets connected tomorrow. This lane proceeds on fixtures/synthetic data only.
